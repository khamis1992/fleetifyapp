import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { toast } from 'sonner';
import {
  financeToday,
  readFinancialJournals,
  readAccountBalances,
  readTrialBalance,
  readFinancialSummary,
  readFinancialPages,
} from '@/services/financialReporting';

export interface LedgerFilters {
  dateFrom?: string;
  dateTo?: string;
  accountId?: string;
  costCenterId?: string;
  referenceType?: string;
  status?: string;
  searchTerm?: string;
}

export interface AccountBalance {
  account_id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  balance_type: 'debit' | 'credit';
  opening_balance: number;
  total_debits: number;
  total_credits: number;
  closing_balance: number;
}

export interface AccountMovement {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  line_description?: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  reference_type?: string;
  reference_id?: string;
  journal_entry_id: string;
  status: string;
  cost_center?: {
    id: string;
    center_code: string;
    center_name: string;
    center_name_ar?: string;
  };
}

export interface TrialBalanceItem {
  account_id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_level: number;
  debit_balance: number;
  credit_balance: number;
}

export interface FinancialSummary {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  unbalanced_entries_count: number;
}

const normalizeJournalEntryStatus = (status: string): 'posted' | 'draft' | 'reversed' | 'cancelled' => {
  if (status === 'posted' || status === 'reversed' || status === 'cancelled') return status;
  return 'draft';
};

// Journal Entry Lines Hook
export const useJournalEntryLines = (entryId: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['journalEntryLines', companyId, entryId],
    queryFn: async () => {
      if (!entryId || !companyId) throw new Error('Company and entry required');

      try {
        return readFinancialPages((from, to) =>
          supabase
            .from('journal_entry_lines')
            .select(
              `
              *, journal_entries!inner(company_id),
              chart_of_accounts!fk_journal_entry_lines_account(
                id,
                account_code,
                account_name,
                account_name_ar,
                account_type
              ),
              cost_centers!fk_journal_entry_lines_cost_center(
                id,
                center_code,
                center_name,
                center_name_ar
              ),
              fixed_assets(
                id,
                asset_code,
                asset_name,
                asset_name_ar
              ),
              employees(
                id,
                employee_number,
                first_name,
                last_name
              )
            `,
              { count: 'exact' }
            )
            .eq('journal_entry_id', entryId)
            .eq('journal_entries.company_id', companyId)
            .order('line_number')
            .order('id')
            .range(from, to)
        );
      } catch (error) {
        console.error('Error in useJournalEntryLines:', error);
        throw error;
      }
    },
    enabled: !!entryId && !!companyId,
  });
};

// Enhanced Journal Entries with relations
export const useEnhancedJournalEntries = (filters?: LedgerFilters) => {
  const { companyId, isAuthenticating, authError } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['enhancedJournalEntries', companyId, filters],
    enabled: Boolean(companyId) && !isAuthenticating && !authError,
    queryFn: async () => {
      const entries = await readFinancialJournals(companyId!, filters);
      return entries.map((entry) => ({ ...entry, status: normalizeJournalEntryStatus(entry.status) }));
    },
  });
};

// Account Balances: database aggregation includes the entire posted ledger.
export const useAccountBalances = (filters?: { accountType?: string; asOfDate?: string }) => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['accountBalances', companyId, filters],
    enabled: !!companyId,
    queryFn: () => readAccountBalances(companyId!, filters?.asOfDate, filters?.accountType),
  });
};

