import { describe, expect, it } from 'vitest';
import { assertRentClaimConsistent, summarizeRentClaim } from '../rentClaimSummary';
import type { LawsuitPreparationState } from '../../store/types';

describe('rent claim service coverage and settlement', () => {
  it('prevents export while a payment and the calculated rent disagree', () => {
    const state = {
      overdueInvoices: [{ id: 'one', due_date: '2026-08-01', total_amount: 1700, paid_amount: 500 }],
      calculations: { overdueRent: 1700 },
    } as unknown as LawsuitPreparationState;
    expect(() => assertRentClaimConsistent(state)).toThrow('لا تتطابق الأجرة');
    state.calculations!.overdueRent = 1200;
    expect(() => assertRentClaimConsistent(state)).not.toThrow();
  });
  it('covers a prepaid month through its last day and preserves partial payments', () => {
    expect(summarizeRentClaim([
      { id: 'one', invoice_number: '1', due_date: '2024-02-01', total_amount: 1700, paid_amount: 500.25 },
    ])).toEqual({ grossRent: 1700, countedPayments: 500.25, netRent: 1199.75,
      periodFrom: '2024-02-01', periodTo: '2024-02-29' });
  });
  it('uses partial contractual boundaries without prorating the recorded amount again', () => {
    const result = summarizeRentClaim([
      { id: 'one', invoice_number: '1', due_date: '2026-08-01', total_amount: 600, paid_amount: 0 },
    ], { start_date: '2026-08-10', end_date: '2026-08-20' });
    expect(result).toMatchObject({ periodFrom: '2026-08-10', periodTo: '2026-08-20', netRent: 600 });
  });
  it('uses the documented extension endpoint and excludes fully settled rows', () => {
    const result = summarizeRentClaim([
      { id: 'paid', invoice_number: '1', due_date: '2026-01-01', total_amount: 1700, paid_amount: 1700 },
      { id: 'extension', invoice_number: null, due_date: '2026-08-01', total_amount: 1100, paid_amount: 0,
        source: 'legal_accrual', service_period_start: '2026-08-01', service_period_end: '2026-08-20' },
    ], { end_date: '2026-07-31' });
    expect(result).toMatchObject({ grossRent: 1100, countedPayments: 0, netRent: 1100,
      periodFrom: '2026-08-01', periodTo: '2026-08-20' });
  });
  it('rejects invalid settlement numbers rather than inventing debt', () => {
    expect(() => summarizeRentClaim([
      { id: 'bad', invoice_number: null, due_date: '2026-01-01', total_amount: 100, paid_amount: 101 },
    ])).toThrow('مطابقة');
  });
});
