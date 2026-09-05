import { describe, expect, it } from 'vitest';
import {
  appendLegalAccrualToProjection,
  getQatarBusinessDate,
  resolveLegalClaimCutoffDate,
  resolveLegalClaimProjection,
} from '../legalClaimSources';

describe('resolveLegalClaimProjection', () => {
  const serviceInvoice = { id: 'service-rent', invoice_number: 'INV-202610-1', due_date: '2026-10-01', invoice_month: '2026-10-01', total_amount: 1500, paid_amount: 1000, balance_due: 500, invoice_type: 'service', penalty_id: null };
  const linkedSchedule = { id: 'linked', installment_number: 1, due_date: '2026-10-01', amount: 1500, paid_amount: 1000, invoice_id: 'service-rent', status: 'partial' };

  it('includes billed service rent once and preserves partial payments', () => {
    const result = resolveLegalClaimProjection([serviceInvoice], [linkedSchedule], '2026-10-05');
    expect(result.rows).toHaveLength(1);
    expect(result.summary).toMatchObject({ mode: 'invoices', invoiceCount: 1, scheduleCount: 0, outstandingTotal: 500 });
  });

  it.each([
    [],
    [{ ...linkedSchedule, amount: 2000 }],
    [{ ...linkedSchedule, due_date: '2026-09-01' }],
    [{ ...linkedSchedule, status: 'cancelled' }],
    [linkedSchedule, { ...linkedSchedule, id: 'duplicate' }],
  ])('does not classify service invoices without an unambiguous matching rental schedule: %j', (...schedules) => {
    expect(resolveLegalClaimProjection([serviceInvoice], schedules, '2026-10-05').rows).toEqual([]);
  });

  it('does not include paid, future, or traffic service invoices even with a schedule link', () => {
    for (const invoice of [
      { ...serviceInvoice, paid_amount: 1500, balance_due: 0 },
      { ...serviceInvoice, due_date: '2026-11-01' },
      { ...serviceInvoice, invoice_number: 'TV-123' },
      { ...serviceInvoice, penalty_id: 'penalty-1' },
    ]) {
      expect(resolveLegalClaimProjection([invoice], [linkedSchedule], '2026-10-05').rows).toEqual([]);
    }
  });

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
      { id: 'i1', invoice_number: 'INV-1', due_date: '2026-01-01', invoice_month: '2026-01-01', total_amount: 1500, paid_amount: 0, balance_due: 1500, invoice_type: 'sales', penalty_id: null },
    ], [
      { id: 's1', installment_number: 1, due_date: '2026-01-26', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
      { id: 's2', installment_number: 2, due_date: '2026-02-26', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
    ], '2026-08-26');

    expect(result.rows.map((row) => row.source)).toEqual(['invoice', 'payment_schedule']);
    expect(result.summary.outstandingTotal).toBe(3000);
  });

  it('excludes paid and future records', () => {
    const result = resolveLegalClaimProjection([
      { id: 'paid', invoice_number: 'PAID', due_date: '2026-01-01', invoice_month: '2026-01-01', total_amount: 1500, paid_amount: 1500, balance_due: 0, invoice_type: 'sales', penalty_id: null },
      { id: 'future', invoice_number: 'FUTURE', due_date: '2026-09-01', invoice_month: '2026-09-01', total_amount: 1500, paid_amount: 0, balance_due: 1500, invoice_type: 'sales', penalty_id: null },
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
        invoice_type: 'sales',
        penalty_id: null,
      },
    ], [
      { id: 'valid', installment_number: 3, due_date: '2026-03-01', amount: 1500, paid_amount: 0, invoice_id: null, status: 'overdue' },
      { id: 'cancelled', installment_number: 4, due_date: '2026-04-01', amount: 1500, paid_amount: 0, invoice_id: null, status: 'cancelled' },
    ], '2026-08-26');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ source: 'payment_schedule', source_reference: 'valid' });
  });

  it('uses the documented vehicle-return cutoff instead of including later installments', () => {
    expect(resolveLegalClaimCutoffDate('2026-09-03', {
      rent_cutoff_date: '2026-08-31',
    })).toBe('2026-08-31');
    expect(resolveLegalClaimCutoffDate('2026-09-03', {
      rent_cutoff_date: '2026-10-01',
    })).toBe('2026-09-03');
  });

  it('excludes unknown, void, and deleted invoice rows from a legal rent claim', () => {
    const result = resolveLegalClaimProjection([
      {
        id: 'unknown',
        invoice_number: 'UNKNOWN',
        due_date: '2026-01-01',
        invoice_month: '2026-01-01',
        total_amount: 1500,
        paid_amount: 0,
        balance_due: 1500,
        invoice_type: null,
        penalty_id: null,
      },
      {
        id: 'void',
        invoice_number: 'VOID',
        due_date: '2026-02-01',
        invoice_month: '2026-02-01',
        total_amount: 1500,
        paid_amount: 0,
        balance_due: 1500,
        invoice_type: 'sales',
        penalty_id: null,
        status: 'void',
      },
      {
        id: 'deleted',
        invoice_number: 'DELETED',
        due_date: '2026-03-01',
        invoice_month: '2026-03-01',
        total_amount: 1500,
        paid_amount: 0,
        balance_due: 1500,
        invoice_type: 'sales',
        penalty_id: null,
        payment_status: 'deleted',
      },
    ], [], '2026-08-26');

    expect(result.rows).toEqual([]);
    expect(result.summary.outstandingTotal).toBe(0);
  });

  it('excludes penalty-linked and non-rent service invoices from overdue rent', () => {
    const result = resolveLegalClaimProjection([
      {
        id: 'rent',
        invoice_number: 'RENT-1',
        due_date: '2026-01-01',
        invoice_month: '2026-01-01',
        total_amount: 1500,
        paid_amount: 0,
        balance_due: 1500,
        invoice_type: 'sales',
        penalty_id: null,
      },
      {
        id: 'penalty',
        invoice_number: 'PEN-1',
        due_date: '2026-01-01',
        invoice_month: '2026-01-01',
        total_amount: 500,
        paid_amount: 0,
        balance_due: 500,
        invoice_type: 'service',
        penalty_id: 'penalty-1',
      },
      {
        id: 'service',
        invoice_number: 'SERVICE-1',
        due_date: '2026-02-01',
        invoice_month: '2026-02-01',
        total_amount: 300,
        paid_amount: 0,
        balance_due: 300,
        invoice_type: 'service',
        penalty_id: null,
      },
    ], [], '2026-08-26');

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].source_reference).toBe('rent');
    expect(result.summary.outstandingTotal).toBe(1500);
  });

  it('adds legal rent continuation once without mutating accounting invoices', () => {
    const base = resolveLegalClaimProjection([{
      id: 'i1',
      invoice_number: 'INV-1',
      due_date: '2026-01-01',
      invoice_month: '2026-01-01',
      total_amount: 1500,
      paid_amount: 0,
      balance_due: 1500,
      invoice_type: 'sales',
      penalty_id: null,
    }], [], '2026-08-30');

    const result = appendLegalAccrualToProjection(base, {
      legal_extension_rent_amount: 1451.61,
      extension_start_date: '2026-08-01',
      rent_cutoff_date: '2026-08-30',
    }, '2026-08-30');

    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({
      source: 'legal_accrual',
      total_amount: 1451.61,
      paid_amount: 0,
    });
    expect(result.summary).toMatchObject({
      mode: 'composite',
      legalAccrualCount: 1,
      legalAccrualAmount: 1451.61,
      outstandingTotal: 2951.61,
    });
  });

  it('does not add an empty legal accrual row', () => {
    const base = resolveLegalClaimProjection([], [], '2026-08-30');
    expect(appendLegalAccrualToProjection(base, {
      legal_extension_rent_amount: 0,
    }, '2026-08-30')).toBe(base);
  });
});
