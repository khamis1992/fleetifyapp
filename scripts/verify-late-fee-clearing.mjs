#!/usr/bin/env node

/**
 * Verification Script for Late Fee Clearing System
 * 
 * This script verifies that the late fee clearing logic is working correctly
 * by checking:
 * 1. Receipts with auto-generated notes
 * 2. Cleared late fees (pending_balance reduced)
 * 3. Payment consistency
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('\n🔍 Late Fee Clearing System Verification');
console.log('=========================================\n');

async function verifyLateFeeClearing() {
  try {
    // 1. Check receipts with cleared fee notes
    console.log('1️⃣ Checking receipts with auto-generated notes...\n');
    
    const { data: receiptsWithNotes, error: notesError } = await supabase
      .from('rental_payment_receipts')
      .select('*')
      .not('notes', 'is', null)
      .or('notes.ilike.%تم دفع غرامة%,notes.ilike.%تم تطبيق%');

    if (notesError) {
      console.error('❌ Error fetching receipts:', notesError);
      return;
    }

    console.log(`✅ Found ${receiptsWithNotes?.length || 0} receipts with clearing notes\n`);

    if (receiptsWithNotes && receiptsWithNotes.length > 0) {
      console.log('Sample receipts with notes:');
      console.log('─────────────────────────────────────────');
      
      receiptsWithNotes.slice(0, 5).forEach((receipt, index) => {
        console.log(`\n${index + 1}. ${receipt.customer_name} - ${receipt.month}`);
        console.log(`   Paid: ${receipt.total_paid} QAR | Pending: ${receipt.pending_balance} QAR`);
        console.log(`   Status: ${receipt.payment_status}`);
        console.log(`   Notes: ${receipt.notes?.substring(0, 100)}...`);
      });
      console.log('\n');
    }

    // 2. Analyze cleared fees
    console.log('2️⃣ Analyzing cleared late fees...\n');
    
    const { data: allReceipts, error: allError } = await supabase
      .from('rental_payment_receipts')
      .select('*')
      .order('payment_date', { ascending: true });

    if (allError) {
      console.error('❌ Error fetching all receipts:', allError);
      return;
    }

    let clearedFeesTotal = 0;
    let clearedFeesCount = 0;
    const affectedCustomers = new Set();

    // Group by customer
    const customerReceipts = {};
    allReceipts?.forEach(receipt => {
      if (!customerReceipts[receipt.customer_id]) {
        customerReceipts[receipt.customer_id] = [];
      }
      customerReceipts[receipt.customer_id].push(receipt);
    });

    // Analyze each customer's receipts
    Object.entries(customerReceipts).forEach(([customerId, receipts]) => {
      receipts.forEach(receipt => {
        // Check if this receipt has a clearing note
        if (receipt.notes && receipt.notes.includes('تم دفع غرامة')) {
          // Extract the cleared amount from the note
          const match = receipt.notes.match(/\((\d+(?:\.\d+)?)\s*ريال\)/);
          if (match) {
            const clearedAmount = parseFloat(match[1]);
            clearedFeesTotal += clearedAmount;
            clearedFeesCount++;
            affectedCustomers.add(customerId);
          }
        }
      });
    });

    console.log(`✅ Total cleared fees: ${clearedFeesTotal.toLocaleString('ar-QA')} QAR`);
    console.log(`✅ Number of cleared fees: ${clearedFeesCount}`);
    console.log(`✅ Affected customers: ${affectedCustomers.size}\n`);

    // 3. Check for potential issues
    console.log('3️⃣ Checking for data consistency...\n');

    const issues = [];

    allReceipts?.forEach(receipt => {
      // Check if pending_balance matches calculation
      const expectedPending = Math.max(0, receipt.amount_due - receipt.total_paid);
      const actualPending = receipt.pending_balance || 0;

      if (Math.abs(expectedPending - actualPending) > 0.01) {
        issues.push({
          type: 'pending_balance_mismatch',
          receipt: receipt,
          expected: expectedPending,
          actual: actualPending
        });
      }

      // Check payment status consistency
      if (actualPending === 0 && receipt.payment_status !== 'paid') {
        issues.push({
          type: 'status_mismatch',
          receipt: receipt,
          issue: 'Should be "paid" but is ' + receipt.payment_status
        });
      }
    });

    if (issues.length === 0) {
      console.log('✅ No data consistency issues found!\n');
    } else {
      console.log(`⚠️ Found ${issues.length} potential issues:`);
      issues.slice(0, 5).forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.type}`);
        console.log(`   Customer: ${issue.receipt.customer_name}`);
        console.log(`   Month: ${issue.receipt.month}`);
        if (issue.expected !== undefined) {
          console.log(`   Expected: ${issue.expected}, Actual: ${issue.actual}`);
        }
        if (issue.issue) {
          console.log(`   Issue: ${issue.issue}`);
        }
      });
      console.log('\n');
    }

    // 4. Summary statistics
    console.log('4️⃣ Summary Statistics\n');
    console.log('─────────────────────────────────────────');
    
    const totalReceipts = allReceipts?.length || 0;
    const paidReceipts = allReceipts?.filter(r => r.payment_status === 'paid').length || 0;
    const partialReceipts = allReceipts?.filter(r => r.payment_status === 'partial').length || 0;
    const pendingReceipts = allReceipts?.filter(r => r.payment_status === 'pending').length || 0;
    const receiptsWithFines = allReceipts?.filter(r => r.fine > 0).length || 0;
    const totalFines = allReceipts?.reduce((sum, r) => sum + (r.fine || 0), 0) || 0;

    console.log(`Total receipts: ${totalReceipts}`);
    console.log(`├─ Paid: ${paidReceipts} (${((paidReceipts/totalReceipts)*100).toFixed(1)}%)`);
    console.log(`├─ Partial: ${partialReceipts} (${((partialReceipts/totalReceipts)*100).toFixed(1)}%)`);
    console.log(`└─ Pending: ${pendingReceipts} (${((pendingReceipts/totalReceipts)*100).toFixed(1)}%)`);
    console.log(`\nReceipts with fines: ${receiptsWithFines}`);
    console.log(`Total fines collected: ${totalFines.toLocaleString('ar-QA')} QAR`);
    console.log(`Cleared fees: ${clearedFeesTotal.toLocaleString('ar-QA')} QAR (${clearedFeesCount} receipts)`);

    console.log('\n=========================================');
    console.log('✅ Verification Complete!\n');

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
  }
}

// Run verification
verifyLateFeeClearing();
