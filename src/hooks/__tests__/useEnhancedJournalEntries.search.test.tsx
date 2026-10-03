import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEnhancedJournalEntries } from '../useGeneralLedger';

const { readJournals } = vi.hoisted(() => ({ readJournals: vi.fn() }));
vi.mock('@/services/financialReporting', () => ({
  readFinancialJournals: readJournals, financeToday: vi.fn(), readAccountBalances: vi.fn(),
  readTrialBalance: vi.fn(), readFinancialSummary: vi.fn(), readFinancialPages: vi.fn(),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'actor-a' } }) }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({ useUnifiedCompanyAccess: () => ({ companyId: 'company-a', isAuthenticating: false, authError: null }) }));
vi.mock('sonner', () => ({ toast: {} }));
beforeEach(() => { readJournals.mockReset(); });

describe('filtered journal query lifecycle', () => {
  it('clears an inherited previous list and cancels the superseded server search', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, placeholderData: previous => previous } } });
    const initial = { status: 'draft', searchTerm: undefined as string | undefined };
    client.setQueryData(['enhancedJournalEntries', 'company-a', initial], Array.from({ length: 1426 }, (_, i) => ({ id: `old-${i}`, status: 'draft' })));
    readJournals.mockImplementation((_company, filters) => filters.searchTerm === 'second'
      ? Promise.resolve([{ id: 'matched', status: 'posted' }]) : new Promise(() => {}));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const view = renderHook(({ filters }) => useEnhancedJournalEntries(filters), { wrapper, initialProps: { filters: initial } });
    expect(view.result.current.data).toHaveLength(1426);
    act(() => view.rerender({ filters: { status: 'draft', searchTerm: 'first' } }));
    await waitFor(() => expect(readJournals).toHaveBeenCalledTimes(1));
    expect(view.result.current.data).toBeUndefined();
    expect(view.result.current.isLoading).toBe(true);
    const firstSignal = readJournals.mock.calls[0][2] as AbortSignal;
    expect(firstSignal.aborted).toBe(false);
    act(() => view.rerender({ filters: { status: 'draft', searchTerm: 'second' } }));
    await waitFor(() => expect(view.result.current.data?.[0].id).toBe('matched'));
    expect(firstSignal.aborted).toBe(true);
    expect(readJournals.mock.calls[1][0]).toBe('company-a');
    expect(readJournals.mock.calls[1][2]).not.toBe(firstSignal);
    view.unmount(); client.clear();
  });
});
