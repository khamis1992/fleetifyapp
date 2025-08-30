import { createClient } from '@supabase/supabase-js';

// Use the environment variables directly
const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test if companies table exists
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, customer_account_settings')
      .limit(1);

    if (companiesError) {
      console.error('❌ Companies table error:', companiesError);
      return;
    }

    console.log('✅ Companies table exists, found:', companies?.length || 0, 'companies');
    
    if (companies?.length > 0) {
      const company = companies[0];
      console.log('📊 Company settings:', company.customer_account_settings);
      
      // Test if we can update the company settings
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          customer_account_settings: {
            ...company.customer_account_settings,
            auto_create_account: true,
            enable_account_selection: true,
            account_prefix: 'CUST-',
            account_naming_pattern: 'customer_name',
            account_group_by: 'customer_type'
          }
        })
        .eq('id', company.id);

      if (updateError) {
        console.error('❌ Error updating company:', updateError);
      } else {
        console.log('✅ Successfully updated company settings!');
      }
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

testDatabase();