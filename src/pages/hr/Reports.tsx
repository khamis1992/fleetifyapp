import { useState } from 'react';
import { ArrowUpLeft, CalendarDays, Clock, FileText, RefreshCw, Users, WalletCards } from 'lucide-react';
import { AttendanceReportModal } from '@/components/hr/reports/AttendanceReportModal';
import { EmployeeReportModal } from '@/components/hr/reports/EmployeeReportModal';
import { LeaveReportModal } from '@/components/hr/reports/LeaveReportModal';
import { PayrollReportModal } from '@/components/hr/reports/PayrollReportModal';
import { OperationsMetric, OperationsPanel, OperationsWorkspace } from '@/components/operations/OperationsWorkspace';
import { Button } from '@/components/ui/button';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useHRStatistics } from '@/hooks/useHRReports';

export default function HRReports() {
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const { data: statistics, isLoading, isFetching, error, refetch } = useHRStatistics();
  const { formatCurrency } = useCurrencyFormatter();
  const unavailable = isLoading || !!error || !statistics;
  const month = new Intl.DateTimeFormat('ar-QA', { month: 'long', year: 'numeric' }).format(new Date());
  const reports = [
    { title: 'تقرير الحضور', description: 'راجع حضور الفريق والتأخير وساعات العمل خلال الفترة التي تختارها.', icon: Clock, tags: ['الحضور', 'التأخير', 'ساعات العمل'], onClick: () => setAttendanceModalOpen(true) },
    { title: 'تقرير الرواتب', description: 'اطّلع على تفاصيل الرواتب والخصومات وصافي المستحقات لكل موظف.', icon: WalletCards, tags: ['الرواتب', 'الخصومات', 'صافي المستحق'], onClick: () => setPayrollModalOpen(true) },
    { title: 'تقرير الموظفين', description: 'استعرض بيانات الموظفين وحالتهم الوظيفية في تقرير واحد.', icon: Users, tags: ['البيانات الوظيفية', 'حالة الموظف'], onClick: () => setEmployeeModalOpen(true) },
    { title: 'تقرير الإجازات', description: 'اطّلع على نافذة تقرير الإجازات وحالة توفر بياناته.', icon: FileText, tags: ['بانتظار ربط البيانات'], onClick: () => setLeaveModalOpen(true) },
  ];

  return <OperationsWorkspace section="hrReports" actions={<Button className="opw-secondary" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />تحديث المؤشرات</Button>}>
    <div className="opw-metrics" aria-busy={isLoading}>
      <OperationsMetric label="إجمالي الموظفين" value={unavailable ? '—' : statistics.total_employees} hint="الموظفون المسجلون في النظام" icon={Users} />
      <OperationsMetric label="معدل الحضور" value={unavailable ? '—' : statistics.attendance_rate + '%'} hint={'من سجلات حضور ' + month} icon={Clock} />
      <OperationsMetric label="إجمالي الرواتب" value={unavailable ? '—' : <bdi className="ad-money">{formatCurrency(statistics.total_payroll)}</bdi>} hint={'صافي الرواتب لشهر ' + month} icon={WalletCards} />
      <OperationsMetric label="رواتب مسودة" value={unavailable ? '—' : statistics.pending_payrolls} hint="مسودات الشهر الحالي" icon={FileText} tone="warning" />
    </div>
    {error && <div role="alert" className="ad-notice">تعذر تحميل المؤشرات. يمكنك إعادة المحاولة من زر تحديث المؤشرات.</div>}
    <div className="ad-report-layout">
      <OperationsPanel title="مكتبة التقارير" description="اختر التقرير، ثم حدّد الفترة وراجع النتائج.">
        <div className="ad-report-library">{reports.map((report, index) => <article key={report.title} className="ad-report-card">
          <header><report.icon /><span className="ad-tag">تقرير / {String(index + 1).padStart(2, '0')}</span></header>
          <h3>{report.title}</h3><p>{report.description}</p>
          <ul>{report.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>
          <Button variant="outline" onClick={report.onClick}>فتح {report.title}<ArrowUpLeft size={16} /></Button>
        </article>)}</div>
      </OperationsPanel>
      <aside className="ad-report-guide">
        <OperationsPanel title="من البيانات إلى التقرير" description="ثلاث خطوات للمراجعة والتصدير."><ol><li>اختر التقرير المناسب للبيانات المطلوبة.</li><li>حدّد الفترة والموظفين من داخل نافذة التقرير.</li><li>راجع النتائج، ثم استخدم خيارات التصدير المتاحة.</li></ol></OperationsPanel>
        <div className="ad-notice"><CalendarDays size={21} /><div><strong>{month}</strong>المؤشرات في أعلى الصفحة تلخّص الشهر الحالي. فترة التقرير تُحدّد بشكل مستقل داخل نافذته.</div></div>
      </aside>
    </div>
    <AttendanceReportModal open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen} />
    <EmployeeReportModal open={employeeModalOpen} onOpenChange={setEmployeeModalOpen} />
    <PayrollReportModal open={payrollModalOpen} onOpenChange={setPayrollModalOpen} />
    <LeaveReportModal open={leaveModalOpen} onOpenChange={setLeaveModalOpen} />
  </OperationsWorkspace>;
}
