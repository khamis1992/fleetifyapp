-- Delete ALL existing delete_all_accounts functions completely
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.delete_all_accounts(uuid, boolean, boolean);

-- Create a completely new function with different name to avoid conflicts
CREATE OR REPLACE FUNCTION public.delete_all_accounts_v2(
    company_id uuid,
    force_system boolean,
    reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INTEGER := 0;
    result jsonb;
BEGIN
    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Company not found',
            'error_ar', 'الشركة غير موجودة'
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
        company_id,
        CASE WHEN force_system THEN 'force_delete_all' ELSE 'delete_all' END,
        COALESCE(reason, 'Bulk deletion of all accounts'),
        auth.uid(),
        jsonb_build_object('started_at', now())
    );

    -- Perform the deletion
    DELETE FROM chart_of_accounts 
    WHERE company_id = delete_all_accounts_v2.company_id 
    AND is_active = true
    AND (force_system = true OR is_system = false);

    -- Get the actual deleted count
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Return success result
    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', format('Successfully deleted %s accounts', deleted_count),
        'message_ar', format('تم حذف %s حساب بنجاح', deleted_count),
        'force_delete_system', force_system
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
            company_id,
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