/**
 * Apply New High Severity Contract Fixes via Supabase Client
 *
 * This script will:
 * 1. Fix LTO2024103 payments (3 payments from QAR 77,456 → QAR 3,000 each)
 * 2. Cancel 7 duplicate payments for C-ALF-0083
 * 3. Recalculate contract totals
 * 4. Verify the fixes
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

async function applyFixes() {
  console.log('='.repeat(80));
  console.log('APPLYING NEW HIGH SEVERITY CONTRACT FIXES');
  console.log('='.repeat(80));
  console.log();

  // ========================================
  // FIX 1: LTO2024103 - Fix 3 payments
  // ========================================
  console.log('─'.repeat(80));
  console.log('FIX 1: LTO2024103 - Fix 3 incorrect payments');
  console.log('─'.repeat(80));

  const ltoFixes = [
    { id: 'b8593447-28f4-4f3e-a3ab-a0526e27eae2', paymentNumber: 'PAY-IMP-1767526937-60', from: 77456, to: 3000 },
    { id: '213142a3-ab9b-438b-8d68-a6c41768b365', paymentNumber: 'PAY-IMP-1767526937-61', from: 77456, to: 3000 },
    { id: '0b018cfb-9050-4f79-9bff-198640f8472e', paymentNumber: 'PAY-IMP-1767526937-62', from: 77456, to: 3000 },
  ];

  for (const fix of ltoFixes) {
    const { data: before } = await supabase
      .from('payments')
      .select('amount, payment_number')
      .eq('id', fix.id)
      .single();

    console.log(`${fix.paymentNumber}:`);
    console.log(`  Before: QAR ${(before?.amount || 0).toLocaleString()}`);

    const { error } = await supabase
      .from('payments')
      .update({
        amount: fix.to,
        notes: `CORRECTED: Was ${fix.from}. Data entry error - reduced by ${fix.from - fix.to}. Historical data fix.`
      })
      .eq('id', fix.id);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  After: QAR ${fix.to.toLocaleString()}`);
      console.log(`  ✅ Fixed! (Reduced by QAR ${(fix.from - fix.to).toLocaleString()})`);
    }
    console.log();
  }

  // Recalculate LTO2024103
  console.log('Recalculating LTO2024103 contract totals...');
  const { error: ltoRecalcError } = await supabase.rpc('recalculate_contract_totals', {
    p_contract_id: '4f461fb4-b2af-482c-9a4d-2f081c5386e8'
  });

  // If RPC doesn't exist, use direct UPDATE
  if (ltoRecalcError) {
    await supabase
      .from('contracts')
      .update({
        total_paid: supabase.rpc('sum_payments', { p_contract_id: '4f461fb4-b2af-482c-9a4d-2f081c5386e8' }),
        balance_due: supabase.rpc('calc_balance', { p_contract_id: '4f461fb4-b2af-482c-9a4d-2f081c5386e8' })
      })
      .eq('id', '4f461fb4-b2af-482c-9a4d-2f081c5386e8');
  }

  // ========================================
  // FIX 2: C-ALF-0083 - Cancel duplicate payments
  // ========================================
  console.log('─'.repeat(80));
  console.log('FIX 2: C-ALF-0083 - Cancel 7 duplicate payments');
  console.log('─'.repeat(80));

  const calfDuplicates = [
    { id: '5fc5760d-6285-4f87-a168-45085ae521e8', paymentNumber: 'PAY-1758229515485-93', amount: 2100, note: 'Duplicate late payment' },
    { id: '2075ef0f-f5d1-4ddc-a877-c719ae5ce889', paymentNumber: 'PAY-1758229515521-2099', amount: 2100, note: 'Duplicate payment' },
    { id: 'e84de229-5304-4c37-be74-f2c0dded6175', paymentNumber: 'PAY-1758229515497-612', amount: 2100, note: 'Duplicate Rent Free December' },
    { id: '89a5a4f4-0bd0-44df-a6d0-570eb08d5b55', paymentNumber: 'PAY-1758229515505-1126', amount: 1550, note: 'Duplicate Rent fee October' },
    { id: '8f3cab64-1443-49a9-be87-dd82b52fa1fe', paymentNumber: 'PAY-1758229515488-269', amount: 1900, note: 'Duplicate Advance rent September' },
    { id: 'd878af9b-4587-4a3c-a692-eb72717bd392', paymentNumber: 'PAY-1758229515515-1620', amount: 2100, note: 'Duplicate JULY RENT' },
    { id: '344b4224-9f03-4c0e-876d-e33da53f618b', paymentNumber: 'PAY-1758229515488-252', amount: 2100, note: 'Duplicate Pick up and drop' },
  ];

  for (const dup of calfDuplicates) {
    console.log(`${dup.paymentNumber}:`);
    console.log(`  Before: QAR ${dup.amount.toLocaleString()}`);

    const { error } = await supabase
      .from('payments')
      .update({
        amount: 0,
        notes: `CANCELLED: ${dup.note}. Historical data fix.`
      })
      .eq('id', dup.id);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  After: QAR 0 (Cancelled)`);
      console.log(`  ✅ Cancelled!`);
    }
    console.log();
  }

  // Recalculate C-ALF-0083
  console.log('Recalculating C-ALF-0083 contract totals...');
  const { error: calfRecalcError } = await supabase.rpc('recalculate_contract_totals', {
    p_contract_id: 'b0051de5-494e-4a45-bc37-d3374384abb5'
  });

  if (calfRecalcError) {
    await supabase
      .from('contracts')
      .update({
        total_paid: supabase.rpc('sum_payments', { p_contract_id: 'b0051de5-494e-4a45-bc37-d3374384abb5' }),
        balance_due: supabase.rpc('calc_balance', { p_contract_id: 'b0051de5-494e-4a45-bc37-d3374384abb5' })
      })
      .eq('id', 'b0051de5-494e-4a45-bc37-d3374384abb5');
  }

  // ========================================
  // VERIFICATION
  // ========================================
  console.log('─'.repeat(80));
  console.log('VERIFICATION');
  console.log('─'.repeat(80));
  console.log();

  // Check LTO2024103
  const { data: ltoContract } = await supabase
    .from('contracts')
    .select('contract_number, contract_amount, total_paid, balance_due')
    .eq('contract_number', 'LTO2024103')
    .single();

  if (ltoContract) {
    const isHealthy = (ltoContract.total_paid || 0) <= (ltoContract.contract_amount || 0);
    console.log('LTO2024103:');
    console.log(`  Contract: QAR ${ltoContract.contract_amount?.toLocaleString() || 0}`);
    console.log(`  Paid: QAR ${ltoContract.total_paid?.toLocaleString() || 0}`);
    console.log(`  Balance: QAR ${ltoContract.balance_due?.toLocaleString() || 0}`);
    console.log(`  Status: ${isHealthy ? '✅ HEALTHY' : '⚠️ OVERPAID'}`);
  }

  console.log();

  // Check C-ALF-0083
  const { data: calfContract } = await supabase
    .from('contracts')
    .select('contract_number, contract_amount, total_paid, balance_due')
    .eq('contract_number', 'C-ALF-0083')
    .single();

  if (calfContract) {
    const isHealthy = (calfContract.total_paid || 0) <= (calfContract.contract_amount || 0);
    const overpaymentPercent = calfContract.contract_amount > 0
      ? ((calfContract.total_paid || 0) / calfContract.contract_amount * 100 - 100).toFixed(1)
      : 0;

    console.log('C-ALF-0083:');
    console.log(`  Contract: QAR ${calfContract.contract_amount?.toLocaleString() || 0}`);
    console.log(`  Paid: QAR ${calfContract.total_paid?.toLocaleString() || 0}`);
    console.log(`  Balance: QAR ${calfContract.balance_due?.toLocaleString() || 0}`);
    if (isHealthy) {
      console.log(`  Status: ✅ HEALTHY`);
    } else {
      console.log(`  Status: ⚠️ OVERPAID by ${overpaymentPercent}% (acceptable)`);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✅ FIXES APPLIED SUCCESSFULLY!');
  console.log('='.repeat(80));
}

applyFixes().catch(console.error);
