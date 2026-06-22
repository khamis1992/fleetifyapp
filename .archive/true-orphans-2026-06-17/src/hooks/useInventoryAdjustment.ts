import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing inventory adjustments and creating related journal entries
 * Handles physical inventory counts, shrinkage, and adjustments
 */
export const useInventoryAdjustment = () => {
  const { toast } = useToast();

  /**
   * Create inventory adjustment entry
   * @param companyId Company ID
   * @param adjustmentType Type of adjustment (increase/decrease)
   * @param amount Adjustment amount
   * @param reason Reason for adjustment
   * @param referenceId Optional reference ID (e.g., item ID)
   */
  const createAdjustment = async (
    companyId: string,
    adjustmentType: 'increase' | 'decrease',
    amount: number,
    reason: string,
    referenceId?: string
  ) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1500', '5800']); // Inventory, Inventory Adjustment Expense

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for inventory adjustment');
        return { success: false, error: 'Missing accounts' };
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
          description: `تسوية مخزون - ${reason}`,
          reference_type: 'inventory_adjustment',
          reference_id: referenceId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create adjustment entry:', entryError);
        return { success: false, error: entryError?.message };
      }

      // Create lines based on adjustment type
      const lines =
        adjustmentType === 'increase'
          ? [
              {
                journal_entry_id: entry.id,
                company_id: companyId,
                account_id: accountMap['1500'], // Inventory
                debit: amount,
                credit: 0,
              },
              {
                journal_entry_id: entry.id,
                company_id: companyId,
                account_id: accountMap['5800'], // Inventory Adjustment Expense (negative expense = income)
                debit: 0,
                credit: amount,
              },
            ]
          : [
              {
                journal_entry_id: entry.id,
                company_id: companyId,
                account_id: accountMap['5800'], // Inventory Adjustment Expense
                debit: amount,
                credit: 0,
              },
              {
                journal_entry_id: entry.id,
                company_id: companyId,
                account_id: accountMap['1500'], // Inventory
                debit: 0,
                credit: amount,
              },
            ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create adjustment lines:', linesError);
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return { success: false, error: linesError.message };
      }

      return { success: true, entryId: entry.id };
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      return { success: false, error: String(error) };
    }
  };

  /**
   * Record physical inventory count and create adjustment if needed
   * @param companyId Company ID
   * @param bookValue Book value from records
   * @param physicalCount Actual physical count value
   * @param description Description of the count
   */
  const recordPhysicalCount = async (
    companyId: string,
    bookValue: number,
    physicalCount: number,
    description: string
  ) => {
    try {
      const difference = physicalCount - bookValue;

      if (difference === 0) {
        return {
          success: true,
          message: 'No adjustment needed - counts match',
          difference: 0,
        };
      }

      const adjustmentType = difference > 0 ? 'increase' : 'decrease';
      const amount = Math.abs(difference);
      const reason = `جرد فعلي - ${description} - فرق: ${difference}`;

      const result = await createAdjustment(
        companyId,
        adjustmentType,
        amount,
        reason
      );

      return {
        ...result,
        difference,
        adjustmentType,
      };
    } catch (error) {
      console.error('Error recording physical count:', error);
      return { success: false, error: String(error) };
    }
  };

  /**
   * Record inventory shrinkage (loss, theft, damage)
   * @param companyId Company ID
   * @param amount Amount of shrinkage
   * @param reason Reason for shrinkage
   * @param referenceId Optional reference ID
   */
  const recordShrinkage = async (
    companyId: string,
    amount: number,
    reason: string,
    referenceId?: string
  ) => {
    try {
      return await createAdjustment(
        companyId,
        'decrease',
        amount,
        `هالك/تلف - ${reason}`,
        referenceId
      );
    } catch (error) {
      console.error('Error recording shrinkage:', error);
      return { success: false, error: String(error) };
    }
  };

  /**
   * Get inventory adjustment history
   * @param companyId Company ID
   * @param limit Number of records to retrieve
   */
  const getAdjustmentHistory = async (companyId: string, limit: number = 50) => {
    try {
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*, journal_entry_lines(*)')
        .eq('company_id', companyId)
        .eq('reference_type', 'inventory_adjustment')
        .order('entry_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching adjustment history:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: entries };
    } catch (error) {
      console.error('Error getting adjustment history:', error);
      return { success: false, error: String(error) };
    }
  };

  return {
    createAdjustment,
    recordPhysicalCount,
    recordShrinkage,
    getAdjustmentHistory,
  };
};

