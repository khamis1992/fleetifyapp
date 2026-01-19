import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import PayrollForm from './PayrollForm';
import { CreatePayrollData } from '@/hooks/usePayroll';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  position?: string;
  department?: string;
  basic_salary: number;
  allowances: number;
  bank_account?: string;
  iban?: string;
}

interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePayrollData) => void;
  employees: Employee[];
  isLoading?: boolean;
  selectedEmployeeId?: string;
}

export default function PayrollDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  employees, 
  isLoading,
  selectedEmployeeId 
}: PayrollDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة راتب جديد</DialogTitle>
          <DialogDescription>
            املأ البيانات التالية لإضافة راتب جديد للموظف
          </DialogDescription>
        </DialogHeader>
        <PayrollForm 
          employees={employees}
          onSubmit={onSubmit} 
          isLoading={isLoading}
          selectedEmployeeId={selectedEmployeeId}
        />
      </DialogContent>
    </Dialog>
  );
}