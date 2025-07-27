-- Clean up customer financial account creation functions and fix ambiguous column reference
-- Drop all existing versions of the function to avoid overload conflicts
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text, text);

-- Recreate the function with proper column qualifications to avoid ambiguity
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    company_id_param uuid,
    customer_id_param uuid,
    customer_name_param text,
    customer_name_ar_param text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    receivables_account_id uuid;
    new_account_code text;
    new_account_id uuid;
    max_code_number integer := 0;
BEGIN
    -- Find the Accounts Receivable parent account
    SELECT coa.id INTO receivables_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%receivable%' OR coa.account_name_ar ILIKE '%مدين%')
    AND coa.is_header = true
    AND coa.is_active = true
    LIMIT 1;

    -- If no receivables header found, find any receivables account
    IF receivables_account_id IS NULL THEN
        SELECT coa.id INTO receivables_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'assets'
        AND (coa.account_name ILIKE '%receivable%' OR coa.account_name_ar ILIKE '%مدين%')
        AND coa.is_active = true
        LIMIT 1;
    END IF;

    -- Generate unique account code
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS INTEGER)), 0)
    INTO max_code_number
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_code ~ '^[0-9]+-[0-9]+$';
    
    new_account_code := '1200-' || LPAD((max_code_number + 1)::text, 4, '0');

    -- Create the customer account
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        parent_account_id,
        account_level,
        is_header,
        is_system,
        is_active,
        current_balance,
        description
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        new_account_code,
        customer_name_param,
        COALESCE(customer_name_ar_param, customer_name_param),
        'assets',
        'current_assets',
        'debit',
        receivables_account_id,
        3,
        false,
        false,
        true,
        0,
        'Customer account for ' || customer_name_param
    ) RETURNING id INTO new_account_id;

    -- Create customer account mapping
    INSERT INTO public.customer_accounts (
        customer_id,
        account_id,
        company_id
    ) VALUES (
        customer_id_param,
        new_account_id,
        company_id_param
    );

    RETURN new_account_id;
END;
$function$;

-- Update the customer trigger to use the correct function signature
CREATE OR REPLACE FUNCTION public.create_customer_account_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_name_full text;
    customer_name_ar_full text;
    account_id uuid;
BEGIN
    -- Build customer names
    IF NEW.customer_type = 'individual' THEN
        customer_name_full := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
        customer_name_ar_full := TRIM(COALESCE(NEW.first_name_ar, '') || ' ' || COALESCE(NEW.last_name_ar, ''));
    ELSE
        customer_name_full := TRIM(COALESCE(NEW.company_name, 'Corporate Customer'));
        customer_name_ar_full := TRIM(COALESCE(NEW.company_name_ar, NEW.company_name, 'Corporate Customer'));
    END IF;
    
    -- Fallback names
    IF customer_name_full = '' OR customer_name_full IS NULL THEN
        customer_name_full := 'Customer ' || NEW.id::text;
    END IF;
    
    IF customer_name_ar_full = '' OR customer_name_ar_full IS NULL THEN
        customer_name_ar_full := customer_name_full;
    END IF;
    
    -- Create financial account with error handling
    BEGIN
        account_id := public.create_customer_financial_account(
            NEW.company_id,
            NEW.id,
            customer_name_full,
            customer_name_ar_full
        );
        
        RAISE NOTICE 'Created financial account % for customer %', account_id, NEW.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create financial account for customer %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS create_customer_account_trigger ON public.customers;
CREATE TRIGGER create_customer_account_trigger
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.create_customer_account_trigger();