// Account Movements: include prior posted movements in the opening balance.
export const useAccountMovements = (accountId: string, filters?: LedgerFilters) => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['accountMovements', companyId, accountId, filters],
    enabled: !!companyId && !!accountId,
    queryFn: async (): Promise<AccountMovement[]> => {
      if (!companyId) throw new Error('Company ID is required');
      const { data: account, error: accountError } = await supabase
        .from('chart_of_accounts')
        .select('balance_type')
        .eq('id', accountId)
        .eq('company_id', companyId)
        .single();
      if (accountError) throw accountError;
      const lines = await readFinancialPages((from, to) => {
        let query = supabase
          .from('journal_entry_lines')
          .select('*,journal_entry:journal_entries!inner(*)', { count: 'exact' })
          .eq('account_id', accountId)
          .eq('journal_entry.company_id', companyId)
          .eq('journal_entry.status', 'posted')
          .lte('journal_entry.entry_date', filters?.dateTo || financeToday())
          .order('id')
          .range(from, to);
        if (filters?.costCenterId) query = query.eq('cost_center_id', filters.costCenterId);
        if (filters?.referenceType) query = query.eq('journal_entry.reference_type', filters.referenceType);
        return query;
      });
      const centers = await readFinancialPages((from, to) =>
        supabase
          .from('cost_centers')
          .select('id,center_code,center_name,center_name_ar', { count: 'exact' })
          .eq('company_id', companyId)
          .order('id')
          .range(from, to)
      );
      lines.sort(
        (a, b) =>
          a.journal_entry.entry_date.localeCompare(b.journal_entry.entry_date) ||
          a.journal_entry.entry_number.localeCompare(b.journal_entry.entry_number) ||
          a.line_number - b.line_number ||
          a.id.localeCompare(b.id)
      );
      let runningBalance = 0;
      const result: AccountMovement[] = [];
      for (const line of lines) {
        const debit = Number(line.debit_amount || 0),
          credit = Number(line.credit_amount || 0);
        runningBalance += account.balance_type === 'credit' ? credit - debit : debit - credit;
        if (filters?.dateFrom && line.journal_entry.entry_date < filters.dateFrom) continue;
        const entry = line.journal_entry;
        const search = filters?.searchTerm?.trim().toLocaleLowerCase();
        if (search && ![entry.entry_number, entry.description, line.line_description, entry.reference_type]
          .some(value => value?.toLocaleLowerCase().includes(search))) continue;
        const center = centers.find((item) => item.id === line.cost_center_id);
        result.push({
          id: line.id,
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          description: entry.description,
          line_description: line.line_description || '',
          debit_amount: debit,
          credit_amount: credit,
          running_balance: runningBalance,
          reference_type: entry.reference_type || '',
          reference_id: entry.reference_id || '',
          journal_entry_id: line.journal_entry_id,
          status: entry.status,
          cost_center: center ? { ...center, center_name_ar: center.center_name_ar ?? undefined } : undefined,
        });
      }
      return result;
    },
  });
};

// Trial Balance
export const useTrialBalance = (asOfDate?: string) => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['trialBalance', companyId, asOfDate],
    enabled: !!companyId,
    queryFn: () => readTrialBalance(companyId!, asOfDate),
  });
};

// Balance sheet is cumulative through dateTo; P&L uses the selected period.
export const useFinancialSummary = (filters?: { dateFrom?: string; dateTo?: string }) => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['financialSummary', companyId, filters],
    enabled: !!companyId,
    queryFn: () => readFinancialSummary(companyId!, filters?.dateFrom, filters?.dateTo),
  });
};

// Cost Center Analysis
export const useCostCenterAnalysis = (filters?: LedgerFilters) => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['costCenterAnalysis', companyId, filters],
    enabled: Boolean(companyId),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID required');
      const [centers, lines] = await Promise.all([
        readFinancialPages((from, to) =>
          supabase
            .from('cost_centers')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId)
            .order('id')
            .range(from, to)
        ),
        readFinancialPages((from, to) => {
          let query = supabase
            .from('journal_entry_lines')
            .select(
              'cost_center_id,debit_amount,credit_amount,journal_entry_id,journal_entries!inner(entry_date,status,company_id)',
              { count: 'exact' }
            )
            .not('cost_center_id', 'is', null)
            .eq('journal_entries.company_id', companyId)
            .eq('journal_entries.status', 'posted')
            .lte('journal_entries.entry_date', filters?.dateTo || financeToday())
            .order('id')
            .range(from, to);
          if (filters?.dateFrom) query = query.gte('journal_entries.entry_date', filters.dateFrom);
          if (filters?.costCenterId) query = query.eq('cost_center_id', filters.costCenterId);
          return query;
        }),
      ]);
      return centers
        .filter((center) => !filters?.costCenterId || center.id === filters.costCenterId)
        .map((center) => {
          const rows = lines.filter((line) => line.cost_center_id === center.id);
          const debits = rows.reduce((sum, row) => sum + (row.debit_amount || 0), 0);
          const credits = rows.reduce((sum, row) => sum + (row.credit_amount || 0), 0);
          return {
            cost_center_id: center.id,
            center_code: center.center_code,
            center_name: center.center_name,
            center_name_ar: center.center_name_ar,
            total_debits: debits,
            total_credits: credits,
            net_amount: debits - credits,
            entry_count: new Set(rows.map((row) => row.journal_entry_id)).size,
          };
        });
    },
  });
};

