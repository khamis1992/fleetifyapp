import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

export const FINANCIAL_PAGE_SIZE = 500;

/** Never return a successful partial financial report after a failed page. */
export async function readFinancialPages<T>(
  fetchPage: (
    from: number,
    to: number
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
    count?: number | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const result = await fetchPage(rows.length, rows.length + FINANCIAL_PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error('Financial report returned no dataset');
    if (result.data.length === 0) {
      if (result.count != null && rows.length < result.count) throw new Error('Incomplete financial report');
      return rows;
    }
    rows.push(...result.data);
    if (result.count != null ? rows.length >= result.count : result.data.length < FINANCIAL_PAGE_SIZE)
      return rows;
  }
}

export function financeToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function requireFinanceCompany(companyId?: string | null): asserts companyId is string {
  if (!companyId) throw new Error('Company ID is required for financial reporting');
}

export interface FinancialJournalFilters {
  dateFrom?: string;
  dateTo?: string;
  referenceType?: string;
  status?: string;
  searchTerm?: string;
  accountId?: string;
  costCenterId?: string;
}

/** Page parent entries and lines independently, so an embedded row cap cannot truncate a journal. */
export async function readFinancialJournals(companyId: string, filters?: FinancialJournalFilters) {
  requireFinanceCompany(companyId);
  const entries = await readFinancialPages((from, to) => {
    let query = supabase
      .from('journal_entries')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('entry_date', { ascending: false })
      .order('entry_number', { ascending: false })
      .order('id')
      .range(from, to);
    if (filters?.dateFrom) query = query.gte('entry_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('entry_date', filters.dateTo);
    if (filters?.referenceType) query = query.eq('reference_type', filters.referenceType);
    if (filters?.status && filters.status !== 'all')
      query =
        filters.status === 'reversed'
          ? query.not('reversed_at', 'is', null)
          : query.eq('status', filters.status);
    return query;
  });
  if (!entries.length) return [];
  const lines = await readFinancialPages((from, to) => {
    let query = supabase
      .from('journal_entry_lines')
      .select(
        `
      id,journal_entry_id,account_id,cost_center_id,line_number,line_description,debit_amount,credit_amount,
      chart_of_accounts!fk_journal_entry_lines_account(id,account_code,account_name,account_name_ar),
      journal_entries!inner(company_id,entry_date,reference_type,status,reversed_at)
    `,
        { count: 'exact' }
      )
      .eq('journal_entries.company_id', companyId)
      .order('line_number')
      .order('id')
      .range(from, to);
    if (filters?.dateFrom) query = query.gte('journal_entries.entry_date', filters.dateFrom);
    if (filters?.dateTo) query = query.lte('journal_entries.entry_date', filters.dateTo);
    if (filters?.referenceType) query = query.eq('journal_entries.reference_type', filters.referenceType);
    if (filters?.status && filters.status !== 'all')
      query =
        filters.status === 'reversed'
          ? query.not('journal_entries.reversed_at', 'is', null)
          : query.eq('journal_entries.status', filters.status);
    return query;
  });
  const byEntry = new Map<string, typeof lines>();
  for (const line of lines) {
    const list = byEntry.get(line.journal_entry_id) || [];
    list.push(line);
    byEntry.set(line.journal_entry_id, list);
  }
  const search = filters?.searchTerm?.toLocaleLowerCase();
  return entries
    .map((entry) => ({ ...entry, journal_entry_lines: byEntry.get(entry.id) || [] }))
    .filter(
      (entry) =>
        (!search ||
          entry.entry_number.toLocaleLowerCase().includes(search) ||
          entry.description?.toLocaleLowerCase().includes(search)) &&
        (!filters?.accountId ||
          entry.journal_entry_lines.some((line) => line.account_id === filters.accountId)) &&
        (!filters?.costCenterId ||
          entry.journal_entry_lines.some((line) => line.cost_center_id === filters.costCenterId))
    );
}

export async function readAccountBalances(companyId: string, asOf = financeToday(), accountType?: string) {
  requireFinanceCompany(companyId);
  return readFinancialPages((from, to) =>
    supabase
      .rpc(
        'get_account_balances',
        {
          company_id_param: companyId,
          as_of_date: asOf,
          account_type_filter: accountType,
        },
        { count: 'exact' }
      )
      .range(from, to)
  );
}

export async function readTrialBalance(companyId: string, asOf = financeToday()) {
  requireFinanceCompany(companyId);
  return readFinancialPages((from, to) =>
    supabase
      .rpc(
        'get_trial_balance',
        {
          company_id_param: companyId,
          as_of_date: asOf,
        },
        { count: 'exact' }
      )
      .range(from, to)
  );
}

export async function readFinancialSummary(companyId: string, dateFrom?: string, dateTo = financeToday()) {
  requireFinanceCompany(companyId);
  const { data, error } = await supabase
    .rpc('get_financial_summary', {
      company_id_param: companyId,
      date_from: dateFrom,
      date_to: dateTo,
    })
    .single();
  if (error) throw error;
  if (!data) throw new Error('Financial summary unavailable');
  return data;
}

export const statementAccountSchema = z.object({
  id: z.string(),
  account_code: z.string(),
  account_name: z.string(),
  account_name_ar: z.string().nullable(),
  account_type: z.string(),
  account_subtype: z.string().nullable().optional(),
  current_balance: z.number().finite(),
});
export async function readIncomeStatementAccounts(companyId: string, from: string, to = financeToday()) {
  requireFinanceCompany(companyId);
  const { data, error } = await supabase.rpc('get_income_statement_accounts_v1', {
    p_company_id: companyId,
    p_date_from: from,
    p_date_to: to,
  });
  if (error) throw error;
  return z.array(statementAccountSchema).parse(data);
}

const amount = z.number().finite();
const count = z.number().int().nonnegative();
export const financialWorkspaceSchema = z.object({
  company_id: z.string().uuid(),
  as_of: z.string(),
  checked_at: z.string(),
  basis: z.literal('posted_ledger'),
  summary: z.object({
    total_assets: amount,
    total_liabilities: amount,
    total_equity: amount,
    total_revenue: amount,
    total_expenses: amount,
    net_income: amount,
    unbalanced_entries_count: count,
  }),
  receivables: z.object({
    outstanding: amount,
    overdue: amount,
    overdue_count: count,
    invoiced: amount,
    settled: amount,
  }),
  monthly_receipts: amount,
  posted_entries: count,
  draft_entries: count,
  trend: z.array(z.object({ month: z.string(), revenue: amount, expenses: amount })),
  checks: z.array(z.object({ code: z.string(), severity: z.enum(['critical', 'warning']), count })),
  sources: z.array(z.object({ source: z.string(), entries: count })),
});
export type FinancialWorkspace = z.infer<typeof financialWorkspaceSchema>;

export async function readFinancialWorkspace(companyId: string, asOf: string) {
  requireFinanceCompany(companyId);
  const { data, error } = await supabase.rpc('get_financial_workspace_v1', {
    p_company_id: companyId,
    p_as_of: asOf,
  });
  if (error) throw error;
  const report = financialWorkspaceSchema.parse(data);
  if (report.company_id !== companyId || report.as_of !== asOf)
    throw new Error('Financial report scope mismatch');
  return report;
}
