import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for integrating traffic violations with the accounting system
 * Creates journal entries automatically when violations are recorded
 */
export const useTrafficViolationJournalIntegration = () => {
  const { toast } = useToast();

  /**
   * Create journal entry for a traffic violation
   * @param violation The traffic violation record
   */
  const createJournalEntry = async (violation: any) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', violation.company_id)
        .in('account_code', ['1010', '1200', '4300', '5700']);

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for traffic violation');
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
        .eq('company_id', violation.company_id)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = lastEntry ? parseInt(lastEntry.entry_number) + 1 : 1;

      // Determine who pays for the violation
      const isCustomerResponsible = violation.charged_to_customer || false;
      
      let description = '';
      let lines: any[] = [];

      if (isCustomerResponsible) {
        // Customer pays - treat as revenue
        description = `مخالفة مرورية - ${violation.violation_type} - يتحملها العميل`;
        
        lines = [
          {
            account_id: accountMap['1200'], // Accounts Receivable
            debit: violation.fine_amount,
            credit: 0,
          },
          {
            account_id: accountMap['4300'], // Other Revenue
            debit: 0,
            credit: violation.fine_amount,
          },
        ];
      } else {
        // Company pays - treat as expense
        description = `مخالفة مرورية - ${violation.violation_type} - تتحملها الشركة`;
        
        lines = [
          {
            account_id: accountMap['5700'], // Traffic Violations Expense
            debit: violation.fine_amount,
            credit: 0,
          },
          {
            account_id: accountMap['1010'], // Cash
            debit: 0,
            credit: violation.fine_amount,
          },
        ];
      }

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: violation.company_id,
          entry_number: nextEntryNumber.toString().padStart(6, '0'),
          entry_date: violation.violation_date,
          description,
          reference_type: 'traffic_violation',
          reference_id: violation.id,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create journal entry for traffic violation:', entryError);
        return;
      }

      // Create journal entry lines
      const linesWithEntry = lines.map((line) => ({
        ...line,
        journal_entry_id: entry.id,
        company_id: violation.company_id,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntry);

      if (linesError) {
        console.error('Failed to create journal entry lines for traffic violation:', linesError);
        // Rollback journal entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      console.log('✅ Journal entry created for traffic violation:', entry.entry_number);
    } catch (error) {
      console.error('Error creating journal entry for traffic violation:', error);
    }
  };

  /**
   * Delete journal entry for a traffic violation
   * @param violationId The traffic violation ID
   * @param companyId The company ID
   */
  const deleteJournalEntry = async (violationId: string, companyId: string) => {
    try {
      // Find the journal entry
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'traffic_violation')
        .eq('reference_id', violationId)
        .single();

      if (!entry) {
        console.log('No journal entry found for traffic violation');
        return;
      }

      // Delete journal entry lines first
      await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', entry.id);

      // Delete journal entry
      await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entry.id);

      console.log('✅ Journal entry deleted for traffic violation');
    } catch (error) {
      console.error('Error deleting journal entry for traffic violation:', error);
    }
  };

  return {
    createJournalEntry,
    deleteJournalEntry,
  };
};

