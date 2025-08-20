-- Drop all conflicting delete_all_accounts functions
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.delete_all_accounts(text, uuid, boolean);

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
    total_accounts INTEGER := 0;
    deleted_accounts INTEGER := 0;
    system_accounts_skipped INTEGER := 0;
    remaining_accounts INTEGER := 0;
    result jsonb;
BEGIN
    -- Count total accounts
    SELECT COUNT(*) INTO total_accounts
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- Start the deletion process
    IF force_delete_system THEN
        -- Delete all accounts including system accounts
        UPDATE chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE company_id = company_id_param AND is_active = true;
        
        GET DIAGNOSTICS deleted_accounts = ROW_COUNT;
    ELSE
        -- Delete only non-system accounts
        UPDATE chart_of_accounts 
        SET is_active = false, updated_at = now()
        WHERE company_id = company_id_param 
        AND is_active = true 
        AND is_system = false;
        
        GET DIAGNOSTICS deleted_accounts = ROW_COUNT;
        
        -- Count system accounts that were skipped
        SELECT COUNT(*) INTO system_accounts_skipped
        FROM chart_of_accounts
        WHERE company_id = company_id_param 
        AND is_active = true 
        AND is_system = true;
    END IF;
    
    -- Count remaining active accounts
    SELECT COUNT(*) INTO remaining_accounts
    FROM chart_of_accounts
    WHERE company_id = company_id_param AND is_active = true;
    
    -- Build success result
    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_accounts,
        'system_accounts_deleted', CASE WHEN force_delete_system THEN 
            (SELECT COUNT(*) FROM chart_of_accounts WHERE company_id = company_id_param AND is_system = true)
            ELSE 0 END,
        'system_accounts_skipped', system_accounts_skipped,
        'total_accounts', total_accounts,
        'remaining_accounts', remaining_accounts,
        'message', CASE 
            WHEN force_delete_system THEN 
                'تم حذف جميع الحسابات (' || deleted_accounts || ') بما في ذلك الحسابات النظامية'
            ELSE 
                'تم حذف ' || deleted_accounts || ' حساب، وتم تخطي ' || system_accounts_skipped || ' حساب نظامي'
        END
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'خطأ في حذف الحسابات: ' || SQLERRM,
            'deleted_count', 0,
            'total_accounts', total_accounts
        );
END;
$function$;