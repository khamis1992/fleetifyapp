/**
 * Fix Script: Correct the overpayment for contract C-ALF-0085
 *
 * This script fixes the payment PAY-IMP-NI-1767526972-59
 * which has amount QAR 33,670 instead of QAR 1,300
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Payment details to fix
const WRONG_PAYMENT_NUMBER = 'PAY-IMP-NI-1767526972-59';
const WRONG_PAYMENT_ID = 'uuid-placeholder'; // We'll find it
const CONTRACT_NUMBER = 'C-ALF-0085';
const CONTRACT_ID = 'c986eade-48f6-4d23-8eea-31d294f3b8bf';

// Correct values
const CORRECT_AMOUNT = 1300;
const CURRENT_WRONG_AMOUNT = 33670;

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
let supabaseKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || env.DATABASE_URL || '').trim();

// Remove quotes if present
if (supabaseUrl.startsWith('"') && supabaseUrl.endsWith('"')) {
  supabaseUrl = supabaseUrl.slice(1, -1);
}
if (supabaseKey.startsWith('"') && supabaseKey.endsWith('"')) {
  supabaseKey = supabaseKey.slice(1, -1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPayment() {
  console.log('='.repeat(80));
  console.log('FIX: Correcting overpayment for contract ' + CONTRACT_NUMBER);
  console.log('='.repeat(80));
  console.log();

  // Find the payment with wrong amount
  console.log('Step 1: Finding payment with incorrect amount...');
  const { data: wrongPayment, error: findError } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_number', WRONG_PAYMENT_NUMBER)
    .single();

  if (findError) {
    console.log('❌ Error finding payment:', findError.message);
    return;
  }

  if (!wrongPayment) {
    console.log('❌ Payment not found!');
    return;
  }

  console.log('Found payment:');
  console.log(`  ID: ${wrongPayment.id}`);
  console.log(`  Number: ${wrongPayment.payment_number}`);
  console.log(`  Current Amount: QAR ${wrongPayment.amount}`);
  console.log(`  Payment Date: ${wrongPayment.payment_date}`);
  console.log(`  Invoice ID: ${wrongPayment.invoice_id}`);
  console.log();

  // Confirm before fixing
  if (wrongPayment.amount !== CURRENT_WRONG_AMOUNT) {
    console.log(`⚠️  WARNING: Expected amount QAR ${CURRENT_WRONG_AMOUNT} but found QAR ${wrongPayment.amount}`);
    console.log('Please verify the payment details before proceeding.');
  }

  console.log();
  console.log('Step 2: Correcting payment amount...');
  console.log(`  From: QAR ${wrongPayment.amount}`);
  console.log(`  To:   QAR ${CORRECT_AMOUNT}`);
  console.log(`  Fix:  QAR ${wrongPayment.amount - CORRECT_AMOUNT} reduction`);
  console.log();

  // Update the payment
  const { data: updatedPayment, error: updateError } = await supabase
    .from('payments')
    .update({
      amount: CORRECT_AMOUNT,
      notes: `CORRECTED: Was ${wrongPayment.amount}. Reduced by ${wrongPayment.amount - CORRECT_AMOUNT}. Original payment may have been entered incorrectly.`
    })
    .eq('id', wrongPayment.id)
    .select()
    .single();

  if (updateError) {
    console.log('❌ Error updating payment:', updateError.message);
    console.log();
    console.log('You can fix this manually by running:');
    console.log();
    console.log(`UPDATE payments`);
    console.log(`SET amount = ${CORRECT_AMOUNT},`);
    console.log(`    notes = 'CORRECTED: Was ${wrongPayment.amount}'`);
    console.log(`WHERE id = '${wrongPayment.id}';`);
    console.log();
    return;
  }

  console.log('✅ Payment corrected successfully!');
  console.log();
  console.log('Updated payment:');
  console.log(`  ID: ${updatedPayment.id}`);
  console.log(`  Number: ${updatedPayment.payment_number}`);
  console.log(`  New Amount: QAR ${updatedPayment.amount}`);
  console.log();

  // Verify contract totals
  console.log('Step 3: Verifying contract totals...');
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', CONTRACT_ID)
    .single();

  if (contract) {
    console.log('Contract after fix:');
    console.log(`  Contract Amount: QAR ${contract.contract_amount?.toLocaleString()}`);
    console.log(`  Total Paid: QAR ${contract.total_paid?.toLocaleString() || 0}`);
    console.log(`  Balance Due: QAR ${contract.balance_due?.toLocaleString() || 0}`);
    console.log();

    // Calculate what the totals should be
    const expectedTotal = 1300 * 16; // 16 months
    const expectedRemaining = expectedTotal - (1100 + 1150 + 1300); // After 3 payments

    console.log('Expected totals (after 3 months of QAR 1,300 each):');
    console.log(`  Contract Total: QAR ${expectedTotal.toLocaleString()}`);
    console.log(`  Total Paid: QAR ${(1100 + 1150 + 1300).toLocaleString()} (3 months)`);
    console.log(`  Remaining Due: QAR ${expectedRemaining.toLocaleString()} (13 months × QAR 1,300)`);
    console.log();

    if (Math.abs((contract.total_paid || 0) - 3550) < 10) {
      console.log('✅ Payment correction successful! Contract totals look correct now.');
    } else {
      console.log(`⚠️  Contract total_paid is QAR ${contract.total_paid} but should be around QAR 3,550`);
    }
  }

  console.log();
  console.log('='.repeat(80));
}

fixPayment().then(() => {
  console.log('✅ Fix complete!');
}).catch((error) => {
  console.error('❌ Error during fix:', error);
  process.exit(1);
});
