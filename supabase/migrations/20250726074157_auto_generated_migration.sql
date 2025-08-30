-- Fix security issues by updating function search paths

-- Update handle_new_customer function to set search_path
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Create financial account for new customer
    IF TG_OP = 'INSERT' THEN
        PERFORM create_customer_financial_account(NEW.id, NEW.company_id);
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Update create_customer_financial_account function to set search_path
CREATE OR REPLACE FUNCTION public.create_customer_financial_account(customer_id_param uuid, company_id_param uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record record;
    account_id uuid;
    account_code varchar;
    account_name text;
    next_code_number integer;
BEGIN
    -- Get customer details
    SELECT * INTO customer_record
    FROM customers
    WHERE id = customer_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Customer not found';
    END IF;
    
    -- Generate unique account code
    SELECT COALESCE(MAX(CAST(SUBSTRING(account_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_code_number
    FROM chart_of_accounts
    WHERE company_id = company_id_param
    AND account_code LIKE '1201%';
    
    account_code := '1201' || LPAD(next_code_number::text, 4, '0');
    
    -- Create account name
    IF customer_record.customer_type = 'individual' THEN
        account_name := COALESCE(customer_record.first_name, '') || ' ' || COALESCE(customer_record.last_name, '');
    ELSE
        account_name := COALESCE(customer_record.company_name, 'Corporate Customer');
    END IF;
    
    account_name := 'Customer - ' || TRIM(account_name);
    
    -- Find parent receivables account
    WITH receivables_account AS (
        SELECT id as parent_id
        FROM chart_of_accounts
        WHERE company_id = company_id_param
        AND account_type = 'assets'
        AND (account_name ILIKE '%receivable%' OR account_code = '1201')
        AND is_header = true
        LIMIT 1
    )
    -- Create the customer account
    INSERT INTO chart_of_accounts (
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
    )
    SELECT 
        gen_random_uuid(),
        company_id_param,
        account_code,
        account_name,
        account_name || ' (العميل)',
        'assets',
        'accounts_receivable',
        'debit',
        ra.parent_id,
        CASE WHEN ra.parent_id IS NOT NULL THEN 3 ELSE 2 END,
        false,
        false,
        'Customer specific receivables account',
        0,
        true
    FROM receivables_account ra
    RETURNING id INTO account_id;
    
    -- Link customer to account
    INSERT INTO customer_accounts (
        company_id,
        customer_id,
        account_id
    ) VALUES (
        company_id_param,
        customer_id_param,
        account_id
    );
    
    RETURN account_id;
END;
$function$;