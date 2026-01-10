/**
 * Fix 3 Contracts with Actual Overpayments
 *
 * These contracts have suspicious payment amounts that need correction:
 * 1. C-ALF-0001: Payment PAY-IMP-1767526937-63 = QAR 70,561 (suspiciously large)
 * 2. C-ALF-0068: Payment PAY-IMP-1767526937-72 = QAR 71,101 (suspiciously large)
 * 3. C-ALF-0083: Multiple payments, including PAY-1764450953636 = QAR 32,000 (needs review)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PaymentFix {
  contract_number: string;
  contract_id: string;
  payment_id: string;
  payment_number: string;
  current_amount: number;
  suggested_amount: number;
  invoice_amount?: number;
  reason: string;
}

const OVERPAYMENT_CONTRACTS: PaymentFix[] = [
  {
    contract_number: 'C-ALF-0001',
    contract_id: 'd2311c7b-6d1d-48ec-8716-3d3efad22a52',
    payment_id: 'd7e63d32-7b2c-48cd-8968-e9fc9bf6e5e1',
    payment_number: 'PAY-IMP-1767526937-63',
    current_amount: 70561,
    suggested_amount: 1450, // Based on typical payment pattern
    reason: 'Suspiciously large payment - 70,561 vs typical 1,000-1,500 range'
  },
  {
    contract_number: 'C-ALF-0068',
    contract_id: 'd6084b0f-4e5f-4f78-a0e1-c45df2da39b0',
    payment_id: '6f0c25f3-85b1-4c30-95c6-7a2c3b2c8e8c',
    payment_number: 'PAY-IMP-1767526937-72',
    current_amount: 71101,
    suggested_amount: 1000, // Based on monthly amount
    reason: 'Suspiciously large payment - 71,101 vs monthly ~1,000-1,500'
  }
  // Note: C-ALF-0083 will be investigated separately as it has multiple payments
];

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

async function investigateC_ALF_0083() {
  console.log('─'.repeat(80));
  console.log('DETAILED INVESTIGATION: C-ALF-0083');
  console.log('─'.repeat(80));
  console.log();

  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', 'C-ALF-0083')
    .single();

  if (!contract) {
    console.log('Contract not found');
    return;
  }

  console.log(`Contract: ${contract.contract_number}`);
  console.log(`Amount: QAR ${(contract.contract_amount || 0).toLocaleString()}`);
  console.log(`Monthly: QAR ${(contract.monthly_amount || 0).toLocaleString()}`);
  console.log(`Paid: QAR ${(contract.total_paid || 0).toLocaleString()}`);
  console.log(`Duration: ${contract.start_date} to ${contract.end_date}`);
  console.log();

  // Get all payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', contract.id)
    .order('payment_date', { ascending: true });

  if (payments) {
    console.log(`All Payments (${payments.length}):`);
    console.log();

    // Group by amount ranges
    const tiny = payments.filter(p => (p.amount || 0) < 3000);
    const medium = payments.filter(p => (p.amount || 0) >= 3000 && (p.amount || 0) < 10000);
    const large = payments.filter(p => (p.amount || 0) >= 10000);

    console.log(`  Small payments (< QAR 3,000): ${tiny.length} payments`);
    tiny.forEach(p => {
      console.log(`    - ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()} | ${p.payment_date}`);
    });
    console.log();

    console.log(`  Medium payments (QAR 3,000 - 10,000): ${medium.length} payments`);
    medium.forEach(p => {
      console.log(`    - ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()} | ${p.payment_date}`);
    });
    console.log();

    console.log(`  Large payments (>= QAR 10,000): ${large.length} payments`);
    large.forEach(p => {
      console.log(`    - ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()} | ${p.payment_date}`);
    });
    console.log();

    // Analyze the large payment
    if (large.length > 0) {
      const largePayment = large[0];
      console.log('Large payment analysis:');
      console.log(`  Payment: ${largePayment.payment_number}`);
      console.log(`  Amount: QAR ${(largePayment.amount || 0).toLocaleString()}`);
      console.log(`  Date: ${largePayment.payment_date}`);
      console.log(`  Notes: ${largePayment.notes || 'None'}`);

      // Get linked invoice
      if (largePayment.invoice_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', largePayment.invoice_id)
          .single();

        if (invoice) {
          console.log(`  Linked Invoice: ${invoice.invoice_number}`);
          console.log(`  Invoice Amount: QAR ${(invoice.total_amount || 0).toLocaleString()}`);
          console.log(`  Difference: QAR ${Math.abs((largePayment.amount || 0) - (invoice.total_amount || 0)).toLocaleString()}`);
        }
      }

      // Check if this might be a bulk payment for multiple months
      const expectedMonthly = contract.monthly_amount || 0;
      if (expectedMonthly > 0) {
        const monthsCovered = (largePayment.amount || 0) / expectedMonthly;
        console.log(`  This payment covers approximately ${monthsCovered.toFixed(1)} months`);
      }

      console.log();
    }

    // Calculate what the totals should be without the large payment
    const totalWithoutLarge = payments.reduce((sum, p) => {
      if ((p.amount || 0) < 10000) return sum + (p.amount || 0);
      return sum;
    }, 0);

    console.log('Scenario analysis:');
    console.log(`  Total all payments: QAR ${payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`);
    console.log(`  Total without large payments: QAR ${totalWithoutLarge.toLocaleString()}`);
    console.log(`  Contract amount: QAR ${(contract.contract_amount || 0).toLocaleString()}`);
    console.log(`  Without large payments, overpaid by: QAR ${Math.max(0, totalWithoutLarge - (contract.contract_amount || 0)).toLocaleString()}`);
  }

  console.log();
  console.log('Recommendation for C-ALF-0083:');
  console.log('  This contract has ONE large payment of QAR 32,000 and many small payments.');
  console.log('  The large payment (PAY-1764450953636) might be legitimate if it covers multiple months.');
  console.log('  Suggested action: Verify with the customer if this was a bulk payment.');
  console.log();
}

async function fixOverpayments() {
  console.log('='.repeat(80));
  console.log('FIX: Contracts with Suspicious Payment Amounts');
  console.log('='.repeat(80));
  console.log();

  // First, investigate C-ALF-0083 in detail
  await investigateC_ALF_0083();

  console.log('='.repeat(80));
  console.log('FIXES READY TO APPLY');
  console.log('='.repeat(80));
  console.log();

  console.log('The following payments have suspiciously large amounts:');
  console.log();

  OVERPAYMENT_CONTRACTS.forEach((fix, idx) => {
    console.log(`${idx + 1}. ${fix.contract_number}`);
    console.log(`   Payment: ${fix.payment_number}`);
    console.log(`   Current: QAR ${fix.current_amount.toLocaleString()}`);
    console.log(`   Suggested: QAR ${fix.suggested_amount.toLocaleString()}`);
    console.log(`   Reduction: QAR ${(fix.current_amount - fix.suggested_amount).toLocaleString()}`);
    console.log(`   Reason: ${fix.reason}`);
    console.log();
  });

  console.log('─'.repeat(80));
  console.log('Generated Fix SQL:');
  console.log('─'.repeat(80));
  console.log();

  const fixSQL = OVERPAYMENT_CONTRACTS.map((fix, idx) => `
-- Fix ${idx + 1}: ${fix.contract_number}
-- ${fix.reason}
UPDATE payments
SET amount = ${fix.suggested_amount},
    notes = COALESCE(notes, '') || ' CORRECTED: Was ${fix.current_amount}. Reduced by ${fix.current_amount - fix.suggested_amount}. ${fix.reason}'
WHERE id = '${fix.payment_id}'
AND payment_number = '${fix.payment_number}';

-- Verify after update
SELECT
    contract_number,
    p.payment_number,
    p.amount,
    c.contract_amount,
    c.total_paid,
    c.balance_due
FROM payments p
JOIN contracts c ON c.id = p.contract_id
WHERE p.id = '${fix.payment_id}';
`).join('\n');

  console.log(fixSQL);
  console.log();

  // Write to file
  const outputPath = join(process.cwd(), 'scripts', 'generated-fix-overpayment-payments.sql');
  const fs = require('fs');
  fs.writeFileSync(outputPath, fixSQL);

  console.log('='.repeat(80));
  console.log('NEXT STEPS');
  console.log('='.repeat(80));
  console.log();
  console.log('1. Apply the contract amount fixes (27 contracts):');
  console.log('   Run SQL from: scripts/generated-fix-high-severity.sql');
  console.log();
  console.log('2. Fix the 2 suspicious payments:');
  console.log('   Run SQL from: scripts/generated-fix-overpayment-payments.sql');
  console.log();
  console.log('3. For C-ALF-0083:');
  console.log('   - Review the large payment QAR 32,000');
  console.log('   - Verify if this was a legitimate bulk payment');
  console.log('   - If incorrect, reduce to appropriate amount');
  console.log();
  console.log('4. Run final verification:');
  console.log('   npx tsx scripts/scan-all-contracts-overpayments.ts');
  console.log();
  console.log('='.repeat(80));
}

fixOverpayments()
  .then(() => {
    console.log('✅ Complete!');
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
