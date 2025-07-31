-- Simple fix for data consistency issues

-- Update any profiles with null company_id to link them to an existing company
-- This will help with immediate testing while we work on a more comprehensive solution
UPDATE public.profiles 
SET company_id = (
    SELECT id FROM public.companies 
    WHERE subscription_status = 'active' 
    ORDER BY created_at 
    LIMIT 1
)
WHERE company_id IS NULL 
AND EXISTS (
    SELECT 1 FROM public.companies 
    WHERE subscription_status = 'active'
);

-- Enhance get_entry_allowed_accounts function with better validation
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
    -- Validate input parameters
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null'
            USING HINT = 'Ensure user is properly associated with a company';
    END IF;
    
    -- Verify company exists
    IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = company_id_param) THEN
        RAISE EXCEPTION 'Company with ID % does not exist', company_id_param
            USING HINT = 'Verify company_id is valid';
    END IF;
    
    -- Return accounts with enhanced filtering and validation
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
    AND coa.account_level >= 3  -- Allow levels 3 and above
    AND coa.is_header = false   -- Only non-header accounts
    AND coa.account_code IS NOT NULL -- Ensure valid account code
    AND LENGTH(TRIM(coa.account_name)) > 0 -- Ensure valid account name
    ORDER BY coa.account_code;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error for debugging
        RAISE LOG 'Error in get_entry_allowed_accounts for company_id %: %', company_id_param, SQLERRM;
        -- Re-raise the exception
        RAISE;
END;
$function$;