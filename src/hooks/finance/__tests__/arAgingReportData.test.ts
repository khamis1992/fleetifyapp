import { beforeEach, describe, expect, it, vi } from 'vitest';
const source = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]>, calls: [] as Array<{ table: string; filters: Array<[string, string, unknown]>; range?: [number, number] }>, failAt: -1, finalCountChange: false }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const call = { table, filters: [] as Array<[string, string, unknown]>, range: undefined as [number, number] | undefined };
  let options: { head?: boolean; count?: string } | undefined;
  const q = {
    select: (_columns: string, opts?: typeof options) => { options = opts; return q; },
    eq: (key: string, value: unknown) => { call.filters.push(['eq', key, value]); return q; },
    lte: (key: string, value: unknown) => { call.filters.push(['lte', key, value]); return q; },
    order: () => q,
    range: (from: number, to: number) => { call.range = [from, to]; return q; },
    then: (resolve: (r: unknown) => unknown) => {
      source.calls.push(call);
      const rows = (source.tables[table] || []).filter(row => call.filters.every(([op, key, value]) => op === 'eq' ? row[key] === value : String(row[key]) <= String(value)));
      if (call.range?.[0] === source.failAt) return Promise.resolve({ data: null, error: { message: 'second page failed' }, count: null }).then(resolve);
      const data = call.range ? rows.slice(call.range[0], call.range[1] + 1) : rows;
      return Promise.resolve({ data: options?.head ? null : data, error: null, count: options?.count ? rows.length + (options.head && source.finalCountChange ? 1 : 0) : null }).then(resolve);
    },
  }; return q;
} } }));
import { aggregateArAging, readArAging, type AgingInvoice, type AgingCustomer } from '../arAgingReportData';
const company = 'company-a', foreign = 'company-b', cutoff = '2026-09-30';
const customer: AgingCustomer = { id: 'c1', company_id: company, first_name: 'Customer', last_name: null, first_name_ar: null, last_name_ar: null, company_name: null, company_name_ar: null, phone: '', email: '' };
const invoice = (id: string, patch: Partial<AgingInvoice> = {}): AgingInvoice => ({ id, company_id: company, customer_id: 'c1', invoice_number: id, invoice_date: '2026-01-01', due_date: '2026-09-01', invoice_type: 'sales', status: 'approved', payment_status: 'unpaid', total_amount: 100, paid_amount: 0, balance_due: 100, ...patch });
beforeEach(() => { source.tables = {}; source.calls = []; source.failAt = -1; source.finalCountChange = false; });
describe('tenant-scoped invoice aging', () => {
  it('counts each invoice once and never expands it by the number of payments', () => {
    const result = aggregateArAging(company, cutoff, [invoice('i1'), invoice('i2', { balance_due: 40 })], [customer]);
    expect(result.summary.total_ar_amount).toBe(140); expect(result.summary.total_outstanding_invoices).toBe(2);
    expect(result.customerAging[0].days_1_30).toBe(140); expect(result.priorityList[0].total_outstanding).toBe(140);
  });
  it('uses authoritative balances even with stale paid status, preserves zero and separates credits and unknown', () => {
    const result = aggregateArAging(company, cutoff, [invoice('paid-label', { payment_status: 'paid', balance_due: 50 }), invoice('zero', { balance_due: 0 }), invoice('credit', { balance_due: -20 }), invoice('unknown', { balance_due: null, paid_amount: null }), invoice('derived', { balance_due: null, paid_amount: 80 })], [customer]);
    expect(result.summary.total_ar_amount).toBe(70); expect(result.summary.total_outstanding_invoices).toBe(2);
    expect(result.credits[0].amount).toBe(-20); expect(result.unknown).toHaveLength(1);
  });
  it('uses the supplied cutoff, fallback due date, all aging boundaries and excludes future/cancelled/purchase invoices', () => {
    const rows = ['2026-09-30', '2026-08-31', '2026-08-30', '2026-08-01', '2026-07-31', '2026-07-02', '2026-07-01'].map((date, n) => invoice(String(n), { due_date: date }));
    rows.push(invoice('fallback', { invoice_date: cutoff, due_date: null }), invoice('future', { invoice_date: '2026-10-01' }), invoice('cancelled', { payment_status: 'cancelled' }), invoice('void', { status: 'void' }), invoice('purchase', { invoice_type: 'purchase' }));
    const result = aggregateArAging(company, cutoff, rows, [customer]);
    expect([result.summary.current_total, result.summary.days_1_30_total, result.summary.days_31_60_total, result.summary.days_61_90_total, result.summary.days_90_plus_total]).toEqual([200, 100, 200, 200, 100]);
    expect(result.fallbackDueDates).toBe(1); expect(result.summary.total_ar_amount).toBe(800);
  });
  it('rejects tenant contamination and duplicate invoice IDs, and retains unmatched customer balances for review', () => {
    expect(() => aggregateArAging(company, cutoff, [invoice('x', { company_id: foreign })], [customer])).toThrow(/شركة/);
    expect(() => aggregateArAging(company, cutoff, [invoice('x'), invoice('x')], [customer])).toThrow(/مكرر/);
    expect(() => aggregateArAging(company, cutoff, [], [{ ...customer, company_id: foreign }])).toThrow(/شركة/);
    const result = aggregateArAging(company, cutoff, [invoice('x', { customer_id: 'missing' })], [customer]);
    expect(result.summary.total_ar_amount).toBe(100); expect(result.unmatchedCustomers).toBe(1);
  });
  it('reads every invoice page with explicit company/date filters and does not query payments/views', async () => {
    source.tables.invoices = [...Array.from({ length: 1025 }, (_, n) => invoice(String(n))), invoice('other', { company_id: foreign })] as unknown as Record<string, unknown>[];
    source.tables.customers = [customer] as unknown as Record<string, unknown>[];
    const result = await readArAging(company, cutoff);
    expect(result.summary.total_ar_amount).toBe(102500); expect(result.summary.total_outstanding_invoices).toBe(1025);
    expect(source.calls.every(call => ['invoices', 'customers'].includes(call.table) && call.filters.some(([op, key, value]) => op === 'eq' && key === 'company_id' && value === company))).toBe(true);
    expect(source.calls.filter(call => call.table === 'invoices' && call.range).map(call => call.range?.[0])).toEqual([0, 500, 1000]);
    expect(source.calls.filter(call => call.table === 'invoices').every(call => call.filters.some(([op, key, value]) => op === 'lte' && key === 'invoice_date' && value === cutoff))).toBe(true);
  });
  it('rejects a partial page failure and a changed final count', async () => {
    source.tables.invoices = Array.from({ length: 501 }, (_, n) => invoice(String(n))) as unknown as Record<string, unknown>[];
    source.tables.customers = [customer] as unknown as Record<string, unknown>[];
    source.failAt = 500; await expect(readArAging(company, cutoff)).rejects.toThrow('second page failed');
    source.failAt = -1; source.finalCountChange = true; await expect(readArAging(company, cutoff)).rejects.toThrow(/لم تكتمل/);
  });
});
