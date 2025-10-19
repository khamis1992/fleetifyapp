import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for integrating payroll with the accounting system
 * Creates journal entries automatically when payroll is processed
 */
export const usePayrollJournalIntegration = () => {
  const { toast } = useToast();

  /**
   * Create journal entry for a payroll record
   * @param payroll The payroll record
   */
  const createJournalEntry = async (payroll: any) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', payroll.company_id)
        .in('account_code', ['1010', '2200', '5300', '5400']); 
      // Cash, Salaries Payable, Salaries Expense, Benefits Expense

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for payroll');
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
        .eq('company_id', payroll.company_id)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = lastEntry
        ? (parseInt(lastEntry.entry_number) + 1).toString().padStart(6, '0')
        : '000001';

      // Calculate components
      const basicSalary = payroll.basic_salary || 0;
      const allowances = payroll.allowances || 0;
      const deductions = payroll.deductions || 0;
      const netSalary = basicSalary + allowances - deductions;

      const description = `رواتب - ${payroll.employee_name || 'موظف'} - ${payroll.period || ''}`;

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: payroll.company_id,
          entry_number: nextEntryNumber,
          entry_date: payroll.payment_date || payroll.created_at,
          description,
          reference_type: 'payroll',
          reference_id: payroll.id,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create journal entry for payroll:', entryError);
        return;
      }

      // Create journal entry lines
      const lines: unknown[] = [];

      // Debit: Salaries Expense (basic salary)
      if (basicSalary > 0) {
        lines.push({
          account_id: accountMap['5300'], // Salaries Expense
          debit: basicSalary,
          credit: 0,
        });
      }

      // Debit: Benefits Expense (allowances)
      if (allowances > 0) {
        lines.push({
          account_id: accountMap['5400'], // Benefits Expense
          debit: allowances,
          credit: 0,
        });
      }

      // Determine if paid or accrued
      const isPaid = payroll.status === 'paid';

      if (isPaid) {
        // Credit: Cash (net salary)
        lines.push({
          account_id: accountMap['1010'], // Cash
          debit: 0,
          credit: netSalary,
        });
      } else {
        // Credit: Salaries Payable (net salary)
        lines.push({
          account_id: accountMap['2200'], // Salaries Payable
          debit: 0,
          credit: netSalary,
        });
      }

      // Insert lines
      const linesWithEntry = lines.map((line) => ({
        ...line,
        journal_entry_id: entry.id,
        company_id: payroll.company_id,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntry);

      if (linesError) {
        console.error('Failed to create journal entry lines for payroll:', linesError);
        // Rollback journal entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      console.log('✅ Journal entry created for payroll:', entry.entry_number);
    } catch (error) {
      console.error('Error creating journal entry for payroll:', error);
    }
  };

  /**
   * Create journal entry for payroll payment (when status changes to paid)
   * @param payrollId The payroll ID
   * @param companyId The company ID
   */
  const createPaymentEntry = async (payrollId: string, companyId: string) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1010', '2200']); // Cash, Salaries Payable

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for payroll payment');
        return;
      }

      const accountMap: Record<string, string> = {};
      accounts.forEach((acc) => {
        accountMap[acc.account_code] = acc.id;
      });

      // Get payroll record
      const { data: payroll } = await supabase
        .from('payroll')
        .select('*')
        .eq('id', payrollId)
        .single();

      if (!payroll) {
        console.error('Payroll record not found');
        return;
      }

      const netSalary = (payroll.basic_salary || 0) + (payroll.allowances || 0) - (payroll.deductions || 0);

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

      // Create payment journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: nextEntryNumber,
          entry_date: payroll.payment_date || new Date().toISOString(),
          description: `دفع راتب - ${payroll.employee_name || 'موظف'}`,
          reference_type: 'payroll_payment',
          reference_id: payrollId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create payment entry:', entryError);
        return;
      }

      // Create lines: Debit Salaries Payable, Credit Cash
      const lines = [
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['2200'], // Salaries Payable
          debit: netSalary,
          credit: 0,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1010'], // Cash
          debit: 0,
          credit: netSalary,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create payment lines:', linesError);
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      console.log('✅ Payment entry created for payroll');
    } catch (error) {
      console.error('Error creating payment entry for payroll:', error);
    }
  };

  /**
   * Delete journal entry for a payroll record
   * @param payrollId The payroll ID
   * @param companyId The company ID
   */
  const deleteJournalEntry = async (payrollId: string, companyId: string) => {
    try {
      // Find all related journal entries (payroll and payment)
      const { data: entries } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .or(`reference_id.eq.${payrollId},reference_type.eq.payroll,reference_type.eq.payroll_payment`);

      if (!entries || entries.length === 0) {
        console.log('No journal entries found for payroll');
        return;
      }

      for (const entry of entries) {
        // Delete lines first
        await supabase
          .from('journal_entry_lines')
          .delete()
          .eq('journal_entry_id', entry.id);

        // Delete entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
      }

      console.log('✅ Journal entries deleted for payroll');
    } catch (error) {
      console.error('Error deleting journal entries for payroll:', error);
    }
  };

  return {
    createJournalEntry,
    createPaymentEntry,
    deleteJournalEntry,
  };
};

