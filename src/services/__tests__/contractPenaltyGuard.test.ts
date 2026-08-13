import { describe, expect, it } from 'vitest';
import { evaluateContractClosePenalties } from '../contractPenaltyGuard';

describe('evaluateContractClosePenalties', () => {
  it('blocks close and reports unpaid count and total', () => {
    const result = evaluateContractClosePenalties([
      { amount: 200, payment_status: 'unpaid' },
      { amount: 350, payment_status: null },
      { amount: 900, payment_status: 'paid' },
    ]);
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(2);
    expect(result.total).toBe(550);
    expect(result.message).toContain('2 مخالفة');
    expect(result.message).toContain('إجمالي');
  });

  it('allows close when all penalties are paid or completed', () => {
    expect(evaluateContractClosePenalties([
      { amount: 200, payment_status: 'paid' },
      { amount: 350, payment_status: 'completed' },
    ])).toMatchObject({ allowed: true, count: 0, total: 0 });
  });

  it('allows a penalty that was explicitly handled', () => {
    expect(evaluateContractClosePenalties([
      { amount: 200, payment_status: 'unpaid', status: 'transferred' },
    ])).toMatchObject({ allowed: true, count: 0, total: 0 });
  });
});
