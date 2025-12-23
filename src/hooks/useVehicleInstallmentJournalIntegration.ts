import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for integrating vehicle installment payments with the accounting system
 * Creates journal entries automatically when installments are paid
 * 
 * Accounting Logic (Updated Dec 2024):
 * When paying installment to vendor/dealer:
 * - Debit: Revenue (الإيرادات) - خصم من الإيرادات
 * - Credit: Cash/Bank (الصندوق/البنك) - خصم من النقدية
 */
export const useVehicleInstallmentJournalIntegration = () => {
  const { toast } = useToast();

  /**
   * Record installment payment and create journal entry
   * @param paymentData Payment data including installment and schedule IDs
   */
  const recordInstallmentPayment = async (paymentData: {
    installmentId: string;
    scheduleId: string;
    principalAmount: number;
    interestAmount: number;
    date: string;
  }) => {
    try {
      // Get installment and schedule data
      const { data: schedule } = await supabase
        .from('vehicle_installment_schedules')
        .select('*, vehicle_installments!inner(company_id, vendor_id, vehicles(plate_number))')
        .eq('id', paymentData.scheduleId)
        .single();

      if (!schedule || !schedule.vehicle_installments) {
        console.error('Schedule or installment not found');
        return;
      }

      const installment = schedule.vehicle_installments as any;
      const companyId = installment.company_id;
      const totalPayment = paymentData.principalAmount + paymentData.interestAmount;

      // Get required accounts - Revenue or Vehicle Purchase Expense, and Cash/Bank
      // Try to find Revenue account first (4111 or any revenue account)
      const { data: revenueAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', companyId)
        .eq('account_type', 'revenue')
        .eq('is_header', false)
        .eq('is_active', true)
        .order('account_code', { ascending: true })
        .limit(1);

      // Try to find Vehicle Purchase Expense account (if exists)
      const { data: expenseAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name')
        .eq('company_id', companyId)
        .eq('account_type', 'expenses')
        .ilike('account_name', '%vehicle%purchase%')
        .or('account_name.ilike.%شراء%مركبة%,account_name.ilike.%مصروف%مركبة%')
        .eq('is_header', false)
        .eq('is_active', true)
        .limit(1);

      // Get Cash account (1010 or 1111)
      const { data: cashAccounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1010', '1111', '11151'])
        .eq('is_header', false)
        .eq('is_active', true)
        .limit(1);

      // Determine debit account - prefer expense, fallback to revenue
      const debitAccountId = expenseAccounts?.[0]?.id || revenueAccounts?.[0]?.id;
      const debitAccountName = expenseAccounts?.[0]?.account_name || revenueAccounts?.[0]?.account_name || 'الإيرادات';
      const cashAccountId = cashAccounts?.[0]?.id;

      if (!debitAccountId || !cashAccountId) {
        console.error('Required accounts not found:', { debitAccountId, cashAccountId });
        toast.error('الحسابات المطلوبة غير موجودة في دليل الحسابات');
        return;
      }

      // Get next entry number
      const { data: lastEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('company_id', companyId)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = lastEntry
        ? (parseInt(lastEntry.entry_number) + 1).toString().padStart(6, '0')
        : '000001';

      const vehiclePlate = (installment.vehicles as any)?.plate_number || '';
      const description = `دفع قسط مركبة للوكيل - ${vehiclePlate} - قسط رقم ${schedule.installment_number}`;

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: nextEntryNumber,
          entry_date: paymentData.date,
          description,
          reference_type: 'vehicle_installment',
          reference_id: paymentData.scheduleId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create journal entry for installment payment:', entryError);
        return;
      }

      // Create journal entry lines
      const lines = [
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: debitAccountId,
          line_description: `مصروف قسط مركبة - ${debitAccountName}`,
          debit_amount: totalPayment,
          credit_amount: 0,
          line_number: 1,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: cashAccountId,
          line_description: 'دفع من الصندوق/البنك',
          debit_amount: 0,
          credit_amount: totalPayment,
          line_number: 2,
        },
      ];

      // If there's interest, add separate line for interest expense
      if (paymentData.interestAmount > 0) {
        // Try to find Interest Expense account
        const { data: interestAccounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code')
          .eq('company_id', companyId)
          .eq('account_type', 'expenses')
          .ilike('account_name', '%interest%')
          .or('account_name.ilike.%فائدة%')
          .eq('is_header', false)
          .eq('is_active', true)
          .limit(1);

        if (interestAccounts?.[0]?.id) {
          // Adjust the main expense line to only include principal
          lines[0].debit_amount = paymentData.principalAmount;
          
          // Add interest expense line
          lines.splice(1, 0, {
            journal_entry_id: entry.id,
            company_id: companyId,
            account_id: interestAccounts[0].id,
            line_description: 'مصروف الفائدة',
            debit_amount: paymentData.interestAmount,
            credit_amount: 0,
            line_number: 2,
          });
          
          // Update cash line number
          lines[2].line_number = 3;
        }
      }

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create journal entry lines:', linesError);
        // Rollback journal entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      // Update schedule with journal entry ID
      await supabase
        .from('vehicle_installment_schedules')
        .update({ journal_entry_id: entry.id })
        .eq('id', paymentData.scheduleId);

      console.log('✅ Journal entry created for vehicle installment payment:', entry.entry_number);
      return entry.id;
    } catch (error) {
      console.error('Error recording installment payment:', error);
      throw error;
    }
  };

  /**
   * Create journal entry for a vehicle installment payment (legacy method)
   * @param installment The installment payment record
   */
  const createJournalEntry = async (installment: any) => {
    // This method is kept for backward compatibility
    // But now uses the new recordInstallmentPayment logic
    return recordInstallmentPayment({
      installmentId: installment.installment_id || installment.id,
      scheduleId: installment.id,
      principalAmount: installment.amount - (installment.interest_amount || 0),
      interestAmount: installment.interest_amount || 0,
      date: installment.payment_date || installment.created_at,
    });
  };

  /**
   * Create initial journal entry when vehicle is purchased with loan
   * @param vehicleId Vehicle ID
   * @param companyId Company ID
   * @param purchasePrice Total purchase price
   * @param downPayment Down payment amount
   * @param loanAmount Loan amount
   */
  const createVehiclePurchaseEntry = async (
    vehicleId: string,
    companyId: string,
    purchasePrice: number,
    downPayment: number,
    loanAmount: number
  ) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1010', '1400', '2300']); 
      // Cash, Vehicles, Vehicle Loans Payable

      if (!accounts || accounts.length < 3) {
        console.error('Required accounts not found for vehicle purchase');
        return;
      }

      const accountMap: Record<string, string> = {};
      accounts.forEach((acc) => {
        accountMap[acc.account_code] = acc.id;
      });

      // Get next entry number
      const { data: lastEntry } = await supabase
        .from('journal_entries')
        .select('entry_number')
        .eq('company_id', companyId)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = lastEntry
        ? (parseInt(lastEntry.entry_number) + 1).toString().padStart(6, '0')
        : '000001';

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: nextEntryNumber,
          entry_date: new Date().toISOString(),
          description: `شراء مركبة - ${vehicleId}`,
          reference_type: 'vehicle_purchase',
          reference_id: vehicleId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create vehicle purchase entry:', entryError);
        return;
      }

      // Create lines
      const lines = [
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1400'], // Vehicles (asset)
          line_description: 'شراء مركبة',
          debit_amount: purchasePrice,
          credit_amount: 0,
          line_number: 1,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1010'], // Cash (down payment)
          line_description: 'الدفعة المقدمة',
          debit_amount: 0,
          credit_amount: downPayment,
          line_number: 2,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['2300'], // Vehicle Loans Payable (or Accounts Payable)
          line_description: 'ذمم دائنة للوكيل',
          debit_amount: 0,
          credit_amount: loanAmount,
          line_number: 3,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create vehicle purchase lines:', linesError);
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      console.log('✅ Vehicle purchase entry created');
    } catch (error) {
      console.error('Error creating vehicle purchase entry:', error);
    }
  };

  /**
   * Delete journal entry for an installment
   * @param installmentId The installment ID
   * @param companyId The company ID
   */
  const deleteJournalEntry = async (installmentId: string, companyId: string) => {
    try {
      // Find the journal entry
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'vehicle_installment')
        .eq('reference_id', installmentId)
        .single();

      if (!entry) {
        console.log('No journal entry found for installment');
        return;
      }

      // Delete journal entry lines first
      await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', entry.id);

      // Delete journal entry
      await supabase.from('journal_entries').delete().eq('id', entry.id);

      console.log('✅ Journal entry deleted for installment');
    } catch (error) {
      console.error('Error deleting journal entry for installment:', error);
    }
  };

  return {
    recordInstallmentPayment,
    createJournalEntry,
    createVehiclePurchaseEntry,
    deleteJournalEntry,
  };
};

