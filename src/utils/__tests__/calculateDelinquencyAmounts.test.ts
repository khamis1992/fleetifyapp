import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateDelinquencyAmounts } from '../calculateDelinquencyAmounts';

const invoices = [
  { id: 'i1', due_date: '2026-08-01', total_amount: 2000, paid_amount: 500 },
  { id: 'i2', due_date: '2026-08-10', total_amount: 1000, paid_amount: 0 },
];
const referenceDate = new Date('2026-08-21T00:00:00');

describe('calculateDelinquencyAmounts', () => {
  afterEach(() => vi.useRealTimers());
  it('defaults every non-invoice claim component to zero', () => {
    const result = calculateDelinquencyAmounts(invoices, [], { referenceDate });

    expect(result.overdueRent).toBe(2500);
    expect(result.lateFees).toBe(0);
    expect(result.damagesFee).toBe(0);
    expect(result.total).toBe(2500);
    expect(result.invoiceLateFees.every((item) => item.lateFee === 0)).toBe(true);
  });

  it('applies an explicit documented daily rule and allocates its cap consistently', () => {
    const result = calculateDelinquencyAmounts(invoices, [], {
      referenceDate,
      contractualCompensation: { enabled: true, method: 'daily', rate: 100, cap: 1000 },
    });

    expect(result.lateFees).toBe(1000);
    expect(result.invoiceLateFees.reduce((sum, item) => sum + item.lateFee, 0)).toBe(1000);
    expect(result.total).toBe(3500);
  });

  it('applies a documented monthly rule once per distinct overdue month', () => {
    const result = calculateDelinquencyAmounts([
      { ...invoices[0], due_date: '2026-07-01' },
      invoices[1],
      {
        id: 'same-month-adjustment',
        invoice_number: 'INV-ADJ',
        due_date: invoices[0].due_date,
        total_amount: 500,
        paid_amount: 0,
      },
    ], [], {
      referenceDate,
      contractualCompensation: { enabled: true, method: 'monthly', rate: 1200 },
    });

    expect(result.contractualCompensationUnits).toBe(2);
    expect(result.lateFees).toBe(2400);
    expect(result.invoiceLateFees.reduce((sum, item) => sum + item.lateFee, 0)).toBe(2400);
  });

  it('caps a documented monthly rule without changing its evidentiary month count', () => {
    const result = calculateDelinquencyAmounts([
      { ...invoices[0], due_date: '2026-07-01' },
      invoices[1],
    ], [], {
      referenceDate,
      contractualCompensation: { enabled: true, method: 'monthly', rate: 1200, cap: 1800 },
    });

    expect(result.contractualCompensationUnits).toBe(2);
    expect(result.lateFees).toBe(1800);
    expect(result.invoiceLateFees.reduce((sum, item) => sum + item.lateFee, 0)).toBe(1800);
  });

  it('accepts documented damages only when supplied by the caller', () => {
    const result = calculateDelinquencyAmounts(invoices, [], {
      referenceDate,
      documentedDamagesAmount: 750,
    });

    expect(result.damagesFee).toBe(750);
    expect(result.total).toBe(3250);
  });

  it('includes rent on its due date without counting a late day', () => {
    const result = calculateDelinquencyAmounts([
      { id: 'due-today', due_date: '2026-08-21', total_amount: 1500, paid_amount: 0 },
    ], [], { referenceDate });

    expect(result.overdueRent).toBe(1500);
    expect(result.invoiceLateFees[0]).toMatchObject({ daysOverdue: 0, lateFee: 0 });
  });

  it('uses the Qatar business day when UTC is still on the prior date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-25T22:30:00.000Z'));

    const result = calculateDelinquencyAmounts([
      { id: 'qatar-today', due_date: '2026-08-26', total_amount: 1500, paid_amount: 0 },
    ]);

    expect(result.overdueRent).toBe(1500);
    expect(result.invoiceLateFees[0].daysOverdue).toBe(0);
  });
});
