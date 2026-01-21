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

async function finalCheck() {
  console.log('🔍 Final attempt to find ANY data in the database...');

  // Try to find ANY company
  const { data: companies, error: compError } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1);

  if (compError) {
    console.error('❌ Error fetching companies:', compError.message);
  } else {
    console.log(`   Companies found: ${companies?.length || 0}`);
    if (companies?.length > 0) {
      console.log(`   Sample Company ID: ${companies[0].id}`);
      
      // If company found, try to find documents for THIS company specifically
      const { count, error: docError } = await supabase
        .from('customer_documents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companies[0].id);
      
      console.log(`   Documents for this company: ${count || 0}`);
    }
  }
}

finalCheck();
