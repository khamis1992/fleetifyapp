-- Create mock journal entries for the existing company
-- Using company with Arabic name "إدارة النظام"
DO $$
DECLARE
    sys_admin_company_id UUID := '44f2cd3a-5bf6-4b43-a7e5-aa3ff6422f1c';
    cash_account_id UUID;
    receivables_account_id UUID;
    revenue_account_id UUID;
    bank_account_id UUID;
    expense_account_id UUID;
    sales_cost_center_id UUID;
    entry_counter INTEGER := 1;
    current_date_iter DATE;
    created_entries INTEGER := 0;
BEGIN
    -- Get account IDs for the company
    SELECT id INTO cash_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_code LIKE '111%' 
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%صندوق%' OR account_name ILIKE '%نقد%')
    LIMIT 1;
    
    SELECT id INTO bank_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_code LIKE '111%' 
    AND (account_name ILIKE '%bank%' OR account_name ILIKE '%بنك%')
    LIMIT 1;
    
    SELECT id INTO receivables_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_code LIKE '112%' 
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%' OR account_name ILIKE '%ذمم%')
    LIMIT 1;
    
    SELECT id INTO revenue_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_type = 'revenue'
    LIMIT 1;
    
    SELECT id INTO expense_account_id 
    FROM chart_of_accounts 
    WHERE company_id = sys_admin_company_id 
    AND account_type = 'expenses'
    LIMIT 1;
    
    -- Get cost center
    SELECT id INTO sales_cost_center_id 
    FROM cost_centers 
    WHERE company_id = sys_admin_company_id 
    AND (center_code = 'SALES' OR center_name ILIKE '%مبيعات%' OR center_name ILIKE '%تجاري%')
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
                'فاتورة إيجار رقم INV-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
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
                'فاتورة إيجار - عميل رقم ' || i, 500 + (i * 50), 0
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
            created_entries := created_entries + 1;
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
                'سداد من عميل رقم PAY-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
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
                'مدفوعات عملاء - نقدي', 400 + (i * 30), 0
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
            created_entries := created_entries + 1;
        END IF;
        
        -- Discount Transaction (Discount Dr, Receivable Cr)
        IF i % 7 = 3 AND receivables_account_id IS NOT NULL AND expense_account_id IS NOT NULL THEN
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), sys_admin_company_id, 
                'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0'),
                current_date_iter,
                'خصم ممنوح للعميل DISC-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
                'adjustment', 100, 100, 'posted', 
                (SELECT user_id FROM profiles WHERE company_id = sys_admin_company_id LIMIT 1)
            );
            
            -- Discount expense line (Debit)
            INSERT INTO journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id, line_number,
                line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(), 
                (SELECT id FROM journal_entries WHERE entry_number = 'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0')),
                expense_account_id, sales_cost_center_id, 1,
                'خصومات وغرامات العملاء', 100, 0
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
            created_entries := created_entries + 1;
        END IF;
        
        -- Bank Deposit (Bank Dr, Cash Cr)
        IF i % 5 = 4 AND cash_account_id IS NOT NULL AND bank_account_id IS NOT NULL THEN
            INSERT INTO journal_entries (
                id, company_id, entry_number, entry_date, description,
                reference_type, total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), sys_admin_company_id, 
                'JE-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(entry_counter::text, 3, '0'),
                current_date_iter,
                'إيداع في البنك DEP-' || TO_CHAR(current_date_iter, 'YYMMDD') || '-' || LPAD(i::text, 3, '0'),
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
                bank_account_id, sales_cost_center_id, 1,
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
            created_entries := created_entries + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % mock journal entries for company إدارة النظام', created_entries;
END $$;