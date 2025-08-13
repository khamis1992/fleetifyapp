import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";

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
  const { companyId } = useUnifiedCompanyAccess();

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
          journal_entries(entry_date, status)
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
          journal_entries(
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
        .eq('journal_entries.company_id', companyId);

      if (transError) throw transError;

      // Sort transactions by entry date and entry number
      const sortedTransactions = (transactions || []).sort((a, b) => {
        const dateA = new Date(a.journal_entries.entry_date);
        const dateB = new Date(b.journal_entries.entry_date);
        
        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // If dates are equal, sort by entry number
        return a.journal_entries.entry_number.localeCompare(b.journal_entries.entry_number);
      });

      // Calculate running balances and prepare statement transactions
      let running_balance = opening_balance;
      const statementTransactions: StatementTransaction[] = [];
      let total_debits = 0;
      let total_credits = 0;

      if (statementType === 'summary') {
        // Group transactions by operation type for summary
        const operationGroups = new Map<string, { 
          transactions: typeof sortedTransactions, 
          total_debit: number, 
          total_credit: number 
        }>();

        sortedTransactions.forEach((trans) => {
          const debit_amount = trans.debit_amount || 0;
          const credit_amount = trans.credit_amount || 0;
          
          // Determine operation type based on description or reference type
          let operationType = 'عمليات أخرى';
          const journalDescription = trans.journal_entries.description?.toLowerCase() || '';
          const lineDescription = trans.line_description?.toLowerCase() || '';
          const referenceType = trans.journal_entries.reference_type || '';
          const description = `${journalDescription} ${lineDescription}`.toLowerCase();
          
          if (description.includes('invoice') || description.includes('فاتورة')) {
            operationType = 'فواتير الإيجار';
          } else if (description.includes('payment') || description.includes('دفع') || description.includes('سداد')) {
            operationType = 'مدفوعات العملاء';
          } else if (description.includes('discount') || description.includes('خصم') || description.includes('fine') || description.includes('غرامة')) {
            operationType = 'خصومات وغرامات';
          } else if (description.includes('contract') || description.includes('عقد')) {
            operationType = 'عقود الإيجار';
          }

          if (!operationGroups.has(operationType)) {
            operationGroups.set(operationType, { 
              transactions: [], 
              total_debit: 0, 
              total_credit: 0 
            });
          }

          const group = operationGroups.get(operationType)!;
          group.transactions.push(trans);
          group.total_debit += debit_amount;
          group.total_credit += credit_amount;
        });

        // Sort operation types and create summary entries
        const sortedOperationTypes = Array.from(operationGroups.keys()).sort();

        sortedOperationTypes.forEach((operationType) => {
          const group = operationGroups.get(operationType)!;
          
          total_debits += group.total_debit;
          total_credits += group.total_credit;

          // Update running balance based on account type
          if (account.balance_type === 'debit') {
            running_balance += group.total_debit - group.total_credit;
          } else {
            running_balance += group.total_credit - group.total_debit;
          }

          statementTransactions.push({
            id: `summary-${operationType}`,
            entry_date: sortedTransactions[0]?.journal_entries.entry_date || dateFrom,
            entry_number: 'متعدد',
            description: `${operationType} (${group.transactions.length} عملية)`,
            debit_amount: group.total_debit,
            credit_amount: group.total_credit,
            running_balance,
            status: 'posted'
          });
        });
      } else {
        // Detailed statement - show each transaction
        sortedTransactions.forEach((trans) => {
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
        });
      }

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