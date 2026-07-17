import { describe, expect, it } from 'vitest';
import {
  planHistoricalPaymentAllocations,
  resolveHistoricalInvoicePaidAmount,
} from '../excelImportAllocation';

describe('planHistoricalPaymentAllocations', () => {
  it('uses canonical invoice state when direct payment links are incomplete', () => {
    expect(resolveHistoricalInvoicePaidAmount({
      totalAmount: 1_500,
      persistedPaidAmount: 1_500,
      persistedBalanceDue: 0,
      directPaymentTotal: 0,
    })).toBe(1_500);
  });

  it('spreads an advance payment over later invoice balances', () => {
    const plan = planHistoricalPaymentAllocations({
      sourceAmount: 7_500,
      sourceMonthKey: '2025-09',
      invoices: [
        { invoiceId: 'sep', monthKey: '2025-09', totalAmount: 1_000, paidAmount: 1_000 },
        { invoiceId: 'oct', monthKey: '2025-10', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'nov', monthKey: '2025-11', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'dec', monthKey: '2025-12', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'jan', monthKey: '2026-01', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'feb', monthKey: '2026-02', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'mar', monthKey: '2026-03', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'apr', monthKey: '2026-04', totalAmount: 1_000, paidAmount: 0 },
      ],
    });

    expect(plan.coveredByExisting).toBe(1_000);
    expect(plan.allocations).toEqual([
      { invoiceId: 'oct', monthKey: '2025-10', amount: 1_000 },
      { invoiceId: 'nov', monthKey: '2025-11', amount: 1_000 },
      { invoiceId: 'dec', monthKey: '2025-12', amount: 1_000 },
      { invoiceId: 'jan', monthKey: '2026-01', amount: 1_000 },
      { invoiceId: 'feb', monthKey: '2026-02', amount: 1_000 },
      { invoiceId: 'mar', monthKey: '2026-03', amount: 1_000 },
      { invoiceId: 'apr', monthKey: '2026-04', amount: 500 },
    ]);
    expect(plan.unallocatedAmount).toBe(0);
  });

  it('does not duplicate a source amount already covered by payments', () => {
    const plan = planHistoricalPaymentAllocations({
      sourceAmount: 1_400,
      sourceMonthKey: '2025-08',
      invoices: [
        { invoiceId: 'aug', monthKey: '2025-08', totalAmount: 2_000, paidAmount: 2_000 },
        { invoiceId: 'sep', monthKey: '2025-09', totalAmount: 2_000, paidAmount: 0 },
      ],
    });

    expect(plan.coveredByExisting).toBe(1_400);
    expect(plan.allocations).toEqual([]);
    expect(plan.unallocatedAmount).toBe(0);
  });

  it('reports the amount that cannot fit in remaining invoices', () => {
    const plan = planHistoricalPaymentAllocations({
      sourceAmount: 3_000,
      sourceMonthKey: '2026-01',
      invoices: [
        { invoiceId: 'jan', monthKey: '2026-01', totalAmount: 1_000, paidAmount: 0 },
        { invoiceId: 'feb', monthKey: '2026-02', totalAmount: 1_000, paidAmount: 500 },
      ],
    });

    expect(plan.allocations).toEqual([
      { invoiceId: 'jan', monthKey: '2026-01', amount: 1_000 },
      { invoiceId: 'feb', monthKey: '2026-02', amount: 500 },
    ]);
    expect(plan.unallocatedAmount).toBe(1_500);
  });
});
