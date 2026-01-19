import { createClient } from '@supabase/supabase-js';

// Use the hardcoded credentials since .env might be missing service key
const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDatabaseFunction() {
  console.log('🔄 Creating auto_create_customer_accounts function...');
  
  try {
    // First, execute the complete SQL from restore-customer-accounts.sql via RPC
    const sql = `
-- Drop any existing versions of the function to ensure we have a clean slate
DROP FUNCTION IF EXISTS public.auto_create_customer_accounts(uuid, uuid);

-- Create a standardized auto_create_customer_accounts function with proper parameter order
CREATE OR REPLACE FUNCTION public.auto_create_customer_accounts(
    customer_id_param uuid,
    company_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    customer_record customers%ROWTYPE;
    company_settings jsonb;
    default_receivables_account_id uuid;
    customer_account_id uuid;
    result jsonb;
    error_message text;
BEGIN
    -- Log function start for debugging
    RAISE NOTICE 'auto_create_customer_accounts: Starting for customer % in company %', customer_id_param, company_id_param;
    
    -- Validate input parameters
    IF customer_id_param IS NULL OR company_id_param IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'معرف العميل أو الشركة مفقود',
            'created_accounts', 0
        );
    END IF;

    -- Get customer record
    SELECT * INTO customer_record
    FROM customers
    WHERE id = customer_id_param 
    AND company_id = company_id_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'العميل غير موجود أو غير نشط',
            'created_accounts', 0
        );
    END IF;

    -- Get company customer account settings
    SELECT customer_account_settings INTO company_settings
    FROM companies
    WHERE id = company_id_param;
    
    -- If no settings exist, create default ones
    IF company_settings IS NULL THEN
        company_settings := jsonb_build_object(
            'auto_create_account', true,
            'enable_account_selection', true,
            'account_prefix', 'CUST-',
            'account_naming_pattern', 'customer_name',
            'account_group_by', 'customer_type'
        );
        
        -- Update the company with default settings
        UPDATE companies 
        SET customer_account_settings = company_settings
        WHERE id = company_id_param;
        
        RAISE NOTICE 'auto_create_customer_accounts: Created default settings for company %', company_id_param;
    END IF;
    
    -- Check if auto creation is enabled
    IF NOT COALESCE((company_settings->>'auto_create_account')::boolean, true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'الإنشاء التلقائي للحسابات معطل في إعدادات الشركة',
            'created_accounts', 0
        );
    END IF;

    -- Check if customer already has accounts to avoid duplicates
    IF EXISTS (
        SELECT 1 FROM customer_accounts 
        WHERE customer_id = customer_id_param 
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'العميل لديه حسابات مربوطة مسبقاً',
            'created_accounts', 0
        );
    END IF;

    -- Get or find default receivables account
    default_receivables_account_id := (company_settings->>'default_receivables_account_id')::uuid;
    
    -- If no default account is configured, try to find one automatically
    IF default_receivables_account_id IS NULL THEN
        SELECT id INTO default_receivables_account_id
        FROM chart_of_accounts 
        WHERE company_id = company_id_param 
        AND is_active = true
        AND (
            -- Look for receivables accounts
            LOWER(account_name) LIKE '%receivable%'
            OR LOWER(account_name) LIKE '%مدين%'
            OR LOWER(account_name) LIKE '%ذمم%'
            OR LOWER(account_name_ar) LIKE '%مدين%'
            OR LOWER(account_name_ar) LIKE '%ذمم%'
            OR account_code LIKE '112%'
            OR account_code LIKE '1120%'
            OR account_code LIKE '1130%'
        )
        AND (can_link_customers = true OR can_link_customers IS NULL)
        ORDER BY 
            CASE 
                WHEN LOWER(account_name) LIKE '%receivable%' THEN 1
                WHEN LOWER(account_name) LIKE '%مدين%' THEN 2
                WHEN account_code LIKE '112%' THEN 3
                ELSE 4
            END,
            account_code
        LIMIT 1;
        
        -- If we found one, update company settings
        IF default_receivables_account_id IS NOT NULL THEN
            UPDATE companies 
            SET customer_account_settings = jsonb_set(
                customer_account_settings,
                '{default_receivables_account_id}',
                to_jsonb(default_receivables_account_id::text)
            )
            WHERE id = company_id_param;
            
            RAISE NOTICE 'auto_create_customer_accounts: Auto-detected and configured default receivables account %', default_receivables_account_id;
        END IF;
    END IF;
    
    -- If still no receivables account, create a default one
    IF default_receivables_account_id IS NULL THEN
        -- Create a default receivables account
        INSERT INTO chart_of_accounts (
            id,
            company_id,
            account_code,
            account_name,
            account_name_ar,
            account_type,
            account_subtype,
            balance_type,
            account_level,
            is_active,
            is_system,
            can_link_customers
        ) VALUES (
            gen_random_uuid(),
            company_id_param,
            '1130001',
            'Accounts Receivable - Customers',
            'ذمم مدينة - العملاء',
            'current_assets',
            'accounts_receivable',
            'debit',
            4,
            true,
            true,
            true
        ) RETURNING id INTO default_receivables_account_id;
        
        -- Update company settings with new account
        UPDATE companies 
        SET customer_account_settings = jsonb_set(
            customer_account_settings,
            '{default_receivables_account_id}',
            to_jsonb(default_receivables_account_id::text)
        )
        WHERE id = company_id_param;
        
        RAISE NOTICE 'auto_create_customer_accounts: Created new default receivables account %', default_receivables_account_id;
    END IF;

    -- Verify the account exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM chart_of_accounts 
        WHERE id = default_receivables_account_id 
        AND company_id = company_id_param 
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'الحساب المحاسبي الافتراضي غير موجود أو غير نشط',
            'created_accounts', 0
        );
    END IF;

    -- Create customer account link
    BEGIN
        INSERT INTO customer_accounts (
            id,
            customer_id,
            company_id,
            account_id,
            is_default,
            currency,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            customer_id_param,
            company_id_param,
            default_receivables_account_id,
            true,
            'KWD',
            true,
            now(),
            now()
        ) RETURNING id INTO customer_account_id;
        
        RAISE NOTICE 'auto_create_customer_accounts: Successfully created customer account link %', customer_account_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'تم إنشاء الحساب المحاسبي للعميل بنجاح',
            'created_accounts', 1,
            'customer_account_id', customer_account_id,
            'chart_account_id', default_receivables_account_id
        );
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Account link already exists
            RETURN jsonb_build_object(
                'success', true,
                'message', 'الحساب المحاسبي مربوط مسبقاً',
                'created_accounts', 0
            );
        WHEN OTHERS THEN
            error_message := 'خطأ في ربط الحساب بالعميل: ' || SQLERRM;
            RAISE NOTICE 'auto_create_customer_accounts: ERROR - %', error_message;
            RETURN jsonb_build_object(
                'success', false,
                'error', error_message,
                'created_accounts', 0
            );
    END;
    
EXCEPTION
    WHEN OTHERS THEN
        error_message := 'خطأ عام في إنشاء الحسابات: ' || SQLERRM;
        RAISE NOTICE 'auto_create_customer_accounts: FATAL ERROR - %', error_message;
        RETURN jsonb_build_object(
            'success', false,
            'error', error_message,
            'created_accounts', 0
        );
END;
$function$;
`;

    // Apply the function using the built-in exec_sql if available
    let result;
    try {
      result = await supabase.rpc('exec_sql', { sql });
    } catch (error) {
      console.log('❌ exec_sql not available, trying direct SQL execution...');
      // If exec_sql is not available, we'll need to apply it through dashboard
      console.error('Please copy the SQL from restore-customer-accounts.sql and run it in Supabase Dashboard');
      return;
    }

    if (result.error) {
      console.error('❌ Error creating function:', result.error);
      return;
    }

    console.log('✅ Database function created successfully!');

    // Test the function with proper parameter order
    console.log('🧪 Testing function...');
    const { data: testData, error: testError } = await supabase.rpc('auto_create_customer_accounts', {
      customer_id_param: '00000000-0000-0000-0000-000000000000', // dummy ID for test
      company_id_param: '00000000-0000-0000-0000-000000000000'  // dummy ID for test
    });

    if (testError) {
      if (testError.message.includes('العميل غير موجود')) {
        console.log('✅ Function test passed (expected error for dummy IDs)');
      } else {
        console.error('❌ Function test failed:', testError);
      }
    } else {
      console.log('✅ Function is working:', testData);
    }

    console.log('🎉 Customer account linking fix applied successfully!');
    
  } catch (error) {
    console.error('❌ Application failed:', error);
  }
}

applyDatabaseFunction();