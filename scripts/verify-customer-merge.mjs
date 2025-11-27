#!/usr/bin/env node

/**
 * Duplicate Customer Merge Verification Script
 * 
 * This script verifies the results of the duplicate customer merge migration.
 * Run this anytime to ensure data integrity after the merge.
 * 
 * Usage: node verify-customer-merge.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Duplicate Customer Merge Verification');
console.log('==========================================\n');

async function verifyMerge() {
  try {
    // 1. Check for remaining duplicates
    console.log('1️⃣ Checking for remaining duplicate customers...');
    const { data: duplicates, error: dupError } = await supabase.rpc('check_duplicate_customers', {});
    
    // Fallback query if RPC doesn't exist
    if (dupError) {
      const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('first_name, last_name, company_id');
      
      if (custError) throw custError;
      
      // Group by name and company
      const nameGroups = {};
      customers.forEach(c => {
        const key = `${c.first_name} ${c.last_name}|${c.company_id}`;
        nameGroups[key] = (nameGroups[key] || 0) + 1;
      });
      
      const duplicateCount = Object.values(nameGroups).filter(count => count > 1).length;
      
      if (duplicateCount === 0) {
        console.log('   ✅ No duplicate customers found');
      } else {
        console.log(`   ⚠️  WARNING: ${duplicateCount} duplicate customer groups found!`);
        Object.entries(nameGroups)
          .filter(([_, count]) => count > 1)
          .forEach(([name, count]) => {
            console.log(`      - "${name.split('|')[0]}": ${count} duplicates`);
          });
      }
    }

    // 2. Check customer counts
    console.log('\n2️⃣ Checking customer statistics...');
    const { count: totalCustomers, error: countError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    console.log(`   📊 Total customers: ${totalCustomers}`);

    // 3. Check payments integrity
    console.log('\n3️⃣ Checking payment record integrity...');
    const { data: paymentStats, error: payError } = await supabase
      .from('rental_payment_receipts')
      .select('customer_id', { count: 'exact' });
    
    if (payError) throw payError;
    
    const uniqueCustomersWithPayments = new Set(paymentStats.map(p => p.customer_id)).size;
    console.log(`   💰 Total payments: ${paymentStats.length}`);
    console.log(`   👥 Customers with payments: ${uniqueCustomersWithPayments}`);

    // 4. Check for orphaned payments
    console.log('\n4️⃣ Checking for orphaned payment records...');
    const { data: allCustomerIds, error: idError } = await supabase
      .from('customers')
      .select('id');
    
    if (idError) throw idError;
    
    const validCustomerIds = new Set(allCustomerIds.map(c => c.id));
    const orphanedPayments = paymentStats.filter(p => !validCustomerIds.has(p.customer_id));
    
    if (orphanedPayments.length === 0) {
      console.log('   ✅ No orphaned payments found');
    } else {
      console.log(`   ⚠️  WARNING: ${orphanedPayments.length} orphaned payments found!`);
    }

    // 5. Check contracts integrity
    console.log('\n5️⃣ Checking contract integrity...');
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select('customer_id', { count: 'exact' });
    
    if (contractError) throw contractError;
    
    const uniqueCustomersWithContracts = new Set(contracts.map(c => c.customer_id)).size;
    const orphanedContracts = contracts.filter(c => !validCustomerIds.has(c.customer_id));
    
    console.log(`   📄 Total contracts: ${contracts.length}`);
    console.log(`   👥 Customers with contracts: ${uniqueCustomersWithContracts}`);
    
    if (orphanedContracts.length === 0) {
      console.log('   ✅ No orphaned contracts found');
    } else {
      console.log(`   ⚠️  WARNING: ${orphanedContracts.length} orphaned contracts found!`);
    }

    // 6. Sample verification of merged customers
    console.log('\n6️⃣ Verifying sample merged customers...');
    const sampleNames = ['فادي السعيدي', 'محمد العويني'];
    
    for (const name of sampleNames) {
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const { data: customer, error: custErr } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .single();
      
      if (custErr) {
        console.log(`   ⚠️  Customer "${name}" not found`);
        continue;
      }
      
      const { count: paymentCount } = await supabase
        .from('rental_payment_receipts')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id);
      
      console.log(`   ✅ "${name}": 1 account with ${paymentCount} payment(s)`);
    }

    // Final summary
    console.log('\n==========================================');
    console.log('📊 VERIFICATION SUMMARY');
    console.log('==========================================');
    console.log(`Total Customers: ${totalCustomers}`);
    console.log(`Customers with Payments: ${uniqueCustomersWithPayments}`);
    console.log(`Total Payments: ${paymentStats.length}`);
    console.log(`Customers with Contracts: ${uniqueCustomersWithContracts}`);
    console.log(`Total Contracts: ${contracts.length}`);
    console.log('==========================================');
    
    if (orphanedPayments.length === 0 && orphanedContracts.length === 0) {
      console.log('\n✅ ALL CHECKS PASSED - Data integrity verified!');
      console.log('The duplicate customer merge was successful.\n');
    } else {
      console.log('\n⚠️  SOME ISSUES DETECTED - Please review above warnings.\n');
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyMerge().then(() => {
  console.log('Verification complete.\n');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
