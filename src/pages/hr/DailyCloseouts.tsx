import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AgentReviewButton, AgentReviewVerdictBadge } from '@/components/ai-agents/AgentReviewButton';
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
  contract_activity?: DailyContractActivitySummary | null;
  communications?: {
    phone_calls?: DailyCommunicationItem[];
  } | null;
};

type DailyCommunicationItem = {
  id?: string;
  customerName?: string;
  customer_name?: string;
  contractNumber?: string | null;
  contract_number?: string | null;
  outcome?: string;
  purpose?: string;
  summary?: string;
  followUpDate?: string | null;
  follow_up_date?: string | null;
  durationMinutes?: number | null;
  duration_minutes?: number | null;
  occurredAt?: string | null;
  occurred_at?: string | null;
};

type DailyContractActivityItem = {
  id?: string;
  source?: string;
  label?: string;
  title?: string;
  detail?: string;
  contractNumber?: string | null;
  contract_number?: string | null;
  amount?: number | null;
  occurredAt?: string | null;
  occurred_at?: string | null;
};

type DailyContractActivitySummary = {
  contract_updates?: number;
  contractUpdates?: number;
  status_changes?: number;
  statusChanges?: number;
  payments_registered?: number;
  paymentsRegistered?: number;
  documents_added?: number;
  documentsAdded?: number;
  total_payment_amount?: number;
  totalPaymentAmount?: number;
  items?: DailyContractActivityItem[];
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

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : format(date, 'd MMM yyyy', { locale: ar });
};

const DAILY_CLOSEOUT_CHECKLIST = [
  { key: 'workspace_opened', label: 'تم الدخول إلى مساحة عملي والتأكد من ظهور البيانات' },
  { key: 'page_refreshed', label: 'تم الضغط على تحديث في بداية اليوم' },
  { key: 'metrics_reviewed', label: 'تمت مراجعة بطاقات المؤشرات والمهام المطلوبة' },
  { key: 'priority_started', label: 'تم البدء بالعقود والعملاء ذوي الأولوية الأعلى' },
  { key: 'calls_documented', label: 'تم تنفيذ المكالمات وتوثيق نتائجها المؤثرة' },
  { key: 'payments_verified', label: 'تمت مطابقة العميل والعقد قبل تسجيل أي دفعة' },
  { key: 'followups_scheduled', label: 'تمت جدولة موعد لكل متابعة مؤجلة أو وعد بالدفع' },
  { key: 'notes_added', label: 'تمت إضافة الملاحظات المهمة بوضوح واختصار' },
  { key: 'tasks_completed', label: 'تم تحديد إنجاز المهام المنفذة فعلياً فقط' },
  { key: 'legal_reviewed', label: 'تمت مراجعة الملاحظات والدفعات قبل أي تصعيد قانوني' },
  { key: 'remaining_reviewed', label: 'تمت مراجعة المهام المتبقية في نهاية اليوم' },
  { key: 'report_exported', label: 'تم تحديث الصفحة وتصدير التقرير عند الحاجة' },
];

const beginningMetricLabels = [
  { key: 'priorityCases', fallbackKey: 'priority_cases', label: 'حالات ذات أولوية', tone: 'bg-[#B94E52]' },
  { key: 'todayTasks', fallbackKey: 'today_tasks', label: 'مهام اليوم', tone: 'bg-[#11A37F]' },
  { key: 'totalDue', fallbackKey: 'total_due', label: 'إجمالي المستحقات', tone: 'bg-[#D99B34]', currency: true },
  { key: 'assignedContracts', fallbackKey: 'assigned_contracts', label: 'العقود المسندة', tone: 'bg-[#1D4F7A]' },
  { key: 'customerDataIssues', fallbackKey: 'customer_data_issues', label: 'بيانات عملاء ناقصة', tone: 'bg-[#B45309]' },
];

const emptyDailyContractActivity: Required<DailyContractActivitySummary> = {
  contract_updates: 0,
  contractUpdates: 0,
  status_changes: 0,
  statusChanges: 0,
  payments_registered: 0,
  paymentsRegistered: 0,
  documents_added: 0,
  documentsAdded: 0,
  total_payment_amount: 0,
  totalPaymentAmount: 0,
  items: [],
};

const getRecordValue = (record: Record<string, unknown> | null | undefined, key: string, fallbackKey?: string) => {
  if (!record) return undefined;
  return record[key] ?? (fallbackKey ? record[fallbackKey] : undefined);
};

const formatActivityTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatTime(value);
  return date.toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' });
};

const getActivityNumber = (
  activity: DailyContractActivitySummary | null | undefined,
  snakeKey: keyof DailyContractActivitySummary,
  camelKey: keyof DailyContractActivitySummary,
) => numberValue(activity?.[snakeKey] ?? activity?.[camelKey]);

const humanizeContractOperation = (operationType?: string | null) => {
  const type = String(operationType || '').toLowerCase();
  if (type.includes('status')) return 'تغيير حالة العقد';
  if (type.includes('payment')) return 'تعديل مالي';
  if (type.includes('document')) return 'تحديث مستندات';
  if (type.includes('assign')) return 'تغيير إسناد';
  if (type.includes('update')) return 'تعديل بيانات العقد';
  if (type.includes('create')) return 'إنشاء عقد';
  if (type.includes('cancel')) return 'إلغاء عقد';
  return 'تعديل عقد';
};

export default function DailyCloseouts() {
  const companyFilter = useCompanyFilter();
  const companyId = companyFilter.company_id;
  const today = getLocalIsoDate();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<DailyLogRow | null>(null);
  const hasMissingDate = !dateFrom || !dateTo;
  const hasInvalidDateRange = hasMissingDate || dateFrom > dateTo;
  const isSingleDay = Boolean(dateFrom && dateTo && dateFrom === dateTo);
  const isDailyOverview = isSingleDay && selectedEmployeeId === 'all';

  const logsQuery = useQuery({
    queryKey: ['employee-daily-closeouts', companyId, dateFrom, dateTo, selectedEmployeeId],
    enabled: Boolean(companyId && dateFrom && dateTo && !hasInvalidDateRange),
    queryFn: async (): Promise<DailyLogRow[]> => {
      if (!companyId) return [];
      let query = (supabase as any)
        .from('employee_daily_workspace_logs')
        .select('*')
        .eq('company_id', companyId)
        .gte('log_date', dateFrom)
        .lte('log_date', dateTo);

      if (selectedEmployeeId !== 'all') {
        query = query.eq('employee_profile_id', selectedEmployeeId);
      }

      const { data, error } = await query
        .order('log_date', { ascending: false })
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
        .order('first_name', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  const logs = useMemo(() => logsQuery.data || [], [logsQuery.data]);
  const employees = employeesQuery.data || [];
  const selectedLogEmployee = selectedLog
    ? employees.find((employee) => employee.id === selectedLog.employee_profile_id)
    : null;
  const filteredEmployee = selectedEmployeeId === 'all'
    ? null
    : employees.find((employee) => employee.id === selectedEmployeeId) || null;

  const selectedActivityQuery = useQuery({
    queryKey: [
      'daily-closeout-contract-activity-detail',
      companyId,
      selectedLog?.id,
      selectedLog?.employee_profile_id,
      selectedLogEmployee?.user_id,
      selectedLog?.log_date,
    ],
    enabled: Boolean(companyId && selectedLog?.employee_profile_id && selectedLog?.log_date),
    queryFn: async (): Promise<DailyContractActivitySummary> => {
      if (!companyId || !selectedLog?.employee_profile_id || !selectedLog.log_date) return emptyDailyContractActivity;

      let employeeUserId = selectedLogEmployee?.user_id || null;
      if (!employeeUserId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('id', selectedLog.employee_profile_id)
          .maybeSingle();

        if (profileError) throw profileError;
        employeeUserId = profile?.user_id || null;
      }

      const dayStart = `${selectedLog.log_date}T00:00:00`;
      const dayEnd = `${selectedLog.log_date}T23:59:59`;

      const [operationsResult, documentsResult, paymentsResult] = await Promise.all([
        (supabase as any)
          .from('contract_operations_log')
          .select('id, contract_id, operation_type, operation_details, old_values, new_values, notes, performed_at, performed_by')
          .eq('company_id', companyId)
          .eq('performed_by', selectedLog.employee_profile_id)
          .gte('performed_at', dayStart)
          .lte('performed_at', dayEnd),
        employeeUserId
          ? (supabase as any)
            .from('contract_documents')
            .select('id, contract_id, document_name, document_type, uploaded_at, created_at, uploaded_by')
            .eq('company_id', companyId)
            .eq('uploaded_by', employeeUserId)
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd)
          : Promise.resolve({ data: [], error: null }),
        employeeUserId
          ? (supabase as any)
            .from('payments')
            .select('id, contract_id, payment_number, amount, payment_status, payment_date, created_at, created_by')
            .eq('company_id', companyId)
            .eq('created_by', employeeUserId)
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (operationsResult.error) throw operationsResult.error;
      if (documentsResult.error) throw documentsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const operations = operationsResult.data || [];
      const documents = documentsResult.data || [];
      const payments = paymentsResult.data || [];
      const activityContractIds = Array.from(new Set(
        [...operations, ...documents, ...payments]
          .map((item: any) => item.contract_id)
          .filter(Boolean),
      ));

      const contractsById = new Map<string, string>();
      if (activityContractIds.length > 0) {
        const { data: activityContracts, error: contractsError } = await supabase
          .from('contracts')
          .select('id, contract_number')
          .eq('company_id', companyId)
          .in('id', activityContractIds);

        if (contractsError) throw contractsError;
        (activityContracts || []).forEach((contract) => {
          contractsById.set(contract.id, contract.contract_number || contract.id);
        });
      }

      const operationItems: DailyContractActivityItem[] = operations.map((operation: any) => {
        const oldValues = operation.old_values || {};
        const newValues = operation.new_values || {};
        const changedFields = Object.keys(newValues).filter((key) => oldValues?.[key] !== newValues?.[key]);
        const label = humanizeContractOperation(operation.operation_type);
        const detail = changedFields.length > 0
          ? `الحقول: ${changedFields.slice(0, 4).join('، ')}`
          : operation.notes || operation.operation_details?.description || 'تم تسجيل تعديل على العقد';

        return {
          id: `operation-${operation.id}`,
          source: 'contract_operation',
          label,
          title: `${label}${contractsById.get(operation.contract_id) ? ` - ${contractsById.get(operation.contract_id)}` : ''}`,
          detail,
          contractNumber: contractsById.get(operation.contract_id),
          amount: null,
          occurredAt: operation.performed_at,
        };
      });

      const documentItems: DailyContractActivityItem[] = documents.map((document: any) => ({
        id: `document-${document.id}`,
        source: 'document',
        label: 'إضافة مستند',
        title: `إضافة مستند${contractsById.get(document.contract_id) ? ` - ${contractsById.get(document.contract_id)}` : ''}`,
        detail: document.document_name || document.document_type || 'مستند عقد',
        contractNumber: contractsById.get(document.contract_id),
        amount: null,
        occurredAt: document.uploaded_at || document.created_at,
      }));

      const paymentItems: DailyContractActivityItem[] = payments.map((payment: any) => ({
        id: `payment-${payment.id}`,
        source: 'payment',
        label: 'تسجيل دفعة',
        title: `تسجيل دفعة${contractsById.get(payment.contract_id) ? ` - ${contractsById.get(payment.contract_id)}` : ''}`,
        detail: `${payment.payment_number || 'دفعة'} - ${payment.payment_status || 'بدون حالة'}`,
        contractNumber: contractsById.get(payment.contract_id),
        amount: Number(payment.amount || 0),
        occurredAt: payment.created_at || payment.payment_date,
      }));

      const items = [...operationItems, ...documentItems, ...paymentItems]
        .sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime());

      return {
        contract_updates: operationItems.length,
        contractUpdates: operationItems.length,
        status_changes: operations.filter((operation: any) => {
          const type = String(operation.operation_type || '').toLowerCase();
          const oldStatus = operation.old_values?.status;
          const newStatus = operation.new_values?.status;
          return type.includes('status') || oldStatus !== newStatus;
        }).length,
        statusChanges: operations.filter((operation: any) => {
          const type = String(operation.operation_type || '').toLowerCase();
          const oldStatus = operation.old_values?.status;
          const newStatus = operation.new_values?.status;
          return type.includes('status') || oldStatus !== newStatus;
        }).length,
        payments_registered: paymentItems.length,
        paymentsRegistered: paymentItems.length,
        documents_added: documentItems.length,
        documentsAdded: documentItems.length,
        total_payment_amount: paymentItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        totalPaymentAmount: paymentItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        items,
      };
    },
    staleTime: 15_000,
  });

  const selectedActivity = selectedActivityQuery.data
    || selectedLog?.summary?.contract_activity
    || emptyDailyContractActivity;
  const workspaceEmployees = employees.filter((employee) => (
    employee.is_active !== false
    && !managerRoles.has(String(employee.role || '').toLowerCase())
  ));
  const closedEmployeeIds = new Set(logs.filter((log) => log.closed_at).map((log) => log.employee_profile_id));
  const missingEmployees = workspaceEmployees.filter((employee) => !closedEmployeeIds.has(employee.id));

  const stats = useMemo(() => {
    const collected = logs.reduce((sum, log) => sum + numberValue(log.summary?.total_collected), 0);
    const calls = logs.reduce((sum, log) => sum + numberValue(log.summary?.calls_logged), 0);
    const incomplete = logs.filter((log) => log.completion_status === 'incomplete').length;
    const exported = logs.filter((log) => log.summary?.report_exported).length;

    return {
      totalEmployees: workspaceEmployees.length,
      totalCloseouts: logs.length,
      closed: logs.filter((log) => Boolean(log.closed_at)).length,
      completed: logs.filter((log) => log.completion_status === 'completed').length,
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
      ['الموظف', 'التاريخ', 'وقت الإقفال', 'الحالة', 'المحصل', 'بيانات ناقصة', 'المكالمات', 'وعود الدفع', 'المتابعات', 'المعوقات'],
      ...filteredLogs.map((log) => [
        log.employee_name,
        log.log_date,
        formatClosedAt(log.closed_at),
        log.completion_status === 'completed' ? 'مكتمل' : 'غير مكتمل',
        numberValue(log.summary?.total_collected),
        numberValue(getRecordValue(log.beginning_metrics, 'customerDataIssues', 'customer_data_issues')),
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
    const employeeSuffix = filteredEmployee
      ? `-${getEmployeeName(filteredEmployee)
        .replace(/[\\/:*?"<>|%]+/g, '')
        .trim()
        .replace(/\s+/g, '-')}`
      : '';
    link.download = `employee-daily-closeouts-${dateFrom}-to-${dateTo}${employeeSuffix}.csv`;
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="space-y-1 text-xs font-bold text-[#64748B]">
              <span>من تاريخ</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                max={dateTo || undefined}
                required
                className={cn(hrFieldClassName, 'w-full sm:w-44')}
              />
            </label>
            <label className="space-y-1 text-xs font-bold text-[#64748B]">
              <span>إلى تاريخ</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                min={dateFrom || undefined}
                required
                className={cn(hrFieldClassName, 'w-full sm:w-44')}
              />
            </label>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-slate-200"
              onClick={() => logsQuery.refetch()}
              disabled={hasInvalidDateRange}
            >
              <RefreshCw className={cn('ml-2 h-4 w-4', logsQuery.isFetching && 'animate-spin')} />
              تحديث
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {isDailyOverview ? (
          <>
            <HRMetricCard title="أقفلوا اليوم" value={`${stats.closed}/${stats.totalEmployees || '-'}`} subtitle="من موظفي مساحة العمل" icon={CheckCircle2} tone="success" />
            <HRMetricCard title="لم يقفلوا" value={stats.missing} subtitle="يحتاج متابعة قبل نهاية الدوام" icon={UserX} tone={stats.missing > 0 ? 'danger' : 'neutral'} />
            <HRMetricCard title="إجمالي التحصيل" value={formatCurrency(stats.collected)} subtitle={`${stats.exported} تقرير جاهز للطباعة`} icon={WalletCards} tone="focus" />
            <HRMetricCard title="نشاط اليوم" value={`${stats.calls} مكالمة`} subtitle={`${stats.incomplete} إقفال غير مكتمل`} icon={Clock} tone="info" />
          </>
        ) : (
          <>
            <HRMetricCard
              title="عدد الإقفالات"
              value={stats.totalCloseouts}
              subtitle={filteredEmployee ? getEmployeeName(filteredEmployee) : 'جميع الموظفين'}
              icon={ClipboardCheck}
              tone="success"
            />
            <HRMetricCard
              title="الإقفالات المكتملة"
              value={stats.completed}
              subtitle={`${stats.incomplete} إقفال غير مكتمل`}
              icon={CheckCircle2}
              tone={stats.incomplete > 0 ? 'info' : 'success'}
            />
            <HRMetricCard title="إجمالي التحصيل" value={formatCurrency(stats.collected)} subtitle="ضمن الفترة المحددة" icon={WalletCards} tone="focus" />
            <HRMetricCard title="نشاط الفترة" value={`${stats.calls} مكالمة`} subtitle={`${stats.exported} تقرير جاهز للطباعة`} icon={Clock} tone="info" />
          </>
        )}
      </div>

      <HRSectionCard>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-[#020617]">سجل الإقفالات</h2>
            <p className="mt-1 text-sm text-[#64748B]">
              {hasMissingDate
                ? 'حدد الفترة الزمنية'
                : isSingleDay
                ? format(new Date(`${dateFrom}T00:00:00`), 'EEEE d MMMM yyyy', { locale: ar })
                : `من ${formatDateLabel(dateFrom)} إلى ${formatDateLabel(dateTo)}`}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className={cn(hrFieldClassName, 'sm:w-64')}>
                <SelectValue placeholder="اختر الموظف" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">جميع الموظفين</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {getEmployeeName(employee)}
                    {employee.is_active === false ? ' (غير نشط)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute right-3 top-3.5 h-4 w-4 text-[#94A3B8]" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ابحث باسم الموظف أو المعوقات..."
                className={cn(hrFieldClassName, 'pr-9 sm:w-72')}
              />
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-xl border-slate-200"
              onClick={exportCsv}
              disabled={hasInvalidDateRange || filteredLogs.length === 0}
            >
              <Download className="ml-2 h-4 w-4" />
              تصدير
            </Button>
          </div>
        </div>

        {hasInvalidDateRange ? (
          <div className="border-t border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {hasMissingDate
              ? 'حدد تاريخ البداية وتاريخ النهاية لعرض الإقفالات.'
              : 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.'}
          </div>
        ) : logsQuery.isError ? (
          <div className="border-t border-red-100 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            تعذر تحميل الإقفالات ضمن الفترة المحددة. حاول التحديث مرة أخرى.
          </div>
        ) : isLoading ? (
          <div className="p-10">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#F6F8FB]">
                  <TableHead className="text-right">الموظف</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">وقت الإقفال</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التحصيل</TableHead>
                  <TableHead className="text-right">بيانات ناقصة</TableHead>
                  <TableHead className="text-right">المكالمات</TableHead>
                  <TableHead className="text-right">وعود الدفع</TableHead>
                  <TableHead className="text-right">المعوقات</TableHead>
                  <TableHead className="text-right">الإجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-32 text-center text-[#64748B]">
                      لا توجد إقفالات محفوظة ضمن الموظف والفترة المحددين.
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
                    <TableCell>
                      {formatDateLabel(log.log_date)}
                    </TableCell>
                    <TableCell>{formatClosedAt(log.closed_at)}</TableCell>
                    <TableCell>
                      <Badge className={log.completion_status === 'completed' ? 'bg-[#E8FBF6] text-[#0D876A] hover:bg-[#E8FBF6]' : 'bg-[#FFF6E5] text-[#9A5B00] hover:bg-[#FFF6E5]'}>
                        {log.completion_status === 'completed' ? 'مكتمل' : 'غير مكتمل'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-black">{formatCurrency(numberValue(log.summary?.total_collected))}</TableCell>
                    <TableCell>
                      {numberValue(getRecordValue(log.beginning_metrics, 'customerDataIssues', 'customer_data_issues')) > 0 ? (
                        <Badge className="border border-amber-200 bg-amber-50 font-black text-amber-800 hover:bg-amber-50">
                          {numberValue(getRecordValue(log.beginning_metrics, 'customerDataIssues', 'customer_data_issues'))}
                        </Badge>
                      ) : (
                        <span className="text-[#94A3B8]">0</span>
                      )}
                    </TableCell>
                    <TableCell>{numberValue(log.summary?.calls_logged)}</TableCell>
                    <TableCell>{numberValue(log.summary?.payment_promises)}</TableCell>
                    <TableCell className="max-w-xs truncate">{log.blockers || 'لا توجد'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => setSelectedLog(log)}>
                          عرض التفاصيل
                        </Button>
                        <AgentReviewVerdictBadge agentType="daily_closeout" entityId={log.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </HRSectionCard>

      {isDailyOverview && missingEmployees.length > 0 && (
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
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0" dir="rtl">
          {selectedLog && (
            <>
              <DialogHeader className="border-b border-slate-200 px-5 py-4">
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-[#22C7A1]" />
                  إقفال يوم {selectedLog.employee_name}
                </DialogTitle>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <DialogDescription>
                    {selectedLog.log_date}، من {formatTime(selectedLog.start_time)} إلى {formatTime(selectedLog.end_time)}
                  </DialogDescription>
                  <AgentReviewButton
                    agentType="daily_closeout"
                    body={{ logId: selectedLog.id }}
                    entityId={selectedLog.id}
                    label="تدقيق الوكيل للإقفال"
                    title={`تدقيق إقفال ${selectedLog.employee_name}`}
                  />
                </div>
              </DialogHeader>
              <DailyCloseoutReport
                log={selectedLog}
                activity={selectedActivity}
                activityLoading={selectedActivityQuery.isFetching}
                activityError={selectedActivityQuery.error}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </HRPageShell>
  );
}

function DailyCloseoutReport({
  log,
  activity,
  activityLoading,
  activityError,
}: {
  log: DailyLogRow;
  activity: DailyContractActivitySummary;
  activityLoading: boolean;
  activityError: unknown;
}) {
  const logDate = new Date(`${log.log_date}T00:00:00`);
  const dayNumber = Number.isNaN(logDate.getTime())
    ? log.log_date.slice(-2)
    : String(logDate.getDate()).padStart(2, '0');
  const checklist = log.checklist || {};
  const summary = log.summary || {};
  const activityItems = activity?.items || [];
  const communicationItems = summary.communications?.phone_calls || [];

  const resultCells = [
    ['وعود بالدفع', numberValue(summary.payment_promises)],
    ['لم يتم الرد', numberValue(summary.no_answer_calls)],
    ['تم الرد', numberValue(summary.answered_calls)],
    ['المكالمات موثقة', numberValue(summary.calls_logged)],
    ['ملاحظات مضافة', numberValue(summary.notes_added)],
    ['مواعيد متابعة', numberValue(summary.followups_scheduled)],
    ['إجمالي المحصل', formatCurrency(numberValue(summary.total_collected))],
    ['دفعات مسجلة', numberValue(summary.payments_registered)],
    ['تقرير مصدر', summary.report_exported ? 'نعم' : 'لا'],
    ['إحالات قانونية', summary.legal_referrals ? 'نعم' : 'لا'],
    ['مهام مؤجلة', numberValue(summary.delayed_tasks)],
    ['مهام منجزة', numberValue(summary.completed_tasks)],
  ];

  const activityCells = [
    ['تعديلات العقود', getActivityNumber(activity, 'contract_updates', 'contractUpdates')],
    ['تغييرات الحالة', getActivityNumber(activity, 'status_changes', 'statusChanges')],
    ['دفعات مسجلة', getActivityNumber(activity, 'payments_registered', 'paymentsRegistered')],
    ['مستندات مضافة', getActivityNumber(activity, 'documents_added', 'documentsAdded')],
    ['إجمالي دفعات النشاط', formatCurrency(getActivityNumber(activity, 'total_payment_amount', 'totalPaymentAmount'))],
  ];

  return (
    <div className="max-h-[78vh] overflow-y-auto bg-[#F3F6FA] px-4 py-5">
      <article className="mx-auto min-h-[920px] max-w-[820px] overflow-hidden bg-white px-8 pb-8 text-[#142033] shadow-sm">
        <div className="-mx-8 mb-5 h-2 bg-[#11A37F]" />

        <header className="grid grid-cols-1 items-center gap-4 border-b-2 border-[#CFD8E3] pb-4 md:grid-cols-[1fr_2fr_1fr]">
          <div className="text-right">
            <p className="text-lg font-black text-[#11A37F]">Fleetify</p>
            <p className="mt-2 text-xs font-bold text-[#8A97AA]">العراف لتأجير السيارات</p>
          </div>
          <div className="text-center">
            <h3 className="text-xl font-black text-[#142033]">سجل العمل اليومي لمساحة عمل الموظف</h3>
            <p className="mt-1 text-sm font-bold text-[#6A7688]">المهمة اليومية: الإقفال والتوثيق قبل نهاية الدوام</p>
          </div>
          <div className="justify-self-end rounded-xl bg-[#142033] px-5 py-4 text-center text-white">
            <span className="block text-xs font-bold text-[#CFD8E3]">اليوم</span>
            <strong className="block text-2xl leading-none">{dayNumber}</strong>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <ReportField label="اسم الموظف" value={log.employee_name} />
          <ReportField label="اليوم" value={dayNumber} />
          <ReportField label="التاريخ" value={log.log_date} />
          <ReportField label="وقت الانتهاء" value={formatTime(log.end_time)} />
          <ReportField label="وقت البدء" value={formatTime(log.start_time)} />
          <ReportField label="القسم / الفريق" value={log.department || log.team || '-'} />
        </section>

        <ReportSection ordinal="أولاً" title="مؤشرات بداية اليوم بعد تحديث الصفحة">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            {beginningMetricLabels.map((item) => {
              const value = getRecordValue(log.beginning_metrics, item.key, item.fallbackKey);
              return (
                <div key={item.key} className="relative rounded-lg border border-[#CFD8E3] bg-white px-3 pb-3 pt-4">
                  <span className={cn('absolute inset-x-0 top-0 h-1 rounded-t-lg', item.tone)} />
                  <p className="text-xs font-black text-[#6A7688]">{item.label}</p>
                  <p className="mt-3 border-b border-[#8A97AA] pb-1 text-sm font-black">
                    {item.currency ? formatCurrency(numberValue(value)) : String(value ?? '-')}
                  </p>
                </div>
              );
            })}
          </div>
        </ReportSection>

        <ReportSection ordinal="ثانياً" title="قائمة تنفيذ المهمة اليومية">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {DAILY_CLOSEOUT_CHECKLIST.map((item) => (
              <div key={item.key} className="flex min-h-9 items-center justify-between gap-3 rounded-md border border-[#CFD8E3] bg-[#F8FAFC] px-3 py-2 text-sm font-bold">
                <span>{item.label}</span>
                <CheckMark checked={Boolean(checklist[item.key])} />
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection ordinal="ثالثاً" title="ملخص نتائج العمل">
          <div className="grid grid-cols-2 border-r border-t border-[#CFD8E3] md:grid-cols-4">
            {resultCells.map(([label, value]) => (
              <div key={label} className="min-h-12 border-b border-l border-[#CFD8E3] px-3 py-2">
                <p className="text-xs font-black text-[#6A7688]">{label}</p>
                <p className="mt-2 border-b border-[#8A97AA] pb-1 text-sm font-black">{value}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        <ReportSection ordinal="رابعاً" title="نتائج الاتصالات وملخصاتها">
          <ReportTable headers={['رقم العقد', 'اسم العميل', 'الغرض', 'النتيجة', 'الملخص', 'المتابعة']}>
            {communicationItems.length > 0 ? communicationItems.slice(0, 10).map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.contractNumber || item.contract_number || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.customerName || item.customer_name || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.purpose || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.outcome || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.summary || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.followUpDate || item.follow_up_date || '-'}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-12 border border-[#CFD8E3] text-center font-black text-[#6A7688]">
                  لا توجد مكالمات محفوظة في هذا الإقفال.
                </TableCell>
              </TableRow>
            )}
          </ReportTable>
        </ReportSection>

        <ReportSection ordinal="خامساً" title="أهم الحالات والإجراءات المنفذة">
          <ReportTable headers={['رقم العقد', 'اسم العميل', 'الإجراء المنفذ', 'النتيجة / المبلغ', 'المتابعة القادمة']}>
            {Array.from({ length: 4 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="h-10 border border-[#CFD8E3] font-bold">{index === 0 ? log.key_cases || '' : ''}</TableCell>
                <TableCell className="border border-[#CFD8E3]" />
                <TableCell className="border border-[#CFD8E3]" />
                <TableCell className="border border-[#CFD8E3]" />
                <TableCell className="border border-[#CFD8E3]" />
              </TableRow>
            ))}
          </ReportTable>
        </ReportSection>

        <ReportSection ordinal="سادساً" title="نشاط العقود والملفات المحتسب من النظام">
          {activityLoading && (
            <div className="mb-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">
              جارٍ تحديث تفاصيل تعديلات العقود والدفعات والمستندات من النظام...
            </div>
          )}
          {Boolean(activityError) && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">
              تعذر جلب النشاط المباشر، لذلك تم عرض النشاط المحفوظ داخل سجل الإقفال إن وجد.
            </div>
          )}
          <div className="mb-2 grid grid-cols-1 border-r border-t border-[#CFD8E3] md:grid-cols-5">
            {activityCells.map(([label, value]) => (
              <div key={label} className="min-h-12 border-b border-l border-[#CFD8E3] px-3 py-2">
                <p className="text-xs font-black text-[#6A7688]">{label}</p>
                <p className="mt-2 border-b border-[#8A97AA] pb-1 text-sm font-black">{value}</p>
              </div>
            ))}
          </div>
          <ReportTable headers={['رقم العقد', 'نوع العملية', 'التفاصيل', 'المبلغ', 'الوقت']}>
            {activityItems.length > 0 ? activityItems.slice(0, 10).map((item, index) => (
              <TableRow key={item.id || index}>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.contractNumber || item.contract_number || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.label || item.title || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.detail || '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{item.amount ? formatCurrency(item.amount) : '-'}</TableCell>
                <TableCell className="border border-[#CFD8E3] font-bold">{formatActivityTime(item.occurredAt || item.occurred_at)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-12 border border-[#CFD8E3] text-center font-black text-[#6A7688]">
                  لا توجد تعديلات عقود أو دفعات أو مستندات مسجلة لهذا الموظف اليوم.
                </TableCell>
              </TableRow>
            )}
          </ReportTable>
        </ReportSection>

        <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <ReportNote title="حالات تحتاج مراجعة المدير / القانونية" value={log.legal_review_cases} />
          <ReportNote title="معوقات أو أخطاء بالنظام" value={log.blockers} />
        </section>

        <section className="mt-4 rounded-lg border-2 border-[#A6C6DB] bg-[#EEF7FD] p-4">
          <h4 className="text-base font-black">اعتماد إقفال المهمة اليومية</h4>
          <div className="mt-3 grid grid-cols-1 gap-3 text-xs font-black text-[#6A7688] md:grid-cols-3">
            <ApprovalCheck label="وثقت الإجراءات المهمة داخل النظام" checked />
            <ApprovalCheck label="حدثت مساحة العمل" checked={Boolean(summary.report_exported)} />
            <ApprovalCheck label="راجعت المهام المتبقية" checked={Boolean(checklist.remaining_reviewed)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-black">
            <span>حالة المهمة:</span>
            <ApprovalCheck label="مكتملة" checked={log.completion_status === 'completed'} />
            <ApprovalCheck label="غير مكتملة" checked={log.completion_status === 'incomplete'} />
            <span>سبب عدم الاكتمال:</span>
            <span className="min-w-40 flex-1 border-b border-[#8A97AA] pb-1">{log.incomplete_reason || ''}</span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-5 text-sm font-black text-[#142033] md:grid-cols-3">
            <div className="border-b border-[#8A97AA] pb-1">توقيع الموظف</div>
            <div className="border-b border-[#8A97AA] pb-1">اعتماد / أحرف المشرف</div>
            <div className="border-b border-[#8A97AA] pb-1">وقت الاستلام: {formatClosedAt(log.closed_at)}</div>
          </div>
        </section>

        <footer className="mt-16 flex justify-between border-t border-[#CFD8E3] pt-3 text-xs font-bold text-[#6A7688]">
          <span>Fleetify ERP</span>
          <span>سجل إقفال يومي محفوظ من النظام</span>
        </footer>
      </article>
    </div>
  );
}

function ReportSection({ ordinal, title, children }: { ordinal: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-end gap-3 border-t border-[#CFD8E3] pt-2">
        <span className="rounded-full bg-[#142033] px-4 py-2 text-xs font-black text-white">{ordinal}</span>
        <h4 className="text-base font-black text-[#142033]">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function ReportField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-h-11 rounded-lg border border-[#CFD8E3] bg-white px-3 py-2">
      <p className="text-left text-xs font-black text-[#6A7688]">{label}</p>
      <p className="mt-2 border-b border-[#8A97AA] pb-1 text-sm font-black">{value}</p>
    </div>
  );
}

function ReportTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <Table className="table-fixed border-collapse">
      <TableHeader>
        <TableRow>
          {headers.map((header) => (
            <TableHead key={header} className="border border-[#CFD8E3] bg-[#142033] text-center font-black text-white">
              {header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}

function ReportNote({ title, value }: { title: string; value?: string | null }) {
  return (
    <div className="min-h-20 rounded-lg border border-[#CFD8E3] p-3">
      <h4 className="text-left text-xs font-black text-[#142033]">{title}</h4>
      <p className="mt-4 min-h-6 whitespace-pre-wrap border-b border-[#8A97AA] pb-1 text-sm font-bold text-[#334155]">{value || ''}</p>
    </div>
  );
}

function ApprovalCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span>{label}</span>
      <CheckMark checked={checked} />
    </span>
  );
}

function CheckMark({ checked }: { checked: boolean }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[#8A97AA] text-sm font-black text-[#11A37F]">
      {checked ? '✓' : ''}
    </span>
  );
}
