export interface PayrollAccountingInput {
  basicSalary: number;
  allowances?: number | null;
  overtimeAmount?: number | null;
  deductions?: number | null;
  taxAmount?: number | null;
  netAmount: number;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const amount = (value: number | null | undefined) => roundMoney(Number(value) || 0);

export const calculatePayrollAccountingComponents = (input: PayrollAccountingInput) => {
  const grossExpense = roundMoney(
    amount(input.basicSalary) + amount(input.allowances) + amount(input.overtimeAmount),
  );
  const netPayable = amount(input.netAmount);
  const deductionPayable = amount(input.deductions);
  const taxPayable = amount(input.taxAmount);
  const expectedNet = roundMoney(grossExpense - deductionPayable - taxPayable);

  if (grossExpense <= 0 || netPayable < 0) {
    throw new Error('لا يمكن اعتماد راتب بقيمة إجمالية غير موجبة أو صافي سالب');
  }
  if (Math.abs(expectedNet - netPayable) > 0.01) {
    throw new Error(`صافي الراتب ${netPayable} لا يطابق المكونات المحاسبية ${expectedNet}`);
  }

  return { grossExpense, netPayable, deductionPayable, taxPayable };
};
