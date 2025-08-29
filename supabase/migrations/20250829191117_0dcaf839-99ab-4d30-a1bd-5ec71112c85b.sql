-- إنشاء الحسابات الأساسية المطلوبة وربطها تلقائياً
CREATE OR REPLACE FUNCTION public.setup_essential_accounts_and_mappings(company_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    receivables_account_id uuid;
    rental_revenue_account_id uuid;
    sales_revenue_account_id uuid;
    receivables_type_id uuid;
    rental_revenue_type_id uuid;
    sales_revenue_type_id uuid;
    result json;
    accounts_created text[] := '{}';
    mappings_created text[] := '{}';
    accounts_existing text[] := '{}';
    mappings_existing text[] := '{}';
BEGIN
    -- الحصول على أنواع الحسابات الافتراضية
    SELECT id INTO receivables_type_id 
    FROM default_account_types 
    WHERE account_type_code = 'RECEIVABLES' 
    LIMIT 1;
    
    SELECT id INTO rental_revenue_type_id 
    FROM default_account_types 
    WHERE account_type_code = 'RENTAL_REVENUE' 
    LIMIT 1;
    
    SELECT id INTO sales_revenue_type_id 
    FROM default_account_types 
    WHERE account_type_code = 'SALES_REVENUE' 
    LIMIT 1;

    -- التحقق من وجود حساب الذمم المدينة وإنشاؤه إذا لم يكن موجوداً
    SELECT id INTO receivables_account_id
    FROM chart_of_accounts
    WHERE company_id = company_id_param 
    AND account_code = '1301'
    AND is_active = true
    LIMIT 1;

    IF receivables_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, account_subtype, balance_type, account_level,
            is_header, is_active, is_system, can_link_customers
        ) VALUES (
            gen_random_uuid(), company_id_param, '1301', 'Accounts Receivable', 'الذمم المدينة',
            'ASSETS', 'CURRENT_ASSETS', 'DEBIT', 4,
            false, true, true, true
        ) RETURNING id INTO receivables_account_id;
        
        accounts_created := array_append(accounts_created, 'الذمم المدينة (1301)');
    ELSE
        accounts_existing := array_append(accounts_existing, 'الذمم المدينة (1301)');
    END IF;

    -- التحقق من وجود حساب إيرادات الإيجار وإنشاؤه إذا لم يكن موجوداً
    SELECT id INTO rental_revenue_account_id
    FROM chart_of_accounts
    WHERE company_id = company_id_param 
    AND account_code = '4101'
    AND is_active = true
    LIMIT 1;

    IF rental_revenue_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, account_subtype, balance_type, account_level,
            is_header, is_active, is_system
        ) VALUES (
            gen_random_uuid(), company_id_param, '4101', 'Rental Revenue', 'إيرادات الإيجار',
            'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 4,
            false, true, true
        ) RETURNING id INTO rental_revenue_account_id;
        
        accounts_created := array_append(accounts_created, 'إيرادات الإيجار (4101)');
    ELSE
        accounts_existing := array_append(accounts_existing, 'إيرادات الإيجار (4101)');
    END IF;

    -- التحقق من وجود حساب إيرادات المبيعات وإنشاؤه إذا لم يكن موجوداً
    SELECT id INTO sales_revenue_account_id
    FROM chart_of_accounts
    WHERE company_id = company_id_param 
    AND account_code = '4001'
    AND is_active = true
    LIMIT 1;

    IF sales_revenue_account_id IS NULL THEN
        INSERT INTO chart_of_accounts (
            id, company_id, account_code, account_name, account_name_ar,
            account_type, account_subtype, balance_type, account_level,
            is_header, is_active, is_system
        ) VALUES (
            gen_random_uuid(), company_id_param, '4001', 'Sales Revenue', 'إيرادات المبيعات',
            'REVENUE', 'OPERATING_REVENUE', 'CREDIT', 4,
            false, true, true
        ) RETURNING id INTO sales_revenue_account_id;
        
        accounts_created := array_append(accounts_created, 'إيرادات المبيعات (4001)');
    ELSE
        accounts_existing := array_append(accounts_existing, 'إيرادات المبيعات (4001)');
    END IF;

    -- إنشاء ربط حساب الذمم المدينة
    IF receivables_type_id IS NOT NULL AND receivables_account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM account_mappings 
            WHERE company_id = company_id_param 
            AND default_account_type_id = receivables_type_id
            AND is_active = true
        ) THEN
            INSERT INTO account_mappings (
                company_id, default_account_type_id, chart_of_accounts_id, is_active
            ) VALUES (
                company_id_param, receivables_type_id, receivables_account_id, true
            );
            mappings_created := array_append(mappings_created, 'ربط الذمم المدينة');
        ELSE
            mappings_existing := array_append(mappings_existing, 'ربط الذمم المدينة');
        END IF;
    END IF;

    -- إنشاء ربط حساب إيرادات الإيجار
    IF rental_revenue_type_id IS NOT NULL AND rental_revenue_account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM account_mappings 
            WHERE company_id = company_id_param 
            AND default_account_type_id = rental_revenue_type_id
            AND is_active = true
        ) THEN
            INSERT INTO account_mappings (
                company_id, default_account_type_id, chart_of_accounts_id, is_active
            ) VALUES (
                company_id_param, rental_revenue_type_id, rental_revenue_account_id, true
            );
            mappings_created := array_append(mappings_created, 'ربط إيرادات الإيجار');
        ELSE
            mappings_existing := array_append(mappings_existing, 'ربط إيرادات الإيجار');
        END IF;
    END IF;

    -- إنشاء ربط حساب إيرادات المبيعات
    IF sales_revenue_type_id IS NOT NULL AND sales_revenue_account_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM account_mappings 
            WHERE company_id = company_id_param 
            AND default_account_type_id = sales_revenue_type_id
            AND is_active = true
        ) THEN
            INSERT INTO account_mappings (
                company_id, default_account_type_id, chart_of_accounts_id, is_active
            ) VALUES (
                company_id_param, sales_revenue_type_id, sales_revenue_account_id, true
            );
            mappings_created := array_append(mappings_created, 'ربط إيرادات المبيعات');
        ELSE
            mappings_existing := array_append(mappings_existing, 'ربط إيرادات المبيعات');
        END IF;
    END IF;

    result := json_build_object(
        'success', true,
        'accounts_created', accounts_created,
        'accounts_existing', accounts_existing,
        'mappings_created', mappings_created,
        'mappings_existing', mappings_existing,
        'message', format('تم إعداد %s حساب و %s ربط بنجاح', 
                         array_length(accounts_created, 1) + array_length(accounts_existing, 1),
                         array_length(mappings_created, 1) + array_length(mappings_existing, 1))
    );

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'accounts_created', accounts_created,
            'accounts_existing', accounts_existing,
            'mappings_created', mappings_created,
            'mappings_existing', mappings_existing
        );
