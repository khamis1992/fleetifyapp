-- Create function to get available vendor accounts
CREATE OR REPLACE FUNCTION public.get_available_vendor_accounts(company_id_param uuid)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, parent_account_name text, is_available boolean, account_type text)
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
        parent_coa.account_name as parent_account_name,
        NOT EXISTS(
            SELECT 1 FROM public.vendor_accounts va 
            WHERE va.account_id = coa.id AND va.company_id = company_id_param
        ) as is_available,
        coa.account_type
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND coa.is_header = false
    AND (
        -- Include payable-type accounts (liabilities)
        coa.account_type = 'liabilities'
        OR coa.account_name ILIKE '%payable%' 
        OR coa.account_name ILIKE '%دائن%' 
        OR coa.account_name ILIKE '%موردين%'
        OR coa.account_name_ar ILIKE '%دائن%'
        OR coa.account_name_ar ILIKE '%موردين%'
        OR coa.account_code LIKE '21%'   -- Standard payables code
        OR coa.account_code LIKE '2%'    -- Liabilities
        -- Include expense accounts
        OR coa.account_type = 'expenses'
        OR coa.account_code LIKE '5%'    -- Standard expense codes
        -- Include advance payment accounts (assets)
        OR (coa.account_type = 'assets' AND (
            coa.account_name ILIKE '%advance%'
            OR coa.account_name ILIKE '%مقدم%'
            OR coa.account_name_ar ILIKE '%مقدم%'
            OR coa.account_code LIKE '1144%'  -- Prepaid expenses
        ))
    )
    -- Exclude auto-generated vendor accounts from other companies
    AND NOT (
        (coa.account_name ILIKE '%مورد:%' OR coa.account_name ILIKE '%vendor:%')
        AND NOT EXISTS(
            SELECT 1 FROM public.vendor_accounts va 
            JOIN public.vendors v ON va.vendor_id = v.id
            WHERE va.account_id = coa.id 
            AND va.company_id = company_id_param
            AND v.company_id = company_id_param
        )
    )
    ORDER BY coa.account_code;
END;
$function$;