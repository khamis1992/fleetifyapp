import { describe, expect, it } from 'vitest';
import { calculateInvoiceTotalsAfterPaymentReversal } from '@/utils/invoiceHelpers';

describe('calculateInvoiceTotalsAfterPaymentReversal', () => {
  it('sets unpaid when paid becomes 0', () => {
    const result = calculateInvoiceTotalsAfterPaymentReversal({
      totalAmount: 100,
      currentPaidAmount: 50,
      reversedAmount: 50,
    });

    expect(result).toEqual({
      paidAmount: 0,
      balanceDue: 100,
      paymentStatus: 'unpaid',
    });
  });

  it('sets partial when some paid remains', () => {
    const result = calculateInvoiceTotalsAfterPaymentReversal({
      totalAmount: 100,
      currentPaidAmount: 80,
      reversedAmount: 30,
    });

    expect(result.paidAmount).toBe(50);
    expect(result.balanceDue).toBe(50);
    expect(result.paymentStatus).toBe('partial');
  });

  it('keeps paid when paid still covers total', () => {
    const result = calculateInvoiceTotalsAfterPaymentReversal({
      totalAmount: 100,
      currentPaidAmount: 150,
      reversedAmount: 20,
    });

    expect(result.paymentStatus).toBe('paid');
    expect(result.balanceDue).toBe(0);
  });
});

