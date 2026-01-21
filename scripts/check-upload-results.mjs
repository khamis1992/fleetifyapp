import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Checking vehicle documents upload results...\n');

  // Get all vehicle documents
  const { data: documents, error } = await supabase
    .from('vehicle_documents')
    .select('*')
    .eq('company_id', '24bc0b21-4e2d-4413-9842-31719a3669f4')
    .order('uploaded_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('❌ Error fetching documents:', error);
    return;
  }

  const totalDocs = documents?.length || 0;
  console.log(`📊 Total documents found: ${totalDocs}\n`);

  if (totalDocs === 0) {
    console.log('⚠️  No documents found in vehicle_documents table');
    return;
  }

  // Get unique vehicles with documents
  const uniqueVehicles = [...new Set(documents.map(d => d.vehicle_id))];
  console.log(`🚗 Vehicles with documents: ${uniqueVehicles.length}\n`);

  // Show last 20 uploads
  console.log('📄 Latest uploads (last 20):\n');
  documents.slice(0, 20).forEach((doc, index) => {
    console.log(`  ${index + 1}. ${doc.file_name}`);
    console.log(`     Vehicle ID: ${doc.vehicle_id}`);
    console.log(`     Type: ${doc.document_type}`);
    console.log(`     Uploaded: ${new Date(doc.uploaded_at).toLocaleString('en-US')}`);
    console.log(`     URL: ${doc.file_url}`);
    console.log('');
  });

  // Check storage bucket
  const { data: storageFiles } = await supabase.storage
    .from('vehicle-documents')
    .list(`${process.env.COMPANY_ID || '24bc0b21-4e2d-4413-9842-31719a3669f4'}`, 100);

  if (storageFiles) {
    console.log(`\n📦 Storage bucket files: ${storageFiles.length}\n`);
  }
}

main().catch(console.error);
