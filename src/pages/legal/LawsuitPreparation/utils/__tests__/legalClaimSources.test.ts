import { describe, expect, it } from 'vitest';
import {
  appendLegalAccrualToProjection,
  getQatarBusinessDate,
  resolveLegalClaimCutoffDate,
  resolveLegalClaimProjection,
  resolveStatementRentProjection,
  resolveStatementAmounts,
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

  it('preserves v4 continuation and its actual service period', () => {
    const base = resolveLegalClaimProjection([], [], '2026-09-08');
    const result = appendLegalAccrualToProjection(base, {
      cutoff_date: '2026-08-20',
      components: { legal_extension_rent: 1100 },
      _breakdown: { extension_start_date: '2026-08-01' },
    }, '2026-09-08');
    expect(result.rows[0]).toMatchObject({
      total_amount: 1100,
      service_period_start: '2026-08-01',
      service_period_end: '2026-08-20',
    });
    expect(result.summary.outstandingTotal).toBe(1100);
    expect(resolveLegalClaimCutoffDate('2026-09-08', { cutoff_date: '2026-08-20' })).toBe('2026-08-20');
  });

  it('does not invent a continuation period when its metadata is missing', () => {
    expect(() => appendLegalAccrualToProjection(
      resolveLegalClaimProjection([], [], '2026-09-08'),
      { components: { legal_extension_rent: 1700 } },
      '2026-09-08',
    )).toThrow('بداية فترة الأجرة');
  });
});


describe('statement settlement projection', () => {
  const invoice = { id: 'i1', invoice_number: 'INV', due_date: '2026-08-01', total_amount: 1700, paid_amount: 500, amount: 1200 };
  const statement = { cutoff_date: '2026-09-08', components: { rent_due: 1200 }, included_invoices: [invoice], included_schedules: [] };
  it('uses disclosed gross and counted receipts without consulting caches', () => {
    expect(resolveStatementRentProjection(statement,'2026-09-08')).toMatchObject({ rows: [{ total_amount: 1700, paid_amount: 500, source: 'invoice' }], summary: { outstandingTotal: 1200 } });
  });
  it('preserves unbilled schedule details in the same snapshot', () => {
    const result = resolveStatementRentProjection({ ...statement, components: { rent_due: 1400 }, included_schedules: [{ ...invoice, id: 's1', total_amount: 300, paid_amount: 100, amount: 200 }] }, '2026-09-08');
    expect(result.rows[1]).toMatchObject({ id: 'schedule:s1', source: 'payment_schedule', total_amount: 300, paid_amount: 100 });
    expect(result.summary).toMatchObject({ mode: 'hybrid', outstandingTotal: 1400 });
  });
  it('accepts an empty scoped or excluded claim without restoring old invoices', () => {
    expect(resolveStatementRentProjection({ ...statement, components: { rent_due: 0 }, included_invoices: [] },'2026-09-08').rows).toEqual([]);
  });
  it('rejects totals that disagree with rows and missing schedule metadata', () => {
    expect(() => resolveStatementRentProjection({ ...statement, components: { rent_due: 1700 } },'2026-09-08')).toThrow('مطابقة');
    expect(() => resolveStatementRentProjection({ ...statement, included_schedules: undefined },'2026-09-08')).toThrow('مطابقة');
  });
  it.each([
    { paid_amount: 1800 }, { paid_amount: -1 }, { amount: 1400 }, { total_amount: NaN }, { due_date: '2026-10-01' },
  ])('rejects invalid settlement or future rows: %j', invalid => {
    expect(() => resolveStatementRentProjection({ ...statement, included_invoices: [{ ...invoice, ...invalid }] },'2026-09-08')).toThrow('مطابقة');
  });
  it('rejects duplicate invoice rows', () => {
    expect(() => resolveStatementRentProjection({ ...statement, included_invoices: [invoice, invoice], components: { rent_due: 2400 } },'2026-09-08')).toThrow('مطابقة');
  });
});


describe('authoritative claim components', () => {
  const components = { rent_due: 1200, legal_extension_rent: 100, contractual_compensation: 50, damages: 25,
    traffic_violations: 300, retention: 75, security_deposit_deduction: 200 };
  it('maps all components from one statement and deducts the deposit once', () => {
    expect(resolveStatementAmounts({ components, total: 1550 })).toEqual({ overdueRent: 1300, lateFees: 50,
      damagesFee: 25, violationsFines: 300, retentionCompensation: 75, securityDepositDeduction: 200, total: 1550 });
  });
  it('limits the cash claim to zero when the deposit exceeds the claim', () => {
    expect(resolveStatementAmounts({ components: { ...components, security_deposit_deduction: 5000 }, total: 0 }).total).toBe(0);
  });
  it('rejects a statement total inconsistent with its components', () => {
    expect(() => resolveStatementAmounts({ components, total: 1750 })).toThrow('إجمالي المطالبة');
  });
  it.each([null, undefined, -1, NaN, Infinity, 0.001])('rejects an unverified or invalid component %s', amount => {
    expect(() => resolveStatementAmounts({ components: { ...components, damages: amount }, total: 1550 })).toThrow('بنود');
  });
});
