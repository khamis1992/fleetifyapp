import { describe, expect, it } from 'vitest';
import type { Invoice } from '@/types/finance.types';
import {
  buildContractFinancialSnapshotV3,
  buildFinancialDiagnosisV3,
  calculateContractHealthScoreV3,
  type ContractFinancialPaymentV3,
  type PaymentScheduleLikeV3,
} from '../tokens';

const schedule = (
  dueDate: string,
  overrides: Partial<PaymentScheduleLikeV3> = {},
): PaymentScheduleLikeV3 => ({
  status: 'pending',
  due_date: dueDate,
  amount: 1_500,
  paid_amount: 0,
  invoice_id: null,
  ...overrides,
});

const invoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'invoice-1',
  invoice_number: 'INV-1',
  invoice_date: '2026-01-01',
  due_date: '2026-01-01',
  invoice_month: '2026-01-01',
  total_amount: 1_500,
  paid_amount: 0,
  balance_due: 1_500,
  status: 'sent',
  payment_status: 'unpaid',
  ...overrides,
} as Invoice);

const payment = (
  overrides: Partial<ContractFinancialPaymentV3> = {},
): ContractFinancialPaymentV3 => ({
  id: 'payment-1',
  amount: 500,
  payment_date: '2026-01-02',
  payment_status: 'completed',
  payment_method: 'cash',
  invoice_id: null,
  contract_id: 'contract-1',
  financial_applications: [{ invoice_id: null, amount: Number(overrides.amount ?? 500) }],
  ...overrides,
});

