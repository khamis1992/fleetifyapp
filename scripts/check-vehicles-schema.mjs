import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  // Get a sample vehicle to see the structure
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4')
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Sample vehicle structure:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No vehicles found');
  }
}

main().catch(console.error);
