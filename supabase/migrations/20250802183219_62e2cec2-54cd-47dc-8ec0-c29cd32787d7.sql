-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS handle_new_customer_trigger ON public.customers;

-- Then drop the old function
DROP FUNCTION IF EXISTS public.handle_new_customer_fixed();

-- Update the create_customer_financial_account function with proper table aliases
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(customer_id_param uuid, company_id_param uuid, customer_data jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_id UUID;
    parent_account_id UUID;
    company_settings JSONB;
    account_name TEXT;
    account_code TEXT;
    account_sequence INTEGER;
    customer_name TEXT;
BEGIN
    -- Log function start
    RAISE LOG 'Creating financial account for customer %, company %', customer_id_param, company_id_param;
    
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
        
        RAISE LOG 'Using default company settings';
    END IF;
    
    -- التحقق من تمكين إنشاء الحسابات التلقائي
    IF NOT (company_settings->>'auto_create_account')::boolean THEN
        RAISE LOG 'Auto account creation is disabled for company %', company_id_param;
        RETURN NULL;
    END IF;
    
    -- البحث عن الحساب الأب للمدينين مع استخدام alias واضح
    SELECT coa_parent.id INTO parent_account_id
    FROM public.chart_of_accounts coa_parent
    WHERE coa_parent.company_id = company_id_param
    AND coa_parent.account_type = 'assets'
    AND (coa_parent.account_name ILIKE '%receivable%' 
         OR coa_parent.account_name ILIKE '%مدين%' 
         OR coa_parent.account_name ILIKE '%ذمم%'
         OR coa_parent.account_code LIKE '112%')
    AND coa_parent.is_active = true
    ORDER BY coa_parent.account_code
    LIMIT 1;
    
    -- إذا لم يتم العثور على حساب المدينين، قم بإنشاء واحد
    IF parent_account_id IS NULL THEN
        RAISE LOG 'Creating parent receivables account for company %', company_id_param;
        
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
        
        RAISE LOG 'Created parent receivables account: %', parent_account_id;
    ELSE
        RAISE LOG 'Found existing parent receivables account: %', parent_account_id;
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
    
    RAISE LOG 'Customer account name will be: %', customer_name;
    
    -- إنشاء رقم تسلسلي للحساب مع استخدام alias واضح
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa_child.account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO account_sequence
    FROM public.chart_of_accounts coa_child
    WHERE coa_child.company_id = company_id_param
    AND coa_child.parent_account_id = parent_account_id
    AND coa_child.account_code ~ '^112[0-9]-[0-9]+$';
    
    -- إنشاء رمز الحساب
    account_code := '1121-' || LPAD(account_sequence::text, 4, '0');
    
    RAISE LOG 'Generated account code: %', account_code;
    
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
    
    RAISE LOG 'Created chart of accounts entry: %', account_id;
    
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
    
    RAISE LOG 'Created customer account mapping for customer % with account %', customer_id_param, account_id;
    
    RETURN account_id;
END;
$function$;