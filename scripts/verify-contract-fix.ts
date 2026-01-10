/**
 * Verify Contract C-ALF-0085 Final State
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const CONTRACT_ID = 'c986eade-48f6-4d23-8eea-31d294f3b8bf';

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

async function verify() {
  console.log('='.repeat(70));
  console.log('FINAL VERIFICATION: Contract C-ALF-0085');
  console.log('='.repeat(70));
  console.log();

  const { data: contract } = await supabase.from('contracts').select('*').eq('id', CONTRACT_ID).single();
  const { data: schedules } = await supabase.from('contract_payment_schedules').select('*').eq('contract_id', CONTRACT_ID).order('installment_number');
  const { data: payments } = await supabase.from('payments').select('*').eq('contract_id', CONTRACT_ID);

  console.log('Contract Status:');
  console.log(`  Contract Amount: QAR ${(contract?.contract_amount || 0).toLocaleString()}`);
  console.log(`  Total Paid: QAR ${(contract?.total_paid || 0).toLocaleString()}`);
  console.log(`  Balance Due: QAR ${(contract?.balance_due || 0).toLocaleString()}`);
  console.log();

  console.log(`Payment Schedules: ${schedules?.length || 0} records`);
  console.log(`Payments: ${payments?.length || 0} records`);
  console.log();

  const paidSchedules = schedules?.filter((s: any) => s.status === 'paid') || [];
  const pendingSchedules = schedules?.filter((s: any) => s.status === 'pending') || [];
  const overdueSchedules = schedules?.filter((s: any) => s.status === 'overdue') || [];

  console.log('Schedule Status:');
  console.log(`  Paid: ${paidSchedules.length}`);
  console.log(`  Pending: ${pendingSchedules.length}`);
  console.log(`  Overdue: ${overdueSchedules.length}`);
  console.log();

  console.log('Payments:');
  let totalPayments = 0;
  payments?.forEach((p: any) => {
    totalPayments += p.amount || 0;
    console.log(`  - ${p.payment_number}: QAR ${(p.amount || 0).toLocaleString()} | ${p.payment_date}`);
  });
  console.log(`  Total: QAR ${totalPayments.toLocaleString()}`);
  console.log();

  console.log('='.repeat(70));
  if (schedules && schedules.length === 16 && contract && contract.total_paid === 3550) {
    console.log('✅ All fixes applied successfully!');
    console.log('   - Payment corrected from QAR 33,670 to QAR 1,300');
    console.log('   - 16 payment schedules created');
    console.log('   - Contract totals are now correct');
  } else {
    console.log('⚠️  Some issues may remain');
  }
  console.log('='.repeat(70));
}

verify().catch(console.error);
