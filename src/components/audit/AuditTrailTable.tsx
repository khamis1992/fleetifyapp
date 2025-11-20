/**
 * Audit Trail Table Component
 * Displays audit logs in a filterable, searchable table format
 */

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Eye,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FinancialAuditLog } from '@/types/auditLog';
import { format } from 'date-fns';
import { AuditLogDetailsDialog } from './AuditLogDetailsDialog';

interface AuditTrailTableProps {
  logs: FinancialAuditLog[];
  isLoading: boolean;
  totalCount: number;
  onRefresh: () => void;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

const ITEMS_PER_PAGE = 20;

export function AuditTrailTable({
  logs,
  isLoading,
  totalCount,
  onRefresh,
  pageSize = ITEMS_PER_PAGE,
  currentPage = 1,
  onPageChange
}: AuditTrailTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<FinancialAuditLog | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof FinancialAuditLog;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Filter logs based on search term
  const filteredLogs = logs.filter(log =>
    Object.values(log).some(value =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Sort logs
  const sortedLogs = React.useMemo(() => {
    if (!sortConfig) return filteredLogs;

    return [...filteredLogs].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredLogs, sortConfig]);

  const handleSort = (key: keyof FinancialAuditLog) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + pageSize);

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Trail</CardTitle>
              <p className="text-sm text-muted-foreground">
                {totalCount} total records
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit trail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <Filter className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('created_at')}
                      className="h-auto p-0 font-semibold"
                    >
                      Date
                      {sortConfig?.key === 'created_at' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[80px]">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('action')}
                      className="h-auto p-0 font-semibold"
                    >
                      Action
                      {sortConfig?.key === 'action' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Entity</TableHead>
                  <TableHead className="w-[120px]">User</TableHead>
                  <TableHead className="w-[100px]">Amount</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[80px]">Severity</TableHead>
                  <TableHead className="w-[120px]">Integrity</TableHead>
                  <TableHead className="w-[100px]">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {searchTerm ? 'No audit logs match your search criteria' : 'No audit logs found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-muted/50">
                      <TableCell className="text-sm">
                        <div>
                          {format(new Date(log.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.action.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[100px] truncate" title={log.entity_name}>
                          {log.entity_name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {log.resource_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[120px] truncate" title={log.user_name}>
                          {log.user_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.user_email?.split('@')[0]}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatAmount(log.financial_data?.amount, log.financial_data?.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(log.status)}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityVariant(log.severity)}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.verification_status === 'verified' ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <Eye className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : log.verification_status === 'tampered' ? (
                          <Badge variant="destructive">
                            <Eye className="h-3 w-3 mr-1" />
                            Tampered
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Unknown
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedLog(log)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange?.(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink isActive>
                      Page {currentPage} of {totalPages}
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => onPageChange?.(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                Showing {startIndex + 1}-{Math.min(startIndex + paginatedLogs.length, totalCount)} of {totalCount} records
                {searchTerm && ` (${filteredLogs.length} filtered)`}
              </div>
              <div className="flex items-center space-x-4">
                <span>Success: {logs.filter(l => l.status === 'success').length}</span>
                <span>Failed: {logs.filter(l => l.status === 'failed').length}</span>
                <span>Critical: {logs.filter(l => l.severity === 'critical').length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedLog && (
        <AuditLogDetailsDialog
          log={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}