import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinancialAnalysis } from '../useFinancialAnalysis';

const reader = vi.hoisted(() => ({ summary: vi.fn(), balances: vi.fn(), pages: vi.fn() }));
vi.mock('@/services/financialReporting', () => ({
  financeToday: () => '2026-09-06',
  readFinancialSummary: reader.summary,
  readAccountBalances: reader.balances,
  readFinancialPages: reader.pages,
  readIncomeStatementAccounts: vi.fn(),
}));

describe('financial analysis accounting basis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reader.summary.mockResolvedValue({
      total_assets: 1000,
      total_liabilities: 200,
      total_equity: 800,
      total_revenue: -100,
      total_expenses: 50,
      net_income: -150,
      unbalanced_entries_count: 0,
    });
    reader.balances.mockResolvedValue([{ account_id: 'cash', closing_balance: 1000 }]);
    reader.pages
      .mockResolvedValueOnce([{ id: 'cash', account_type: 'assets', account_subtype: null }])
      .mockResolvedValueOnce([]);
  });
  const mount = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderHook(() => useFinancialAnalysis({ dateFrom: '2026-09-01', dateTo: '2026-09-06' }), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
  };
  it('preserves negative income and refuses liquidity ratios without complete classifications', async () => {
    const hook = mount();
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    const report = hook.result.current.data!;
    expect(report.incomeStatement).toEqual({ revenue: -100, expenses: 50, netIncome: -150 });
    expect(report.classificationComplete).toBe(false);
    expect(report.ratios.slice(0, 2).map((ratio) => ratio.value)).toEqual([null, null]);
    expect(report.forecast).toEqual([]);
    expect(reader.summary).toHaveBeenNthCalledWith(1, 'test-company-id', '2026-09-01', '2026-09-06');
    expect(reader.summary).toHaveBeenNthCalledWith(2, 'test-company-id', '2025-09-01', '2025-09-06');
    expect(reader.balances).toHaveBeenCalledWith('test-company-id', '2026-09-06');
  });
  it('propagates failed ledger reads instead of returning an empty analysis', async () => {
    reader.summary.mockRejectedValue(new Error('Ledger denied'));
    const hook = mount();
    await waitFor(() => expect(hook.result.current.isError).toBe(true));
    expect(hook.result.current.data).toBeUndefined();
  });
});
