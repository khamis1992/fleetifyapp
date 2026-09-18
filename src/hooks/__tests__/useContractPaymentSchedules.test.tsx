import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { useContractPaymentSchedules } from '../usePaymentSchedules';
import { analyzeContractBillingPeriod } from '@/utils/contractCalculations';

const { from, eq, gte, order, readPage, pageOptions, access } = vi.hoisted(() => ({
  from: vi.fn(), eq: vi.fn(), gte: vi.fn(), order: vi.fn(), readPage: vi.fn(), pageOptions: { cap: 200, failCursor: '' },
  access: { companyId: 'company-1', isInitializing: false },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => access }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@sentry/react', () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
beforeEach(() => {
  vi.clearAllMocks();
  access.companyId = 'company-1';
  access.isInitializing = false;
  pageOptions.cap = 200;
  pageOptions.failCursor = '';
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let cursor: string | null = null;
  const chain = { select: () => chain, eq, gte, order, limit: () => chain,
    gt: (_key: string, id: string) => { cursor = id; return chain; },
    then: async (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => {
      try {
        if (cursor && cursor === pageOptions.failCursor) return resolve({ data: null, error: new Error('later page failed') });
        const response = await readPage();
        return resolve({ ...response, data: response.data === null ? null : [...response.data]
          .sort((a, b) => a.id.localeCompare(b.id)).filter((row) => !cursor || row.id > cursor).slice(0, pageOptions.cap) });
      } catch (error) { return reject(error); }
    },
  };
  from.mockImplementation(() => { cursor = null; return chain; });
  eq.mockReturnValue(chain);
  gte.mockReturnValue(chain);
  order.mockReturnValue(chain);
});
afterEach(() => { cleanup(); client.clear(); });

describe('complete contract schedule evidence', () => {
  // Wiring assertion only; the following hook tests exercise query construction
  // and real billing validation, not the entire rendered details page or RLS.
  it('the details page does not hide earlier or undated schedules from its audit', () => {
    const source = readFileSync('src/components/contracts/ContractDetailsPageRedesigned.tsx', 'utf8');
    expect(/useContractPaymentSchedules\(\s*contract\?\.id \|\| '',?\s*\)/.test(source)).toBe(true);
    expect(source.includes('scheduleMinDueDate')).toBe(false);
  });

  it.each([
    ['2025-12-01', 'خارج مدة العقد في: 2025-12'],
    ['2026-04-01', 'خارج مدة العقد في: 2026-04'],
    [null, 'بلا تاريخ استحقاق صالح'],
  ])('passes the %s schedule to the validator instead of filtering it out', async (dueDate, message) => {
    const schedules = [
      { id: 'valid', company_id: 'company-1', contract_id: 'contract-1', installment_number: 1, due_date: '2026-02-01', amount: 1_500, status: 'pending' },
      { id: 'conflict', company_id: 'company-1', contract_id: 'contract-1', installment_number: 2, due_date: dueDate, amount: 1_500, status: 'pending' },
    ];
    readPage.mockResolvedValue({ data: schedules, error: null });
    const { result } = renderHook(() => useContractPaymentSchedules('contract-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(schedules);
    expect(gte).not.toHaveBeenCalled();
    expect(eq).toHaveBeenCalledWith('company_id', 'company-1');
    expect(eq).toHaveBeenCalledWith('contract_id', 'contract-1');
    const validation = analyzeContractBillingPeriod({
      startDate: '2026-01-01', endDate: '2026-03-01',
      contractAmount: 3_000, monthlyAmount: 1_500, schedules: result.current.data,
    });
    expect(validation.valid).toBe(false);
    expect(validation.blockingMessage).toContain(message);
    expect(validation.blockingMessage).toContain('تم اكتشاف تاريخي البداية والنهاية');
  });

  it('keeps a requested date filter available to other consumers', async () => {
    readPage.mockResolvedValue({ data: [], error: null });
    const { result } = renderHook(() => useContractPaymentSchedules('contract-1', '2026-01-01'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(gte).toHaveBeenCalledWith('due_date', '2026-01-01');
  });

  it('reports a failed read rather than treating it as an empty schedule', async () => {
    readPage.mockResolvedValue({ data: null, error: { message: 'read denied' } });
    const { result } = renderHook(() => useContractPaymentSchedules('contract-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('does not query before company context is ready', () => {
    access.isInitializing = true;
    renderHook(() => useContractPaymentSchedules('contract-1'), { wrapper });
    expect(from).not.toHaveBeenCalled();
  });

  it('reads beyond short pages and restores installment order', async () => {
    pageOptions.cap = 1;
    const rows = ['c', 'a', 'b'].map((id, index) => ({ id, company_id: 'company-1', contract_id: 'contract-1', installment_number: index + 1 }));
    readPage.mockResolvedValue({ data: rows, error: null });
    const { result } = renderHook(() => useContractPaymentSchedules('contract-1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((row) => row.id)).toEqual(['c', 'a', 'b']);
    expect(readPage).toHaveBeenCalledTimes(4);
  });

  it('rejects a later page failure instead of returning a partial schedule', async () => {
    pageOptions.cap = 1; pageOptions.failCursor = 'a';
    readPage.mockResolvedValue({ data: [{ id: 'a', company_id: 'company-1', contract_id: 'contract-1' }, { id: 'b', company_id: 'company-1', contract_id: 'contract-1' }], error: null });
    const { result } = renderHook(() => useContractPaymentSchedules('contract-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it.each([{ data: null, error: null }, { data: [{ id: 'a', company_id: 'other', contract_id: 'contract-1' }], error: null }])('rejects unavailable or foreign schedule data', async (response) => {
    readPage.mockResolvedValue(response);
    const { result } = renderHook(() => useContractPaymentSchedules('contract-1'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
