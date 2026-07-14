import { describe, expect, it } from 'vitest';
import {
  buildPaymentIdempotencyKey,
  matchesPaymentMonth,
  matchesStatusFilter,
  type ActiveContract,
} from '../PaymentRegistration';

const contract: ActiveContract = {
  contractId: 'contract-1',
  contractNumber: 'C-001',
  customerId: 'customer-1',
  customerName: 'Test Customer',
  phone: '50000000',
  vehicleNumber: '123456',
  color: 'white',
  monthlyPayment: 1_000,
  amountPaid: 400,
  remainingAmount: 600,
  daysOverdue: 5,
  lateFeeAmount: 600,
  notes: 'partial payment',
  status: 'paid',
  paymentMonth: '2026-07',
  paymentMethod: 'cash',
};

describe('payment registration helpers', () => {
  it('classifies confirmed partial and late payments without treating them as completed', () => {
    expect(matchesStatusFilter(contract, 'partial')).toBe(true);
    expect(matchesStatusFilter(contract, 'partial_late')).toBe(true);
    expect(matchesStatusFilter(contract, 'late')).toBe(true);
    expect(matchesStatusFilter(contract, 'completed')).toBe(false);
  });

  it('matches a month selector against YYYY-MM payment values', () => {
    expect(matchesPaymentMonth('2026-07', '07')).toBe(true);
    expect(matchesPaymentMonth('2026-07', '06')).toBe(false);
    expect(matchesPaymentMonth('2026-07', 'all')).toBe(true);
  });

  it('builds a stable retry key that changes with the financial payload', () => {
    const first = buildPaymentIdempotencyKey('company-1', contract, '2026-07-13');
    const retry = buildPaymentIdempotencyKey('company-1', { ...contract }, '2026-07-13');
    const changedAmount = buildPaymentIdempotencyKey(
      'company-1',
      { ...contract, amountPaid: 500 },
      '2026-07-13'
    );

    expect(retry).toBe(first);
    expect(changedAmount).not.toBe(first);
  });
});