END;
$$;

-- إنشاء دالة محدثة للتحقق من الحسابات الأساسية
DROP FUNCTION IF EXISTS public.ensure_essential_account_mappings(uuid);

CREATE OR REPLACE FUNCTION public.ensure_essential_account_mappings(company_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    missing_accounts text[] := '{}';
    existing_accounts text[] := '{}';
    result json;
    receivables_mapped boolean := false;
    rental_revenue_mapped boolean := false;
    sales_revenue_mapped boolean := false;
BEGIN
    -- التحقق من وجود ربط حساب الذمم المدينة
    SELECT EXISTS (
        SELECT 1 
        FROM account_mappings am
        JOIN default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param 
        AND dat.account_type_code = 'RECEIVABLES'
        AND am.is_active = true
    ) INTO receivables_mapped;

    -- التحقق من وجود ربط حساب إيرادات الإيجار
    SELECT EXISTS (
        SELECT 1 
        FROM account_mappings am
        JOIN default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param 
        AND dat.account_type_code = 'RENTAL_REVENUE'
        AND am.is_active = true
    ) INTO rental_revenue_mapped;

    -- التحقق من وجود ربط حساب إيرادات المبيعات
    SELECT EXISTS (
        SELECT 1 
        FROM account_mappings am
        JOIN default_account_types dat ON am.default_account_type_id = dat.id
        WHERE am.company_id = company_id_param 
        AND dat.account_type_code = 'SALES_REVENUE'
        AND am.is_active = true
    ) INTO sales_revenue_mapped;

    -- تحديد الحسابات المفقودة والموجودة
    IF receivables_mapped THEN
        existing_accounts := array_append(existing_accounts, 'الذمم المدينة');
    ELSE
        missing_accounts := array_append(missing_accounts, 'الذمم المدينة');
    END IF;

    IF rental_revenue_mapped THEN
        existing_accounts := array_append(existing_accounts, 'إيرادات الإيجار');
    ELSE
        missing_accounts := array_append(missing_accounts, 'إيرادات الإيجار');
    END IF;

    IF sales_revenue_mapped THEN
        existing_accounts := array_append(existing_accounts, 'إيرادات المبيعات');
    ELSE
        missing_accounts := array_append(missing_accounts, 'إيرادات المبيعات');
    END IF;

    -- إنشاء الحسابات والربط المفقود تلقائياً
    IF array_length(missing_accounts, 1) > 0 THEN
        SELECT setup_essential_accounts_and_mappings(company_id_param) INTO result;
        RETURN result;
    ELSE
        RETURN json_build_object(
            'success', true,
            'existing', existing_accounts,
            'message', 'جميع الحسابات الأساسية موجودة ومربوطة'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'existing', existing_accounts,
            'errors', missing_accounts
        );
END;
$$;