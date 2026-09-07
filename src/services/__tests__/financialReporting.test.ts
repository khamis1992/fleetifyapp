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
