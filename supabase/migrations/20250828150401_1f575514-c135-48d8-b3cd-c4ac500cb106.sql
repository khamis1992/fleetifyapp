-- Update company customer account settings to set default receivables account
UPDATE companies 
SET customer_account_settings = jsonb_set(
    customer_account_settings,
    '{default_receivables_account_id}',
    '"0f4c16fd-e2b8-4532-99b4-c4881619dec0"'::jsonb
) 
WHERE id = '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c';

-- Improved auto_create_customer_accounts function with better error handling and logging
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    customer_id_param uuid,
    company_id_param uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    settings jsonb;
    account_id uuid;
    account_type_id uuid;
    generated_account_code text;
    account_name text;
    account_name_ar text;
    default_receivables_account_id uuid;
    customer_record record;
    created_accounts_count integer := 0;
    result jsonb;
    error_message text;
BEGIN
    -- Log function start
    RAISE NOTICE 'Starting auto_create_customer_accounts for customer % in company %', customer_id_param, company_id_param;
    
    -- Get customer account settings
    SELECT customer_account_settings INTO settings
    FROM companies
    WHERE id = company_id_param;
    
    IF settings IS NULL THEN
        error_message := 'No customer account settings found for company';
        RAISE NOTICE 'ERROR: %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
    END IF;
    
    -- Check if auto creation is enabled
    IF NOT COALESCE((settings->>'auto_create_account')::boolean, false) THEN
        error_message := 'Auto account creation is disabled';
        RAISE NOTICE 'INFO: %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'message', error_message,
            'created_accounts', 0
        );
    END IF;
    
    -- Get default receivables account ID
    default_receivables_account_id := (settings->>'default_receivables_account_id')::uuid;
    
    IF default_receivables_account_id IS NULL THEN
        error_message := 'Default receivables account not configured in company settings';
        RAISE NOTICE 'ERROR: %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
    END IF;
    
    -- Verify the default receivables account exists
    IF NOT EXISTS (
        SELECT 1 FROM chart_of_accounts 
        WHERE id = default_receivables_account_id 
        AND company_id = company_id_param 
        AND is_active = true
    ) THEN
        error_message := 'Default receivables account does not exist or is inactive';
        RAISE NOTICE 'ERROR: %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
    END IF;
    
    -- Get customer information
    SELECT * INTO customer_record
    FROM customers
    WHERE id = customer_id_param AND company_id = company_id_param;
    
    IF NOT FOUND THEN
        error_message := 'Customer not found';
        RAISE NOTICE 'ERROR: %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
    END IF;
    
    RAISE NOTICE 'Customer found: % (type: %)', 
        CASE WHEN customer_record.customer_type = 'individual' 
             THEN customer_record.first_name || ' ' || customer_record.last_name
             ELSE customer_record.company_name 
        END,
        customer_record.customer_type;
    
    -- Check if customer already has accounts
    IF EXISTS (
        SELECT 1 FROM customer_accounts 
        WHERE customer_id = customer_id_param AND is_active = true
    ) THEN
        RAISE NOTICE 'Customer already has accounts, skipping creation';
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Customer already has accounts',
            'created_accounts', 0
        );
    END IF;
    
    -- Generate account code
    generated_account_code := COALESCE(settings->>'account_prefix', 'CUST-') || 
                             LPAD((
                                 SELECT COUNT(*) + 1 
                                 FROM customer_accounts ca
                                 JOIN customers c ON ca.customer_id = c.id
                                 WHERE c.company_id = company_id_param
                             )::text, 4, '0');
    
    -- Generate account names based on customer type and naming pattern
    IF customer_record.customer_type = 'individual' THEN
        account_name := customer_record.first_name || ' ' || customer_record.last_name;
        account_name_ar := customer_record.first_name || ' ' || customer_record.last_name;
    ELSE
        account_name := customer_record.company_name;
        account_name_ar := COALESCE(customer_record.company_name_ar, customer_record.company_name);
    END IF;
    
    RAISE NOTICE 'Creating account with code: %, name: %', generated_account_code, account_name;
    
    -- Create the chart of accounts entry
    INSERT INTO chart_of_accounts (
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        balance_type,
        parent_account_id,
        account_level,
        is_active,
        is_header,
        can_link_customers,
        description
    )
    VALUES (
        company_id_param,
        generated_account_code,
        account_name,
        account_name_ar,
        'assets',
        'debit',
        default_receivables_account_id,
        (SELECT account_level + 1 FROM chart_of_accounts WHERE id = default_receivables_account_id),
        true,
        false,
        true,
        'حساب عميل تم إنشاؤه تلقائياً'
    )
    RETURNING id INTO account_id;
    
    RAISE NOTICE 'Chart of accounts entry created with ID: %', account_id;
    
    -- Get or create customer account type
    SELECT id INTO account_type_id
    FROM customer_account_types
    WHERE company_id = company_id_param 
    AND type_name = 'receivables'
    AND is_active = true
    LIMIT 1;
    
    IF account_type_id IS NULL THEN
        INSERT INTO customer_account_types (
            company_id,
            type_name,
            type_name_ar,
            account_category,
            is_active
        )
        VALUES (
            company_id_param,
            'receivables',
            'ذمم مدينة',
            'receivables',
            true
        )
        RETURNING id INTO account_type_id;
        
        RAISE NOTICE 'Created new customer account type with ID: %', account_type_id;
    END IF;
    
    -- Create the customer account
    INSERT INTO customer_accounts (
        customer_id,
        account_id,
        account_type_id,
        is_default,
        currency,
        is_active
    )
    VALUES (
        customer_id_param,
        account_id,
        account_type_id,
        true,
        COALESCE((SELECT currency FROM companies WHERE id = company_id_param), 'KWD'),
        true
    );
    
    created_accounts_count := 1;
    
    RAISE NOTICE 'Customer account created successfully. Total accounts created: %', created_accounts_count;
    
    result := jsonb_build_object(
        'success', true,
        'message', 'Customer accounts created successfully',
        'created_accounts', created_accounts_count,
        'account_code', generated_account_code,
        'account_name', account_name
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        error_message := SQLERRM;
        RAISE NOTICE 'ERROR in auto_create_customer_accounts: %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
END;
$$;