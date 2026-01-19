import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLegalCases } from '@/hooks/useLegalCases';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ArrowUpDown,
  Download,
  Search,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';

type SortField = 'case_number' | 'case_title' | 'total_costs' | 'case_status' | 'priority' | 'created_at' | 'client_name';
type SortOrder = 'asc' | 'desc';

interface CaseListTableProps {
  onCaseSelect?: (caseId: string) => void;
}

export const CaseListTable: React.FC<CaseListTableProps> = ({ onCaseSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [lawyerFilter, setLawyerFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');

  const { data: cases, isLoading } = useLegalCases({
    case_status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchTerm || undefined,
  });

  // Filter and sort cases
  const filteredCases = useMemo(() => {
    if (!cases) return [];

    let filtered = [...cases];

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    // Lawyer filter
    if (lawyerFilter !== 'all') {
      filtered = filtered.filter((c) => c.assigned_lawyer === lawyerFilter);
    }

    // Date range filter
    if (dateFromFilter) {
      filtered = filtered.filter((c) => new Date(c.created_at) >= new Date(dateFromFilter));
    }
    if (dateToFilter) {
      filtered = filtered.filter((c) => new Date(c.created_at) <= new Date(dateToFilter));
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  }, [cases, priorityFilter, lawyerFilter, dateFromFilter, dateToFilter, sortField, sortOrder]);

  // Get unique lawyers for filter
  const uniqueLawyers = useMemo(() => {
    if (!cases) return [];
    return Array.from(new Set(cases.map((c) => c.assigned_lawyer).filter(Boolean)));
  }, [cases]);

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      if (!filteredCases || filteredCases.length === 0) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }

      // Create CSV content
      const headers = [
        'رقم القضية',
        'العنوان',
        'العميل',
        'المبلغ',
        'الحالة',
        'الأولوية',
        'أيام المتابعة',
        'تاريخ الإنشاء',
        'المحامي المعين',
      ];

      const rows = filteredCases.map((c) => [
        c.case_number,
        c.case_title_ar || c.case_title,
        c.client_name || '-',
        formatCurrency(c.total_costs),
        getStatusLabel(c.case_status),
        getPriorityLabel(c.priority),
        calculateDaysOpen(c.created_at),
        format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ar }),
        c.assigned_lawyer || '-',
      ]);

      // Create CSV
      let csvContent = headers.join(',') + '\n';
      rows.forEach((row) => {
        csvContent += row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
      });

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `cases_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('تم تصدير البيانات بنجاح');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('خطأ في تصدير البيانات');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const calculateDaysOpen = (createdDate: string): number => {
    const created = new Date(createdDate);
    const today = new Date();
    return Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      active: 'نشطة',
      closed: 'مغلقة',
      suspended: 'معلقة',
      on_hold: 'قيد الانتظار',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      urgent: 'عاجل',
      high: 'عالي',
      medium: 'متوسط',
      low: 'منخفض',
    };
    return labels[priority] || priority;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      closed: 'secondary',
      suspended: 'destructive',
      on_hold: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{getStatusLabel(status)}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      urgent: 'destructive',
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    };
    return <Badge variant={variants[priority] || 'secondary'}>{getPriorityLabel(priority)}</Badge>;
  };

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown className="h-4 w-4 opacity-50" />
      </div>
    </TableHead>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>تصفية القضايا</CardTitle>
          <CardDescription>استخدم المرشحات أدناه للبحث عن القضايا المحددة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم أو اسم القضية..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="closed">مغلقة</SelectItem>
                <SelectItem value="suspended">معلقة</SelectItem>
                <SelectItem value="on_hold">قيد الانتظار</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأولويات</SelectItem>
                <SelectItem value="urgent">عاجل</SelectItem>
                <SelectItem value="high">عالي</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="low">منخفض</SelectItem>
              </SelectContent>
            </Select>

            {/* Lawyer Filter */}
            <Select value={lawyerFilter} onValueChange={setLawyerFilter}>
              <SelectTrigger>
                <SelectValue placeholder="المحامي المعين" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المحامين</SelectItem>
                {uniqueLawyers.map((lawyer) => (
                  <SelectItem key={lawyer} value={lawyer || 'unassigned'}>
                    {lawyer || 'غير معين'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <Input
              type="date"
              placeholder="من التاريخ"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
            />

            {/* Date To */}
            <Input
              type="date"
              placeholder="إلى التاريخ"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
            />

            {/* Export Button */}
            <Button onClick={handleExportToExcel} className="col-span-full md:col-span-1 lg:col-span-1">
              <Download className="h-4 w-4 ml-2" />
              تصدير Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>قائمة القضايا</CardTitle>
              <CardDescription>
                عرض {filteredCases.length} من {cases?.length || 0} قضية
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {filteredCases.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader field="case_number" label="رقم القضية" />
                  <SortHeader field="case_title" label="العنوان" />
                  <SortHeader field="client_name" label="العميل" />
                  <SortHeader field="total_costs" label="المبلغ" />
                  <SortHeader field="case_status" label="الحالة" />
                  <SortHeader field="priority" label="الأولوية" />
                  <TableHead>أيام المتابعة</TableHead>
                  <SortHeader field="created_at" label="تاريخ الإنشاء" />
                  <TableHead>المحامي المعين</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length > 0 ? (
                  filteredCases.map((legalCase) => (
                    <TableRow key={legalCase.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{legalCase.case_number}</TableCell>
                      <TableCell>{legalCase.case_title_ar || legalCase.case_title}</TableCell>
                      <TableCell>{legalCase.client_name || '-'}</TableCell>
                      <TableCell>{formatCurrency(legalCase.total_costs)}</TableCell>
                      <TableCell>{getStatusBadge(legalCase.case_status)}</TableCell>
                      <TableCell>{getPriorityBadge(legalCase.priority)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{calculateDaysOpen(legalCase.created_at)} يوم</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(legalCase.created_at), 'dd MMM yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{legalCase.assigned_lawyer || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => onCaseSelect?.(legalCase.id)}
                            >
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(legalCase.case_number);
                                toast.success('تم نسخ رقم القضية');
                              }}
                            >
                              نسخ الرقم
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      لا توجد قضايا مطابقة للمرشحات المحددة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CaseListTable;
