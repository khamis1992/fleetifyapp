import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  RefreshCw,
  Search,
  UserX,
  Users,
  WalletCards,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useCompanyFilter } from '@/hooks/useCompanyScope';
import { HRMetricCard, HRPageHeader, HRPageShell, HRSectionCard, hrFieldClassName } from '@/components/hr/HRDesignSystem';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn, formatCurrency } from '@/lib/utils';

type DailyLogSummary = {
  calls_logged?: number;
  answered_calls?: number;
  no_answer_calls?: number;
  payment_promises?: number;
  payments_registered?: number;
  total_collected?: number;
  followups_scheduled?: number;
  notes_added?: number;
  completed_tasks?: number;
  delayed_tasks?: number;
  legal_referrals?: boolean;
  report_exported?: boolean;
};

type DailyLogRow = {
  id: string;
  employee_profile_id: string;
  employee_name: string;
  team: string | null;
  department: string | null;
  log_date: string;
  start_time: string | null;
  end_time: string | null;
  beginning_metrics: Record<string, unknown> | null;
  checklist: Record<string, boolean> | null;
  summary: DailyLogSummary | null;
  key_cases: string | null;
  legal_review_cases: string | null;
  blockers: string | null;
  completion_status: 'completed' | 'incomplete';
  incomplete_reason: string | null;
  closed_at: string | null;
};

type EmployeeProfile = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

const managerRoles = new Set(['admin', 'owner', 'super_admin', 'manager', 'company_admin']);

const getLocalIsoDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const numberValue = (value: unknown) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const getEmployeeName = (employee: EmployeeProfile) => [employee.first_name, employee.last_name]
  .filter(Boolean)
  .join(' ')
  .trim() || employee.email || 'موظف غير مسمى';

const formatTime = (value?: string | null) => value ? value.slice(0, 5) : '-';

const formatClosedAt = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' });
};

