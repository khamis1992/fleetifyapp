/**
 * Recalculate Contract Totals After Fixes
 *
 * After fixing payment amounts, we need to recalculate
 * the total_paid and balance_due fields for affected contracts
 */

import { createClient } from '@supabase/supabase-js';
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
let supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').trim();
let supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '').trim();
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) supabaseKey = supabaseKey.slice(1, -1);

const supabase = createClient(supabaseUrl, supabaseKey);

// Contracts that need recalculation
const CONTRACTS_TO_UPDATE = [
  'C-ALF-0001',
  'C-ALF-0068',
  'C-ALF-0077',
  'C-ALF-0083',
  '319',
  'AGR-202504-424958',
  'LTO2024100',
  'LTO2024103',
  'LTO2024104',
  'LTO2024115',
  'LTO2024124',
  'LTO2024156',
  'LTO2024248',
  'LTO2024251',
  'LTO2024261',
  'LTO2024263',
  'LTO202427',
  'LTO2024270',
  'LTO2024273',
  'LTO2024285',
  'LTO202429',
  'LTO2024340',
  'LTO202437',
  'LTO202453',
  'LTO202494',
  'MR2024181',
  'MR2024232',
  'MR202476',
  'Ret-2018212',
  'Ret-2018218'
];

async function recalculateContracts() {
  console.log('='.repeat(80));
  console.log('RECALCULATING CONTRACT TOTALS');
  console.log('='.repeat(80));
  console.log();

  let updated = 0;
  let errors = 0;

  for (const contractNumber of CONTRACTS_TO_UPDATE) {
    process.stdout.write(`\r  Processing ${contractNumber}... (${updated}/${CONTRACTS_TO_UPDATE.length} updated)`);

    try {
      // Get contract
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, contract_amount')
        .eq('contract_number', contractNumber)
        .single();

      if (!contract) continue;

      // Get actual payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('contract_id', contract.id);

      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const balanceDue = (contract.contract_amount || 0) - totalPaid;

      // Update contract
      const { error } = await supabase
        .from('contracts')
        .update({
          total_paid: totalPaid,
          balance_due: balanceDue
        })
        .eq('id', contract.id);

      if (error) {
        errors++;
      } else {
        updated++;
      }
    } catch (e) {
      errors++;
    }
  }

  console.log(`\r  ✅ Updated ${updated}/${CONTRACTS_TO_UPDATE.length} contracts (${errors} errors)`);
  console.log();

  // Verify the fixed contracts
  console.log('─'.repeat(80));
  console.log('VERIFICATION OF FIXED CONTRACTS');
  console.log('─'.repeat(80));
  console.log();

  const { data: contracts } = await supabase
    .from('contracts')
    .select('contract_number, contract_amount, total_paid, balance_due')
    .in('contract_number', ['C-ALF-0001', 'C-ALF-0068', 'C-ALF-0083', 'LTO2024103'])
    .order('contract_number');

  if (contracts) {
    let allOk = true;
    contracts.forEach(c => {
      const isOk = c.contract_amount > 0 && c.total_paid <= c.contract_amount;
      const status = isOk ? '✅' : '⚠️';
      if (!isOk) allOk = false;

      console.log(`${status} ${c.contract_number}:`);
      console.log(`   Contract: QAR ${(c.contract_amount || 0).toLocaleString()}`);
      console.log(`   Paid: QAR ${(c.total_paid || 0).toLocaleString()}`);
      console.log(`   Balance: QAR ${(c.balance_due || 0).toLocaleString()}`);
      console.log();
    });

    if (allOk) {
      console.log('✅ All sample contracts are now healthy!');
    } else {
      console.log('⚠️  Some contracts still need attention');
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ Contract totals recalculated!');
  console.log('='.repeat(80));
}

recalculateContracts()
  .then(() => {
    console.log('✅ Complete!');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
