import { describe, expect, it } from 'vitest';
import { evaluateContractClosePenalties } from '../contractPenaltyGuard';

describe('evaluateContractClosePenalties', () => {
  it('allows close while reporting the customer liability retained', () => {
    const result = evaluateContractClosePenalties([
      { amount: 200, payment_status: 'unpaid' },
      { amount: 350, payment_status: null },
      { amount: 900, payment_status: 'paid' },
    ]);
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(2);
    expect(result.total).toBe(550);
    expect(result.message).toContain('2 مخالفة');
    expect(result.message).toContain('إجمالي');
    expect(result.message).toContain('على مسؤولية العميل');
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
