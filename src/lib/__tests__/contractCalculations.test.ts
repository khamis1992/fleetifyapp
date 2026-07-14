import { beforeEach, describe, expect, it } from 'vitest';
import {
  calculateEnhancedPayment,
  clearCalculationCache,
  type Contract,
} from '@/lib/contract-calculations';

const contract: Contract = {
  id: 'contract-id',
  agreement_number: 'AGR-1',
  monthly_rate: 1_000,
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  currency: 'QAR',
  billing_frequency: 'monthly',
  pricing_model: 'fixed',
  financial_terms: {
    deposit_amount: 0,
    insurance_fees: 100,
    service_fees: 50,
    tax_rate: 0,
    late_fee_rate: 0,
    early_termination_rate: 0,
  },
};

describe('calculateEnhancedPayment contract date validation', () => {
  beforeEach(() => {
    clearCalculationCache();
  });

  it('calculates a valid fixed-price contract', () => {
    const result = calculateEnhancedPayment(contract);

    expect(result.subtotal).toBe(1_150);
    expect(result.total).toBe(1_150);
    expect(result.currency).toBe('QAR');
  });

  it('rejects an invalid start date before calculating', () => {
    expect(() => calculateEnhancedPayment({
      ...contract,
      id: 'invalid-start',
      start_date: 'not-a-date',
    })).toThrow('Invalid start date');
  });

  it('rejects an invalid end date before calculating', () => {
    expect(() => calculateEnhancedPayment({
      ...contract,
      id: 'invalid-end',
      end_date: 'not-a-date',
    })).toThrow('Invalid end date');
  });

  it('rejects an end date that is not after the start date', () => {
    expect(() => calculateEnhancedPayment({
      ...contract,
      id: 'reversed-dates',
      end_date: contract.start_date,
    })).toThrow('End date must be after start date');
  });
});
