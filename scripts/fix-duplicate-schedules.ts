/**
 * Fix Duplicate Payment Schedules for Contract C-ALF-0085
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const CONTRACT_ID = 'c986eade-48f6-4d23-8eea-31d294f3b8bf';

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
let supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
let supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').trim();
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) supabaseKey = supabaseKey.slice(1, -1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSchedules() {
  console.log('Investigating payment schedules...');
  console.log();

  const { data: schedules } = await supabase
    .from('contract_payment_schedules')
    .select('*')
    .eq('contract_id', CONTRACT_ID)
    .order('installment_number');

  if (!schedules) {
    console.log('No schedules found');
    return;
  }

  console.log('Found schedules:', schedules.length);
  console.log();

  // Group by installment_number to find duplicates
  const byInstallment: Record<number, any[]> = {};
  schedules.forEach(s => {
    if (!byInstallment[s.installment_number]) {
      byInstallment[s.installment_number] = [];
    }
    byInstallment[s.installment_number].push(s);
  });

  console.log('Schedules by installment:');
  for (const [num, items] of Object.entries(byInstallment)) {
    if (items.length > 1) {
      console.log(`  Installment ${num}: ${items.length} schedules (DUPLICATE!)`);
    } else {
      console.log(`  Installment ${num}: 1 schedule`);
    }
  }

  console.log();
  console.log('Deleting duplicate schedules...');

  for (const [num, items] of Object.entries(byInstallment)) {
    if (items.length > 1) {
      // Keep the first one, delete the rest
      const toKeep = items[0];
      const toDelete = items.slice(1);

      console.log(`  Installment ${num}: keeping ${toKeep.id}, deleting ${toDelete.length} duplicates`);

      for (const dup of toDelete) {
        const { error } = await supabase
          .from('contract_payment_schedules')
          .delete()
          .eq('id', dup.id);
        if (error) {
          console.log(`    Error deleting ${dup.id}:`, error.message);
        }
      }
    }
  }

  console.log();
  console.log('Done!');

  // Verify final count
  const { data: finalSchedules } = await supabase
    .from('contract_payment_schedules')
    .select('*')
    .eq('contract_id', CONTRACT_ID);

  console.log(`Final schedule count: ${finalSchedules?.length || 0}`);
}

fixSchedules().catch(console.error);
