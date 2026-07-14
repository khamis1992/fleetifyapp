import { describe, expect, it } from 'vitest';
import { calculatePayrollAccountingComponents } from '@/utils/payrollAccounting';

describe('payroll journal plans', () => {
  it('separates gross expense, net pay, deductions, and tax', () => {
    const components = calculatePayrollAccountingComponents({
      basicSalary: 5_000,
      allowances: 500,
      overtimeAmount: 250,
      deductions: 100,
      taxAmount: 150,
      netAmount: 5_500,
    });

    expect(components).toEqual({
      grossExpense: 5_750,
      netPayable: 5_500,
      deductionPayable: 100,
      taxPayable: 150,
    });
    expect(components.grossExpense).toBe(
      components.netPayable + components.deductionPayable + components.taxPayable,
    );
  });

  it('rejects a payroll whose stored net amount differs from its components', () => {
    expect(() => calculatePayrollAccountingComponents({
      basicSalary: 5_000,
      allowances: 0,
      overtimeAmount: 0,
      deductions: 100,
      taxAmount: 0,
      netAmount: 5_000,
    })).toThrow('لا يطابق المكونات المحاسبية');
  });

  it('allows a reconciled zero-net payroll without inventing a cash payment', () => {
    const components = calculatePayrollAccountingComponents({
      basicSalary: 1_000,
      deductions: 1_000,
      netAmount: 0,
    });

    expect(components.netPayable).toBe(0);
    expect(components.grossExpense).toBe(components.deductionPayable);
  });
});
