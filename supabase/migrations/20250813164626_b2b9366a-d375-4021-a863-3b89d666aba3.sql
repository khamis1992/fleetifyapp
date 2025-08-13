-- إصلاح نهائي لدالة get_entry_allowed_accounts لعرض حسابات الشركة المحددة فقط
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, balance_type text, parent_account_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- التحقق من وجود company_id
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null';
    END IF;

    -- التحقق من وجود الشركة (إصلاح مشكلة العمود المبهم)
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE companies.id = company_id_param) THEN
        RAISE EXCEPTION 'Company with ID % does not exist', company_id_param;
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
    WHERE coa.company_id = company_id_param  -- عرض حسابات الشركة المحددة فقط
    AND coa.is_active = true
    AND coa.account_level >= 3  -- المستوى 3 أو أعلى للقيود
    AND coa.is_header = false   -- استبعاد الحسابات الرئيسية
    AND (coa.is_system = false OR coa.is_system IS NULL)  -- استبعاد الحسابات النظامية
    ORDER BY coa.account_code;
END;
$function$;