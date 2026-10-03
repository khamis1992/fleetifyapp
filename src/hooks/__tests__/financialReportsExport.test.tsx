import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCashFlowReport, usePayablesReport, useReceivablesReport } from '../useFinancialReportsExport';
import { invoiceReportBalance, readOutstandingInvoiceReport } from '@/services/financialInvoiceReports';
import { financeToday } from '@/services/financialReporting';

interface TestInvoice {
  id: string; company_id: string; invoice_number: string; invoice_date: string; due_date: string | null;
  total_amount: number; paid_amount: number | null; balance_due: number | null;
  payment_status: string; status: string; invoice_type: string;
  customers: { company_id: string; first_name: string; last_name: string; company_name: null } | null;
  vendors: { company_id: string; vendor_name: string } | null;
}
interface RecordedPage {
  filters: { operator: string; column: string; value: unknown }[];
  range: number[];
  order: string[];
  count: unknown;
}
const state = vi.hoisted(() => ({
  company: 'company-a' as string | null, user: { id: 'user-a' } as { id: string } | null,
  initializing: false, authenticating: false,
  from: vi.fn(), invoices: [] as TestInvoice[], calls: [] as RecordedPage[],
  cap: 200, failFrom: null as number | null, missingData: false, countDelta: 0,
}));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({
  companyId: state.company, user: state.user, isInitializing: state.initializing,
  isAuthenticating: state.authenticating, authError: state.user ? null : 'User not authenticated',
}) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.from } }));

const invoice = (id: string, overrides: Partial<TestInvoice> = {}): TestInvoice => ({
  id, company_id: 'company-a', invoice_number: `INV-${id}`, invoice_date: '2026-09-01',
  due_date: '2026-09-01', total_amount: 1000, paid_amount: 250, balance_due: 750,
  payment_status: 'partial', status: 'sent', invoice_type: 'service',
  customers: { company_id: 'company-a', first_name: 'عميل', last_name: id, company_name: null },
  vendors: null, ...overrides,
});

const mount = (read: () => ReturnType<typeof useReceivablesReport> | ReturnType<typeof useCashFlowReport>) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return { client, ...renderHook(read, { wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }) };
};

