/**
 * Script to sync existing rental payments to general ledger
 * This creates journal entries for all payments that don't have them yet
 * 
 * Usage: node scripts/syncPaymentsToLedger.js
 * 
 * Environment variables required:
 * - SUPABASE_URL
 * - SUPABASE_KEY (service_role key)
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables: SUPABASE_URL and SUPABASE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get the next entry number for a company
 */
async function getNextEntryNumber(companyId) {
  const { data: lastEntry } = await supabase
    .from('journal_entries')
    .select('entry_number')
    .eq('company_id', companyId)
    .order('entry_number', { ascending: false })
    .limit(1)
    .single();

  if (!lastEntry || !lastEntry.entry_number) {
    return '000001';
  }

  const nextNumber = parseInt(lastEntry.entry_number) + 1;
  return nextNumber.toString().padStart(6, '0');
}

/**
 * Main sync function
 */
async function syncPayments() {
  console.log('🔄 Starting payment sync to general ledger...\n');

  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name');

  if (companiesError) {
    console.error('❌ Error fetching companies:', companiesError.message);
    return;
  }

  console.log(`📊 Found ${companies?.length || 0} companies\n`);

  for (const company of companies || []) {
    console.log(`\n🏢 Processing company: ${company.name}`);
    console.log('─'.repeat(50));

    // Get required accounts for this company
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code')
      .eq('company_id', company.id)
      .in('account_code', ['1010', '1200', '4110', '4200']);

    if (!accounts || accounts.length < 4) {
      console.log(`⚠️  Skipping ${company.name} - missing required accounts`);
      console.log(`   Required: 1010 (Cash), 1200 (AR), 4110 (Rental Revenue), 4200 (Fine Revenue)`);
      continue;
    }

    const accountMap = {};
    accounts.forEach((acc) => {
      accountMap[acc.account_code] = acc.id;
    });

    console.log('✅ Found all required accounts');

    // Get payments for this company
    const { data: payments } = await supabase
      .from('rental_payment_receipts')
      .select('*')
      .eq('company_id', company.id)
      .order('payment_date', { ascending: true });

    console.log(`📊 Found ${payments?.length || 0} payments`);

    let synced = 0;
    let skipped = 0;
    let failed = 0;
    let currentEntryNumber = null;

    for (const payment of payments || []) {
      // Check if already synced
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', company.id)
        .eq('reference_type', 'rental_payment')
        .eq('reference_id', payment.id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Get next entry number (only once at start, then increment)
      if (!currentEntryNumber) {
        currentEntryNumber = await getNextEntryNumber(company.id);
      } else {
        const nextNum = parseInt(currentEntryNumber) + 1;
        currentEntryNumber = nextNum.toString().padStart(6, '0');
      }
      const entryNumber = currentEntryNumber;

      // Create journal entry lines
      const lines = [];

      // Revenue recognition
      if (payment.rental_amount > 0) {
        lines.push(
          {
            account_id: accountMap['1200'],
            debit_amount: payment.rental_amount,
            credit_amount: 0,
            line_number: lines.length + 1,
          },
          {
            account_id: accountMap['4110'],
            debit_amount: 0,
            credit_amount: payment.rental_amount,
            line_number: lines.length + 2,
          }
        );
      }

      // Fine revenue
      if (payment.fine_amount > 0) {
        lines.push(
          {
            account_id: accountMap['1200'],
            debit_amount: payment.fine_amount,
            credit_amount: 0,
            line_number: lines.length + 1,
          },
          {
            account_id: accountMap['4200'],
            debit_amount: 0,
            credit_amount: payment.fine_amount,
            line_number: lines.length + 2,
          }
        );
      }

      // Cash receipt
      if (payment.amount_paid > 0) {
        lines.push(
          {
            account_id: accountMap['1010'],
            debit_amount: payment.amount_paid,
            credit_amount: 0,
            line_number: lines.length + 1,
          },
          {
            account_id: accountMap['1200'],
            debit_amount: 0,
            credit_amount: payment.amount_paid,
            line_number: lines.length + 2,
          }
        );
      }

      // Insert journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: company.id,
          entry_number: entryNumber,
          entry_date: payment.payment_date,
          description: `دفعة إيجار - ${payment.customer_name}`,
          reference_type: 'rental_payment',
          reference_id: payment.id,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error(`   ❌ Payment ${payment.id}: ${entryError?.message}`);
        failed++;
        continue;
      }

      // Insert lines
      const linesWithEntry = lines.map((l) => ({
        ...l,
        journal_entry_id: entry.id,
        company_id: company.id,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntry);

      if (linesError) {
        console.error(`   ❌ Lines for ${payment.id}: ${linesError.message}`);
        // Rollback journal entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        failed++;
      } else {
        synced++;
        if (synced % 10 === 0) {
          console.log(`   ✅ Synced ${synced} payments...`);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`\n📊 Summary for ${company.name}:`);
    console.log(`   Total: ${payments?.length || 0}`);
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ⏭️  Skipped: ${skipped} (already synced)`);
    console.log(`   ❌ Failed: ${failed}`);
  }

  console.log('\n✅ Sync completed!');
}

// Run the sync
syncPayments().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

