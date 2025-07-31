-- إصلاح دالة get_entry_allowed_accounts - حل مشكلة الغموض في مرجع العمود
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, balance_type text, parent_account_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- التحقق من صحة معامل الشركة
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null';
    END IF;
    
    -- التحقق من وجود الشركة واستبعاد بيانات الاختبار
    IF NOT EXISTS (
        SELECT 1 FROM public.companies c 
        WHERE c.id = company_id_param 
        AND c.name NOT ILIKE '%test%' 
        AND c.name NOT ILIKE '%اختبار%'
    ) THEN
        RAISE EXCEPTION 'Company with ID % does not exist or is a test company', company_id_param;
    END IF;

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
    AND coa.account_level >= 3  -- السماح للحسابات في المستوى 3 وما فوق
    AND coa.is_header = false   -- منع الحسابات الرئيسية
    ORDER BY coa.account_code;
END;
$function$;