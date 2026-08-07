/**
 * Audit Logs Page
 *
 * Arabic operational audit screen aligned with Fleetify's redesigned pages.
 */

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  Users,
  XCircle,
} from 'lucide-react';

import { RoleGuard } from '@/components/auth/RoleGuard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pagination } from '@/components/ui/pagination';
import { ResponsiveTable } from '@/components/ui/ResponsiveTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuditEmployeeOptions } from '@/hooks/useAuditEmployeeOptions';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { UserRole } from '@/lib/permissions/roles';
import type {
  AuditResourceType,
  AuditSeverity,
  AuditStatus,
} from '@/types/auditLog';
import {
  getAuditActionLabel,
  getAuditActionPresentation,
  getAuditLogStats,
  getAuditResourceLabel,
  getAuditSeverityColor,
  getAuditSeverityLabel,
  getAuditStatusLabel,
  getAuditStatusPresentation,
  getAuditUserInitials,
} from './auditLogPresentation';

const PAGE_SIZE = 15;

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'CREATE', label: 'إنشاء' },
  { value: 'UPDATE', label: 'تحديث' },
  { value: 'DELETE', label: 'حذف' },
  { value: 'APPROVE', label: 'اعتماد' },
  { value: 'REJECT', label: 'رفض' },
  { value: 'CANCEL', label: 'إلغاء' },
  { value: 'ARCHIVE', label: 'أرشفة' },
  { value: 'RESTORE', label: 'استعادة' },
  { value: 'login', label: 'تسجيل دخول' },
  { value: 'logout', label: 'تسجيل خروج' },
  { value: 'failed_login', label: 'محاولة دخول فاشلة' },
  { value: 'data_export', label: 'تصدير بيانات' },
];

const RESOURCE_OPTIONS: Array<{ value: AuditResourceType; label: string }> = [
  { value: 'contract', label: 'عقد' },
  { value: 'customer', label: 'عميل' },
  { value: 'vehicle', label: 'مركبة' },
  { value: 'invoice', label: 'فاتورة' },
  { value: 'payment', label: 'دفعة' },
  { value: 'employee', label: 'موظف' },
  { value: 'user', label: 'مستخدم' },
];

const STATUS_OPTIONS: Array<{ value: AuditStatus; label: string }> = [
  { value: 'success', label: 'ناجح' },
  { value: 'failed', label: 'فشل' },
  { value: 'pending', label: 'قيد الانتظار' },
];

const SEVERITY_OPTIONS: Array<{ value: AuditSeverity; label: string }> = [
  { value: 'low', label: 'منخفضة' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'high', label: 'عالية' },
  { value: 'critical', label: 'حرجة' },
];

const escapeCsvCell = (value: unknown) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

