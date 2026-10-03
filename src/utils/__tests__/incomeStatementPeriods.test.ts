import { afterEach, describe, expect, it, vi } from 'vitest';
import { financeToday } from '@/services/financialReporting';
import { buildIncomeStatementComparisonPeriods } from '../incomeStatementPeriods';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
const previousTimezone = process.env.TZ;
afterEach(() => {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
});

describe('income comparison calendar months in Qatar', () => {
  it('keeps the first day of September and caps the active month on Qatar September 1', () => {
    process.env.TZ = 'Asia/Qatar';
    const cutoff = financeToday(new Date('2026-08-31T21:01:00Z'));
    expect(cutoff).toBe('2026-09-01');
    const months = buildIncomeStatementComparisonPeriods(cutoff);
    expect(months).toHaveLength(6);
    expect(months[5]).toMatchObject({ startDate: '2026-09-01', endDate: '2026-09-01' });
    expect(months[4]).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-31' });
  });
  it('does not move August month boundaries to July31 in a positive UTC timezone', () => {
    process.env.TZ = 'Asia/Qatar';
    const months = buildIncomeStatementComparisonPeriods('2026-08-31');
    expect(months[5]).toMatchObject({ startDate: '2026-08-01', endDate: '2026-08-31' });
    expect(months[0]).toMatchObject({ startDate: '2026-03-01', endDate: '2026-03-31' });
  });
  it('supports leap-year and year transitions and rejects a malformed cutoff', () => {
    const months = buildIncomeStatementComparisonPeriods('2024-03-01');
    expect(months[4]).toMatchObject({ startDate: '2024-02-01', endDate: '2024-02-29' });
    expect(months[2]).toMatchObject({ startDate: '2023-12-01', endDate: '2023-12-31' });
    expect(() => buildIncomeStatementComparisonPeriods('2026-02-30')).toThrow('Invalid comparison cutoff');
  });
});
