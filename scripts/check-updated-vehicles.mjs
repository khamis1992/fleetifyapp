import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkUpdatedVehicles() {
  console.log('🔍 Checking which vehicles had data updated...\n');

  // Get all documents uploaded today
  const today = new Date().toISOString().split('T')[0];
  const { data: docs } = await supabase
    .from('vehicle_documents')
    .select('vehicle_id, created_at')
    .gte('created_at', today);

  if (!docs) return;

  const vehicleIds = [...new Set(docs.map(d => d.vehicle_id))];

  console.log(`📊 ${vehicleIds.length} vehicles received documents today\n`);

  // Check which vehicles were updated around the same time as their documents
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number, make, model, updated_at')
    .in('id', vehicleIds);

  if (!vehicles) return;

  console.log('🚗 Vehicles Updated Today:\n');

  let updatedCount = 0;

  vehicles.forEach(vehicle => {
    const vehicleDocs = docs.filter(d => d.vehicle_id === vehicle.id);
    const latestDoc = vehicleDocs.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    const docTime = new Date(latestDoc.created_at).getTime();
    const updateTime = new Date(vehicle.updated_at).getTime();
    const diffMs = Math.abs(updateTime - docTime);
    const diffSeconds = (diffMs / 1000).toFixed(1);

    // If updated within 1 minute of document upload, it was likely auto-updated
    const wasAutoUpdated = diffSeconds < 60;

    if (wasAutoUpdated) {
      updatedCount++;
      console.log(`✅ Plate ${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}`);
      console.log(`   Document: ${latestDoc.created_at}`);
      console.log(`   Updated: ${vehicle.updated_at}`);
      console.log(`   Delay: ${diffSeconds}s`);
      console.log('');
    }
  });

  console.log('=' .repeat(80));
  console.log(`\n📊 SUMMARY:\n`);
  console.log(`   Vehicles with documents: ${vehicleIds.length}`);
  console.log(`   Vehicles auto-updated: ${updatedCount}`);
  console.log(`   Update rate: ${((updatedCount / vehicleIds.length) * 100).toFixed(1)}%\n`);
}

checkUpdatedVehicles().catch(console.error);
