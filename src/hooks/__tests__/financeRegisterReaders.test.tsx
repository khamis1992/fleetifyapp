import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInvoices } from '../finance/useInvoices';
import { usePayments } from '../usePayments.unified';
const state = vi.hoisted(() => ({ company: 'company-a', from: vi.fn(), calls: [] as { table: string; filters: Record<string, unknown>; range: number[] }[], fail: false }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: state.company, user: { id: 'user' }, isInitializing: false, isAuthenticating: false }) }));
vi.mock('@/hooks/usePermissions', () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.from } }));

describe('financial register database pagination', () => {
  beforeEach(() => {
    state.company = 'company-a'; state.fail = false; state.calls = [];
    state.from.mockImplementation((table: string) => {
      const filters: Record<string, unknown> = {}; let range = [0, 499];
      const query: Record<string, unknown> = {};
      for (const method of ['select', 'order', 'gte', 'lte', 'is']) query[method] = () => query;
      query.eq = (column: string, value: unknown) => { filters[column] = value; return query; };
      query.range = (from: number, to: number) => { range = [from, to]; return query; };
      query.then = (resolve: (value: unknown) => unknown) => {
        state.calls.push({ table, filters: { ...filters }, range: [...range] });
        // The server cap is smaller than the requested page: count is essential.
        const count = filters.company_id === 'company-a' ? 1101 : 1;
        const data = Array.from({ length: Math.max(0, Math.min(200, count - range[0])) }, (_, index) => ({ id: `${filters.company_id}-${range[0] + index}`, company_id: filters.company_id, contracts: null }));
        return Promise.resolve(resolve(state.fail && range[0] >= 200 ? { data: null, error: { message: 'auth: later page denied' }, count } : { data, error: null, count }));
      };
      return query;
    });
  });
  const mount = (read: () => ReturnType<typeof useInvoices> | ReturnType<typeof usePayments>) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    const hook = renderHook(read, { wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    return { ...hook, client };
  };
  it.each(['invoices', 'payments'])('reads all %s past a smaller server cap and scopes every page', async table => {
    const hook = mount(() => table === 'invoices' ? useInvoices({ allPages: true, contractId: 'contract-a' }) : usePayments({ contract_id: 'contract-a' }));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data).toHaveLength(1101);
    expect(state.calls.map(call => call.range[0])).toEqual([0, 200, 400, 600, 800, 1000]);
    expect(state.calls.every(call => call.filters.company_id === 'company-a' && call.filters.contract_id === 'contract-a')).toBe(true);
  });
  it.each(['invoices', 'payments'])('does not return a partial %s list after a later page failure', async table => {
    state.fail = true;
    const hook = mount(() => table === 'invoices' ? useInvoices({ allPages: true }) : usePayments());
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.data).toBeUndefined();
  });
  it('does not reuse the previous company invoice cache', async () => {
    const hook = mount(() => useInvoices({ allPages: true }));
    await waitFor(() => expect(hook.result.current.data).toHaveLength(1101));
    state.company = 'company-b'; hook.rerender();
    await waitFor(() => expect(hook.result.current.data).toHaveLength(1));
    expect(hook.result.current.data).toEqual([expect.objectContaining({ company_id: 'company-b' })]);
  });
});
