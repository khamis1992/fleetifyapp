-- Drop and recreate auto_create_customer_accounts function to fix ambiguous column reference
DROP FUNCTION IF EXISTS public.auto_create_customer_accounts(uuid, uuid);

CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id uuid,
    p_company_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    account_type_record RECORD;
    generated_account_code TEXT;
    account_name TEXT;
    account_name_ar TEXT;
    existing_account_id UUID;
    new_account_id UUID;
    created_accounts UUID[] := '{}';
    total_created INTEGER := 0;
    customer_name TEXT;
    result_json JSON;
BEGIN
    -- Get customer name for account naming
    SELECT 
        CASE 
            WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
            ELSE company_name 
        END INTO customer_name
    FROM customers 
    WHERE id = p_customer_id;
    
    -- Loop through default account types that should be created for customers
    FOR account_type_record IN 
        SELECT 
            dat.id,
            dat.account_type,
            dat.account_name,
            dat.account_name_ar,
            dat.parent_account_code,
            dat.balance_type
        FROM default_account_types dat
        WHERE dat.company_id = p_company_id 
        AND dat.is_active = true
        AND dat.auto_create_for_customers = true
        ORDER BY dat.account_type, dat.account_name
    LOOP
        -- Generate account code based on parent account
        IF account_type_record.parent_account_code IS NOT NULL THEN
            -- Get next available account code under parent
            SELECT COALESCE(MAX(CAST(RIGHT(coa.account_code, 2) AS INTEGER)), 0) + 1 INTO generated_account_code
            FROM chart_of_accounts coa
            WHERE coa.company_id = p_company_id 
            AND coa.account_code LIKE account_type_record.parent_account_code || '%'
            AND LENGTH(coa.account_code) = LENGTH(account_type_record.parent_account_code) + 2;
            
            generated_account_code := account_type_record.parent_account_code || LPAD(generated_account_code::TEXT, 2, '0');
        ELSE
            -- Generate a basic account code if no parent specified
            generated_account_code := '2' || LPAD((1000 + total_created)::TEXT, 3, '0');
        END IF;
        
        -- Create account names
        account_name := customer_name || ' - ' || account_type_record.account_name;
        account_name_ar := customer_name || ' - ' || COALESCE(account_type_record.account_name_ar, account_type_record.account_name);
        
        -- Check if account already exists with same code
        SELECT coa.id INTO existing_account_id
        FROM chart_of_accounts coa
        WHERE coa.company_id = p_company_id 
        AND coa.account_code = generated_account_code;
        
        IF existing_account_id IS NULL THEN
            -- Create new account
            INSERT INTO chart_of_accounts (
                company_id,
                account_code,
                account_name,
                account_name_ar,
                account_type,
                balance_type,
                is_active,
                is_header,
                can_link_customers,
                account_level,
                parent_account_code
            ) VALUES (
                p_company_id,
                generated_account_code,
                account_name,
                account_name_ar,
                account_type_record.account_type,
                account_type_record.balance_type,
                true,
                false,
                true,
                CASE 
                    WHEN LENGTH(generated_account_code) <= 4 THEN LENGTH(generated_account_code)
                    ELSE 5 
                END,
                account_type_record.parent_account_code
            ) RETURNING id INTO new_account_id;
            
            created_accounts := array_append(created_accounts, new_account_id);
            total_created := total_created + 1;
            
            -- Link customer to this account if it's a receivables account
            IF account_type_record.account_type = 'assets' AND account_type_record.account_name ILIKE '%receivable%' THEN
                UPDATE customers 
                SET account_id = new_account_id 
                WHERE id = p_customer_id;
            END IF;
        END IF;
    END LOOP;
    
    -- Return result
    result_json := json_build_object(
        'success', true,
        'message', 'تم إنشاء ' || total_created || ' حساب للعميل بنجاح',
        'created_accounts_count', total_created,
        'created_account_ids', created_accounts
    );
    
    RETURN result_json;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'خطأ في إنشاء الحسابات التلقائية: ' || SQLERRM,
            'created_accounts_count', total_created,
            'created_account_ids', created_accounts
        );
END;
$function$;