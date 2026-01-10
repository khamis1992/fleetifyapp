/**
 * Verify Payment Fixes
 *
 * Check if the payment fixes were actually applied
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

async function verifyFixes() {
  console.log('='.repeat(80));
  console.log('VERIFYING PAYMENT FIXES');
  console.log('='.repeat(80));
  console.log();

  // Check C-ALF-0001
  console.log('C-ALF-0001:');
  const { data: calfl0001Payments } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', 'd2311c7b-6d1d-48ec-8716-3d3efad22a52')
    .order('amount', { ascending: false });

  if (calfl0001Payments) {
    console.log(`  Total payments: ${calfl0001Payments.length}`);
    console.log(`  Total amount: QAR ${calfl0001Payments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}`);
    console.log('  Payments:');
    calfl0001Payments.forEach(p => {
      const isLarge = (p.amount || 0) > 10000;
      console.log(`    ${isLarge ? '⚠️' : '  '} ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()}`);
    });
  }
  console.log();

  // Check C-ALF-0068
  console.log('C-ALF-0068:');
  const { data: calfl0068Payments } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', 'd6084b0f-4e5f-4f78-a0e1-c45df2da39b0')
    .order('amount', { ascending: false });

  if (calfl0068Payments) {
    console.log(`  Total payments: ${calfl0068Payments.length}`);
    console.log(`  Total amount: QAR ${calfl0068Payments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}`);
    console.log('  Payments:');
    calfl0068Payments.forEach(p => {
      const isLarge = (p.amount || 0) > 10000;
      console.log(`    ${isLarge ? '⚠️' : '  '} ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()}`);
    });
  }
  console.log();

  // Try to find the actual IDs for the suspicious payments
  console.log('─'.repeat(80));
  console.log('SEARCHING FOR SUSPICIOUS PAYMENTS BY NUMBER');
  console.log('─'.repeat(80));
  console.log();

  const suspiciousNumbers = ['PAY-IMP-1767526937-63', 'PAY-IMP-1767526937-72'];

  for (const num of suspiciousNumbers) {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_number', num)
      .single();

    if (payment) {
      console.log(`${num}:`);
      console.log(`  ID: ${payment.id}`);
      console.log(`  Amount: QAR ${(payment.amount || 0).toLocaleString()}`);
      console.log(`  Contract ID: ${payment.contract_id}`);
    } else {
      console.log(`${num}: NOT FOUND`);
    }
    console.log();
  }

  console.log('='.repeat(80));
}

verifyFixes().catch(console.error);
