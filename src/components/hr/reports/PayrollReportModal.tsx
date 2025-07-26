import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Download } from 'lucide-react';
import { usePayrollReport, exportHRReportToHTML } from '@/hooks/useHRReports';
import { formatCurrency } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface PayrollReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollReportModal({ open, onOpenChange }: PayrollReportModalProps) {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  const { data: payrollData, isLoading, error } = usePayrollReport(startDate, endDate);

  const totalPayroll = payrollData?.reduce((sum, record) => sum + record.net_amount, 0) || 0;
  const totalDeductions = payrollData?.reduce((sum, record) => sum + record.deductions + record.tax_amount, 0) || 0;

  const handleExport = () => {
    if (!payrollData) return;

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>رقم الموظف</th>
            <th>اسم الموظف</th>
            <th>الراتب الأساسي</th>
            <th>البدلات</th>
            <th>الساعات الإضافية</th>
            <th>الخصومات</th>
            <th>الضرائب</th>
            <th>صافي الراتب</th>
            <th>تاريخ الراتب</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${payrollData.map(record => `
            <tr>
              <td>${record.employee_number}</td>
              <td>${record.employee_name || 'غير محدد'}</td>
              <td>${formatCurrency(record.basic_salary)}</td>
              <td>${formatCurrency(record.allowances)}</td>
              <td>${formatCurrency(record.overtime_amount)}</td>
              <td>${formatCurrency(record.deductions)}</td>
              <td>${formatCurrency(record.tax_amount)}</td>
              <td>${formatCurrency(record.net_amount)}</td>
              <td>${new Date(record.payroll_date).toLocaleDateString('en-GB')}</td>
              <td>${record.status === 'paid' ? 'مدفوع' : record.status === 'approved' ? 'معتمد' : 'مسودة'}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td colspan="7"><strong>الإجمالي</strong></td>
            <td><strong>${formatCurrency(totalPayroll)}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tbody>
      </table>
    `;

    exportHRReportToHTML(
      tableContent,
      `تقرير الرواتب - من ${startDate} إلى ${endDate}`,
      'شركة الأعمال'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'approved': return 'text-blue-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'approved': return 'معتمد';
      default: return 'مسودة';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            تقرير الرواتب
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">من تاريخ</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">إلى تاريخ</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {payrollData && payrollData.length > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{payrollData.length}</div>
                <div className="text-sm text-muted-foreground">عدد الرواتب</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPayroll)}</div>
                <div className="text-sm text-muted-foreground">إجمالي الرواتب</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalDeductions)}</div>
                <div className="text-sm text-muted-foreground">إجمالي الخصومات</div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              خطأ في تحميل البيانات: {error.message}
            </div>
          ) : payrollData && payrollData.length > 0 ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-right">رقم الموظف</th>
                    <th className="border border-border p-2 text-right">اسم الموظف</th>
                    <th className="border border-border p-2 text-center">الراتب الأساسي</th>
                    <th className="border border-border p-2 text-center">البدلات</th>
                    <th className="border border-border p-2 text-center">الساعات الإضافية</th>
                    <th className="border border-border p-2 text-center">الخصومات</th>
                    <th className="border border-border p-2 text-center">الضرائب</th>
                    <th className="border border-border p-2 text-center">صافي الراتب</th>
                    <th className="border border-border p-2 text-center">تاريخ الراتب</th>
                    <th className="border border-border p-2 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollData.map((record) => (
                    <tr key={record.id} className="hover:bg-muted/50">
                      <td className="border border-border p-2">{record.employee_number}</td>
                      <td className="border border-border p-2">{record.employee_name || 'غير محدد'}</td>
                      <td className="border border-border p-2 text-center">{formatCurrency(record.basic_salary)}</td>
                      <td className="border border-border p-2 text-center">{formatCurrency(record.allowances)}</td>
                      <td className="border border-border p-2 text-center">{formatCurrency(record.overtime_amount)}</td>
                      <td className="border border-border p-2 text-center">{formatCurrency(record.deductions)}</td>
                      <td className="border border-border p-2 text-center">{formatCurrency(record.tax_amount)}</td>
                      <td className="border border-border p-2 text-center font-semibold">{formatCurrency(record.net_amount)}</td>
                      <td className="border border-border p-2 text-center">
                        {new Date(record.payroll_date).toLocaleDateString('en-GB')}
                      </td>
                      <td className="border border-border p-2 text-center">
                        <span className={getStatusColor(record.status)}>
                          {getStatusText(record.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات رواتب للفترة المحددة
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <Button onClick={handleExport} disabled={!payrollData || payrollData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}