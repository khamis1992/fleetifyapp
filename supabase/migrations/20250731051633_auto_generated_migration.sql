-- Fix sample data creation - check payments table structure and create corrected sample data

-- Add sample financial data to demonstrate the Financial Summary functionality
DO $$
DECLARE
    sample_company_id uuid;
    sample_user_id uuid;
    sample_asset_account_id uuid;
    sample_revenue_account_id uuid;
    sample_expense_account_id uuid;
    sample_bank_account_id uuid;
    sample_cost_center_id uuid;
    sample_customer_id uuid;
    journal_entry_id uuid;
BEGIN
    -- Get the first company
    SELECT id INTO sample_company_id FROM companies LIMIT 1;
    
    -- Get the first user for this company
    SELECT user_id INTO sample_user_id 
    FROM profiles 
    WHERE company_id = sample_company_id 
    LIMIT 1;
    
    -- Skip if no company or user found
    IF sample_company_id IS NULL OR sample_user_id IS NULL THEN
        RAISE NOTICE 'No company or user found, skipping sample data creation';
        RETURN;
    END IF;
    
    -- Get some accounts to work with
    SELECT id INTO sample_asset_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sample_company_id 
    AND account_type = 'assets' 
    AND is_header = false
    LIMIT 1;
    
    SELECT id INTO sample_revenue_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sample_company_id 
    AND account_type = 'revenue' 
    AND is_header = false
    LIMIT 1;
    
    SELECT id INTO sample_expense_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sample_company_id 
    AND account_type = 'expenses' 
    AND is_header = false
    LIMIT 1;
    
    -- Get a bank account
    SELECT id INTO sample_bank_account_id 
    FROM banks 
    WHERE company_id = sample_company_id 
    LIMIT 1;
    
    -- Get a cost center
    SELECT id INTO sample_cost_center_id 
    FROM cost_centers 
    WHERE company_id = sample_company_id 
    AND is_active = true
    LIMIT 1;
    
    -- Get a customer
    SELECT id INTO sample_customer_id 
    FROM customers 
    WHERE company_id = sample_company_id 
    LIMIT 1;
    
    -- Only proceed if we have the necessary accounts
    IF sample_asset_account_id IS NOT NULL AND sample_revenue_account_id IS NOT NULL THEN
        
        -- Create sample journal entries for the last 6 months
        FOR i IN 1..10 LOOP
            journal_entry_id := gen_random_uuid();
            
            -- Insert journal entry
            INSERT INTO journal_entries (
                id,
                company_id,
                entry_number,
                entry_date,
                description,
                reference_type,
                total_debit,
                total_credit,
                status,
                created_by
            ) VALUES (
                journal_entry_id,
                sample_company_id,
                'JE-' || LPAD(i::text, 4, '0'),
                CURRENT_DATE - (i * 15 || ' days')::interval,
                'Sample revenue entry #' || i,
                'manual',
                1000 + (i * 100),
                1000 + (i * 100),
                'posted',
                sample_user_id
            );
            
            -- Add debit line (asset account)
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                sample_asset_account_id,
                sample_cost_center_id,
                1,
                'Sample revenue debit line',
                1000 + (i * 100),
                0
            );
            
            -- Add credit line (revenue account)
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES (
                gen_random_uuid(),
                journal_entry_id,
                sample_revenue_account_id,
                sample_cost_center_id,
                2,
                'Sample revenue credit line',
                0,
                1000 + (i * 100)
            );
        END LOOP;
        
        -- Create sample expense entries
        IF sample_expense_account_id IS NOT NULL THEN
            FOR i IN 1..5 LOOP
                journal_entry_id := gen_random_uuid();
                
                INSERT INTO journal_entries (
                    id,
                    company_id,
                    entry_number,
                    entry_date,
                    description,
                    reference_type,
                    total_debit,
                    total_credit,
                    status,
                    created_by
                ) VALUES (
                    journal_entry_id,
                    sample_company_id,
                    'EX-' || LPAD(i::text, 4, '0'),
                    CURRENT_DATE - (i * 20 || ' days')::interval,
                    'Sample expense entry #' || i,
                    'manual',
                    500 + (i * 50),
                    500 + (i * 50),
                    'posted',
                    sample_user_id
                );
                
                -- Debit expense account
                INSERT INTO journal_entry_lines (
                    id,
                    journal_entry_id,
                    account_id,
                    cost_center_id,
                    line_number,
                    line_description,
                    debit_amount,
                    credit_amount
                ) VALUES (
                    gen_random_uuid(),
                    journal_entry_id,
                    sample_expense_account_id,
                    sample_cost_center_id,
                    1,
                    'Sample expense debit line',
                    500 + (i * 50),
                    0
                );
                
                -- Credit asset account
                INSERT INTO journal_entry_lines (
                    id,
                    journal_entry_id,
                    account_id,
                    cost_center_id,
                    line_number,
                    line_description,
                    debit_amount,
                    credit_amount
                ) VALUES (
                    gen_random_uuid(),
                    journal_entry_id,
                    sample_asset_account_id,
                    sample_cost_center_id,
                    2,
                    'Sample expense credit line',
                    0,
                    500 + (i * 50)
                );
            END LOOP;
        END IF;
    END IF;
    
    -- Create sample payments if we have bank and customer (using correct columns)
    IF sample_bank_account_id IS NOT NULL AND sample_customer_id IS NOT NULL THEN
        FOR i IN 1..8 LOOP
            INSERT INTO payments (
                id,
                company_id,
                payment_number,
                payment_date,
                payment_type,
                amount,
                customer_id,
                bank_id,
                payment_status,
                created_by
            ) VALUES (
                gen_random_uuid(),
                sample_company_id,
                'PAY-' || LPAD(i::text, 4, '0'),
                CURRENT_DATE - (i * 10 || ' days')::interval,
                CASE WHEN i % 2 = 0 THEN 'receipt' ELSE 'payment' END,
                800 + (i * 80),
                sample_customer_id,
                sample_bank_account_id,
                'completed',
                sample_user_id
            );
        END LOOP;
    END IF;
    
    -- Create sample bank transactions
    IF sample_bank_account_id IS NOT NULL THEN
        FOR i IN 1..6 LOOP
            INSERT INTO bank_transactions (
                id,
                company_id,
                bank_id,
                transaction_number,
                transaction_date,
                transaction_type,
                amount,
                description,
                balance_after,
                status,
                created_by
            ) VALUES (
                gen_random_uuid(),
                sample_company_id,
                sample_bank_account_id,
                'BT-' || LPAD(i::text, 4, '0'),
                CURRENT_DATE - (i * 12 || ' days')::interval,
                CASE WHEN i % 2 = 0 THEN 'deposit' ELSE 'withdrawal' END,
                600 + (i * 60),
                'Sample bank transaction #' || i,
                10000 + (i * 1000),
                'completed',
                sample_user_id
            );
        END LOOP;
    END IF;
    
    RAISE NOTICE 'Sample financial data created successfully for company %', sample_company_id;
    
END $$;