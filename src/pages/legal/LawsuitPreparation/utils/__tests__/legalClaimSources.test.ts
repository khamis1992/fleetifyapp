import { describe, expect, it } from 'vitest';
import { getQatarBusinessDate, resolveLegalClaimProjection } from '../legalClaimSources';

describe('resolveLegalClaimProjection', () => {
  it('uses the Qatar calendar date at the UTC day boundary', () => {
    expect(getQatarBusinessDate(new Date('2026-08-25T22:30:00.000Z'))).toBe('2026-08-26');
  });

  it('uses due schedules when a legacy contract has no invoices', () => {
    const result = resolveLegalClaimProjection([], [
      { id: 's1', installment_number: 1, due_date: '2026-01-01', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
      { id: 's2', installment_number: 2, due_date: '2026-02-01', amount: 1500, paid_amount: 500, invoice_id: null, status: 'overdue' },
      { id: 's3', installment_number: 3, due_date: '2026-09-01', amount: 1500, paid_amount: 0, invoice_id: null, status: 'pending' },
    ], '2026-08-26');

    expect(result.rows).toHaveLength(2);
    expect(result.summary).toMatchObject({ mode: 'payment_schedules', scheduleCount: 2, outstandingTotal: 2500 });
  });

  it('does not duplicate a month represented by an invoice', () => {
    const result = resolveLegalClaimProjection([
      { id: 'i1', invoice_number: 'INV-1', due_date: '2026-01-01', invoice_month: '2026-01-01', total_amount: 1500, paid_amount: 0, balance_due: 1500 },
    ], [
      { id: 's1', installment_number: 1, due_date: '2026-01-26', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
      { id: 's2', installment_number: 2, due_date: '2026-02-26', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
    ], '2026-08-26');

    expect(result.rows.map((row) => row.source)).toEqual(['invoice', 'payment_schedule']);
    expect(result.summary.outstandingTotal).toBe(3000);
  });

  it('excludes paid and future records', () => {
    const result = resolveLegalClaimProjection([
      { id: 'paid', invoice_number: 'PAID', due_date: '2026-01-01', invoice_month: '2026-01-01', total_amount: 1500, paid_amount: 1500, balance_due: 0 },
      { id: 'future', invoice_number: 'FUTURE', due_date: '2026-09-01', invoice_month: '2026-09-01', total_amount: 1500, paid_amount: 0, balance_due: 1500 },
    ], [], '2026-08-26');

    expect(result.rows).toEqual([]);
    expect(result.summary.mode).toBe('none');
  });

  it('excludes cancelled records and lets a valid schedule replace a cancelled invoice month', () => {
    const result = resolveLegalClaimProjection([
      {
        id: 'cancelled-invoice',
        invoice_number: 'VOID-1',
        due_date: '2026-03-01',
        invoice_month: '2026-03-01',
        total_amount: 1500,
        paid_amount: 0,
        balance_due: 1500,
        status: 'cancelled',
      },
    ], [
      { id: 'valid', installment_number: 3, due_date: '2026-03-01', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
      { id: 'cancelled', installment_number: 4, due_date: '2026-04-01', amount: 1500, paid_amount: 0, invoice_id: null, status: 'cancelled' },
    ], '2026-08-26');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ source: 'payment_schedule', source_reference: 'valid' });
  });
});
