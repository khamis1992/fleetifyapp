import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate vehicle documents...\n');

  // Get all documents
  const { data: docs, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching documents:', error.message);
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
  const vehicleIds = Object.keys(byVehicle);
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number, make, model')
    .in('id', vehicleIds);

  const vehicleMap = {};
  vehicles?.forEach(v => {
    vehicleMap[v.id] = v;
  });

  // Identify duplicates
  console.log('🔍 Identifying duplicates...\n');

  const toKeep = [];
  const toDelete = [];

  Object.entries(byVehicle).forEach(([vehicleId, vehicleDocs]) => {
    const vehicle = vehicleMap[vehicleId];
    const plate = vehicle?.plate_number || 'Unknown';
    const makeModel = vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown';

    if (vehicleDocs.length > 1) {
      // Sort by created_at (newest first)
      const sorted = vehicleDocs.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Keep the newest, delete the rest
      const newest = sorted[0];
      const duplicates = sorted.slice(1);

      toKeep.push(newest);
      toDelete.push(...duplicates);

      console.log(`📄 Plate ${plate} (${makeModel}):`);
      console.log(`   ✅ KEEP: ${newest.document_name} (${newest.created_at})`);
      duplicates.forEach(d => {
        console.log(`   ❌ DELETE: ${d.document_name} (${d.created_at})`);
      });
      console.log('');
    } else {
      // Only one document, keep it
      toKeep.push(vehicleDocs[0]);
    }
  });

  console.log('=' .repeat(80));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Total documents: ${docs.length}`);
  console.log(`   Documents to keep: ${toKeep.length}`);
  console.log(`   Documents to delete: ${toDelete.length}\n`);

  if (toDelete.length === 0) {
    console.log('✅ No duplicates found! All vehicles have only 1 document.\n');
    return;
  }

  // Confirm before deletion
  console.log('⚠️  WARNING: This will permanently delete files and database records!\n');
  console.log('Files to be deleted from storage:');

  for (const doc of toDelete.slice(0, 10)) {
    console.log(`   • ${doc.document_url}`);
  }
  if (toDelete.length > 10) {
    console.log(`   ... and ${toDelete.length - 10} more`);
  }

  console.log('\n');

  // Proceed with deletion
  console.log('🗑️  Deleting duplicate records...\n');

  let deletedCount = 0;
  let storageErrors = 0;
  let dbErrors = 0;

  for (const doc of toDelete) {
    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.document_url]);

      if (storageError) {
        console.log(`⚠️  Storage error for ${doc.document_name}: ${storageError.message}`);
        storageErrors++;
        // Continue to delete DB record even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('vehicle_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) {
        console.log(`❌ DB error for ${doc.document_name}: ${dbError.message}`);
        dbErrors++;
      } else {
        deletedCount++;
        console.log(`✅ Deleted: ${doc.document_name}`);
      }
    } catch (error) {
      console.log(`❌ Error processing ${doc.document_name}: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log('\n✅ CLEANUP COMPLETE!\n');
  console.log('=' .repeat(80));

  console.log(`\n📊 Results:\n`);
  console.log(`   Deleted: ${deletedCount} records`);
  console.log(`   Storage errors: ${storageErrors}`);
  console.log(`   Database errors: ${dbErrors}\n`);

  // Verify final state
  const { count: finalCount } = await supabase
    .from('vehicle_documents')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Final document count: ${finalCount || 0}`);
  console.log(`   Expected: ${toKeep.length}`);
  console.log(`   Match: ${finalCount === toKeep.length ? '✅' : '❌'}\n`);

  // Show remaining documents per vehicle
  const { data: finalDocs } = await supabase
    .from('vehicle_documents')
    .select('vehicle_id');

  if (finalDocs) {
    const uniqueVehicles = new Set(finalDocs.map(d => d.vehicle_id));
    console.log(`🚗 Vehicles with documents: ${uniqueVehicles.size}\n`);
  }
}

cleanDuplicates().catch(console.error);
