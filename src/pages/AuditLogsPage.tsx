/**
 * Audit Logs Page
 *
 * Redesigned operational view for reviewing sensitive system activity.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAuditLogs } from '@/hooks/useAuditLog';
import { useFleetifyTranslation } from '@/hooks/useTranslation';
import { UserRole } from '@/lib/permissions/roles';
import type {
  AuditLog,
  AuditResourceType,
  AuditSeverity,
  AuditStatus,
} from '@/types/auditLog';
import {
  getAuditActionPresentation,
  getAuditLogStats,
  getAuditSeverityColor,
  getAuditStatusPresentation,
  getAuditUserInitials,
} from './auditLogPresentation';

const PAGE_SIZE = 15;

const ACTION_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: 'CREATE', labelKey: 'create' },
  { value: 'UPDATE', labelKey: 'update' },
  { value: 'DELETE', labelKey: 'delete' },
  { value: 'APPROVE', labelKey: 'approve' },
  { value: 'REJECT', labelKey: 'reject' },
  { value: 'CANCEL', labelKey: 'cancel' },
  { value: 'ARCHIVE', labelKey: 'archive' },
  { value: 'RESTORE', labelKey: 'restore' },
  { value: 'login', labelKey: 'login' },
  { value: 'logout', labelKey: 'logout' },
  { value: 'failed_login', labelKey: 'failedLogin' },
  { value: 'data_export', labelKey: 'dataExport' },
];

const RESOURCE_OPTIONS: Array<{ value: AuditResourceType; labelKey: string }> = [
  { value: 'contract', labelKey: 'contract' },
  { value: 'customer', labelKey: 'customer' },
  { value: 'vehicle', labelKey: 'vehicle' },
  { value: 'invoice', labelKey: 'invoice' },
  { value: 'payment', labelKey: 'payment' },
  { value: 'employee', labelKey: 'employee' },
  { value: 'user', labelKey: 'user' },
];

const STATUS_OPTIONS: Array<{ value: AuditStatus; labelKey: string }> = [
  { value: 'success', labelKey: 'success' },
  { value: 'failed', labelKey: 'failed' },
  { value: 'pending', labelKey: 'pending' },
];

const SEVERITY_OPTIONS: Array<{ value: AuditSeverity; labelKey: string }> = [
  { value: 'low', labelKey: 'low' },
  { value: 'medium', labelKey: 'medium' },
  { value: 'high', labelKey: 'high' },
  { value: 'critical', labelKey: 'critical' },
];

const escapeCsvCell = (value: unknown) =>
  `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function AuditLogsPage() {
  const { t, rtl, formatDateTime, formatNumber } = useFleetifyTranslation('ui');
  const [search, setSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<AuditResourceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(search, 300);
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 300);

  const filters = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    user_search: debouncedEmployeeSearch.trim() || undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    resource_type: resourceFilter !== 'all' ? resourceFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }), [
    debouncedSearch,
    debouncedEmployeeSearch,
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
    debouncedEmployeeSearch.trim(),
    actionFilter !== 'all' ? actionFilter : '',
    resourceFilter !== 'all' ? resourceFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
    severityFilter !== 'all' ? severityFilter : '',
    dateFrom,
    dateTo,
  ].filter(Boolean).length, [
    debouncedSearch,
    debouncedEmployeeSearch,
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
      [
        t('dateTime'),
        t('employee'),
        t('action'),
        t('resourceType'),
        t('entity'),
        t('status'),
        t('severity'),
        t('changes'),
      ],
      ...logs.map((log) => [
        log.created_at ? format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss') : '-',
        log.user_name || log.user_email || '-',
        log.action,
        log.resource_type,
        log.entity_name || '-',
        log.status || '-',
        log.severity || '-',
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
    setEmployeeSearch('');
    setActionFilter('all');
    setResourceFilter('all');
    setStatusFilter('all');
    setSeverityFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const renderStatusBadge = (log: AuditLog) => {
    const status = String(log.status || 'pending').toLowerCase();
    const { StatusIcon, statusColor } = getAuditStatusPresentation(status);
    const statusLabel = STATUS_OPTIONS.some((option) => option.value === status)
      ? t(status)
      : status;

    return (
      <Badge className={`${statusColor} gap-1 border-0 font-medium`}>
        <StatusIcon className="h-3 w-3" />
        {statusLabel}
      </Badge>
    );
  };

  return (
    <RoleGuard roles={[UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN]}>
      <div className="mx-auto w-full max-w-[1500px] space-y-6 p-4 md:p-6">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative overflow-hidden rounded-[28px] border border-[#1E3A5F] bg-[#0F1D33] p-6 text-white shadow-[0_24px_80px_-40px_rgba(15,29,51,0.8)] md:p-8"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.2),transparent_36%)]" />
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-sm text-teal-100 backdrop-blur">
                <ShieldCheck className="h-4 w-4" />
                {t('auditMonitoring')}
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                {t('auditLogs')}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                {t('viewAndTrackAll')}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
                className="h-11 gap-2 rounded-xl border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                {t('refresh')}
              </Button>
              <Button
                type="button"
                onClick={handleExport}
                disabled={logs.length === 0}
                className="h-11 gap-2 rounded-xl bg-teal-400 font-semibold text-[#0F1D33] hover:bg-teal-300"
              >
                <Download className="h-4 w-4" />
                {t('exportCsv')}
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: t('auditTotalEvents'),
              value: formatNumber(stats.total),
              icon: Activity,
              iconClass: 'bg-blue-100 text-blue-700',
            },
            {
              title: t('auditSuccessfulEvents'),
              value: formatNumber(stats.successful),
              icon: CheckCircle,
              iconClass: 'bg-emerald-100 text-emerald-700',
            },
            {
              title: t('auditFailedEvents'),
              value: formatNumber(stats.failed),
              icon: XCircle,
              iconClass: 'bg-red-100 text-red-700',
            },
            {
              title: t('auditEmployeesWithActivity'),
              value: formatNumber(stats.employees),
              icon: Users,
              iconClass: 'bg-violet-100 text-violet-700',
            },
          ].map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className="rounded-3xl border-[#E4E9F2] shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div>
                    <p className="text-sm text-slate-500">{item.title}</p>
                    <p className="mt-2 text-3xl font-black text-[#0F1D33]">{item.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.iconClass}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        <Card className="overflow-hidden rounded-[28px] border-[#E4E9F2] shadow-sm">
          <CardHeader className="border-b border-[#EAF0F6] bg-[#F8FAFC]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0F1D33]">
                  <Filter className="h-5 w-5 text-teal-600" />
                  {t('filters')}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {t('auditFiltersDescription')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {activeFiltersCount > 0 && (
                  <Badge className="rounded-full bg-teal-100 px-3 py-1 text-teal-700 hover:bg-teal-100">
                    {t('auditActiveFilters', { count: activeFiltersCount })}
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  disabled={activeFiltersCount === 0}
                  className="h-10 rounded-xl"
                >
                  {t('clearFilters')}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="employee-search" className="font-semibold text-slate-700">
                  {t('auditEmployeeNameOrEmail')}
                </Label>
                <div className="relative">
                  <User className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                  <Input
                    id="employee-search"
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    placeholder={t('auditEmployeeSearchPlaceholder')}
                    className={`h-12 rounded-xl bg-white ${rtl ? 'pr-10' : 'pl-10'}`}
                  />
                </div>
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="general-search" className="font-semibold text-slate-700">
                  {t('search')}
                </Label>
                <div className="relative">
                  <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                  <Input
                    id="general-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t('auditSearchPlaceholder')}
                    className={`h-12 rounded-xl bg-white ${rtl ? 'pr-10' : 'pl-10'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">{t('action')}</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="h-12 rounded-xl bg-white">
                    <SelectValue placeholder={t('allActions')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allActions')}</SelectItem>
                    {ACTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">{t('resourceType')}</Label>
                <Select value={resourceFilter} onValueChange={(value) => setResourceFilter(value as AuditResourceType)}>
                  <SelectTrigger className="h-12 rounded-xl bg-white">
                    <SelectValue placeholder={t('allResources')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allResources')}</SelectItem>
                    {RESOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">{t('status')}</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AuditStatus)}>
                  <SelectTrigger className="h-12 rounded-xl bg-white">
                    <SelectValue placeholder={t('allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold text-slate-700">{t('severity')}</Label>
                <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as AuditSeverity)}>
                  <SelectTrigger className="h-12 rounded-xl bg-white">
                    <SelectValue placeholder={t('allSeverities')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allSeverities')}</SelectItem>
                    {SEVERITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-from" className="font-semibold text-slate-700">
                  {t('fromDate')}
                </Label>
                <div className="relative">
                  <Calendar className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className={`h-12 rounded-xl bg-white ${rtl ? 'pr-10' : 'pl-10'}`}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to" className="font-semibold text-slate-700">
                  {t('toDate')}
                </Label>
                <div className="relative">
                  <Calendar className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${rtl ? 'right-3' : 'left-3'}`} />
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className={`h-12 rounded-xl bg-white ${rtl ? 'pr-10' : 'pl-10'}`}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[28px] border-[#E4E9F2] shadow-sm">
          <CardHeader className="border-b border-[#EAF0F6] bg-white">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-xl font-black text-[#0F1D33]">
                  {t('auditEvents')}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {t('auditEventsFound', { count: logs.length })}
                </p>
              </div>
              {isFetching && !isLoading && (
                <Badge variant="outline" className="w-fit gap-2 rounded-full px-3 py-1">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {t('refresh')}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-500">
                <Clock className="h-8 w-8 animate-spin text-teal-600" />
                <p>{t('loading')}</p>
              </div>
            )}

            {error && !isLoading && (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-6 text-center text-red-600">
                <AlertCircle className="h-10 w-10" />
                <p className="font-semibold">{t('failedToLoadAudit')}</p>
              </div>
            )}

            {!isLoading && !error && logs.length === 0 && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 p-6 text-center text-slate-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
                <p className="text-lg font-bold text-slate-700">{t('noAuditLogsFound')}</p>
                <p className="max-w-md text-sm">{t('auditNoEventsDescription')}</p>
              </div>
            )}

            {!isLoading && !error && logs.length > 0 && (
              <>
                <ResponsiveTable className="rounded-none border-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                        <TableHead className="min-w-[170px] text-right font-bold text-slate-600">
                          {t('dateTime')}
                        </TableHead>
                        <TableHead className="min-w-[220px] text-right font-bold text-slate-600">
                          {t('employee')}
                        </TableHead>
                        <TableHead className="min-w-[150px] text-right font-bold text-slate-600">
                          {t('action')}
                        </TableHead>
                        <TableHead className="min-w-[190px] text-right font-bold text-slate-600">
                          {t('entity')}
                        </TableHead>
                        <TableHead className="min-w-[130px] text-right font-bold text-slate-600">
                          {t('status')}
                        </TableHead>
                        <TableHead className="min-w-[280px] text-right font-bold text-slate-600">
                          {t('changes')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => {
                        const action = String(log.action || '');
                        const { ActionIcon, actionColor } = getAuditActionPresentation(action);
                        const severity = String(log.severity || 'medium').toLowerCase();
                        const severityLabel = SEVERITY_OPTIONS.some((option) => option.value === severity)
                          ? t(severity)
                          : severity;

                        return (
                          <TableRow key={log.id} className="border-b border-[#EAF0F6] hover:bg-[#FBFDFF]">
                            <TableCell className="whitespace-nowrap py-4">
                              <div className="font-semibold text-[#0F1D33]">
                                {log.created_at ? formatDateTime(log.created_at) : '-'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 rounded-2xl border border-slate-200 bg-slate-100">
                                  <AvatarFallback className="rounded-2xl bg-[#EAF8FE] text-sm font-black text-[#1D7A9A]">
                                    {getAuditUserInitials(log.user_name, log.user_email)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="truncate font-bold text-[#0F1D33]">
                                    {log.user_name || t('unknownUser')}
                                  </div>
                                  <div className="truncate text-xs text-slate-500" dir="ltr">
                                    {log.user_email || '-'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start gap-2">
                                <Badge className={`${actionColor} gap-1 border-0 font-semibold`}>
                                  <ActionIcon className="h-3 w-3" />
                                  <span dir="ltr">{action || '-'}</span>
                                </Badge>
                                <Badge variant="outline" className={`${getAuditSeverityColor(severity)} border-0 text-[11px]`}>
                                  {severityLabel}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-[#0F1D33]">
                                  {log.entity_name || '-'}
                                </div>
                                <div className="mt-1 text-xs text-slate-500" dir="ltr">
                                  {log.resource_type || '-'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{renderStatusBadge(log)}</TableCell>
                            <TableCell>
                              <p className="max-w-[420px] truncate text-sm text-slate-600" title={log.changes_summary || ''}>
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
                  <div className="border-t border-[#EAF0F6] p-4">
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
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
