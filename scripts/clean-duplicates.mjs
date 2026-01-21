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

async function cleanDuplicates() {
  console.log('🧹 Cleaning duplicate documents from database...\n');

  // 1. Clean customer_documents
  console.log('📁 Table: customer_documents');
  const { data: custDocs, error: cdError } = await supabase
    .from('customer_documents')
    .select('id, customer_id, document_type, document_name, created_at')
    .order('created_at', { ascending: true });

  if (cdError) {
    console.error('❌ Error:', cdError.message);
  } else {
    const unique = new Map();
    const toDelete = [];

    custDocs?.forEach(doc => {
      const key = `${doc.customer_id}-${doc.document_type}-${doc.document_name}`;
      if (unique.has(key)) {
        toDelete.push(doc.id);
      } else {
        unique.set(key, doc.id);
      }
    });

    if (toDelete.length > 0) {
      console.log(`   🗑️ Deleting ${toDelete.length} duplicates...`);
      const { error: delError } = await supabase
        .from('customer_documents')
        .delete()
        .in('id', toDelete);
      
      if (delError) console.error('   ❌ Delete error:', delError.message);
      else console.log('   ✅ Cleaned customer_documents');
    } else {
      console.log('   ✅ No duplicates found in customer_documents');
    }
  }

  // 2. Clean vehicle_documents
  console.log('\n📁 Table: vehicle_documents');
  const { data: vehDocs, error: vdError } = await supabase
    .from('vehicle_documents')
    .select('id, vehicle_id, document_type, document_name, created_at')
    .order('created_at', { ascending: true });

  if (vdError) {
    console.error('❌ Error:', vdError.message);
  } else {
    const unique = new Map();
    const toDelete = [];

    vehDocs?.forEach(doc => {
      const key = `${doc.vehicle_id}-${doc.document_type}-${doc.document_name}`;
      if (unique.has(key)) {
        toDelete.push(doc.id);
      } else {
        unique.set(key, doc.id);
      }
    });

    if (toDelete.length > 0) {
      console.log(`   🗑️ Deleting ${toDelete.length} duplicates...`);
      const { error: delError } = await supabase
        .from('vehicle_documents')
        .delete()
        .in('id', toDelete);
      
      if (delError) console.error('   ❌ Delete error:', delError.message);
      else console.log('   ✅ Cleaned vehicle_documents');
    } else {
      console.log('   ✅ No duplicates found in vehicle_documents');
    }
  }
}

cleanDuplicates();
