-- إصلاح دالة get_entry_allowed_accounts لحل مشكلة الحسابات التجريبية
-- والتخلص من خطأ الـ ambiguous column reference

CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, balance_type text, parent_account_name text)
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
    
    -- إرجاع الحسابات مع التصفية المحسنة واستبعاد الحسابات التجريبية والحسابات المرتبطة بالعملاء التجريبيين
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
    -- تصفية الحسابات التجريبية المحسنة
    AND NOT (
        coa.account_name ILIKE '%test%' 
        OR coa.account_name ILIKE '%تجريبي%'
        OR coa.account_name ILIKE '%Test User%'
        OR COALESCE(coa.account_name_ar, '') ILIKE '%test%'
        OR COALESCE(coa.account_name_ar, '') ILIKE '%تجريبي%'
        OR COALESCE(coa.account_name_ar, '') ILIKE '%Test User%'
    )
    -- استبعاد الحسابات المرتبطة بالعملاء التجريبيين
    AND NOT EXISTS (
        SELECT 1 FROM public.customer_accounts ca
        INNER JOIN public.customers c ON ca.customer_id = c.id
        WHERE ca.account_id = coa.id
        AND ca.company_id = company_id_param
        AND (
            COALESCE(c.first_name, '') ILIKE '%test%'
            OR COALESCE(c.last_name, '') ILIKE '%test%'
            OR COALESCE(c.company_name, '') ILIKE '%test%'
            OR COALESCE(c.first_name_ar, '') ILIKE '%test%'
            OR COALESCE(c.last_name_ar, '') ILIKE '%test%'
            OR COALESCE(c.company_name_ar, '') ILIKE '%test%'
            OR COALESCE(c.first_name, '') = 'Test User'
            OR COALESCE(c.company_name, '') = 'Test User'
        )
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

-- إنشاء محفزات لمنع إنشاء حسابات أو عملاء تجريبيين في المستقبل
DROP TRIGGER IF EXISTS prevent_test_accounts_trigger ON public.chart_of_accounts;
CREATE TRIGGER prevent_test_accounts_trigger
    BEFORE INSERT OR UPDATE ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_test_accounts();

DROP TRIGGER IF EXISTS prevent_test_customers_trigger ON public.customers;
CREATE TRIGGER prevent_test_customers_trigger
    BEFORE INSERT OR UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_test_customers();