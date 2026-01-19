import { createClient } from '@supabase/supabase-js';

// Use the environment variables directly
const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0MTMwODYsImV4cCI6MjA2ODk4OTA4Nn0.x5o6IpzWcYo7a6jRq2J8V0hKyNeRKZCEQIuXTPADQqs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickFix() {
  console.log('🔄 Applying quick fix for customer account settings...');
  
  try {
    // Update all companies to enable auto_create_account
    const { data: companies, error: fetchError } = await supabase
      .from('companies')
      .select('id, customer_account_settings');

    if (fetchError) {
      console.error('❌ Error fetching companies:', fetchError);
      return;
    }

    console.log(`📊 Found ${companies?.length || 0} companies to update`);

    for (const company of companies || []) {
      const existingSettings = company.customer_account_settings || {};
      const updatedSettings = {
        ...existingSettings,
        auto_create_account: true,
        enable_account_selection: true,
        account_prefix: 'CUST-',
        account_naming_pattern: 'customer_name',
        account_group_by: 'customer_type'
      };

      const { error: updateError } = await supabase
        .from('companies')
        .update({ customer_account_settings: updatedSettings })
        .eq('id', company.id);

      if (updateError) {
        console.error(`❌ Error updating company ${company.id}:`, updateError);
      } else {
        console.log(`✅ Updated company ${company.id}`);
      }
    }

    console.log('🎉 Quick fix completed! All companies now have auto_create_account enabled.');
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
  }
}

quickFix();