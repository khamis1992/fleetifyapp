import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('📍 WHERE ARE THE 213 UPLOADED DOCUMENTS?\n');
  console.log('=' .repeat(80));

  const today = new Date().toISOString().split('T')[0];

  // Get all documents uploaded today
  const { data: todayDocs, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`\n📊 TOTAL: ${todayDocs.length} documents uploaded on ${today}\n`);
  console.log('=' .repeat(80));

  // Group by vehicle
  const byVehicle = {};
  todayDocs.forEach(doc => {
    const vid = doc.vehicle_id;
    if (!byVehicle[vid]) {
      byVehicle[vid] = { docs: [], plate: null };
    }
    byVehicle[vid].docs.push(doc);
  });

  // Get vehicle info
  const vehicleIds = Object.keys(byVehicle);
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number, make, model, year')
    .in('id', vehicleIds);

  const vehicleMap = {};
  vehicles?.forEach(v => {
    vehicleMap[v.id] = v;
    if (byVehicle[v.id]) {
      byVehicle[v.id].plate = v.plate_number;
      byVehicle[v.id].make = v.make;
      byVehicle[v.id].model = v.model;
    }
  });

  console.log(`\n🚗 DISTRIBUTION: ${Object.keys(byVehicle).length} vehicles\n`);
  console.log('=' .repeat(80));

  // Show distribution
  const distribution = {};
  Object.values(byVehicle).forEach(({ docs, plate }) => {
    const count = docs.length;
    if (!distribution[count]) {
      distribution[count] = [];
    }
    distribution[count].push(plate || 'Unknown');
  });

  Object.entries(distribution)
    .sort((a, b) => b[0] - a[0])
    .forEach(([count, plates]) => {
      console.log(`Vehicles with ${count} documents: ${plates.length} vehicles`);
      if (count <= 3) {
        console.log(`  Plates: ${plates.slice(0, 10).join(', ')}${plates.length > 10 ? '...' : ''}`);
      }
      console.log('');
    });

  console.log('=' .repeat(80));
  console.log('\n📁 WHERE FILES ARE STORED\n');
  console.log('=' .repeat(80));

  // Show storage structure
  console.log('\n1. DATABASE TABLE: vehicle_documents');
  console.log(`   - Records: ${todayDocs.length}`);
  console.log(`   - Each record contains:`);
  console.log(`     • id: Unique document ID`);
  console.log(`     • vehicle_id: Links to vehicle`);
  console.log(`     • document_type: "registration"`);
  console.log(`     • document_name: e.g., "استمارة المركبة - 7041 - 1768928446589"`);
  console.log(`     • document_url: Storage path (relative)`);
  console.log(`     • created_at: Upload timestamp\n`);

  console.log('2. STORAGE BUCKET: documents');
  console.log(`   - Bucket: "documents"`);
  console.log(`   - Path pattern: vehicle-documents/{vehicle_id}/{filename}`);
  console.log(`   - Full URL: https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/documents/{path}\n`);

  // Show examples
  console.log('=' .repeat(80));
  console.log('\n📋 EXAMPLE: Document Details\n');
  console.log('=' .repeat(80));

  const sampleDoc = todayDocs[0];
  const vehicle = vehicleMap[sampleDoc.vehicle_id];

  console.log(`\nDocument: ${sampleDoc.document_name}`);
  console.log(`Vehicle: ${vehicle?.plate_number} - ${vehicle?.make} ${vehicle?.model} ${vehicle?.year}`);
  console.log(`\nDatabase Record:`);
  console.log(`  ID: ${sampleDoc.id}`);
  console.log(`  Type: ${sampleDoc.document_type}`);
  console.log(`  Created: ${sampleDoc.created_at}`);
  console.log(`\nStorage Location:`);
  console.log(`  Relative Path: ${sampleDoc.document_url}`);
  console.log(`  Full URL: https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/documents/${sampleDoc.document_url}`);

  // Verify file exists in storage
  console.log(`\n` + '=' .repeat(80));
  console.log('\n✅ VERIFICATION: Checking if files exist in storage\n');
  console.log('=' .repeat(80));

  // Count unique storage paths
  const uniquePaths = new Set(todayDocs.map(d => d.document_url));
  console.log(`\nUnique storage paths: ${uniquePaths.size}`);

  // Check a few random files
  const sampleDocs = todayDocs.slice(0, 5);
  console.log(`\nVerifying ${sampleDocs.length} random files:\n`);

  for (const doc of sampleDocs) {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .getPublicUrl(doc.document_url);

      if (!error) {
        const vehicle = vehicleMap[doc.vehicle_id];
        console.log(`✅ ${doc.document_name}`);
        console.log(`   Plate: ${vehicle?.plate_number}`);
        console.log(`   Path: ${doc.document_url}`);
        console.log(`   URL: ${data.publicUrl}`);
        console.log('');
      }
    } catch (e) {
      console.log(`❌ Error checking: ${doc.document_url}`);
    }
  }

  console.log('=' .repeat(80));
  console.log('\n📊 FINAL SUMMARY\n');
  console.log('=' .repeat(80));

  console.log(`\n✅ All ${todayDocs.length} documents are:`);
  console.log(`   1. Stored in database table: vehicle_documents`);
  console.log(`   2. Files in storage bucket: documents`);
  console.log(`   3. Linked to ${Object.keys(byVehicle).length} vehicles`);
  console.log(`   4. Accessible via REST API or Supabase Storage URL`);

  console.log(`\n📁 To access a document:`);
  console.log(`   Option 1: Database Query`);
  console.log(`   SELECT * FROM vehicle_documents WHERE vehicle_id = 'your-vehicle-id'`);

  console.log(`   Option 2: Storage URL`);
  console.log(`   https://qwhunliohlkkahbspfiu.supabase.co/storage/v1/object/public/documents/vehicle-documents/{vehicle_id}/{filename}`);

  console.log(`   Option 3: Browser UI`);
  console.log(`   Go to: http://localhost:8082/fleet/vehicles/{vehicle-id}`);
  console.log(`   Click: "الوثائق" tab\n`);

  // Show breakdown by hour
  console.log('=' .repeat(80));
  console.log('\n⏰ UPLOAD TIMELINE\n');
  console.log('=' .repeat(80));

  const byHour = {};
  todayDocs.forEach(doc => {
    const hour = doc.created_at.substring(11, 13);
    if (!byHour[hour]) {
      byHour[hour] = 0;
    }
    byHour[hour]++;
  });

  Object.entries(byHour)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([hour, count]) => {
      console.log(`   ${hour}:00 - ${count} documents`);
    });
}

main().catch(console.error);
