-- إضافة دالة لإنشاء الحسابات المحاسبية للعميل تلقائياً
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id UUID,
    p_company_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    account_type_record RECORD;
    new_account_id UUID;
    account_code TEXT;
    account_name TEXT;
    customer_name TEXT;
    created_count INTEGER := 0;
BEGIN
    -- الحصول على اسم العميل
    SELECT 
        CASE 
            WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
            ELSE company_name 
        END 
    INTO customer_name
    FROM public.customers 
    WHERE id = p_customer_id;
    
    -- إنشاء حساب لكل نوع من أنواع الحسابات
    FOR account_type_record IN 
        SELECT * FROM public.customer_account_types WHERE is_active = true
    LOOP
        -- توليد كود الحساب
        account_code := CASE account_type_record.account_category
            WHEN 'receivables' THEN '1211' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '1211%'
            )::TEXT, 3, '0')
            WHEN 'advances' THEN '1213' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '1213%'
            )::TEXT, 3, '0')
            WHEN 'deposits' THEN '2111' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '2111%'
            )::TEXT, 3, '0')
            WHEN 'discounts' THEN '5121' || LPAD((
                SELECT COUNT(*) + 1 
                FROM public.chart_of_accounts 
                WHERE company_id = p_company_id 
                AND account_code LIKE '5121%'
            )::TEXT, 3, '0')
            ELSE '1211001'
        END;
        
        -- توليد اسم الحساب
        account_name := customer_name || ' - ' || account_type_record.type_name_ar;
        
        -- إنشاء الحساب في دليل الحسابات
        INSERT INTO public.chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            account_level,
            is_header,
            is_active,
            can_link_customers
        ) VALUES (
            p_company_id,
            account_code,
            account_name,
            account_name,
            CASE account_type_record.account_category
                WHEN 'receivables' THEN 'asset'
                WHEN 'advances' THEN 'asset'
                WHEN 'deposits' THEN 'liability'
                WHEN 'discounts' THEN 'expense'
                ELSE 'asset'
            END,
            CASE account_type_record.account_category
                WHEN 'receivables' THEN 'debit'
                WHEN 'advances' THEN 'debit'
                WHEN 'deposits' THEN 'credit'
                WHEN 'discounts' THEN 'debit'
                ELSE 'debit'
            END,
            5,
            false,
            true,
            true
        ) RETURNING id INTO new_account_id;
        
        -- ربط الحساب بالعميل
        INSERT INTO public.customer_accounts (
            customer_id,
            company_id,
            account_id,
            account_type_id,
            is_default,
            currency,
            is_active
        ) VALUES (
            p_customer_id,
            p_company_id,
            new_account_id,
            account_type_record.id,
            account_type_record.account_category = 'receivables',
            'KWD',
            true
        );
        
        created_count := created_count + 1;
    END LOOP;
    
    RETURN created_count;
END;
$$;