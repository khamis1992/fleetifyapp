import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  financeToday,
  readAccountBalances,
  readFinancialPages,
  readFinancialSummary,
  readFinancialWorkspace,
  readFinancialJournals,
} from '../financialReporting';
import { subscribeToFinancialChanges } from '../financialQuerySynchronization';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc, from } }));

describe('complete financial readers', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reads through a server row cap smaller than the requested page', async () => {
    const fetchPage = vi.fn(async (from: number) => ({
      data: Array.from({ length: Math.min(200, 650 - from) }, (_, i) => from + i),
      count: 650,
      error: null,
    }));
    expect(await readFinancialPages(fetchPage)).toHaveLength(650);
    expect(fetchPage.mock.calls.map((call) => call[0])).toEqual([0, 200, 400, 600]);
  });
  it('rejects a failed later page instead of returning a plausible partial total', async () => {
    await expect(
      readFinancialPages(async (from) =>
        from === 0
          ? { data: Array(500).fill(10), error: null }
          : { data: null, error: { message: 'Connection lost' } }
      )
    ).rejects.toThrow('Connection lost');
  });
  it('rejects early exhaustion when the server reports more records', async () => {
    await expect(readFinancialPages(async () => ({ data: [], count: 1, error: null }))).rejects.toThrow(
      'Incomplete'
    );
  });
  it('uses Qatar dates across the UTC midnight boundary', () => {
    expect(financeToday(new Date('2026-09-05T22:00:00Z'))).toBe('2026-09-06');
  });
  it('requires a company and requests complete balances for that company and date', async () => {
    await expect(readAccountBalances('')).rejects.toThrow('Company ID');
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockReturnValue({ range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }) });
    await readAccountBalances('company-a', '2026-09-06');
    expect(rpc).toHaveBeenCalledWith(
      'get_account_balances',
      {
        company_id_param: 'company-a',
        as_of_date: '2026-09-06',
        account_type_filter: undefined,
      },
      { count: 'exact' }
    );
  });
  it('keeps all 1204 lines of a single journal and scopes both datasets', async () => {
    const scopes: unknown[][] = [];
    from.mockImplementation((table: string) => {
      const dataset =
        table === 'journal_entries'
          ? [{ id: 'entry-a', entry_number: 'JE-1', description: 'Payroll' }]
          : Array.from({ length: 1204 }, (_, i) => ({
              id: String(i),
              journal_entry_id: 'entry-a',
              account_id: 'account-a',
              chart_of_accounts: { id: 'account-a', company_id: 'company-a' },
            }));
      let start = 0,
        end = 499;
      const reader = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn((...args: unknown[]) => {
          scopes.push([table, ...args]);
          return reader;
        }),
        range: (first: number, last: number) => {
          start = first;
          end = last;
          return reader;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(
            resolve({ data: dataset.slice(start, end + 1), count: dataset.length, error: null })
          ),
      };
      return reader;
    });
    const rows = await readFinancialJournals('company-a');
    expect(rows).toHaveLength(1);
    expect(rows[0].journal_entry_lines).toHaveLength(1204);
    expect(scopes).toContainEqual(['journal_entries', 'company_id', 'company-a']);
    expect(scopes).toContainEqual(['journal_entry_lines', 'journal_entries.company_id', 'company-a']);
    expect(scopes).toContainEqual(['journal_entry_lines', 'chart_of_accounts.company_id', 'company-a']);
  });
  it.each(['relationship', 'later-page', 'foreign-account'] as const)('rejects a %s journal read failure', async failure => {
    from.mockImplementation((table: string) => {
      let start = 0;
      const query = {
        select: vi.fn((selection: string) => {
          if (table === 'journal_entry_lines') {
            expect(selection).toContain('chart_of_accounts!journal_entry_lines_account_id_fkey(');
            expect(selection).not.toContain('fk_journal_entry_lines_account');
          }
          return query;
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: (first: number) => { start = first; return query; },
        then: (resolve: (value: unknown) => unknown) => {
          const entry = { id: 'entry-a', entry_number: 'JE-1', description: 'Payroll' };
          const line = { id: String(start), journal_entry_id: 'entry-a', account_id: 'account-a', chart_of_accounts: { company_id: failure === 'foreign-account' ? 'company-b' : 'company-a' } };
          const error = table === 'journal_entry_lines' && (failure === 'relationship' || (failure === 'later-page' && start > 0))
            ? { message: failure === 'relationship' ? 'PGRST200: relationship not found' : 'Later journal page denied' }
            : null;
          return Promise.resolve(resolve(table === 'journal_entries'
            ? { data: [entry], error: null, count: 1 }
            : { data: error ? null : [line], error, count: failure === 'later-page' ? 2 : 1 }));
        },
      };
      return query;
    });
    await expect(readFinancialJournals('company-a')).rejects.toThrow(failure === 'relationship' ? 'PGRST200' : failure === 'later-page' ? 'Later journal page denied' : 'account could not be verified');
  });
  it.each(['missing-lines', 'truncated-lines', 'unbalanced-lines', 'orphan-line'] as const)('rejects %s instead of issuing an incomplete posted journal', async failure => {
    from.mockImplementation((table: string) => {
      const entry = { id: 'entry-a', entry_number: 'JE-1', description: 'Payroll', status: 'posted', total_debit: 100, total_credit: 100 };
      const account = { company_id: 'company-a' };
      const lines = failure === 'missing-lines' ? [] : [
        { id: 'line-1', journal_entry_id: failure === 'orphan-line' ? 'entry-other' : 'entry-a', debit_amount: failure === 'truncated-lines' ? 50 : 100, credit_amount: 0, chart_of_accounts: account },
        { id: 'line-2', journal_entry_id: 'entry-a', debit_amount: 0, credit_amount: failure === 'unbalanced-lines' ? 90 : 100, chart_of_accounts: account },
      ];
      const data = table === 'journal_entries' ? [entry] : lines;
      const query = {
        select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null, count: data.length })),
      };
      return query;
    });
    await expect(readFinancialJournals('company-a', { status: 'posted' })).rejects.toThrow(failure === 'missing-lines' ? 'Incomplete journal detail' : failure === 'orphan-line' ? 'Journal detail changed' : 'does not reconcile');
  });
  it('keeps an explicitly posted reversal-marked entry and reconciles its complete detail', async () => {
    const filters: unknown[][] = [];
    from.mockImplementation((table: string) => {
      const entry = { id: 'entry-a', entry_number: 'JE-1', description: 'Payroll', status: 'posted', reversed_at: '2026-09-30', total_debit: 100, total_credit: 100 };
      const data = table === 'journal_entries' ? [entry] : [
        { id: 'line-1', journal_entry_id: 'entry-a', debit_amount: 100, credit_amount: 0, chart_of_accounts: { company_id: 'company-a' } },
        { id: 'line-2', journal_entry_id: 'entry-a', debit_amount: 0, credit_amount: 100, chart_of_accounts: { company_id: 'company-a' } },
      ];
      const query = {
        select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
        eq: (...args: unknown[]) => { filters.push([table, ...args]); return query; },
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve({ data, error: null, count: data.length })),
      };
      return query;
    });
    const rows = await readFinancialJournals('company-a', { status: 'posted' });
    expect(rows).toHaveLength(1);
    expect(rows[0].journal_entry_lines).toHaveLength(2);
    expect(filters).toContainEqual(['journal_entries', 'status', 'posted']);
    expect(filters).toContainEqual(['journal_entry_lines', 'journal_entries.status', 'posted']);
    expect(filters.some(filter => String(filter[1]).includes('reversed_at'))).toBe(false);
  });
  it('propagates summary errors and rejects malformed snapshots', async () => {
    rpc.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: new Error('Denied') }) });
    await expect(readFinancialSummary('company-a')).rejects.toThrow('Denied');
    rpc.mockResolvedValue({ data: { summary: { total_revenue: 'unknown' } }, error: null });
    await expect(readFinancialWorkspace('company-a', '2026-09-06')).rejects.toThrow();
  });
  it('refreshes finance after a successful department mutation, but not after a failed one', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(['financial-workspace', 'company-a'], { total: 1 });
    client.setQueryData(['unrelated-preference'], 'x');
    const unsubscribe = subscribeToFinancialChanges(client);
    const failed = client.getMutationCache().build(client, {
      mutationFn: async () => {
        throw new Error('Rejected');
      },
    });
    await expect(failed.execute(undefined)).rejects.toThrow('Rejected');
    expect(client.getQueryState(['financial-workspace', 'company-a'])?.isInvalidated).toBe(false);
    const payment = client.getMutationCache().build(client, { mutationFn: async () => 'payment-posted' });
    await payment.execute(undefined);
    expect(client.getQueryState(['financial-workspace', 'company-a'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(['unrelated-preference'])?.isInvalidated).toBe(false);
    unsubscribe();
    client.clear();
  });
});
