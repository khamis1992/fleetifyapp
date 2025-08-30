-- إصلاح المشكلة الأولى: تحديد العمود بشكل واضح في دالة get_entry_allowed_accounts
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, account_type text, account_level integer, balance_type text, parent_account_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- التحقق من وجود معرف الشركة
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- التحقق من وجود الشركة
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE companies.id = company_id_param) THEN
        RAISE EXCEPTION 'Company with ID % does not exist', company_id_param
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    RETURN QUERY
    SELECT 
        coa.id,  -- تحديد واضح للجدول
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.account_type,
        coa.account_level,
        coa.balance_type,
        parent_coa.account_name as parent_account_name
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param  -- ضمان عرض حسابات الشركة المحددة فقط
    AND coa.is_active = true
    AND coa.account_level >= 3  -- المستوى 3 أو أعلى للقيود
    AND coa.is_header = false   -- الحسابات الفرعية فقط، ليس الحسابات الرئيسية
    -- استبعاد الحسابات الافتراضية للنظام إذا لم تكن للشركة المحددة
    AND NOT (coa.is_system = true AND coa.company_id != company_id_param)
    ORDER BY coa.account_code;
END;
$function$;

-- إصلاح المشكلة الثانية: حذف foreign key constraint المُكرر
ALTER TABLE public.journal_entry_lines 
DROP CONSTRAINT IF EXISTS journal_entry_lines_account_id_fkey;

-- الاحتفاظ فقط بـ constraint المُسمى بوضوح
-- fk_journal_entry_lines_account سيبقى كما هو