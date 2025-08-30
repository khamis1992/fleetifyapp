-- Fix auto_create_customer_accounts function to use correct account_type values
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id uuid,
    p_company_id uuid
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record RECORD;
    account_type_record RECORD;
    created_count INTEGER := 0;
    new_account_id UUID;
    account_code TEXT;
    account_name TEXT;
    account_name_ar TEXT;
    base_code TEXT;
    counter INTEGER;
    max_attempts INTEGER := 100;
    default_receivables_account_id UUID;
BEGIN
    -- Log function start
    RAISE NOTICE 'Starting auto_create_customer_accounts for customer: %, company: %', p_customer_id, p_company_id;
    
    -- Get customer information
    SELECT * INTO customer_record
    FROM customers
    WHERE id = p_customer_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found: %', p_customer_id;
    END IF;
    
    RAISE NOTICE 'Customer found: % (type: %)', customer_record.customer_code, customer_record.customer_type;
    
    -- Check if customer already has accounts
    IF EXISTS (
        SELECT 1 FROM customer_accounts 
        WHERE customer_id = p_customer_id AND is_active = true
    ) THEN
        RAISE NOTICE 'Customer already has accounts, skipping creation';
        RETURN 0;
    END IF;
    
    -- Generate base account code from customer code (first 8 characters)
    base_code := UPPER(LEFT(COALESCE(customer_record.customer_code, 'CUST'), 8));
    RAISE NOTICE 'Base account code: %', base_code;
    
    -- Get all available account types for customer accounts
    FOR account_type_record IN 
        SELECT * FROM customer_account_types 
        WHERE is_active = true 
        ORDER BY type_name
    LOOP
        RAISE NOTICE 'Processing account type: % (%)', account_type_record.type_name, account_type_record.account_category;
        
        -- Generate account code
        counter := 1;
        account_code := base_code || LPAD(counter::TEXT, 2, '0');
        
        -- Ensure unique account code
        WHILE EXISTS (
            SELECT 1 FROM chart_of_accounts 
            WHERE company_id = p_company_id AND account_code = account_code
        ) AND counter <= max_attempts LOOP
            counter := counter + 1;
            account_code := base_code || LPAD(counter::TEXT, 2, '0');
        END LOOP;
        
        IF counter > max_attempts THEN
            RAISE EXCEPTION 'Unable to generate unique account code after % attempts', max_attempts;
        END IF;
        
        RAISE NOTICE 'Generated account code: %', account_code;
        
        -- Generate account names based on customer type and account category
        IF customer_record.customer_type = 'individual' THEN
            account_name := customer_record.first_name || ' ' || customer_record.last_name || ' - ' || account_type_record.type_name;
            account_name_ar := COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, '') || ' - ' || COALESCE(account_type_record.type_name_ar, account_type_record.type_name);
        ELSE
            account_name := customer_record.company_name || ' - ' || account_type_record.type_name;
            account_name_ar := COALESCE(customer_record.company_name, '') || ' - ' || COALESCE(account_type_record.type_name_ar, account_type_record.type_name);
        END IF;
        
        RAISE NOTICE 'Account names: % / %', account_name, account_name_ar;
        
        -- Find or create appropriate chart of accounts entry
        IF account_type_record.account_category = 'receivables' THEN
            -- Find default receivables account to use as parent/template
            SELECT id INTO default_receivables_account_id
            FROM chart_of_accounts
            WHERE company_id = p_company_id 
            AND account_type = 'assets'  -- Changed from 'current_assets' to 'assets'
            AND account_subtype = 'accounts_receivable'
            AND is_active = true
            LIMIT 1;
            
            RAISE NOTICE 'Default receivables account: %', default_receivables_account_id;
            
            -- Create receivables account
            INSERT INTO chart_of_accounts (
                id,
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                account_subtype,
                balance_type,
                account_level,
                is_header,
                is_active,
                can_link_customers,
                parent_account_id,
                current_balance
            ) VALUES (
                gen_random_uuid(),
                p_company_id,
                account_code,
                account_name,
                account_name_ar,
                'assets',  -- Changed from 'current_assets' to 'assets'
                'accounts_receivable',
                'debit',
                5,
                false,
                true,
                true,
                default_receivables_account_id,
                0
            ) RETURNING id INTO new_account_id;
            
        ELSIF account_type_record.account_category = 'advances' THEN
            -- Create advances account (also an asset)
            INSERT INTO chart_of_accounts (
                id,
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                account_subtype,
                balance_type,
                account_level,
                is_header,
                is_active,
                can_link_customers,
                current_balance
            ) VALUES (
                gen_random_uuid(),
                p_company_id,
                account_code,
                account_name,
                account_name_ar,
                'assets',
                'advances_receivable',
                'debit',
                5,
                false,
                true,
                true,
                0
            ) RETURNING id INTO new_account_id;
            
        ELSIF account_type_record.account_category = 'deposits' THEN
            -- Create deposits account (liability)
            INSERT INTO chart_of_accounts (
                id,
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                account_subtype,
                balance_type,
                account_level,
                is_header,
                is_active,
                can_link_customers,
                current_balance
            ) VALUES (
                gen_random_uuid(),
                p_company_id,
                account_code,
                account_name,
                account_name_ar,
                'liabilities',
                'customer_deposits',
                'credit',
                5,
                false,
                true,
                true,
                0
            ) RETURNING id INTO new_account_id;
            
        ELSE
            -- Default case for other categories
            INSERT INTO chart_of_accounts (
                id,
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                balance_type,
                account_level,
                is_header,
                is_active,
                can_link_customers,
                current_balance
            ) VALUES (
                gen_random_uuid(),
                p_company_id,
                account_code,
                account_name,
                account_name_ar,
                'assets',
                'debit',
                5,
                false,
                true,
                true,
                0
            ) RETURNING id INTO new_account_id;
        END IF;
        
        RAISE NOTICE 'Created chart of accounts entry with ID: %', new_account_id;
        
        -- Create customer account link
        INSERT INTO customer_accounts (
            id,
            customer_id,
            company_id,
            account_id,
            account_type_id,
            is_default,
            currency,
            is_active
        ) VALUES (
            gen_random_uuid(),
            p_customer_id,
            p_company_id,
            new_account_id,
            account_type_record.id,
            (account_type_record.account_category = 'receivables'), -- Set receivables as default
            'KWD',
            true
        );
        
        created_count := created_count + 1;
        RAISE NOTICE 'Created customer account link. Total created: %', created_count;
        
    END LOOP;
    
    RAISE NOTICE 'Completed auto_create_customer_accounts. Total accounts created: %', created_count;
    RETURN created_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'خطأ في إنشاء الحسابات التلقائية: %', SQLERRM;
END;
$function$;