import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { useLeaveReport, exportHRReportToHTML } from '@/hooks/useHRReports';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface LeaveReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LeaveReportModal({ open, onOpenChange }: LeaveReportModalProps) {
  const { data: leaveData, isLoading, error } = useLeaveReport();

  const handleExport = () => {
    if (!leaveData || leaveData.length === 0) return;

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>رقم الموظف</th>
            <th>اسم الموظف</th>
            <th>نوع الإجازة</th>
            <th>من تاريخ</th>
            <th>إلى تاريخ</th>
            <th>عدد الأيام</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${leaveData.map(record => `
            <tr>
              <td>${record.employee_number || '-'}</td>
              <td>${record.employee_name || '-'}</td>
              <td>${record.leave_type || '-'}</td>
              <td>${record.start_date || '-'}</td>
              <td>${record.end_date || '-'}</td>
              <td class="text-center">${record.days_count || 0}</td>
              <td>${record.status || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    exportHRReportToHTML(
      tableContent,
      'تقرير الإجازات',
      'شركة الأعمال'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تقرير الإجازات
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
          ) : leaveData && leaveData.length > 0 ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-right">رقم الموظف</th>
                    <th className="border border-border p-2 text-right">اسم الموظف</th>
                    <th className="border border-border p-2 text-right">نوع الإجازة</th>
                    <th className="border border-border p-2 text-center">من تاريخ</th>
                    <th className="border border-border p-2 text-center">إلى تاريخ</th>
                    <th className="border border-border p-2 text-center">عدد الأيام</th>
                    <th className="border border-border p-2 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveData.map((record, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="border border-border p-2">{record.employee_number || '-'}</td>
                      <td className="border border-border p-2">{record.employee_name || '-'}</td>
                      <td className="border border-border p-2">{record.leave_type || '-'}</td>
                      <td className="border border-border p-2 text-center">{record.start_date || '-'}</td>
                      <td className="border border-border p-2 text-center">{record.end_date || '-'}</td>
                      <td className="border border-border p-2 text-center">{record.days_count || 0}</td>
                      <td className="border border-border p-2 text-center">
                        <span className={
                          record.status === 'approved' ? 'text-green-600' : 
                          record.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                        }>
                          {record.status === 'approved' ? 'موافق' : 
                           record.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات إجازات
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <Button onClick={handleExport} disabled={!leaveData || leaveData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
