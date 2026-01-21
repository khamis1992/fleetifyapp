import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function monitor() {
  console.log('🔍 Real-time Upload Monitor\n');
  console.log('Watching vehicle_documents table...\n');

  let previousCount = 0;
  let iteration = 0;

  const interval = setInterval(async () => {
    iteration++;

    try {
      // Get current count
      const { count, error } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Error:', error.message);
        return;
      }

      const currentCount = count || 0;

      // Get latest documents if count changed
      if (currentCount !== previousCount) {
        const newDocs = currentCount - previousCount;

        console.log(`[${new Date().toLocaleTimeString()}] 📊 Total: ${currentCount} (+${newDocs} new)`);

        // Show latest documents
        const { data: latestDocs } = await supabase
          .from('vehicle_documents')
          .select('id, document_name, created_at')
          .order('created_at', { ascending: false })
          .limit(newDocs > 5 ? 5 : newDocs);

        if (latestDocs && latestDocs.length > 0) {
          latestDocs.forEach(doc => {
            console.log(`   • ${doc.document_name}`);
          });
        }

        console.log('');

        previousCount = currentCount;
      }

      // Get vehicle count
      if (iteration % 5 === 0) {
        const { data: docs } = await supabase
          .from('vehicle_documents')
          .select('vehicle_id');

        const uniqueVehicles = new Set(docs?.map(d => d.vehicle_id) || []);
        console.log(`[${new Date().toLocaleTimeString()}] 🚗 Vehicles with docs: ${uniqueVehicles.size}`);
        console.log('');
      }

      // Stop if we have enough data (130 expected)
      if (currentCount >= 130) {
        clearInterval(interval);
        console.log('\n✅ Reached 130+ documents! Stopping monitor.\n');
        await showSummary();
      }

    } catch (error) {
      console.error('Error:', error.message);
    }
  }, 2000); // Check every 2 seconds

  // Stop after 5 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n⏱️ Timeout (5 minutes). Stopping monitor.\n');
    showSummary();
  }, 300000);
}

async function showSummary() {
  console.log('📊 FINAL SUMMARY\n');

  const { count } = await supabase
    .from('vehicle_documents')
    .select('*', { count: 'exact', head: true });

  const { data: docs } = await supabase
    .from('vehicle_documents')
    .select('vehicle_id');

  const uniqueVehicles = new Set(docs?.map(d => d.vehicle_id) || []);

  console.log(`Total Documents: ${count || 0}`);
  console.log(`Vehicles: ${uniqueVehicles.size}`);
  console.log(`Avg per vehicle: ${((count || 0) / uniqueVehicles.size).toFixed(2)}`);
}

monitor().catch(console.error);