describe('reviewable invoice report readers', () => {
  beforeEach(() => {
    state.company = 'company-a'; state.user = { id: 'user-a' };
    state.initializing = false; state.authenticating = false;
    state.invoices = []; state.calls = []; state.cap = 200; state.failFrom = null;
    state.missingData = false; state.countDelta = 0;
    state.from.mockReset();
    state.from.mockImplementation((table: string) => {
      expect(table).toBe('invoices');
      const filters: RecordedPage['filters'] = [];
      let range = [0, 499];
      const order: string[] = [];
      let countOption: unknown;
      const query = {
        select: (_fields: string, options: { count?: string }) => { countOption = options.count; return query; },
        eq: (column: string, value: unknown) => { filters.push({ operator: 'eq', column, value }); return query; },
        neq: (column: string, value: unknown) => { filters.push({ operator: 'neq', column, value }); return query; },
        in: (column: string, value: unknown) => { filters.push({ operator: 'in', column, value }); return query; },
        lte: (column: string, value: unknown) => { filters.push({ operator: 'lte', column, value }); return query; },
        order: (column: string) => { order.push(column); return query; },
        range: (first: number, last: number) => { range = [first, last]; return query; },
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve().then(() => {
          state.calls.push({ filters: [...filters], range: [...range], order: [...order], count: countOption });
          const rows = state.invoices.filter(row => filters.every(filter => {
            if (filter.column.includes('.')) return true;
            const value = row[filter.column as keyof TestInvoice];
            if (filter.operator === 'eq') return value === filter.value;
            if (filter.operator === 'neq') return value !== filter.value;
            if (filter.operator === 'in') return (filter.value as unknown[]).includes(value);
            return String(value) <= String(filter.value);
          })).sort((left, right) => left.invoice_date.localeCompare(right.invoice_date) || left.id.localeCompare(right.id));
          if (state.failFrom !== null && range[0] >= state.failFrom) return { data: null, error: { message: 'Later invoice page denied' }, count: rows.length };
          return { data: state.missingData ? null : rows.slice(range[0], Math.min(range[1] + 1, range[0] + state.cap)), error: null, count: rows.length + (range[0] > 0 ? state.countDelta : 0) };
        }).then(resolve, reject),
      };
      return query;
    });
  });

  it.each(['receivables', 'payables'] as const)('reads all %s beyond 1000 records and scopes every capped page', async kind => {
    state.invoices = Array.from({ length: 1101 }, (_, index) => invoice(String(index), { invoice_type: kind === 'payables' ? 'purchase' : 'service' }));
    state.invoices.push(invoice('foreign', { company_id: 'company-b' }));
    const hook = mount(() => kind === 'payables' ? usePayablesReport('2026-09-30') : useReceivablesReport('2026-09-30'));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toHaveLength(1101);
    expect(state.calls.map(page => page.range[0])).toEqual([0, 200, 400, 600, 800, 1000]);
    expect(state.calls.every(page => page.count === 'exact' && page.order.join(',') === 'invoice_date,id')).toBe(true);
    for (const page of state.calls) {
      expect(page.filters).toContainEqual({ operator: 'eq', column: 'company_id', value: 'company-a' });
      expect(page.filters).toContainEqual({ operator: 'eq', column: 'customers.company_id', value: 'company-a' });
      expect(page.filters).toContainEqual({ operator: 'eq', column: 'vendors.company_id', value: 'company-a' });
      expect(page.filters).toContainEqual({ operator: 'lte', column: 'invoice_date', value: '2026-09-30' });
    }
    hook.unmount(); hook.client.clear();
  });

  it('preserves zero, partial payments and signed credits without turning current balances into historical balances', async () => {
    state.invoices = [
      invoice('zero', { balance_due: 0, paid_amount: 1000, payment_status: 'unpaid' }),
      invoice('partial'), invoice('derived', { balance_due: null, paid_amount: 600 }),
      invoice('credit', { balance_due: -50, paid_amount: 1050 }),
      invoice('fallback-date', { invoice_date: '2026-09-20', due_date: null }),
      invoice('future', { invoice_date: '2026-10-01' }),
      invoice('cancelled', { status: 'cancelled' }),
      invoice('cancelled-payment', { payment_status: 'cancelled' }),
      invoice('sales', { invoice_type: 'sales' }),
      invoice('purchase', { invoice_type: 'purchase' }),
    ];
    const rows = await readOutstandingInvoiceReport('company-a', 'receivables', '2026-09-30');
    expect(rows.map(row => row.invoice_id).sort()).toEqual(['credit', 'derived', 'fallback-date', 'partial', 'sales']);
    expect(rows.find(row => row.invoice_id === 'partial')).toMatchObject({ amount: 750, overdue_days: 29, balance_source: 'balance_due' });
    expect(rows.find(row => row.invoice_id === 'derived')).toMatchObject({ amount: 400, balance_source: 'total_amount_minus_paid_amount' });
    expect(rows.find(row => row.invoice_id === 'credit')).toMatchObject({ amount: -50, status: 'رصيد دائن' });
    expect(rows.find(row => row.invoice_id === 'fallback-date')).toMatchObject({ due_date: '2026-09-20', due_date_source: 'invoice_date', overdue_days: 10 });
    expect(invoiceReportBalance({ balance_due: 0, total_amount: 1000, paid_amount: null })).toEqual({ amount: 0, source: 'balance_due' });
    const earlier = await readOutstandingInvoiceReport('company-a', 'receivables', '2026-09-15');
    expect(earlier.find(row => row.invoice_id === 'partial')).toMatchObject({ amount: 750, overdue_days: 14 });
  });

  it('exposes a clear Qatar default and the current-balance basis', async () => {
    state.invoices = [invoice('partial')];
    const hook = mount(() => useReceivablesReport());
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current).toHaveProperty('reportMetadata', expect.objectContaining({ asOf: financeToday(), defaultAsOf: 'today_in_qatar', dateSource: 'invoice_date', balanceBasis: 'current_invoice_balance', isHistoricalBalance: false }));
    hook.unmount(); hook.client.clear();
  });

  it('changes company cache and query scope when the authenticated company changes', async () => {
    state.invoices = [invoice('a'), invoice('b', { company_id: 'company-b', customers: null })];
    const hook = mount(() => useReceivablesReport('2026-09-30'));
    await waitFor(() => expect(hook.result.current.data?.[0]).toHaveProperty('invoice_id', 'a'));
    state.company = 'company-b'; hook.rerender();
    await waitFor(() => expect(hook.result.current.data?.[0]).toHaveProperty('invoice_id', 'b'));
    expect(hook.result.current.data).toHaveLength(1);
    hook.unmount(); hook.client.clear();
  });

  it.each(['later-page', 'missing-dataset', 'changed-count', 'unknown-balance'] as const)('fails explicitly for %s without returning a partial or empty report', async failure => {
    state.invoices = Array.from({ length: 1101 }, (_, index) => invoice(String(index)));
    if (failure === 'later-page') state.failFrom = 200;
    if (failure === 'missing-dataset') state.missingData = true;
    if (failure === 'changed-count') state.countDelta = 1;
    if (failure === 'unknown-balance') state.invoices[0] = invoice('0', { balance_due: null, paid_amount: null });
    const hook = mount(() => useReceivablesReport('2026-09-30'));
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.data).toBeUndefined();
    hook.unmount(); hook.client.clear();
  });

  it('withholds cached rows when refreshing fails', async () => {
    state.invoices = [invoice('a')];
    const hook = mount(() => useReceivablesReport('2026-09-30'));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    state.failFrom = 0;
    await act(async () => { await hook.result.current.refetch(); });
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.data).toBeUndefined();
    hook.unmount(); hook.client.clear();
  });

  it.each(['missing-company', 'missing-user', 'invalid-date'] as const)('makes no database request for %s', async failure => {
    if (failure === 'missing-company') state.company = null;
    if (failure === 'missing-user') state.user = null;
    const hook = mount(() => useReceivablesReport(failure === 'invalid-date' ? '2026-02-30' : '2026-09-30'));
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(state.from).not.toHaveBeenCalled();
    expect(hook.result.current.data).toBeUndefined();
    hook.unmount(); hook.client.clear();
  });

  it('waits for restored authentication instead of displaying a successful empty report', () => {
    state.initializing = true; state.authenticating = true; state.company = null; state.user = null;
    const hook = mount(() => useReceivablesReport('2026-09-30'));
    expect(hook.result.current.isLoading).toBe(true);
    expect(hook.result.current.isSuccess).toBe(false);
    expect(hook.result.current.data).toBeUndefined();
    expect(state.from).not.toHaveBeenCalled();
    hook.unmount(); hook.client.clear();
  });

  it('rejects mismatched related company identities', async () => {
    state.invoices = [invoice('a', { customers: { company_id: 'company-b', first_name: 'Other', last_name: 'Company', company_name: null } })];
    await expect(readOutstandingInvoiceReport('company-a', 'receivables', '2026-09-30')).rejects.toThrow('لا تخص الشركة');
  });

  it('does not claim zero cash flow by netting both sides of journals', async () => {
    const hook = mount(() => useCashFlowReport('2026-01-01', '2026-09-30'));
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.error?.message).toContain('/finance/reports/financial-statements');
    expect(state.from).not.toHaveBeenCalled();
    hook.unmount(); hook.client.clear();
  });
});
