-- إضافة معاملات وهمية في دفتر الاستاذ لشركة System Administration فقط
DO $$
DECLARE 
    sys_company_id uuid;
    journal_entry_id_1 uuid;
    journal_entry_id_2 uuid;
    journal_entry_id_3 uuid;
    journal_entry_id_4 uuid;
    journal_entry_id_5 uuid;
    cash_account_id uuid;
    revenue_account_id uuid;
    expense_account_id uuid;
    receivable_account_id uuid;
    payable_account_id uuid;
    sales_cost_center_id uuid;
    admin_cost_center_id uuid;
BEGIN
    -- البحث عن شركة System Administration
    SELECT id INTO sys_company_id 
    FROM public.companies 
    WHERE name = 'System Administration' 
    LIMIT 1;
    
    -- إذا لم تُوجد الشركة، إنهاء العملية
    IF sys_company_id IS NULL THEN
        RAISE NOTICE 'Company "System Administration" not found. Skipping dummy transactions.';
        RETURN;
    END IF;
    
    -- البحث عن الحسابات المطلوبة
    SELECT id INTO cash_account_id 
    FROM public.chart_of_accounts 
    WHERE company_id = sys_company_id 
    AND account_type = 'assets' 
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%')
    LIMIT 1;
    
    SELECT id INTO revenue_account_id 
    FROM public.chart_of_accounts 
    WHERE company_id = sys_company_id 
    AND account_type = 'revenue' 
    LIMIT 1;
    
    SELECT id INTO expense_account_id 
    FROM public.chart_of_accounts 
    WHERE company_id = sys_company_id 
    AND account_type = 'expenses' 
    LIMIT 1;
    
    SELECT id INTO receivable_account_id 
    FROM public.chart_of_accounts 
    WHERE company_id = sys_company_id 
    AND account_type = 'assets' 
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%')
    LIMIT 1;
    
    SELECT id INTO payable_account_id 
    FROM public.chart_of_accounts 
    WHERE company_id = sys_company_id 
    AND account_type = 'liabilities' 
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%')
    LIMIT 1;
    
    -- البحث عن مراكز التكلفة
    SELECT id INTO sales_cost_center_id 
    FROM public.cost_centers 
    WHERE company_id = sys_company_id 
    AND center_code = 'SALES'
    LIMIT 1;
    
    SELECT id INTO admin_cost_center_id 
    FROM public.cost_centers 
    WHERE company_id = sys_company_id 
    AND center_code = 'ADMIN'
    LIMIT 1;
    
    -- التحقق من وجود الحسابات المطلوبة
    IF cash_account_id IS NULL OR revenue_account_id IS NULL OR expense_account_id IS NULL THEN
        RAISE NOTICE 'Required accounts not found for System Administration. Skipping dummy transactions.';
        RETURN;
    END IF;
    
    -- قيد 1: مبيعات نقدية
    journal_entry_id_1 := gen_random_uuid();
    INSERT INTO public.journal_entries (
        id, company_id, entry_number, entry_date, description, 
        reference_type, total_debit, total_credit, status, created_by
    ) VALUES (
        journal_entry_id_1, sys_company_id, 'JE-TEST-001', 
        CURRENT_DATE - INTERVAL '10 days', 'Cash Sales - Test Transaction',
        'manual', 1500.000, 1500.000, 'posted', 
        (SELECT user_id FROM public.profiles WHERE company_id = sys_company_id LIMIT 1)
    );
    
    -- سطور القيد الأول
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, cost_center_id, line_number, 
        line_description, debit_amount, credit_amount
    ) VALUES 
    (gen_random_uuid(), journal_entry_id_1, cash_account_id, sales_cost_center_id, 1, 'Cash received from sales', 1500.000, 0),
    (gen_random_uuid(), journal_entry_id_1, revenue_account_id, sales_cost_center_id, 2, 'Sales revenue', 0, 1500.000);
    
    -- قيد 2: مصاريف إدارية
    journal_entry_id_2 := gen_random_uuid();
    INSERT INTO public.journal_entries (
        id, company_id, entry_number, entry_date, description, 
        reference_type, total_debit, total_credit, status, created_by
    ) VALUES (
        journal_entry_id_2, sys_company_id, 'JE-TEST-002', 
        CURRENT_DATE - INTERVAL '8 days', 'Administrative Expenses - Test Transaction',
        'manual', 800.000, 800.000, 'posted',
        (SELECT user_id FROM public.profiles WHERE company_id = sys_company_id LIMIT 1)
    );
    
    -- سطور القيد الثاني
    INSERT INTO public.journal_entry_lines (
        id, journal_entry_id, account_id, cost_center_id, line_number, 
        line_description, debit_amount, credit_amount
    ) VALUES 
    (gen_random_uuid(), journal_entry_id_2, expense_account_id, admin_cost_center_id, 1, 'Office supplies expense', 800.000, 0),
    (gen_random_uuid(), journal_entry_id_2, cash_account_id, admin_cost_center_id, 2, 'Cash payment for supplies', 0, 800.000);
    
    -- قيد 3: مبيعات بالآجل (إذا وُجد حساب المدينين)
    IF receivable_account_id IS NOT NULL THEN
        journal_entry_id_3 := gen_random_uuid();
        INSERT INTO public.journal_entries (
            id, company_id, entry_number, entry_date, description, 
            reference_type, total_debit, total_credit, status, created_by
        ) VALUES (
            journal_entry_id_3, sys_company_id, 'JE-TEST-003', 
            CURRENT_DATE - INTERVAL '5 days', 'Credit Sales - Test Transaction',
            'manual', 2200.000, 2200.000, 'posted',
            (SELECT user_id FROM public.profiles WHERE company_id = sys_company_id LIMIT 1)
        );
        
        -- سطور القيد الثالث
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number, 
            line_description, debit_amount, credit_amount
        ) VALUES 
        (gen_random_uuid(), journal_entry_id_3, receivable_account_id, sales_cost_center_id, 1, 'Accounts receivable', 2200.000, 0),
        (gen_random_uuid(), journal_entry_id_3, revenue_account_id, sales_cost_center_id, 2, 'Sales revenue - credit', 0, 2200.000);
    END IF;
    
    -- قيد 4: تحصيل من العملاء (إذا وُجد حساب المدينين)
    IF receivable_account_id IS NOT NULL THEN
        journal_entry_id_4 := gen_random_uuid();
        INSERT INTO public.journal_entries (
            id, company_id, entry_number, entry_date, description, 
            reference_type, total_debit, total_credit, status, created_by
        ) VALUES (
            journal_entry_id_4, sys_company_id, 'JE-TEST-004', 
            CURRENT_DATE - INTERVAL '3 days', 'Customer Payment Collection - Test Transaction',
            'manual', 1500.000, 1500.000, 'posted',
            (SELECT user_id FROM public.profiles WHERE company_id = sys_company_id LIMIT 1)
        );
        
        -- سطور القيد الرابع
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number, 
            line_description, debit_amount, credit_amount
        ) VALUES 
        (gen_random_uuid(), journal_entry_id_4, cash_account_id, sales_cost_center_id, 1, 'Cash received from customer', 1500.000, 0),
        (gen_random_uuid(), journal_entry_id_4, receivable_account_id, sales_cost_center_id, 2, 'Customer payment', 0, 1500.000);
    END IF;
    
    -- قيد 5: مشتريات بالآجل (إذا وُجد حساب الدائنين)
    IF payable_account_id IS NOT NULL THEN
        journal_entry_id_5 := gen_random_uuid();
        INSERT INTO public.journal_entries (
            id, company_id, entry_number, entry_date, description, 
            reference_type, total_debit, total_credit, status, created_by
        ) VALUES (
            journal_entry_id_5, sys_company_id, 'JE-TEST-005', 
            CURRENT_DATE - INTERVAL '1 days', 'Credit Purchases - Test Transaction',
            'manual', 1200.000, 1200.000, 'posted',
            (SELECT user_id FROM public.profiles WHERE company_id = sys_company_id LIMIT 1)
        );
        
        -- سطور القيد الخامس
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id, line_number, 
            line_description, debit_amount, credit_amount
        ) VALUES 
        (gen_random_uuid(), journal_entry_id_5, expense_account_id, admin_cost_center_id, 1, 'Inventory purchases', 1200.000, 0),
        (gen_random_uuid(), journal_entry_id_5, payable_account_id, admin_cost_center_id, 2, 'Accounts payable', 0, 1200.000);
    END IF;
    
    -- تحديث أرصدة الحسابات
    UPDATE public.chart_of_accounts 
    SET current_balance = current_balance + 2200.000 -- زيادة النقد
    WHERE id = cash_account_id;
    
    UPDATE public.chart_of_accounts 
    SET current_balance = current_balance + 3700.000 -- زيادة الإيرادات
    WHERE id = revenue_account_id;
    
    UPDATE public.chart_of_accounts 
    SET current_balance = current_balance + 2000.000 -- زيادة المصاريف
    WHERE id = expense_account_id;
    
    IF receivable_account_id IS NOT NULL THEN
        UPDATE public.chart_of_accounts 
        SET current_balance = current_balance + 700.000 -- الرصيد المتبقي للمدينين
        WHERE id = receivable_account_id;
    END IF;
    
    IF payable_account_id IS NOT NULL THEN
        UPDATE public.chart_of_accounts 
        SET current_balance = current_balance + 1200.000 -- زيادة الدائنين
        WHERE id = payable_account_id;
    END IF;
    
    RAISE NOTICE 'Successfully added dummy transactions for System Administration company';
END $$;