import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n');

  try {
    // Check customers table structure
    console.log('📋 Customers Table:');
    const { data: customerTest, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);
    
    if (customerError) {
      console.error('❌ Customer table error:', customerError.message);
    } else if (customerTest && customerTest.length > 0) {
      console.log('✅ Customers columns:', Object.keys(customerTest[0]).join(', '));
    } else {
      console.log('⚠️ No customer records found');
    }

    // Check contracts table structure
    console.log('\n📋 Contracts Table:');
    const { data: contractTest, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .limit(1);
    
    if (contractError) {
      console.error('❌ Contract table error:', contractError.message);
    } else if (contractTest && contractTest.length > 0) {
      console.log('✅ Contracts columns:', Object.keys(contractTest[0]).join(', '));
    } else {
      console.log('⚠️ No contract records found');
    }

    // Try to create a test customer (dry run - will rollback)
    console.log('\n🧪 Testing Customer Creation (DRY RUN):');
    const testCustomer = {
      first_name: 'TEST',
      last_name: 'USER',
      customer_type: 'individual',
      phone: '123456789',
      company_id: '00000000-0000-0000-0000-000000000000', // Fake ID
      is_active: true
    };
    
    console.log('Attempting to insert:', JSON.stringify(testCustomer, null, 2));

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkSchema();
