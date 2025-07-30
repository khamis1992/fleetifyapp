import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useJournalEntryLines, LedgerFilters } from '@/hooks/useGeneralLedger';
import { formatCurrency } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { JournalEntryForm } from './JournalEntryForm';
import { VoucherDetailsDialog } from './VoucherDetailsDialog';
import { toast } from 'sonner';

export const JournalVoucherDisplay: React.FC = () => {
  const [filters, setFilters] = useState<LedgerFilters>({});
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showNewEntryDialog, setShowNewEntryDialog] = useState(false);

  const { data: journalLines, isLoading } = useJournalEntryLines(filters);

  const updateFilters = (newFilters: Partial<LedgerFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'posted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'reversed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'posted':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'reversed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'posted':
        return 'مرحل';
      case 'draft':
        return 'مسودة';
      case 'reversed':
        return 'عكس';
      default:
        return status;
    }
  };

  // Group lines by journal entry
  const groupedLines = journalLines?.reduce((groups: any, line: any) => {
    const entryId = line.journal_entry?.id;
    if (!groups[entryId]) {
      groups[entryId] = {
        entry: line.journal_entry,
        lines: []
      };
    }
    groups[entryId].lines.push(line);
    return groups;
  }, {}) || {};

  // Get account hierarchy display
  const getAccountHierarchy = (account: any) => {
    if (!account) return '';
    
    const hierarchy = [];
    if (account.parent_account?.account_name) {
      hierarchy.push(account.parent_account.account_name);
    }
    hierarchy.push(account.account_name);
    
    return hierarchy.join(' > ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">دليل الحسابات - القيود المحاسبية</h2>
          <p className="text-muted-foreground">
            عرض وإدارة القيود المحاسبية بتنسيق السندات المحاسبية
          </p>
        </div>
        <Button onClick={() => setShowNewEntryDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          قيد جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث في القيود..."
                value={filters.searchTerm || ''}
                onChange={(e) => updateFilters({ searchTerm: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status || 'all'} onValueChange={(value) => updateFilters({ status: value === 'all' ? undefined : value })}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="posted">مرحل</SelectItem>
                <SelectItem value="reversed">معكوس</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="من تاريخ"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            />

            <Input
              type="date"
              placeholder="إلى تاريخ"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilters({ dateTo: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Journal Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            القيود المحاسبية
          </CardTitle>
          <CardDescription>
            قائمة بالقيود المحاسبية بتفاصيل السندات المحاسبية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">رقم القيد</TableHead>
                <TableHead className="text-center">تاريخ القيد</TableHead>
                <TableHead className="text-center">الحساب</TableHead>
                <TableHead className="text-center">مركز التكلفة</TableHead>
                <TableHead className="text-center">مدين</TableHead>
                <TableHead className="text-center">دائن</TableHead>
                <TableHead className="text-center">البيان</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(groupedLines).map((group: any) => 
                group.lines.map((line: any, lineIndex: number) => (
                  <TableRow key={`${group.entry.id}-${line.id}`} className="hover:bg-muted/50">
                    <TableCell className="text-center font-medium">
                      {lineIndex === 0 ? (group.entry.entry_number || '-') : ''}
                    </TableCell>
                    <TableCell className="text-center">
                      {lineIndex === 0 && group.entry.entry_date 
                        ? new Date(group.entry.entry_date).toLocaleDateString('ar-SA')
                        : ''}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">
                          {line.account?.account_code} - {line.account?.account_name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {getAccountHierarchy(line.account)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {line.cost_center?.center_name || '-'}
                    </TableCell>
                    <TableCell className="text-center text-green-600 font-medium">
                      {line.debit_amount ? formatCurrency(line.debit_amount) : '-'}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-medium">
                      {line.credit_amount ? formatCurrency(line.credit_amount) : '-'}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate text-sm" title={line.line_description || group.entry.description}>
                        {line.line_description || group.entry.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {lineIndex === 0 && (
                        <Badge variant={getStatusColor(group.entry.status)}>
                          {getStatusIcon(group.entry.status)}
                          <span className="mr-1">{getStatusLabel(group.entry.status)}</span>
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {lineIndex === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedEntry(group.entry);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {Object.keys(groupedLines).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    لا توجد بنود قيود محاسبية
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <VoucherDetailsDialog
        entry={selectedEntry}
        isOpen={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedEntry(null);
        }}
      />

      {/* New Entry Dialog */}
      <Dialog open={showNewEntryDialog} onOpenChange={setShowNewEntryDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة قيد محاسبي جديد</DialogTitle>
          </DialogHeader>
          <JournalEntryForm 
            open={showNewEntryDialog}
            onOpenChange={setShowNewEntryDialog}
            onSuccess={() => {
              setShowNewEntryDialog(false);
              toast.success('تم إنشاء القيد بنجاح');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};