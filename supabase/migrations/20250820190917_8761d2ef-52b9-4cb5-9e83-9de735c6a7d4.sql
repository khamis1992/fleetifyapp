-- Drop all existing versions of delete_all_accounts function
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.delete_all_accounts(company_id_param uuid, confirmation_text text, force_delete_system boolean);
DROP FUNCTION IF EXISTS public.delete_all_accounts(company_id_param uuid, force_delete_system boolean, confirmation_text text);

-- Create a single, consistent version of delete_all_accounts function
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    company_id_param uuid,
    confirmation_text text,
    force_delete_system boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INTEGER := 0;
    protected_count INTEGER := 0;
    result jsonb;
    account_record RECORD;
BEGIN
    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'الشركة غير موجودة',
            'deleted_count', 0,
            'protected_count', 0
        );
    END IF;

    -- Validate confirmation text
    IF confirmation_text != 'DELETE ALL ACCOUNTS' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'نص التأكيد غير صحيح',
            'deleted_count', 0,
            'protected_count', 0
        );
    END IF;

    -- Count and delete accounts
    FOR account_record IN 
        SELECT id, account_name, is_system 
        FROM chart_of_accounts 
        WHERE company_id = company_id_param
        ORDER BY account_level DESC, account_code
    LOOP
        -- Skip system accounts if force_delete_system is false
        IF account_record.is_system = true AND force_delete_system = false THEN
            protected_count := protected_count + 1;
            CONTINUE;
        END IF;

        -- Check for references that would prevent deletion
        BEGIN
            -- Check journal entry lines
            IF EXISTS (
                SELECT 1 FROM journal_entry_lines jel
                JOIN journal_entries je ON jel.journal_entry_id = je.id
                WHERE jel.account_id = account_record.id
                AND je.company_id = company_id_param
            ) THEN
                protected_count := protected_count + 1;
                CONTINUE;
            END IF;

            -- Check other references
            IF EXISTS (SELECT 1 FROM contracts WHERE account_id = account_record.id) OR
               EXISTS (SELECT 1 FROM customers WHERE account_id = account_record.id) OR
               EXISTS (SELECT 1 FROM invoices WHERE account_id = account_record.id) OR
               EXISTS (SELECT 1 FROM payments WHERE account_id = account_record.id) THEN
                protected_count := protected_count + 1;
                CONTINUE;
            END IF;

            -- Safe to delete
            DELETE FROM chart_of_accounts WHERE id = account_record.id;
            deleted_count := deleted_count + 1;

        EXCEPTION
            WHEN foreign_key_violation THEN
                protected_count := protected_count + 1;
            WHEN OTHERS THEN
                protected_count := protected_count + 1;
        END;
    END LOOP;

    -- Build result
    result := jsonb_build_object(
        'success', true,
        'message', 'تم حذف ' || deleted_count || ' حساب بنجاح. تم حماية ' || protected_count || ' حساب.',
        'deleted_count', deleted_count,
        'protected_count', protected_count
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'خطأ في حذف الحسابات: ' || SQLERRM,
            'deleted_count', 0,
            'protected_count', 0
        );
END;
$function$;