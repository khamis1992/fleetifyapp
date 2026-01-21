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

async function findDuplicates() {
  console.log('🔍 Searching for duplicates in document tables...\n');

  // 1. Check customer_documents
  console.log('📁 Table: customer_documents');
  const { data: custDocs, error: cdError } = await supabase
    .from('customer_documents')
    .select('id, customer_id, document_type, document_name, file_path, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (cdError) {
    console.error('❌ Error:', cdError.message);
  } else {
    console.log(`   Found ${custDocs?.length || 0} recent documents.`);
    const groups = {};
    custDocs?.forEach(doc => {
      const key = `${doc.customer_id}-${doc.document_type}-${doc.file_path}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });

    Object.entries(groups).forEach(([key, docs]) => {
      if (docs.length > 1) {
        console.log(`   ⚠️ Found ${docs.length} duplicates for key: ${key}`);
        docs.forEach((d) => console.log(`      - ID: ${d.id}, Created: ${d.created_at}`));
      }
    });
  }

  // 2. Check vehicle_documents
  console.log('\n📁 Table: vehicle_documents');
  const { data: vehDocs, error: vdError } = await supabase
    .from('vehicle_documents')
    .select('id, vehicle_id, document_type, document_name, document_url, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (vdError) {
    console.error('❌ Error:', vdError.message);
  } else {
    console.log(`   Found ${vehDocs?.length || 0} recent documents.`);
    const groups = {};
    vehDocs?.forEach(doc => {
      const key = `${doc.vehicle_id}-${doc.document_type}-${doc.document_url}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });

    Object.entries(groups).forEach(([key, docs]) => {
      if (docs.length > 1) {
        console.log(`   ⚠️ Found ${docs.length} duplicates for key: ${key}`);
        docs.forEach((d) => console.log(`      - ID: ${d.id}, Created: ${d.created_at}`));
      }
    });
  }

  // 3. Check contract_documents
  console.log('\n📁 Table: contract_documents');
  const { data: contractDocs, error: condError } = await supabase
    .from('contract_documents')
    .select('id, contract_id, document_type, document_name, file_path, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (condError) {
    console.error('❌ Error:', condError.message);
  } else {
    console.log(`   Found ${contractDocs?.length || 0} recent documents.`);
    const groups = {};
    contractDocs?.forEach(doc => {
      const key = `${doc.contract_id}-${doc.document_type}-${doc.file_path}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    });

    Object.entries(groups).forEach(([key, docs]) => {
      if (docs.length > 1) {
        console.log(`   ⚠️ Found ${docs.length} duplicates for key: ${key}`);
        docs.forEach((d) => console.log(`      - ID: ${d.id}, Created: ${d.created_at}`));
      }
    });
  }
}

findDuplicates();
