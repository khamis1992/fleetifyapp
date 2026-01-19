import React, { useState } from 'react';
import { Search, Filter, Download, Calendar, DollarSign, Receipt, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllTrafficViolationPayments, useTrafficViolationPaymentsStats } from '@/hooks/useTrafficViolationPayments';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function TrafficViolationPayments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const { data: payments = [], isLoading } = useAllTrafficViolationPayments();
  const { data: stats } = useTrafficViolationPaymentsStats();
  const { formatCurrency } = useCurrencyFormatter();

  // تصفية البيانات
  const filteredPayments = payments.filter((payment: any) => {
    const matchesSearch = searchTerm === '' || 
      payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.penalties?.penalty_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.penalties?.contracts?.contract_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getPaymentMethodLabel = (method: string) => {
    const labels = {
      cash: 'نقداً',
      bank_transfer: 'تحويل بنكي',
      check: 'شيك',
      credit_card: 'بطاقة ائتمان'
    };
    return labels[method as keyof typeof labels] || method;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">مكتمل</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">في الانتظار</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">ملغي</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case 'full':
        return <Badge variant="default">دفع كامل</Badge>;
      case 'partial':
        return <Badge variant="secondary">دفع جزئي</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="text-center">جاري تحميل البيانات...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* العنوان والأزرار */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">مدفوعات المخالفات المرورية</h1>
          <p className="text-muted-foreground">إدارة ومتابعة جميع مدفوعات المخالفات المرورية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 ml-2" />
            تصدير التقرير
          </Button>
        </div>
      </div>

      {/* الإحصائيات */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المدفوعات</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedPayments} مكتملة من أصل {stats.totalPayments}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                من جميع المدفوعات
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المكتمل</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.completedAmount)}</div>
              <p className="text-xs text-muted-foreground">
                من المدفوعات المكتملة
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المبلغ المعلق</CardTitle>
              <Calendar className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
              <p className="text-xs text-muted-foreground">
                من المدفوعات المعلقة
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* إحصائيات طرق الدفع */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>توزيع طرق الدفع</CardTitle>
            <CardDescription>عدد المدفوعات حسب طريقة الدفع</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.methodBreakdown.cash}</div>
                <p className="text-sm text-muted-foreground">نقداً</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.methodBreakdown.bank_transfer}</div>
                <p className="text-sm text-muted-foreground">تحويل بنكي</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.methodBreakdown.check}</div>
                <p className="text-sm text-muted-foreground">شيك</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.methodBreakdown.credit_card}</div>
                <p className="text-sm text-muted-foreground">بطاقة ائتمان</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* أدوات البحث والتصفية */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث برقم الدفع أو رقم المخالفة أو رقم العقد..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الطرق</SelectItem>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
                <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة مدفوعات المخالفات</CardTitle>
          <CardDescription>
            عرض جميع مدفوعات المخالفات المرورية المسجلة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الدفع</TableHead>
                  <TableHead className="text-right">رقم المخالفة</TableHead>
                  <TableHead className="text-right">رقم العقد</TableHead>
                  <TableHead className="text-right">تاريخ الدفع</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">طريقة الدفع</TableHead>
                  <TableHead className="text-right">نوع الدفع</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المرجع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      لا توجد مدفوعات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell className="font-medium text-blue-600">
                        {payment.penalties?.penalty_number}
                      </TableCell>
                      <TableCell>
                        {payment.penalties?.contracts ? (
                          <div className="flex flex-col">
                            <Badge variant="outline" className="w-fit">
                              {payment.penalties.contracts.contract_number}
                            </Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {payment.penalties.contracts.status === 'active' ? 'نشط' : 
                               payment.penalties.contracts.status === 'completed' ? 'مكتمل' :
                               payment.penalties.contracts.status === 'cancelled' ? 'ملغي' : payment.penalties.contracts.status}
                            </span>
                          </div>
                        ) : payment.penalties?.contract_id ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                      <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.reference_number || payment.check_number || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}