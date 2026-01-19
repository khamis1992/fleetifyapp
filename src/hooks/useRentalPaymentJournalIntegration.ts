/**
 * Integration hook to automatically create journal entries when rental payments are recorded
 * This ensures the General Ledger stays in sync with the Payment Tracking system
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface JournalEntryLineInput {
  account_id: string;
  line_description: string;
  debit_amount: number;
  credit_amount: number;
  line_number: number;
}

export interface CreateJournalEntryInput {
  company_id: string;
  entry_date: string;
  description: string;
  reference_type: string;
  reference_id: string;
  lines: JournalEntryLineInput[];
}

/**
 * Get the default account IDs for rental payment journal entries
 * These should be configured in the chart of accounts
 */
export const getDefaultRentalAccounts = async (companyId: string) => {
  try {
    // Fetch accounts from chart of accounts
    const { data: accounts, error } = await supabase
      .from('chart_of_accounts')
      .select('id, account_code, account_name, account_name_ar')
      .eq('company_id', companyId)
      .in('account_code', ['1010', '1200', '4110', '4200']); // Cash, AR, Rental Revenue, Fine Revenue

    if (error) throw error;

    const accountMap: Record<string, string> = {};
    accounts?.forEach(acc => {
      if (acc.account_code === '1010') accountMap['cash'] = acc.id; // Cash/Bank
      if (acc.account_code === '1200') accountMap['accounts_receivable'] = acc.id; // Accounts Receivable
      if (acc.account_code === '4110') accountMap['rental_revenue'] = acc.id; // Rental Revenue
      if (acc.account_code === '4200') accountMap['fine_revenue'] = acc.id; // Fine Revenue
    });

    return accountMap;
  } catch (error) {
    console.error('Error fetching rental accounts:', error);
    return null;
  }
};

/**
 * Create journal entry for a rental payment receipt
 * 
 * Accounting logic:
 * 1. When rental revenue is recognized:
 *    DR: Accounts Receivable (Asset)
 *    CR: Rental Revenue (Revenue)
 * 
 * 2. When fine is charged:
 *    DR: Accounts Receivable (Asset)
 *    CR: Fine Revenue (Revenue)
 * 
 * 3. When payment is received:
 *    DR: Cash/Bank (Asset)
 *    CR: Accounts Receivable (Asset)
 */
