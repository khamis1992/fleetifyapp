import { describe, expect, it } from 'vitest';
import {
  buildInvoiceMonthCutoffFilter,
  getInvoiceBillingDate,
  getInvoiceBillingMonthKey,
  getNextLocalMonthStart,
  isInvoiceInCurrentOrPastMonth,
  sortInvoicesByBillingMonth,
} from '@/utils/invoiceBillingMonth';

const augustThird = new Date(2026, 7, 3, 12, 0, 0);

describe('invoice billing month rules', () => {
  it('uses invoice_month before invoice_date and never derives the month from due_date', () => {
    const invoice = {
      invoice_month: '2026-08-01',
      invoice_date: '2026-07-31',
      due_date: '2026-09-01',
    };

    expect(getInvoiceBillingDate(invoice)).toBe('2026-08-01');
    expect(getInvoiceBillingMonthKey(invoice)).toBe('2026-08');
  });

  it('falls back to invoice_date for legacy rows without invoice_month', () => {
    expect(getInvoiceBillingMonthKey({
      invoice_month: null,
      invoice_date: '2026-08-19',
    })).toBe('2026-08');
  });

  it('includes an August invoice during August even when payment is due in September', () => {
    expect(isInvoiceInCurrentOrPastMonth({
      invoice_month: '2026-08-01',
      invoice_date: '2026-08-01',
      due_date: '2026-09-01',
    }, augustThird)).toBe(true);
  });

  it('excludes future billing months regardless of their due date', () => {
    expect(isInvoiceInCurrentOrPastMonth({
      invoice_month: '2026-09-01',
      invoice_date: '2026-08-01',
      due_date: '2026-08-15',
    }, augustThird)).toBe(false);
  });

  it('builds a server filter that stops before the next local month', () => {
    expect(getNextLocalMonthStart(augustThird)).toBe('2026-09-01');
    expect(buildInvoiceMonthCutoffFilter(augustThird)).toBe(
      'invoice_month.lt.2026-09-01,and(invoice_month.is.null,invoice_date.lt.2026-09-01)',
    );
  });

  it('sorts by the canonical billing month without mutating the source array', () => {
    const source = [
      { id: 'september', invoice_month: '2026-09-01', invoice_date: '2026-08-01' },
      { id: 'legacy-july', invoice_month: null, invoice_date: '2026-07-20' },
      { id: 'august', invoice_month: '2026-08-01', invoice_date: '2026-09-05' },
    ];

    const sorted = sortInvoicesByBillingMonth(source);

    expect(sorted.map((invoice) => invoice.id)).toEqual(['legacy-july', 'august', 'september']);
    expect(source.map((invoice) => invoice.id)).toEqual(['september', 'legacy-july', 'august']);
  });
});
