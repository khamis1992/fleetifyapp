import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ access: { companyId: 'company-a' as string | null, user: { id: 'user' } as { id: string } | null, isInitializing: false, isAuthenticating: false, authError: null as string | null }, read: vi.fn() }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => state.access }));
vi.mock('../arAgingReportData', () => ({ readArAging: state.read }));
import { useArAgingReport } from '../useArAgingReport';
const setup = () => { const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); return { client, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> }; };
beforeEach(() => { Object.assign(state.access, { companyId: 'company-a', user: { id: 'user' }, isInitializing: false, isAuthenticating: false, authError: null }); state.read.mockReset().mockResolvedValue({ companyId: 'company-a', asOf: '2026-09-30' }); });
it('does not fetch while authorization is initializing with a retained user', async () => {
  state.access.isInitializing = true; const { wrapper } = setup(); const { result, rerender } = renderHook(() => useArAgingReport('2026-09-30'), { wrapper });
  expect(result.current.isLoading).toBe(true); expect(result.current.data).toBeUndefined(); expect(state.read).not.toHaveBeenCalled();
  state.access.isInitializing = false; rerender(); await waitFor(() => expect(result.current.data).toBeDefined()); expect(state.read).toHaveBeenCalledWith('company-a', '2026-09-30');
});
it('clears prior successful data on a refetch failure rather than leaving it exportable', async () => {
  const { wrapper } = setup(); const { result } = renderHook(() => useArAgingReport('2026-09-30'), { wrapper }); await waitFor(() => expect(result.current.data).toBeDefined());
  state.read.mockRejectedValueOnce(new Error('source failed')); await act(async () => { await result.current.refetch(); });
  await waitFor(() => expect(result.current.isError).toBe(true)); expect(result.current.data).toBeUndefined();
});
it('isolates company and cutoff caches and hides retained data during an auth refresh', async () => {
  const { wrapper } = setup(); const { result, rerender } = renderHook(({ cutoff }) => useArAgingReport(cutoff), { initialProps: { cutoff: '2026-09-30' }, wrapper });
  await waitFor(() => expect(result.current.data).toBeDefined()); state.access.isAuthenticating = true; rerender({ cutoff: '2026-09-30' }); expect(result.current.data).toBeUndefined();
  state.access.isAuthenticating = false; state.access.companyId = 'company-b'; rerender({ cutoff: '2026-09-29' }); await waitFor(() => expect(state.read).toHaveBeenCalledWith('company-b', '2026-09-29'));
});
