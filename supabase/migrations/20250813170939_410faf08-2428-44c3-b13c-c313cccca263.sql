-- Fix account level calculation and update get_entry_allowed_accounts function

-- First, create a function to calculate proper account levels based on account code length
CREATE OR REPLACE FUNCTION public.calculate_account_level_from_code(account_code_param text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    -- Calculate level based on account code length
    -- Level 1: 1-2 digits (main categories)
    -- Level 2: 3-4 digits (subcategories) 
    -- Level 3: 5-6 digits (detailed accounts)
    -- Level 4: 7-8 digits (sub-detailed accounts)
    -- Level 5: 9+ digits (most detailed accounts)
    
    CASE LENGTH(account_code_param)
        WHEN 1, 2 THEN RETURN 1;
        WHEN 3, 4 THEN RETURN 2;
        WHEN 5, 6 THEN RETURN 3;
        WHEN 7, 8 THEN RETURN 4;
        ELSE RETURN 5;
    END CASE;
END;
$function$;

-- Update account levels for all existing accounts
UPDATE public.chart_of_accounts 
SET account_level = public.calculate_account_level_from_code(account_code)
WHERE account_level = 1;

-- Update the get_entry_allowed_accounts function to be more flexible
CREATE OR REPLACE FUNCTION public.get_entry_allowed_accounts(company_id_param uuid)
RETURNS TABLE(
    id uuid,
    account_code varchar,
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
    -- Validate company_id parameter
    IF company_id_param IS NULL THEN
        RAISE EXCEPTION 'Company ID parameter cannot be null'
            USING ERRCODE = 'invalid_parameter_value';
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
    AND (
        -- Allow detailed accounts (level 3 and above) that are not headers
        (coa.account_level >= 3 AND coa.is_header = false)
        OR
        -- Allow accounts with longer codes (4+ digits) even if level is miscalculated
        (LENGTH(coa.account_code) >= 4 AND coa.is_header = false)
        OR
        -- Allow accounts that are specifically marked as non-aggregate
        (coa.is_header = false AND coa.account_level >= 2 AND LENGTH(coa.account_code) >= 3)
    )
    ORDER BY coa.account_code;
END;
$function$;

-- Create a trigger to automatically set account level when inserting/updating accounts
CREATE OR REPLACE FUNCTION public.set_account_level_from_code()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Calculate and set account level based on account code
    NEW.account_level := public.calculate_account_level_from_code(NEW.account_code);
    
    -- Set is_header based on account level and code length
    -- Header accounts are typically shorter codes (1-2 digits) or explicitly marked
    IF LENGTH(NEW.account_code) <= 2 OR NEW.account_level <= 1 THEN
        NEW.is_header := true;
    ELSIF NEW.is_header IS NULL THEN
        NEW.is_header := false;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Create trigger for automatic account level calculation
DROP TRIGGER IF EXISTS set_account_level_trigger ON public.chart_of_accounts;
CREATE TRIGGER set_account_level_trigger
    BEFORE INSERT OR UPDATE OF account_code ON public.chart_of_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_account_level_from_code();

-- Update existing accounts to have proper is_header values
UPDATE public.chart_of_accounts 
SET is_header = CASE 
    WHEN LENGTH(account_code) <= 2 OR account_level <= 1 THEN true
    ELSE false
END
WHERE is_header IS NULL OR (LENGTH(account_code) <= 2 AND is_header = false);