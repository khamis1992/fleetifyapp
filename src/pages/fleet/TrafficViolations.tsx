import React, { useState } from 'react';
import { Plus, Search, Filter, FileText, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrafficViolationForm } from '@/components/fleet/TrafficViolationForm';
import { TrafficViolationPaymentsDialog } from '@/components/fleet/TrafficViolationPaymentsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTrafficViolations, TrafficViolation } from '@/hooks/useTrafficViolations';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function TrafficViolations() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedViolation, setSelectedViolation] = useState<TrafficViolation | null>(null);
  const [isPaymentsDialogOpen, setIsPaymentsDialogOpen] = useState(false);

  const { data: violations = [], isLoading } = useTrafficViolations();

  // إحصائيات المخالفات
  const stats = {
    total: violations.length,
    pending: violations.filter(v => v.status === 'pending').length,
    confirmed: violations.filter(v => v.status === 'confirmed').length,
    cancelled: violations.filter(v => v.status === 'cancelled').length,
    totalAmount: violations.reduce((sum, v) => sum + (v.amount || 0), 0),
    paidAmount: violations.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0),
    unpaidAmount: violations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + (v.amount || 0), 0)
  };

  // تصفية البيانات
  const filteredViolations = violations.filter(violation => {
    const matchesSearch = searchTerm === '' || 
      violation.penalty_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      violation.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || violation.status === statusFilter;
    const matchesPaymentStatus = paymentStatusFilter === 'all' || violation.payment_status === paymentStatusFilter;
    
    return matchesSearch && matchesStatus && matchesPaymentStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 ml-1" />في الانتظار</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 ml-1" />مؤكدة</Badge>;
      case 'cancelled':
        return <Badge variant="destructive" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 ml-1" />ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid':
        return <Badge variant="default" className="bg-green-100 text-green-800">مدفوعة</Badge>;
      case 'unpaid':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">غير مدفوعة</Badge>;
      case 'partially_paid':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">مدفوعة جزئياً</Badge>;
      default:
        return <Badge variant="outline">{paymentStatus}</Badge>;
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
          <h1 className="text-3xl font-bold text-foreground">المخالفات المرورية</h1>
          <p className="text-muted-foreground">إدارة ومتابعة المخالفات المرورية للأسطول</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 ml-2" />
              إضافة مخالفة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة مخالفة مرورية جديدة</DialogTitle>
            </DialogHeader>
            <TrafficViolationForm onSuccess={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* حوار المدفوعات */}
      <TrafficViolationPaymentsDialog
        violation={selectedViolation}
        open={isPaymentsDialogOpen}
        onOpenChange={setIsPaymentsDialogOpen}
      />

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المخالفات</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pending} في الانتظار، {stats.confirmed} مؤكدة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبلغ</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAmount.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              من جميع المخالفات
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ المدفوع</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidAmount.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              من المخالفات المدفوعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المبلغ المستحق</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.unpaidAmount.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              من المخالفات غير المدفوعة
            </p>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="البحث برقم المخالفة أو السبب..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="حالة المخالفة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">في الانتظار</SelectItem>
                <SelectItem value="confirmed">مؤكدة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع حالات الدفع</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول المخالفات */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المخالفات المرورية</CardTitle>
          <CardDescription>
            عرض جميع المخالفات المرورية المسجلة في النظام
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم المخالفة</TableHead>
                  <TableHead className="text-right">تاريخ المخالفة</TableHead>
                  <TableHead className="text-right">نوع المخالفة</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">حالة المخالفة</TableHead>
                  <TableHead className="text-right">حالة الدفع</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredViolations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد مخالفات مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredViolations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell className="font-medium">{violation.penalty_number}</TableCell>
                      <TableCell>
                        {violation.penalty_date && format(new Date(violation.penalty_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{violation.violation_type || violation.reason}</TableCell>
                      <TableCell className="font-bold">{violation.amount?.toFixed(3)} د.ك</TableCell>
                      <TableCell>{getStatusBadge(violation.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(violation.payment_status || 'unpaid')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedViolation(violation);
                              setIsPaymentsDialogOpen(true);
                            }}
                          >
                            <CreditCard className="w-3 h-3 ml-1" />
                            المدفوعات
                          </Button>
                          <Button variant="outline" size="sm">
                            <FileText className="w-3 h-3 ml-1" />
                            عرض
                          </Button>
                          {violation.status === 'pending' && (
                            <Button variant="outline" size="sm">
                              تعديل
                            </Button>
                          )}
                        </div>
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