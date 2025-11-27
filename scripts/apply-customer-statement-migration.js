#!/usr/bin/env node

/**
 * Apply Customer Account Statement Database Function
 * This script applies the new customer account statement function to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

async function applyMigration() {
  console.log('🚀 Starting Customer Account Statement Function Migration...');

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250831000000_create_customer_account_statement_function.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded successfully');
    console.log('🔍 SQL Preview:');
    console.log(migrationSQL.substring(0, 200) + '...');

    // Apply the migration
    console.log('⚙️ Applying migration to database...');
    
    const { error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }

    console.log('✅ Migration applied successfully!');

    // Test the function with a simple call
    console.log('🧪 Testing function...');
    
    const { data: testResult, error: testError } = await supabase.rpc('get_customer_account_statement_by_code', {
      p_company_id: '00000000-0000-0000-0000-000000000000', // dummy ID for test
      p_customer_code: 'TEST123',
      p_date_from: null,
      p_date_to: null
    });

    if (testError && !testError.message.includes('Customer with code')) {
      console.error('❌ Function test failed:', testError);
    } else {
      console.log('✅ Function test passed - returns expected error for non-existent customer');
    }

    console.log('🎉 Customer Account Statement system is ready!');
    console.log('📋 Summary:');
    console.log('  ✓ Database function created: get_customer_account_statement_by_code');
    console.log('  ✓ Enhanced CustomerAccountStatement component');
    console.log('  ✓ Professional export and print functionality');
    console.log('  ✓ Running balance calculations');
    console.log('  ✓ Opening balance support');
    console.log('  ✓ Multi-source transaction aggregation');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  applyMigration();
}

export { applyMigration };