export default function DailyCloseouts() {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const [selectedDate, setSelectedDate] = useState(getLocalIsoDate);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<DailyLogRow | null>(null);

  const logsQuery = useQuery({
    queryKey: ['employee-daily-closeouts', companyId, selectedDate],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<DailyLogRow[]> => {
      if (!companyId) return [];
      const { data, error } = await (supabase as any)
        .from('employee_daily_workspace_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('log_date', selectedDate)
        .order('closed_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 15_000,
  });

  const employeesQuery = useQuery({
    queryKey: ['daily-closeout-employees', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<EmployeeProfile[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id,user_id,first_name,last_name,email,role,is_active')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const logs = logsQuery.data || [];
  const employees = employeesQuery.data || [];
  const workspaceEmployees = employees.filter((employee) => !managerRoles.has(String(employee.role || '').toLowerCase()));
  const closedEmployeeIds = new Set(logs.filter((log) => log.closed_at).map((log) => log.employee_profile_id));
  const missingEmployees = workspaceEmployees.filter((employee) => !closedEmployeeIds.has(employee.id));

  const stats = useMemo(() => {
    const collected = logs.reduce((sum, log) => sum + numberValue(log.summary?.total_collected), 0);
    const calls = logs.reduce((sum, log) => sum + numberValue(log.summary?.calls_logged), 0);
    const incomplete = logs.filter((log) => log.completion_status === 'incomplete').length;
    const exported = logs.filter((log) => log.summary?.report_exported).length;

    return {
      totalEmployees: workspaceEmployees.length,
      closed: logs.filter((log) => Boolean(log.closed_at)).length,
      missing: missingEmployees.length,
      collected,
      calls,
      incomplete,
      exported,
    };
  }, [logs, missingEmployees.length, workspaceEmployees.length]);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) => [
      log.employee_name,
      log.team,
      log.department,
      log.key_cases,
      log.blockers,
    ].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [logs, search]);

  const exportCsv = () => {
    const rows = [
      ['الموظف', 'التاريخ', 'وقت الإقفال', 'الحالة', 'المحصل', 'المكالمات', 'وعود الدفع', 'المتابعات', 'المعوقات'],
      ...filteredLogs.map((log) => [
        log.employee_name,
        log.log_date,
        formatClosedAt(log.closed_at),
        log.completion_status === 'completed' ? 'مكتمل' : 'غير مكتمل',
        numberValue(log.summary?.total_collected),
        numberValue(log.summary?.calls_logged),
        numberValue(log.summary?.payment_promises),
        numberValue(log.summary?.followups_scheduled),
        log.blockers || '',
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-daily-closeouts-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = logsQuery.isLoading || employeesQuery.isLoading;

  return (
    <HRPageShell>
      <HRPageHeader
        title="إقفالات الموظفين اليومية"
        description="متابعة من أقفل يوم العمل، نتائج التحصيل، المعوقات، والموظفين الذين لم يرسلوا ملخص نهاية اليوم."
        icon={ClipboardCheck}
        badge="متابعة الإدارة"
        action={(
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className={cn(hrFieldClassName, 'w-full sm:w-44')}
            />
            <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={() => logsQuery.refetch()}>
              <RefreshCw className={cn('ml-2 h-4 w-4', logsQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <HRMetricCard title="أقفلوا اليوم" value={`${stats.closed}/${stats.totalEmployees || '-'}`} subtitle="من موظفي مساحة العمل" icon={CheckCircle2} tone="success" />
        <HRMetricCard title="لم يقفلوا" value={stats.missing} subtitle="يحتاج متابعة قبل نهاية الدوام" icon={UserX} tone={stats.missing > 0 ? 'danger' : 'neutral'} />
        <HRMetricCard title="إجمالي التحصيل" value={formatCurrency(stats.collected)} subtitle={`${stats.exported} تقرير جاهز للطباعة`} icon={WalletCards} tone="focus" />
        <HRMetricCard title="نشاط اليوم" value={`${stats.calls} مكالمة`} subtitle={`${stats.incomplete} إقفال غير مكتمل`} icon={Clock} tone="info" />
      </div>

      <HRSectionCard>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#020617]">سجل الإقفالات</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              {format(new Date(`${selectedDate}T00:00:00`), 'EEEE d MMMM yyyy', { locale: ar })}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search className="absolute right-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم الموظف أو المعوقات..."
                className={cn(hrFieldClassName, 'pr-9 sm:w-72')}
              />
            </div>
            <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={exportCsv} disabled={filteredLogs.length === 0}>
              <Download className="ml-2 h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">وقت الإقفال</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التحصيل</TableHead>
                  <TableHead className="text-right">المكالمات</TableHead>
                  <TableHead className="text-right">وعود الدفع</TableHead>
                  <TableHead className="text-right">المعوقات</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-[#64748B]">
                      لا توجد إقفالات محفوظة لهذا التاريخ.
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-[#F6F8FB]/70">
                    <TableCell>
                      <div>
                        <p className="font-black text-[#020617]">{log.employee_name}</p>
                        <p className="text-xs text-[#94A3B8]">{log.team || log.department || 'مساحة العمل'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatClosedAt(log.closed_at)}</TableCell>
                    <TableCell>
                      <Badge className={log.completion_status === 'completed' ? 'bg-[#E8FBF6] text-[#0D876A] hover:bg-[#E8FBF6]' : 'bg-[#FFF6E5] text-[#9A5B00] hover:bg-[#FFF6E5]'}>
                        {log.completion_status === 'completed' ? 'مكتمل' : 'غير مكتمل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black">{formatCurrency(numberValue(log.summary?.total_collected))}</TableCell>
                    <TableCell>{numberValue(log.summary?.calls_logged)}</TableCell>
                    <TableCell>{numberValue(log.summary?.payment_promises)}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.blockers || 'لا توجد'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => setSelectedLog(log)}>
                        عرض التفاصيل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </HRSectionCard>

      {missingEmployees.length > 0 && (
        <HRSectionCard className="border-amber-200 bg-amber-50/40">
          <div className="flex items-start gap-3 p-4">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-amber-950">موظفون لم يقفلوا اليوم</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {missingEmployees.map((employee) => (
                  <Badge key={employee.id} variant="outline" className="border-amber-200 bg-white text-amber-900">
                    <Users className="ml-1 h-3.5 w-3.5" />
                    {getEmployeeName(employee)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </HRSectionCard>
      )}

      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-3xl" dir="rtl">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[#22C7A1]" />
                  إقفال يوم {selectedLog.employee_name}
                </DialogTitle>
                <DialogDescription>
                  {selectedLog.log_date}، من {formatTime(selectedLog.start_time)} إلى {formatTime(selectedLog.end_time)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-3">
                <DetailMetric label="المحصل" value={formatCurrency(numberValue(selectedLog.summary?.total_collected))} />
                <DetailMetric label="المكالمات" value={numberValue(selectedLog.summary?.calls_logged)} />
                <DetailMetric label="المتابعات" value={numberValue(selectedLog.summary?.followups_scheduled)} />
                <DetailMetric label="دفعات مسجلة" value={numberValue(selectedLog.summary?.payments_registered)} />
                <DetailMetric label="مهام مكتملة" value={numberValue(selectedLog.summary?.completed_tasks)} />
                <DetailMetric label="مهام متأخرة" value={numberValue(selectedLog.summary?.delayed_tasks)} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TextBlock title="حالات مهمة" value={selectedLog.key_cases} />
                <TextBlock title="حالات تحتاج مراجعة قانونية" value={selectedLog.legal_review_cases} />
                <TextBlock title="المعوقات" value={selectedLog.blockers} />
                <TextBlock title="سبب عدم الاكتمال" value={selectedLog.incomplete_reason} />
              </div>

              <div className="rounded-lg border border-slate-200 bg-[#F6F8FB] p-4">
                <h4 className="mb-3 flex items-center gap-2 font-black text-[#020617]">
                  <CalendarDays className="h-4 w-4 text-[#38BDF8]" />
                  قائمة التحقق اليومية
                </h4>
                <div className="grid gap-2 md:grid-cols-2">
                  {Object.entries(selectedLog.checklist || {}).map(([key, checked]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                      <span className="text-[#64748B]">{key}</span>
                      <Badge className={checked ? 'bg-[#E8FBF6] text-[#0D876A] hover:bg-[#E8FBF6]' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                        {checked ? 'تم' : 'لم يتم'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </HRPageShell>
  );
}

function DetailMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold text-[#94A3B8]">{label}</p>
      <p className="mt-1 text-lg font-black text-[#020617]">{value}</p>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-bold text-[#94A3B8]">{title}</p>
      <p className="mt-2 min-h-10 whitespace-pre-wrap text-sm leading-6 text-[#334155]">{value || 'لا يوجد'}</p>
    </div>
  );
}
