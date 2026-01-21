import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Checking documents bucket (correct location)...\n');

  // List all files in the documents bucket
  const { data: files, error } = await supabase.storage
    .from('documents')
    .list('', 1000);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`✅ Found ${files?.length || 0} files in 'documents' bucket\n`);

  if (files && files.length > 0) {
    // Group by vehicle ID
    const byVehicle = {};
    files.forEach(file => {
      const pathParts = file.name.split('/');
      if (pathParts[0] === 'vehicle-documents' && pathParts[1]) {
        const vehicleId = pathParts[1];
        if (!byVehicle[vehicleId]) {
          byVehicle[vehicleId] = [];
        }
        byVehicle[vehicleId].push(file);
      }
    });

    console.log(`📊 Files grouped by vehicle: ${Object.keys(byVehicle).length} vehicles\n`);

    // Show latest 20 files
    const latestFiles = files
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    console.log('📄 Latest 20 uploads:\n');
    latestFiles.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file.name}`);
      console.log(`     Size: ${(file.metadata?.size || file.metadata?.size || 0) / 1024} KB`);
      console.log(`     Uploaded: ${file.created_at}`);
      console.log('');
    });

    // Get recent files uploaded today
    const today = new Date().toISOString().split('T')[0];
    const todayFiles = files.filter(f => f.created_at.startsWith(today));

    console.log(`📅 Files uploaded today (${today}): ${todayFiles.length}`);

    // Show vehicles with document counts
    if (Object.keys(byVehicle).length > 0) {
      console.log('\n🚗 Vehicles with documents:\n');
      Object.entries(byVehicle).forEach(([vehicleId, vehicleFiles]) => {
        console.log(`  Vehicle ${vehicleId}: ${vehicleFiles.length} documents`);
      });
    }

    // Check if vehicle_documents table has records
    console.log('\n📊 Checking vehicle_documents table...\n');
    const { data: docs, error: docsError } = await supabase
      .from('vehicle_documents')
      .select('*')
      .limit(10);

    if (docsError) {
      console.log('⚠️  vehicle_documents table not accessible:', docsError.message);
    } else {
      console.log(`✅ Found ${docs?.length || 0} records in vehicle_documents`);

      const { count } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true });

      console.log(`Total records: ${count || 0}`);
    }
  }
}

main().catch(console.error);