// Post Journal Entry
export const usePostJournalEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!companyId || !user?.id) throw new Error('Authenticated company required');
      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          status: 'posted',
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .eq('company_id', companyId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhancedJournalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['accountBalances'] });
      queryClient.invalidateQueries({ queryKey: ['trialBalance'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      toast.success('تم ترحيل القيد بنجاح');
    },
    onError: (error) => {
      toast.error('خطأ في ترحيل القيد: ' + error.message);
    },
  });
};

// Reverse Journal Entry
export const useReverseJournalEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      const reversalReason = reason.trim();
      if (!reversalReason) throw new Error('Reversal reason is required');
      if (!user?.id) throw new Error('Authenticated user is required');

      if (!companyId) throw new Error('Company ID required');
      const scope = await supabase
        .from('journal_entries')
        .select('id')
        .eq('id', entryId)
        .eq('company_id', companyId)
        .single();
      if (scope.error) throw scope.error;
      const { data, error } = await supabase.rpc('reverse_journal_entry', {
        entry_id: entryId,
        reversal_reason: reversalReason,
        reversed_by_user: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhancedJournalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['accountBalances'] });
      queryClient.invalidateQueries({ queryKey: ['trialBalance'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      toast.success('تم عكس القيد بنجاح');
    },
    onError: (error) => {
      toast.error('خطأ في عكس القيد: ' + error.message);
    },
  });
};

// Delete Journal Entry
export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!companyId) throw new Error('Company ID is required');
      const { data: entry, error: entryFetchError } = await supabase
        .from('journal_entries')
        .select("id,status")
        .eq('id', entryId)
        .eq('company_id', companyId)
        .single();

      if (entryFetchError) throw entryFetchError;
      if (entry?.status !== "draft") {
        throw new Error('Only draft journal entries can be deleted. Posted entries must be reversed.');
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId)
        .eq('company_id', companyId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhancedJournalEntries'] });
      queryClient.invalidateQueries({ queryKey: ['accountBalances'] });
      queryClient.invalidateQueries({ queryKey: ['trialBalance'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
      toast.success('تم حذف القيد بنجاح');
    },
    onError: (error) => {
      toast.error('خطأ في حذف القيد: ' + error.message);
    },
  });
};

// Export data functionality
export const useExportLedgerData = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ format, filters }: { format: 'excel' | 'pdf' | 'csv'; filters?: LedgerFilters }) => {
      if (!companyId) {
        throw new Error('Company is not selected');
      }

      if (format === 'pdf') {
        throw new Error('PDF export is not implemented yet. Please use Excel or CSV.');
      }

      const data = await readFinancialJournals(companyId, filters);

      const rows = (data || []).flatMap((entry: any) => {
        const lines = entry.journal_entry_lines?.length ? entry.journal_entry_lines : [null];
        return lines.map((line: any) => ({
          entry_number: entry.entry_number,
          entry_date: entry.entry_date,
          status: entry.status,
          reference_type: entry.reference_type || '',
          description: entry.description || '',
          line_number: line?.line_number || '',
          account_code: line?.chart_of_accounts?.account_code || '',
          account_name:
            line?.chart_of_accounts?.account_name_ar || line?.chart_of_accounts?.account_name || '',
          line_description: line?.line_description || '',
          debit_amount: Number(line?.debit_amount || 0),
          credit_amount: Number(line?.credit_amount || 0),
          total_debit: Number(entry.total_debit || 0),
          total_credit: Number(entry.total_credit || 0),
        }));
      });

      const headers = [
        'entry_number',
        'entry_date',
        'status',
        'reference_type',
        'description',
        'line_number',
        'account_code',
        'account_name',
        'line_description',
        'debit_amount',
        'credit_amount',
        'total_debit',
        'total_credit',
      ];
      const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCell(row[header as keyof typeof row])).join(',')),
      ].join('\n');

      const extension = format === 'excel' ? 'csv' : 'csv';
      const fileName = `general-ledger-${new Date().toISOString().slice(0, 10)}.${extension}`;
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return `Exported ${rows.length} ledger rows to ${fileName}.`;
    },
    onSuccess: () => {
      toast.success('تم تصدير البيانات بنجاح');
    },
    onError: (error) => {
      toast.error('خطأ في تصدير البيانات: ' + error.message);
    },
  });
};
