-- تحديث دالة التحقق من مستوى الحساب للقيود
CREATE OR REPLACE FUNCTION public.validate_account_level_for_entries(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_level integer;
    is_header boolean;
BEGIN
    SELECT coa.account_level, coa.is_header 
    INTO account_level, is_header
    FROM public.chart_of_accounts coa
    WHERE coa.id = account_id_param
    AND coa.is_active = true;
    
    -- السماح فقط للحسابات في المستوى 5 أو 6 وليست حسابات رئيسية
    RETURN (account_level = 5 OR account_level = 6) AND is_header = false;
END;
$function$;

-- تحديث دالة الحصول على الحسابات المسموح بها للقيود
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
    AND (coa.account_level = 5 OR coa.account_level = 6)  -- السماح فقط للمستوى 5 و 6
    AND coa.is_header = false  -- ليست حسابات رئيسية
    ORDER BY coa.account_code;
END;
$function$;

-- تحديث دالة التحقق من الحسابات الإجمالية
CREATE OR REPLACE FUNCTION public.is_aggregate_account(account_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_level integer;
    is_header boolean;
BEGIN
    SELECT account_level, is_header INTO account_level, is_header
    FROM public.chart_of_accounts
    WHERE id = account_id_param
    AND is_active = true;
    
    -- الحسابات الإجمالية هي الحسابات الرئيسية أو الحسابات أقل من المستوى 5
    RETURN is_header = true OR account_level < 5;
END;
$function$;