const formatAuditDateTime = (value?: string | null) => {
  if (!value) return '-';
  return format(new Date(value), 'd MMMM yyyy، h:mm a', { locale: ar });
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<AuditResourceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);
  const {
    data: employeeOptions = [],
    isLoading: isEmployeesLoading,
  } = useAuditEmployeeOptions();

  const filters = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    user_id: selectedEmployeeId !== 'all' ? selectedEmployeeId : undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    resource_type: resourceFilter !== 'all' ? resourceFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [
    debouncedSearch,
    selectedEmployeeId,
    actionFilter,
    resourceFilter,
    statusFilter,
    severityFilter,
    dateFrom,
    dateTo,
  ]);

  const {
    data: auditLogs,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAuditLogs(filters);

  const logs = useMemo(() => auditLogs ?? [], [auditLogs]);
  const stats = useMemo(() => getAuditLogStats(logs), [logs]);
  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));

  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return logs.slice(start, start + PAGE_SIZE);
  }, [currentPage, logs]);

  const activeFiltersCount = useMemo(() => [
    debouncedSearch.trim(),
    selectedEmployeeId !== 'all' ? selectedEmployeeId : '',
    actionFilter !== 'all' ? actionFilter : '',
    resourceFilter !== 'all' ? resourceFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
    severityFilter !== 'all' ? severityFilter : '',
    dateFrom,
    dateTo,
  ].filter(Boolean).length, [
    debouncedSearch,
    selectedEmployeeId,
    actionFilter,
    resourceFilter,
    statusFilter,
    severityFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleExport = () => {
    if (logs.length === 0) return;

    const rows = [
      ['التاريخ والوقت', 'الموظف', 'الإجراء', 'نوع المورد', 'الكيان', 'الحالة', 'درجة الخطورة', 'التغييرات'],
      ...logs.map((log) => [
        log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss') : '-',
        log.user_name || log.user_email || '-',
        getAuditActionLabel(String(log.action || '')),
        getAuditResourceLabel(log.resource_type),
        log.entity_name || '-',
        getAuditStatusLabel(log.status),
        getAuditSeverityLabel(log.severity),
        log.changes_summary || '-',
      ]),
    ];

    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedEmployeeId('all');
    setActionFilter('all');
    setResourceFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const statCards = [
    {
      title: 'إجمالي الأحداث',
      value: stats.total,
      hint: 'ضمن نتائج التصفية الحالية',
      icon: Activity,
      iconClass: 'bg-[#EEF5FB] text-[#173A63]',
    },
    {
      title: 'الأحداث الناجحة',
      value: stats.successful,
      hint: 'عمليات اكتملت بنجاح',
      icon: CheckCircle,
      iconClass: 'bg-[#E8FBF6] text-[#22A382]',
    },
    {
      title: 'الأحداث الفاشلة',
      value: stats.failed,
      hint: 'تحتاج إلى مراجعة',
      icon: XCircle,
      iconClass: 'bg-[#FFF0F2] text-[#D85668]',
    },
    {
      title: 'الموظفون النشطون',
      value: stats.employees,
      hint: 'ظهروا في هذه النتائج',
      icon: Users,
      iconClass: 'bg-[#ECEEFE] text-[#6E76E8]',
    },
  ];

  return (
    <RoleGuard roles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]}>
      <div className="min-h-screen bg-[#F6F8FB]" dir="rtl">
        <header className="border-b border-[#DDE5EF] bg-white">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#173A63] text-white shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#142033]">
                  سجل التدقيق
                </h1>
                <p className="mt-1 text-sm font-medium text-[#6A7688]">
                  متابعة أنشطة الموظفين والعمليات الحساسة داخل النظام
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                className="min-h-[44px] gap-2 border-[#D8E1EC] bg-white text-[#536173] hover:border-[#173A63] hover:bg-[#EEF5FB]"
              >
                <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                تحديث
              </Button>
              <Button
                type="button"
                onClick={handleExport}
                disabled={logs.length === 0}
                className="min-h-[44px] gap-2 bg-[#173A63] text-white shadow-sm hover:bg-[#173A63]/90"
              >
                <Download className="h-4 w-4" />
                تصدير CSV
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-6 sm:px-6">
          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {statCards.map((item) => (
              <div
                key={item.title}
                className="min-h-[118px] rounded-lg border border-[#DDE5EF] bg-white p-4 shadow-sm"
              >
                <div className="flex h-full items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-[#6A7688]">{item.title}</p>
                    <p className="text-3xl font-black text-[#142033]">{item.value}</p>
                    <p className="text-xs font-semibold text-[#8A96A8]">{item.hint}</p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.iconClass}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-[#DDE5EF] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#E5EBF3] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-black text-[#142033]">
                  <Filter className="h-5 w-5 text-[#173A63]" />
                  تصفية النتائج
                </h2>
                <p className="mt-1 text-sm font-medium text-[#6A7688]">
                  رشّح النشاط حسب الموظف أو الإجراء أو المورد أو الحالة أو التاريخ
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Badge className="rounded-full bg-[#EEF5FB] px-3 py-1 text-[#173A63] hover:bg-[#EEF5FB]">
                    {activeFiltersCount} مرشحات نشطة
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                  className="h-10 rounded-lg border-[#D8E1EC] text-[#536173] hover:bg-[#F8FAFC]"
                >
                  مسح المرشحات
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="employee-select" className="font-bold text-[#142033]">
                  اسم الموظف
                </Label>
                <div className="relative">
                  <User className="pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#8A96A8]" />
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                    disabled={isEmployeesLoading}
                  >
                    <SelectTrigger
                      id="employee-select"
                      className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE] pr-10 text-sm focus:border-[#173A63]"
                    >
                      <SelectValue placeholder={isEmployeesLoading ? 'جاري تحميل الموظفين...' : 'جميع الموظفين'} />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">جميع الموظفين</SelectItem>
                      {employeeOptions.map((employee) => (
                        <SelectItem key={employee.id} value={employee.userId}>
                          <span className="flex flex-col gap-0.5">
                            <span className="font-bold">{employee.name}</span>
                            <span className="text-xs text-[#8A96A8]" dir="ltr">{employee.email}</span>
                          </span>
                        </SelectItem>
                      ))}
                      {!isEmployeesLoading && employeeOptions.length === 0 && (
                        <SelectItem value="no-employees" disabled>
                          لا يوجد موظفون نشطون
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="general-search" className="font-bold text-[#142033]">
                  بحث عام
                </Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A96A8]" />
                  <Input
                    id="general-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="ابحث في اسم الكيان أو ملخص التغييرات..."
                    className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE] pr-10 text-sm focus:border-[#173A63]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#142033]">الإجراء</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE]">
                    <SelectValue placeholder="جميع الإجراءات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الإجراءات</SelectItem>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#142033]">نوع المورد</Label>
                <Select value={resourceFilter} onValueChange={(value) => setResourceFilter(value as AuditResourceType)}>
                  <SelectTrigger className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE]">
                    <SelectValue placeholder="جميع الموارد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الموارد</SelectItem>
                    {RESOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#142033]">الحالة</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AuditStatus)}>
                  <SelectTrigger className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE]">
                    <SelectValue placeholder="جميع الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-[#142033]">درجة الخطورة</Label>
                <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as AuditSeverity)}>
                  <SelectTrigger className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE]">
                    <SelectValue placeholder="جميع الدرجات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الدرجات</SelectItem>
                    {SEVERITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-from" className="font-bold text-[#142033]">
                  من تاريخ
                </Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A96A8]" />
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE] pr-10 text-sm focus:border-[#173A63]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to" className="font-bold text-[#142033]">
                  إلى تاريخ
                </Label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A96A8]" />
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="h-11 rounded-xl border-[#D8E1EC] bg-[#FCFDFE] pr-10 text-sm focus:border-[#173A63]"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-[#DDE5EF] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#E5EBF3] px-4 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-black text-[#142033]">أحداث التدقيق</h2>
                <p className="mt-1 text-sm font-medium text-[#6A7688]">
                  تم العثور على {logs.length} حدث
                </p>
              </div>
              {isFetching && !isLoading && (
                <Badge variant="outline" className="w-fit gap-2 rounded-full border-[#D8E1EC] px-3 py-1 text-[#536173]">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  جاري التحديث
                </Badge>
              )}
            </div>

            {isLoading && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-[#6A7688]">
                <Clock className="h-8 w-8 animate-spin text-[#173A63]" />
                <p className="font-bold">جاري تحميل سجل التدقيق...</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center text-[#D85668]">
                <AlertCircle className="h-10 w-10" />
                <p className="font-black">فشل تحميل سجلات التدقيق</p>
                <p className="text-sm font-semibold text-[#8A96A8]">تحقق من الاتصال ثم أعد المحاولة</p>
              </div>
            )}

            {!isLoading && !error && logs.length === 0 && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#EEF5FB]">
                  <FileText className="h-8 w-8 text-[#173A63]" />
                </div>
                <p className="text-lg font-black text-[#142033]">لا توجد سجلات تدقيق</p>
                <p className="max-w-md text-sm font-medium text-[#6A7688]">
                  جرّب توسيع نطاق التاريخ أو مسح بعض المرشحات لعرض المزيد من النتائج
                </p>
              </div>
            )}

            {!isLoading && !error && logs.length > 0 && (
              <>
                <ResponsiveTable className="rounded-none border-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                        <TableHead className="min-w-[170px] text-right text-xs font-black text-[#142033]">
                          التاريخ والوقت
                        </TableHead>
                        <TableHead className="min-w-[220px] text-right text-xs font-black text-[#142033]">
                          الموظف
                        </TableHead>
                        <TableHead className="min-w-[170px] text-right text-xs font-black text-[#142033]">
                          الإجراء
                        </TableHead>
                        <TableHead className="min-w-[190px] text-right text-xs font-black text-[#142033]">
                          الكيان
                        </TableHead>
                        <TableHead className="min-w-[130px] text-right text-xs font-black text-[#142033]">
                          الحالة
                        </TableHead>
                        <TableHead className="min-w-[280px] text-right text-xs font-black text-[#142033]">
                          التغييرات
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => {
                        const action = String(log.action || '');
                        const { ActionIcon, actionColor } = getAuditActionPresentation(action);
                        const { StatusIcon, statusColor } = getAuditStatusPresentation(log.status);

                        return (
                          <TableRow key={log.id} className="border-b border-[#E5EBF3] hover:bg-[#F8FAFC]">
                            <TableCell className="whitespace-nowrap py-4">
                              <div className="text-sm font-bold text-[#142033]">
                                {formatAuditDateTime(log.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 rounded-lg border border-[#DDE5EF] bg-[#F8FAFC]">
                                  <AvatarFallback className="rounded-lg bg-[#EEF5FB] text-sm font-black text-[#173A63]">
                                    {getAuditUserInitials(log.user_name, log.user_email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-black text-[#142033]">
                                    {log.user_name || 'مستخدم غير معروف'}
                                  </div>
                                  <div className="truncate text-xs font-semibold text-[#8A96A8]" dir="ltr">
                                    {log.user_email || '-'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start gap-2">
                                <Badge className={`${actionColor} gap-1 border-0 font-bold`}>
                                  <ActionIcon className="h-3 w-3" />
                                  {getAuditActionLabel(action)}
                                </Badge>
                                <Badge variant="outline" className={`${getAuditSeverityColor(log.severity)} border-0 text-[11px] font-bold`}>
                                  {getAuditSeverityLabel(log.severity)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-black text-[#142033]">
                                  {log.entity_name || '-'}
                                </div>
                                <div className="mt-1 text-xs font-semibold text-[#8A96A8]">
                                  {getAuditResourceLabel(log.resource_type)}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusColor} gap-1 border-0 font-bold`}>
                                <StatusIcon className="h-3 w-3" />
                                {getAuditStatusLabel(log.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="max-w-[420px] truncate text-sm font-semibold text-[#536173]" title={log.changes_summary || ''}>
                                {log.changes_summary || '-'}
                              </p>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ResponsiveTable>

                {totalPages > 1 && (
                  <div className="border-t border-[#E5EBF3] bg-[#F8FAFC] p-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={logs.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setCurrentPage}
                      showPageSize={false}
                      showTotalItems
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </RoleGuard>
  );
}
