import { describe, expect, it } from 'vitest';
import {
  evaluateRentalEligibility,
  UNPAID_PENALTY_BLOCK_AMOUNT_QAR,
  UNPAID_PENALTY_BLOCK_COUNT,
} from '../rentalEligibilityGuard';

const vehicle = (status = 'available') => ({ id: 'vehicle-1', status });
const penalty = (amount: number, payment_status: string | null = 'unpaid') => ({ amount, payment_status });

describe('evaluateRentalEligibility', () => {
  it('blocks a Street 52 seized vehicle', () => {
    const result = evaluateRentalEligibility({ vehicle: vehicle('street_52') });
    expect(result.level).toBe('block');
    expect(result.message).toContain('شارع 52');
  });

  it('blocks a vehicle held at a police station regardless of penalty amount', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle('police_station'),
      vehiclePenalties: [penalty(1)],
    });
    expect(result.level).toBe('block');
    expect(result.message).toContain('مركز الشرطة');
  });

  it('warns for unpaid vehicle penalties below both thresholds', () => {
    const result = evaluateRentalEligibility({ vehicle: vehicle(), vehiclePenalties: [penalty(100)] });
    expect(result.level).toBe('warn');
    expect(result.vehiclePenalties).toEqual({ count: 1, total: 100 });
  });

  it('blocks when unpaid vehicle amount reaches the threshold', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      vehiclePenalties: [penalty(UNPAID_PENALTY_BLOCK_AMOUNT_QAR)],
    });
    expect(result.level).toBe('block');
  });

  it('blocks when unpaid customer count reaches the threshold and reports count and total', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      customerPenalties: Array.from({ length: UNPAID_PENALTY_BLOCK_COUNT }, () => penalty(25)),
    });
    expect(result.level).toBe('block');
    expect(result.message).toContain('3 مخالفة');
    expect(result.customerPenalties.total).toBe(75);
  });

  it('blocks for any unpaid customer penalty below the vehicle thresholds', () => {
    const result = evaluateRentalEligibility({
      vehicle: vehicle(),
      customerPenalties: [penalty(25)],
    });
    expect(result.level).toBe('block');
    expect(result.message).toContain('العميل عليه 1 مخالفة');
    expect(result.customerPenalties.total).toBe(25);
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
