/**
 * Investigation Script for Contract C-ALF-0085 Overpayment Issue
 *
 * This script investigates why contract C-ALF-0085 shows QAR 35,920 in payments
 * when the contract amount is only QAR 20,800 (overpayment of QAR 15,120)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Contract details
const CONTRACT_NUMBER = 'C-ALF-0085';
const CONTRACT_ID = 'c986eade-48f6-4d23-8eea-31d294f3b8bf';
const CUSTOMER_ID = '2a898340-79f6-455f-b2b9-4ab785b94efc';
const COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';

// Load environment variables
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
      // File doesn't exist or can't be read, continue
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

// Debug logging
console.error('Debug: supabaseUrl =', supabaseUrl);
console.error('Debug: supabaseKey length =', supabaseKey?.length);
console.error('Debug: supabaseUrl starts with https:', supabaseUrl.startsWith('https://'));

if (!supabaseUrl) {
  console.error('Missing SUPABASE_URL or VITE_SUPABASE_URL in .env file');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or VITE_SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  payment_method: string;
  invoice_id: string | null;
  contract_id: string | null;
  customer_id: string | null;
  notes: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  contract_id: string;
}

interface RentalReceipt {
  id: string;
  customer_id: string;
  contract_id: string;
  month: number;
  total_paid: number;
  fine: number;
  payment_date: string;
  created_at: string;
}

async function investigate() {
  console.log('='.repeat(80));
  console.log('INVESTIGATION: Contract C-ALF-0085 Overpayment Issue');
  console.log('='.repeat(80));
  console.log();

  // Get contract details first
  console.log('📋 CONTRACT DETAILS:');
  console.log('-'.repeat(80));
  const { data: contract } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', CONTRACT_NUMBER)
    .single();

  if (contract) {
    console.log(`Contract Number: ${contract.contract_number}`);
    console.log(`Contract ID: ${contract.id}`);
    console.log(`Customer ID: ${contract.customer_id}`);
    console.log(`Contract Amount: QAR ${contract.contract_amount?.toLocaleString()}`);
    console.log(`Total Paid (stored): QAR ${contract.total_paid?.toLocaleString() || 0}`);
    console.log(`Balance Due: QAR ${contract.balance_due?.toLocaleString() || 0}`);
    console.log(`Monthly Amount: QAR ${contract.monthly_amount?.toLocaleString()}`);
    console.log(`Start Date: ${contract.start_date}`);
    console.log(`End Date: ${contract.end_date}`);
    console.log(`Status: ${contract.status}`);
  } else {
    console.log('Contract not found!');
    return;
  }
  console.log();

  // Query 1: Direct contract-linked payments
  console.log('💳 QUERY 1: Payments linked directly to contract (contract_id)');
  console.log('-'.repeat(80));
  const { data: directPayments, error: directError } = await supabase
    .from('payments')
    .select('*')
    .eq('contract_id', CONTRACT_ID)
    .order('payment_date', { ascending: false });

  if (directError) {
    console.log('Error:', directError.message);
  } else {
    console.log(`Found ${directPayments?.length || 0} direct contract payments:`);
    let total = 0;
    directPayments?.forEach((p: Payment) => {
      total += p.amount || 0;
      console.log(`  - ${p.payment_number}: QAR ${p.amount?.toLocaleString()} | ${p.payment_date} | Status: ${p.payment_status} | Invoice: ${p.invoice_id || 'none'}`);
    });
    console.log(`  TOTAL: QAR ${total.toLocaleString()}`);
  }
  console.log();

  // Query 2: Invoice-linked payments
  console.log('📄 QUERY 2: Payments linked via invoices');
  console.log('-'.repeat(80));
  const { data: invoicePayments, error: invoiceError } = await supabase
    .from('payments')
    .select(`
      id,
      payment_number,
      amount,
      payment_date,
      payment_status,
      invoice_id,
      invoices (
        invoice_number,
        contract_id
      )
    `)
    .not('invoice_id', 'is', null)
    .order('payment_date', { ascending: false });

  if (invoiceError) {
    console.log('Error:', invoiceError.message);
  } else {
    const filteredForContract = invoicePayments?.filter((p: any) =>
      p.invoices?.contract_id === CONTRACT_ID
    );
    console.log(`Found ${filteredForContract?.length || 0} invoice-linked payments for this contract:`);
    let total = 0;
    filteredForContract?.forEach((p: any) => {
      total += p.amount || 0;
      console.log(`  - ${p.payment_number}: QAR ${p.amount?.toLocaleString()} | ${p.payment_date} | Invoice: ${p.invoices?.invoice_number}`);
    });
    console.log(`  TOTAL: QAR ${total.toLocaleString()}`);
  }
  console.log();

  // Query 3: Rental payment receipts
  console.log('🧾 QUERY 3: Rental payment receipts');
  console.log('-'.repeat(80));
  const { data: rentalReceipts, error: rentalError } = await supabase
    .from('rental_payment_receipts')
    .select('*')
    .eq('contract_id', CONTRACT_ID)
    .order('payment_date', { ascending: false });

  if (rentalError) {
    console.log('Error:', rentalError.message);
  } else {
    console.log(`Found ${rentalReceipts?.length || 0} rental payment receipts:`);
    let total = 0;
    rentalReceipts?.forEach((r: RentalReceipt) => {
      const amount = (r.total_paid || 0) + (r.fine || 0);
      total += amount;
      console.log(`  - Receipt ${r.id}: Month ${r.month} | QAR ${amount.toLocaleString()} | ${r.payment_date} | Fine: QAR ${r.fine || 0}`);
    });
    console.log(`  TOTAL: QAR ${total.toLocaleString()}`);
  }
  console.log();

  // Query 4: Customer-level payments (no contract specified)
  console.log('👤 QUERY 4: Customer payments with NO contract link');
  console.log('-'.repeat(80));
  const { data: customerPayments, error: customerError } = await supabase
    .from('payments')
    .select('*')
    .eq('customer_id', CUSTOMER_ID)
    .is('contract_id', null)
    .order('payment_date', { ascending: false });

  if (customerError) {
    console.log('Error:', customerError.message);
  } else {
    console.log(`Found ${customerPayments?.length || 0} customer payments without contract link:`);
    let total = 0;
    customerPayments?.forEach((p: Payment) => {
      total += p.amount || 0;
      console.log(`  - ${p.payment_number}: QAR ${p.amount?.toLocaleString()} | ${p.payment_date} | Invoice: ${p.invoice_id || 'none'}`);
    });
    console.log(`  TOTAL: QAR ${total.toLocaleString()}`);
  }
  console.log();

  // Query 5: All invoices for this contract
  console.log('📊 QUERY 5: All invoices for this contract');
  console.log('-'.repeat(80));
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', CONTRACT_ID)
    .order('invoice_date', { ascending: false });

  if (invoicesError) {
    console.log('Error:', invoicesError.message);
  } else {
    console.log(`Found ${invoices?.length || 0} invoices:`);
    let totalContract = 0;
    let totalPaid = 0;
    invoices?.forEach((inv: Invoice) => {
      totalContract += inv.total_amount || 0;
      totalPaid += inv.paid_amount || 0;
      console.log(`  - ${inv.invoice_number}: QAR ${inv.total_amount?.toLocaleString()} | Paid: QAR ${inv.paid_amount?.toLocaleString()} | Balance: QAR ${inv.balance_due?.toLocaleString()} | Status: ${inv.payment_status}`);
    });
    console.log(`  CONTRACT TOTAL: QAR ${totalContract.toLocaleString()}`);
    console.log(`  TOTAL PAID ON INVOICES: QAR ${totalPaid.toLocaleString()}`);
  }
  console.log();

  // Summary Analysis
  console.log('='.repeat(80));
  console.log('📈 SUMMARY ANALYSIS');
  console.log('='.repeat(80));

  const directTotal = directPayments?.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0) || 0;
  const invoiceTotal = invoicePayments
    ?.filter((p: any) => p.invoices?.contract_id === CONTRACT_ID)
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
  const rentalTotal = rentalReceipts?.reduce((sum: number, r: RentalReceipt) =>
    sum + (r.total_paid || 0) + (r.fine || 0), 0) || 0;
  const customerTotal = customerPayments?.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0) || 0;

  console.log(`Contract Amount:           QAR ${contract?.contract_amount?.toLocaleString() || 0}`);
  console.log(`Stored Total Paid:          QAR ${contract?.total_paid?.toLocaleString() || 0}`);
  console.log(`Stored Balance Due:         QAR ${contract?.balance_due?.toLocaleString() || 0}`);
  console.log();
  console.log(`Direct Payments:            QAR ${directTotal.toLocaleString()} (${directPayments?.length || 0} records)`);
  console.log(`Invoice-linked Payments:    QAR ${invoiceTotal.toLocaleString()}`);
  console.log(`Rental Receipts:            QAR ${rentalTotal.toLocaleString()} (${rentalReceipts?.length || 0} records)`);
  console.log(`Customer (no contract):     QAR ${customerTotal.toLocaleString()} (${customerPayments?.length || 0} records)`);
  console.log();

  const calculatedTotal = directTotal + invoiceTotal + customerTotal;
  console.log(`CALCULATED TOTAL (direct + invoice + customer): QAR ${calculatedTotal.toLocaleString()}`);

  if (Math.abs(calculatedTotal - (contract?.total_paid || 0)) > 1) {
    console.log(`⚠️  DISCREPANCY: Calculated total differs from stored total by QAR ${Math.abs(calculatedTotal - (contract?.total_paid || 0)).toLocaleString()}`);
  }

  if (rentalTotal > 0) {
    console.log(`⚠️  RENTAL RECEIPTS: QAR ${rentalTotal.toLocaleString()} in rental receipts may be counted separately!`);
  }

  console.log();
  console.log('='.repeat(80));
}

// Run investigation
investigate().then(() => {
  console.log('✅ Investigation complete!');
}).catch((error) => {
  console.error('❌ Error during investigation:', error);
  process.exit(1);
});
