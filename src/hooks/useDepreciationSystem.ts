import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for automatic depreciation calculation and journal entry creation
 * Supports straight-line depreciation method
 */
export const useDepreciationSystem = () => {
  const { toast } = useToast();

  /**
   * Calculate monthly depreciation for a vehicle
   * @param purchasePrice Original cost of the vehicle
   * @param salvageValue Estimated value at end of useful life
   * @param usefulLifeYears Expected useful life in years
   * @returns Monthly depreciation amount
   */
  const calculateMonthlyDepreciation = (
    purchasePrice: number,
    salvageValue: number,
    usefulLifeYears: number
  ): number => {
    const depreciableAmount = purchasePrice - salvageValue;
    const monthlyDepreciation = depreciableAmount / (usefulLifeYears * 12);
    return Math.round(monthlyDepreciation * 100) / 100; // Round to 2 decimals
  };

  /**
   * Create depreciation journal entry for a specific month
   * @param companyId Company ID
   * @param vehicleId Vehicle ID
   * @param month Month (1-12)
   * @param year Year
   * @param amount Depreciation amount
   */
  const createDepreciationEntry = async (
    companyId: string,
    vehicleId: string,
    month: number,
    year: number,
    amount: number
  ) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1300', '5100']); // Accumulated Depreciation, Depreciation Expense

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for depreciation');
        return { success: false, error: 'Missing accounts' };
      }

      const accountMap: Record<string, string> = {};
      accounts.forEach((acc) => {
        accountMap[acc.account_code] = acc.id;
      });

      // Check if already created
      const monthStr = `${year}-${month.toString().padStart(2, '0')}`;
      const { data: existing } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('company_id', companyId)
        .eq('reference_type', 'depreciation')
        .eq('reference_id', vehicleId)
        .ilike('description', `%${monthStr}%`)
        .single();

      if (existing) {
        return { success: false, error: 'Already exists' };
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

      // Create journal entry
      const entryDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: companyId,
          entry_number: nextEntryNumber,
          entry_date: entryDate,
          description: `استهلاك شهري - ${monthStr}`,
          reference_type: 'depreciation',
          reference_id: vehicleId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create depreciation entry:', entryError);
        return { success: false, error: entryError?.message };
      }

      // Create journal entry lines
      const lines = [
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['5100'], // Depreciation Expense
          debit: amount,
          credit: 0,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1300'], // Accumulated Depreciation
          debit: 0,
          credit: amount,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create depreciation lines:', linesError);
        // Rollback
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return { success: false, error: linesError.message };
      }

      return { success: true, entryId: entry.id };
    } catch (error) {
      console.error('Error creating depreciation entry:', error);
      return { success: false, error: String(error) };
    }
  };

  /**
   * Process depreciation for all vehicles for a specific month
   * @param companyId Company ID
   * @param month Month (1-12)
   * @param year Year
   */
  const processMonthlyDepreciation = async (
    companyId: string,
    month: number,
    year: number
  ) => {
    try {
      // Get all vehicles for the company
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, make, model, year, purchase_price, salvage_value, useful_life_years')
        .eq('company_id', companyId)
        .eq('status', 'active');

      if (!vehicles || vehicles.length === 0) {
        return {
          success: true,
          processed: 0,
          skipped: 0,
          failed: 0,
        };
      }

      let processed = 0;
      let skipped = 0;
      let failed = 0;

      for (const vehicle of vehicles) {
        // Skip if missing depreciation data
        if (
          !vehicle.purchase_price ||
          vehicle.salvage_value === null ||
          !vehicle.useful_life_years
        ) {
          skipped++;
          continue;
        }

        const monthlyAmount = calculateMonthlyDepreciation(
          vehicle.purchase_price,
          vehicle.salvage_value || 0,
          vehicle.useful_life_years
        );

        const result = await createDepreciationEntry(
          companyId,
          vehicle.id,
          month,
          year,
          monthlyAmount
        );

        if (result.success) {
          processed++;
        } else if (result.error === 'Already exists') {
          skipped++;
        } else {
          failed++;
        }

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 100));
      }

      return {
        success: true,
        processed,
        skipped,
        failed,
        total: vehicles.length,
      };
    } catch (error) {
      console.error('Error processing monthly depreciation:', error);
      return {
        success: false,
        error: String(error),
      };
    }
  };

  return {
    calculateMonthlyDepreciation,
    createDepreciationEntry,
    processMonthlyDepreciation,
  };
};

