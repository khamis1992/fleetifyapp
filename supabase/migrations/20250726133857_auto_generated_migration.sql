-- إصلاح الوظيفة create_customer_financial_account لحل مشكلة account_code المبهمة

DROP FUNCTION IF EXISTS public.create_customer_financial_account(uuid, uuid, text);

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
BEGIN
    -- Find the parent receivables account
    SELECT coa.id INTO parent_account_id
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_type = 'assets'
    AND coa.account_name ILIKE '%receivable%'
    AND coa.is_header = true
    AND coa.is_active = true
    LIMIT 1;
    
    -- If no parent found, find any receivables account
    IF parent_account_id IS NULL THEN
        SELECT coa.id INTO parent_account_id
        FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        AND coa.account_type = 'assets'
        AND coa.account_name ILIKE '%receivable%'
        AND coa.is_active = true
        LIMIT 1;
    END IF;
    
    -- Generate account code (fixed the ambiguous reference)
    SELECT COALESCE(MAX(CAST(SUBSTRING(coa.account_code FROM '[0-9]+$') AS integer)), 0) + 1
    INTO next_number
    FROM public.chart_of_accounts coa
    WHERE coa.company_id = company_id_param
    AND coa.account_code ~ '^[0-9]+$';
    
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
            (SELECT coa2.account_level + 1 FROM public.chart_of_accounts coa2 WHERE coa2.id = parent_account_id)
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
$function$;

-- إصلاح الوظيفة copy_default_accounts_to_company لحل مشاكل account_code المبهمة
CREATE OR REPLACE FUNCTION public.copy_default_accounts_to_company(target_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    default_account RECORD;
    parent_mapping jsonb := '{}';
    new_account_id uuid;
    parent_id uuid;
    calculated_level integer;
    parent_id_text text;
BEGIN
    -- First pass: Create all accounts and build parent mapping
    FOR default_account IN 
        SELECT dca.* FROM public.default_chart_of_accounts dca
        ORDER BY dca.account_level, dca.sort_order, dca.account_code
    LOOP
        -- Generate new ID for the account
        new_account_id := gen_random_uuid();
        
        -- Find parent ID if exists and calculate level
        parent_id := NULL;
        calculated_level := 1;
        
        IF default_account.parent_account_code IS NOT NULL THEN
            -- Safely extract parent ID from jsonb mapping
            parent_id_text := parent_mapping ->> default_account.parent_account_code;
            
            IF parent_id_text IS NOT NULL AND parent_id_text != '' THEN
                parent_id := parent_id_text::uuid;
                -- If parent exists, level is parent's level + 1
                SELECT coa.account_level + 1 INTO calculated_level
                FROM public.chart_of_accounts coa
                WHERE coa.id = parent_id;
                
                -- Fallback to default calculation if needed
                IF calculated_level IS NULL THEN
                    calculated_level := default_account.account_level;
                END IF;
            ELSE
                -- Parent not found yet, use default level
                calculated_level := default_account.account_level;
            END IF;
        ELSE
            -- Root level account
            calculated_level := 1;
        END IF;
        
        -- Insert the new account with calculated level
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
            new_account_id,
            target_company_id,
            default_account.account_code,
            default_account.account_name,
            default_account.account_name_ar,
            default_account.account_type,
            default_account.account_subtype,
            default_account.balance_type,
            parent_id,
            calculated_level,
            default_account.is_header,
            default_account.is_system,
            default_account.description,
            0,
            true
        );
        
        -- Store mapping for children using text conversion
        parent_mapping := parent_mapping || jsonb_build_object(default_account.account_code, new_account_id::text);
    END LOOP;
END;
$function$;

-- إصلاح الوظيفة update_account_levels_manually لحل مشاكل account_code المبهمة
CREATE OR REPLACE FUNCTION public.update_account_levels_manually(company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    account_record RECORD;
    calculated_level integer;
BEGIN
    -- Update all accounts in the company with correct levels
    FOR account_record IN 
        SELECT coa.id FROM public.chart_of_accounts coa
        WHERE coa.company_id = company_id_param
        ORDER BY coa.account_code
    LOOP
        calculated_level := calculate_account_level(account_record.id);
        
        UPDATE public.chart_of_accounts 
        SET account_level = calculated_level 
        WHERE id = account_record.id;
    END LOOP;
END;
$function$;