export const createJournalEntryForRentalPayment = async (
  companyId: string,
  paymentData: {
    payment_id: string;
    customer_name: string;
    payment_date: string;
    rent_amount: number;
    fine: number;
    total_paid: number;
    month: string;
  }
): Promise<{ success: boolean; entry_id?: string; error?: string }> => {
  try {
    console.log('🔄 Creating journal entry for rental payment:', paymentData.payment_id);

    // Get account IDs
    const accounts = await getDefaultRentalAccounts(companyId);
    if (!accounts || !accounts.cash || !accounts.accounts_receivable || !accounts.rental_revenue) {
      console.error('❌ Required accounts not found in chart of accounts');
      return { 
        success: false, 
        error: 'الحسابات المطلوبة غير موجودة في دليل الحسابات. يرجى إضافة حسابات: النقدية (1010)، الذمم المدينة (1200)، إيرادات التأجير (4110)'
      };
    }

    // Prepare journal entry lines
    const lines: JournalEntryLineInput[] = [];
    let lineNumber = 1;

    // 1. Recognize rental revenue
    if (paymentData.rent_amount > 0) {
      // DR: Accounts Receivable
      lines.push({
        account_id: accounts.accounts_receivable,
        line_description: `إيراد تأجير - ${paymentData.customer_name} - ${paymentData.month}`,
        debit_amount: paymentData.rent_amount,
        credit_amount: 0,
        line_number: lineNumber++
      });

      // CR: Rental Revenue
      lines.push({
        account_id: accounts.rental_revenue,
        line_description: `إيراد تأجير - ${paymentData.customer_name} - ${paymentData.month}`,
        debit_amount: 0,
        credit_amount: paymentData.rent_amount,
        line_number: lineNumber++
      });
    }

    // 2. Recognize fine revenue (if any)
    if (paymentData.fine > 0 && accounts.fine_revenue) {
      // DR: Accounts Receivable
      lines.push({
        account_id: accounts.accounts_receivable,
        line_description: `غرامة تأخير - ${paymentData.customer_name} - ${paymentData.month}`,
        debit_amount: paymentData.fine,
        credit_amount: 0,
        line_number: lineNumber++
      });

      // CR: Fine Revenue
      lines.push({
        account_id: accounts.fine_revenue,
        line_description: `غرامة تأخير - ${paymentData.customer_name} - ${paymentData.month}`,
        debit_amount: 0,
        credit_amount: paymentData.fine,
        line_number: lineNumber++
      });
    }

    // 3. Record payment received
    if (paymentData.total_paid > 0) {
      // DR: Cash/Bank
      lines.push({
        account_id: accounts.cash,
        line_description: `دفعة مستلمة - ${paymentData.customer_name} - ${paymentData.month}`,
        debit_amount: paymentData.total_paid,
        credit_amount: 0,
        line_number: lineNumber++
      });

      // CR: Accounts Receivable
      lines.push({
        account_id: accounts.accounts_receivable,
        line_description: `دفعة مستلمة - ${paymentData.customer_name} - ${paymentData.month}`,
        debit_amount: 0,
        credit_amount: paymentData.total_paid,
        line_number: lineNumber++
      });
    }

    // Calculate totals
    const total_debit = lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const total_credit = lines.reduce((sum, line) => sum + line.credit_amount, 0);

    // Verify balanced entry
    if (Math.abs(total_debit - total_credit) > 0.01) {
      console.error('❌ Journal entry is not balanced!', { total_debit, total_credit });
      return { 
        success: false, 
        error: `القيد المحاسبي غير متوازن: مدين ${total_debit} - دائن ${total_credit}`
      };
    }

    // Generate entry number
    const { data: lastEntry } = await supabase
      .from('journal_entries')
      .select('entry_number')
      .eq('company_id', companyId)
      .order('entry_number', { ascending: false })
      .limit(1)
      .single();

    const lastNumber = lastEntry?.entry_number ? parseInt(lastEntry.entry_number.replace(/\D/g, '')) : 0;
    const entry_number = `JE-${String(lastNumber + 1).padStart(6, '0')}`;

    // Create journal entry
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        company_id: companyId,
        entry_number,
        entry_date: paymentData.payment_date,
        description: `قيد إيراد تأجير - ${paymentData.customer_name} - ${paymentData.month}`,
        total_debit,
        total_credit,
        status: 'posted', // Auto-post rental payment entries
        reference_type: 'rental_payment',
        reference_id: paymentData.payment_id
      })
      .select()
      .single();

    if (entryError) {
      console.error('❌ Error creating journal entry:', entryError);
      throw entryError;
    }

    console.log('✅ Journal entry created:', journalEntry.id);

    // Create journal entry lines
    const linesWithEntryId = lines.map(line => ({
      ...line,
      journal_entry_id: journalEntry.id
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(linesWithEntryId);

    if (linesError) {
      console.error('❌ Error creating journal entry lines:', linesError);
      // Rollback: delete the journal entry
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw linesError;
    }

    console.log('✅ Journal entry lines created successfully');

    return { success: true, entry_id: journalEntry.id };
  } catch (error: unknown) {
    console.error('❌ Error in createJournalEntryForRentalPayment:', error);
    return { 
      success: false, 
      error: error.message || 'فشل في إنشاء القيد المحاسبي'
    };
  }
};

/**
 * Delete journal entry when rental payment is deleted
 */
export const deleteJournalEntryForRentalPayment = async (
  paymentId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔄 Deleting journal entry for rental payment:', paymentId);

    // Find the journal entry
    const { data: entry, error: findError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('reference_type', 'rental_payment')
      .eq('reference_id', paymentId)
      .single();

    if (findError || !entry) {
      console.log('⚠️ No journal entry found for this payment');
      return { success: true }; // Not an error if no entry exists
    }

    // Delete journal entry lines first
    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .delete()
      .eq('journal_entry_id', entry.id);

    if (linesError) {
      console.error('❌ Error deleting journal entry lines:', linesError);
      throw linesError;
    }

    // Delete journal entry
    const { error: entryError } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entry.id);

    if (entryError) {
      console.error('❌ Error deleting journal entry:', entryError);
      throw entryError;
    }

    console.log('✅ Journal entry deleted successfully');
    return { success: true };
  } catch (error: unknown) {
    console.error('❌ Error in deleteJournalEntryForRentalPayment:', error);
    return { 
      success: false, 
      error: error.message || 'فشل في حذف القيد المحاسبي'
    };
  }
};

