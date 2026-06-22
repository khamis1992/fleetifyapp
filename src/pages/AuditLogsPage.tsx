/**
 * Audit Logs Page
 * 
 * Page to view and filter audit logs for all sensitive operations
 */

import { useState } from 'react';
import { useAuditLogs } from '@/hooks/useAuditLog';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  FileText,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import type { AuditAction, AuditResourceType, AuditStatus, AuditSeverity } from '@/types/auditLog';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
const actionIcons: Record<AuditAction, any> = {
  CREATE: CheckCircle,
  UPDATE: FileText,
  DELETE: XCircle,
  APPROVE: CheckCircle,
  REJECT: XCircle,
  CANCEL: XCircle,
  ARCHIVE: FileText,
  RESTORE: CheckCircle,
  EXPORT: Download,
  IMPORT: Download,
  LOGIN: User,
  LOGOUT: User,
  PERMISSION_CHANGE: Shield,
  ROLE_CHANGE: Shield,
};

const actionColors: Record<AuditAction, string> = {
  CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  APPROVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  REJECT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  CANCEL: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  ARCHIVE: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  RESTORE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  EXPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  IMPORT: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  LOGIN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  LOGOUT: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  PERMISSION_CHANGE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ROLE_CHANGE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const severityColors: Record<AuditSeverity, string> = {
  low: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function AuditLogsPage() {
  const { t } = useFleetifyTranslation("ui");
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditAction | 'all'>('all');
  const [resourceFilter, setResourceFilter] = useState<AuditResourceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filters = {
    search: search || undefined,
    action: actionFilter !== 'all' ? actionFilter : undefined,
    resource_type: resourceFilter !== 'all' ? resourceFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  const { data: auditLogs, isLoading, error } = useAuditLogs(filters);

  const handleExport = () => {
    if (!auditLogs || auditLogs.length === 0) return;

    const csv = [
      ['Date', 'User', 'Action', 'Resource Type', 'Entity', 'Status', 'Changes'].join(','),
      ...auditLogs.map(log => [
        format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user_email || log.user_name || 'Unknown',
        log.action,
        log.resource_type,
        log.entity_name || '-',
        log.status,
        log.changes_summary || '-',
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RoleGuard allowedRoles={['super_admin', 'company_admin']}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("auditLogs")}</h1>
            <p className="text-muted-foreground">{t("viewAndTrackAll")}</p>
          </div>
          <Button onClick={handleExport} disabled={!auditLogs || auditLogs.length === 0}>
            <Download className="mr-2 h-4 w-4" />{t("exportCsv")}</Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />{t("filters")}</CardTitle>
            <CardDescription>
              Filter audit logs by action, resource type, status, and date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">{t("search")}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by user, entity, or changes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Action Filter */}
              <div className="space-y-2">
                <Label htmlFor="action">{t("action")}</Label>
                <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as any)}>
                  <SelectTrigger id="action">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allActions1")}</SelectItem>
                    <SelectItem value="CREATE">{t("create")}</SelectItem>
                    <SelectItem value="UPDATE">{t("update")}</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="APPROVE">{t("approve")}</SelectItem>
                    <SelectItem value="REJECT">{t("reject")}</SelectItem>
                    <SelectItem value="CANCEL">{t("cancel")}</SelectItem>
                    <SelectItem value="ARCHIVE">{t("archive")}</SelectItem>
                    <SelectItem value="RESTORE">{t("restore")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resource Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="resource">{t("resourceType")}</Label>
                <Select value={resourceFilter} onValueChange={(value) => setResourceFilter(value as any)}>
                  <SelectTrigger id="resource">
                    <SelectValue placeholder="All resources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allResources")}</SelectItem>
                    <SelectItem value="contract">{t("contract")}</SelectItem>
                    <SelectItem value="customer">{t("customer")}</SelectItem>
                    <SelectItem value="vehicle">{t("vehicle")}</SelectItem>
                    <SelectItem value="invoice">{t("invoice")}</SelectItem>
                    <SelectItem value="payment">{t("payment")}</SelectItem>
                    <SelectItem value="employee">{t("employee")}</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label htmlFor="status">{t("status")}</Label>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatuses1")}</SelectItem>
                    <SelectItem value="success">{t("success")}</SelectItem>
                    <SelectItem value="failed">{t("failed")}</SelectItem>
                    <SelectItem value="pending">{t("pending")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="date-from">{t("fromDate")}</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="date-to">{t("toDate")}</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setActionFilter('all');
                  setResourceFilter('all');
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >{t("clearFilters")}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("auditTrail")}</CardTitle>
            <CardDescription>
              {auditLogs ? `${auditLogs.length} log entries found` : 'Loading...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="mr-2 h-5 w-5" />{t("failedToLoadAudit")}</div>
            )}

            {!isLoading && !error && auditLogs && auditLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4" />
                <p>{t("noAuditLogsFound")}</p>
              </div>
            )}

            {!isLoading && !error && auditLogs && auditLogs.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dateTime")}</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>{t("action")}</TableHead>
                      <TableHead>{t("resource")}</TableHead>
                      <TableHead>{t("entity")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("changes")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => {
                      const ActionIcon = actionIcons[log.action];
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{log.user_name || 'Unknown'}</div>
                                <div className="text-xs text-muted-foreground">{log.user_email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={actionColors[log.action]}>
                              <ActionIcon className="mr-1 h-3 w-3" />
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.resource_type}</Badge>
                          </TableCell>
                          <TableCell>{log.entity_name || '-'}</TableCell>
                          <TableCell>
                            {log.status === 'success' && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="mr-1 h-3 w-3" />{t("success")}</Badge>
                            )}
                            {log.status === 'failed' && (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="mr-1 h-3 w-3" />{t("failed")}</Badge>
                            )}
                            {log.status === 'pending' && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Clock className="mr-1 h-3 w-3" />{t("pending")}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {log.changes_summary || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
