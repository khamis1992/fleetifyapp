-- Update auto_create_customer_accounts function with detailed logging and error handling
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    p_customer_id UUID,
    p_company_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_accounts_created INTEGER := 0;
    v_default_receivables_id UUID;
    v_customer_type TEXT;
    v_customer_name TEXT;
    v_receivables_account_id UUID;
    v_company_settings JSONB;
    v_account_prefix TEXT := 'CUST-';
    v_account_code TEXT;
    v_account_name TEXT;
    v_account_name_ar TEXT;
    v_error_message TEXT;
BEGIN
    -- Log function start
    RAISE LOG 'auto_create_customer_accounts: Starting for customer_id=%, company_id=%', p_customer_id, p_company_id;
    
    -- Validate input parameters
    IF p_customer_id IS NULL THEN
        RAISE LOG 'auto_create_customer_accounts: ERROR - customer_id is NULL';
        RAISE EXCEPTION 'معرف العميل مطلوب';
    END IF;
    
    IF p_company_id IS NULL THEN
        RAISE LOG 'auto_create_customer_accounts: ERROR - company_id is NULL';
        RAISE EXCEPTION 'معرف الشركة مطلوب';
    END IF;
    
    -- Get customer information
    BEGIN
        SELECT 
            customer_type,
            CASE 
                WHEN customer_type = 'individual' THEN first_name || ' ' || last_name
                ELSE company_name 
            END
        INTO v_customer_type, v_customer_name
        FROM customers 
        WHERE id = p_customer_id AND company_id = p_company_id;
        
        IF NOT FOUND THEN
            RAISE LOG 'auto_create_customer_accounts: ERROR - Customer not found for id=%, company_id=%', p_customer_id, p_company_id;
            RAISE EXCEPTION 'العميل غير موجود في الشركة المحددة';
        END IF;
        
        RAISE LOG 'auto_create_customer_accounts: Customer found - type=%, name=%', v_customer_type, v_customer_name;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := 'خطأ في جلب بيانات العميل: ' || SQLERRM;
            RAISE LOG 'auto_create_customer_accounts: ERROR getting customer info - %', v_error_message;
            RAISE EXCEPTION '%', v_error_message;
    END;
    
    -- Get company settings
    BEGIN
        SELECT customer_account_settings INTO v_company_settings
        FROM companies 
        WHERE id = p_company_id;
        
        IF v_company_settings IS NULL THEN
            RAISE LOG 'auto_create_customer_accounts: WARNING - No company settings found, using defaults';
            v_company_settings := '{"account_prefix": "CUST-", "auto_create_account": true}'::jsonb;
        ELSE
            RAISE LOG 'auto_create_customer_accounts: Company settings found: %', v_company_settings;
        END IF;
        
        -- Extract account prefix from settings
        v_account_prefix := COALESCE(v_company_settings->>'account_prefix', 'CUST-');
        RAISE LOG 'auto_create_customer_accounts: Using account prefix: %', v_account_prefix;
        
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := 'خطأ في جلب إعدادات الشركة: ' || SQLERRM;
            RAISE LOG 'auto_create_customer_accounts: ERROR getting company settings - %', v_error_message;
            -- Continue with defaults
            v_account_prefix := 'CUST-';
    END;
    
    -- Get default receivables account for the company
    BEGIN
        SELECT id INTO v_default_receivables_id
        FROM chart_of_accounts
        WHERE company_id = p_company_id
        AND account_type = 'current_assets'
        AND account_subtype = 'accounts_receivable'
        AND is_active = true
        AND can_link_customers = true
        ORDER BY is_default DESC, created_at ASC
        LIMIT 1;
        
        IF v_default_receivables_id IS NULL THEN
            RAISE LOG 'auto_create_customer_accounts: WARNING - No default receivables account found, will create one';
        ELSE
            RAISE LOG 'auto_create_customer_accounts: Default receivables account found: %', v_default_receivables_id;
        END IF;
        
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := 'خطأ في البحث عن حساب المدينين الافتراضي: ' || SQLERRM;
            RAISE LOG 'auto_create_customer_accounts: ERROR finding receivables account - %', v_error_message;
            -- Continue without default account
    END;
    
    -- Create customer-specific receivables account
    BEGIN
        -- Generate unique account code
        v_account_code := v_account_prefix || p_customer_id::text;
        v_account_name := 'Customer Receivables - ' || v_customer_name;
        v_account_name_ar := 'ذمم العميل - ' || v_customer_name;
        
        RAISE LOG 'auto_create_customer_accounts: Creating receivables account with code=%, name=%', v_account_code, v_account_name;
        
        -- Insert the customer receivables account
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
            can_link_customers,
            parent_account_id
        ) VALUES (
            p_company_id,
            v_account_code,
            v_account_name,
            v_account_name_ar,
            'current_assets',
            'accounts_receivable',
            'debit',
            5,
            true,
            true,
            v_default_receivables_id
        ) RETURNING id INTO v_receivables_account_id;
        
        RAISE LOG 'auto_create_customer_accounts: Created receivables account with id=%', v_receivables_account_id;
        v_accounts_created := v_accounts_created + 1;
        
    EXCEPTION
        WHEN unique_violation THEN
            v_error_message := 'كود الحساب موجود مسبقاً: ' || v_account_code;
            RAISE LOG 'auto_create_customer_accounts: ERROR - Account code already exists: %', v_account_code;
            -- Try to find existing account
            SELECT id INTO v_receivables_account_id
            FROM chart_of_accounts
            WHERE company_id = p_company_id AND account_code = v_account_code;
            
            IF v_receivables_account_id IS NOT NULL THEN
                RAISE LOG 'auto_create_customer_accounts: Using existing account with same code: %', v_receivables_account_id;
            END IF;
            
        WHEN OTHERS THEN
            v_error_message := 'خطأ في إنشاء حساب المدينين: ' || SQLERRM;
            RAISE LOG 'auto_create_customer_accounts: ERROR creating receivables account - %', v_error_message;
            RAISE EXCEPTION '%', v_error_message;
    END;
    
    -- Link the account to the customer
    IF v_receivables_account_id IS NOT NULL THEN
        BEGIN
            -- Get or create receivables account type
            DECLARE
                v_account_type_id UUID;
            BEGIN
                SELECT id INTO v_account_type_id
                FROM customer_account_types
                WHERE company_id = p_company_id 
                AND type_name = 'receivables'
                LIMIT 1;
                
                IF v_account_type_id IS NULL THEN
                    RAISE LOG 'auto_create_customer_accounts: Creating receivables account type';
                    INSERT INTO customer_account_types (
                        company_id,
                        type_name,
                        type_name_ar,
                        account_category,
                        is_active
                    ) VALUES (
                        p_company_id,
                        'receivables',
                        'ذمم مدينة',
                        'current_assets',
                        true
                    ) RETURNING id INTO v_account_type_id;
                    
                    RAISE LOG 'auto_create_customer_accounts: Created account type with id=%', v_account_type_id;
                END IF;
            END;
            
            -- Link account to customer
            INSERT INTO customer_accounts (
                customer_id,
                company_id,
                account_id,
                account_type_id,
                is_default,
                currency,
                is_active
            ) VALUES (
                p_customer_id,
                p_company_id,
                v_receivables_account_id,
                v_account_type_id,
                true,
                'KWD',
                true
            );
            
            RAISE LOG 'auto_create_customer_accounts: Successfully linked account to customer';
            
        EXCEPTION
            WHEN unique_violation THEN
                RAISE LOG 'auto_create_customer_accounts: WARNING - Customer account link already exists';
                -- This is not an error, account already linked
            WHEN OTHERS THEN
                v_error_message := 'خطأ في ربط الحساب بالعميل: ' || SQLERRM;
                RAISE LOG 'auto_create_customer_accounts: ERROR linking account - %', v_error_message;
                RAISE EXCEPTION '%', v_error_message;
        END;
    END IF;
    
    RAISE LOG 'auto_create_customer_accounts: Completed successfully, created % accounts', v_accounts_created;
    RETURN v_accounts_created;
    
EXCEPTION
    WHEN OTHERS THEN
        v_error_message := 'خطأ عام في إنشاء الحسابات: ' || SQLERRM;
        RAISE LOG 'auto_create_customer_accounts: FATAL ERROR - %', v_error_message;
        RAISE EXCEPTION '%', v_error_message;
END;
$$;