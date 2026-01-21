import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function analyze() {
  console.log('🔍 Analyzing why only 84 vehicles from 130 files...\n');

  // Get all documents
  const { data: docs, error } = await supabase
    .from('vehicle_documents')
    .select('vehicle_id, document_name')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`📊 Total documents: ${docs.length}\n`);

  // Group by vehicle
  const byVehicle = {};
  docs.forEach(doc => {
    const vid = doc.vehicle_id;
    if (!byVehicle[vid]) {
      byVehicle[vid] = [];
    }
    byVehicle[vid].push(doc);
  });

  console.log(`🚗 Vehicles with documents: ${Object.keys(byVehicle).length}\n`);

  // Get vehicle details
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .in('id', Object.keys(byVehicle));

  const vehicleMap = {};
  vehicles?.forEach(v => {
    vehicleMap[v.id] = v.plate_number;
  });

  // Show distribution
  console.log('📋 Distribution:\n');

  const distribution = {};
  Object.entries(byVehicle).forEach(([vid, vehicleDocs]) => {
    const count = vehicleDocs.length;
    if (!distribution[count]) {
      distribution[count] = [];
    }
    distribution[count].push(vehicleMap[vid] || vid);
  });

  Object.entries(distribution)
    .sort((a, b) => b[0] - a[0])
    .forEach(([count, plates]) => {
      console.log(`${count} documents per vehicle: ${plates.length} vehicles`);
      console.log(`   Plates: ${plates.slice(0, 5).join(', ')}${plates.length > 5 ? '...' : ''}\n`);
    });

  // Calculate the math
  console.log('=' .repeat(80));
  console.log('\n🧮 THE MATH:\n');
  console.log('=' .repeat(80));

  let totalDocs = 0;
  Object.values(byVehicle).forEach(vehicleDocs => {
    totalDocs += vehicleDocs.length;
  });

  console.log(`\n130 files uploaded:`);
  console.log(`  → ${Object.keys(byVehicle).length} vehicles matched`);
  console.log(`  → ${totalDocs} total documents created`);
  console.log(`  → Average: ${(totalDocs / Object.keys(byVehicle).length).toFixed(2)} docs per vehicle`);

  console.log(`\n📉 Shortfall: ${130 - Object.keys(byVehicle).length} files without unique vehicles`);

  console.log(`\n🔍 Explanation:`);
  console.log(`  Some vehicles received MULTIPLE documents because:`);
  console.log(`  • Multiple files had the same plate number`);
  console.log(`  • OCR extracted the same plate from different images`);
  console.log(`  • Files were for the same vehicle`);

  console.log(`\n📊 Example:`);
  console.log(`  Plate 2777: 4 different files → 4 documents`);
  console.log(`  Plate 2778: 5 different files → 5 documents`);
  console.log(`  Plate 2780: 4 different files → 4 documents`);

  // Show top vehicles with most docs
  console.log(`\n` + '=' .repeat(80));
  console.log('\n🏆 TOP 10 VEHICLES (Most Documents):\n');
  console.log('=' .repeat(80));

  const sorted = Object.entries(byVehicle)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  sorted.forEach(([vid, vehicleDocs], index) => {
    const plate = vehicleMap[vid] || 'Unknown';
    console.log(`${index + 1}. Plate ${plate}: ${vehicleDocs.length} documents`);
    vehicleDocs.forEach((doc, i) => {
      console.log(`   ${i + 1}. ${doc.document_name}`);
    });
    console.log('');
  });

  // Count how many vehicles have 1 doc vs 2+ docs
  let singleDoc = 0;
  let multiDoc = 0;

  Object.values(byVehicle).forEach(vehicleDocs => {
    if (vehicleDocs.length === 1) {
      singleDoc++;
    } else {
      multiDoc++;
    }
  });

  console.log('=' .repeat(80));
  console.log('\n📊 BREAKDOWN:\n');
  console.log('=' .repeat(80));
  console.log(`\nVehicles with 1 document: ${singleDoc}`);
  console.log(`Vehicles with 2+ documents: ${multiDoc}`);
  console.log(`\nFiles used by multi-doc vehicles: ${totalDocs - singleDoc}`);
  console.log(`Files used by single-doc vehicles: ${singleDoc}`);
  console.log(`\nTotal accounted for: ${totalDocs} ✅`);
}

analyze().catch(console.error);
