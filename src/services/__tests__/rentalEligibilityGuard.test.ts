import { describe, expect, it } from 'vitest';
import { evaluateRentalEligibility } from '../rentalEligibilityGuard';

const vehicle = (status = 'available') => ({ id: 'vehicle-1', status });
const penalty = (amount: number, payment_status: string | null = 'unpaid') => ({ amount, payment_status });

describe('evaluateRentalEligibility', () => {
  it('blocks a Street 52 seized vehicle', () => {
    const result = evaluateRentalEligibility({ vehicle: vehicle('street_52') });
    expect(result.level).toBe('block');
    expect(result.message).toContain('شارع 52');
    expect(result.canOverrideUnpaidViolations).toBe(false);
    expect(result.hardBlockMessages).toHaveLength(1);
  });

  it('blocks a vehicle held at a police station regardless of penalty amount', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle('police_station'),
      vehiclePenalties: [penalty(1)],
    });
    expect(result.level).toBe('block');
    expect(result.message).toContain('مركز الشرطة');
    expect(result.canOverrideUnpaidViolations).toBe(false);
  });

  it('warns for unpaid vehicle penalties', () => {
    const result = evaluateRentalEligibility({ vehicle: vehicle(), vehiclePenalties: [penalty(100)] });
    expect(result.level).toBe('warn');
    expect(result.vehiclePenalties).toEqual({ count: 1, total: 100 });
    expect(result.canOverrideUnpaidViolations).toBe(true);
    expect(result.violationMessages[0]).toContain('على المركبة');
  });

  it.each([
    [1, 500],
    [3, 25],
    [17, 300],
  ])('permits rental with a warning for %i vehicle penalties of %i QAR', (count, amount) => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      vehiclePenalties: Array.from({ length: count }, () => penalty(amount)),
    });
    expect(result.level).toBe('warn');
    expect(result.vehiclePenalties).toEqual({ count, total: count * amount });
    expect(result.message).not.toContain('لا يمكن');
    expect(result.canOverrideUnpaidViolations).toBe(true);
    expect(result.hardBlockMessages).toEqual([]);
  });

  it('blocks unpaid customer penalties and reports count and total', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      customerPenalties: Array.from({ length: 3 }, () => penalty(25)),
    });
    expect(result.level).toBe('block');
    expect(result.message).toContain('3 مخالفة');
    expect(result.customerPenalties.total).toBe(75);
    expect(result.canOverrideUnpaidViolations).toBe(true);
  });

  it('blocks for any unpaid customer penalty below the vehicle thresholds', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      customerPenalties: [penalty(25)],
    });
    expect(result.level).toBe('block');
    expect(result.message).toContain('العميل عليه 1 مخالفة');
    expect(result.customerPenalties.total).toBe(25);
    expect(result.canOverrideUnpaidViolations).toBe(true);
  });

  it('allows an explicit override for the reported vehicle and customer violation totals', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      vehiclePenalties: Array.from({ length: 11 }, (_, index) => penalty(index === 0 ? 700 : 400)),
      customerPenalties: Array.from({ length: 8 }, (_, index) => penalty(index === 0 ? 1_500 : 1_000)),
    });

    expect(result.level).toBe('block');
    expect(result.vehiclePenalties).toEqual({ count: 11, total: 4_700 });
    expect(result.customerPenalties).toEqual({ count: 8, total: 8_500 });
    expect(result.hardBlockMessages).toEqual([]);
    expect(result.canOverrideUnpaidViolations).toBe(true);
  });

  it('allows paid and completed penalties only', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      vehiclePenalties: [penalty(900, 'paid'), penalty(900, 'completed')],
      customerPenalties: [penalty(900, 'PAID')],
    });
    expect(result.level).toBe('allow');
  });

  it('warns, rather than blocks, for municipality status', () => {
    expect(evaluateRentalEligibility({ vehicle: vehicle('municipality') }).level).toBe('warn');
  });

  it('blocks a missing vehicle', () => {
    const result = evaluateRentalEligibility({ vehicle: null });
    expect(result.level).toBe('block');
    expect(result.message).toContain('المركبة غير موجودة');
  });
});
