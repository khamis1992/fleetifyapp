import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  try {
    console.log('📖 Reading SQL script...');
    const sql = fs.readFileSync('scripts/clean_duplicates_final.sql', 'utf8');
    
    console.log('🚀 Executing SQL script...');
    // Supabase JS SDK doesn't have a direct execute SQL method for arbitrary SQL
    // We usually use RPC or a specific extension if enabled.
    // However, since this is for cleaning duplicates, we can try to use the 'rpc' method if a 'exec_sql' function exists
    // or just inform the user.
    
    console.log('⚠️ Note: Supabase JS SDK doesn\'t support direct arbitrary SQL execution.');
    console.log('Please run the content of scripts/clean_duplicates_final.sql in your Supabase SQL Editor.');
    
    // Attempting a hacky way via postgres directly if possible? No.
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

executeSql();
