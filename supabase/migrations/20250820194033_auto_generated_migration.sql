-- Drop all existing conflicting delete_all_accounts functions
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, text, boolean);

-- Create a single, consistent delete_all_accounts function
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    company_id_param uuid,
    force_delete_system boolean DEFAULT false,
    confirmation_text text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INTEGER := 0;
    accounts_to_delete RECORD;
    result jsonb;
BEGIN
    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_id_param) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Company not found',
            'error_ar', 'الشركة غير موجودة'
        );
    END IF;

    -- Count accounts that will be deleted
    SELECT COUNT(*) INTO deleted_count
    FROM chart_of_accounts 
    WHERE company_id = company_id_param 
    AND is_active = true
    AND (force_delete_system = true OR is_system = false);

    -- If no accounts to delete
    IF deleted_count = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'deleted_count', 0,
            'message', 'No accounts found to delete',
            'message_ar', 'لا توجد حسابات للحذف'
        );
    END IF;

    -- Log the deletion attempt
    INSERT INTO account_deletion_log (
        company_id,
        deletion_type,
        deletion_reason,
        deleted_by,
        affected_records
    ) VALUES (
        company_id_param,
        CASE WHEN force_delete_system THEN 'force_delete_all' ELSE 'delete_all' END,
        COALESCE(confirmation_text, 'Bulk deletion of all accounts'),
        auth.uid(),
        jsonb_build_object('accounts_count', deleted_count)
    );

    -- Perform the deletion
    DELETE FROM chart_of_accounts 
    WHERE company_id = company_id_param 
    AND is_active = true
    AND (force_delete_system = true OR is_system = false);

    -- Get the actual deleted count
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', format('Successfully deleted %s accounts', deleted_count),
        'message_ar', format('تم حذف %s حساب بنجاح', deleted_count),
        'force_delete_system', force_delete_system
    );

    RETURN result;

EXCEPTION
    WHEN OTHERS THEN
        -- Log the error
        INSERT INTO account_deletion_log (
            company_id,
            deletion_type,
            deletion_reason,
            deleted_by,
            affected_records
        ) VALUES (
            company_id_param,
            'delete_all_failed',
            format('Error: %s', SQLERRM),
            auth.uid(),
            jsonb_build_object('error', SQLERRM)
        );

        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_ar', 'حدث خطأ أثناء حذف الحسابات'
        );
END;
$function$;