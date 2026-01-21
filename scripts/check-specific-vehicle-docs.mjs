import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const vehicleId = '74aa9e56-ec51-4d87-9e92-866b97ec6b9e';

  console.log(`🔍 Checking documents for vehicle: ${vehicleId}\n`);

  // Check vehicle_documents table
  const { data: docs, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('vehicle_id', vehicleId);

  if (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTrying raw SQL query...\n');

    // Try raw SQL
    const { data: sqlData, error: sqlError } = await supabase.rpc('execute_sql', {
      sql: `SELECT * FROM vehicle_documents WHERE vehicle_id = '${vehicleId}'`
    });

    if (sqlError) {
      console.error('❌ SQL Error:', sqlError.message);
    } else {
      console.log('✅ SQL Result:', sqlData);
    }
    return;
  }

  console.log(`✅ Found ${docs?.length || 0} documents\n`);

  if (docs && docs.length > 0) {
    docs.forEach((doc, i) => {
      console.log(`  ${i + 1}. Document ID: ${doc.id}`);
      console.log(`     Type: ${doc.document_type}`);
      console.log(`     File name: ${doc.file_name}`);
      console.log(`     File URL: ${doc.file_url}`);
      console.log(`     Created: ${doc.created_at}`);
      console.log('');
    });
  }

  // Check vehicles table to get vehicle info
  console.log('\n🚗 Vehicle info:\n');
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .single();

  if (vehicle) {
    console.log('Vehicle found:', JSON.stringify(vehicle, null, 2));
  } else {
    console.log('Vehicle not found');
  }
}

main().catch(console.error);