describe('contract details financial snapshot', () => {
  it('flags earlier schedules without adding them to the in-period financial totals', () => {
    const result = buildContractFinancialSnapshotV3([], [], [
      schedule('2025-12-01'),
      schedule('2026-02-01'),
      schedule('2026-03-01'),
    ], {
      contract_amount: 3_000,
      monthly_amount: 1_500,
      total_paid: 0,
      start_date: '2026-01-01',
      end_date: '2026-03-01',
    });
    expect(result.outOfPeriodSchedulesCount).toBe(1);
    expect(result.activeSchedules.map((row) => row.due_date)).toEqual(['2026-02-01', '2026-03-01']);
    expect(result.totalSchedulesCount).toBe(2);
    expect(result.contractTotal).toBe(3_000);
    expect(result.remainingTotal).toBe(3_000);
    expect(result.scheduleReviewNeeded).toBe(true);
  });

  it('does not report a contract as paid or matched when schedules have no invoices', () => {
    const schedules = Array.from({ length: 37 }, (_, index) =>
      schedule(new Date(Date.UTC(2024, 8 + index, 1)).toISOString().slice(0, 10)),
    );

    const result = buildContractFinancialSnapshotV3([], [], schedules, {
      contract_amount: 55_500,
      monthly_amount: 1_500,
      total_paid: 0,
      start_date: '2024-08-15',
      end_date: '2027-08-15',
    });

    expect(result.contractTotal).toBe(55_500);
    expect(result.paidTotal).toBe(0);
    expect(result.remainingTotal).toBe(55_500);
    expect(result.paidSchedulesCount).toBe(0);
    expect(result.totalSchedulesCount).toBe(36);
    expect(result.outOfPeriodSchedulesCount).toBe(1);
    expect(result.missingInvoiceMonthsCount).toBe(36);
    expect(result.hasFinancialCoverage).toBe(false);
    expect(result.scheduleMismatch).toBe(true);
    expect(result.scheduleReviewNeeded).toBe(true);
    expect(calculateContractHealthScoreV3({
      snapshot: result,
      daysRemaining: 345,
      violationsCount: 0,
      contractStatus: 'under_legal_procedure',
    }).score).toBe(20);
  });

  it('uses active payment rows instead of a stale stored contract total', () => {
    const result = buildContractFinancialSnapshotV3(
      [invoice({ paid_amount: 900, balance_due: 600 })],
      [payment({ amount: 500 }), payment({ id: 'cancelled', amount: 400, payment_status: 'cancelled' })],
      [schedule('2026-01-01', { paid_amount: 500, invoice_id: 'invoice-1' })],
      {
        contract_amount: 1_500,
        monthly_amount: 1_500,
        total_paid: 1_500,
        start_date: '2025-12-15',
        end_date: '2026-01-31',
      },
    );

    expect(result.paidSource).toBe('payments');
    expect(result.activePaymentsTotal).toBe(500);
    expect(result.paidTotal).toBe(500);
    expect(result.remainingTotal).toBe(1_000);
  });

  it('does not trust a fully paid schedule cache without payment evidence', () => {
    const result = buildContractFinancialSnapshotV3(
      [invoice({ paid_amount: 1_500, balance_due: 0, payment_status: 'paid' })],
      [],
      [schedule('2026-01-01', { paid_amount: 1_500, invoice_id: 'invoice-1' })],
      {
        contract_amount: 1_500,
        monthly_amount: 1_500,
        total_paid: 0,
        start_date: '2025-12-15',
        end_date: '2026-01-31',
      },
    );

    expect(result.paidSource).toBe('payments');
    expect(result.paidTotal).toBe(0);
    expect(result.remainingTotal).toBe(1_500);
    expect(result.financialReviewRequired).toBe(true);
    expect(result.paidSchedulesCount).toBe(0);
    expect(result.hasFinancialCoverage).toBe(true);
  });

  it('does not count a payment linked to an invoice outside the contract billing window', () => {
    const result = buildContractFinancialSnapshotV3(
      [
        invoice({ id: 'active-invoice', invoice_month: '2026-01-01', due_date: '2026-01-01' }),
        invoice({ id: 'outside-invoice', invoice_month: '2026-02-01', due_date: '2026-02-01' }),
      ],
      [
        payment({ id: 'direct-payment', amount: 200, invoice_id: null }),
        payment({ id: 'outside-payment', amount: 900, invoice_id: 'outside-invoice', financial_applications: [{ invoice_id: 'outside-invoice', amount: 900 }] }),
      ],
      [schedule('2026-01-01', { invoice_id: 'active-invoice' })],
      {
        contract_amount: 1_500,
        monthly_amount: 1_500,
        total_paid: 1_100,
        start_date: '2025-12-15',
        end_date: '2026-01-31',
      },
    );

    expect(result.activePaymentsTotal).toBe(200);
    expect(result.paidTotal).toBe(200);
    expect(result.excludedPaymentsCount).toBe(1);
    expect(result.scheduleReviewNeeded).toBe(true);
  });

  it.each(['pending', 'processing', 'failed', 'cancelled', 'reversed', 'unknown'])('does not count %s as a successful receipt', (status) => {
    const result = buildContractFinancialSnapshotV3([], [payment({ payment_status: status })], []);
    expect(result.paidTotal).toBe(0);
  });

  it('counts this contract application, not fees or another contract included in the gross receipt', () => {
    const result = buildContractFinancialSnapshotV3([invoice()], [payment({ amount: 1000,
      invoice_id: 'stale-other-invoice', financial_applications: [{ invoice_id: 'invoice-1', amount: 500 }] })], []);
    expect(result.paidTotal).toBe(500);
    expect(result.activePaymentsTotal).toBe(500);
  });

  it('does not fall back to cached paid totals when the last payment is cancelled', () => {
    const result = buildContractFinancialSnapshotV3([invoice({ paid_amount: 1500 })], [payment({ payment_status: 'cancelled' })], []);
    expect(result.paidTotal).toBe(0);
    expect(result.financialReviewRequired).toBe(true);
  });

  it('reopens the original invoice balance in the read model after the last receipt is cancelled', () => {
    const original = invoice({ paid_amount: 1500, balance_due: 0, payment_status: 'paid', status: 'paid' });
    const result = buildContractFinancialSnapshotV3([original], [payment({ payment_status: 'cancelled' })], []);
    expect(result.outstandingTotal).toBe(1500);
    expect(result.dueNowTotal).toBe(1500);
    expect(result.openInvoicesCount).toBe(1);
    expect(original.balance_due).toBe(0); // No persisted/source row mutation.
  });

  it('retains a single dirham as collectible even when the cached status says paid', () => {
    const result = buildContractFinancialSnapshotV3([invoice({ paid_amount: 1499.99, balance_due: 0.01, payment_status: 'paid' })],
      [payment({ amount: 1499.99, financial_applications: [{ invoice_id: 'invoice-1', amount: 1499.99 }] })], []);
    expect(result.outstandingTotal).toBe(0.01);
    expect(result.openInvoicesCount).toBe(1);
  });

  it('flags a stale balance even when cached paid agrees with allocations', () => {
    const result = buildContractFinancialSnapshotV3([invoice({ paid_amount: 500, balance_due: 0 })],
      [payment({ financial_applications: [{ invoice_id: 'invoice-1', amount: 500 }] })], [], { contract_amount: 1500, total_paid: 500 });
    expect(result.financialReviewRequired).toBe(true);
    expect(result.outstandingTotal).toBe(1000);
  });

  it('does not net an overpaid invoice against another invoice outstanding in the same month', () => {
    const result = buildContractFinancialSnapshotV3([invoice({ id: 'a', total_amount: 500 }), invoice({ id: 'b', total_amount: 500 })],
      [payment({ amount: 700, financial_applications: [{ invoice_id: 'a', amount: 700 }] })], []);
    expect(result.outstandingTotal).toBe(500);
    expect(result.collectibleInvoices.map((row) => row.id)).toEqual(['b']);
  });

  it('the diagnosis uses the same reconstructed balance as the financial snapshot', () => {
    const diagnosis = buildFinancialDiagnosisV3({
      contract: { contract_amount: 1500, balance_due: 1500 } as never,
      invoices: [invoice({ paid_amount: 1500, balance_due: 0, payment_status: 'paid' })],
      payments: [], paymentSchedules: [], formatCurrency: String,
    });
    expect(diagnosis.outstandingTotal).toBe(1500);
    expect(diagnosis.openInvoicesCount).toBe(1);
  });

  it('does not treat a payment without attribution evidence as gross contract settlement', () => {
    const result = buildContractFinancialSnapshotV3([], [payment({ financial_applications: undefined })], []);
    expect(result.paidTotal).toBe(0);
    expect(result.financialReviewRequired).toBe(true);
  });

  it('does not retain a paid installment count after the linked receipt is cancelled', () => {
    const result = buildContractFinancialSnapshotV3([invoice({ paid_amount: 1500, balance_due: 0 })],
      [payment({ payment_status: 'cancelled' })], [schedule('2026-01-01', { paid_amount: 1500, status: 'paid', invoice_id: 'invoice-1' })]);
    expect(result.paidSchedulesCount).toBe(0);
    expect(result.nextSchedule?.paid_amount).toBe(0);
    expect(result.unpaidSchedulesTotal).toBe(1500);
  });

  it('uses remaining installment money, not full installment value, for unpaid totals', () => {
    const result = buildContractFinancialSnapshotV3([invoice()],
      [payment({ financial_applications: [{ invoice_id: 'invoice-1', amount: 500 }] })],
      [schedule('2026-01-01', { invoice_id: 'invoice-1' })]);
    expect(result.unpaidSchedulesTotal).toBe(1000);
  });

  it('does not hide duplicate-month or undated schedule evidence', () => {
    const result = buildContractFinancialSnapshotV3([invoice()], [], [
      schedule('2026-01-01', { id: 'a', invoice_id: 'invoice-1' }),
      schedule('2026-01-01', { id: 'b', invoice_id: 'invoice-1' }),
      schedule('2026-02-01', { id: 'c', due_date: null }),
    ]);
    expect(result.activeSchedules).toHaveLength(3);
    expect(result.activeSchedules.every((row) => row.status === 'review')).toBe(true);
    expect(result.financialReviewRequired).toBe(true);
    expect(result.nextSchedule).toBeUndefined();
  });

  it('does not label contract health good while financial reconciliation is pending', () => {
    const result = buildContractFinancialSnapshotV3([], [], [], { contract_amount: 1500, total_paid: 0 });
    const optimistic = { ...result, remainingTotal: 0, hasFinancialCoverage: true, scheduleReviewNeeded: false, financialReviewRequired: true };
    const health = calculateContractHealthScoreV3({ snapshot: optimistic, daysRemaining: 100, violationsCount: 0, contractStatus: 'active' });
    expect(health.score).toBe(79);
    expect(health.tone).not.toBe('good');
  });

  it('includes ambiguous installment settlement in the financial diagnosis', () => {
    const diagnosis = buildFinancialDiagnosisV3({ contract: { contract_amount: 1500, balance_due: 1500 } as never,
      invoices: [invoice()], payments: [], paymentSchedules: [schedule('2026-01-01')], formatCurrency: String });
    expect(diagnosis.issues.some((issue) => issue.title === 'حالة تحصيل القسط تحتاج مطابقة')).toBe(true);
    expect(diagnosis.tone).not.toBe('ok');
  });

  it('uses invoice applications in the diagnostic instead of a stale direct invoice link', () => {
    const diagnosis = buildFinancialDiagnosisV3({
      contract: { balance_due: 1000, start_date: '2025-12-01', end_date: '2026-01-31', contract_amount: 1500, monthly_amount: 1500 } as never,
      invoices: [invoice({ paid_amount: 500, balance_due: 1000 })], paymentSchedules: [], formatCurrency: String,
      payments: [payment({ amount: 1000, invoice_id: 'other', financial_applications: [{ invoice_id: 'invoice-1', amount: 500 }] })],
    });
    expect(diagnosis.issues.some((issue) => issue.title.includes('paid_amount'))).toBe(false);
  });
});
