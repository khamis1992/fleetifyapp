import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractPaymentsTabRedesigned } from '../ContractPaymentsTabRedesigned';

const state = vi.hoisted(() => ({ fail: '', omitPayment: false, calls: [] as Array<{ table: string; filters: Array<[string, unknown]> }>, cachedPaid: 500,
  direction: 'receipt', customer: 'customer', allocated: 500, target: 'i', allocationType: 'invoice', directInvoice: 'i' as string | null, creator: null as string | null }));
vi.mock('@/hooks/business/usePaymentOperations', () => ({ usePaymentOperations: () => ({ cancelPayment: { mutate: vi.fn(), isPending: false } }) }));
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const filters: Array<[string, unknown]> = [];
    const builder = {
      select: () => builder, order: () => builder, limit: () => builder,
      eq: (key: string, value: unknown) => { filters.push([key, value]); return builder; },
      in: (key: string, value: unknown) => { filters.push([key, value]); return builder; },
      or: (value: unknown) => { filters.push(['or', value]); return builder; },
      gt: (key: string, value: unknown) => { filters.push([`gt:${key}`, value]); return builder; },
      gte: (key: string, value: unknown) => { filters.push([`gte:${key}`, value]); return builder; },
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => {
        state.calls.push({ table, filters });
        const phase = table === 'profiles' ? 'profiles' : table === 'payments' ? 'payments' : filters.some(([key]) => key === 'target_id') ? 'invoice' : 'all';
        if (state.fail === phase) return Promise.resolve({ data: null, error: new Error('read failure') }).then(resolve, reject);
        const rows: Record<string, unknown>[] = table === 'profiles' ? [] : table === 'payments'
          ? [{ id: 'p', company_id: 'company', customer_id: state.customer, contract_id: 'contract', transaction_type: state.direction,
            amount: 500, payment_date: '2025-12-15', payment_status: 'completed', payment_method: 'cash', invoice_id: state.directInvoice,
            created_by: state.creator, created_at: '2025-12-15', notes: null, reference_number: 'TEST-RECEIPT' }]
          : [{ id: 'a', company_id: 'company', payment_id: 'p', target_id: state.target, allocation_type: state.allocationType, amount: state.allocated, is_active: true }];
        const filtered = rows.filter((row) => filters.every(([key, value]) => key === 'gt:id' ? String(row.id) > String(value)
          : Array.isArray(value) ? value.includes(row[key]) : row[key] === value));
        return Promise.resolve({ data: table === 'payments' && state.omitPayment ? [] : filtered, error: null }).then(resolve, reject);
      },
    };
    return builder;
  },
} }));

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><ContractPaymentsTabRedesigned
    companyId="company" customerId="customer" contractId="contract" invoiceIds={['i']} contractStartDate="2026-01-01"
    invoices={[{ id: 'i', invoice_number: 'INV-1', invoice_month: '2026-01-01', total_amount: 1500, paid_amount: state.cachedPaid, due_date: '2026-01-01' }]}
    formatCurrency={(amount) => `QAR ${amount.toFixed(2)}`}
  /></QueryClientProvider>);
  return { ...view, client };
}

beforeEach(() => { state.fail = ''; state.omitPayment = false; state.calls = []; state.cachedPaid = 500;
  state.direction = 'receipt'; state.customer = 'customer'; state.allocated = 500; state.target = 'i'; state.allocationType = 'invoice'; state.directInvoice = 'i'; state.creator = null; });
