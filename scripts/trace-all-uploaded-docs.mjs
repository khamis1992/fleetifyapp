import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Tracing all 213 uploaded documents...\n');

  const today = new Date().toISOString().split('T')[0];

  // Get ALL documents uploaded today
  const { data: todayDocs, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Found ${todayDocs.length} documents uploaded today (${today})\n`);

  // Show all columns for first document to understand schema
  if (todayDocs.length > 0) {
    console.log('📋 Document Schema (first record):\n');
    console.log(JSON.stringify(todayDocs[0], null, 2));
    console.log('\n');

    // Group by vehicle and show details
    const byVehicle = {};
    todayDocs.forEach(doc => {
      const vid = doc.vehicle_id;
      if (!byVehicle[vid]) {
        byVehicle[vid] = [];
      }
      byVehicle[vid].push(doc);
    });

    console.log(`📁 Documents grouped by ${Object.keys(byVehicle).length} vehicles\n`);

    // Get vehicle details
    const vehicleIds = Object.keys(byVehicle);
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, plate_number, make, model, year')
      .in('id', vehicleIds);

    const vehicleMap = {};
    vehicles?.forEach(v => {
      vehicleMap[v.id] = v;
    });

    // Show breakdown
    console.log('🚗 Detailed Breakdown:\n');

    let totalDocs = 0;
    Object.entries(byVehicle).forEach(([vehicleId, docs], index) => {
      const vehicle = vehicleMap[vehicleId];
      const plate = vehicle?.plate_number || 'Unknown';
      const makeModel = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown';

      console.log(`${index + 1}. Plate ${plate} - ${makeModel} (${docs.length} docs)`);
      console.log(`   Vehicle ID: ${vehicleId}`);

      docs.forEach((doc, i) => {
        console.log(`   ${i + 1}. ID: ${doc.id}`);
        console.log(`      Type: ${doc.document_type}`);
        console.log(`      Created: ${doc.created_at}`);

        // Show file info
        if (doc.file_name) {
          console.log(`      File Name: ${doc.file_name}`);
        }
        if (doc.file_url) {
          console.log(`      URL: ${doc.file_url}`);
        }
        if (doc.file_path) {
          console.log(`      Path: ${doc.file_path}`);
        }
        if (doc.storage_path) {
          console.log(`      Storage: ${doc.storage_path}`);
        }
      });
      console.log('');
      totalDocs += docs.length;
    });

    console.log(`\n📊 Summary:\n`);
    console.log(`   Total Documents Today: ${totalDocs}`);
    console.log(`   Vehicles: ${Object.keys(byVehicle).length}`);
    console.log(`   Avg per vehicle: ${(totalDocs / Object.keys(byVehicle).length).toFixed(2)}`);
  }

  // Check storage for actual files
  console.log('\n📦 Checking Storage Bucket...\n');

  const { data: storageFiles, error: storageError } = await supabase.storage
    .from('documents')
    .list('', { limit: 1000 });

  if (!storageError && storageFiles) {
    console.log(`✅ Storage bucket has ${storageFiles.length} items\n`);

    // Count vehicle folders
    const vehicleFolders = storageFiles.filter(f =>
      f.name.includes('vehicle-documents') || !f.name.includes('.')
    );

    console.log(`📁 Vehicle folders found: ${vehicleFolders.length}\n`);

    // List some files
    const files = storageFiles.filter(f => f.name.includes('.'));
    console.log(`📄 Actual files: ${files.length}\n`);

    if (files.length > 0) {
      console.log('Sample files (first 10):\n');
      files.slice(0, 10).forEach((f, i) => {
        console.log(`${i + 1}. ${f.name}`);
        console.log(`   Size: ${(f.metadata?.size || 0) / 1024} KB`);
        console.log(`   Created: ${f.created_at}`);
        console.log('');
      });
    }
  }
}

main().catch(console.error);
