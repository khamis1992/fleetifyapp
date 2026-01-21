import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Checking vehicle_documents table schema...\n');

  // Get sample records to understand structure
  const { data, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);

    // Try to get count
    const { count } = await supabase
      .from('vehicle_documents')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total records: ${count || 0}`);
    return;
  }

  console.log(`✅ Found ${data.length} records\n`);

  if (data.length > 0) {
    console.log('Sample record structure:');
    const keys = Object.keys(data[0]);
    keys.forEach(key => {
      console.log(`  - ${key}: ${data[0][key]}`);
    });
  }
}

main().catch(console.error);
