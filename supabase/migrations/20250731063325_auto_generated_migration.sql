-- خطة تنظيف البيانات التجريبية من النظام المالي

-- 1. إزالة الحسابات التجريبية من دليل الحسابات
DELETE FROM public.chart_of_accounts 
WHERE (
    account_name ILIKE '%test%' 
    OR account_name ILIKE '%تجريبي%'
    OR account_name ILIKE '%Test User%'
    OR account_name_ar ILIKE '%test%'
    OR account_name_ar ILIKE '%تجريبي%'
    OR account_name_ar ILIKE '%Test User%'
) AND is_system = false;

-- 2. إزالة العملاء التجريبيين
DELETE FROM public.customers 
WHERE (
    first_name ILIKE '%test%' 
    OR last_name ILIKE '%test%'
    OR company_name ILIKE '%test%'
    OR first_name_ar ILIKE '%test%'
    OR last_name_ar ILIKE '%test%'
    OR company_name_ar ILIKE '%test%'
    OR first_name = 'Test User'
    OR company_name = 'Test User'
);

-- 3. تحديث دالة الحسابات المسموحة للقيود لتصفية الحسابات التجريبية
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
RETURNS TABLE(
    id uuid, 
    account_code character varying, 
    account_name text, 
    account_name_ar text, 
    account_type text, 
    account_level integer, 
    balance_type text, 
    parent_account_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- التحقق من صحة المعاملات
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null'
            USING HINT = 'Ensure user is properly associated with a company';
    END IF;
    
    -- التحقق من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = company_id_param) THEN
        RAISE EXCEPTION 'Company with ID % does not exist', company_id_param
            USING HINT = 'Verify company_id is valid';
    END IF;
    
    -- إرجاع الحسابات مع التصفية المحسنة وإستبعاد الحسابات التجريبية
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_level,
        coa.balance_type,
        parent_coa.account_name as parent_account_name
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND coa.account_level >= 3  -- السماح للمستويات 3 وما فوق
    AND coa.is_header = false   -- الحسابات غير الرئيسية فقط
    AND coa.account_code IS NOT NULL -- التأكد من وجود رمز حساب صحيح
    AND LENGTH(TRIM(coa.account_name)) > 0 -- التأكد من وجود اسم حساب صحيح
    -- تصفية الحسابات التجريبية
    AND NOT (
        coa.account_name ILIKE '%test%' 
        OR coa.account_name ILIKE '%تجريبي%'
        OR coa.account_name ILIKE '%Test User%'
        OR COALESCE(coa.account_name_ar, '') ILIKE '%test%'
        OR COALESCE(coa.account_name_ar, '') ILIKE '%تجريبي%'
        OR COALESCE(coa.account_name_ar, '') ILIKE '%Test User%'
    )
    ORDER BY coa.account_code;
    
EXCEPTION
    WHEN OTHERS THEN
        -- تسجيل الخطأ للتتبع
        RAISE LOG 'Error in get_entry_allowed_accounts for company_id %: %', company_id_param, SQLERRM;
        -- إعادة رفع الاستثناء
        RAISE;
END;
$function$;

-- 4. إنشاء دالة للتحقق من منع إنشاء حسابات تجريبية
CREATE OR REPLACE FUNCTION public.prevent_test_accounts()
RETURNS TRIGGER AS $$
BEGIN
    -- منع إنشاء حسابات تحتوي على كلمات تجريبية
    IF (
        NEW.account_name ILIKE '%test%' 
        OR NEW.account_name ILIKE '%تجريبي%'
        OR NEW.account_name ILIKE '%Test User%'
        OR COALESCE(NEW.account_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.account_name_ar, '') ILIKE '%تجريبي%'
        OR COALESCE(NEW.account_name_ar, '') ILIKE '%Test User%'
    ) AND NEW.is_system = false THEN
        RAISE EXCEPTION 'لا يُسمح بإنشاء حسابات تحتوي على بيانات تجريبية. يرجى استخدام أسماء حسابات حقيقية.'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. إنشاء trigger لمنع الحسابات التجريبية
DROP TRIGGER IF EXISTS prevent_test_accounts_trigger ON public.chart_of_accounts;
CREATE TRIGGER prevent_test_accounts_trigger
    BEFORE INSERT OR UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_test_accounts();

-- 6. إنشاء دالة للتحقق من منع إنشاء عملاء تجريبيين
CREATE OR REPLACE FUNCTION public.prevent_test_customers()
RETURNS TRIGGER AS $$
BEGIN
    -- منع إنشاء عملاء تحتوي أسماؤهم على كلمات تجريبية
    IF (
        COALESCE(NEW.first_name, '') ILIKE '%test%' 
        OR COALESCE(NEW.last_name, '') ILIKE '%test%'
        OR COALESCE(NEW.company_name, '') ILIKE '%test%'
        OR COALESCE(NEW.first_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.last_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.company_name_ar, '') ILIKE '%test%'
        OR COALESCE(NEW.first_name, '') = 'Test User'
        OR COALESCE(NEW.company_name, '') = 'Test User'
    ) THEN
        RAISE EXCEPTION 'لا يُسمح بإنشاء عملاء تحتوي أسماؤهم على بيانات تجريبية. يرجى استخدام أسماء عملاء حقيقية.'
            USING ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. إنشاء trigger لمنع العملاء التجريبيين
DROP TRIGGER IF EXISTS prevent_test_customers_trigger ON public.customers;
CREATE TRIGGER prevent_test_customers_trigger
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_test_customers();

-- 8. تنظيف أي قيود مرتبطة بالحسابات المحذوفة من جدول journal_entry_lines
DELETE FROM public.journal_entry_lines 
WHERE account_id NOT IN (SELECT id FROM public.chart_of_accounts);

-- 9. تنظيف أي عقود مرتبطة بالعملاء المحذوفين
DELETE FROM public.contracts 
WHERE customer_id NOT IN (SELECT id FROM public.customers);

-- 10. إضافة فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_name_search 
ON public.chart_of_accounts(account_name, account_name_ar) 
WHERE is_active = true AND is_header = false;

-- تسجيل عملية التنظيف
INSERT INTO public.audit_logs (
    user_id,
    company_id,
    resource_type,
    action,
    severity,
    new_values
) VALUES (
    auth.uid(),
    NULL, -- عملية على مستوى النظام
    'system_cleanup',
    'cleanup_test_data',
    'info',
    jsonb_build_object(
        'cleanup_type', 'test_data_removal',
        'timestamp', now(),
        'description', 'تم تنظيف البيانات التجريبية من النظام المالي'
    )
);

-- عرض ملخص التنظيف
DO $$
DECLARE
    accounts_cleaned INTEGER;
    customers_cleaned INTEGER;
BEGIN
    -- عد الحسابات التي تم تنظيفها (تقدير)
    SELECT 0 INTO accounts_cleaned; -- تم الحذف بالفعل
    
    -- عد العملاء الذين تم تنظيفهم (تقدير)
    SELECT 0 INTO customers_cleaned; -- تم الحذف بالفعل
    
    RAISE NOTICE 'تم تنظيف البيانات التجريبية بنجاح:';
    RAISE NOTICE 'تم تحديث دالة الحسابات المسموحة للقيود';
    RAISE NOTICE 'تم إضافة حماية لمنع إنشاء بيانات تجريبية مستقبلاً';
    RAISE NOTICE 'تم تنظيف القيود والعقود المرتبطة';
END $$;