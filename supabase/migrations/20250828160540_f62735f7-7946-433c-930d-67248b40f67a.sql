-- إنشاء أو تحديث إعدادات حسابات العملاء مع حساب المدينين الافتراضي
DO $$
DECLARE
    target_company_id uuid;
    receivables_account_id uuid;
BEGIN
    -- الحصول على معرف الشركة من ملف المستخدم
    SELECT company_id INTO target_company_id
    FROM profiles 
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    IF target_company_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على شركة للمستخدم الحالي';
    END IF;
    
    -- البحث عن حساب المدينين المناسب
    SELECT id INTO receivables_account_id
    FROM chart_of_accounts 
    WHERE company_id = target_company_id
    AND (
        account_code LIKE '11%' OR 
        account_code LIKE '12%' OR 
        account_name ILIKE '%عميل%' OR 
        account_name ILIKE '%مدين%' OR
        account_name ILIKE '%العملاء%' OR
        account_name ILIKE '%التجاري%'
    )
    AND is_active = true
    ORDER BY 
        CASE 
            WHEN account_name ILIKE '%عميل%' THEN 1
            WHEN account_name ILIKE '%مدين%' THEN 2
            WHEN account_code LIKE '113%' THEN 3
            WHEN account_code LIKE '11%' THEN 4
            ELSE 5
        END,
        account_code
    LIMIT 1;
    
    -- إذا لم يتم العثور على حساب مناسب، قم بإنشاؤه
    IF receivables_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            account_level,
            is_active,
            is_system,
            can_link_customers
        ) VALUES (
            target_company_id,
            '1130001',
            'العملاء التجاريون',
            'العملاء التجاريون',
            'assets',
            'debit',
            calculate_account_level('1130001'),
            true,
            true,
            true
        ) RETURNING id INTO receivables_account_id;
        
        RAISE NOTICE 'تم إنشاء حساب العملاء الافتراضي: %', receivables_account_id;
    END IF;
    
    -- تحديث إعدادات الشركة
    UPDATE companies 
    SET customer_account_settings = jsonb_set(
        COALESCE(customer_account_settings, '{}'),
        '{default_receivables_account_id}',
        to_jsonb(receivables_account_id::text)
    )
    WHERE id = target_company_id;
    
    -- تحديث الإعداد ليكون الإنشاء التلقائي مفعلاً
    UPDATE companies 
    SET customer_account_settings = jsonb_set(
        customer_account_settings,
        '{auto_create_account}',
        'true'
    )
    WHERE id = target_company_id;
    
    RAISE NOTICE 'تم تحديث إعدادات حسابات العملاء للشركة: %', target_company_id;
    RAISE NOTICE 'معرف حساب المدينين الافتراضي: %', receivables_account_id;
    
END $$;