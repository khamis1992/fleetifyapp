-- إنشاء الحسابات الأساسية المطلوبة لإنشاء القيود المحاسبية
-- 1. حساب المدينون (Accounts Receivable)
-- 2. حساب إيرادات الإيجار (Rental Revenue)  
-- 3. حساب إيرادات المبيعات (Sales Revenue)

-- إنشاء function لإنشاء الحسابات الأساسية لشركة معينة
CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    accounts_receivable_id uuid;
    rental_revenue_id uuid;
    sales_revenue_id uuid;
    result json;
    created_accounts text[] := '{}';
    existing_accounts text[] := '{}';
    error_accounts text[] := '{}';
BEGIN
    -- التحقق من وجود الحسابات وإنشاؤها إذا لم تكن موجودة
    
    -- 1. حساب المدينون (Accounts Receivable)
    SELECT id INTO accounts_receivable_id
    FROM chart_of_accounts 
    WHERE company_id = company_id_param 
    AND account_code = '1301'
    AND is_active = true;
    
    IF accounts_receivable_id IS NULL THEN
        INSERT INTO chart_of_accounts (
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
            company_id_param,
            '1301',
            'Accounts Receivable',
            'المدينون',
            'assets',
            'debit',
            4,
            false,
            true,
            true
        ) RETURNING id INTO accounts_receivable_id;
        created_accounts := array_append(created_accounts, 'المدينون (1301)');
    ELSE
        existing_accounts := array_append(existing_accounts, 'المدينون (1301)');
    END IF;
    
    -- 2. حساب إيرادات الإيجار (Rental Revenue)
    SELECT id INTO rental_revenue_id
    FROM chart_of_accounts 
    WHERE company_id = company_id_param 
    AND account_code = '4101'
    AND is_active = true;
    
    IF rental_revenue_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            account_level,
            is_header,
            is_active
        ) VALUES (
            company_id_param,
            '4101',
            'Rental Revenue',
            'إيرادات الإيجار',
            'revenue',
            'credit',
            4,
            false,
            true
        ) RETURNING id INTO rental_revenue_id;
        created_accounts := array_append(created_accounts, 'إيرادات الإيجار (4101)');
    ELSE
        existing_accounts := array_append(existing_accounts, 'إيرادات الإيجار (4101)');
    END IF;
    
    -- 3. حساب إيرادات المبيعات (Sales Revenue)
    SELECT id INTO sales_revenue_id
    FROM chart_of_accounts 
    WHERE company_id = company_id_param 
    AND account_code = '4001'
    AND is_active = true;
    
    IF sales_revenue_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            account_level,
            is_header,
            is_active
        ) VALUES (
            company_id_param,
            '4001',
            'Sales Revenue',
            'إيرادات المبيعات',
            'revenue',
            'credit',
            4,
            false,
            true
        ) RETURNING id INTO sales_revenue_id;
        created_accounts := array_append(created_accounts, 'إيرادات المبيعات (4001)');
    ELSE
        existing_accounts := array_append(existing_accounts, 'إيرادات المبيعات (4001)');
    END IF;
    
    -- الآن نقوم بربط هذه الحسابات بأنواع الحسابات الافتراضية
    -- البحث عن أنواع الحسابات الافتراضية وربطها
    
    -- ربط المدينون
    INSERT INTO account_mappings (company_id, default_account_type_id, chart_of_accounts_id)
    SELECT 
        company_id_param,
        dat.id,
        accounts_receivable_id
    FROM default_account_types dat
    WHERE dat.account_type = 'accounts_receivable'
    AND NOT EXISTS (
        SELECT 1 FROM account_mappings am 
        WHERE am.company_id = company_id_param 
        AND am.default_account_type_id = dat.id
        AND am.is_active = true
    );
    
    -- ربط إيرادات الإيجار
    INSERT INTO account_mappings (company_id, default_account_type_id, chart_of_accounts_id)
    SELECT 
        company_id_param,
        dat.id,
        rental_revenue_id
    FROM default_account_types dat
    WHERE dat.account_type = 'rental_revenue'
    AND NOT EXISTS (
        SELECT 1 FROM account_mappings am 
        WHERE am.company_id = company_id_param 
        AND am.default_account_type_id = dat.id
        AND am.is_active = true
    );
    
    -- ربط إيرادات المبيعات
    INSERT INTO account_mappings (company_id, default_account_type_id, chart_of_accounts_id)
    SELECT 
        company_id_param,
        dat.id,
        sales_revenue_id
    FROM default_account_types dat
    WHERE dat.account_type = 'sales_revenue'
    AND NOT EXISTS (
        SELECT 1 FROM account_mappings am 
        WHERE am.company_id = company_id_param 
        AND am.default_account_type_id = dat.id
        AND am.is_active = true
    );
    
    -- إنشاء النتيجة
    result := json_build_object(
        'created', created_accounts,
        'existing', existing_accounts,
        'errors', error_accounts
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        error_accounts := array_append(error_accounts, SQLERRM);
        result := json_build_object(
            'created', created_accounts,
            'existing', existing_accounts,
            'errors', error_accounts
        );
        RETURN result;
END;
$$;