import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Checking for vehicle documents with different schemas...\n');

  // Try to get any documents with various possible schemas
  const schemas = [
    'vehicle_documents',
    'vehicleDocuments',
    'documents',
    'attachments',
    'files'
  ];

  for (const table of schemas) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        console.log(`✅ Table "${table}": ${count} records`);

        if (count > 0) {
          const { data: sample } = await supabase
            .from(table)
            .select('*')
            .limit(3);

          console.log('  Sample record:', JSON.stringify(sample?.[0], null, 2));
        }
      }
    } catch (e) {
      // Table doesn't exist, skip
    }
  }

  // Check vehicles table with updated_at to see if any were recently modified
  console.log('\n🚗 Checking recently modified vehicles...\n');
  const { data: recentVehicles } = await supabase
    .from('vehicles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(20);

  if (recentVehicles && recentVehicles.length > 0) {
    console.log(`✅ Found ${recentVehicles.length} vehicles (most recent first)\n`);

    const today = new Date().toISOString().split('T')[0];
    const todayUpdates = recentVehicles.filter(v =>
      v.updated_at && v.updated_at.startsWith(today)
    );

    console.log(`📅 Vehicles updated today (${today}): ${todayUpdates.length}\n`);

    if (todayUpdates.length > 0) {
      console.log('Recently updated vehicles:\n');
      todayUpdates.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.id} - ${v.make} ${v.model} ${v.year}`);
        console.log(`     Updated: ${v.updated_at}`);
        console.log('');
      });
    }
  } else {
    console.log('⚠️  No vehicles found');
  }

  // Check storage buckets
  console.log('\n📦 Checking all storage buckets...\n');

  const buckets = ['documents', 'vehicle-documents', 'uploads', 'files'];

  for (const bucket of buckets) {
    try {
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list('', 100);

      if (!error && files) {
        console.log(`✅ Bucket "${bucket}": ${files.length} files`);

        if (files.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const todayFiles = files.filter(f => f.created_at.startsWith(today));

          console.log(`   Uploaded today: ${todayFiles.length}`);
        }
      }
    } catch (e) {
      // Bucket doesn't exist or no access
    }
  }
}

main().catch(console.error);
