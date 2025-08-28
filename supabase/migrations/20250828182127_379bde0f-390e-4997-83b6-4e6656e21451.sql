-- إصلاح شامل لنظام إنشاء حسابات العملاء
-- 1. إنشاء دالة آمنة لإنشاء الحسابات المحاسبية للعملاء
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    p_customer_id uuid,
    p_company_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    customer_record record;
    company_settings jsonb;
    default_receivables_account_id uuid;
    new_account_code text;
    new_account_name text;
    new_account_id uuid;
    account_type_id uuid;
    result json;
BEGIN
    -- التحقق من وجود العميل
    SELECT * INTO customer_record
    FROM customers 
    WHERE id = p_customer_id AND company_id = p_company_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Customer not found'
        );
    END IF;
    
    -- التحقق من وجود حساب محاسبي مسبقاً
    IF EXISTS (
        SELECT 1 FROM customer_accounts 
        WHERE customer_id = p_customer_id 
        AND is_active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Customer already has an account'
        );
    END IF;
    
    -- الحصول على إعدادات الشركة
    SELECT customer_account_settings INTO company_settings
    FROM companies 
    WHERE id = p_company_id;
    
    -- الحصول على حساب المدينين الافتراضي
    default_receivables_account_id := (company_settings->>'default_receivables_account_id')::uuid;
    
    -- إذا لم يكن هناك حساب مدينين افتراضي، البحث عن واحد أو إنشاؤه
    IF default_receivables_account_id IS NULL THEN
        SELECT id INTO default_receivables_account_id
        FROM chart_of_accounts
        WHERE company_id = p_company_id
        AND account_type = 'asset'
        AND account_subtype = 'current_assets'
        AND (account_name ILIKE '%مدين%' OR account_name ILIKE '%receivable%')
        AND is_active = true
        LIMIT 1;
        
        -- إنشاء حساب مدينين افتراضي إذا لم يوجد
        IF default_receivables_account_id IS NULL THEN
            INSERT INTO chart_of_accounts (
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                account_subtype,
                balance_type,
                account_level,
                is_active,
                can_link_customers
            ) VALUES (
                p_company_id,
                '1301',
                'Accounts Receivable - Trade',
                'ذمم مدينة - تجارية',
                'asset',
                'current_assets',
                'debit',
                4,
                true,
                true
            ) RETURNING id INTO default_receivables_account_id;
            
            -- تحديث إعدادات الشركة
            UPDATE companies 
            SET customer_account_settings = jsonb_set(
                COALESCE(customer_account_settings, '{}'::jsonb),
                '{default_receivables_account_id}',
                to_jsonb(default_receivables_account_id)
            )
            WHERE id = p_company_id;
        END IF;
    END IF;
    
    -- البحث عن نوع حساب العميل الافتراضي
    SELECT id INTO account_type_id
    FROM customer_account_types
    WHERE company_id = p_company_id
    AND account_category = 'receivables'
    AND is_active = true
    LIMIT 1;
    
    -- إنشاء نوع حساب افتراضي إذا لم يوجد
    IF account_type_id IS NULL THEN
        INSERT INTO customer_account_types (
            company_id,
            type_name,
            type_name_ar,
            account_category,
            is_active
        ) VALUES (
            p_company_id,
            'Trade Receivables',
            'ذمم تجارية',
            'receivables',
            true
        ) RETURNING id INTO account_type_id;
    END IF;
    
    -- توليد كود وأسم الحساب
    new_account_code := COALESCE(company_settings->>'account_prefix', 'CUST-') || 
                       LPAD((
                           SELECT COUNT(*) + 1 
                           FROM customer_accounts 
                           WHERE customer_id IN (
                               SELECT id FROM customers WHERE company_id = p_company_id
                           )
                       )::text, 4, '0');
    
    -- تحديد اسم الحساب بناءً على نوع العميل
    IF customer_record.customer_type = 'individual' THEN
        new_account_name := customer_record.first_name || ' ' || customer_record.last_name;
    ELSE
        new_account_name := customer_record.company_name;
    END IF;
    
    -- إنشاء الحساب في customer_accounts
    INSERT INTO customer_accounts (
        customer_id,
        account_id,
        account_type_id,
        is_default,
        currency,
        is_active
    ) VALUES (
        p_customer_id,
        default_receivables_account_id,
        account_type_id,
        true,
        'KWD',
        true
    ) RETURNING id INTO new_account_id;
    
    result := json_build_object(
        'success', true,
        'account_id', new_account_id,
        'customer_id', p_customer_id,
        'chart_account_id', default_receivables_account_id,
        'account_code', new_account_code,
        'account_name', new_account_name
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 2. تحديث دالة auto_create_customer_accounts لاستخدام الدالة الجديدة
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id uuid,
    p_company_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- استدعاء الدالة الآمنة لإنشاء الحساب
    SELECT public.create_customer_financial_account(p_customer_id, p_company_id) INTO result;
    
    RETURN result;
END;
$$;

-- 3. إنشاء حسابات للعملاء الموجودين الذين لا يملكون حسابات
DO $$
DECLARE
    customer_record record;
    result json;
BEGIN
    -- معالجة جميع العملاء الذين لا يملكون حسابات محاسبية
    FOR customer_record IN (
        SELECT c.id, c.company_id, 
               CASE 
                   WHEN c.customer_type = 'individual' THEN c.first_name || ' ' || c.last_name
                   ELSE c.company_name 
               END as display_name
        FROM customers c
        WHERE NOT EXISTS (
            SELECT 1 FROM customer_accounts ca 
            WHERE ca.customer_id = c.id 
            AND ca.is_active = true
        )
        AND c.is_active = true
    ) LOOP
        -- إنشاء حساب لكل عميل
        SELECT public.create_customer_financial_account(
            customer_record.id, 
            customer_record.company_id
        ) INTO result;
        
        RAISE NOTICE 'إنشاء حساب للعميل %: %', customer_record.display_name, result;
    END LOOP;
END;
$$;

-- 4. إنشاء trigger لإنشاء الحسابات تلقائياً للعملاء الجدد
CREATE OR REPLACE FUNCTION public.trigger_create_customer_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    -- إنشاء حساب محاسبي للعميل الجديد
    SELECT public.create_customer_financial_account(NEW.id, NEW.company_id) INTO result;
    
    -- تسجيل النتيجة في السجلات
    IF (result->>'success')::boolean = false THEN
        RAISE WARNING 'فشل في إنشاء حساب محاسبي للعميل %: %', NEW.id, result->>'error';
    END IF;
    
    RETURN NEW;
END;
$$;

-- إزالة trigger القديم إن وجد وإنشاء trigger جديد
DROP TRIGGER IF EXISTS create_customer_account_trigger ON customers;

CREATE TRIGGER create_customer_account_trigger
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_customer_account();

-- 5. تحديث إعدادات الشركات لضمان تفعيل إنشاء الحسابات التلقائي
UPDATE companies 
SET customer_account_settings = jsonb_set(
    COALESCE(customer_account_settings, '{}'::jsonb),
    '{auto_create_account}',
    'true'::jsonb
)
WHERE customer_account_settings->>'auto_create_account' IS NULL 
   OR (customer_account_settings->>'auto_create_account')::boolean = false;