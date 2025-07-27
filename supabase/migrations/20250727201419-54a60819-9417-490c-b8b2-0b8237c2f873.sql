-- Step 1: Drop all existing customer-related triggers and functions to clean up conflicts
DROP TRIGGER IF EXISTS customer_account_trigger ON public.customers;
DROP TRIGGER IF EXISTS trigger_create_customer_account ON public.customers;
DROP TRIGGER IF EXISTS create_customer_account_trigger ON public.customers;

-- Drop all versions of the function
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.create_customer_account_trigger();
DROP FUNCTION IF EXISTS public.handle_customer_account_creation();

-- Step 2: Create the corrected function with proper aliases
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    p_company_id uuid,
    p_customer_id uuid,
    p_customer_name text,
    p_customer_name_ar text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    receivables_account_id uuid;
    new_account_id uuid;
    account_code_value text;
    max_code_number integer := 0;
BEGIN
    -- Find the receivables parent account with proper alias
    SELECT coa.id INTO receivables_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = p_company_id
    AND coa.account_type = 'assets'
    AND coa.account_subtype = 'current_assets'
    AND (coa.account_name ILIKE '%receivable%' OR coa.account_name_ar ILIKE '%مدين%')
    AND coa.is_header = true
    AND coa.is_active = true
    LIMIT 1;

    -- If no receivables header account found, find any receivables account
    IF receivables_account_id IS NULL THEN
        SELECT coa.id INTO receivables_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = p_company_id
        AND coa.account_type = 'assets'
        AND (coa.account_name ILIKE '%receivable%' OR coa.account_name_ar ILIKE '%مدين%')
        AND coa.is_active = true
        LIMIT 1;
    END IF;

    -- Still no receivables account? Create a basic one
    IF receivables_account_id IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, account_subtype, balance_type, account_level,
            is_header, is_active, current_balance
        ) VALUES (
            gen_random_uuid(), p_company_id, '1200', 'Accounts Receivable', 'حسابات مدينة',
            'assets', 'current_assets', 'debit', 2,
            true, true, 0
        ) RETURNING id INTO receivables_account_id;
    END IF;

    -- Generate unique account code for customer
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS INTEGER)), 0)
    INTO max_code_number
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = p_company_id
    AND coa.parent_account_id = receivables_account_id;

    account_code_value := (
        SELECT SUBSTRING(coa.account_code FROM '^[0-9]+') || LPAD((max_code_number + 1)::text, 3, '0')
        FROM public.chart_of_accounts coa
        WHERE coa.id = receivables_account_id
    );

    -- Fallback if code generation fails
    IF account_code_value IS NULL OR account_code_value = '' THEN
        account_code_value := '1201' || LPAD((max_code_number + 1)::text, 3, '0');
    END IF;

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
        is_active,
        current_balance
    ) VALUES (
        gen_random_uuid(),
        p_company_id,
        account_code_value,
        p_customer_name,
        COALESCE(p_customer_name_ar, p_customer_name),
        'assets',
        'current_assets',
        'debit',
        3,
        false,
        true,
        0
    ) RETURNING id INTO new_account_id;

    -- Link the customer to the account
    INSERT INTO public.customer_accounts (
        id,
        company_id,
        customer_id,
        account_id
    ) VALUES (
        gen_random_uuid(),
        p_company_id,
        p_customer_id,
        new_account_id
    );

    RETURN new_account_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating customer financial account: %', SQLERRM;
        RETURN NULL;
END;
$function$;

-- Step 3: Create the single, correct trigger function
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
        
        IF account_id IS NOT NULL THEN
            RAISE NOTICE 'Created financial account % for customer %', account_id, NEW.id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create financial account for customer %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;

-- Step 4: Create the single trigger
CREATE TRIGGER create_customer_account_trigger
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.create_customer_account_trigger();