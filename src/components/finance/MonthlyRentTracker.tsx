import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Phone,
  Mail,
  Car,
  Search,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useMonthlyRentTracking, useRentPaymentSummary } from '@/hooks/useMonthlyRentTracking';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const MonthlyRentTracker: React.FC = () => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');

  const { data: rentStatuses, isLoading, refetch } = useMonthlyRentTracking(selectedYear, selectedMonth);
  const summary = useRentPaymentSummary(selectedYear, selectedMonth);
  const { formatCurrency } = useCurrencyFormatter();

  // Filter data based on search and status
  const filteredData = rentStatuses?.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || item.payment_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: 'paid' | 'unpaid' | 'partial') => {
    const configs = {
      paid: { label: 'مدفوع', variant: 'default' as const, icon: CheckCircle2, color: 'text-green-600' },
      unpaid: { label: 'غير مدفوع', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      partial: { label: 'دفع جزئي', variant: 'secondary' as const, icon: AlertCircle, color: 'text-orange-600' },
    };
    
    const config = configs[status];
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) return;

    const headers = ['كود العميل', 'اسم العميل', 'رقم اللوحة', 'الإيجار الشهري', 'المدفوع', 'المتبقي', 'الحالة', 'تاريخ آخر دفعة'];
    const rows = filteredData.map(item => [
      item.customer_code,
      item.customer_name,
      item.vehicle_plate || '-',
      item.monthly_rent.toFixed(3),
      item.amount_paid.toFixed(3),
      item.amount_due.toFixed(3),
      item.payment_status === 'paid' ? 'مدفوع' : item.payment_status === 'partial' ? 'جزئي' : 'غير مدفوع',
      item.last_payment_date ? new Date(item.last_payment_date).toLocaleDateString('ar-QA') : '-',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rent-tracking-${selectedYear}-${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">متابعة الإيجارات الشهرية</h2>
          <p className="text-muted-foreground">تتبع دفعات العملاء والإيجارات المستحقة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            اختر الشهر والسنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(5)].map((_, i) => {
                  const year = currentDate.getFullYear() - 2 + i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                <p className="text-3xl font-bold text-foreground">{summary.totalCustomers}</p>
                <p className="text-xs text-muted-foreground mt-1">عميل نشط</p>
              </div>
              <Users className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">العملاء الذين دفعوا</p>
                <p className="text-3xl font-bold text-green-600">{summary.paidCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.totalCustomers > 0 
                    ? `${Math.round((summary.paidCount / summary.totalCustomers) * 100)}%`
                    : '0%'
                  }
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">العملاء الذين لم يدفعوا</p>
                <p className="text-3xl font-bold text-red-600">{summary.unpaidCount}</p>
                {summary.partialCount > 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    + {summary.partialCount} دفع جزئي
                  </p>
                )}
              </div>
              <XCircle className="h-10 w-10 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">نسبة التحصيل</p>
                <p className="text-3xl font-bold text-blue-600">{summary.collectionRate}%</p>
                <Progress value={summary.collectionRate} className="mt-2" />
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">الإيجار المتوقع</p>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatCurrency(summary.totalRentExpected)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">المبلغ المحصّل</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {formatCurrency(summary.totalRentCollected)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(summary.totalRentOutstanding)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم العميل، الكود، أو رقم اللوحة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="unpaid">غير مدفوع</SelectItem>
                <SelectItem value="partial">دفع جزئي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الدفعات</CardTitle>
          <CardDescription>
            عرض {filteredData?.length || 0} من {rentStatuses?.length || 0} عميل
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">جاري التحميل...</p>
            </div>
          ) : filteredData && filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">كود العميل</TableHead>
                    <TableHead className="text-right">اسم العميل</TableHead>
                    <TableHead className="text-right">رقم اللوحة</TableHead>
                    <TableHead className="text-right">الإيجار الشهري</TableHead>
                    <TableHead className="text-right">المدفوع</TableHead>
                    <TableHead className="text-right">المتبقي</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">آخر دفعة</TableHead>
                    <TableHead className="text-right">معلومات التواصل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.contract_id} className={
                      item.payment_status === 'unpaid' ? 'bg-red-50/50' :
                      item.payment_status === 'partial' ? 'bg-orange-50/50' :
                      'bg-green-50/50'
                    }>
                      <TableCell className="font-medium">{item.customer_code}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.customer_name}</div>
                          {item.days_overdue > 0 && (
                            <div className="text-xs text-red-600">
                              متأخر {item.days_overdue} يوم
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          {item.vehicle_plate || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(item.monthly_rent)}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {formatCurrency(item.amount_paid)}
                      </TableCell>
                      <TableCell className={item.amount_due > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                        {formatCurrency(item.amount_due)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.payment_status)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.last_payment_date 
                          ? new Date(item.last_payment_date).toLocaleDateString('ar-QA')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {item.phone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {item.phone}
                            </div>
                          )}
                          {item.email && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {item.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                لا توجد بيانات للشهر المحدد
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
