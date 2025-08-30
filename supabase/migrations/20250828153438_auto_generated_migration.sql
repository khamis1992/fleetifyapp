-- Fix and improve the auto_create_customer_accounts function
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    customer_id_param uuid,
    company_id_param uuid
)
RETURNS json
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
    parent_account record;
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
        RETURN json_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
    END IF;
    
    -- Check if auto creation is enabled
    IF NOT COALESCE((settings->>'auto_create_account')::boolean, false) THEN
        error_message := 'Auto account creation is disabled';
        RAISE NOTICE 'INFO: %', error_message;
        RETURN json_build_object(
            'success', false,
            'message', error_message,
            'created_accounts', 0
        );
    END IF;
    
    -- Get or find default receivables account ID
    default_receivables_account_id := (settings->>'default_receivables_account_id')::uuid;
    
    -- If no default receivables account is set, try to find one automatically
    IF default_receivables_account_id IS NULL THEN
        RAISE NOTICE 'No default receivables account configured, searching for suitable account...';
        
        -- Look for a receivables account (account type 'asset' and contains 'receivable' or starts with '12')
        SELECT id INTO default_receivables_account_id
        FROM chart_of_accounts 
        WHERE company_id = company_id_param 
        AND is_active = true
        AND account_type = 'asset'
        AND (
            LOWER(account_name) LIKE '%receivable%'
            OR LOWER(account_name) LIKE '%مدين%'
            OR account_code LIKE '12%'
            OR account_code LIKE '1120%'
        )
        ORDER BY account_code
        LIMIT 1;
        
        -- If still not found, create a default receivables account
        IF default_receivables_account_id IS NULL THEN
            RAISE NOTICE 'No receivables account found, creating default receivables account...';
            
            -- Find a parent account for receivables (like "Current Assets" or "11")
            SELECT id, account_code, account_level INTO parent_account
            FROM chart_of_accounts 
            WHERE company_id = company_id_param 
            AND is_active = true
            AND account_type = 'asset'
            AND is_header = true
            AND (account_code = '11' OR account_code = '1' OR LOWER(account_name) LIKE '%current%')
            ORDER BY account_level, account_code
            LIMIT 1;
            
            -- Generate account code for receivables
            generated_account_code := CASE 
                WHEN parent_account.account_code IS NOT NULL THEN 
                    CASE 
                        WHEN parent_account.account_level = 1 THEN parent_account.account_code || '12'
                        WHEN parent_account.account_level = 2 THEN parent_account.account_code || '20'
                        ELSE parent_account.account_code || '1'
                    END
                ELSE '1120'
            END;
            
            -- Create default receivables account
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
                'Accounts Receivable',
                'حسابات المدينين',
                'asset',
                'debit',
                parent_account.id,
                COALESCE(parent_account.account_level + 1, 3),
                true,
                true,
                true,
                'Default receivables account for customer accounts'
            )
            RETURNING id INTO default_receivables_account_id;
            
            RAISE NOTICE 'Created default receivables account with ID: %', default_receivables_account_id;
            
            -- Update company settings with the new default receivables account
            UPDATE companies 
            SET customer_account_settings = jsonb_set(
                COALESCE(customer_account_settings, '{}'::jsonb), 
                '{default_receivables_account_id}', 
                to_jsonb(default_receivables_account_id::text)
            )
            WHERE id = company_id_param;
        END IF;
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
        RETURN json_build_object(
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
        RETURN json_build_object(
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
        RETURN json_build_object(
            'success', true,
            'message', 'Customer already has accounts',
            'created_accounts', 0
        );
    END IF;
    
    -- Generate account code for customer
    generated_account_code := COALESCE(settings->>'account_prefix', 'CUST-') || 
                             LPAD((
                                 SELECT COUNT(*) + 1 
                                 FROM customer_accounts ca
                                 JOIN customers c ON ca.customer_id = c.id
                                 WHERE c.company_id = company_id_param
                             )::text, 4, '0');
    
    -- Generate account names based on customer type and naming pattern
    IF customer_record.customer_type = 'individual' THEN
        account_name := TRIM(customer_record.first_name || ' ' || customer_record.last_name);
        account_name_ar := TRIM(COALESCE(customer_record.first_name_ar, customer_record.first_name) || ' ' || 
                               COALESCE(customer_record.last_name_ar, customer_record.last_name));
    ELSE
        account_name := customer_record.company_name;
        account_name_ar := COALESCE(customer_record.company_name_ar, customer_record.company_name);
    END IF;
    
    RAISE NOTICE 'Creating customer account with code: %, name: %', generated_account_code, account_name;
    
    -- Create the chart of accounts entry for the customer
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
        'asset',
        'debit',
        default_receivables_account_id,
        (SELECT account_level + 1 FROM chart_of_accounts WHERE id = default_receivables_account_id),
        true,
        false,
        true,
        'Customer account for ' || account_name
    )
    RETURNING id INTO account_id;
    
    RAISE NOTICE 'Created chart of accounts entry with ID: %', account_id;
    
    -- Create customer account link
    INSERT INTO customer_accounts (
        company_id,
        customer_id,
        account_id,
        is_default,
        currency,
        is_active
    )
    VALUES (
        company_id_param,
        customer_id_param,
        account_id,
        true,
        'KWD',
        true
    );
    
    created_accounts_count := 1;
    
    RAISE NOTICE 'Successfully created customer account link';
    
    RETURN json_build_object(
        'success', true,
        'message', 'Customer account created successfully',
        'created_accounts', created_accounts_count,
        'account_id', account_id,
        'account_code', generated_account_code,
        'account_name', account_name
    );
    
EXCEPTION
    WHEN OTHERS THEN
        error_message := 'Error creating customer accounts: ' || SQLERRM;
        RAISE NOTICE 'ERROR: %', error_message;
        RETURN json_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
END;
$$;