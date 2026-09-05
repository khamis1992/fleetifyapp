import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatePayment } from '../usePayments.unified';
import { usePaymentOperations } from '../business/usePaymentOperations';
import { PaymentRecordedReadError } from '@/services/paymentCommitResult';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), single: vi.fn(), eq: vi.fn(),
  warning: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
const company = '22222222-2222-4222-8222-222222222222';
const id = '11111111-1111-4111-8111-111111111111';
const customer = '33333333-3333-4333-8333-333333333333';
const invoiceId = '44444444-4444-4444-8444-444444444444';
vi.mock('sonner', () => ({ toast: { warning: mocks.warning, error: mocks.error, success: mocks.success } }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn(), addBreadcrumb: vi.fn() }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({
  companyId: '22222222-2222-4222-8222-222222222222', user: { id: '55555555-5555-4555-8555-555555555555' },
}) }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ hasPermission: () => true, hasAccess: true }) }));
vi.mock('@/hooks/finance/useFinanceAccessGuard', () => ({ useFinanceAccessGuard: () => ({ can: () => true }) }));
vi.mock('@/services/financialControls', () => ({ assertFinancialPeriodOpen: vi.fn() }));
vi.mock('@/hooks/useAuditLog', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  rpc: mocks.rpc,
  from: (table: string) => {
    const empty = Promise.resolve({ data: [], error: null });
    const chain = {
      select: () => chain,
      eq: (...args: unknown[]) => { mocks.eq(...args); return chain; },
      neq: () => chain, is: () => chain, ilike: () => chain, range: () => empty,
      limit: () => chain, maybeSingle: () => Promise.resolve({
        data: table === 'invoices' ? { id: invoiceId, total_amount: 2000, paid_amount: 0, payment_status: 'unpaid' } : null,
        error: null,
      }),
      single: mocks.single, then: empty.then.bind(empty),
    };
    return chain;
  },
} }));

let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  // Match the app's mutation retry default; payment commands must override it.
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 1, retryDelay: 0 } } });
  mocks.rpc.mockResolvedValue({ data: id, error: null });
  mocks.single.mockResolvedValue({ data: null, error: { code: '42501', message: 'read denied' } });
});
afterEach(() => { cleanup(); client.clear(); });
const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

describe('payment hooks distinguish command failures from confirmed post-commit read failures', () => {
  it.each(['fee', 'principal', 'nested-principal'] as const)('preserves the committed ID and warns for the %s path', async (path) => {
    const { result } = renderHook(() => ({ fee: useCreatePayment(), principal: usePaymentOperations({ enableNotifications: false }) }), { wrapper });
    let failure: unknown;
    await act(async () => {
      try {
        if (path !== 'principal') {
          await result.current.fee.mutateAsync({ amount: 1620, payment_date: '2026-09-03', payment_type: 'cash',
            payment_method: 'received', customer_id: customer, invoice_id: invoiceId, late_fine_amount: path === 'fee' ? 120 : 0 });
        } else {
          await result.current.principal.createPayment.mutateAsync({ amount: 1500, payment_date: '2026-09-03',
            payment_method: 'cash', customer_id: customer, type: 'receipt', currency: 'QAR', payment_status: 'completed' });
        }
      } catch (error) { failure = error; }
    });
    expect(failure).toBeInstanceOf(PaymentRecordedReadError);
    expect((failure as PaymentRecordedReadError).paymentId).toBe(id);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][0]).toBe(path === 'fee' ? 'create_invoice_payment_with_late_fee_v1' : 'create_payment_atomic');
    expect(mocks.eq).toHaveBeenCalledWith('id', id);
    expect(mocks.eq).toHaveBeenCalledWith('company_id', company);
    expect(mocks.warning).toHaveBeenCalledWith('تم تسجيل الدفعة، وتعذر تحديث العرض', expect.any(Object));
    expect(mocks.error).not.toHaveBeenCalled();
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it('does not retry a committed principal command even if its subsequent read returns code 23505', async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: '23505', message: 'injected read failure' } });
    const { result } = renderHook(() => usePaymentOperations({ enableNotifications: false }), { wrapper });
    await act(async () => {
      await expect(result.current.createPayment.mutateAsync({ amount: 500, payment_date: '2026-09-03',
        payment_method: 'cash', type: 'receipt', customer_id: customer, currency: 'QAR', payment_status: 'completed' }))
        .rejects.toBeInstanceOf(PaymentRecordedReadError);
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.single).toHaveBeenCalledTimes(1);
  });

  it('does not classify a rejected fee command as committed or try to read a payment', async () => {
    const rejected = { code: '42501', message: 'command denied' };
    mocks.rpc.mockResolvedValue({ data: null, error: rejected });
    const { result } = renderHook(() => useCreatePayment(), { wrapper });
    await act(async () => {
      await expect(result.current.mutateAsync({ amount: 1620, payment_date: '2026-09-03', payment_type: 'cash',
        payment_method: 'received', customer_id: customer, invoice_id: invoiceId, late_fine_amount: 120 })).rejects.toBe(rejected);
    });
    expect(mocks.single).not.toHaveBeenCalled();
    expect(mocks.warning).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
