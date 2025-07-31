-- Add sample financial data for analysis
-- Get the first active company for testing
DO $$
DECLARE
    sample_company_id UUID;
    sample_user_id UUID;
    cost_center_id UUID;
    asset_account_id UUID;
    revenue_account_id UUID;
    expense_account_id UUID;
    liability_account_id UUID;
    equity_account_id UUID;
    bank_account_id UUID;
BEGIN
    -- Get first company
    SELECT id INTO sample_company_id FROM companies LIMIT 1;
    
    IF sample_company_id IS NULL THEN
        RAISE EXCEPTION 'No companies found';
    END IF;
    
    -- Get first user from this company
    SELECT user_id INTO sample_user_id 
    FROM profiles 
    WHERE company_id = sample_company_id 
    LIMIT 1;
    
    IF sample_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found for company';
    END IF;

    -- Create a cost center if none exists
    INSERT INTO cost_centers (company_id, center_code, center_name, center_name_ar, budget_amount, is_active)
    VALUES (sample_company_id, 'CC001', 'Operations', 'العمليات', 100000.00, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cost_center_id;
    
    -- Get cost center ID if it already existed
    IF cost_center_id IS NULL THEN
        SELECT id INTO cost_center_id 
        FROM cost_centers 
        WHERE company_id = sample_company_id 
        LIMIT 1;
    END IF;

    -- Create sample chart of accounts
    INSERT INTO chart_of_accounts (company_id, account_code, account_name, account_name_ar, account_type, account_level, balance_type, is_active, parent_account_id)
    VALUES 
        (sample_company_id, '1000', 'Current Assets', 'الأصول المتداولة', 'asset', 1, 'debit', true, null),
        (sample_company_id, '1100', 'Cash and Bank', 'النقد والبنك', 'asset', 2, 'debit', true, null),
        (sample_company_id, '4000', 'Revenue', 'الإيرادات', 'revenue', 1, 'credit', true, null),
        (sample_company_id, '5000', 'Operating Expenses', 'المصروفات التشغيلية', 'expense', 1, 'debit', true, null),
        (sample_company_id, '2000', 'Current Liabilities', 'الخصوم المتداولة', 'liability', 1, 'credit', true, null),
        (sample_company_id, '3000', 'Owner Equity', 'حقوق الملكية', 'equity', 1, 'credit', true, null)
    ON CONFLICT (company_id, account_code) DO NOTHING;
    
    -- Get account IDs
    SELECT id INTO asset_account_id FROM chart_of_accounts WHERE company_id = sample_company_id AND account_code = '1000';
    SELECT id INTO bank_account_id FROM chart_of_accounts WHERE company_id = sample_company_id AND account_code = '1100';
    SELECT id INTO revenue_account_id FROM chart_of_accounts WHERE company_id = sample_company_id AND account_code = '4000';
    SELECT id INTO expense_account_id FROM chart_of_accounts WHERE company_id = sample_company_id AND account_code = '5000';
    SELECT id INTO liability_account_id FROM chart_of_accounts WHERE company_id = sample_company_id AND account_code = '2000';
    SELECT id INTO equity_account_id FROM chart_of_accounts WHERE company_id = sample_company_id AND account_code = '3000';

    -- Create sample journal entries for the last 6 months
    FOR i IN 0..5 LOOP
        DECLARE
            entry_date DATE := CURRENT_DATE - INTERVAL '1 month' * i;
            header_id UUID;
            base_revenue DECIMAL := 50000 + (random() * 20000);
            base_expense DECIMAL := 30000 + (random() * 15000);
        BEGIN
            -- Revenue entry
            INSERT INTO journal_entry_headers (company_id, entry_number, entry_date, description, total_amount, status, created_by, cost_center_id)
            VALUES (sample_company_id, 'REV-' || TO_CHAR(entry_date, 'YYYY-MM') || '-' || LPAD(i::text, 3, '0'), entry_date, 'Monthly Revenue', base_revenue, 'approved', sample_user_id, cost_center_id)
            RETURNING id INTO header_id;
            
            INSERT INTO journal_entry_lines (header_id, account_id, description, debit_amount, credit_amount, cost_center_id)
            VALUES 
                (header_id, bank_account_id, 'Revenue received', base_revenue, 0, cost_center_id),
                (header_id, revenue_account_id, 'Monthly revenue', 0, base_revenue, cost_center_id);
                
            -- Expense entry
            INSERT INTO journal_entry_headers (company_id, entry_number, entry_date, description, total_amount, status, created_by, cost_center_id)
            VALUES (sample_company_id, 'EXP-' || TO_CHAR(entry_date, 'YYYY-MM') || '-' || LPAD(i::text, 3, '0'), entry_date, 'Monthly Expenses', base_expense, 'approved', sample_user_id, cost_center_id)
            RETURNING id INTO header_id;
            
            INSERT INTO journal_entry_lines (header_id, account_id, description, debit_amount, credit_amount, cost_center_id)
            VALUES 
                (header_id, expense_account_id, 'Monthly expenses', base_expense, 0, cost_center_id),
                (header_id, bank_account_id, 'Expense payment', 0, base_expense, cost_center_id);
        END;
    END LOOP;

    -- Create sample payments
    FOR i IN 0..10 LOOP
        DECLARE
            payment_date DATE := CURRENT_DATE - INTERVAL '1 day' * (i * 7);
            payment_amount DECIMAL := 5000 + (random() * 10000);
        BEGIN
            INSERT INTO payments (company_id, payment_number, payment_date, amount, payment_type, description, bank_account_id, cost_center_id, status, created_by)
            VALUES (sample_company_id, 'PAY-' || EXTRACT(YEAR FROM payment_date) || LPAD(i::text, 4, '0'), payment_date, payment_amount, 'bank_transfer', 'Sample payment transaction', bank_account_id, cost_center_id, 'completed', sample_user_id);
        END;
    END LOOP;

    -- Create sample bank transactions
    FOR i IN 0..20 LOOP
        DECLARE
            transaction_date DATE := CURRENT_DATE - INTERVAL '1 day' * (i * 3);
            transaction_amount DECIMAL := 1000 + (random() * 5000);
            transaction_type TEXT := CASE WHEN i % 2 = 0 THEN 'credit' ELSE 'debit' END;
        BEGIN
            INSERT INTO bank_transactions (company_id, transaction_date, description, amount, transaction_type, bank_account_id, status, created_by)
            VALUES (sample_company_id, transaction_date, 'Sample bank transaction ' || i, transaction_amount, transaction_type, bank_account_id, 'completed', sample_user_id);
        END;
    END LOOP;

    RAISE NOTICE 'Sample financial data created successfully for company %', sample_company_id;
END $$;