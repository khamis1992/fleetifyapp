-- Update the get_available_customer_accounts function to be more flexible
CREATE OR REPLACE FUNCTION public.get_available_customer_accounts(company_id_param uuid)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, parent_account_name text, is_available boolean)
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
            SELECT 1 FROM public.customer_accounts ca 
            WHERE ca.account_id = coa.id AND ca.company_id = company_id_param
        ) as is_available
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.is_active = true
    AND coa.is_header = false
    AND (
        -- Assets accounts (general receivables)
        coa.account_type = 'assets'
        OR 
        -- Search for customer/receivable related accounts by name
        (coa.account_name ILIKE '%receivable%' 
         OR coa.account_name ILIKE '%مدين%' 
         OR coa.account_name ILIKE '%ذمم%'
         OR coa.account_name ILIKE '%عميل%'
         OR coa.account_name ILIKE '%customer%'
         OR coa.account_name_ar ILIKE '%مدين%'
         OR coa.account_name_ar ILIKE '%ذمم%'
         OR coa.account_name_ar ILIKE '%عميل%'
         OR coa.account_code LIKE '112%'  -- Standard receivables code
         OR coa.account_code LIKE '11%'   -- Current assets
         OR coa.account_code LIKE '1%')   -- All assets
    )
    ORDER BY coa.account_code;
END;
$function$;