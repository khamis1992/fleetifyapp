import { supabase } from '@/integrations/supabase/client';
import * as Sentry from "@sentry/react";
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for integrating vehicle maintenance with the accounting system
 * Creates journal entries automatically when maintenance is recorded
 */
export const useMaintenanceJournalIntegration = () => {
  const { toast } = useToast();

  /**
   * Create journal entry for a maintenance record
   * @param maintenance The maintenance record
   */
  const createJournalEntry = async (maintenance: any) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', maintenance.company_id)
        .in('account_code', ['1010', '2100', '5200']); // Cash, Accounts Payable, Maintenance Expense

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for maintenance');
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
        .eq('company_id', maintenance.company_id)
        .order('entry_number', { ascending: false })
        .limit(1)
        .single();

      const nextEntryNumber = lastEntry
        ? (parseInt(lastEntry.entry_number) + 1).toString().padStart(6, '0')
        : '000001';

      // Determine payment status
      const isPaid = maintenance.status === 'completed' && maintenance.paid;
      const isPartiallyPaid = maintenance.amount_paid > 0 && maintenance.amount_paid < maintenance.cost;
      
      let description = `صيانة - ${maintenance.maintenance_type || 'عامة'}`;
      if (maintenance.vehicle_id) {
        description += ` - مركبة ${maintenance.vehicle_id}`;
      }

      // Create journal entry
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: maintenance.company_id,
          entry_number: nextEntryNumber,
          entry_date: maintenance.maintenance_date || maintenance.created_at,
          description,
          reference_type: 'maintenance',
          reference_id: maintenance.id,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create journal entry for maintenance:', entryError);
        return;
      }

      // Create journal entry lines based on payment status
      const lines: unknown[] = [];

      if (isPaid) {
        // Fully paid - debit expense, credit cash
        lines.push(
          {
            account_id: accountMap['5200'], // Maintenance Expense
            debit: maintenance.cost,
            credit: 0,
          },
          {
            account_id: accountMap['1010'], // Cash
            debit: 0,
            credit: maintenance.cost,
          }
        );
      } else if (isPartiallyPaid) {
        // Partially paid
        // 1. Record expense
        lines.push({
          account_id: accountMap['5200'], // Maintenance Expense
          debit: maintenance.cost,
          credit: 0,
        });

        // 2. Record cash payment
        if (maintenance.amount_paid > 0) {
          lines.push({
            account_id: accountMap['1010'], // Cash
            debit: 0,
            credit: maintenance.amount_paid,
          });
        }

        // 3. Record remaining as accounts payable
        const remaining = maintenance.cost - (maintenance.amount_paid || 0);
        if (remaining > 0) {
          lines.push({
            account_id: accountMap['2100'], // Accounts Payable
            debit: 0,
            credit: remaining,
          });
        }
      } else {
        // Not paid - debit expense, credit accounts payable
        lines.push(
          {
            account_id: accountMap['5200'], // Maintenance Expense
            debit: maintenance.cost,
            credit: 0,
          },
          {
            account_id: accountMap['2100'], // Accounts Payable
            debit: 0,
            credit: maintenance.cost,
          }
        );
      }

      // Insert lines
      const linesWithEntry = lines.map((line) => ({
        ...line,
        journal_entry_id: entry.id,
        company_id: maintenance.company_id,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(linesWithEntry);

      if (linesError) {
        console.error('Failed to create journal entry lines for maintenance:', linesError);
        // Rollback journal entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return;
      }

      console.log('✅ Journal entry created for maintenance:', entry.entry_number);
    } catch (error) {
      console.error('Error creating journal entry for maintenance:', error);
    }
  };

  /**
   * Update journal entry when maintenance payment status changes
   * @param maintenanceId The maintenance ID
   * @param companyId The company ID
   * @param newPaymentAmount New payment amount
   */
  const updatePaymentEntry = async (
    maintenanceId: string,
    companyId: string,
    newPaymentAmount: number
  ) => {
    try {
      // Find the existing journal entry
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'maintenance')
        .eq('reference_id', maintenanceId)
        .single();

      if (!entry) {
        console.log('No journal entry found for maintenance');
        return;
      }

      // For simplicity, we'll delete the old entry and create a new one
      // In a production system, you might want to create an adjustment entry instead
      await deleteJournalEntry(maintenanceId, companyId);

      // Get the maintenance record and recreate entry
      const { data: maintenance } = await supabase
        .from('maintenance')
        .select('*')
        .eq('id', maintenanceId)
        .single();

      if (maintenance) {
        await createJournalEntry(maintenance);
      }
    } catch (error) {
      console.error('Error updating payment entry for maintenance:', error);
    }
  };

  /**
   * Delete journal entry for a maintenance record
   * @param maintenanceId The maintenance ID
   * @param companyId The company ID
   */
  const deleteJournalEntry = async (maintenanceId: string, companyId: string) => {
    try {
      // Find the journal entry
      const { data: entry } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'maintenance')
        .eq('reference_id', maintenanceId)
        .single();

      if (!entry) {
        console.log('No journal entry found for maintenance');
        return;
      }

      // Delete journal entry lines first
      await supabase
        .from('journal_entry_lines')
        .delete()
        .eq('journal_entry_id', entry.id);

      // Delete journal entry
      await supabase.from('journal_entries').delete().eq('id', entry.id);

      console.log('✅ Journal entry deleted for maintenance');
    } catch (error) {
      console.error('Error deleting journal entry for maintenance:', error);
    }
  };

  return {
    createJournalEntry,
    updatePaymentEntry,
    deleteJournalEntry,
  };
};

