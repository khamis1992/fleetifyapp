/**
 * Apply Migration Script
 * Applies a specific migration file to Supabase database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://qwhunliohlkkahbspfiu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQxMzA4NiwiZXhwIjoyMDY4OTg5MDg2fQ.vw3DWeoAyLSe_0MLQPFgSu-TL28W8mbTx7tEfhKe6Zg';

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration(migrationPath) {
  try {
    console.log('🚀 Starting migration application...');
    console.log(`📁 Migration file: ${migrationPath}`);
    
    // Read migration file
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log(`📝 Migration size: ${migrationSQL.length} characters`);
    
    // Apply migration using Supabase RPC
    console.log('⏳ Executing migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️ RPC method not available, trying direct execution...');
      
      // Split SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      console.log(`📋 Found ${statements.length} SQL statements`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length === 0) continue;
        
        try {
          console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
          
          // Use the postgres connection through Supabase
          const { error: stmtError } = await supabase.rpc('exec', {
            query: statement + ';'
          });
          
          if (stmtError) {
            console.error(`❌ Error in statement ${i + 1}:`, stmtError.message);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          errorCount++;
        }
      }
      
      console.log('\n📊 Migration Summary:');
      console.log(`   ✅ Successful: ${successCount}`);
      console.log(`   ❌ Failed: ${errorCount}`);
      
      if (errorCount > 0) {
        console.log('\n⚠️ Migration completed with errors');
        console.log('💡 Note: Some errors may be expected (e.g., "already exists")');
      } else {
        console.log('\n✅ Migration completed successfully!');
      }
      
    } else {
      console.log('✅ Migration applied successfully!');
      if (data) {
        console.log('📊 Result:', data);
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Main execution
const migrationFile = process.argv[2] || join(__dirname, '..', 'supabase', 'migrations', '20260208000001_fix_invoice_date_before_contract_start.sql');

console.log('═══════════════════════════════════════════════════════');
console.log('  Supabase Migration Application Tool');
console.log('═══════════════════════════════════════════════════════\n');

applyMigration(migrationFile)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
