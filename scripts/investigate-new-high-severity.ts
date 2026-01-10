/**
 * Investigate New High Severity Contracts
 *
 * C-ALF-0083: Overpaid by QAR 14,700 (Suspicious payment: PAY-1764450953636)
 * LTO2024103: Overpaid by QAR 196,368
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

async function investigateNewHighSeverity() {
  console.log('='.repeat(80));
  console.log('INVESTIGATING NEW HIGH SEVERITY CONTRACTS');
  console.log('='.repeat(80));
  console.log();

  // Investigate C-ALF-0083
  console.log('─'.repeat(80));
  console.log('1. CONTRACT: C-ALF-0083');
  console.log('─'.repeat(80));

  const { data: calf0083 } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', 'C-ALF-0083')
    .single();

  if (calf0083) {
    console.log(`Contract ID: ${calf0083.id}`);
    console.log(`Contract Amount: QAR ${calf0083.contract_amount?.toLocaleString() || 0}`);
    console.log(`Total Paid: QAR ${calf0083.total_paid?.toLocaleString() || 0}`);
    console.log(`Balance Due: QAR ${calf0083.balance_due?.toLocaleString() || 0}`);
    console.log(`Overpayment: QAR ${((calf0083.total_paid || 0) - (calf0083.contract_amount || 0)).toLocaleString()}`);
    console.log();

    // Get all payments for this contract
    const { data: payments0083 } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', calf0083.id)
      .order('payment_date', { ascending: false });

    if (payments0083 && payments0083.length > 0) {
      console.log(`Total Payments: ${payments0083.length}`);
      console.log('Payments:');
      payments0083.forEach((p, idx) => {
        const isSuspicious = p.payment_number === 'PAY-1764450953636';
        console.log(`  ${isSuspicious ? '⚠️ ' : '  '}${idx + 1}. ${p.payment_number}`);
        console.log(`     Amount: QAR ${p.amount?.toLocaleString() || 0}`);
        console.log(`     Date: ${p.payment_date || 'N/A'}`);
        if (p.notes) console.log(`     Notes: ${p.notes}`);
      });
    }
  }
  console.log();

  // Investigate LTO2024103
  console.log('─'.repeat(80));
  console.log('2. CONTRACT: LTO2024103');
  console.log('─'.repeat(80));

  const { data: lto2024103 } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', 'LTO2024103')
    .single();

  if (lto2024103) {
    console.log(`Contract ID: ${lto2024103.id}`);
    console.log(`Contract Amount: QAR ${lto2024103.contract_amount?.toLocaleString() || 0}`);
    console.log(`Total Paid: QAR ${lto2024103.total_paid?.toLocaleString() || 0}`);
    console.log(`Balance Due: QAR ${lto2024103.balance_due?.toLocaleString() || 0}`);
    console.log(`Overpayment: QAR ${((lto2024103.total_paid || 0) - (lto2024103.contract_amount || 0)).toLocaleString()}`);
    console.log();

    // Get all payments for this contract
    const { data: paymentsLto } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', lto2024103.id)
      .order('amount', { ascending: false });

    if (paymentsLto && paymentsLto.length > 0) {
      console.log(`Total Payments: ${paymentsLto.length}`);
      console.log('Payments (sorted by amount):');
      paymentsLto.forEach((p, idx) => {
        const isLarge = (p.amount || 0) > 10000;
        console.log(`  ${isLarge ? '⚠️ ' : '  '}${idx + 1}. ${p.payment_number}`);
        console.log(`     Amount: QAR ${p.amount?.toLocaleString() || 0}`);
        console.log(`     Date: ${p.payment_date || 'N/A'}`);
        if (p.notes) console.log(`     Notes: ${p.notes}`);
      });
    }
  }
  console.log();

  // Check for the suspicious payment PAY-1764450953636
  console.log('─'.repeat(80));
  console.log('3. SUSPICIOUS PAYMENT DETAILS');
  console.log('─'.repeat(80));

  const { data: suspiciousPayment } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_number', 'PAY-1764450953636')
    .single();

  if (suspiciousPayment) {
    console.log(`Payment Number: ${suspiciousPayment.payment_number}`);
    console.log(`Payment ID: ${suspiciousPayment.id}`);
    console.log(`Amount: QAR ${suspiciousPayment.amount?.toLocaleString() || 0}`);
    console.log(`Contract ID: ${suspiciousPayment.contract_id}`);
    console.log(`Date: ${suspiciousPayment.payment_date || 'N/A'}`);
    console.log(`Notes: ${suspiciousPayment.notes || 'None'}`);
  }

  // Check for the other suspicious payment PAY-1765019078389
  console.log();
  const { data: suspiciousPayment2 } = await supabase
    .from('payments')
    .select('*')
    .eq('payment_number', 'PAY-1765019078389')
    .single();

  if (suspiciousPayment2) {
    console.log(`Payment Number: ${suspiciousPayment2.payment_number}`);
    console.log(`Payment ID: ${suspiciousPayment2.id}`);
    console.log(`Amount: QAR ${suspiciousPayment2.amount?.toLocaleString() || 0}`);
    console.log(`Contract ID: ${suspiciousPayment2.contract_id}`);
    console.log(`Date: ${suspiciousPayment2.payment_date || 'N/A'}`);
    console.log(`Notes: ${suspiciousPayment2.notes || 'None'}`);

    // Get contract details
    const { data: contractForSuspicious2 } = await supabase
      .from('contracts')
      .select('contract_number, contract_amount, total_paid')
      .eq('id', suspiciousPayment2.contract_id)
      .single();

    if (contractForSuspicious2) {
      console.log(`Contract: ${contractForSuspicious2.contract_number}`);
      console.log(`Contract Amount: QAR ${contractForSuspicious2.contract_amount?.toLocaleString() || 0}`);
      console.log(`Total Paid: QAR ${contractForSuspicious2.total_paid?.toLocaleString() || 0}`);
    }
  }

  console.log();
  console.log('='.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('='.repeat(80));
}

investigateNewHighSeverity().catch(console.error);
