import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for integrating vehicle installment payments with the accounting system
 * Creates journal entries automatically when installments are paid
 */
export const useVehicleInstallmentJournalIntegration = () => {
  const { toast } = useToast();

  /**
   * Create journal entry for a vehicle installment payment
   * @param installment The installment payment record
   */
  const createJournalEntry = async (installment: any) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', installment.company_id)
        .in('account_code', ['1010', '2300', '5500']); 
      // Cash, Vehicle Loans Payable, Interest Expense

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for vehicle installment');
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
        .eq('company_id', installment.company_id)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = lastEntry
        ? (parseInt(lastEntry.entry_number) + 1).toString().padStart(6, '0')
        : '000001';

      // Calculate principal and interest
      const totalPayment = installment.amount || 0;
      const interestAmount = installment.interest_amount || 0;
      const principalAmount = totalPayment - interestAmount;

      const description = `قسط مركبة - ${installment.vehicle_id || ''} - ${installment.installment_number || ''}`;

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: installment.company_id,
          entry_number: nextEntryNumber,
          entry_date: installment.payment_date || installment.created_at,
          description,
          reference_type: 'vehicle_installment',
          reference_id: installment.id,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create journal entry for installment:', entryError);
        return;
      }

      // Create journal entry lines
      const lines: any[] = [];

      // Debit: Vehicle Loans Payable (principal portion)
      if (principalAmount > 0) {
        lines.push({
          account_id: accountMap['2300'], // Vehicle Loans Payable
          debit: principalAmount,
          credit: 0,
        });
      }

      // Debit: Interest Expense (interest portion)
      if (interestAmount > 0) {
        lines.push({
          account_id: accountMap['5500'], // Interest Expense
          debit: interestAmount,
          credit: 0,
        });
      }

      // Credit: Cash (total payment)
      lines.push({
        account_id: accountMap['1010'], // Cash
        debit: 0,
        credit: totalPayment,
      });

      // Insert lines
      const linesWithEntry = lines.map((line) => ({
        ...line,
        journal_entry_id: entry.id,
        company_id: installment.company_id,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntry);

      if (linesError) {
        console.error('Failed to create journal entry lines for installment:', linesError);
        // Rollback journal entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      console.log('✅ Journal entry created for vehicle installment:', entry.entry_number);
    } catch (error) {
      console.error('Error creating journal entry for installment:', error);
    }
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
          debit: purchasePrice,
          credit: 0,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1010'], // Cash (down payment)
          debit: 0,
          credit: downPayment,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['2300'], // Vehicle Loans Payable
          debit: 0,
          credit: loanAmount,
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
    createJournalEntry,
    createVehiclePurchaseEntry,
    deleteJournalEntry,
  };
};

