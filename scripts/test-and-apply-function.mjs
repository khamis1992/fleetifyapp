import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { requireSupabaseScriptConfig } from './_shared/supabase-env.mjs';

const { url: supabaseUrl, key: supabaseKey } = requireSupabaseScriptConfig({ serviceRole: true });

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyCustomerStatementFunction() {
  console.log('🔄 Applying Customer Account Statement Function using direct approach...');
  
  try {
    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/20250831000000_create_customer_account_statement_function.sql', 'utf8');
    
    console.log('📄 Migration SQL loaded successfully');
    
    // Extract just the function definition parts and apply them step by step
    
    // Step 1: Drop existing function if it exists
    console.log('🗑️ Dropping existing function if it exists...');
    try {
      const { error: dropError } = await supabase.rpc('pg_exec', { 
        sql: `DROP FUNCTION IF EXISTS get_customer_account_statement_by_code(UUID, TEXT, DATE, DATE);`
      });
      
      if (!dropError) {
        console.log('✅ Function dropped successfully');
      } else {
        console.log('ℹ️ Function may not have existed:', dropError.message);
      }
    } catch (e) {
      console.log('ℹ️ Drop command not supported, continuing...');
    }

    // Test the function with a simple call to see if it already works
    console.log('🧪 Testing if function already exists and works...');
    
    const { data: testResult, error: testError } = await supabase.rpc('get_customer_account_statement_by_code', {
      p_company_id: '00000000-0000-0000-0000-000000000000',
      p_customer_code: 'TEST123',
      p_date_from: null,
      p_date_to: null
    });

    if (testError) {
      if (testError.message.includes('Customer with code')) {
        console.log('✅ Function already exists and works correctly!');
        console.log('🎉 Customer Account Statement system is ready!');
        return;
      } else if (testError.message.includes('function') && testError.message.includes('does not exist')) {
        console.log('❌ Function does not exist, needs to be created via Supabase Dashboard');
      } else {
        console.log('❌ Function test failed with unexpected error:', testError.message);
      }
    } else {
      console.log('✅ Function exists and returned data successfully!');
      console.log('🎉 Customer Account Statement system is ready!');
      return;
    }

    // If we get here, the function doesn't exist and we need to create it
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('Since we cannot create the function programmatically, please follow these steps:');
    console.log('\n1. Go to your Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/qwhunliohlkkahbspfiu');
    console.log('\n2. Navigate to SQL Editor');
    console.log('\n3. Copy and paste the SQL from this file:');
    console.log('   supabase/migrations/20250831000000_create_customer_account_statement_function.sql');
    console.log('\n4. Execute the SQL in the Supabase SQL Editor');
    console.log('\n5. The function will be created and ready to use');
    
    console.log('\n📄 SQL to execute in Supabase Dashboard:');
    console.log('=====================================');
    console.log(migrationSQL);
    console.log('=====================================');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the function
applyCustomerStatementFunction();
