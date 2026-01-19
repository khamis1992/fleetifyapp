import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PayrollForm from './PayrollForm';
import { PayrollRecord, CreatePayrollData } from '@/hooks/usePayroll';

interface EditPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePayrollData) => void;
  payroll: PayrollRecord | null;
  employees: any[];
  isLoading?: boolean;
}

export default function EditPayrollDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  payroll,
  employees, 
  isLoading
}: EditPayrollDialogProps) {
  const handleSubmit = (data: CreatePayrollData) => {
    onSubmit(data);
    onOpenChange(false);
  };

  if (!payroll) return null;

  // Convert PayrollRecord to CreatePayrollData format
  const initialData: CreatePayrollData = {
    employee_id: payroll.employee_id,
    pay_period_start: payroll.pay_period_start,
    pay_period_end: payroll.pay_period_end,
    basic_salary: payroll.basic_salary,
    allowances: payroll.allowances,
    overtime_hours: payroll.overtime_amount > 0 ? payroll.overtime_amount / 10 : 0, // Estimate hours
    overtime_rate: payroll.overtime_amount > 0 ? 10 : 0, // Default rate
    deductions: payroll.deductions,
    tax_amount: payroll.tax_amount,
    payment_method: payroll.payment_method,
    bank_account: payroll.bank_account || '',
    notes: payroll.notes || '',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تعديل الراتب - {payroll.payroll_number}</DialogTitle>
          <DialogDescription>
            تعديل بيانات راتب الموظف {payroll.employee?.first_name} {payroll.employee?.last_name}
          </DialogDescription>
        </DialogHeader>
        <PayrollForm 
          employees={employees}
          onSubmit={handleSubmit} 
          isLoading={isLoading}
          selectedEmployeeId={payroll.employee_id}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  );
}