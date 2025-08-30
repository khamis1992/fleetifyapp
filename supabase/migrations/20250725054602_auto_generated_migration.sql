-- Fix the copy_default_accounts_to_company function to calculate levels directly
CREATE OR REPLACE FUNCTION public.copy_default_accounts_to_company(target_company_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    default_account RECORD;
    parent_mapping jsonb := '{}';
    new_account_id uuid;
    parent_id uuid;
    calculated_level integer;
BEGIN
    -- First pass: Create all accounts and build parent mapping
    FOR default_account IN 
        SELECT * FROM public.default_chart_of_accounts 
        ORDER BY account_level, sort_order, account_code
    LOOP
        -- Generate new ID for the account
        new_account_id := gen_random_uuid();
        
        -- Find parent ID if exists and calculate level
        parent_id := NULL;
        calculated_level := 1;
        
        IF default_account.parent_account_code IS NOT NULL THEN
            parent_id := (parent_mapping->default_account.parent_account_code)::uuid;
            -- If parent exists, level is parent's level + 1
            IF parent_id IS NOT NULL THEN
                SELECT account_level + 1 INTO calculated_level
                FROM public.chart_of_accounts 
                WHERE id = parent_id;
                
                -- Fallback to default calculation if needed
                IF calculated_level IS NULL THEN
                    calculated_level := default_account.account_level;
                END IF;
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
        
        -- Store mapping for children
        parent_mapping := parent_mapping || jsonb_build_object(default_account.account_code, new_account_id);
    END LOOP;
END;
$function$