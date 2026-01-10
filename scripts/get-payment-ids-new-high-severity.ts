/**
 * Get Payment IDs for New High Severity Contracts
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

async function getPaymentIds() {
  // Get LTO2024103 payment IDs
  const { data: ltoPayments } = await supabase
    .from('payments')
    .select('id, payment_number, amount')
    .eq('contract_id', '4f461fb4-b2af-482c-9a4d-2f081c5386e8');

  console.log('LTO2024103 Payment IDs:');
  if (ltoPayments) {
    ltoPayments.forEach(p => {
      console.log(`  ${p.payment_number}: ${p.id} (QAR ${p.amount})`);
    });
  }

  console.log();

  // Get C-ALF-0083 payment IDs for the duplicate payments
  const { data: calfPayments } = await supabase
    .from('payments')
    .select('id, payment_number, amount')
    .eq('contract_id', 'b0051de5-494e-4a45-bc37-d3374384abb5')
    .in('payment_number', [
      'PAY-1758229515485-93',
      'PAY-1758229515521-2099',
      'PAY-1758229515497-612',
      'PAY-1758229515505-1126',
      'PAY-1758229515488-269',
      'PAY-1758229515515-1620',
      'PAY-1758229515488-252'
    ]);

  console.log('C-ALF-0083 Duplicate Payment IDs to Cancel:');
  if (calfPayments) {
    calfPayments.forEach(p => {
      console.log(`  ${p.payment_number}: ${p.id} (QAR ${p.amount})`);
    });
  }
}

getPaymentIds().catch(console.error);
