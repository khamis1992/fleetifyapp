import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus, Calendar, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useEnhancedJournalEntries, LedgerFilters } from '@/hooks/useGeneralLedger';
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

  const { data: journalEntries, isLoading } = useEnhancedJournalEntries(filters);

  console.log('🔍 JournalVoucherDisplay: Journal entries:', journalEntries);

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

  const calculateTotalDebits = (lines: any[]) => {
    return lines?.reduce((sum, line) => sum + (line.debit_amount || 0), 0) || 0;
  };

  const calculateTotalCredits = (lines: any[]) => {
    return lines?.reduce((sum, line) => sum + (line.credit_amount || 0), 0) || 0;
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
                <TableHead className="text-right">رقم القيد</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">البيان</TableHead>
                <TableHead className="text-center">إجمالي المدين</TableHead>
                <TableHead className="text-center">إجمالي الدائن</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">عدد البنود</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries?.map((entry) => {
                const totalDebits = calculateTotalDebits(entry.journal_entry_lines);
                const totalCredits = calculateTotalCredits(entry.journal_entry_lines);
                const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
                
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-right">
                      {entry.entry_number}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Date(entry.entry_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell className="text-right max-w-xs truncate" title={entry.description}>
                      {entry.description}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatCurrency(totalDebits)}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {formatCurrency(totalCredits)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getStatusIcon(entry.status)}
                        <Badge variant={getStatusColor(entry.status)}>
                          {getStatusLabel(entry.status)}
                        </Badge>
                        {!isBalanced && (
                          <Badge variant="destructive" className="ml-2">
                            غير متوازن
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {entry.journal_entry_lines?.length || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          console.log('🔍 Selected entry for dialog:', entry);
                          setSelectedEntry(entry);
                          setShowDetailsDialog(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!journalEntries || journalEntries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    لا توجد قيود محاسبية مطابقة للمرشحات المحددة
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