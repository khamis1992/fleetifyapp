import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, DollarSign, FileText, Download } from 'lucide-react';
import { useHRStatistics } from '@/hooks/useHRReports';
import { formatCurrency } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AttendanceReportModal } from '@/components/hr/reports/AttendanceReportModal';
import { EmployeeReportModal } from '@/components/hr/reports/EmployeeReportModal';
import { PayrollReportModal } from '@/components/hr/reports/PayrollReportModal';

export default function HRReports() {
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const { data: statistics, isLoading: statsLoading } = useHRStatistics();

  const reports = [
    {
      title: 'تقرير الحضور الشهري',
      description: 'تقرير شامل عن حضور الموظفين خلال الشهر',
      icon: Clock,
      color: 'bg-blue-100 text-blue-600',
      onClick: () => setAttendanceModalOpen(true),
    },
    {
      title: 'تقرير الرواتب',
      description: 'تفاصيل رواتب الموظفين والخصومات',
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      onClick: () => setPayrollModalOpen(true),
    },
    {
      title: 'تقرير الموظفين',
      description: 'قائمة بجميع الموظفين ومعلوماتهم',
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
      onClick: () => setEmployeeModalOpen(true),
    },
    {
      title: 'تقرير الإجازات',
      description: 'تفاصيل الإجازات المأخوذة والمتبقية',
      icon: FileText,
      color: 'bg-orange-100 text-orange-600',
      onClick: () => setLeaveModalOpen(true),
    },
  ];

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">تقارير الموارد البشرية</h1>
          <p className="text-muted-foreground">تقارير شاملة عن الموظفين والحضور والرواتب</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={report.onClick}
                >
                  <FileText className="h-4 w-4 ml-2" />
                  عرض التقرير
                </Button>
                <Button 
                  variant="outline"
                  onClick={report.onClick}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>إحصائيات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{statistics?.total_employees || 0}</p>
                <p className="text-sm text-muted-foreground">إجمالي الموظفين</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{statistics?.attendance_rate || 0}%</p>
                <p className="text-sm text-muted-foreground">معدل الحضور</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(statistics?.total_payroll || 0)}</p>
                <p className="text-sm text-muted-foreground">إجمالي الرواتب</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{statistics?.pending_payrolls || 0}</p>
                <p className="text-sm text-muted-foreground">الرواتب المعلقة</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Modals */}
      <AttendanceReportModal 
        open={attendanceModalOpen} 
        onOpenChange={setAttendanceModalOpen} 
      />
      <EmployeeReportModal 
        open={employeeModalOpen} 
        onOpenChange={setEmployeeModalOpen} 
      />
      <PayrollReportModal 
        open={payrollModalOpen} 
        onOpenChange={setPayrollModalOpen} 
      />
    </div>
  );
}