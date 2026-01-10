/**
 * Generate Payment Schedules for Contract C-ALF-0085
 *
 * This script generates missing payment_schedule records for the contract
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const CONTRACT_ID = 'c986eade-48f6-4d23-8eea-31d294f3b8bf';
const CONTRACT_NUMBER = 'C-ALF-0085';

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
    } catch (error) {
      // File doesn't exist, continue
    }
  }

  return env;
}

const env = loadEnv();
let supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
let supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').trim();

// Remove quotes if present
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) {
  supabaseUrl = supabaseUrl.slice(1, -1);
}
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) {
  supabaseKey = supabaseKey.slice(1, -1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSchedules() {
  console.log('='.repeat(80));
  console.log(`GENERATE: Payment schedules for contract ${CONTRACT_NUMBER}`);
  console.log('='.repeat(80));
  console.log();

  // First, do a dry run to preview
  console.log('Step 1: DRY RUN - Previewing what will be generated...');
  console.log();

  const { data: dryRun, error: dryRunError } = await supabase
    .rpc('generate_payment_schedules_for_contract', {
      p_contract_id: CONTRACT_ID,
      p_dry_run: true
    });

  if (dryRunError) {
    console.error('❌ Dry run error:', dryRunError.message);
    console.error('Make sure the migration has been applied: supabase db push');
    return;
  }

  if (!dryRun) {
    console.error('❌ No response from dry run');
    return;
  }

  console.log('Dry Run Results:');
  console.log(`  Contract: ${dryRun.contract_number || CONTRACT_NUMBER}`);
  console.log(`  Invoices Processed: ${dryRun.invoices_processed}`);
  console.log(`  Schedules to Create: ${dryRun.schedules_created}`);
  console.log(`  Schedules Skipped: ${dryRun.schedules_skipped}`);

  if (dryRun.warnings && dryRun.warnings.length > 0) {
    console.log(`  Warnings: ${dryRun.warnings.length}`);
    dryRun.warnings.forEach((w: string) => console.log(`    - ${w}`));
  }

  if (dryRun.created_schedules && dryRun.created_schedules.length > 0) {
    console.log();
    console.log('Schedules that will be created:');
    dryRun.created_schedules.forEach((s: any) => {
      console.log(`  - Installment ${s.installment_number}: QAR ${s.amount} due ${s.due_date} (${s.status})`);
    });
  }
  console.log();

  if (!dryRun.schedules_created || dryRun.schedules_created === 0) {
    console.log('ℹ️  No new schedules to generate. All invoices already have schedules.');
    console.log();
    console.log('='.repeat(80));
    return;
  }

  console.log('Step 2: Generating payment schedules...');
  console.log();

  const { data: result, error: error } = await supabase
    .rpc('generate_payment_schedules_for_contract', {
      p_contract_id: CONTRACT_ID,
      p_dry_run: false
    });

  if (error) {
    console.error('❌ Error generating schedules:', error.message);
    return;
  }

  console.log('✅ Payment schedules generated successfully!');
  console.log();
  console.log('Final Results:');
  console.log(`  Invoices Processed: ${result.invoices_processed}`);
  console.log(`  Schedules Created: ${result.schedules_created}`);
  console.log(`  Schedules Skipped: ${result.schedules_skipped}`);
  console.log();

  if (result.created_schedules && result.created_schedules.length > 0) {
    console.log('Created Schedules:');
    result.created_schedules.forEach((s: any) => {
      console.log(`  - Installment ${s.installment_number}: QAR ${s.amount} due ${s.due_date} (${s.status})`);
    });
  }
  console.log();

  // Verify the schedules were created
  console.log('Step 3: Verifying schedules in database...');
  const { data: schedules, error: verifyError } = await supabase
    .from('contract_payment_schedules')
    .select('*')
    .eq('contract_id', CONTRACT_ID)
    .order('installment_number', { ascending: true });

  if (verifyError) {
    console.error('❌ Error verifying:', verifyError.message);
  } else {
    console.log(`✅ Found ${schedules?.length || 0} payment schedules in database.`);
    schedules?.forEach((s: any) => {
      console.log(`  - #${s.installment_number}: QAR ${s.amount} | ${s.status} | Due: ${s.due_date}`);
    });
  }
  console.log();
  console.log('='.repeat(80));
}

generateSchedules().then(() => {
  console.log('✅ Complete!');
}).catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
