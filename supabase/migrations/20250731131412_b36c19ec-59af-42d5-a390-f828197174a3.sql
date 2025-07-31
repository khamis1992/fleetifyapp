-- Create mock journal entries for System Administration organization
-- First, let's get the company ID for System Administration
DO $$
DECLARE
    sys_admin_company_id UUID;
    cash_account_id UUID;
    receivables_account_id UUID;
    revenue_account_id UUID;
    sales_cost_center_id UUID;
    entry_counter INTEGER := 1;
    current_date_iter DATE;
BEGIN
    -- Get System Administration company ID
    SELECT id INTO sys_admin_company_id 
    FROM companies 
    WHERE name = 'System Administration' 
    LIMIT 1;
    
    IF sys_admin_company_id IS NULL THEN
        RAISE EXCEPTION 'System Administration company not found';
    END IF;
    
    -- Get account IDs
    SELECT id INTO cash_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_code LIKE '111%' 
    AND account_name ILIKE '%cash%'
    LIMIT 1;
    
    SELECT id INTO receivables_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_code LIKE '112%' 
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
    LIMIT 1;
    
    SELECT id INTO revenue_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_type = 'revenue'
    LIMIT 1;
    
    -- Get cost center
    SELECT id INTO sales_cost_center_id 
    FROM cost_centers 
    WHERE company_id = sys_admin_company_id 
    AND center_code = 'SALES'
    LIMIT 1;
    
    -- Create mock transactions over the last 3 months
    FOR i IN 1..45 LOOP
        current_date_iter := CURRENT_DATE - INTERVAL '90 days' + (i * INTERVAL '2 days');
        
        -- Invoice Transaction (Receivable Dr, Revenue Cr)
        IF i % 3 = 1 AND receivables_account_id IS NOT NULL AND revenue_account_id IS NOT NULL THEN
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), sys_admin_company_id, 
                'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0'),
                current_date_iter,
                'Invoice #INV-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
                'invoice', 500 + (i * 50), 500 + (i * 50), 'posted', 
                (SELECT user_id FROM profiles WHERE company_id = sys_admin_company_id LIMIT 1)
            );
            
            -- Receivable line (Debit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                receivables_account_id, sales_cost_center_id, 1,
                'فاتورة إيجار - عميل ' || i, 500 + (i * 50), 0
            );
            
            -- Revenue line (Credit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                revenue_account_id, sales_cost_center_id, 2,
                'إيرادات الإيجار', 0, 500 + (i * 50)
            );
            
            entry_counter := entry_counter + 1;
        END IF;
        
        -- Payment Transaction (Cash Dr, Receivable Cr)
        IF i % 4 = 2 AND cash_account_id IS NOT NULL AND receivables_account_id IS NOT NULL THEN
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), sys_admin_company_id, 
                'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0'),
                current_date_iter,
                'Payment received from customer #PAY-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
                'payment', 400 + (i * 30), 400 + (i * 30), 'posted', 
                (SELECT user_id FROM profiles WHERE company_id = sys_admin_company_id LIMIT 1)
            );
            
            -- Cash line (Debit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                cash_account_id, sales_cost_center_id, 1,
                'سداد عميل - نقدي', 400 + (i * 30), 0
            );
            
            -- Receivable line (Credit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                receivables_account_id, sales_cost_center_id, 2,
                'تحصيل من العميل', 0, 400 + (i * 30)
            );
            
            entry_counter := entry_counter + 1;
        END IF;
        
        -- Discount Transaction (Discount Dr, Receivable Cr)
        IF i % 7 = 3 AND receivables_account_id IS NOT NULL THEN
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), sys_admin_company_id, 
                'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0'),
                current_date_iter,
                'Customer discount applied #DISC-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
                'adjustment', 100, 100, 'posted', 
                (SELECT user_id FROM profiles WHERE company_id = sys_admin_company_id LIMIT 1)
            );
            
            -- Find or create discount account
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                (SELECT id FROM chart_of_accounts WHERE company_id = sys_admin_company_id AND account_type = 'expenses' LIMIT 1),
                sales_cost_center_id, 1,
                'خصم ممنوح للعميل', 100, 0
            );
            
            -- Receivable line (Credit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                receivables_account_id, sales_cost_center_id, 2,
                'تخفيض رصيد العميل', 0, 100
            );
            
            entry_counter := entry_counter + 1;
        END IF;
        
        -- Bank Deposit (Bank Dr, Cash Cr)
        IF i % 5 = 4 AND cash_account_id IS NOT NULL THEN
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), sys_admin_company_id, 
                'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0'),
                current_date_iter,
                'Bank deposit #DEP-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
                'bank_transaction', 1000 + (i * 100), 1000 + (i * 100), 'posted', 
                (SELECT user_id FROM profiles WHERE company_id = sys_admin_company_id LIMIT 1)
            );
            
            -- Bank line (Debit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                (SELECT id FROM chart_of_accounts WHERE company_id = sys_admin_company_id AND account_code LIKE '111%' AND account_name ILIKE '%bank%' LIMIT 1),
                sales_cost_center_id, 1,
                'إيداع في البنك', 1000 + (i * 100), 0
            );
            
            -- Cash line (Credit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                cash_account_id, sales_cost_center_id, 2,
                'تحويل من الصندوق', 0, 1000 + (i * 100)
            );
            
            entry_counter := entry_counter + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Created % mock journal entries for System Administration', entry_counter - 1;
END $$;