afterEach(cleanup);
describe('contract installment view read integrity', () => {
  it.each(['payment', 'refund', 'transfer'])('excludes %s from installment settlement and the collected metric', async (direction) => {
    state.direction = direction; state.cachedPaid = 0;
    mount();
    await screen.findByText('فاتورة شهر 1/2026');
    const metric = screen.getByText(/^المسدد لهذا العقد/).closest('[class*="rounded"]');
    expect(metric).not.toBeNull();
    expect(within(metric as HTMLElement).getByText('QAR 0.00')).toBeInTheDocument();
    expect(screen.getAllByText('QAR 1500.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('QAR 1000.00')).not.toBeInTheDocument();
  });
  it('isolates a different-customer legacy receipt with a warning and keeps overallocation fatal', async () => {
    // A different-customer legacy receipt no longer fails the whole read:
    // it is skipped with an integrity warning (visible in the evidence
    // bundle) while the ledger renders zero proven settlements.
    state.customer = 'someone-else';
    mount();
    await screen.findByText('فاتورة شهر 1/2026');
    expect(screen.queryByText('QAR 500.00')).not.toBeInTheDocument();
    cleanup();
    // Over-allocation is still a hard failure: the read cannot be trusted.
    state.customer = 'customer'; state.allocated = 600;
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('لم تُحسب الأرصدة');
  });
  it('keeps gross receipt amounts but shows only their contract allocation as collected', async () => {
    state.allocated = 300; state.cachedPaid = 300;
    mount();
    await screen.findByText('فاتورة شهر 1/2026');
    const metric = screen.getByText(/^المسدد لهذا العقد/).closest('[class*="rounded"]');
    expect(within(metric as HTMLElement).getByText('QAR 300.00')).toBeInTheDocument();
    expect(screen.getByText('QAR 1200.00')).toBeInTheDocument();
    expect(screen.getAllByText('QAR 500.00').length).toBeGreaterThan(0);
  });
  it('discovers contract-only allocations and filters receipts locally without re-reading or changing totals', async () => {
    state.target = 'contract'; state.allocationType = 'contract'; state.directInvoice = null; state.cachedPaid = 0;
    const { client } = mount();
    await screen.findByText('فاتورة شهر 1/2026');
    fireEvent.click(screen.getByRole('button', { name: 'سجل الإيصالات' }));
    expect(await screen.findByText('TEST-RECEIPT')).toBeInTheDocument();
    const calls = state.calls.length;
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => expect(screen.queryByText('TEST-RECEIPT')).not.toBeInTheDocument());
    expect(state.calls).toHaveLength(calls);
    expect(client.getQueryCache().getAll().filter((q) => q.queryKey[0] === 'contract-payments')).toHaveLength(1);
    const metric = screen.getByText(/^المسدد لهذا العقد/).closest('[class*="rounded"]');
    expect(within(metric as HTMLElement).getByText('QAR 500.00')).toBeInTheDocument();
  });
  it('preserves financial evidence if optional creator names fail', async () => {
    state.creator = 'employee'; state.fail = 'profiles';
    mount();
    expect(await screen.findByText('فاتورة شهر 1/2026')).toBeInTheDocument();
    expect(screen.getByText('QAR 1000.00')).toBeInTheDocument();
  });
  it('does not display a balance when an active allocation references an unavailable receipt', async () => {
    // The unavailable-receipt anchor becomes an integrity warning; nothing can
    // be proven settled, so no settlement balance is rendered.
    state.omitPayment = true;
    mount();
    await screen.findByText('فاتورة شهر 1/2026');
    expect(screen.queryByText('QAR 500.00')).not.toBeInTheDocument();
    expect(screen.queryByText('QAR 1000.00')).not.toBeInTheDocument();
  });
  it.each(['invoice', 'payments', 'all'])('shows an error rather than a balance when %s reads fail', async (phase) => {
    state.fail = phase;
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('لم تُحسب الأرصدة من بيانات ناقصة');
    expect(screen.queryByText('فاتورة شهر 1/2026')).not.toBeInTheDocument();
    expect(screen.queryByText('QAR 0.00')).not.toBeInTheDocument();
  });
  it('reads advance payments and all pages, company scoped, and shows their remaining balance', async () => {
    mount();
    expect(await screen.findByText('فاتورة شهر 1/2026')).toBeInTheDocument();
    expect(screen.getByText('QAR 1000.00')).toBeInTheDocument();
    expect(state.calls.every((call) => call.filters.some(([key, value]) => key === 'company_id' && value === 'company'))).toBe(true);
    expect(state.calls.some((call) => call.filters.some(([key]) => key === 'gte:payment_date'))).toBe(false);
    expect(state.calls.filter((call) => call.filters.some(([key]) => key === 'gt:id'))).toHaveLength(4);
  });
  it('exposes a cached balance discrepancy without calling the installment paid', async () => {
    state.cachedPaid = 1500;
    mount();
    expect(await screen.findByText('تعارض يحتاج مراجعة')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('رصيد الفاتورة المخزن لا يطابق');
    expect(screen.getByText('QAR 1000.00')).toBeInTheDocument();
  });
  it('hides a previously rendered ledger after a failed background refresh', async () => {
    const { client } = mount();
    await screen.findByText('فاتورة شهر 1/2026');
    state.fail = 'all';
    await client.invalidateQueries({ queryKey: ['contract-payments', 'contract'] });
    await waitFor(() => expect(screen.queryByText('فاتورة شهر 1/2026')).not.toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent('لم تُحسب الأرصدة');
  });
});
