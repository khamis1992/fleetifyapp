import { describe, expect, it } from 'vitest';
import { buildScheduleSettlements, contractBusinessDate } from '../contractScheduleSettlement';
const schedule = { id: 's', status: 'paid', due_date: '2026-01-01', amount: 1500, paid_amount: 1500, invoice_id: 'i', installment_number: 1 };
const invoice = { id: 'i', invoice_month: '2026-01-01', total_amount: 1500, paid_amount: 500, status: 'sent' };
const today = '2026-02-01';
describe('schedule settlement from payment-evidenced invoices', () => {
  it('replaces stale status with actual partial settlement without mutating source terms', () => {
    const [row] = buildScheduleSettlements([schedule], [invoice], today);
    expect(row).toMatchObject({ status: 'partially_paid', paid_amount: 500, remaining_amount: 1000, is_overdue: true, stored_status: 'paid' });
    expect(schedule).toMatchObject({ status: 'paid', paid_amount: 1500, amount: 1500 });
  });
  it.each([0, 1499.99, 1500])('uses exact remaining currency units for a paid amount of %s', (paid) => {
    const [row] = buildScheduleSettlements([schedule], [{ ...invoice, paid_amount: paid }], today);
    expect(row.remaining_amount).toBe(Math.round((1500 - paid) * 100) / 100);
    expect(row.status === 'paid').toBe(paid === 1500);
  });
  it('marks due today as pending, not overdue', () => {
    expect(buildScheduleSettlements([schedule], [{ ...invoice, paid_amount: 0 }], '2026-01-01')[0]).toMatchObject({ status: 'pending', is_overdue: false });
  });
  it('does not infer settlement from a matching month or cached paid value without a link', () => {
    expect(buildScheduleSettlements([{ ...schedule, invoice_id: null }], [invoice], today)[0]).toMatchObject({ status: 'review', paid_amount: null, remaining_amount: null });
  });
  it.each([
    { id: 'other' }, { status: 'cancelled' }, { payment_status: 'voided' },
    { invoice_month: '2026-02-01' }, { total_amount: 1000 }, { paid_amount: 1600 }, { paid_amount: NaN },
  ])('does not invent settlement for mismatched invoice evidence %j', (change) => {
    expect(buildScheduleSettlements([schedule], [{ ...invoice, ...change }], today)[0]).toMatchObject({ status: 'review', paid_amount: null, remaining_amount: null });
  });
  it('keeps both duplicate-month installments for review instead of discarding one', () => {
    const rows = buildScheduleSettlements([schedule, { ...schedule, id: 's2', invoice_id: 'i2' }], [invoice, { ...invoice, id: 'i2' }], today);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === 'review' && row.paid_amount === null)).toBe(true);
  });
  it('does not reuse invoice paid money in two different installments', () => {
    const rows = buildScheduleSettlements([schedule, { ...schedule, id: 's2', due_date: '2026-02-01' }], [invoice], today);
    expect(rows.every((row) => row.status === 'review')).toBe(true);
  });
  it.each([null, 'invalid', '2026-02-30', '2026-13-01'])('keeps invalid date %s visible for review without an invalid Date crash', (due_date) => {
    expect(buildScheduleSettlements([{ ...schedule, due_date }], [invoice], today)[0]).toMatchObject({ status: 'review', due_date: null });
  });
  it.each([null, -1, 0, 0.001, NaN])('requires a valid positive installment amount %s', (amount) => {
    expect(buildScheduleSettlements([{ ...schedule, amount }], [invoice], today)[0].status).toBe('review');
  });
  it.each(['cancelled', 'canceled', 'void', 'voided', 'deleted', 'inactive', 'reversed'])('excludes inactive installment %s', (status) => {
    expect(buildScheduleSettlements([{ ...schedule, status }], [invoice], today)).toEqual([]);
  });
  it('uses the Qatar business day across UTC midnight', () => {
    expect(contractBusinessDate(new Date('2026-01-01T21:30:00Z'))).toBe('2026-01-02');
  });
  it.each(['service', ' SERVICE '])('settles a core-generated %s rental only through its matching installment link', (invoice_type) => {
    expect(buildScheduleSettlements([schedule], [{ ...invoice, invoice_type }], today)[0]).toMatchObject({
      status: 'partially_paid', paid_amount: 500, remaining_amount: 1000, settlement_review_reason: null,
    });
  });
  it.each([
    { invoice_month: '2026-02-01' }, { total_amount: 1499.99 }, { status: 'cancelled' },
    { penalty_id: 'violation' }, { invoice_number: ' tv-123 ' },
  ])('keeps mismatched or traffic service invoice %j out of rental settlement', (change) => {
    expect(buildScheduleSettlements([schedule], [{ ...invoice, invoice_type: 'service', ...change }], today)[0]).toMatchObject({
      status: 'review', paid_amount: null, remaining_amount: null,
    });
  });
  it('does not classify an unlinked service invoice by month and amount alone', () => {
    expect(buildScheduleSettlements([{ ...schedule, invoice_id: null }], [{ ...invoice, invoice_type: 'service' }], today)[0].status).toBe('review');
  });
  it('does not reuse a service invoice across installments', () => {
    const rows = buildScheduleSettlements([schedule, { ...schedule, id: 's2', due_date: '2026-02-01' }], [{ ...invoice, invoice_type: 'service' }], today);
    expect(rows.every((row) => row.status === 'review' && row.paid_amount === null)).toBe(true);
  });
  it.each([{ invoice_type: 'purchase' }, { invoice_type: 'traffic_violation' },
    { penalty_id: 'violation' }, { invoice_number: 'TV-123' }])('does not settle rent from a charge invoice %j', (charge) => {
    expect(buildScheduleSettlements([schedule], [{ ...invoice, ...charge }], today)[0].status).toBe('review');
  });
  it('flags repeated schedule IDs even when their months differ', () => {
    const rows = buildScheduleSettlements([schedule, { ...schedule, due_date: '2026-02-01', invoice_id: 'i2' }], [invoice], today);
    expect(rows.every((row) => row.settlement_review_reason?.includes('مكرر'))).toBe(true);
  });
});
