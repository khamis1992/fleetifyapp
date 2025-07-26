-- حذف جميع نسخ الدالة الموجودة
DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text);

-- إنشاء دالة واحدة صحيحة
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(
    company_id_param uuid, 
    customer_id_param uuid, 
    customer_name_param text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    new_account_code character varying;
    parent_account_id uuid;
    new_account_id uuid;
    next_number integer;
    company_exists boolean := false;
    customer_exists boolean := false;
BEGIN
    -- Input validation
    IF company_id_param IS NULL OR customer_id_param IS NULL OR customer_name_param IS NULL THEN
        RAISE EXCEPTION 'Invalid input parameters: company_id, customer_id, and customer_name cannot be null';
    END IF;

    -- Verify company exists
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = company_id_param) INTO company_exists;
    IF NOT company_exists THEN
        RAISE EXCEPTION 'Company with id % does not exist', company_id_param;
    END IF;

    -- Verify customer exists
    SELECT EXISTS(SELECT 1 FROM public.customers WHERE id = customer_id_param) INTO customer_exists;
    IF NOT customer_exists THEN
        RAISE EXCEPTION 'Customer with id % does not exist', customer_id_param;
    END IF;

    -- Check if customer already has a financial account
    IF EXISTS(SELECT 1 FROM public.customer_accounts WHERE customer_id = customer_id_param) THEN
        RAISE NOTICE 'Customer % already has a financial account', customer_id_param;
        SELECT account_id INTO new_account_id 
        FROM public.customer_accounts 
        WHERE customer_id = customer_id_param 
        LIMIT 1;
        RETURN new_account_id;
    END IF;

    -- Find the parent receivables account
    SELECT coa.id INTO parent_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND coa.account_name ILIKE '%receivable%'
    AND coa.is_header = true
    AND coa.is_active = true
    ORDER BY coa.account_level, coa.account_code
    LIMIT 1;
    
    -- If no header receivables account found, find any receivables account
    IF parent_account_id IS NULL THEN
        SELECT coa.id INTO parent_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'assets'
        AND coa.account_name ILIKE '%receivable%'
        AND coa.is_active = true
        ORDER BY coa.account_level, coa.account_code
        LIMIT 1;
    END IF;

    -- Generate unique account code
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS integer)), 0) + 1
    INTO next_number
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_code ~ '^[0-9]+$';
    
    -- Ensure we have a valid next number
    IF next_number IS NULL OR next_number < 1 THEN
        next_number := 1001;
    END IF;

    new_account_code := LPAD(next_number::text, 4, '0');
    
    -- Ensure account code is unique
    WHILE EXISTS(SELECT 1 FROM public.chart_of_accounts WHERE company_id = company_id_param AND account_code = new_account_code) LOOP
        next_number := next_number + 1;
        new_account_code := LPAD(next_number::text, 4, '0');
    END LOOP;

    -- Create the customer account
    INSERT INTO public.chart_of_accounts (
        id,
        company_id,
        account_code,
        account_name,
        account_name_ar,
        account_type,
        account_subtype,
        balance_type,
        parent_account_id,
        account_level,
        is_header,
        is_system,
        description,
        current_balance,
        is_active
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        new_account_code,
        customer_name_param || ' - Customer Account',
        customer_name_param || ' - حساب العميل',
        'assets',
        'accounts_receivable',
        'debit',
        parent_account_id,
        CASE 
            WHEN parent_account_id IS NOT NULL THEN
                (SELECT coa2.account_level + 1 FROM public.chart_of_accounts coa2 WHERE coa2.id = parent_account_id)
            ELSE 2 
        END,
        false,
        false,
        'Customer receivables account for ' || customer_name_param,
        0,
        true
    ) RETURNING id INTO new_account_id;
    
    -- Link the account to the customer
    INSERT INTO public.customer_accounts (
        id,
        company_id,
        customer_id,
        account_id
    ) VALUES (
        gen_random_uuid(),
        company_id_param,
        customer_id_param,
        new_account_id
    );
    
    RAISE NOTICE 'Successfully created financial account % for customer %', new_account_id, customer_id_param;
    
    RETURN new_account_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating customer financial account: %', SQLERRM;
END;
$function$;

-- تحديث صلاحيات العملاء للتأكد من أن السوبر أدمن له صلاحيات مطلقة
DROP POLICY IF EXISTS "Super admins have full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage customers in their company" ON public.customers;

-- إنشاء صلاحية للسوبر أدمن أولاً (أعلى أولوية)
CREATE POLICY "Super admins have absolute access to customers"
ON public.customers
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::user_role));

-- إنشاء صلاحية للموظفين (أولوية أقل)
CREATE POLICY "Staff can manage customers in their company"
ON public.customers
FOR ALL
TO authenticated
USING (
    (NOT has_role(auth.uid(), 'super_admin'::user_role)) AND 
    (company_id = get_user_company(auth.uid())) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
)
WITH CHECK (
    (NOT has_role(auth.uid(), 'super_admin'::user_role)) AND 
    (company_id = get_user_company(auth.uid())) AND 
    (has_role(auth.uid(), 'company_admin'::user_role) OR 
     has_role(auth.uid(), 'manager'::user_role) OR 
     has_role(auth.uid(), 'sales_agent'::user_role))
);