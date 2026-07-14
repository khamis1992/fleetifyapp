import { describe, expect, it } from 'vitest';
import { calculateRemainingViolationAmount } from '@/hooks/useTrafficViolationPayments';

describe('calculateRemainingViolationAmount', () => {
  it('subtracts completed payments only', () => {
    expect(calculateRemainingViolationAmount(1_000, [
      { amount: 250, status: 'completed' },
      { amount: 100, status: 'pending' },
      { amount: 50, status: 'cancelled' },
    ])).toBe(750);
  });

  it('never returns a negative remaining amount', () => {
    expect(calculateRemainingViolationAmount(500, [
      { amount: 700, status: 'completed' },
    ])).toBe(0);
  });

  it('ignores negative payment amounts', () => {
    expect(calculateRemainingViolationAmount(500, [
      { amount: -100, status: 'completed' },
    ])).toBe(500);
  });
});
