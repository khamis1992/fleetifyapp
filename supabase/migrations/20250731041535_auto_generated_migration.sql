-- إضافة نماذج بيانات مالية للتحليل
-- Add sample financial data for analysis

-- إدراج قيود يومية نموذجية للأشهر الـ 6 الماضية
DO $$
DECLARE
    company_uuid UUID;
    admin_uuid UUID;
    revenue_account UUID;
    expense_account UUID;
    cash_account UUID;
    receivable_account UUID;
    payable_account UUID;
    sales_center UUID;
    admin_center UUID;
    entry_counter INTEGER := 1;
    i INTEGER;
    random_amount NUMERIC;
    entry_date DATE;
BEGIN
    -- الحصول على أول شركة نشطة
    SELECT id INTO company_uuid FROM public.companies WHERE is_active = true LIMIT 1;
    
    IF company_uuid IS NULL THEN
        RAISE NOTICE 'No active company found, skipping sample data creation';
        RETURN;
    END IF;
    
    -- الحصول على أول مدير في الشركة
    SELECT user_id INTO admin_uuid 
    FROM public.profiles 
    WHERE company_id = company_uuid 
    LIMIT 1;
    
    IF admin_uuid IS NULL THEN
        RAISE NOTICE 'No admin user found for company, skipping sample data creation';
        RETURN;
    END IF;
    
    -- الحصول على الحسابات المطلوبة أو إنشاؤها
    SELECT id INTO revenue_account FROM public.chart_of_accounts 
    WHERE company_id = company_uuid AND account_type = 'revenue' AND is_active = true LIMIT 1;
    
    SELECT id INTO expense_account FROM public.chart_of_accounts 
    WHERE company_id = company_uuid AND account_type = 'expenses' AND is_active = true LIMIT 1;
    
    SELECT id INTO cash_account FROM public.chart_of_accounts 
    WHERE company_id = company_uuid AND account_type = 'assets' 
    AND (account_name ILIKE '%cash%' OR account_name ILIKE '%نقد%') 
    AND is_active = true LIMIT 1;
    
    SELECT id INTO receivable_account FROM public.chart_of_accounts 
    WHERE company_id = company_uuid AND account_type = 'assets' 
    AND (account_name ILIKE '%receivable%' OR account_name ILIKE '%مدين%') 
    AND is_active = true LIMIT 1;
    
    SELECT id INTO payable_account FROM public.chart_of_accounts 
    WHERE company_id = company_uuid AND account_type = 'liabilities' 
    AND (account_name ILIKE '%payable%' OR account_name ILIKE '%دائن%') 
    AND is_active = true LIMIT 1;
    
    -- إنشاء حسابات إضافية إذا لم تكن موجودة
    IF revenue_account IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, balance_type, is_header, is_active, account_level, current_balance
        ) VALUES (
            gen_random_uuid(), company_uuid, '4100', 'Service Revenue', 'إيرادات الخدمات',
            'revenue', 'credit', false, true, 3, 0
        ) RETURNING id INTO revenue_account;
    END IF;
    
    IF expense_account IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, balance_type, is_header, is_active, account_level, current_balance
        ) VALUES (
            gen_random_uuid(), company_uuid, '5100', 'Operating Expenses', 'مصروفات التشغيل',
            'expenses', 'debit', false, true, 3, 0
        ) RETURNING id INTO expense_account;
    END IF;
    
    IF cash_account IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, balance_type, is_header, is_active, account_level, current_balance
        ) VALUES (
            gen_random_uuid(), company_uuid, '1110', 'Cash in Hand', 'النقدية في الصندوق',
            'assets', 'debit', false, true, 3, 0
        ) RETURNING id INTO cash_account;
    END IF;
    
    -- الحصول على مراكز التكلفة
    SELECT id INTO sales_center FROM public.cost_centers 
    WHERE company_id = company_uuid AND center_code = 'SALES' AND is_active = true LIMIT 1;
    
    SELECT id INTO admin_center FROM public.cost_centers 
    WHERE company_id = company_uuid AND center_code = 'ADMIN' AND is_active = true LIMIT 1;
    
    -- إنشاء قيود يومية نموذجية للأشهر الـ 6 الماضية
    FOR i IN 1..180 LOOP -- 30 قيد شهرياً لمدة 6 أشهر
        entry_date := CURRENT_DATE - (random() * 180)::INTEGER;
        random_amount := (random() * 50000 + 5000)::NUMERIC(10,2); -- مبالغ عشوائية بين 5000 و 55000
        
        -- قيد إيرادات
        INSERT INTO public.journal_entries (
            id, company_id, entry_number, entry_date, description,
            total_debit, total_credit, status, created_by
        ) VALUES (
            gen_random_uuid(), company_uuid, 
            'JE-' || TO_CHAR(entry_date, 'YY') || '-' || LPAD(entry_counter::TEXT, 4, '0'),
            entry_date,
            'إيرادات خدمات - ' || TO_CHAR(entry_date, 'DD/MM/YYYY'),
            random_amount, random_amount, 'posted', admin_uuid
        );
        
        -- خطوط القيد - مدين النقدية
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id,
            line_number, line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(), 
            (SELECT id FROM public.journal_entries WHERE entry_number = 'JE-' || TO_CHAR(entry_date, 'YY') || '-' || LPAD(entry_counter::TEXT, 4, '0')),
            cash_account, sales_center,
            1, 'تحصيل نقدي', random_amount, 0
        );
        
        -- خطوط القيد - دائن الإيرادات
        INSERT INTO public.journal_entry_lines (
            id, journal_entry_id, account_id, cost_center_id,
            line_number, line_description, debit_amount, credit_amount
        ) VALUES (
            gen_random_uuid(),
            (SELECT id FROM public.journal_entries WHERE entry_number = 'JE-' || TO_CHAR(entry_date, 'YY') || '-' || LPAD(entry_counter::TEXT, 4, '0')),
            revenue_account, sales_center,
            2, 'إيرادات الخدمات', 0, random_amount
        );
        
        entry_counter := entry_counter + 1;
        
        -- قيد مصروفات (كل 3 قيود)
        IF i % 3 = 0 THEN
            random_amount := (random() * 20000 + 2000)::NUMERIC(10,2); -- مصروفات أقل
            
            INSERT INTO public.journal_entries (
                id, company_id, entry_number, entry_date, description,
                total_debit, total_credit, status, created_by
            ) VALUES (
                gen_random_uuid(), company_uuid,
                'JE-' || TO_CHAR(entry_date, 'YY') || '-' || LPAD(entry_counter::TEXT, 4, '0'),
                entry_date,
                'مصروفات تشغيلية - ' || TO_CHAR(entry_date, 'DD/MM/YYYY'),
                random_amount, random_amount, 'posted', admin_uuid
            );
            
            -- خطوط القيد - مدين المصروفات
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id,
                line_number, line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(),
                (SELECT id FROM public.journal_entries WHERE entry_number = 'JE-' || TO_CHAR(entry_date, 'YY') || '-' || LPAD(entry_counter::TEXT, 4, '0')),
                expense_account, admin_center,
                1, 'مصروفات إدارية', random_amount, 0
            );
            
            -- خطوط القيد - دائن النقدية
            INSERT INTO public.journal_entry_lines (
                id, journal_entry_id, account_id, cost_center_id,
                line_number, line_description, debit_amount, credit_amount
            ) VALUES (
                gen_random_uuid(),
                (SELECT id FROM public.journal_entries WHERE entry_number = 'JE-' || TO_CHAR(entry_date, 'YY') || '-' || LPAD(entry_counter::TEXT, 4, '0')),
                cash_account, admin_center,
                2, 'دفع نقدي', 0, random_amount
            );
            
            entry_counter := entry_counter + 1;
        END IF;
    END LOOP;
    
    -- إضافة بعض المدفوعات النموذجية
    FOR i IN 1..50 LOOP
        INSERT INTO public.payments (
            id, company_id, payment_number, payment_date, payment_type,
            amount, payment_method, payment_status, description,
            account_id, created_by
        ) VALUES (
            gen_random_uuid(), company_uuid,
            'PAY-' || TO_CHAR(CURRENT_DATE - (random() * 90)::INTEGER, 'YY') || '-' || LPAD(i::TEXT, 4, '0'),
            CURRENT_DATE - (random() * 90)::INTEGER,
            CASE WHEN random() > 0.5 THEN 'receipt' ELSE 'payment' END,
            (random() * 30000 + 1000)::NUMERIC(10,2),
            CASE 
                WHEN random() > 0.7 THEN 'cash'
                WHEN random() > 0.4 THEN 'bank_transfer'
                ELSE 'check'
            END,
            'completed',
            'عملية دفع نموذجية',
            cash_account,
            admin_uuid
        );
    END LOOP;
    
    -- إضافة بعض المعاملات البنكية النموذجية
    FOR i IN 1..30 LOOP
        INSERT INTO public.bank_transactions (
            id, company_id, transaction_number, transaction_date,
            transaction_type, amount, description, status, created_by
        ) VALUES (
            gen_random_uuid(), company_uuid,
            'BT-' || TO_CHAR(CURRENT_DATE - (random() * 60)::INTEGER, 'YY') || '-' || LPAD(i::TEXT, 4, '0'),
            CURRENT_DATE - (random() * 60)::INTEGER,
            CASE WHEN random() > 0.5 THEN 'deposit' ELSE 'withdrawal' END,
            (random() * 40000 + 2000)::NUMERIC(10,2),
            'معاملة بنكية نموذجية',
            'completed',
            admin_uuid
        );
    END LOOP;
    
    RAISE NOTICE 'تم إنشاء نماذج البيانات المالية بنجاح';
    
END $$;