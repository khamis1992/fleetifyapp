/**
 * Fix Suspicious Payments - Final Attempt
 *
 * Using the correct payment IDs found during verification
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

async function fixPayments() {
  console.log('='.repeat(80));
  console.log('FIXING SUSPICIOUS PAYMENTS');
  console.log('='.repeat(80));
  console.log();

  // Fix 1: PAY-IMP-1767526937-63
  console.log('Fix 1: PAY-IMP-1767526937-63');
  const { data: before1 } = await supabase
    .from('payments')
    .select('amount, contract_number, payment_number')
    .eq('id', '9f9fed27-f063-4d23-9964-a8bbac06de02')
    .single();

  console.log(`  Before: QAR ${(before1?.amount || 0).toLocaleString()}`);

  const { data: after1, error: e1 } = await supabase
    .from('payments')
    .update({
      amount: 1450,
      notes: 'CORRECTED: Was 70561. Reduced by 69111. Reason: Suspiciously large payment entry error'
    })
    .eq('id', '9f9fed27-f063-4d23-9964-a8bbac06de02')
    .select('amount, contract_number, payment_number')
    .single();

  if (e1) {
    console.log(`  ❌ Error: ${e1.message}`);
  } else {
    console.log(`  After: QAR ${(after1?.amount || 0).toLocaleString()}`);
    console.log(`  ✅ Fixed!`);
  }
  console.log();

  // Fix 2: PAY-IMP-1767526937-72
  console.log('Fix 2: PAY-IMP-1767526937-72');
  const { data: before2 } = await supabase
    .from('payments')
    .select('amount, payment_number')
    .eq('id', 'fb9095c7-0c13-4716-9565-8c05eb8c1ebe')
    .single();

  console.log(`  Before: QAR ${(before2?.amount || 0).toLocaleString()}`);

  const { data: after2, error: e2 } = await supabase
    .from('payments')
    .update({
      amount: 1000,
      notes: 'CORRECTED: Was 71101. Reduced by 70101. Reason: Suspiciously large payment entry error'
    })
    .eq('id', 'fb9095c7-0c13-4716-9565-8c05eb8c1ebe')
    .select('amount, payment_number')
    .single();

  if (e2) {
    console.log(`  ❌ Error: ${e2.message}`);
  } else {
    console.log(`  After: QAR ${(after2?.amount || 0).toLocaleString()}`);
    console.log(`  ✅ Fixed!`);
  }
  console.log();

  // Verify the contracts are now healthy
  console.log('─'.repeat(80));
  console.log('VERIFYING CONTRACTS');
  console.log('─'.repeat(80));
  console.log();

  const contracts = [
    { number: 'PAY-IMP-1767526937-63', contract_id: '1c4e5129-841b-423b-a3cc-29f44192204f' },
    { number: 'PAY-IMP-1767526937-72', contract_id: '2064a8b1-49fa-4125-a4a2-46df65bc945e' }
  ];

  for (const c of contracts) {
    const { data: contract } = await supabase
      .from('contracts')
      .select('contract_number, contract_amount, total_paid, balance_due')
      .eq('id', c.contract_id)
      .single();

    if (contract) {
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('contract_id', c.contract_id);

      const actualTotal = payments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
      const needsUpdate = actualTotal !== (contract.total_paid || 0);

      console.log(`${contract.contract_number}:`);
      console.log(`  Stored Total: QAR ${(contract.total_paid || 0).toLocaleString()}`);
      console.log(`  Actual Total: QAR ${actualTotal.toLocaleString()}`);
      console.log(`  Contract: QAR ${(contract.contract_amount || 0).toLocaleString()}`);
      if (needsUpdate) {
        console.log(`  ⚠️  Needs recalculation`);
      } else {
        console.log(`  ✅ Up to date`);
      }
      console.log();
    }
  }

  console.log('='.repeat(80));
  console.log('✅ Payment fixes applied!');
  console.log();
  console.log('Next: Run recalculate-contract-totals.ts to update contract totals');
  console.log('='.repeat(80));
}

fixPayments().catch(console.error);
