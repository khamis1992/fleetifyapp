import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for managing bad debt provisions and write-offs
 * Handles allowance for doubtful accounts and bad debt expense
 */
export const useBadDebtProvision = () => {
  const { toast } = useToast();

  /**
   * Create provision for doubtful accounts
   * @param companyId Company ID
   * @param amount Provision amount
   * @param description Description of the provision
   */
  const createProvision = async (
    companyId: string,
    amount: number,
    description: string
  ) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1210', '5600']); // Allowance for Doubtful Accounts, Bad Debt Expense

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for bad debt provision');
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
          description: `مخصص ديون مشكوك فيها - ${description}`,
          reference_type: 'bad_debt_provision',
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create provision entry:', entryError);
        return { success: false, error: entryError?.message };
      }

      // Create lines: Debit Bad Debt Expense, Credit Allowance for Doubtful Accounts
      const lines = [
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['5600'], // Bad Debt Expense
          debit: amount,
          credit: 0,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1210'], // Allowance for Doubtful Accounts
          debit: 0,
          credit: amount,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create provision lines:', linesError);
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return { success: false, error: linesError.message };
      }

      return { success: true, entryId: entry.id };
    } catch (error) {
      console.error('Error creating bad debt provision:', error);
      return { success: false, error: String(error) };
    }
  };

  /**
   * Write off a specific bad debt
   * @param companyId Company ID
   * @param customerId Customer ID
   * @param amount Amount to write off
   * @param description Description
   */
  const writeOffBadDebt = async (
    companyId: string,
    customerId: string,
    amount: number,
    description: string
  ) => {
    try {
      // Get required accounts
      const { data: accounts } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code')
        .eq('company_id', companyId)
        .in('account_code', ['1200', '1210']); // Accounts Receivable, Allowance for Doubtful Accounts

      if (!accounts || accounts.length < 2) {
        console.error('Required accounts not found for bad debt write-off');
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
          description: `شطب دين معدوم - ${description}`,
          reference_type: 'bad_debt_writeoff',
          reference_id: customerId,
          status: 'posted',
        })
        .select()
        .single();

      if (entryError || !entry) {
        console.error('Failed to create write-off entry:', entryError);
        return { success: false, error: entryError?.message };
      }

      // Create lines: Debit Allowance, Credit AR
      const lines = [
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1210'], // Allowance for Doubtful Accounts
          debit: amount,
          credit: 0,
        },
        {
          journal_entry_id: entry.id,
          company_id: companyId,
          account_id: accountMap['1200'], // Accounts Receivable
          debit: 0,
          credit: amount,
        },
      ];

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        console.error('Failed to create write-off lines:', linesError);
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return { success: false, error: linesError.message };
      }

      return { success: true, entryId: entry.id };
    } catch (error) {
      console.error('Error writing off bad debt:', error);
      return { success: false, error: String(error) };
    }
  };

  /**
   * Calculate recommended provision based on aging analysis
   * @param companyId Company ID
   * @returns Recommended provision amount
   */
  const calculateRecommendedProvision = async (companyId: string) => {
    try {
      // Get all unpaid receivables
      const { data: receivables } = await supabase
        .from('rental_payment_receipts')
        .select('rental_amount, fine_amount, amount_paid, payment_date')
        .eq('company_id', companyId)
        .neq('status', 'paid');

      if (!receivables || receivables.length === 0) {
        return { success: true, recommendedAmount: 0, breakdown: [] };
      }

      const today = new Date();
      const breakdown: unknown[] = [];
      let totalProvision = 0;

      for (const rec of receivables) {
        const totalDue = (rec.rental_amount || 0) + (rec.fine_amount || 0);
        const balance = totalDue - (rec.amount_paid || 0);

        if (balance <= 0) continue;

        const paymentDate = new Date(rec.payment_date);
        const daysOverdue = Math.floor(
          (today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Aging categories and provision percentages
        let provisionRate = 0;
        let category = '';

        if (daysOverdue <= 30) {
          provisionRate = 0.01; // 1%
          category = '0-30 days';
        } else if (daysOverdue <= 60) {
          provisionRate = 0.05; // 5%
          category = '31-60 days';
        } else if (daysOverdue <= 90) {
          provisionRate = 0.10; // 10%
          category = '61-90 days';
        } else if (daysOverdue <= 180) {
          provisionRate = 0.25; // 25%
          category = '91-180 days';
        } else {
          provisionRate = 0.50; // 50%
          category = '180+ days';
        }

        const provision = balance * provisionRate;
        totalProvision += provision;

        breakdown.push({
          category,
          balance,
          provisionRate,
          provision,
        });
      }

      return {
        success: true,
        recommendedAmount: Math.round(totalProvision * 100) / 100,
        breakdown,
      };
    } catch (error) {
      console.error('Error calculating recommended provision:', error);
      return { success: false, error: String(error) };
    }
  };

  return {
    createProvision,
    writeOffBadDebt,
    calculateRecommendedProvision,
  };
};

