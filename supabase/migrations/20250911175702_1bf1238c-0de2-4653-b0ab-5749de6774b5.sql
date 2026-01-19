-- حذف شجرة الحسابات الحالية لشركة النور وإنشاء دليل حسابات مناسب للمقاولات

-- الحصول على معرف شركة النور
DO $$
DECLARE
    noor_company_id UUID;
BEGIN
    -- البحث عن شركة النور
    SELECT id INTO noor_company_id 
    FROM companies 
    WHERE name ILIKE '%نور%' OR name ILIKE '%Al-Noor%'
    LIMIT 1;
    
    IF noor_company_id IS NOT NULL THEN
        -- حذف جميع الحسابات غير النظام للشركة
        DELETE FROM chart_of_accounts 
        WHERE company_id = noor_company_id 
        AND (is_system = false OR is_system IS NULL);
        
        -- إنشاء دليل حسابات جديد مناسب لشركة المقاولات
        
        -- المستوى الأول: الأصول
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order
        ) VALUES 
        (noor_company_id, '1000', 'Assets', 'الأصول', 'assets', 'debit', 1, true, true, 1000);
        
        -- المستوى الثاني: تصنيفات الأصول
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '1100', 'Current Assets', 'الأصول المتداولة', 'current_assets', 'debit', 2, true, true, 1100,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1000')),
        (noor_company_id, '1200', 'Fixed Assets', 'الأصول الثابتة', 'fixed_assets', 'debit', 2, true, true, 1200,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1000'));
        
        -- المستوى الثالث: حسابات الأصول المتداولة
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id, can_link_customers, can_link_vendors
        ) VALUES 
        (noor_company_id, '1110', 'Cash and Banks', 'النقدية والبنوك', 'current_assets', 'debit', 3, false, true, 1110,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1100'), false, false),
        (noor_company_id, '1120', 'Accounts Receivable', 'العملاء والمدينون', 'current_assets', 'debit', 3, false, true, 1120,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1100'), true, false),
        (noor_company_id, '1130', 'Construction Materials Inventory', 'مخزون مواد البناء', 'current_assets', 'debit', 3, false, true, 1130,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1100'), false, false),
        (noor_company_id, '1140', 'Advances to Suppliers', 'الدفعات المقدمة للموردين', 'current_assets', 'debit', 3, false, true, 1140,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1100'), false, true),
        (noor_company_id, '1150', 'Contract Work in Progress', 'أعمال عقود تحت التنفيذ', 'current_assets', 'debit', 3, false, true, 1150,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1100'), false, false);
        
        -- المستوى الثالث: حسابات الأصول الثابتة
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '1210', 'Land', 'الأراضي', 'fixed_assets', 'debit', 3, false, true, 1210,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1200')),
        (noor_company_id, '1220', 'Buildings and Structures', 'المباني والمنشآت', 'fixed_assets', 'debit', 3, false, true, 1220,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1200')),
        (noor_company_id, '1230', 'Construction Equipment', 'معدات البناء والآليات', 'fixed_assets', 'debit', 3, false, true, 1230,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1200')),
        (noor_company_id, '1240', 'Vehicles and Transportation', 'المركبات ووسائل النقل', 'fixed_assets', 'debit', 3, false, true, 1240,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1200')),
        (noor_company_id, '1250', 'Accumulated Depreciation', 'مجمع الاستهلاك', 'fixed_assets', 'credit', 3, false, true, 1250,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '1200'));
        
        -- المستوى الأول: الخصوم
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order
        ) VALUES 
        (noor_company_id, '2000', 'Liabilities', 'الخصوم', 'liabilities', 'credit', 1, true, true, 2000);
        
        -- المستوى الثاني: تصنيفات الخصوم
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '2100', 'Current Liabilities', 'الخصوم المتداولة', 'current_liabilities', 'credit', 2, true, true, 2100,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2000')),
        (noor_company_id, '2200', 'Long-term Liabilities', 'الخصوم طويلة الأجل', 'long_term_liabilities', 'credit', 2, true, true, 2200,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2000'));
        
        -- المستوى الثالث: حسابات الخصوم المتداولة
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id, can_link_vendors
        ) VALUES 
        (noor_company_id, '2110', 'Accounts Payable', 'الموردون والدائنون', 'current_liabilities', 'credit', 3, false, true, 2110,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2100'), true),
        (noor_company_id, '2120', 'Contract Advances Received', 'دفعات مقدمة من العملاء', 'current_liabilities', 'credit', 3, false, true, 2120,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2100'), false),
        (noor_company_id, '2130', 'Accrued Salaries and Benefits', 'رواتب ومستحقات الموظفين', 'current_liabilities', 'credit', 3, false, true, 2130,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2100'), false),
        (noor_company_id, '2140', 'Taxes and Zakat Payable', 'ضرائب وزكاة مستحقة', 'current_liabilities', 'credit', 3, false, true, 2140,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2100'), false),
        (noor_company_id, '2150', 'Retention Payable', 'مبالغ محتجزة مستحقة', 'current_liabilities', 'credit', 3, false, true, 2150,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2100'), false);
        
        -- المستوى الثالث: حسابات الخصوم طويلة الأجل
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '2210', 'Long-term Loans', 'قروض طويلة الأجل', 'long_term_liabilities', 'credit', 3, false, true, 2210,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2200')),
        (noor_company_id, '2220', 'Equipment Finance', 'تمويل المعدات', 'long_term_liabilities', 'credit', 3, false, true, 2220,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '2200'));
        
        -- المستوى الأول: حقوق الملكية
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order
        ) VALUES 
        (noor_company_id, '3000', 'Equity', 'حقوق الملكية', 'equity', 'credit', 1, true, true, 3000);
        
        -- المستوى الثاني: حسابات حقوق الملكية
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '3100', 'Capital', 'رأس المال', 'equity', 'credit', 2, false, true, 3100,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '3000')),
        (noor_company_id, '3200', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', 'credit', 2, false, true, 3200,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '3000')),
        (noor_company_id, '3300', 'Current Year Earnings', 'أرباح العام الحالي', 'equity', 'credit', 2, false, true, 3300,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '3000'));
        
        -- المستوى الأول: الإيرادات
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order
        ) VALUES 
        (noor_company_id, '4000', 'Revenue', 'الإيرادات', 'revenue', 'credit', 1, true, true, 4000);
        
        -- المستوى الثاني: حسابات الإيرادات
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '4100', 'Construction Contract Revenue', 'إيرادات عقود المقاولات', 'revenue', 'credit', 2, false, true, 4100,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '4000')),
        (noor_company_id, '4200', 'Equipment Rental Revenue', 'إيرادات تأجير المعدات', 'revenue', 'credit', 2, false, true, 4200,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '4000')),
        (noor_company_id, '4300', 'Consulting and Design Revenue', 'إيرادات الاستشارات والتصميم', 'revenue', 'credit', 2, false, true, 4300,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '4000')),
        (noor_company_id, '4400', 'Other Revenue', 'إيرادات أخرى', 'revenue', 'credit', 2, false, true, 4400,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '4000'));
        
        -- المستوى الأول: المصروفات
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order
        ) VALUES 
        (noor_company_id, '5000', 'Expenses', 'المصروفات', 'expenses', 'debit', 1, true, true, 5000);
        
        -- المستوى الثاني: تصنيفات المصروفات
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '5100', 'Direct Construction Costs', 'تكلفة المقاولات المباشرة', 'cost_of_goods_sold', 'debit', 2, true, true, 5100,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5000')),
        (noor_company_id, '5200', 'Labor Expenses', 'مصروفات العمالة', 'operating_expenses', 'debit', 2, true, true, 5200,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5000')),
        (noor_company_id, '5300', 'Administrative Expenses', 'مصروفات إدارية وعمومية', 'operating_expenses', 'debit', 2, true, true, 5300,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5000')),
        (noor_company_id, '5400', 'Equipment Operating Expenses', 'مصروفات تشغيل المعدات', 'operating_expenses', 'debit', 2, true, true, 5400,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5000')),
        (noor_company_id, '5500', 'Other Expenses', 'مصروفات أخرى', 'operating_expenses', 'debit', 2, true, true, 5500,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5000'));
        
        -- المستوى الثالث: تفاصيل تكلفة المقاولات المباشرة
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '5110', 'Construction Materials Cost', 'تكلفة مواد البناء', 'cost_of_goods_sold', 'debit', 3, false, true, 5110,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5100')),
        (noor_company_id, '5120', 'Subcontractor Costs', 'تكلفة المقاولين الفرعيين', 'cost_of_goods_sold', 'debit', 3, false, true, 5120,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5100')),
        (noor_company_id, '5130', 'Direct Labor Costs', 'تكلفة العمالة المباشرة', 'cost_of_goods_sold', 'debit', 3, false, true, 5130,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5100'));
        
        -- المستوى الثالث: تفاصيل مصروفات العمالة
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id, can_link_employees
        ) VALUES 
        (noor_company_id, '5210', 'Salaries and Wages', 'الرواتب والأجور', 'operating_expenses', 'debit', 3, false, true, 5210,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5200'), true),
        (noor_company_id, '5220', 'Employee Benefits', 'مزايا الموظفين', 'operating_expenses', 'debit', 3, false, true, 5220,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5200'), false),
        (noor_company_id, '5230', 'Social Insurance', 'التأمينات الاجتماعية', 'operating_expenses', 'debit', 3, false, true, 5230,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5200'), false);
        
        -- المستوى الثالث: تفاصيل المصروفات الإدارية
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '5310', 'Office Rent', 'إيجار المكاتب', 'operating_expenses', 'debit', 3, false, true, 5310,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5300')),
        (noor_company_id, '5320', 'Utilities', 'المرافق العامة', 'operating_expenses', 'debit', 3, false, true, 5320,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5300')),
        (noor_company_id, '5330', 'Communications', 'الاتصالات', 'operating_expenses', 'debit', 3, false, true, 5330,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5300')),
        (noor_company_id, '5340', 'Professional Services', 'الخدمات المهنية', 'operating_expenses', 'debit', 3, false, true, 5340,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5300')),
        (noor_company_id, '5350', 'Insurance', 'التأمين', 'operating_expenses', 'debit', 3, false, true, 5350,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5300'));
        
        -- المستوى الثالث: تفاصيل مصروفات تشغيل المعدات
        INSERT INTO chart_of_accounts (
            company_id, account_code, account_name, account_name_ar, 
            account_type, balance_type, account_level, is_header, is_active, sort_order,
            parent_account_id
        ) VALUES 
        (noor_company_id, '5410', 'Equipment Maintenance', 'صيانة المعدات', 'operating_expenses', 'debit', 3, false, true, 5410,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5400')),
        (noor_company_id, '5420', 'Fuel and Oil', 'الوقود والزيوت', 'operating_expenses', 'debit', 3, false, true, 5420,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5400')),
        (noor_company_id, '5430', 'Equipment Depreciation', 'استهلاك المعدات', 'operating_expenses', 'debit', 3, false, true, 5430,
            (SELECT id FROM chart_of_accounts WHERE company_id = noor_company_id AND account_code = '5400'));
        
        -- تحديث إعدادات ربط الحسابات للشركة
        UPDATE companies 
        SET customer_account_settings = jsonb_build_object(
            'auto_create_account', true,
            'enable_account_selection', true,
            'account_prefix', 'CUST-',
            'account_naming_pattern', 'customer_name',
            'account_group_by', 'customer_type',
            'default_receivables_account_id', (
                SELECT id FROM chart_of_accounts 
                WHERE company_id = noor_company_id AND account_code = '1120'
            )
        )
        WHERE id = noor_company_id;
        
        RAISE NOTICE 'تم حذف وإعادة إنشاء دليل الحسابات لشركة النور بنجاح';
    ELSE
        RAISE NOTICE 'لم يتم العثور على شركة النور';
    END IF;
END $$;