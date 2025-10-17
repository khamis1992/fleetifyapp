/**
 * Utility script to sync existing rental payment receipts to the General Ledger
 * This should be run once to migrate existing data
 */

import { supabase } from '@/integrations/supabase/client';
import { createJournalEntryForRentalPayment } from '@/hooks/useRentalPaymentJournalIntegration';

export interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  errors: Array<{ payment_id: string; error: string }>;
}

/**
 * Sync all rental payment receipts for a company to the General Ledger
 */
export const syncRentalPaymentsToLedger = async (companyId: string): Promise<SyncResult> => {
  const result: SyncResult = {
    total: 0,
    synced: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  try {
    console.log('🔄 Starting sync of rental payments to General Ledger...');
    console.log('Company ID:', companyId);

    // Fetch all rental payment receipts for the company
    const { data: payments, error: fetchError } = await supabase
      .from('rental_payment_receipts')
      .select('*')
      .eq('company_id', companyId)
      .order('payment_date', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching rental payments:', fetchError);
      throw fetchError;
    }

    if (!payments || payments.length === 0) {
      console.log('⚠️ No rental payments found for this company');
      return result;
    }

    result.total = payments.length;
    console.log(`📊 Found ${result.total} rental payments to sync`);

    // Process each payment
    for (const payment of payments) {
      try {
        // Check if journal entry already exists for this payment
        const { data: existingEntry, error: checkError } = await supabase
          .from('journal_entries')
          .select('id')
          .eq('reference_type', 'rental_payment')
          .eq('reference_id', payment.id)
          .maybeSingle();

        if (checkError) {
          console.error(`❌ Error checking existing entry for payment ${payment.id}:`, checkError);
          result.failed++;
          result.errors.push({ payment_id: payment.id, error: checkError.message });
          continue;
        }

        if (existingEntry) {
          console.log(`⏭️  Skipping payment ${payment.id} - journal entry already exists`);
          result.skipped++;
          continue;
        }

        // Create journal entry for this payment
        console.log(`🔄 Creating journal entry for payment ${payment.id}...`);
        const journalResult = await createJournalEntryForRentalPayment(companyId, {
          payment_id: payment.id,
          customer_name: payment.customer_name,
          payment_date: payment.payment_date,
          rent_amount: payment.rent_amount,
          fine: payment.fine || 0,
          total_paid: payment.total_paid,
          month: payment.month
        });

        if (journalResult.success) {
          console.log(`✅ Journal entry created for payment ${payment.id}:`, journalResult.entry_id);
          result.synced++;
        } else {
          console.error(`❌ Failed to create journal entry for payment ${payment.id}:`, journalResult.error);
          result.failed++;
          result.errors.push({ payment_id: payment.id, error: journalResult.error || 'Unknown error' });
        }

        // Add a small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`❌ Error processing payment ${payment.id}:`, error);
        result.failed++;
        result.errors.push({ payment_id: payment.id, error: error.message || 'Unknown error' });
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   Total payments: ${result.total}`);
    console.log(`   ✅ Synced: ${result.synced}`);
    console.log(`   ⏭️  Skipped (already synced): ${result.skipped}`);
    console.log(`   ❌ Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => {
        console.log(`   Payment ${err.payment_id}: ${err.error}`);
      });
    }

    return result;

  } catch (error: any) {
    console.error('❌ Fatal error during sync:', error);
    throw error;
  }
};

/**
 * Sync a single rental payment to the General Ledger
 */
export const syncSinglePaymentToLedger = async (
  companyId: string,
  paymentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 Syncing single payment to General Ledger...');
    console.log('Payment ID:', paymentId);

    // Fetch the payment
    const { data: payment, error: fetchError } = await supabase
      .from('rental_payment_receipts')
      .select('*')
      .eq('id', paymentId)
      .eq('company_id', companyId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching payment:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!payment) {
      return { success: false, error: 'Payment not found' };
    }

    // Check if journal entry already exists
    const { data: existingEntry } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('reference_type', 'rental_payment')
      .eq('reference_id', payment.id)
      .maybeSingle();

    if (existingEntry) {
      console.log('⚠️ Journal entry already exists for this payment');
      return { success: true }; // Not an error
    }

    // Create journal entry
    const journalResult = await createJournalEntryForRentalPayment(companyId, {
      payment_id: payment.id,
      customer_name: payment.customer_name,
      payment_date: payment.payment_date,
      rent_amount: payment.rent_amount,
      fine: payment.fine || 0,
      total_paid: payment.total_paid,
      month: payment.month
    });

    if (journalResult.success) {
      console.log('✅ Journal entry created:', journalResult.entry_id);
      return { success: true };
    } else {
      console.error('❌ Failed to create journal entry:', journalResult.error);
      return { success: false, error: journalResult.error };
    }

  } catch (error: any) {
    console.error('❌ Error syncing payment:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
};

