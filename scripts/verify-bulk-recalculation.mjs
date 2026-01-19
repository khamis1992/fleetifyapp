#!/usr/bin/env node

/**
 * Verification Script: Bulk Recalculation Migration
 * 
 * This script verifies that all rental payment receipts have been correctly
 * recalculated to match their associated contract monthly amounts.
 * 
 * Usage: node verify-bulk-recalculation.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Starting Bulk Recalculation Verification...\n');

async function verifyRecalculation() {
  try {
    // 1. Check for inconsistencies between receipts and contracts
    console.log('1️⃣ Checking for inconsistencies...');
    const { data: inconsistencies, error: inconsistencyError } = await supabase
      .from('rental_payment_receipts')
      .select(`
        id,
        customer_name,
        rent_amount,
        contracts!inner(monthly_amount, status)
      `)
      .eq('contracts.status', 'active');

    if (inconsistencyError) {
      console.error('❌ Error checking inconsistencies:', inconsistencyError.message);
      return false;
    }

    const wrongRents = inconsistencies?.filter(r => 
      r.rent_amount !== r.contracts.monthly_amount
    ) || [];

    if (wrongRents.length > 0) {
      console.error(`❌ Found ${wrongRents.length} receipts with incorrect rent amounts:`);
      wrongRents.forEach(r => {
        console.error(`   - Receipt ${r.id}: ${r.customer_name}`);
        console.error(`     Receipt rent: ${r.rent_amount}, Contract rent: ${r.contracts.monthly_amount}`);
      });
      return false;
    } else {
      console.log('✅ All receipts have correct rent amounts\n');
    }

    // 2. Verify calculation accuracy
    console.log('2️⃣ Verifying calculation accuracy...');
    const { data: allReceipts, error: receiptsError } = await supabase
      .from('rental_payment_receipts')
      .select('id, customer_name, rent_amount, fine, amount_due, total_paid, pending_balance, payment_status');

    if (receiptsError) {
      console.error('❌ Error fetching receipts:', receiptsError.message);
      return false;
    }

    let calculationErrors = 0;
    allReceipts?.forEach(receipt => {
      const expectedAmountDue = receipt.rent_amount + receipt.fine;
      const expectedPendingBalance = Math.max(0, expectedAmountDue - receipt.total_paid);
      const expectedStatus = 
        expectedPendingBalance === 0 ? 'paid' :
        receipt.total_paid > 0 ? 'partial' : 'pending';

      if (receipt.amount_due !== expectedAmountDue) {
        console.error(`❌ Receipt ${receipt.id} (${receipt.customer_name}): amount_due mismatch`);
        console.error(`   Expected: ${expectedAmountDue}, Got: ${receipt.amount_due}`);
        calculationErrors++;
      }

      if (receipt.pending_balance !== expectedPendingBalance) {
        console.error(`❌ Receipt ${receipt.id} (${receipt.customer_name}): pending_balance mismatch`);
        console.error(`   Expected: ${expectedPendingBalance}, Got: ${receipt.pending_balance}`);
        calculationErrors++;
      }

      if (receipt.payment_status !== expectedStatus) {
        console.error(`❌ Receipt ${receipt.id} (${receipt.customer_name}): payment_status mismatch`);
        console.error(`   Expected: ${expectedStatus}, Got: ${receipt.payment_status}`);
        calculationErrors++;
      }
    });

    if (calculationErrors > 0) {
      console.error(`❌ Found ${calculationErrors} calculation errors\n`);
      return false;
    } else {
      console.log('✅ All calculations are accurate\n');
    }

    // 3. Generate summary statistics
    console.log('3️⃣ Summary Statistics:');
    const totalReceipts = allReceipts?.length || 0;
    const paidReceipts = allReceipts?.filter(r => r.payment_status === 'paid').length || 0;
    const partialReceipts = allReceipts?.filter(r => r.payment_status === 'partial').length || 0;
    const pendingReceipts = allReceipts?.filter(r => r.payment_status === 'pending').length || 0;
    const totalPendingBalance = allReceipts?.reduce((sum, r) => sum + (r.pending_balance || 0), 0) || 0;

    console.log(`   📊 Total Receipts: ${totalReceipts}`);
    console.log(`   ✅ Paid: ${paidReceipts} (${((paidReceipts/totalReceipts)*100).toFixed(1)}%)`);
    console.log(`   ⚠️  Partial: ${partialReceipts} (${((partialReceipts/totalReceipts)*100).toFixed(1)}%)`);
    console.log(`   ⏳ Pending: ${pendingReceipts} (${((pendingReceipts/totalReceipts)*100).toFixed(1)}%)`);
    console.log(`   💰 Total Pending Balance: ${totalPendingBalance.toLocaleString('ar-QA')} QAR\n`);

    // 4. Check for receipts without contracts
    console.log('4️⃣ Checking for orphaned receipts...');
    const { data: orphanedReceipts, error: orphanError } = await supabase
      .from('rental_payment_receipts')
      .select(`
        id,
        customer_name,
        customer_id
      `);

    if (orphanError) {
      console.error('❌ Error checking for orphaned receipts:', orphanError.message);
      return false;
    }

    // Get all customer IDs with active contracts
    const { data: activeContracts, error: contractsError } = await supabase
      .from('contracts')
      .select('customer_id')
      .eq('status', 'active');

    if (contractsError) {
      console.error('❌ Error fetching contracts:', contractsError.message);
      return false;
    }

    const activeCustomerIds = new Set(activeContracts?.map(c => c.customer_id) || []);
    const orphans = orphanedReceipts?.filter(r => !activeCustomerIds.has(r.customer_id)) || [];

    if (orphans.length > 0) {
      console.warn(`⚠️  Found ${orphans.length} receipts without active contracts:`);
      orphans.forEach(r => {
        console.warn(`   - Receipt ${r.id}: ${r.customer_name}`);
      });
      console.log('');
    } else {
      console.log('✅ No orphaned receipts found\n');
    }

    return true;

  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    return false;
  }
}

// Run verification
verifyRecalculation().then(success => {
  if (success) {
    console.log('🎉 VERIFICATION COMPLETE: Migration successful!');
    console.log('✅ All rental payment receipts are correctly recalculated\n');
    process.exit(0);
  } else {
    console.error('❌ VERIFICATION FAILED: Please review errors above\n');
    process.exit(1);
  }
});
