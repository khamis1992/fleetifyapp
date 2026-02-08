/**
 * Check Contract C-ALF-0066 Total Calculation
 * فحص حساب إجمالي قيمة العقد C-ALF-0066
 */

import { createClient } from '@supabase/supabase-js';
import { differenceInMonths } from 'date-fns';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkContract() {
  console.log('🔍 Checking contract C-ALF-0066...\n');

  // First, search for similar contract numbers
  const { data: similarContracts, error: searchError } = await supabase
    .from('contracts')
    .select('contract_number, id, status, monthly_amount')
    .ilike('contract_number', '%0066%')
    .limit(20);

  if (searchError) {
    console.error('❌ Error searching contracts:', searchError);
  } else if (similarContracts && similarContracts.length > 0) {
    console.log('🔍 Found contracts containing "0066":');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    similarContracts.forEach(c => {
      console.log(`  ${c.contract_number} - ${c.status} - ${c.monthly_amount} QAR`);
    });
    console.log('');
  } else {
    console.log('⚠️  No contracts found containing "0066"');
    console.log('');
  }

  // Get contract details
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('contract_number', 'C-ALF-0066')
    .maybeSingle();

  if (contractError) {
    console.error('❌ Error fetching contract:', contractError);
    return;
  }

  if (!contract) {
    console.error('❌ Contract not found!');
    return;
  }

  console.log('📋 Contract Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Contract Number: ${contract.contract_number}`);
  console.log(`Status: ${contract.status}`);
  console.log(`Monthly Amount: ${contract.monthly_amount} QAR`);
  console.log(`Start Date: ${contract.start_date}`);
  console.log(`End Date: ${contract.end_date}`);
  console.log(`Deposit: ${contract.deposit_amount || 0} QAR`);
  console.log(`Insurance: ${contract.insurance_amount || 0} QAR`);
  console.log('');

  // Calculate contract duration
  const startDate = new Date(contract.start_date);
  const endDate = new Date(contract.end_date);
  const months = Math.max(1, differenceInMonths(endDate, startDate) + 1);
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  console.log('📊 Duration Calculation:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Days: ${days} days`);
  console.log(`Months: ${months} months`);
  console.log('');

  // Calculate monthly payment
  const monthlyRate = contract.monthly_amount || 0;
  const insuranceFees = contract.insurance_amount || 0;
  const serviceFees = 0; // Not stored separately in this contract
  const taxRate = 0; // Qatar doesn't have rental tax

  const subtotal = monthlyRate + insuranceFees + serviceFees;
  const tax = subtotal * taxRate;
  const totalMonthly = subtotal + tax;

  console.log('💰 Monthly Payment Breakdown:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Base Rate: ${monthlyRate.toLocaleString('en-US')} QAR`);
  console.log(`Insurance Fees: ${insuranceFees.toLocaleString('en-US')} QAR`);
  console.log(`Service Fees: ${serviceFees.toLocaleString('en-US')} QAR`);
  console.log(`Subtotal: ${subtotal.toLocaleString('en-US')} QAR`);
  console.log(`Tax (${taxRate * 100}%): ${tax.toLocaleString('en-US')} QAR`);
  console.log(`Total Monthly: ${totalMonthly.toLocaleString('en-US')} QAR`);
  console.log('');

  // Calculate total contract value
  const totalContractValue = totalMonthly * months;

  console.log('🎯 Total Contract Value:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Formula: ${totalMonthly.toLocaleString('en-US')} QAR × ${months} months`);
  console.log(`Total: ${totalContractValue.toLocaleString('en-US')} QAR`);
  console.log('');

  // Get invoices
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', contract.id)
    .order('invoice_date');

  if (invoicesError) {
    console.error('❌ Error fetching invoices:', invoicesError);
  } else {
    console.log('📄 Invoices Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Invoices: ${invoices?.length || 0}`);
    
    if (invoices && invoices.length > 0) {
      const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      const balance = totalInvoiced - totalPaid;

      console.log(`Total Invoiced: ${totalInvoiced.toLocaleString('en-US')} QAR`);
      console.log(`Total Paid: ${totalPaid.toLocaleString('en-US')} QAR`);
      console.log(`Balance Due: ${balance.toLocaleString('en-US')} QAR`);
      console.log('');

      console.log('📋 Invoice Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      invoices.forEach((inv, idx) => {
        console.log(`${idx + 1}. ${inv.invoice_number}`);
        console.log(`   Date: ${inv.invoice_date}`);
        console.log(`   Amount: ${(inv.total_amount || 0).toLocaleString('en-US')} QAR`);
        console.log(`   Paid: ${(inv.paid_amount || 0).toLocaleString('en-US')} QAR`);
        console.log(`   Status: ${inv.payment_status}`);
        console.log('');
      });
    }
  }

  // Verification
  console.log('✅ Verification:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (invoices && invoices.length > 0) {
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const difference = Math.abs(totalContractValue - totalInvoiced);
    
    if (difference < 1) {
      console.log('✅ Total contract value matches invoiced amount!');
    } else {
      console.log(`⚠️  Difference found: ${difference.toLocaleString('en-US')} QAR`);
      console.log(`   Expected: ${totalContractValue.toLocaleString('en-US')} QAR`);
      console.log(`   Invoiced: ${totalInvoiced.toLocaleString('en-US')} QAR`);
    }
  } else {
    console.log(`Expected Total: ${totalContractValue.toLocaleString('en-US')} QAR`);
    console.log('⚠️  No invoices found to compare');
  }
}

checkContract().catch(console.error);
