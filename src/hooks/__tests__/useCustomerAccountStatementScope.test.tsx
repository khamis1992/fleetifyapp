import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCustomerAccountStatement } from '../useCustomerAccountStatement';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), access: {} as Record<string, unknown>, validate: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => mocks.access }));
const transaction = (id: string) => ({ transaction_id: id, transaction_date: '2026-02-01', transaction_type: 'invoice', description: id, reference_number: id, debit_amount: 200, credit_amount: 0, running_balance: 200, source_table: 'invoices' });
const deferred = () => { let resolve!: (value: { data: ReturnType<typeof transaction>[] | null; error: null | { message: string } }) => void;
  const promise = new Promise<{ data: ReturnType<typeof transaction>[] | null; error: null | { message: string } }>(r => { resolve = r; }); return { promise, resolve }; };
function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { wrapper, client };
}
describe('customer statement authenticated company cache', () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: [transaction('own-company')], error: null });
    mocks.validate.mockReset();
    mocks.access = { companyId: 'company-a', user: { id: 'user-a' }, isInitializing: false, isAuthenticating: false, authError: null, validateCompanyAccess: mocks.validate };
  });
  it('separates the same customer code across company and user changes and hides the previous result while fetching', async () => {
    const { wrapper, client } = makeWrapper();
    const { result, rerender, unmount } = renderHook(() => useCustomerAccountStatement({ customerCode: 'SAME-CODE' }), { wrapper });
    await waitFor(() => expect(result.current.data?.[0].transaction_id).toBe('own-company'));
    const next = deferred(); mocks.rpc.mockReturnValueOnce(next.promise);
    mocks.access = { ...mocks.access, companyId: 'company-b' }; rerender();
    expect(result.current.data).toBeUndefined(); expect(result.current.isLoading).toBe(true);
    await act(async () => { next.resolve({ data: [transaction('company-b')], error: null }); });
    await waitFor(() => expect(result.current.data?.[0].transaction_id).toBe('company-b'));
    expect(mocks.rpc).toHaveBeenLastCalledWith('get_customer_account_statement_by_code', expect.objectContaining({ p_company_id: 'company-b' }));
    const changedUser = deferred(); mocks.rpc.mockReturnValueOnce(changedUser.promise);
    mocks.access = { ...mocks.access, user: { id: 'user-b' } }; rerender();
    expect(result.current.data).toBeUndefined();
    await act(async () => { changedUser.resolve({ data: [transaction('new-user')], error: null }); });
    await waitFor(() => expect(result.current.data?.[0].transaction_id).toBe('new-user'));
    expect(client.getQueryCache().getAll()).toHaveLength(3);
    unmount(); client.clear();
  });
  it('suppresses cached records while session restoration is busy and exposes missing scope as an error', async () => {
    const { wrapper, client } = makeWrapper();
    const { result, rerender, unmount } = renderHook(() => useCustomerAccountStatement({ customerCode: 'SAME-CODE' }), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    mocks.access = { ...mocks.access, isAuthenticating: true }; rerender();
    expect(result.current.data).toBeUndefined(); expect(result.current.isLoading).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    mocks.access = { ...mocks.access, isAuthenticating: false, user: null, companyId: null }; rerender();
    expect(result.current.data).toBeUndefined(); expect(result.current.error?.message).toContain('جلسة');
    expect(mocks.rpc).toHaveBeenCalledOnce();
    unmount(); client.clear();
  });
  it('hides a previous successful response during refetch and after a source denial', async () => {
    const { wrapper, client } = makeWrapper();
    const { result, unmount } = renderHook(() => useCustomerAccountStatement({ customerCode: 'SAME-CODE', dateFrom: '2026-02-01' }), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    const refresh = deferred(); mocks.rpc.mockReturnValueOnce(refresh.promise);
    act(() => { void result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toBeUndefined());
    expect(result.current.isLoading).toBe(true);
    await act(async () => { refresh.resolve({ data: null, error: { message: 'Not authorized for statement' } }); });
    await waitFor(() => expect(result.current.error?.message).toBe('Not authorized for statement'));
    expect(result.current.data).toBeUndefined(); expect(result.current.isLoading).toBe(false);
    unmount(); client.clear();
  });
  it('fails closed for access errors and prevents manual refetch from calling RPC', async () => {
    mocks.access = { ...mocks.access, authError: 'Access denied' };
    const { wrapper, client } = makeWrapper();
    const { result, unmount } = renderHook(() => useCustomerAccountStatement({ customerCode: 'SAME-CODE' }), { wrapper });
    expect(result.current.error?.message).toBe('Access denied');
    await act(async () => { await result.current.refetch(); });
    expect(result.current.data).toBeUndefined(); expect(mocks.rpc).not.toHaveBeenCalled();
    unmount(); client.clear();
  });
});

