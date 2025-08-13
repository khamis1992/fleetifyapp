import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download } from 'lucide-react';
import { useAttendanceReport, exportHRReportToHTML } from '@/hooks/useHRReports';

import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface AttendanceReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceReportModal({ open, onOpenChange }: AttendanceReportModalProps) {
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

  const { data: attendanceData, isLoading, error } = useAttendanceReport(startDate, endDate);

  const handleExport = () => {
    if (!attendanceData) return;

    const tableContent = `
      <table>
        <thead>
          <tr>
            <th>رقم الموظف</th>
            <th>اسم الموظف</th>
            <th>إجمالي الأيام</th>
            <th>أيام الحضور</th>
            <th>أيام الغياب</th>
            <th>أيام التأخير</th>
            <th>إجمالي الساعات</th>
            <th>ساعات إضافية</th>
            <th>معدل الحضور</th>
          </tr>
        </thead>
        <tbody>
          ${attendanceData.map(record => `
            <tr>
              <td>${record.employee_number}</td>
              <td>${record.employee_name || 'غير محدد'}</td>
              <td class="text-center">${record.total_days}</td>
              <td class="text-center">${record.present_days}</td>
              <td class="text-center">${record.absent_days}</td>
              <td class="text-center">${record.late_days}</td>
              <td class="text-center">${record.total_hours.toFixed(1)}</td>
              <td class="text-center">${record.overtime_hours.toFixed(1)}</td>
              <td class="text-center">${record.attendance_rate.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    exportHRReportToHTML(
      tableContent,
      `تقرير الحضور الشهري - من ${startDate} إلى ${endDate}`,
      'شركة الأعمال'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            تقرير الحضور الشهري
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

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              خطأ في تحميل البيانات: {error.message}
            </div>
          ) : attendanceData && attendanceData.length > 0 ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-2 text-right">رقم الموظف</th>
                    <th className="border border-border p-2 text-right">اسم الموظف</th>
                    <th className="border border-border p-2 text-center">إجمالي الأيام</th>
                    <th className="border border-border p-2 text-center">أيام الحضور</th>
                    <th className="border border-border p-2 text-center">أيام الغياب</th>
                    <th className="border border-border p-2 text-center">أيام التأخير</th>
                    <th className="border border-border p-2 text-center">إجمالي الساعات</th>
                    <th className="border border-border p-2 text-center">ساعات إضافية</th>
                    <th className="border border-border p-2 text-center">معدل الحضور</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceData.map((record, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="border border-border p-2">{record.employee_number}</td>
                      <td className="border border-border p-2">{record.employee_name || 'غير محدد'}</td>
                      <td className="border border-border p-2 text-center">{record.total_days}</td>
                      <td className="border border-border p-2 text-center">{record.present_days}</td>
                      <td className="border border-border p-2 text-center">{record.absent_days}</td>
                      <td className="border border-border p-2 text-center">{record.late_days}</td>
                      <td className="border border-border p-2 text-center">{record.total_hours.toFixed(1)}</td>
                      <td className="border border-border p-2 text-center">{record.overtime_hours.toFixed(1)}</td>
                      <td className="border border-border p-2 text-center">
                        <span className={record.attendance_rate >= 90 ? 'text-green-600' : record.attendance_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {record.attendance_rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد بيانات حضور للفترة المحددة
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              إغلاق
            </Button>
            <Button onClick={handleExport} disabled={!attendanceData || attendanceData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}