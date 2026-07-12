import { createClient } from '@supabase/supabase-js';
import { requireSupabaseScriptConfig } from './_shared/supabase-env.mjs';

const { url: supabaseUrl, key: supabaseKey } = requireSupabaseScriptConfig({ serviceRole: true });

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
