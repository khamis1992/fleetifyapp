import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFinancialJournalSearchFilter, readFinancialJournals } from '../financialReporting';

const { transport } = vi.hoisted(() => ({ transport: vi.fn() }));
vi.mock('@/integrations/supabase/client', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return { supabase: createClient('https://finance-reader.test', 'synthetic-public-test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: transport },
  }) };
});

const headers = [
  { id: 'entry-a', company_id: 'company-a', entry_number: 'ADJ-20260930-AR', description: 'Receivables', status: 'posted', total_debit: 602, total_credit: 602 },
  { id: 'entry-b', company_id: 'company-a', entry_number: 'ADJ-20260930-DEP', description: 'Depreciation', status: 'posted', total_debit: 2, total_credit: 2 },
];
const lines = [
  ...Array.from({ length: 1204 }, (_, i) => ({ id: `line-${i}`, journal_entry_id: 'entry-a', line_number: i + 1, debit_amount: i % 2 ? 0 : 1, credit_amount: i % 2 ? 1 : 0, chart_of_accounts: { company_id: 'company-a' } })),
  { id: 'line-b1', journal_entry_id: 'entry-b', line_number: 1, debit_amount: 2, credit_amount: 0, chart_of_accounts: { company_id: 'company-a' } },
  { id: 'line-b2', journal_entry_id: 'entry-b', line_number: 2, debit_amount: 0, credit_amount: 2, chart_of_accounts: { company_id: 'company-a' } },
];
const requestUrl = (input: string | URL | Request) => new URL(input instanceof Request ? input.url : String(input));
const pageResponse = (url: URL) => {
  const dataset = url.pathname.endsWith('/journal_entries') ? headers : lines;
  const start = Number(url.searchParams.get('offset') || 0);
  const end = Math.min(dataset.length, start + Number(url.searchParams.get('limit') || 500));
  return new Response(JSON.stringify(dataset.slice(start, end)), {
    status: 200, headers: { 'content-type': 'application/json', 'content-range': `${start}-${end - 1}/${dataset.length}` },
  });
};

describe('journal server search transport', () => {
  beforeEach(() => { transport.mockReset(); transport.mockImplementation(async input => pageResponse(requestUrl(input))); });

  it('quotes OR values and treats punctuation, wildcards and regex operators literally', () => {
    const term = 'ADJ_%*."(x),y\\z[1]+?^$|{2}';
    const filter = buildFinancialJournalSearchFilter(term)!;
    const match = filter.match(/^entry_number\.imatch\.("(?:\\.|[^"\\])*"),description\.imatch\.("(?:\\.|[^"\\])*")$/);
    expect(match).not.toBeNull();
    const firstPattern = JSON.parse(match![1]);
    expect(JSON.parse(match![2])).toBe(firstPattern);
    const literal = new RegExp(firstPattern, 'i');
    expect(literal.test(`prefix ${term.toLowerCase()} suffix`)).toBe(true);
    expect(literal.test('ADJ-anything')).toBe(false);
    expect(buildFinancialJournalSearchFilter('  ')).toBeNull();
  });

  it('sends the same scoped predicate and AbortSignal for headers and every detail page', async () => {
    const signal = new AbortController().signal;
    const term = 'ADJ-20260930';
    const result = await readFinancialJournals('company-a', { status: 'posted', searchTerm: term }, signal);
    expect(result.map(row => row.id)).toEqual(['entry-a', 'entry-b']);
    expect(result[0].journal_entry_lines).toHaveLength(1204);
    expect(result[1].journal_entry_lines).toHaveLength(2);
    expect(transport).toHaveBeenCalledTimes(4);
    const predicate = `(${buildFinancialJournalSearchFilter(term)})`;
    for (const [input, init] of transport.mock.calls) {
      const url = requestUrl(input);
      expect(init.signal).toBe(signal);
      if (url.pathname.endsWith('/journal_entries')) {
        expect(url.searchParams.get('company_id')).toBe('eq.company-a');
        expect(url.searchParams.get('status')).toBe('eq.posted');
        expect(url.searchParams.get('or')).toBe(predicate);
      } else {
        expect(url.searchParams.get('select')).toContain('journal_entries!inner(');
        expect(url.searchParams.get('journal_entries.company_id')).toBe('eq.company-a');
        expect(url.searchParams.get('chart_of_accounts.company_id')).toBe('eq.company-a');
        expect(url.searchParams.get('journal_entries.status')).toBe('eq.posted');
        expect(url.searchParams.get('journal_entries.or')).toBe(predicate);
      }
    }
    expect(transport.mock.calls.slice(1).map(([input]) => requestUrl(input).searchParams.get('offset'))).toEqual(['0', '500', '1000']);
  });

  it('does not add a search predicate or truncate detail when no search is requested', async () => {
    const result = await readFinancialJournals('company-a');
    expect(result[0].journal_entry_lines).toHaveLength(1204);
    expect(transport).toHaveBeenCalledTimes(4);
    for (const [input] of transport.mock.calls) {
      const url = requestUrl(input);
      expect(url.searchParams.has('or')).toBe(false);
      expect(url.searchParams.has('journal_entries.or')).toBe(false);
    }
  });

  it('rejects a canceled later detail page without returning partial journal data', async () => {
    const controller = new AbortController();
    transport.mockImplementation(async (input, init) => {
      const url = requestUrl(input);
      if (url.pathname.endsWith('/journal_entry_lines') && url.searchParams.get('offset') === '500') {
        controller.abort();
        expect(init.signal).toBe(controller.signal);
        throw new DOMException('Journal search canceled', 'AbortError');
      }
      return pageResponse(url);
    });
    await expect(readFinancialJournals('company-a', { searchTerm: 'ADJ-20260930' }, controller.signal)).rejects.toThrow('Journal search canceled');
    expect(transport).toHaveBeenCalledTimes(3);
  });

  it('rejects draft detail that no longer agrees with the selected header', async () => {
    transport.mockImplementation(async input => {
      const url = requestUrl(input);
      const response = pageResponse(url);
      const page = await response.json();
      if (url.pathname.endsWith('/journal_entries')) page[0].status = 'draft';
      else if (url.searchParams.get('offset') === '500') {
        // Same journal IDs and balanced detail, but both saved totals have changed.
        page[0].debit_amount += 1;
        page[1].credit_amount += 1;
      }
      return new Response(JSON.stringify(page), { status: 200, headers: response.headers });
    });
    await expect(readFinancialJournals('company-a', { searchTerm: 'ADJ-20260930' })).rejects.toThrow('does not reconcile');
  });

  it('allows an unbalanced draft when its entire detail agrees with both saved totals', async () => {
    transport.mockImplementation(async input => {
      const url = requestUrl(input);
      const response = pageResponse(url);
      const page = await response.json();
      if (url.pathname.endsWith('/journal_entries')) {
        page[0].status = 'draft';
        page[0].total_debit += 1;
      } else if (url.searchParams.get('offset') === '500') page[0].debit_amount += 1;
      return new Response(JSON.stringify(page), { status: 200, headers: response.headers });
    });
    const result = await readFinancialJournals('company-a', { searchTerm: 'ADJ-20260930' });
    expect(result[0].status).toBe('draft');
    expect(result[0].total_debit).toBe(603);
    expect(result[0].total_credit).toBe(602);
    expect(result[0].journal_entry_lines).toHaveLength(1204);
  });
});
