-- إنشاء دالة جديدة بعنوان مختلف تماماً
CREATE OR REPLACE FUNCTION public.bulk_delete_company_accounts(
    target_company_id uuid,
    include_system_accounts boolean,
    deletion_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INTEGER := 0;
    result jsonb;
    error_msg text;
BEGIN
    -- تسجيل بداية العملية
    RAISE NOTICE 'Starting bulk deletion for company: %, include_system: %, reason: %', 
        target_company_id, include_system_accounts, deletion_reason;

    -- التحقق من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = target_company_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Company not found',
            'error_ar', 'الشركة غير موجودة'
        );
    END IF;

    -- محاولة الحذف مع معالجة الأخطاء
    BEGIN
        -- تسجيل محاولة الحذف
        INSERT INTO account_deletion_log (
            company_id,
            deletion_type,
            deletion_reason,
            deleted_by,
            affected_records
        ) VALUES (
            target_company_id,
            CASE WHEN include_system_accounts THEN 'force_delete_all' ELSE 'delete_all' END,
            COALESCE(deletion_reason, 'Bulk deletion of all accounts'),
            auth.uid(),
            jsonb_build_object('started_at', now())
        );

        -- تنفيذ الحذف
        DELETE FROM chart_of_accounts 
        WHERE company_id = target_company_id 
        AND is_active = true
        AND (include_system_accounts = true OR is_system = false);

        -- الحصول على عدد الحسابات المحذوفة
        GET DIAGNOSTICS deleted_count = ROW_COUNT;

        -- تسجيل النجاح
        RAISE NOTICE 'Successfully deleted % accounts', deleted_count;

        -- إرجاع النتيجة الناجحة
        result := jsonb_build_object(
            'success', true,
            'deleted_count', deleted_count,
            'message', format('Successfully deleted %s accounts', deleted_count),
            'message_ar', format('تم حذف %s حساب بنجاح', deleted_count),
            'force_delete_system', include_system_accounts
        );

        RETURN result;

    EXCEPTION
        WHEN OTHERS THEN
            -- تسجيل الخطأ
            error_msg := SQLERRM;
            RAISE NOTICE 'Error during deletion: %', error_msg;
            
            INSERT INTO account_deletion_log (
                company_id,
                deletion_type,
                deletion_reason,
                deleted_by,
                affected_records
            ) VALUES (
                target_company_id,
                'delete_all_failed',
                format('Error: %s', error_msg),
                auth.uid(),
                jsonb_build_object('error', error_msg)
            );

            RETURN jsonb_build_object(
                'success', false,
                'error', error_msg,
                'error_ar', 'حدث خطأ أثناء حذف الحسابات'
            );
    END;
END;
$function$;