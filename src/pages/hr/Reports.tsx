import { useState } from "react";
import { BarChart3, Clock, Download, FileText, Users, WalletCards } from "lucide-react";
import { AttendanceReportModal } from "@/components/hr/reports/AttendanceReportModal";
import { EmployeeReportModal } from "@/components/hr/reports/EmployeeReportModal";
import { LeaveReportModal } from "@/components/hr/reports/LeaveReportModal";
import { PayrollReportModal } from "@/components/hr/reports/PayrollReportModal";
import { HRMetricCard, HRPageHeader, HRPageShell, HRSectionCard } from "@/components/hr/HRDesignSystem";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useHRStatistics } from "@/hooks/useHRReports";

export default function HRReports() {
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  const { data: statistics, isLoading: statsLoading } = useHRStatistics();
  const { formatCurrency } = useCurrencyFormatter();

  const reports = [
    {
      title: "تقرير الحضور الشهري",
      description: "مراجعة الحضور، التأخير، وساعات العمل خلال فترة محددة.",
      icon: Clock,
      tone: "info" as const,
      onClick: () => setAttendanceModalOpen(true),
    },
    {
      title: "تقرير الرواتب",
      description: "تفاصيل الرواتب، الخصومات، وصافي المبالغ للموظفين.",
      icon: WalletCards,
      tone: "success" as const,
      onClick: () => setPayrollModalOpen(true),
    },
    {
      title: "تقرير الموظفين",
      description: "قائمة الموظفين ومعلوماتهم الوظيفية والمالية الأساسية.",
      icon: Users,
      tone: "focus" as const,
      onClick: () => setEmployeeModalOpen(true),
    },
    {
      title: "تقرير الإجازات",
      description: "تفاصيل الإجازات المستخدمة والمتبقية وحالات الطلبات.",
      icon: FileText,
      tone: "danger" as const,
      onClick: () => setLeaveModalOpen(true),
    },
  ];

  return (
    <HRPageShell>
      <HRPageHeader
        title="تقارير الموارد البشرية"
        description="مركز تقارير تشغيلي للحضور، الرواتب، الموظفين، والإجازات مع مؤشرات سريعة قبل التصدير."
        icon={BarChart3}
        badge="التقارير"
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {statsLoading ? (
          <HRSectionCard className="col-span-full p-8">
            <LoadingSpinner />
          </HRSectionCard>
        ) : (
          <>
            <HRMetricCard title="إجمالي الموظفين" value={statistics?.total_employees || 0} icon={Users} tone="info" />
            <HRMetricCard title="معدل الحضور" value={`${statistics?.attendance_rate || 0}%`} icon={Clock} tone="success" />
            <HRMetricCard title="إجمالي الرواتب" value={formatCurrency(statistics?.total_payroll || 0)} icon={WalletCards} tone="focus" />
            <HRMetricCard title="الرواتب المعلقة" value={statistics?.pending_payrolls || 0} icon={FileText} tone="danger" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <HRSectionCard key={report.title} className="transition hover:border-[#22C7A1]/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6F8FB] text-[#22C7A1]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#020617]">{report.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#94A3B8]">{report.description}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex gap-2">
                  <Button variant="outline" className="h-11 flex-1 rounded-xl border-slate-200" onClick={report.onClick}>
                    <FileText className="h-4 w-4 ml-2" />
                    عرض التقرير
                  </Button>
                  <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={report.onClick}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </HRSectionCard>
          );
        })}
      </div>

      <AttendanceReportModal open={attendanceModalOpen} onOpenChange={setAttendanceModalOpen} />
      <EmployeeReportModal open={employeeModalOpen} onOpenChange={setEmployeeModalOpen} />
      <PayrollReportModal open={payrollModalOpen} onOpenChange={setPayrollModalOpen} />
      <LeaveReportModal open={leaveModalOpen} onOpenChange={setLeaveModalOpen} />
    </HRPageShell>
  );
}
