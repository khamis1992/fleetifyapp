-- Fix the auto_create_customer_accounts function with correct parameter names
DROP FUNCTION IF EXISTS public.auto_create_customer_accounts(uuid, uuid);

CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id uuid,
    p_company_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    customer_record RECORD;
    customer_name TEXT;
    customer_type_name TEXT;
    account_type_record RECORD;
    new_account_code TEXT;
    new_account_name TEXT;
    new_account_id UUID;
    receivables_account_id UUID;
    code_counter INTEGER;
    accounts_created INTEGER := 0;
BEGIN
    -- Get customer details
    SELECT * INTO customer_record
    FROM public.customers c
    WHERE c.id = p_customer_id
    AND c.company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found: %', p_customer_id;
    END IF;
    
    -- Get customer display name
    IF customer_record.customer_type = 'individual' THEN
        customer_name := TRIM(COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, ''));
        customer_type_name := 'فردي';
    ELSE
        customer_name := COALESCE(customer_record.company_name, 'عميل مؤسسي');
        customer_type_name := 'مؤسسي';
    END IF;
    
    -- Get default receivables account - use table alias to avoid ambiguity
    SELECT coa.id INTO receivables_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = p_company_id
    AND coa.account_type = 'assets'
    AND coa.account_subtype = 'current_assets'
    AND (coa.account_name ILIKE '%receivab%' OR coa.account_name ILIKE '%مدين%' OR coa.account_name ILIKE '%ذمم%')
    AND coa.is_active = true
    LIMIT 1;
    
    -- If no receivables account found, create a basic one
    IF receivables_account_id IS NULL THEN
        -- Find next available account code for receivables (typically 1200+ range)
        SELECT COALESCE(MAX(CAST(coa.account_code AS INTEGER)), 1199) + 1 INTO code_counter
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = p_company_id
        AND coa.account_code ~ '^[0-9]+$'
        AND CAST(coa.account_code AS INTEGER) BETWEEN 1200 AND 1299;
        
        new_account_code := code_counter::TEXT;
        new_account_name := 'ذمم العملاء - ' || customer_type_name;
        
        INSERT INTO public.chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, account_subtype, balance_type, account_level,
            is_active, is_header, current_balance
        ) VALUES (
            gen_random_uuid(), p_company_id, new_account_code, new_account_name, new_account_name,
            'assets', 'current_assets', 'debit', 5,
            true, false, 0
        ) RETURNING id INTO receivables_account_id;
        
        accounts_created := accounts_created + 1;
    END IF;
    
    -- Create customer-specific accounts for each customer account type
    FOR account_type_record IN 
        SELECT cat.* FROM public.customer_account_types cat
        WHERE cat.is_active = true 
        ORDER BY cat.type_name
    LOOP
        -- Generate unique account code
        SELECT COALESCE(MAX(CAST(coa.account_code AS INTEGER)), 1999) + 1 INTO code_counter
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = p_company_id
        AND coa.account_code ~ '^[0-9]+$'
        AND CAST(coa.account_code AS INTEGER) BETWEEN 2000 AND 2999;
        
        new_account_code := code_counter::TEXT;
        new_account_name := account_type_record.type_name || ' - ' || customer_name;
        
        -- Create the account
        INSERT INTO public.chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, account_subtype, balance_type, account_level,
            is_active, is_header, can_link_customers, current_balance
        ) VALUES (
            gen_random_uuid(), p_company_id, new_account_code, new_account_name, new_account_name,
            CASE 
                WHEN account_type_record.account_category = 'receivables' THEN 'assets'
                WHEN account_type_record.account_category = 'payables' THEN 'liabilities'
                ELSE 'assets'
            END,
            CASE 
                WHEN account_type_record.account_category = 'receivables' THEN 'current_assets'
                WHEN account_type_record.account_category = 'payables' THEN 'current_liabilities'
                ELSE 'current_assets'
            END,
            CASE 
                WHEN account_type_record.account_category = 'receivables' THEN 'debit'
                WHEN account_type_record.account_category = 'payables' THEN 'credit'
                ELSE 'debit'
            END,
            5, true, false, true, 0
        ) RETURNING id INTO new_account_id;
        
        -- Create customer account linking
        INSERT INTO public.customer_accounts (
            id, customer_id, account_id, account_type_id, 
            is_default, currency, is_active
        ) VALUES (
            gen_random_uuid(), p_customer_id, new_account_id, account_type_record.id,
            false, 'KWD', true
        );
        
        accounts_created := accounts_created + 1;
    END LOOP;
    
    RETURN accounts_created;
END;
$$;