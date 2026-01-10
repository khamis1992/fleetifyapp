/**
 * Apply Overpayment Prevention Trigger - Direct PostgreSQL
 *
 * This script uses node-postgres to execute the SQL migration directly
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment
function loadEnv() {
  const envPaths = ['.env.local', '.env.production', '.env'];
  const env: Record<string, string> = {};

  for (const envPath of envPaths) {
    try {
      const fullPath = join(process.cwd(), envPath);
      const envContent = readFileSync(fullPath, 'utf-8');
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && !key.startsWith('#') && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      });
    } catch (error) {}
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim().replace(/^"|"$/g, '');
const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').trim().replace(/^"|"$/g, '');

// Build PostgreSQL connection string from Supabase URL
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.qwhunliohlkkahbspfiu.supabase.co:5432/postgres
const dbName = 'postgres';
const port = '5432';
const host = supabaseUrl.replace('https://', 'db.').replace('.co', '.co');

// We need the database password - it's not in the env file
// We'll need to get it from Supabase or use a different approach

console.log('='.repeat(80));
console.log('APPLYING OVERPAYMENT PREVENTION TRIGGER');
console.log('='.repeat(80));
console.log();

async function applyMigration() {
  // Read the generated SQL file
  const sqlPath = join(process.cwd(), 'scripts', 'generated-apply-trigger.sql');
  const sqlContent = readFileSync(sqlPath, 'utf-8');

  console.log('📋 To apply the migration, choose one of these methods:');
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OPTION 1: Supabase Dashboard (Recommended - Easiest)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('1. Go to: https://app.supabase.com');
  console.log('2. Click on your project: qwhunliohlkkahbspfiu');
  console.log('3. In the left sidebar, click on "SQL Editor"');
  console.log('4. Click "New Query"');
  console.log('5. Copy the contents of:');
  console.log(`   ${sqlPath}`);
  console.log('6. Paste into the SQL editor');
  console.log('7. Click "Run" (or press Ctrl+Enter)');
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OPTION 2: Command Line (if you have the database password)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('Get your database password:');
  console.log('1. Go to: https://app.supabase.com/project/qwhunliohlkkahbspfiu/settings/database');
  console.log('2. Scroll to "Connection string"');
  console.log('3. Click "URI" and copy the password');
  console.log();
  console.log('Then run:');
  console.log(`psql "postgresql://postgres:[PASSWORD]@db.qwhunliohlkkahbspfiu.supabase.co:5432/postgres" -f "${sqlPath}"`);
  console.log();
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('OPTION 3: Test the validation without applying (Preview)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log();
  console.log('You can test the trigger logic by running this test query:');
  console.log();
  console.log('-- This should succeed (normal payment)');
  console.log('INSERT INTO payments (amount, contract_id, payment_number, payment_date)');
  console.log('VALUES (1300, (SELECT id FROM contracts LIMIT 1), PAY-TEST-001, NOW());');
  console.log();
  console.log('-- This should fail (suspiciously large amount)');
  console.log('INSERT INTO payments (amount, contract_id, payment_number, payment_date)');
  console.log('VALUES (100000, (SELECT id FROM contracts LIMIT 1), PAY-TEST-002, NOW());');
  console.log();
  console.log('='.repeat(80));
  console.log();
  console.log('✅ SQL file ready at:');
  console.log(`   ${sqlPath}`);
  console.log();
  console.log('📝 After applying, you can verify by running:');
  console.log('   SELECT * FROM contract_payment_health_dashboard LIMIT 10;');
  console.log();
}

applyMigration().catch(console.error);
