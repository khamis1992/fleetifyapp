-- Drop existing problematic function and recreate with proper aliases and error handling
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text);

-- Recreate the function with clear table aliases and improved error handling
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    company_id_param uuid, 
    customer_id_param uuid, 
    customer_name_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_account_code character varying;
    parent_account_id uuid;
    new_account_id uuid;
    next_number integer;
    company_exists boolean := false;
    customer_exists boolean := false;
BEGIN
    -- Input validation
    IF company_id_param IS NULL OR customer_id_param IS NULL OR customer_name_param IS NULL THEN
        RAISE EXCEPTION 'Invalid input parameters: company_id, customer_id, and customer_name cannot be null';
    END IF;

    -- Verify company exists
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = company_id_param) INTO company_exists;
    IF NOT company_exists THEN
        RAISE EXCEPTION 'Company with id % does not exist', company_id_param;
    END IF;

    -- Verify customer exists
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = customer_id_param) INTO customer_exists;
    IF NOT customer_exists THEN
        RAISE EXCEPTION 'Customer with id % does not exist', customer_id_param;
    END IF;

    -- Check if customer already has a financial account
    IF EXISTS(SELECT 1 FROM public.customer_accounts WHERE customer_id = customer_id_param) THEN
        RAISE NOTICE 'Customer % already has a financial account', customer_id_param;
        SELECT account_id INTO new_account_id 
        FROM public.customer_accounts 
        WHERE customer_id = customer_id_param 
        LIMIT 1;
        RETURN new_account_id;
    END IF;

    -- Find the parent receivables account with explicit table alias
    SELECT coa.id INTO parent_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND coa.account_name ILIKE '%receivable%'
    AND coa.is_header = true
    AND coa.is_active = true
    ORDER BY coa.account_level, coa.account_code
    LIMIT 1;
    
    -- If no header receivables account found, find any receivables account
    IF parent_account_id IS NULL THEN
        SELECT coa.id INTO parent_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'assets'
        AND coa.account_name ILIKE '%receivable%'
        AND coa.is_active = true
        ORDER BY coa.account_level, coa.account_code
        LIMIT 1;
    END IF;

    -- Generate unique account code with explicit table alias to avoid ambiguity
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS integer)), 0) + 1
    INTO next_number
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_code ~ '^[0-9]+$';
    
    -- Ensure we have a valid next number
    IF next_number IS NULL OR next_number < 1 THEN
        next_number := 1001; -- Start from 1001 if no accounts exist
    END IF;

    new_account_code := LPAD(next_number::text, 4, '0');
    
    -- Ensure account code is unique
    WHILE EXISTS(SELECT 1 FROM public.chart_of_accounts WHERE company_id = company_id_param AND account_code = new_account_code) LOOP
        next_number := next_number + 1;
        new_account_code := LPAD(next_number::text, 4, '0');
    END LOOP;

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
        description,
        current_balance,
        is_active
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        new_account_code,
        customer_name_param || ' - Customer Account',
        customer_name_param || ' - حساب العميل',
        'assets',
        'accounts_receivable',
        'debit',
        parent_account_id,
        CASE 
            WHEN parent_account_id IS NOT NULL THEN
                (SELECT coa2.account_level + 1 FROM public.chart_of_accounts coa2 WHERE coa2.id = parent_account_id)
            ELSE 2 
        END,
        false,
        false,
        'Customer receivables account for ' || customer_name_param,
        0,
        true
    ) RETURNING id INTO new_account_id;
    
    -- Link the account to the customer
    INSERT INTO public.customer_accounts (
        id,
        company_id,
        customer_id,
        account_id
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        customer_id_param,
        new_account_id
    );
    
    RAISE NOTICE 'Successfully created financial account % for customer %', new_account_id, customer_id_param;
    
    RETURN new_account_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating customer financial account: %', SQLERRM;
END;
$function$;

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.create_customer_account_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_name_full text;
    account_id uuid;
BEGIN
    -- Build customer name
    IF NEW.customer_type = 'individual' THEN
        customer_name_full := COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, '');
    ELSE
        customer_name_full := COALESCE(NEW.company_name, 'Corporate Customer');
    END IF;
    
    customer_name_full := TRIM(customer_name_full);
    
    -- Ensure we have a valid name
    IF customer_name_full = '' OR customer_name_full IS NULL THEN
        customer_name_full := 'Customer ' || NEW.id::text;
    END IF;
    
    -- Create financial account for customer
    BEGIN
        account_id := public.create_customer_financial_account(
            NEW.company_id,
            NEW.id,
            customer_name_full
        );
        
        RAISE NOTICE 'Created financial account % for customer %', account_id, NEW.id;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail customer creation
            RAISE WARNING 'Failed to create financial account for customer %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$function$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS trigger_create_customer_account ON public.customers;

CREATE TRIGGER trigger_create_customer_account
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.create_customer_account_trigger();