import { describe, expect, it } from 'vitest';
import {
  deriveContractPageFinancials,
  mentionsContractNumber,
} from '@/utils/contractPageFinancials';

const ltoContract = {
  monthly_amount: 1_500,
  start_date: '2024-08-15',
  end_date: '2027-08-15',
  contract_amount: 55_500,
  total_paid: 0,
  balance_due: 55_500,
};

describe('deriveContractPageFinancials', () => {
  it('does not treat a contract with no invoices as fully collected', () => {
    const result = deriveContractPageFinancials({
      contract: ltoContract,
      invoices: [],
      payments: [],
    });

    expect(result.totalAmount).toBe(54_000);
    expect(result.paidAmount).toBe(0);
    expect(result.balanceDue).toBe(54_000);
    expect(result.outstandingInvoiceTotal).toBe(54_000);
    expect(result.collectionProgress).toBe(0);
    expect(result.paymentStatus).toBe('pending');
    expect(result.paidPayments).toBe(0);
    expect(result.totalPayments).toBe(36);
  });

  it('uses completed payments when invoices are missing', () => {
    const result = deriveContractPageFinancials({
      contract: ltoContract,
      invoices: [],
      payments: [
        { amount: 1_250, payment_status: 'completed' },
        { amount: 1_250, payment_status: 'completed' },
        { amount: 500, payment_status: 'cancelled' },
      ],
    });

    expect(result.paidAmount).toBe(2_500);
    expect(result.balanceDue).toBe(51_500);
    expect(result.outstandingInvoiceTotal).toBe(51_500);
    expect(result.collectionProgress).toBe(5);
    expect(result.paymentStatus).toBe('pending');
    expect(result.paidPayments).toBe(2);
  });

  it('uses open invoice balances instead of elapsed months when invoices exist', () => {
    const result = deriveContractPageFinancials({
      contract: ltoContract,
      invoices: [
        {
          total_amount: 1_500,
          paid_amount: 1_500,
          balance_due: 0,
          status: 'paid',
          payment_status: 'paid',
          due_date: '2024-09-01',
        },
        {
          total_amount: 1_500,
          paid_amount: 0,
          balance_due: 1_500,
          status: 'overdue',
          payment_status: 'unpaid',
          due_date: '2024-10-01',
        },
      ],
      payments: [{ amount: 1_500, payment_status: 'completed' }],
    });

    expect(result.totalAmount).toBe(3_000);
    expect(result.paidAmount).toBe(1_500);
    expect(result.balanceDue).toBe(1_500);
    expect(result.outstandingInvoiceTotal).toBe(1_500);
    expect(result.dueInvoiceTotal).toBe(1_500);
    expect(result.paidPayments).toBe(1);
    expect(result.totalPayments).toBe(2);
    expect(result.paymentStatus).toBe('pending');
    expect(result.collectionProgress).toBe(50);
  });
});

describe('mentionsContractNumber', () => {
  it('matches migrated payment notes that mention the contract number', () => {
    expect(mentionsContractNumber('ترحيل من الاتفاقية القديمة: LTO2024276', 'LTO2024276')).toBe(true);
    expect(mentionsContractNumber('ترحيل من الاتفاقية القديمة: LTO2024281', 'LTO2024276')).toBe(false);
    expect(mentionsContractNumber(null, 'LTO2024276')).toBe(false);
  });
});
