import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyScope } from "./useCompanyScope";

export interface StatementTransaction {
  id: string;
  entry_date: string;
  entry_number: string;
  description: string;
  reference_type?: string;
  reference_id?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  cost_center_name?: string;
  status: string;
}

export interface AccountStatementData {
  account_id: string;
  account_code: string;
  account_name: string;
  account_name_ar: string;
  balance_type: string;
  opening_balance: number;
  closing_balance: number;
  total_debits: number;
  total_credits: number;
  transactions: StatementTransaction[];
  period_from: string;
  period_to: string;
  statement_type: 'detailed' | 'summary';
}

interface UseAccountStatementParams {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  statementType: 'detailed' | 'summary';
  enabled?: boolean;
}

export const useAccountStatement = ({
  accountId,
  dateFrom,
  dateTo,
  statementType,
  enabled = true
}: UseAccountStatementParams) => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ['account-statement', accountId, dateFrom, dateTo, statementType, companyId],
    queryFn: async (): Promise<AccountStatementData> => {
      if (!companyId) throw new Error('Company ID is required');

      // Get account details
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_name_ar, balance_type, current_balance')
        .eq('id', accountId)
        .eq('company_id', companyId)
        .single();

      if (accountError) throw accountError;
      if (!account) throw new Error('Account not found');

      // Calculate opening balance (balance before the period)
      const { data: openingData, error: openingError } = await supabase
        .from('journal_entry_lines')
        .select(`
          debit_amount,
          credit_amount,
          journal_entries!inner(entry_date, status)
        `)
        .eq('account_id', accountId)
        .lt('journal_entries.entry_date', dateFrom)
        .eq('journal_entries.status', 'posted')
        .eq('journal_entries.company_id', companyId);

      if (openingError) throw openingError;

      const openingMovements = openingData || [];
      const openingDebitTotal = openingMovements.reduce((sum, mov) => sum + (mov.debit_amount || 0), 0);
      const openingCreditTotal = openingMovements.reduce((sum, mov) => sum + (mov.credit_amount || 0), 0);
      
      const opening_balance = account.balance_type === 'debit' 
        ? openingDebitTotal - openingCreditTotal
        : openingCreditTotal - openingDebitTotal;

      // Get transactions for the period
      const { data: transactions, error: transError } = await supabase
        .from('journal_entry_lines')
        .select(`
          id,
          line_description,
          debit_amount,
          credit_amount,
          journal_entry_id,
          journal_entries!journal_entry_lines_journal_entry_id_fkey(
            id,
            entry_number,
            entry_date,
            description,
            reference_type,
            reference_id,
            status,
            company_id
          ),
          cost_centers(center_name)
        `)
        .eq('account_id', accountId)
        .gte('journal_entries.entry_date', dateFrom)
        .lte('journal_entries.entry_date', dateTo)
        .eq('journal_entries.status', 'posted')
        .eq('journal_entries.company_id', companyId)
        .order('journal_entries.entry_date', { ascending: true })
        .order('journal_entries.entry_number', { ascending: true });

      if (transError) throw transError;

      // Calculate running balances and prepare statement transactions
      let running_balance = opening_balance;
      const statementTransactions: StatementTransaction[] = [];
      let total_debits = 0;
      let total_credits = 0;

      (transactions || []).forEach((trans) => {
        const debit_amount = trans.debit_amount || 0;
        const credit_amount = trans.credit_amount || 0;
        
        total_debits += debit_amount;
        total_credits += credit_amount;

        // Update running balance based on account type
        if (account.balance_type === 'debit') {
          running_balance += debit_amount - credit_amount;
        } else {
          running_balance += credit_amount - debit_amount;
        }

        // For summary type, group by date
        if (statementType === 'summary') {
          const existingEntry = statementTransactions.find(
            t => t.entry_date === trans.journal_entries.entry_date
          );
          
          if (existingEntry) {
            existingEntry.debit_amount += debit_amount;
            existingEntry.credit_amount += credit_amount;
            existingEntry.running_balance = running_balance;
          } else {
            statementTransactions.push({
              id: trans.id,
              entry_date: trans.journal_entries.entry_date,
              entry_number: `متعدد`,
              description: `إجمالي حركات اليوم`,
              debit_amount,
              credit_amount,
              running_balance,
              cost_center_name: trans.cost_centers?.center_name,
              status: trans.journal_entries.status
            });
          }
        } else {
          // Detailed statement
          statementTransactions.push({
            id: trans.id,
            entry_date: trans.journal_entries.entry_date,
            entry_number: trans.journal_entries.entry_number,
            description: trans.line_description || trans.journal_entries.description,
            reference_type: trans.journal_entries.reference_type,
            reference_id: trans.journal_entries.reference_id,
            debit_amount,
            credit_amount,
            running_balance,
            cost_center_name: trans.cost_centers?.center_name,
            status: trans.journal_entries.status
          });
        }
      });

      const closing_balance = running_balance;

      return {
        account_id: account.id,
        account_code: account.account_code,
        account_name: account.account_name,
        account_name_ar: account.account_name_ar,
        balance_type: account.balance_type,
        opening_balance,
        closing_balance,
        total_debits,
        total_credits,
        transactions: statementTransactions,
        period_from: dateFrom,
        period_to: dateTo,
        statement_type: statementType
      };
    },
    enabled: enabled && !!accountId && !!dateFrom && !!dateTo && !!companyId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};