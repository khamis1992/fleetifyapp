import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useFleetReportDataset } from '../useFleetReports';

const state = vi.hoisted(() => ({ companyId: 'company-a', read: vi.fn() }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: state.companyId }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('../../data/readFleetReport', () => ({ readFleetReport: (...args: unknown[]) => state.read(...args) }));

describe('report company and period cache isolation', () => {
  it('never shows or exports a cached company dataset while the next company is loading', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    state.companyId = 'company-a';
    let resolveSecond: ((value: unknown) => void) | undefined;
    state.read.mockImplementation((_client: unknown, company: string) => company === 'company-a' ? Promise.resolve({ companyId: company }) : new Promise(resolve => { resolveSecond = resolve; }));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const filters = { period: 'custom' as const, compareWithPrevious: false, startDate: new Date('2026-09-01T00:00:00Z'), endDate: new Date('2026-09-30T00:00:00Z') };
    const hook = renderHook(() => useFleetReportDataset(filters), { wrapper });
    await waitFor(() => expect(hook.result.current.data?.companyId).toBe('company-a'));
    state.companyId = 'company-b'; hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.isFetching).toBe(true);
    await waitFor(() => expect(resolveSecond).toBeDefined());
    await act(async () => { resolveSecond?.({ companyId: 'company-b' }); });
    await waitFor(() => expect(hook.result.current.data?.companyId).toBe('company-b'));
    expect(queryClient.getQueryData(['fleet-report-dataset', 'company-a', '2026-09-01', '2026-09-30'])).toEqual({ companyId: 'company-a' });
    hook.unmount(); queryClient.clear();
  });
});
