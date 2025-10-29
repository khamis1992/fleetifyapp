/**
 * تبويبة القيود المحاسبية المحسّنة
 * تصميم متطور وشامل لعرض وإدارة القيود المحاسبية
 * 
 * @component EnhancedJournalEntriesTab
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Download,
  FileText,
  Calendar,
  ChevronDown,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  RotateCcw,
  Printer,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Calculator,
  XCircle,
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { LedgerFilters } from '@/hooks/useGeneralLedger';

// ============================================================================
// الأنواع والواجهات
// ============================================================================

interface JournalEntryLine {
  id: string;
  debit_amount: number | null;
  credit_amount: number | null;
  line_description?: string | null;
  line_number: number;
  account_id: string;
  cost_center_id?: string | null;
  chart_of_accounts?: {
    account_code: string;
    account_name: string;
    account_name_ar?: string | null;
    account_type?: string;
  } | null;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  status: 'posted' | 'draft' | 'reversed' | 'cancelled';
  reference_type?: string | null;
  reference_id?: string | null;
  created_at?: string;
  journal_entry_lines?: JournalEntryLine[];
}

interface EnhancedJournalEntriesTabProps {
  entries: JournalEntry[];
  filters: LedgerFilters;
  isLoading?: boolean;
  onFiltersChange: (filters: Partial<LedgerFilters>) => void;
  onPostEntry?: (entryId: string) => Promise<void>;
  onReverseEntry?: (entryId: string) => Promise<void>;
  onDeleteEntry?: (entryId: string) => Promise<void>;
  onExport?: (format: 'excel' | 'pdf' | 'csv') => Promise<void>;
}

// ============================================================================
// ثوابت الحالات والألوان
// ============================================================================

const statusConfig = {
  posted: {
    label: 'مرحل',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
    icon: CheckCircle,
  },
  draft: {
    label: 'مسودة',
    variant: 'secondary' as const,
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    icon: FileText,
  },
  reversed: {
    label: 'معكوس',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 hover:bg-red-100',
    icon: RotateCcw,
  },
  cancelled: {
    label: 'ملغي',
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    icon: XCircle,
  },
};

// ============================================================================
// مكون بطاقة القيد المحاسبي
// ============================================================================

interface JournalEntryCardProps {
  entry: JournalEntry;
  onView?: (entry: JournalEntry) => void;
  onEdit?: (entry: JournalEntry) => void;
  onPost?: (entry: JournalEntry) => void;
  onReverse?: (entry: JournalEntry) => void;
  onDelete?: (entry: JournalEntry) => void;
  onPrint?: (entry: JournalEntry) => void;
}

function JournalEntryCard({
  entry,
  onView,
  onEdit,
  onPost,
  onReverse,
  onDelete,
  onPrint,
}: JournalEntryCardProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReverseDialog, setShowReverseDialog] = useState(false);

  const statusInfo = statusConfig[entry.status];
  const StatusIcon = statusInfo.icon;

  // حساب التوازن
  const isBalanced = Math.abs(entry.total_debit - entry.total_credit) < 0.001;

  // تنسيق التاريخ
  const formattedDate = useMemo(() => {
    try {
      return format(new Date(entry.entry_date), 'dd MMMM yyyy', { locale: ar });
    } catch {
      return entry.entry_date;
    }
  }, [entry.entry_date]);

  return (
    <>
      <Card className="hover:shadow-md transition-all duration-200" dir="rtl">
        {/* رأس البطاقة */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-1">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg font-semibold">
                    قيد رقم {entry.entry_number}
                  </CardTitle>
                  <Badge className={cn('gap-1', statusInfo.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                  {!isBalanced && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      غير متوازن
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formattedDate}
                  </div>
                  {entry.reference_type && (
                    <div className="text-xs bg-muted px-2 py-0.5 rounded">
                      {entry.reference_type}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* قائمة الإجراءات */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView?.(entry)}>
                  <Eye className="h-4 w-4 ml-2" />
                  عرض التفاصيل
                </DropdownMenuItem>
                {entry.status === 'draft' && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit?.(entry)}>
                      <Edit className="h-4 w-4 ml-2" />
                      تعديل القيد
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPost?.(entry)}>
                      <CheckCircle className="h-4 w-4 ml-2" />
                      ترحيل القيد
                    </DropdownMenuItem>
                  </>
                )}
                {entry.status === 'posted' && (
                  <DropdownMenuItem onClick={() => setShowReverseDialog(true)}>
                    <RotateCcw className="h-4 w-4 ml-2" />
                    عكس القيد
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onPrint?.(entry)}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {entry.status === 'draft' && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 ml-2" />
                    حذف القيد
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* محتوى البطاقة */}
        <CardContent className="space-y-3">
          {/* البيان */}
          {entry.description && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              {entry.description}
            </div>
          )}

          {/* المجاميع */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">إجمالي المدين</div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-lg font-semibold text-green-600 font-mono">
                  {formatCurrency(entry.total_debit, { minimumFractionDigits: 3 })}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">إجمالي الدائن</div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-lg font-semibold text-red-600 font-mono">
                  {formatCurrency(entry.total_credit, { minimumFractionDigits: 3 })}
                </span>
              </div>
            </div>
          </div>

          {/* زر التوسيع */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center gap-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <span className="text-sm">
              {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
            </span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>

          {/* جدول التفاصيل */}
          {isExpanded && entry.journal_entry_lines && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-right">رمز الحساب</TableHead>
                    <TableHead className="text-right">اسم الحساب</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">مدين</TableHead>
                    <TableHead className="text-right">دائن</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.journal_entry_lines.map((line) => (
                    <TableRow key={line.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">
                        {line.chart_of_accounts?.account_code || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium">
                            {line.chart_of_accounts?.account_name_ar ||
                              line.chart_of_accounts?.account_name ||
                              '-'}
                          </div>
                          {line.chart_of_accounts?.account_name_ar &&
                            line.chart_of_accounts?.account_name && (
                              <div className="text-xs text-muted-foreground">
                                {line.chart_of_accounts.account_name}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {line.line_description || entry.description || '-'}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-green-600">
                        {line.debit_amount && line.debit_amount > 0
                          ? formatCurrency(line.debit_amount, {
                              minimumFractionDigits: 3,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono font-semibold text-red-600">
                        {line.credit_amount && line.credit_amount > 0
                          ? formatCurrency(line.credit_amount, {
                              minimumFractionDigits: 3,
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* صف المجموع */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      المجموع
                    </TableCell>
                    <TableCell className="font-mono text-green-600">
                      {formatCurrency(entry.total_debit, {
                        minimumFractionDigits: 3,
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-red-600">
                      {formatCurrency(entry.total_credit, {
                        minimumFractionDigits: 3,
                      })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* نافذة تأكيد الحذف */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف القيد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف القيد رقم {entry.entry_number}؟ لا يمكن التراجع عن هذا
              الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(entry);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* نافذة تأكيد العكس */}
      <AlertDialog open={showReverseDialog} onOpenChange={setShowReverseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد عكس القيد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من عكس القيد رقم {entry.entry_number}؟ سيتم إنشاء قيد عكسي
              جديد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onReverse?.(entry);
                setShowReverseDialog(false);
              }}
            >
              عكس القيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// المكون الرئيسي
// ============================================================================

export function EnhancedJournalEntriesTab({
  entries,
  filters,
  isLoading,
  onFiltersChange,
  onPostEntry,
  onReverseEntry,
  onDeleteEntry,
  onExport,
}: EnhancedJournalEntriesTabProps) {
  const { formatCurrency } = useCurrencyFormatter();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const total = entries.length;
    const posted = entries.filter((e) => e.status === 'posted').length;
    const draft = entries.filter((e) => e.status === 'draft').length;
    const cancelled = entries.filter(
      (e) => e.status === 'reversed' || e.status === 'cancelled'
    ).length;
    const unbalanced = entries.filter(
      (e) => Math.abs(e.total_debit - e.total_credit) >= 0.001
    ).length;

    return { total, posted, draft, cancelled, unbalanced };
  }, [entries]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* بطاقات الإحصائيات */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القيود</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مرحلة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.posted}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مسودات</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ملغية</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          </CardContent>
        </Card>
      </div>

      {/* لوحة البحث والفلتر */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والفلتر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الفلاتر الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* البحث */}
            <div className="md:col-span-2 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث في القيود..."
                value={filters.searchTerm || ''}
                onChange={(e) =>
                  onFiltersChange({ searchTerm: e.target.value })
                }
                className="pr-10 text-right"
              />
            </div>

            {/* من تاريخ */}
            <Input
              type="date"
              placeholder="من تاريخ"
              value={filters.dateFrom || ''}
              onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
              className="text-right"
            />

            {/* إلى تاريخ */}
            <Input
              type="date"
              placeholder="إلى تاريخ"
              value={filters.dateTo || ''}
              onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
              className="text-right"
            />
          </div>

          {/* الفلاتر المتقدمة */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showAdvancedFilters ? 'إخفاء الفلتر المتقدم' : 'فلتر متقدم'}
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  showAdvancedFilters && 'rotate-180'
                )}
              />
            </Button>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    تصدير
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExport?.('excel')}>
                    تصدير Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                    تصدير PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport?.('csv')}>
                    تصدير CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {/* الحالة */}
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => onFiltersChange({ status: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="posted">مرحل</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="reversed">معكوس</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>

              {/* نوع المرجع */}
              <Select
                value={filters.referenceType || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({ referenceType: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="نوع المرجع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="invoice">فاتورة</SelectItem>
                  <SelectItem value="payment">دفعة</SelectItem>
                  <SelectItem value="contract">عقد</SelectItem>
                  <SelectItem value="manual">يدوي</SelectItem>
                </SelectContent>
              </Select>

              {/* الحساب */}
              <Select
                value={filters.accountId || 'all'}
                onValueChange={(value) =>
                  onFiltersChange({ accountId: value === 'all' ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحسابات</SelectItem>
                  {/* يمكن إضافة الحسابات هنا */}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* تحذير القيود غير المتوازنة */}
          {stats.unbalanced > 0 && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-orange-800 font-medium">
                يوجد {stats.unbalanced} قيد غير متوازن. يرجى مراجعتها وتصحيحها.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة القيود */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">جاري التحميل...</p>
            </div>
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد قيود</h3>
              <p className="text-sm text-muted-foreground">
                لم يتم العثور على قيود محاسبية تطابق معايير البحث
              </p>
            </CardContent>
          </Card>
        ) : (
          entries.map((entry) => (
            <JournalEntryCard
              key={entry.id}
              entry={entry}
              onPost={onPostEntry ? (e) => onPostEntry(e.id) : undefined}
              onReverse={onReverseEntry ? (e) => onReverseEntry(e.id) : undefined}
              onDelete={onDeleteEntry ? (e) => onDeleteEntry(e.id) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

