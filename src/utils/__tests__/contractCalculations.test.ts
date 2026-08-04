import { describe, expect, it } from 'vitest';
import {
  calculateCanonicalBillingMonths,
  calculateCanonicalRenewalEndDate,
  calculateContractMonths,
  calculateContractTotalAmount,
} from '@/utils/contractCalculations';

describe('canonical contract billing month calculations', () => {
  it('uses one billing month for a 31-day contract spanning adjacent months', () => {
    expect(calculateCanonicalBillingMonths('2026-08-01', '2026-09-01')).toBe(1);
    expect(calculateContractTotalAmount({
      start_date: '2026-08-01',
      end_date: '2026-09-01',
      monthly_amount: 3_000,
    })).toBe(3_000);
  });

  it('uses twelve billing months for a 365-day contract', () => {
    expect(calculateCanonicalBillingMonths('2026-08-01', '2027-08-01')).toBe(12);
    expect(calculateContractMonths({
      start_date: '2026-08-01',
      end_date: '2027-08-01',
    })).toBe(12);
  });

  it('keeps a same-month contract billable and rejects reversed dates', () => {
    expect(calculateCanonicalBillingMonths('2026-08-03', '2026-08-31')).toBe(1);
    expect(calculateCanonicalBillingMonths('2026-09-01', '2026-08-31')).toBe(0);
  });

  it('keeps first-of-month and leap-year renewals on the same billing convention', () => {
    expect(calculateCanonicalRenewalEndDate('2026-08-01', '2027-08-01'))
      .toBe('2028-08-02');
    expect(calculateCanonicalRenewalEndDate('2023-02-28', '2024-02-29'))
      .toBe('2025-03-01');
    expect(calculateCanonicalBillingMonths('2027-08-02', '2028-08-02')).toBe(12);
    expect(calculateCanonicalBillingMonths('2024-03-01', '2025-03-01')).toBe(12);
  });
});
