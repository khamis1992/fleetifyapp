-- إضافة بيانات تجريبية لحركات الحسابات لشركة إدارة الأنظمة
DO $$
DECLARE
    system_company_id UUID;
    cash_account_id UUID;
    receivables_account_id UUID;
    sales_revenue_account_id UUID;
    expense_account_id UUID;
    payables_account_id UUID;
    sales_cost_center_id UUID;
    admin_cost_center_id UUID;
    journal_entry_id UUID;
    i INTEGER;
BEGIN
    -- الحصول على معرف شركة إدارة الأنظمة
    SELECT id INTO system_company_id 
    FROM companies 
    WHERE name = 'System Administration' 
    LIMIT 1;
    
    IF system_company_id IS NULL THEN
        RAISE NOTICE 'Company "System Administration" not found';
        RETURN;
    END IF;
    
    -- الحصول على الحسابات الفرعية المناسبة
    SELECT id INTO cash_account_id
    FROM chart_of_accounts
    WHERE company_id = system_company_id
    AND account_code LIKE '1111-%'
    AND is_header = false
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO receivables_account_id
    FROM chart_of_accounts
    WHERE company_id = system_company_id
    AND account_code LIKE '1121-%'
    AND is_header = false
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO sales_revenue_account_id
    FROM chart_of_accounts
    WHERE company_id = system_company_id
    AND account_code LIKE '4111-%'
    AND is_header = false
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO expense_account_id
    FROM chart_of_accounts
    WHERE company_id = system_company_id
    AND account_code LIKE '5111-%'
    AND is_header = false
    AND is_active = true
    LIMIT 1;
    
    SELECT id INTO payables_account_id
    FROM chart_of_accounts
    WHERE company_id = system_company_id
    AND account_code LIKE '2111-%'
    AND is_header = false
    AND is_active = true
    LIMIT 1;
    
    -- الحصول على مراكز التكلفة
    SELECT id INTO sales_cost_center_id
    FROM cost_centers
    WHERE company_id = system_company_id
    AND center_code = 'SALES'
    LIMIT 1;
    
    SELECT id INTO admin_cost_center_id
    FROM cost_centers
    WHERE company_id = system_company_id
    AND center_code = 'ADMIN'
    LIMIT 1;
    
    -- إنشاء قيود يومية متنوعة
    FOR i IN 1..10 LOOP
        journal_entry_id := gen_random_uuid();
        
        -- إنشاء قيد يومي
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
            system_company_id,
            'TEST-' || LPAD(i::text, 4, '0'),
            CURRENT_DATE - (i * 5),
            'Test Journal Entry #' || i,
            'manual',
            CASE 
                WHEN i % 3 = 0 THEN 5000
                WHEN i % 2 = 0 THEN 3000
                ELSE 1500
            END,
            CASE 
                WHEN i % 3 = 0 THEN 5000
                WHEN i % 2 = 0 THEN 3000
                ELSE 1500
            END,
            'posted',
            '00000000-0000-0000-0000-000000000000'
        );
        
        -- إنشاء خطوط القيد
        IF i % 3 = 0 AND cash_account_id IS NOT NULL AND sales_revenue_account_id IS NOT NULL THEN
            -- قيد مبيعات نقدية
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                journal_entry_id,
                cash_account_id,
                sales_cost_center_id,
                1,
                'Cash received from sales',
                5000,
                0
            ),
            (
                gen_random_uuid(),
                journal_entry_id,
                sales_revenue_account_id,
                sales_cost_center_id,
                2,
                'Sales revenue',
                0,
                5000
            );
            
        ELSIF i % 2 = 0 AND receivables_account_id IS NOT NULL AND sales_revenue_account_id IS NOT NULL THEN
            -- قيد مبيعات آجلة
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                journal_entry_id,
                receivables_account_id,
                sales_cost_center_id,
                1,
                'Accounts receivable',
                3000,
                0
            ),
            (
                gen_random_uuid(),
                journal_entry_id,
                sales_revenue_account_id,
                sales_cost_center_id,
                2,
                'Sales revenue',
                0,
                3000
            );
            
        ELSIF expense_account_id IS NOT NULL AND payables_account_id IS NOT NULL THEN
            -- قيد مصروفات
            INSERT INTO journal_entry_lines (
                id,
                journal_entry_id,
                account_id,
                cost_center_id,
                line_number,
                line_description,
                debit_amount,
                credit_amount
            ) VALUES 
            (
                gen_random_uuid(),
                journal_entry_id,
                expense_account_id,
                admin_cost_center_id,
                1,
                'Operating expenses',
                1500,
                0
            ),
            (
                gen_random_uuid(),
                journal_entry_id,
                payables_account_id,
                admin_cost_center_id,
                2,
                'Accounts payable',
                0,
                1500
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % test journal entries for company %', i-1, system_company_id;
    
END $$;