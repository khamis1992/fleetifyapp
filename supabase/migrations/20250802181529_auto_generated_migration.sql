-- Fix ambiguous column reference in create_customer_financial_account function
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
    
    -- البحث عن الحساب الأب للمدينين مع استخدام alias واضح
    SELECT coa.id INTO parent_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%receivable%' 
         OR coa.account_name ILIKE '%مدين%' 
         OR coa.account_name ILIKE '%ذمم%'
         OR coa.account_code LIKE '112%')
    AND coa.is_active = true
    ORDER BY coa.account_code
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
    
    -- إنشاء رقم تسلسلي للحساب مع استخدام alias واضح
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO account_sequence
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.parent_account_id = parent_account_id
    AND coa.account_code ~ '^112[0-9]-[0-9]+$';
    
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
$function$;

-- Update other functions to fix ambiguous column references
CREATE OR REPLACE FUNCTION public.search_accounts_fixed(company_id_param uuid, search_term text DEFAULT ''::text, account_type_filter text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_type text, current_balance numeric, is_active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_type,
        coa.current_balance,
        coa.is_active
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND (
        search_term = '' OR
        coa.account_name ILIKE '%' || search_term || '%' OR
        coa.account_code ILIKE '%' || search_term || '%' OR
        coa.account_name_ar ILIKE '%' || search_term || '%'
    )
    AND (account_type_filter IS NULL OR coa.account_type = account_type_filter)
    ORDER BY coa.account_code;
END;
$function$;

-- Update get_accounts_by_type_fixed function
CREATE OR REPLACE FUNCTION public.get_accounts_by_type_fixed(company_id_param uuid, account_type_param text)
 RETURNS TABLE(id uuid, account_code character varying, account_name text, account_name_ar text, current_balance numeric, is_header boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        coa.id,
        coa.account_code,
        coa.account_name,
        coa.account_name_ar,
        coa.current_balance,
        coa.is_header
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = account_type_param
    AND coa.is_active = true
    ORDER BY coa.account_code;
END;
$function$;

-- Update find_revenue_account_fixed function
CREATE OR REPLACE FUNCTION public.find_revenue_account_fixed(company_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_id uuid;
BEGIN
    SELECT coa.id INTO account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'revenue'
    AND (coa.account_name ILIKE '%rental%' OR coa.account_name ILIKE '%إيجار%')
    AND coa.is_active = true
    LIMIT 1;
    
    RETURN account_id;
END;
$function$;

-- Update find_cash_account_fixed function
CREATE OR REPLACE FUNCTION public.find_cash_account_fixed(company_id_param uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_id uuid;
BEGIN
    SELECT coa.id INTO account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND (coa.account_name ILIKE '%cash%' OR coa.account_name ILIKE '%bank%')
    AND coa.is_active = true
    LIMIT 1;
    
    RETURN account_id;
END;
$function$;