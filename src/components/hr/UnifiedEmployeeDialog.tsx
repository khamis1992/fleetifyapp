import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import EmployeeForm, { EmployeeFormData } from './EmployeeForm';

// Employee type for editing
interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  email?: string;
  phone?: string;
  position?: string;
  position_ar?: string;
  department?: string;
  department_ar?: string;
  hire_date: string;
  basic_salary: number;
  allowances: number;
  national_id?: string;
  address?: string;
  address_ar?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  bank_account?: string;
  iban?: string;
  notes?: string;
}

interface UnifiedEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EmployeeFormData) => void;
  isLoading?: boolean;
  /** Mode: 'create' for new employee, 'edit' for editing existing */
  mode?: 'create' | 'edit';
  /** Employee data for editing (required when mode='edit') */
  employee?: Employee | null;
}

/**
 * UnifiedEmployeeDialog - مكون موحد لإنشاء وتعديل الموظفين
 * 
 * Usage:
 * - Create: <UnifiedEmployeeDialog mode="create" ... />
 * - Edit: <UnifiedEmployeeDialog mode="edit" employee={selectedEmployee} ... />
 */
export function UnifiedEmployeeDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading,
  mode = 'create',
  employee
}: UnifiedEmployeeDialogProps) {
  const isEditMode = mode === 'edit' && employee;
  
  const title = isEditMode ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد';
  const description = isEditMode 
    ? 'قم بتعديل البيانات المطلوبة وانقر على حفظ التغييرات'
    : 'املأ البيانات التالية لإضافة موظف جديد إلى النظام';

  // Convert employee data to form initial data
  const initialData = isEditMode && employee ? {
    employee_number: employee.employee_number,
    first_name: employee.first_name,
    last_name: employee.last_name,
    first_name_ar: employee.first_name_ar || '',
    last_name_ar: employee.last_name_ar || '',
    email: employee.email || '',
    phone: employee.phone || '',
    position: employee.position || '',
    position_ar: employee.position_ar || '',
    department: employee.department || '',
    department_ar: employee.department_ar || '',
    hire_date: new Date(employee.hire_date),
    basic_salary: employee.basic_salary,
    allowances: employee.allowances || 0,
    national_id: employee.national_id || '',
    address: employee.address || '',
    address_ar: employee.address_ar || '',
    emergency_contact_name: employee.emergency_contact_name || '',
    emergency_contact_phone: employee.emergency_contact_phone || '',
    bank_account: employee.bank_account || '',
    iban: employee.iban || '',
    notes: employee.notes || '',
    createAccount: false,
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {/* Show form only if: create mode OR edit mode with employee data */}
        {(mode === 'create' || (mode === 'edit' && employee)) && (
          <EmployeeForm 
            onSubmit={onSubmit} 
            isLoading={isLoading}
            initialData={initialData}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Legacy exports for backward compatibility
export default UnifiedEmployeeDialog;

/** @deprecated Use UnifiedEmployeeDialog with mode="create" instead */
export const EmployeeDialog = UnifiedEmployeeDialog;

/** @deprecated Use UnifiedEmployeeDialog with mode="edit" instead */
export const EditEmployeeDialog = UnifiedEmployeeDialog;

