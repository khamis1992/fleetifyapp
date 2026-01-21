import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Analyzing upload results...\n');

  // Check storage bucket first
  console.log('📦 Checking storage bucket...\n');
  const { data: storageFiles, error: storageError } = await supabase.storage
    .from('vehicle-documents')
    .list('24bc0b21-4e2d-4413-9842-31719a3669f4', 1000);

  if (storageError) {
    console.error('❌ Storage error:', storageError.message);
  } else {
    console.log(`✅ Found ${storageFiles?.length || 0} files in storage bucket`);
    if (storageFiles && storageFiles.length > 0) {
      console.log('\nLatest 10 uploads in storage:\n');
      storageFiles.slice(0, 10).forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.name}`);
        console.log(`     Size: ${(file.metadata?.size / 1024).toFixed(2)} KB`);
        console.log(`     Uploaded: ${file.created_at}`);
        console.log('');
      });
    }
  }

  // Check vehicle_documents table with different approaches
  console.log('📄 Checking vehicle_documents table...\n');

  // Try without any filters first to see if table exists
  const { data: allDocs, error: allDocsError } = await supabase
    .from('vehicle_documents')
    .select('*')
    .limit(10);

  if (allDocsError) {
    console.error('❌ Error accessing vehicle_documents:', allDocsError.message);

    // Check if there are any related tables
    console.log('\n🔍 Searching for document-related tables...');
    // Can't do this without admin access
  } else {
    console.log(`✅ Found ${allDocs?.length || 0} records in vehicle_documents`);

    if (allDocs && allDocs.length > 0) {
      console.log('\nSample record:');
      console.log(JSON.stringify(allDocs[0], null, 2));

      // Get total count
      const { count } = await supabase
        .from('vehicle_documents')
        .select('*', { count: 'exact', head: true });

      console.log(`\n📊 Total vehicle documents: ${count || 0}`);
    }
  }

  // Check contract_documents as an alternative
  console.log('\n📄 Checking contract_documents table...\n');
  const { data: contractDocs, error: contractError } = await supabase
    .from('contract_documents')
    .select('*')
    .limit(10);

  if (contractError) {
    console.log('⚠️  No access to contract_documents');
  } else {
    console.log(`✅ Found ${contractDocs?.length || 0} records in contract_documents`);

    if (contractDocs && contractDocs.length > 0) {
      const { count } = await supabase
        .from('contract_documents')
        .select('*', { count: 'exact', head: true });

      console.log(`📊 Total contract documents: ${count || 0}`);
    }
  }

  // Check if there's an attachments or similar table
  console.log('\n🔍 Looking for recent uploads in all possible locations...\n');

  // Check storage for recently uploaded files
  if (storageFiles && storageFiles.length > 0) {
    // Sort by created_at to get latest
    const latestFiles = storageFiles
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    console.log('📊 Latest 20 files in storage (by upload time):\n');
    latestFiles.forEach((file, i) => {
      const metadata = file.metadata || {};
      console.log(`  ${i + 1}. ${file.name}`);
      console.log(`     Size: ${(metadata.size || 0) / 1024} KB`);
      console.log(`     Uploaded: ${file.created_at}`);
      if (metadata.vehicleId) console.log(`     Vehicle ID: ${metadata.vehicleId}`);
      console.log('');
    });

    // Count files uploaded today
    const today = new Date().toISOString().split('T')[0];
    const todayFiles = storageFiles.filter(f => f.created_at.startsWith(today));

    console.log(`\n📅 Files uploaded today: ${todayFiles.length}`);
  }
}

main().catch(console.error);
