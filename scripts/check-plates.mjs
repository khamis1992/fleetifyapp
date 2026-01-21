import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('vehicles')
    .select('license_plate')
    .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4')
    .order('license_plate')
    .limit(30);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample license plates in database:');
  data.forEach((v, i) => console.log(`  ${i + 1}. ${v.license_plate}`));

  // Get count
  const { count } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4');

  console.log(`\nTotal vehicles: ${count}`);
}

main().catch(console.error);
