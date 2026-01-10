/**
 * Apply All High-Severity Contract Fixes
 *
 * This script applies:
 * 1. Contract amount fixes for 27 contracts with QAR 0 amount
 * 2. Payment fixes for 2 contracts with suspicious payments
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

// Contract amount fixes (27 contracts)
const CONTRACT_AMOUNT_FIXES = [
  { contract_number: '319', contract_id: null, new_amount: 68800 },
  { contract_number: 'AGR-202504-424958', contract_id: null, new_amount: 54950 },
  { contract_number: 'C-ALF-0077', contract_id: null, new_amount: 19800 },
  { contract_number: 'LTO2024100', contract_id: null, new_amount: 1965600 },
  { contract_number: 'LTO2024103', contract_id: null, new_amount: 36000 },
  { contract_number: 'LTO2024104', contract_id: null, new_amount: 68040 },
  { contract_number: 'LTO2024115', contract_id: null, new_amount: 113400 },
  { contract_number: 'LTO2024124', contract_id: null, new_amount: 115000 },
  { contract_number: 'LTO2024156', contract_id: null, new_amount: 102000 },
  { contract_number: 'LTO2024248', contract_id: null, new_amount: 84000 },
  { contract_number: 'LTO2024251', contract_id: null, new_amount: 58750 },
  { contract_number: 'LTO2024261', contract_id: null, new_amount: 82250 },
  { contract_number: 'LTO2024263', contract_id: null, new_amount: 84600 },
  { contract_number: 'LTO202427', contract_id: null, new_amount: 132300 },
  { contract_number: 'LTO2024270', contract_id: null, new_amount: 61750 },
  { contract_number: 'LTO2024273', contract_id: null, new_amount: 89250 },
  { contract_number: 'LTO2024285', contract_id: null, new_amount: 2073600 },
  { contract_number: 'LTO202429', contract_id: null, new_amount: 13000 },
  { contract_number: 'LTO2024340', contract_id: null, new_amount: 57000 },
  { contract_number: 'LTO202437', contract_id: null, new_amount: 75840 },
  { contract_number: 'LTO202453', contract_id: null, new_amount: 27950 },
  { contract_number: 'LTO202494', contract_id: null, new_amount: 150354 },
  { contract_number: 'MR2024181', contract_id: null, new_amount: 75669.94 },
  { contract_number: 'MR2024232', contract_id: null, new_amount: 10899.98 },
  { contract_number: 'MR202476', contract_id: null, new_amount: 11820 },
  { contract_number: 'Ret-2018212', contract_id: null, new_amount: 198213 },
  { contract_number: 'Ret-2018218', contract_id: null, new_amount: 14400 },
];

// Payment fixes (2 payments)
const PAYMENT_FIXES = [
  {
    contract_number: 'C-ALF-0001',
    payment_id: 'd7e63d32-7b2c-48cd-8968-e9fc9bf6e5e1',
    payment_number: 'PAY-IMP-1767526937-63',
    new_amount: 1450,
    old_amount: 70561
  },
  {
    contract_number: 'C-ALF-0068',
    payment_id: '6f0c25f3-85b1-4c30-95c6-7a2c3b2c8e8c',
    payment_number: 'PAY-IMP-1767526937-72',
    new_amount: 1000,
    old_amount: 71101
  }
];

async function applyFixes() {
  console.log('='.repeat(80));
  console.log('APPLYING ALL HIGH-SEVERITY FIXES');
  console.log('='.repeat(80));
  console.log();

  let appliedContractFixes = 0;
  let appliedPaymentFixes = 0;
  const errors: string[] = [];

  // Part 1: Fix contract amounts
  console.log('Part 1: Fixing Contract Amounts (27 contracts)');
  console.log('─'.repeat(80));

  for (const fix of CONTRACT_AMOUNT_FIXES) {
    process.stdout.write(`\r  Processing ${fix.contract_number}...`);

    try {
      // Get contract ID first
      const { data: contract } = await supabase
        .from('contracts')
        .select('id')
        .eq('contract_number', fix.contract_number)
        .single();

      if (!contract) {
        errors.push(`Contract ${fix.contract_number} not found`);
        continue;
      }

      const { error } = await supabase
        .from('contracts')
        .update({ contract_amount: fix.new_amount })
        .eq('id', contract.id);

      if (error) {
        errors.push(`Contract ${fix.contract_number}: ${error.message}`);
      } else {
        appliedContractFixes++;
      }
    } catch (e: any) {
      errors.push(`Contract ${fix.contract_number}: ${e.message}`);
    }
  }

  console.log(`\r  ✅ Applied ${appliedContractFixes}/${CONTRACT_AMOUNT_FIXES.length} contract amount fixes`);
  console.log();

  // Part 2: Fix payment amounts
  console.log('Part 2: Fixing Suspicious Payments (2 payments)');
  console.log('─'.repeat(80));

  for (const fix of PAYMENT_FIXES) {
    console.log(`  Processing ${fix.payment_number}...`);

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          amount: fix.new_amount,
          notes: `CORRECTED: Was ${fix.old_amount}. Reduced by ${fix.old_amount - fix.new_amount}. Fixed during high-severity contract remediation.`
        })
        .eq('id', fix.payment_id)
        .eq('payment_number', fix.payment_number);

      if (error) {
        errors.push(`Payment ${fix.payment_number}: ${error.message}`);
        console.log(`    ❌ Error: ${error.message}`);
      } else {
        appliedPaymentFixes++;
        console.log(`    ✅ Fixed: QAR ${fix.old_amount.toLocaleString()} → QAR ${fix.new_amount.toLocaleString()}`);
      }
    } catch (e: any) {
      errors.push(`Payment ${fix.payment_number}: ${e.message}`);
      console.log(`    ❌ Error: ${e.message}`);
    }
  }

  console.log();

  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Contract Amount Fixes: ${appliedContractFixes}/${CONTRACT_AMOUNT_FIXES.length} applied`);
  console.log(`Payment Fixes: ${appliedPaymentFixes}/${PAYMENT_FIXES.length} applied`);
  console.log(`Total Reduction: QAR 139,212`);
  console.log();

  if (errors.length > 0) {
    console.log('Errors:');
    errors.forEach(e => console.log(`  - ${e}`));
    console.log();
  }

  // Verify a few contracts
  console.log('─'.repeat(80));
  console.log('VERIFICATION');
  console.log('─'.repeat(80));
  console.log();

  const sampleContracts = ['C-ALF-0001', 'C-ALF-0068', 'C-ALF-0083', 'LTO2024103'];

  for (const contractNum of sampleContracts) {
    const { data: contract } = await supabase
      .from('contracts')
      .select('*')
      .eq('contract_number', contractNum)
      .single();

    if (contract) {
      const status = contract.contract_amount > 0 && contract.total_paid <= contract.contract_amount
        ? '✅ OK'
        : contract.contract_amount === 0
        ? '⚠️  Still 0'
        : '⚠️  Overpaid';

      console.log(`${status} ${contractNum}:`);
      console.log(`   Contract: QAR ${(contract.contract_amount || 0).toLocaleString()}`);
      console.log(`   Paid: QAR ${(contract.total_paid || 0).toLocaleString()}`);
      console.log(`   Balance: QAR ${(contract.balance_due || 0).toLocaleString()}`);
      console.log();
    }
  }

  console.log('='.repeat(80));
  console.log('✅ Fixes applied!');
  console.log();
  console.log('Next: Run full scan to verify all fixes:');
  console.log('  npx tsx scripts/scan-all-contracts-overpayments.ts');
  console.log('='.repeat(80));
}

applyFixes()
  .then(() => {
    console.log('✅ Complete!');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
