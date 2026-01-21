#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllDocs() {
  console.log('🔍 Fetching ALL rows from document tables (no filters)...\n');

  const tables = ['customer_documents', 'vehicle_documents', 'contract_documents'];

  for (const table of tables) {
    console.log(`📁 Table: ${table}`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(10);

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success! Found ${data?.length || 0} rows.`);
      data?.forEach(row => {
        console.log(`      - ID: ${row.id}, Name: ${row.document_name || row.file_path}`);
      });
    }
    console.log('');
  }
}

checkAllDocs();
