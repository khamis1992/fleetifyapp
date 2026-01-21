import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  // Get count of all vehicles
  const { count: totalCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true });

  console.log(`Total vehicles in database: ${totalCount || 0}`);

  // Get a sample vehicle without company filter
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('\nSample vehicle:');
    const vehicle = data[0];
    Object.keys(vehicle).forEach(key => {
      console.log(`  ${key}: ${vehicle[key]}`);
    });
    console.log('\nCompany ID:', vehicle.company_id);
  }

  // Get unique company IDs
  const { data: companies } = await supabase
    .from('vehicles')
    .select('company_id')
    .not('company_id', 'is', null);

  if (companies) {
    const uniqueCompanies = [...new Set(companies.map(c => c.company_id))];
    console.log('\nUnique company IDs:', uniqueCompanies);
  }
}

main().catch(console.error);
