-- Step 1: Clean up all existing triggers on customers table that handle account creation
DROP TRIGGER IF EXISTS handle_new_customer ON public.customers;
DROP TRIGGER IF EXISTS handle_customer_account_creation ON public.customers;
DROP TRIGGER IF EXISTS handle_new_customer_trigger ON public.customers;

-- Step 2: Drop old/duplicate functions to avoid conflicts
DROP FUNCTION IF EXISTS public.handle_new_customer() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_customer_fixed() CASCADE;
DROP FUNCTION IF EXISTS public.handle_customer_account_creation() CASCADE;

-- Step 3: Create an improved create_customer_financial_account function with better error handling
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    customer_id_param uuid, 
    company_id_param uuid, 
    customer_data jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_id UUID;
    parent_account_id UUID;
    company_settings JSONB;
    account_name TEXT;
    account_code TEXT;
    customer_record RECORD;
    account_prefix TEXT := 'CUST-';
    counter INTEGER := 1;
    base_account_code TEXT;
    final_account_code TEXT;
BEGIN
    -- Log function start
    RAISE LOG 'Starting create_customer_financial_account for customer: %, company: %', customer_id_param, company_id_param;
    
    -- Get customer data
    SELECT * INTO customer_record
    FROM public.customers
    WHERE id = customer_id_param AND company_id = company_id_param;
    
    IF NOT FOUND THEN
        RAISE LOG 'Customer not found: %', customer_id_param;
        RETURN NULL;
    END IF;
    
    -- Get company settings for customer account creation
    SELECT customer_account_settings INTO company_settings
    FROM public.companies
    WHERE id = company_id_param;
    
    -- Check if auto account creation is enabled (default to true if not set)
    IF company_settings IS NULL OR (company_settings->>'auto_create_account')::boolean IS NOT FALSE THEN
        RAISE LOG 'Auto account creation is enabled or not configured, proceeding...';
    ELSE
        RAISE LOG 'Auto account creation is disabled for company: %', company_id_param;
        RETURN NULL;
    END IF;
    
    -- Get account prefix from settings
    IF company_settings->>'account_prefix' IS NOT NULL THEN
        account_prefix := company_settings->>'account_prefix';
    END IF;
    
    -- Find parent receivables account
    SELECT coa.id INTO parent_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%receivable%' 
         OR coa.account_name ILIKE '%مدين%' 
         OR coa.account_name ILIKE '%ذمم%'
         OR coa.account_code LIKE '112%')
    AND coa.is_active = true
    AND coa.is_header = true
    ORDER BY coa.account_code
    LIMIT 1;
    
    IF parent_account_id IS NULL THEN
        -- Try to get default receivables account from company settings
        IF company_settings->>'default_receivables_account_id' IS NOT NULL THEN
            parent_account_id := (company_settings->>'default_receivables_account_id')::uuid;
            RAISE LOG 'Using default receivables account from settings: %', parent_account_id;
        ELSE
            RAISE LOG 'No parent receivables account found for company: %', company_id_param;
            RETURN NULL;
        END IF;
    ELSE
        RAISE LOG 'Found existing parent receivables account: %', parent_account_id;
    END IF;
    
    -- Create account name based on customer type and settings
    IF customer_record.customer_type = 'individual' THEN
        account_name := COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, '');
        account_name := TRIM(account_name);
        IF account_name = '' THEN
            account_name := 'Customer - ' || SUBSTRING(customer_id_param::text, 1, 8);
        END IF;
    ELSE
        account_name := COALESCE(customer_record.company_name, 'Company - ' || SUBSTRING(customer_id_param::text, 1, 8));
    END IF;
    
    RAISE LOG 'Customer account name will be: %', account_name;
    
    -- Generate unique account code
    base_account_code := account_prefix || LPAD((
        SELECT COUNT(*) + 1 
        FROM public.chart_of_accounts 
        WHERE company_id = company_id_param 
        AND account_code LIKE account_prefix || '%'
    )::TEXT, 4, '0');
    
    final_account_code := base_account_code;
    
    -- Ensure account code is unique
    WHILE EXISTS (
        SELECT 1 FROM public.chart_of_accounts 
        WHERE company_id = company_id_param AND account_code = final_account_code
    ) LOOP
        counter := counter + 1;
        final_account_code := base_account_code || '-' || counter::TEXT;
    END LOOP;
    
    -- Create the customer account
    INSERT INTO public.chart_of_accounts (
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
        company_id_param,
        final_account_code,
        account_name,
        account_name, -- Use same name for Arabic if not provided
        'assets',
        'accounts_receivable',
        'debit',
        parent_account_id,
        3, -- Sub-account level
        false,
        true,
        0
    ) RETURNING id INTO account_id;
    
    -- Link the account to the customer
    INSERT INTO public.customer_accounts (
        customer_id,
        account_id,
        company_id,
        is_primary,
        created_by
    ) VALUES (
        customer_id_param,
        account_id,
        company_id_param,
        true,
        auth.uid()
    );
    
    RAISE LOG 'Successfully created customer account: % with code: %', account_id, final_account_code;
    
    RETURN account_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in create_customer_financial_account: % - %', SQLSTATE, SQLERRM;
        -- Don't re-raise the exception, just return NULL to allow customer creation to continue
        RETURN NULL;
END;
$function$;

-- Step 4: Create a new, clean trigger function for customer account creation
CREATE OR REPLACE FUNCTION public.handle_customer_financial_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_id UUID;
    company_settings JSONB;
BEGIN
    -- Only handle INSERT operations
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;
    
    -- Get company settings
    SELECT customer_account_settings INTO company_settings
    FROM public.companies
    WHERE id = NEW.company_id;
    
    -- Check if auto account creation is enabled (default to true)
    IF company_settings IS NULL OR (company_settings->>'auto_create_account')::boolean IS NOT FALSE THEN
        -- Try to create financial account (non-blocking)
        BEGIN
            account_id := public.create_customer_financial_account(
                NEW.id, 
                NEW.company_id, 
                to_jsonb(NEW)
            );
            
            IF account_id IS NOT NULL THEN
                RAISE LOG 'Successfully created financial account % for customer %', account_id, NEW.id;
            ELSE
                RAISE LOG 'Financial account creation returned NULL for customer %', NEW.id;
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the error but don't block customer creation
                RAISE LOG 'Failed to create financial account for customer %: % - %', NEW.id, SQLSTATE, SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Step 5: Create the single, clean trigger
CREATE TRIGGER handle_customer_financial_account_trigger
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_customer_financial_account();

-- Step 6: Ensure companies have proper customer account settings
UPDATE public.companies 
SET customer_account_settings = COALESCE(
    customer_account_settings,
    '{"account_prefix": "CUST-", "account_group_by": "customer_type", "auto_create_account": true, "account_naming_pattern": "customer_name", "enable_account_selection": true, "default_receivables_account_id": null}'::jsonb
)
WHERE customer_account_settings IS NULL;