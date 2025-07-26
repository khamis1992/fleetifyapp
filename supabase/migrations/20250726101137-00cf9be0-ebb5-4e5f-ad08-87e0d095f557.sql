-- Fix the ambiguous column reference in create_customer_financial_account function
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(customer_id_param uuid, customer_name_param text, company_id_param uuid)
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
BEGIN
    -- Find the parent receivables account
    SELECT id INTO parent_account_id
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND account_type = 'assets'
    AND account_name ILIKE '%receivable%'
    AND is_header = true
    AND is_active = true
    LIMIT 1;
    
    -- If no parent found, find any receivables account
    IF parent_account_id IS NULL THEN
        SELECT id INTO parent_account_id
        FROM public.chart_of_accounts
        WHERE company_id = company_id_param
        AND account_type = 'assets'
        AND account_name ILIKE '%receivable%'
        AND is_active = true
        LIMIT 1;
    END IF;
    
    -- Generate account code
    SELECT COALESCE(MAX(CAST(SUBSTRING(chart_of_accounts.account_code FROM '[0-9]+$') AS integer)), 0) + 1
    INTO next_number
    FROM public.chart_of_accounts
    WHERE company_id = company_id_param
    AND chart_of_accounts.account_code ~ '^[0-9]+$';
    
    new_account_code := LPAD(next_number::text, 4, '0');
    
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
        CASE WHEN parent_account_id IS NOT NULL THEN
            (SELECT account_level + 1 FROM public.chart_of_accounts WHERE id = parent_account_id)
        ELSE 2 END,
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
    
    RETURN new_account_id;
END;
$function$