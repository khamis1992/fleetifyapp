import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBalanceSheetActions } from '../useProfessionalBalanceSheet';
import { useFinancialStatementPackageActions } from '../useFinancialStatementPackage';
import { defaultStatementConfiguration } from '@/utils/financialStatementConfiguration';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
vi.mock('@/hooks/useUnifiedCompanyAccess', () => ({
  useUnifiedCompanyAccess: () => ({ companyId: '11111111-1111-4111-8111-111111111111', user: { id: '22222222-2222-4222-8222-222222222222' } }),
}));
vi.mock('@/services/financialReporting', () => ({ financeToday: () => '2026-09-18' }));

const id = '33333333-3333-4333-8333-333333333333';
const notes = 'Reviewed the source classifications and supporting evidence.';
const confirmations = { classifications: true, policies: true, reconciliations: true, disclosures: true, periodCutoff: true };
const useActions = () => ({ balance: useBalanceSheetActions(), package: useFinancialStatementPackageActions() });
type Actions = ReturnType<typeof useActions>;
const cases: Array<{ rpcName: string; invoke: (actions: Actions) => Promise<unknown>; failed: (actions: Actions) => boolean }> = [
  { rpcName: 'save_professional_balance_sheet_v1', invoke: a => a.balance.save.mutateAsync({ asOf: '2025-12-31', comparison: '2024-12-31', notes }), failed: a => a.balance.save.isError },
  { rpcName: 'approve_professional_balance_sheet_v1', invoke: a => a.balance.approve.mutateAsync({ id, notes, confirmations }), failed: a => a.balance.approve.isError },
  { rpcName: 'void_professional_balance_sheet_v1', invoke: a => a.balance.voidReport.mutateAsync({ id, reason: notes }), failed: a => a.balance.voidReport.isError },
  { rpcName: 'save_financial_statement_package_v1', invoke: a => a.package.save.mutateAsync(defaultStatementConfiguration('2026-08-31')), failed: a => a.package.save.isError },
  { rpcName: 'approve_financial_statement_package_v1', invoke: a => a.package.approve.mutateAsync({ id, notes, confirmations }), failed: a => a.package.approve.isError },
  { rpcName: 'void_financial_statement_package_v1', invoke: a => a.package.voidReport.mutateAsync({ id, reason: notes }), failed: a => a.package.voidReport.isError },
  { rpcName: 'lock_financial_reporting_period_v1', invoke: a => a.package.periodLock.mutateAsync({ cutoff: '2026-08-31', reason: notes }), failed: a => a.package.periodLock.isError },
  { rpcName: 'unlock_financial_reporting_period_v1', invoke: a => a.package.periodLock.mutateAsync({ cutoff: null, reason: notes }), failed: a => a.package.periodLock.isError },
];

beforeEach(() => vi.clearAllMocks());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('report mutation safety under application retry defaults', () => {
  it.each(cases)('$rpcName fails once without inherited retries or raw default logging', async ({ rpcName, invoke, failed }) => {
    const error = { code: '57014', message: 'statement timed out for secret-customer balance 998877.66', details: 'bearer private-token', hint: '33333333-3333-4333-8333-333333333333' };
    rpc.mockResolvedValue({ data: null, error });
    const defaultLogger = vi.fn();
    const safeLogger = vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: 1, retryDelay: 0, onError: defaultLogger } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(useActions, { wrapper });
    await act(async () => { await expect(invoke(hook.result.current)).rejects.toBe(error); });
    await waitFor(() => expect(failed(hook.result.current)).toBe(true));
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][0]).toBe(rpcName);
    expect(defaultLogger).not.toHaveBeenCalled();
    expect(safeLogger).toHaveBeenCalledTimes(1);
    expect(safeLogger.mock.calls[0]).toEqual([expect.any(String), JSON.stringify({ code: '57014' })]);
    const logged = JSON.stringify(safeLogger.mock.calls);
    expect(logged).not.toMatch(/secret-customer|998877|private-token|33333333|details|statement timed out/);
    expect(client.getMutationCache().getAll()[0].state.failureCount).toBe(1);
    hook.unmount();
    client.clear();
  });
});
