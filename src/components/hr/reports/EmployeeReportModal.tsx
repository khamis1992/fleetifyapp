import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, Download } from 'lucide-react';
import { useEmployeeReport, exportHRReportToHTML } from '@/hooks/useHRReports';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface EmployeeReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeReportModal({ open, onOpenChange }: EmployeeReportModalProps) {
const { data: employeeData, isLoading, error } = useEmployeeReport();
 
   const { formatCurrency } = useCurrencyFormatter();

  const handleExport = () => {
    if (!employeeData) return;

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>رقم الموظف</th>
            <th>الاسم الأول</th>
            <th>الاسم الأخير</th>
            <th>المنصب</th>
            <th>القسم</th>
            <th>تاريخ التوظيف</th>
            <th>الراتب الأساسي</th>
            <th>البدلات</th>
            <th>الحالة</th>
            <th>الوصول للنظام</th>
          </tr>
        </thead>
        <tbody>
          ${employeeData.map(employee => `
            <tr>
              <td>${employee.employee_number}</td>
              <td>${employee.first_name}</td>
              <td>${employee.last_name}</td>
              <td>${employee.position || 'غير محدد'}</td>
              <td>${employee.department || 'غير محدد'}</td>
              <td>${new Date(employee.hire_date).toLocaleDateString('en-GB')}</td>
              <td>${formatCurrency(employee.basic_salary)}</td>
              <td>${formatCurrency(employee.allowances)}</td>
              <td class="${employee.is_active ? 'status-active' : 'status-inactive'}">
                ${employee.is_active ? 'نشط' : 'غير نشط'}
              </td>
              <td class="${employee.has_system_access ? 'status-active' : 'status-inactive'}">
                ${employee.has_system_access ? 'نعم' : 'لا'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    exportHRReportToHTML(
      tableContent,
      'تقرير الموظفين',
      'شركة الأعمال'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            تقرير الموظفين
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              خطأ في تحميل البيانات: {error.message}
            </div>
          ) : employeeData && employeeData.length > 0 ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-right">رقم الموظف</th>
                    <th className="border border-border p-2 text-right">الاسم الأول</th>
                    <th className="border border-border p-2 text-right">الاسم الأخير</th>
                    <th className="border border-border p-2 text-right">المنصب</th>
                    <th className="border border-border p-2 text-right">القسم</th>
                    <th className="border border-border p-2 text-center">تاريخ التوظيف</th>
                    <th className="border border-border p-2 text-center">الراتب الأساسي</th>
                    <th className="border border-border p-2 text-center">البدلات</th>
                    <th className="border border-border p-2 text-center">الحالة</th>
                    <th className="border border-border p-2 text-center">الوصول للنظام</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeData.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/50">
                      <td className="border border-border p-2">{employee.employee_number}</td>
                      <td className="border border-border p-2">{employee.first_name}</td>
                      <td className="border border-border p-2">{employee.last_name}</td>
                      <td className="border border-border p-2">{employee.position || 'غير محدد'}</td>
                      <td className="border border-border p-2">{employee.department || 'غير محدد'}</td>
                      <td className="border border-border p-2 text-center">
                        {new Date(employee.hire_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {formatCurrency(employee.basic_salary)}
                      </td>
                      <td className="border border-border p-2 text-center">
                        {formatCurrency(employee.allowances)}
                      </td>
                      <td className="border border-border p-2 text-center">
                        <span className={employee.is_active ? 'text-green-600' : 'text-red-600'}>
                          {employee.is_active ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="border border-border p-2 text-center">
                        <span className={employee.has_system_access ? 'text-green-600' : 'text-red-600'}>
                          {employee.has_system_access ? 'نعم' : 'لا'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات موظفين
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <Button onClick={handleExport} disabled={!employeeData || employeeData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}