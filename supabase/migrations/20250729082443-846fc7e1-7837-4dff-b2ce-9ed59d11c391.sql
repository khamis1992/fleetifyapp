-- إضافة إعدادات إنشاء الحسابات للعملاء في الشركات
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS customer_account_settings jsonb DEFAULT '{
  "enable_account_selection": true,
  "default_receivables_account_id": null,
  "account_prefix": "CUST-",
  "auto_create_account": true,
  "account_naming_pattern": "customer_name",
  "account_group_by": "customer_type"
}'::jsonb;

-- إضافة دالة لإنشاء الحساب المحاسبي للعميل مع الإعدادات المخصصة
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    customer_id_param UUID,
    company_id_param UUID,
    customer_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id UUID;
    parent_account_id UUID;
    company_settings JSONB;
    account_name TEXT;
    account_code TEXT;
    account_sequence INTEGER;
    customer_name TEXT;
BEGIN
    -- الحصول على إعدادات الشركة
    SELECT customer_account_settings INTO company_settings
    FROM public.companies
    WHERE id = company_id_param;
    
    -- إذا لم يكن هناك إعدادات، استخدم الافتراضية
    IF company_settings IS NULL THEN
        company_settings := '{
            "enable_account_selection": true,
            "default_receivables_account_id": null,
            "account_prefix": "CUST-",
            "auto_create_account": true,
            "account_naming_pattern": "customer_name",
            "account_group_by": "customer_type"
        }'::jsonb;
    END IF;
    
    -- التحقق من تمكين إنشاء الحسابات التلقائي
    IF NOT (company_settings->>'auto_create_account')::boolean THEN
        RETURN NULL;
    END IF;
    
    -- البحث عن الحساب الأب للمدينين
    SELECT id INTO parent_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND (account_name ILIKE '%receivable%' 
         OR account_name ILIKE '%مدين%' 
         OR account_name ILIKE '%ذمم%'
         OR account_code LIKE '112%')
    AND is_active = true
    ORDER BY account_code
    LIMIT 1;
    
    -- إذا لم يتم العثور على حساب المدينين، قم بإنشاء واحد
    IF parent_account_id IS NULL THEN
        INSERT INTO public.chart_of_accounts (
            id,
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            balance_type,
            is_header,
            is_active,
            account_level,
            current_balance
        ) VALUES (
            gen_random_uuid(),
            company_id_param,
            '1120',
            'Trade Receivables - Local',
            'ذمم العملاء المحلية',
            'assets',
            'debit',
            true,
            true,
            2,
            0
        ) RETURNING id INTO parent_account_id;
    END IF;
    
    -- إنشاء اسم الحساب حسب النمط المحدد
    IF customer_data IS NOT NULL THEN
        CASE (company_settings->>'account_naming_pattern')
            WHEN 'customer_name' THEN
                IF (customer_data->>'customer_type') = 'individual' THEN
                    customer_name := TRIM(COALESCE(customer_data->>'first_name', '') || ' ' || COALESCE(customer_data->>'last_name', ''));
                ELSE
                    customer_name := COALESCE(customer_data->>'company_name', 'عميل');
                END IF;
            WHEN 'customer_id' THEN
                customer_name := 'Customer-' || customer_id_param::text;
            ELSE
                customer_name := 'Customer Account';
        END CASE;
    ELSE
        customer_name := 'Customer Account';
    END IF;
    
    -- إنشاء رقم تسلسلي للحساب
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO account_sequence
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND parent_account_id = parent_account_id
    AND account_code ~ '^112[0-9]-[0-9]+$';
    
    -- إنشاء رمز الحساب
    account_code := '1121-' || LPAD(account_sequence::text, 4, '0');
    
    -- إنشاء الحساب
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        balance_type,
        parent_account_id,
        is_header,
        is_active,
        account_level,
        current_balance,
        description
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        account_code,
        customer_name,
        customer_name,
        'assets',
        'debit',
        parent_account_id,
        false,
        true,
        3,
        0,
        'Customer account for: ' || customer_name
    ) RETURNING id INTO account_id;
    
    -- ربط الحساب بالعميل
    INSERT INTO public.customer_accounts (
        id,
        company_id,
        customer_id,
        account_id
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        customer_id_param,
        account_id
    );
    
    RAISE LOG 'Created financial account % for new customer %', account_id, customer_id_param;
    
    RETURN account_id;
END;
$$;

-- إضافة دالة للحصول على الحسابات المحاسبية المتاحة للعملاء
CREATE OR REPLACE FUNCTION public.get_available_customer_accounts(company_id_param UUID)
RETURNS TABLE(
    id UUID,
    account_code VARCHAR,
    account_name TEXT,
    account_name_ar TEXT,
    parent_account_name TEXT,
    is_available BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        parent_coa.account_name as parent_account_name,
        NOT EXISTS(
            SELECT 1 FROM public.customer_accounts ca 
            WHERE ca.account_id = coa.id AND ca.company_id = company_id_param
        ) as is_available
    FROM public.chart_of_accounts coa
    LEFT JOIN public.chart_of_accounts parent_coa ON coa.parent_account_id = parent_coa.id
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%receivable%' 
         OR coa.account_name ILIKE '%مدين%' 
         OR coa.account_name ILIKE '%ذمم%'
         OR coa.account_code LIKE '112%')
    AND coa.is_active = true
    AND coa.is_header = false
    ORDER BY coa.account_code;
END;
$$;

-- تحديث الدالة الحالية لإنشاء الحساب المالي للعميل
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    account_id UUID;
    customer_data JSONB;
BEGIN
    -- إعداد بيانات العميل لتمريرها للدالة
    customer_data := jsonb_build_object(
        'customer_type', NEW.customer_type,
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'company_name', NEW.company_name
    );
    
    -- إنشاء الحساب المالي للعميل
    RAISE LOG 'Starting create_customer_financial_account for customer: %, company: %', NEW.id, NEW.company_id;
    
    account_id := public.create_customer_financial_account(
        NEW.id,
        NEW.company_id,
        customer_data
    );
    
    IF account_id IS NOT NULL THEN
        RAISE LOG 'Successfully created customer financial account: % for customer: %', account_id, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- إنشاء أو تحديث المشغل للعملاء الجدد
DROP TRIGGER IF EXISTS customer_create_account_trigger ON public.customers;
CREATE TRIGGER customer_create_account_trigger
    AFTER INSERT ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_customer();