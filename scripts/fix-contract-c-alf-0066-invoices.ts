/**
 * Fix Contract C-ALF-0066 Invoices
 * إصلاح فواتير العقد C-ALF-0066
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixContractInvoices() {
  console.log('🔧 Starting invoice fix for contract C-ALF-0066...\n');

  // Get contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', 'C-ALF-0066')
    .single();

  if (contractError || !contract) {
    console.error('❌ Contract not found:', contractError);
    return;
  }

  console.log(`✅ Found contract: ${contract.contract_number}`);
  console.log(`   Company ID: ${contract.company_id}`);
  console.log(`   Customer ID: ${contract.customer_id}`);
  console.log('');

  // Check existing invoice types
  const { data: sampleInvoice } = await supabase
    .from('invoices')
    .select('invoice_type')
    .eq('contract_id', contract.id)
    .limit(1)
    .single();

  console.log(`📋 Sample invoice_type: ${sampleInvoice?.invoice_type || 'N/A'}`);
  console.log('');

  // ==========================================
  // Step 1: Delete duplicate invoices
  // ==========================================
  console.log('📋 Step 1: Deleting duplicate invoices...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Delete duplicate March 2024 invoice (unpaid)
  const { error: delete1Error } = await supabase
    .from('invoices')
    .delete()
    .eq('invoice_number', 'INV-C-ALF-0066-2024-03')
    .eq('contract_id', contract.id)
    .eq('payment_status', 'unpaid')
    .eq('paid_amount', 0);

  if (delete1Error) {
    console.log('⚠️  Error deleting INV-C-ALF-0066-2024-03:', delete1Error.message);
  } else {
    console.log('✅ Deleted duplicate: INV-C-ALF-0066-2024-03');
  }

  // Delete duplicate January 2025 invoice (unpaid)
  const { error: delete2Error } = await supabase
    .from('invoices')
    .delete()
    .eq('invoice_number', 'INV-R-C-ALF-0066-202501')
    .eq('contract_id', contract.id)
    .eq('payment_status', 'unpaid')
    .eq('paid_amount', 0);

  if (delete2Error) {
    console.log('⚠️  Error deleting INV-R-C-ALF-0066-202501:', delete2Error.message);
  } else {
    console.log('✅ Deleted duplicate: INV-R-C-ALF-0066-202501');
  }

  console.log('');

  // ==========================================
  // Step 2: Create missing invoices
  // ==========================================
  console.log('📋 Step 2: Creating missing invoices...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const missingInvoices = [
    { month: '2023-12', number: 'INV-C-ALF-0066-2023-12', date: '2023-12-22', note: '(من تاريخ بداية العقد)' },
    { month: '2026-03', number: 'INV-C-ALF-0066-2026-03', date: '2026-03-01', note: '' },
    { month: '2026-04', number: 'INV-C-ALF-0066-2026-04', date: '2026-04-01', note: '' },
    { month: '2026-05', number: 'INV-C-ALF-0066-2026-05', date: '2026-05-01', note: '' },
    { month: '2026-06', number: 'INV-C-ALF-0066-2026-06', date: '2026-06-01', note: '' },
    { month: '2026-07', number: 'INV-C-ALF-0066-2026-07', date: '2026-07-01', note: '' },
    { month: '2026-08', number: 'INV-C-ALF-0066-2026-08', date: '2026-08-01', note: '' },
    { month: '2026-09', number: 'INV-C-ALF-0066-2026-09', date: '2026-09-01', note: '' },
    { month: '2026-10', number: 'INV-C-ALF-0066-2026-10', date: '2026-10-01', note: '' },
    { month: '2026-11', number: 'INV-C-ALF-0066-2026-11', date: '2026-11-01', note: '' },
    { month: '2026-12', number: 'INV-C-ALF-0066-2026-12', date: '2026-12-01', note: '' },
  ];

  let created = 0;
  let skipped = 0;

  for (const inv of missingInvoices) {
    const invoiceDate = inv.date || `${inv.month}-01`;
    
    // Check if invoice already exists
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('contract_id', contract.id)
      .gte('invoice_date', invoiceDate)
      .lt('invoice_date', `${inv.month}-31`)
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  Skipped ${inv.month}: Invoice already exists`);
      skipped++;
      continue;
    }

    // Create invoice
    console.log(`   Creating ${inv.number} with date: ${invoiceDate}`);
    
    const { error: createError } = await supabase
      .from('invoices')
      .insert({
        company_id: contract.company_id,
        customer_id: contract.customer_id,
        contract_id: contract.id,
        invoice_number: inv.number,
        invoice_date: invoiceDate,
        due_date: invoiceDate,
        total_amount: 1500,
        subtotal: 1500,
        balance_due: 1500,
        paid_amount: 0,
        status: 'sent',
        payment_status: 'unpaid',
        invoice_type: 'sales',
        currency: 'QAR',
        notes: `فاتورة إيجار شهرية - ${inv.month} - عقد #C-ALF-0066 ${inv.note}`,
      });

    if (createError) {
      console.log(`❌ Error creating ${inv.month}: ${createError.message}`);
    } else {
      console.log(`✅ Created: ${inv.number} ${inv.note}`);
      created++;
    }
  }

  console.log('');
  console.log(`📊 Summary: Created ${created}, Skipped ${skipped}`);
  console.log('');

  // ==========================================
  // Step 3: Verification
  // ==========================================
  console.log('📋 Step 3: Verification...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const { data: allInvoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', contract.id)
    .order('invoice_date');

  if (invoicesError) {
    console.error('❌ Error fetching invoices:', invoicesError);
    return;
  }

  const totalInvoices = allInvoices?.length || 0;
  const totalAmount = allInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
  const totalPaid = allInvoices?.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0) || 0;
  const balance = totalAmount - totalPaid;

  console.log(`Total Invoices: ${totalInvoices} (Expected: 37)`);
  console.log(`Total Amount: ${totalAmount.toLocaleString('en-US')} QAR (Expected: 55,500 QAR)`);
  console.log(`Total Paid: ${totalPaid.toLocaleString('en-US')} QAR`);
  console.log(`Balance Due: ${balance.toLocaleString('en-US')} QAR`);
  console.log('');

  if (totalInvoices === 37 && totalAmount === 55500) {
    console.log('✅ SUCCESS! Contract invoices fixed correctly!');
    console.log('✅ نجح الإصلاح! جميع الفواتير صحيحة الآن!');
  } else {
    console.log('⚠️  WARNING: Numbers don\'t match expected values');
    console.log(`   Expected: 37 invoices, 55,500 QAR`);
    console.log(`   Got: ${totalInvoices} invoices, ${totalAmount.toLocaleString('en-US')} QAR`);
  }
}

fixContractInvoices().catch(console.error);
