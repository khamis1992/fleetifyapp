/**
 * Debug script to investigate contract C-ALF-0085
 * This will query invoices and payment schedules for this contract
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qwhunliohlkkahbspfiu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHVubGlvaGxra2FoYnNwZml1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQxMzA4NiwiZXhwIjoyMDY4OTg5MDg2fQ.vw3DWeoAyLSe_0MLQPFgSu-TL28W8mbTx7tEfhKe6Zg';

const supabase = createClient(supabaseUrl, supabaseKey);
const companyId = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const contractNumber = 'C-ALF-0085';

async function investigateContract() {
  console.log('=== Investigating Contract C-ALF-0085 ===\n');

  try {
    // 1. Get contract details
    console.log('1. Fetching contract details...');
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('*')
      .eq('contract_number', contractNumber)
      .eq('company_id', companyId)
      .single();

    if (contractError) {
      console.error('Error fetching contract:', contractError);
      return;
    }

    console.log('CONTRACT FOUND:');
    console.log('- Contract Number:', contract.contract_number);
    console.log('- Customer ID:', contract.customer_id);
    console.log('- Vehicle ID:', contract.vehicle_id);
    console.log('- Total Amount:', contract.contract_amount);
    console.log('- Monthly Amount:', contract.monthly_amount);
    console.log('- Start Date:', contract.start_date);
    console.log('- End Date:', contract.end_date);
    console.log('- Status:', contract.status);
    console.log('- Contract Type:', contract.contract_type);
    console.log('');

    // 2. Get invoices for this contract
    console.log('2. Fetching invoices (الفواتير)...');
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contract.id)
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: true });

    if (invoicesError) {
      console.error('Error fetching invoices:', invoicesError);
    } else {
      console.log(`Found ${invoices.length} invoices:`);
      let totalInvoiceAmount = 0;
      invoices.forEach((inv, index) => {
        console.log(`\n  Invoice ${index + 1}:`);
        console.log('  - Number:', inv.invoice_number);
        console.log('  - Date:', inv.invoice_date);
        console.log('  - Amount:', inv.total_amount);
        console.log('  - Status:', inv.status);
        console.log('  - Due Date:', inv.due_date);
        totalInvoiceAmount += inv.total_amount || 0;
      });
      console.log(`\n  TOTAL INVOICE AMOUNT: ${totalInvoiceAmount}`);
    }
    console.log('');

    // 3. Get payment schedules for this contract
    console.log('3. Fetching payment schedules (جدول الدفعات)...');
    const { data: paymentSchedules, error: schedulesError } = await supabase
      .from('payment_schedules')
      .select('*')
      .eq('contract_id', contract.id)
      .eq('company_id', companyId)
      .order('scheduled_date', { ascending: true });

    if (schedulesError) {
      console.error('Error fetching payment schedules:', schedulesError);
    } else {
      console.log(`Found ${paymentSchedules.length} payment schedules:`);
      let totalScheduleAmount = 0;
      paymentSchedules.forEach((sched, index) => {
        console.log(`\n  Schedule ${index + 1}:`);
        console.log('  - Scheduled Date:', sched.scheduled_date);
        console.log('  - Amount:', sched.amount);
        console.log('  - Status:', sched.status);
        console.log('  - Payment Date:', sched.payment_date || 'Not paid');
        totalScheduleAmount += sched.amount || 0;
      });
      console.log(`\n  TOTAL SCHEDULE AMOUNT: ${totalScheduleAmount}`);
    }
    console.log('');

    // 4. Get payments for this contract
    console.log('4. Fetching payments...');
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('contract_id', contract.id)
      .eq('company_id', companyId)
      .order('payment_date', { ascending: true });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    } else {
      console.log(`Found ${payments.length} payments:`);
      let totalPaidAmount = 0;
      payments.forEach((pay, index) => {
        console.log(`\n  Payment ${index + 1}:`);
        console.log('  - Date:', pay.payment_date);
        console.log('  - Amount:', pay.amount);
        console.log('  - Status:', pay.payment_status);
        console.log('  - Method:', pay.payment_method);
        totalPaidAmount += pay.amount || 0;
      });
      console.log(`\n  TOTAL PAID AMOUNT: ${totalPaidAmount}`);
    }
    console.log('');

    // 5. Summary comparison
    console.log('=== SUMMARY COMPARISON ===');
    console.log('Contract Total Amount:', contract.contract_amount);
    console.log('');
    console.log('INVOICES SECTION:');
    console.log(`  - Count: ${invoices?.length || 0}`);
    console.log(`  - Total: ${invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0}`);
    console.log('');
    console.log('PAYMENT SCHEDULES SECTION:');
    console.log(`  - Count: ${paymentSchedules?.length || 0}`);
    console.log(`  - Total: ${paymentSchedules?.reduce((sum, sched) => sum + (sched.amount || 0), 0) || 0}`);
    console.log('');
    console.log('PAYMENTS:');
    console.log(`  - Count: ${payments?.length || 0}`);
    console.log(`  - Total: ${payments?.reduce((sum, pay) => sum + (pay.amount || 0), 0) || 0}`);

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

investigateContract();
