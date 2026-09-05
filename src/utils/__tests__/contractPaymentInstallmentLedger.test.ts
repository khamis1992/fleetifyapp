import { describe, expect, it } from 'vitest';
import { buildContractInstallmentLedger } from '@/utils/contractPaymentInstallmentLedger';

const invoice = (overrides: Record<string, unknown> = {}) => ({
  id: 'invoice-rent',
  invoice_number: 'INV-CONTRACT-2026-08',
  invoice_month: '2026-08-01',
  invoice_date: '2026-08-01',
  due_date: '2026-08-01',
  total_amount: 1_600,
  paid_amount: 1_600,
  balance_due: 0,
  status: 'paid',
  payment_status: 'paid',
  invoice_type: 'sales',
  penalty_id: null,
  ...overrides,
});

const payment = (id: string, date: string, amount: number, invoiceId: string | null = null) => ({
  id,
  amount,
  payment_date: date,
  payment_status: 'completed',
  payment_method: 'cash',
  payment_number: `REC-${id}`,
  reference_number: null,
  notes: null,
  invoice_id: invoiceId,
});

describe('buildContractInstallmentLedger', () => {
  it.each(['payment', 'refund', 'transfer'])('does not count a completed %s as collected rent', (transaction_type) => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ total_amount: 1500, paid_amount: 0 })],
      payments: [{ ...payment('out', '2026-08-05', 500, 'invoice-rent'), transaction_type }],
      allocations: [{ id: 'a', payment_id: 'out', target_id: 'invoice-rent', allocation_type: 'invoice', amount: 500, is_active: true }],
    });
    expect(result.rentGroups[0]).toMatchObject({ paidAmount: 0, remainingAmount: 1500, receiptCount: 0 });
    expect(result.unmatchedPayments).toEqual([]);
  });
  it('retains a successful payment for review when only inactive allocation history remains', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ paid_amount: 0 })], payments: [payment('1', '2026-08-05', 500)],
      allocations: [{ id: 'a', payment_id: '1', target_id: 'invoice-rent', allocation_type: 'invoice', amount: 500, is_active: false }],
    });
    expect(result.unmatchedPayments.map((row) => row.id)).toEqual(['1']);
  });

  it('does not describe a payment on a cancelled invoice as an effective installment receipt', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ status: 'cancelled' })], payments: [payment('1', '2026-08-05', 1600, 'invoice-rent')], allocations: [],
    });
    expect(result.rentGroups[0]).toMatchObject({ paidAmount: 0, remainingAmount: 0, receiptCount: 0, status: 'cancelled' });
    expect(result.rentGroups[0].contributions[0].isActive).toBe(false);
    expect(result.unmatchedPayments).toHaveLength(1);
  });

  it('uses the unpaid invoice due date, not the oldest settled invoice, for lateness', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ id: 'a', total_amount: 500, paid_amount: 500, due_date: '2026-08-01' }),
        invoice({ id: 'b', total_amount: 500, paid_amount: 0, due_date: '2026-08-20' })],
      payments: [payment('1', '2026-08-05', 500, 'a')], allocations: [], today: '2026-08-15',
    });
    expect(result.rentGroups[0]).toMatchObject({ dueDate: '2026-08-20', isOverdue: false, remainingAmount: 500 });
  });
  it('does not restore a cancelled payment from the cached invoice paid amount', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ total_amount: 1500, paid_amount: 1000 })],
      payments: [payment('ok', '2026-08-05', 500, 'invoice-rent'),
        { ...payment('void', '2026-08-06', 500, 'invoice-rent'), payment_status: 'cancelled' }],
      allocations: [],
    });
    expect(result.rentGroups[0]).toMatchObject({ paidAmount: 500, remainingAmount: 1000, status: 'review' });
  });

  it.each(['fee', 'contract', 'invoice'])('does not count gross through a stale invoice link when allocated to another %s target', (type) => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ paid_amount: 0 })],
      payments: [payment('1', '2026-08-05', 500, 'invoice-rent')],
      allocations: [{ id: 'a', payment_id: '1', target_id: 'other', allocation_type: type, amount: 500, is_active: true }],
    });
    expect(result.rentGroups[0].paidAmount).toBe(0);
  });

  it('uses the legacy direct link when all allocation history is inactive', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ paid_amount: 500 })],
      payments: [payment('1', '2026-08-05', 500, 'invoice-rent')],
      allocations: [{ id: 'a', payment_id: '1', target_id: 'invoice-rent', allocation_type: 'invoice', amount: 500, is_active: false }],
    });
    expect(result.rentGroups[0].paidAmount).toBe(500);
    expect(result.rentGroups[0].receiptCount).toBe(1);
  });

  it('does not offset another invoice with an overpayment in the same month', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ id: 'a', total_amount: 500, paid_amount: 1000 }), invoice({ id: 'b', total_amount: 500, paid_amount: 0 })],
      payments: [payment('1', '2026-08-05', 1000, 'a')], allocations: [],
    });
    expect(result.rentGroups[0]).toMatchObject({ totalAmount: 1000, paidAmount: 1000, remainingAmount: 500, status: 'partial' });
  });

  it('does not call an installment paid when fifty dirhams remain', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ paid_amount: 1599.5 })],
      payments: [payment('1', '2026-08-05', 1599.5, 'invoice-rent')], allocations: [],
    });
    expect(result.rentGroups[0]).toMatchObject({ remainingAmount: 0.5, status: 'partial' });
  });

  it.each(['completed', 'paid', 'success', 'succeeded'])('recognizes canonical successful payment state %s', (status) => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice()], payments: [{ ...payment('1', '2026-08-05', 1600, 'invoice-rent'), payment_status: status }], allocations: [],
    });
    expect(result.rentGroups[0]).toMatchObject({ tracedPaidAmount: 1600, status: 'paid', receiptCount: 1 });
  });

  it('flags per-invoice cache disagreement even when differences cancel at month level', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ id: 'a', total_amount: 500, paid_amount: 500 }), invoice({ id: 'b', total_amount: 500, paid_amount: 0 })],
      payments: [payment('1', '2026-08-05', 500, 'b')], allocations: [],
    });
    expect(result.rentGroups[0].status).toBe('review');
  });
  it('groups receipts paid on different dates under the same monthly installment', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice()],
      payments: [payment('1', '2026-08-05', 600), payment('2', '2026-08-21', 1_000)],
      allocations: [
        { id: 'a1', payment_id: '1', target_id: 'invoice-rent', allocation_type: 'invoice', amount: 600, is_active: true },
        { id: 'a2', payment_id: '2', target_id: 'invoice-rent', allocation_type: 'invoice', amount: 1_000, is_active: true },
      ],
      today: '2026-09-01',
    });

    expect(result.rentGroups).toHaveLength(1);
    expect(result.rentGroups[0]).toMatchObject({
      label: 'فاتورة شهر 8/2026',
      totalAmount: 1_600,
      paidAmount: 1_600,
      remainingAmount: 0,
      receiptCount: 2,
      status: 'paid',
    });
    expect(result.rentGroups[0].contributions.map((item) => item.payment.id)).toEqual(['2', '1']);
  });

  it('groups duplicate rental invoices for one month but keeps a traffic charge separate', () => {
    const result = buildContractInstallmentLedger({
      invoices: [
        invoice({ id: 'rent-1', total_amount: 800, paid_amount: 800 }),
        invoice({ id: 'rent-2', invoice_number: 'INV-DUPLICATE', total_amount: 800, paid_amount: 800 }),
        invoice({
          id: 'traffic-1',
          invoice_number: 'TV-123',
          invoice_type: 'service',
          penalty_id: 'penalty-1',
          total_amount: 300,
          paid_amount: 300,
        }),
      ],
      payments: [],
      allocations: [],
      today: '2026-09-01',
    });

    expect(result.rentGroups).toHaveLength(1);
    expect(result.rentGroups[0].invoices).toHaveLength(2);
    expect(result.rentGroups[0].totalAmount).toBe(1_600);
    expect(result.chargeGroups).toHaveLength(1);
    expect(result.chargeGroups[0].label).toBe('فاتورة مخالفة مرورية');
  });

  it('does not double count invoice_id when an allocation exists', () => {
    const linkedPayment = payment('1', '2026-08-05', 1_600, 'invoice-rent');
    const result = buildContractInstallmentLedger({
      invoices: [invoice()],
      payments: [linkedPayment],
      allocations: [
        { id: 'a1', payment_id: '1', target_id: 'invoice-rent', allocation_type: 'invoice', amount: 1_600, is_active: true },
      ],
      today: '2026-09-01',
    });

    expect(result.rentGroups[0].contributions).toHaveLength(1);
    expect(result.rentGroups[0].tracedPaidAmount).toBe(1_600);
  });

  it('keeps payments without an invoice target in a separate review list', () => {
    const result = buildContractInstallmentLedger({
      invoices: [invoice({ paid_amount: 0, balance_due: 1_600, status: 'overdue', payment_status: 'unpaid' })],
      payments: [payment('unmatched', '2026-08-05', 500)],
      allocations: [
        { id: 'contract-a1', payment_id: 'unmatched', target_id: 'contract-id', allocation_type: 'contract', amount: 500, is_active: true },
      ],
      today: '2026-09-01',
    });

    expect(result.unmatchedPayments.map((item) => item.id)).toEqual(['unmatched']);
    expect(result.rentGroups[0].paidAmount).toBe(0);
  });
});
