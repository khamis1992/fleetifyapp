import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEnhancedFinancialReports } from '../useEnhancedFinancialReports';

const state = vi.hoisted(() => ({ companyId: 'company-a', actorId: 'actor-a' as string | null,
  initializing: false, authenticating: false, authError: null as string | null, income: vi.fn(), directRead: vi.fn() }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({ companyId: state.companyId, user: state.actorId ? { id: state.actorId } : null,
    isInitializing: state.initializing, isAuthenticating: state.authenticating, authError: state.authError,
    getQueryKey: (key: unknown[]) => [...key, state.companyId] }),
}));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-10-01', readIncomeStatementAccounts: state.income }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: state.directRead } }));
vi.mock('@sentry/react', () => ({ addBreadcrumb: vi.fn() }));

const account = (id: string, type: string, value: number) => ({ id, account_code: id, account_name: id,
  account_name_ar: null, account_type: type, current_balance: value });
const mount = (start?: string, end?: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useEnhancedFinancialReports('income_statement', start, end), {
    wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
};

describe('income statement verified server reader', () => {
  beforeEach(() => {
    vi.clearAllMocks(); state.companyId = 'company-a'; state.actorId = 'actor-a';
    state.initializing = false; state.authenticating = false; state.authError = null;
    state.directRead.mockImplementation(() => { throw new Error('Row-limited joined reads must not produce income statements'); });
    state.income.mockResolvedValue([account('sales', 'income', -100), account('rent', 'revenue', 50), account('refund', 'expenses', -20), account('cost', 'expense', 30)]);
  });
  it('preserves signed income/refunds and uses the selected company/period without direct REST line reads', async () => {
    const hook = mount('2026-01-01', '2026-09-30');
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.income).toHaveBeenCalledWith('company-a', '2026-01-01', '2026-09-30');
    expect(state.directRead).not.toHaveBeenCalled();
    expect(hook.result.current.data).toMatchObject({ totalCredits: -50, totalDebits: 10, netIncome: -60 });
    expect(hook.result.current.data?.sections[0].accounts[0].balance).toBe(-100);
  });
  it('includes more than 1000 returned accounts instead of truncating the verified JSON result', async () => {
    state.income.mockResolvedValue(Array.from({ length: 1205 }, (_, n) => account(String(n), 'revenue', n === 1204 ? -5 : 1)));
    const hook = mount('2026-01-01', '2026-09-30');
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(hook.result.current.data?.sections[0].accounts).toHaveLength(1205);
    expect(hook.result.current.data?.totalCredits).toBe(1199);
  });
  it('isolates cached results after changing the company', async () => {
    const hook = mount('2026-01-01', '2026-09-30');
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    state.companyId = 'company-b'; state.income.mockResolvedValue([account('company-b-sales', 'revenue', 77)]);
    hook.rerender();
    await waitFor(() => expect(hook.result.current.data?.totalCredits).toBe(77));
    expect(state.income).toHaveBeenLastCalledWith('company-b', '2026-01-01', '2026-09-30');
    expect(hook.result.current.data?.sections[0].accounts[0].accountCode).toBe('company-b-sales');
  });
  it('does not reuse a fresh cache when another user signs into the same company', async () => {
    const hook = mount('2026-01-01', '2026-09-30');
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    let resolveNewActor!: (value: ReturnType<typeof account>[]) => void;
    state.income.mockReturnValue(new Promise(resolve => { resolveNewActor = resolve; }));
    state.actorId = 'actor-b'; hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    await waitFor(() => expect(state.income).toHaveBeenCalledTimes(2));
    resolveNewActor([account('actor-b-sales', 'revenue', 77)]);
    await waitFor(() => expect(hook.result.current.data?.totalCredits).toBe(77));
  });
  it('hides cached financial data while access is restoring, denied, or signed out', async () => {
    const hook = mount('2026-01-01', '2026-09-30');
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    state.initializing = true; hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    state.initializing = false; state.authenticating = true; hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    state.authenticating = false; state.authError = 'Access denied'; hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    state.authError = null; state.actorId = null; hook.rerender();
    expect(hook.result.current.data).toBeUndefined();
    expect(state.income).toHaveBeenCalledTimes(1);
  });
  it('uses the Qatar date/year defaults and keeps a legitimate zero balance', async () => {
    state.income.mockResolvedValue([account('zero', 'revenue', 0)]);
    const hook = mount();
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    expect(state.income).toHaveBeenCalledWith('company-a', '2026-01-01', '2026-10-01');
    expect(hook.result.current.data?.totalCredits).toBe(0);
    expect(hook.result.current.data?.sections[0].accounts).toHaveLength(1);
  });
  it('propagates RPC/validation failures without reporting a zero income statement', async () => {
    state.income.mockRejectedValue(new Error('Income reader unavailable'));
    const hook = mount('2026-01-01', '2026-09-30');
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.data).toBeUndefined();
  });
});
