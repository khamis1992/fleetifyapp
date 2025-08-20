-- إصلاح دالة delete_all_accounts وإضافة معالجة أفضل للأخطاء
CREATE OR REPLACE FUNCTION public.delete_all_accounts(
    company_id_param uuid,
    confirmation_text text DEFAULT '',
    force_delete_system boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    deleted_count INTEGER := 0;
    system_accounts_count INTEGER := 0;
    total_accounts INTEGER := 0;
    result_json jsonb;
BEGIN
    -- التحقق من معرف الشركة
    IF company_id_param IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف الشركة مطلوب',
            'deleted_count', 0,
            'system_accounts_deleted', 0,
            'total_accounts', 0
        );
    END IF;
    
    -- عد إجمالي الحسابات
    SELECT COUNT(*) INTO total_accounts
    FROM public.chart_of_accounts 
    WHERE company_id = company_id_param;
    
    -- عد الحسابات النظامية
    SELECT COUNT(*) INTO system_accounts_count
    FROM public.chart_of_accounts 
    WHERE company_id = company_id_param AND is_system = true;
    
    IF total_accounts = 0 THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'لا توجد حسابات للحذف',
            'deleted_count', 0,
            'system_accounts_deleted', 0,
            'total_accounts', 0
        );
    END IF;
    
    -- إزالة المراجع الخارجية بأمان
    BEGIN
        -- تنظيف مراجع fixed_assets إذا كان الجدول موجود
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixed_assets' AND table_schema = 'public') THEN
            UPDATE public.fixed_assets 
            SET depreciation_account_id = NULL,
                accumulated_depreciation_account_id = NULL,
                disposal_account_id = NULL
            WHERE company_id = company_id_param;
        END IF;
        
        -- تنظيف مراجع أخرى
        UPDATE public.customers SET account_id = NULL WHERE company_id = company_id_param;
        UPDATE public.suppliers SET account_id = NULL WHERE company_id = company_id_param;
        UPDATE public.contracts SET account_id = NULL WHERE company_id = company_id_param;
        UPDATE public.invoices SET account_id = NULL WHERE company_id = company_id_param;
        UPDATE public.payments SET account_id = NULL WHERE company_id = company_id_param;
        
    EXCEPTION WHEN OTHERS THEN
        -- تسجيل الخطأ ولكن المتابعة
        RAISE NOTICE 'تحذير أثناء تنظيف المراجع: %', SQLERRM;
    END;
    
    -- حذف الحسابات
    IF force_delete_system THEN
        -- حذف جميع الحسابات بما في ذلك النظامية
        DELETE FROM public.chart_of_accounts 
        WHERE company_id = company_id_param;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    ELSE
        -- حذف الحسابات غير النظامية فقط
        DELETE FROM public.chart_of_accounts 
        WHERE company_id = company_id_param AND (is_system = false OR is_system IS NULL);
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;
    
    -- إعداد النتيجة
    result_json := jsonb_build_object(
        'success', true,
        'message', 'تم حذف الحسابات بنجاح',
        'deleted_count', deleted_count,
        'system_accounts_deleted', CASE WHEN force_delete_system THEN system_accounts_count ELSE 0 END,
        'total_accounts', total_accounts,
        'remaining_accounts', total_accounts - deleted_count
    );
    
    RETURN result_json;
    
EXCEPTION 
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'حدث خطأ أثناء حذف الحسابات: ' || SQLERRM,
            'deleted_count', 0,
            'system_accounts_deleted', 0,
            'total_accounts', total_accounts
        );
END;
$function$;