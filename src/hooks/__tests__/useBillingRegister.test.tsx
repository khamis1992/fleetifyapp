import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBillingInvoices, useBillingPayments, useBillingRegisterStats, BILLING_PAGE_SIZE } from '../finance/useBillingRegister';

const state = vi.hoisted(() => ({
  company: 'company-a',
  calls: [] as { table: string; or?: string; filters: Record<string, unknown>; range: number[]; orders: string[] }[],
  count: 251,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let orQuery: string | undefined;
      let range = [0, 49];
      const orders: string[] = [];
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.eq = (column: string, value: unknown) => { filters[column] = value; return query; };
      query.or = (expression: string) => { orQuery = expression; return query; };
      query.order = (column: string) => { orders.push(column); return query; };
      query.range = (from: number, to: number) => { range = [from, to]; return query; };
      query.then = (resolve: (value: unknown) => unknown) => {
        state.calls.push({ table, or: orQuery, filters: { ...filters }, range: [...range], orders: [...orders] });
        const rows = Array.from({ length: Math.min(BILLING_PAGE_SIZE, Math.max(0, state.count - range[0])) }, (_, index) => ({ id: `${range[0] + index}`, customers: null, invoices: null }));
        return Promise.resolve(resolve({ data: rows, error: null, count: state.count }));
      };
      return query;
    },
    rpc: vi.fn(async () => ({ data: [{ invoices_total: 100, invoices_paid: 40, invoices_pending: 60, invoices_count: 5, payments_month_total: 0, payments_month_count: 0, payments_completed_count: 3, payments_pending_count: 1 }], error: null })),
  },
}));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: state.company, isInitializing: false, isAuthenticating: false }) }));
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: <T,>(value: T) => value }));

const mount = (read: () => ReturnType<typeof useBillingInvoices>) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderHook(read, { wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
};

describe('billing register server pagination', () => {
  beforeEach(() => { state.calls = []; state.count = 251; });

  it('requests a single server page, not the whole register', async () => {
    const hook = mount(() => useBillingInvoices({ search: '', status: 'all', page: 1 }));
    await waitFor(() => expect(hook.result.current.data?.total).toBe(251));
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0].range).toEqual([0, BILLING_PAGE_SIZE - 1]);
    expect(state.calls[0].filters.company_id).toBe('company-a');
    expect(hook.result.current.data?.rows).toHaveLength(50);
  });

  it('maps page numbers to the correct range', async () => {
    const hook = mount(() => useBillingInvoices({ search: '', status: 'all', page: 3 }));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.calls[0].range).toEqual([100, 149]);
  });

  it('sends the status filter to the server', async () => {
    const hook = mount(() => useBillingInvoices({ search: '', status: 'unpaid', page: 1 }));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.calls[0].filters.payment_status).toBe('unpaid');
  });

  it('maps overdue to invoices.status instead of payment_status', async () => {
    const hook = mount(() => useBillingInvoices({ search: '', status: 'overdue', page: 1 }));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.calls[0].filters.status).toBe('overdue');
    expect(state.calls[0].filters.payment_status).toBeUndefined();
  });

  it('escapes and forwards the customer search expression', async () => {
    const hook = mount(() => useBillingInvoices({ search: 'شركة,100%', status: 'all', page: 1 }));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.calls[0].or).toContain('invoice_number.ilike.%شركة 100%');
    expect(state.calls[0].or).toContain('customers.company_name.ilike.%شركة 100%');
  });

  it('filters payments on their own columns', async () => {
    const hook = mount(() => useBillingPayments({ search: 'أحمد', status: 'completed', page: 2 }));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.calls[0].table).toBe('payments');
    expect(state.calls[0].filters.payment_status).toBe('completed');
    expect(state.calls[0].or).toContain('payment_number.ilike.%أحمد%');
    expect(state.calls[0].range).toEqual([50, 99]);
  });

  it('sorts each register by its own date column', async () => {
    const invoices = mount(() => useBillingInvoices({ search: '', status: 'all', page: 1 }));
    await waitFor(() => expect(invoices.result.current.isSuccess).toBe(true));
    const payments = mount(() => useBillingPayments({ search: '', status: 'all', page: 1 }));
    await waitFor(() => expect(payments.result.current.isSuccess).toBe(true));
    const invoiceCall = state.calls.find(call => call.table === 'invoices');
    const paymentCall = state.calls.find(call => call.table === 'payments');
    expect(invoiceCall?.orders[0]).toBe('invoice_date');
    // payments has no invoice_date column — ordering by it breaks the whole page (Postgres 42703)
    expect(paymentCall?.orders[0]).toBe('payment_date');
  });

  it('reads the aggregated stats RPC once', async () => {
    const hook = mount(() => useBillingRegisterStats());
    await waitFor(() => expect(hook.result.current.data).toEqual({
      invoices_total: 100, invoices_paid: 40, invoices_pending: 60, invoices_count: 5,
      payments_month_total: 0, payments_month_count: 0, payments_completed_count: 3, payments_pending_count: 1,
    }));
    expect(state.calls).toHaveLength(0);
  });
});