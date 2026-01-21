import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🔍 Searching for documents with timestamp 1768928362540...\n');

  // Check if there's a documents table with this timestamp
  const tables = ['vehicle_documents', 'documents', 'attachments', 'files'];

  for (const table of tables) {
    try {
      // Try to find records with this timestamp or recent records
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data && data.length > 0) {
        console.log(`\n✅ Table "${table}": ${data.length} records\n`);

        // Look for records with today's date
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = data.filter(r =>
          r.created_at && r.created_at.startsWith(today)
        );

        if (todayRecords.length > 0) {
          console.log(`📅 Today's records:\n`);
          todayRecords.forEach((r, i) => {
            console.log(`  ${i + 1}. ID: ${r.id}`);
            console.log(`     Created: ${r.created_at}`);
            console.log(`     Data:`, JSON.stringify(r, null, 2).substring(0, 300));
            console.log('');
          });
        }

        // Check all records for any file_url or file_path containing the timestamp
        const timestampRecords = data.filter(r =>
          (r.file_url && r.file_url.includes('1768928362540')) ||
          (r.file_path && r.file_path.includes('1768928362540')) ||
          (r.name && r.name.includes('1768928362540'))
        );

        if (timestampRecords.length > 0) {
          console.log(`\n🎯 Records with timestamp 1768928362540:\n`);
          timestampRecords.forEach((r, i) => {
            console.log(`  ${i + 1}.`, JSON.stringify(r, null, 2));
            console.log('');
          });
        }
      }
    } catch (e) {
      // Table doesn't exist or error
    }
  }

  // Also check storage buckets
  console.log('\n📦 Checking storage buckets...\n');
  const buckets = ['documents', 'vehicle-documents', 'uploads'];

  for (const bucket of buckets) {
    try {
      const { data: files } = await supabase.storage
        .from(bucket)
        .list('', 1000);

      if (files && files.length > 0) {
        // Look for files with this timestamp in the name or path
        const matchingFiles = files.filter(f =>
          f.name.includes('1768928362540') ||
          (f.metadata && f.metadata.some((k, v) => k.includes('1768928362540') || v === '1768928362540'))
        );

        if (matchingFiles.length > 0) {
          console.log(`✅ Bucket "${bucket}": Found ${matchingFiles.length} matching files\n`);
          matchingFiles.forEach((f, i) => {
            console.log(`  ${i + 1}. ${f.name}`);
            console.log(`     Size: ${f.metadata?.size || 'N/A'} bytes`);
            console.log(`     Created: ${f.created_at}`);
            console.log('');
          });
        }
      }
    } catch (e) {
      // Bucket doesn't exist
    }
  }
}

main().catch(console.error);
