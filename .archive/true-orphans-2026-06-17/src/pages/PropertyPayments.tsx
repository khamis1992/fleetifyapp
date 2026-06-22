import React, { useState } from 'react';
import { Plus, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModuleLayout } from '@/modules/core/components/ModuleLayout';
import { PropertyPaymentForm } from '@/components/property/PropertyPaymentForm';
import { PropertyAccountingIntegration } from '@/components/property/PropertyAccountingIntegration';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePropertyPayments, useCreatePropertyPayment } from '@/modules/properties/hooks';
import { useCurrencyFormatter } from '@/modules/core/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

export default function PropertyPayments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: payments = [], isLoading } = usePropertyPayments();
  const createPayment = useCreatePropertyPayment();
  const { formatCurrency } = useCurrencyFormatter();

  const handleCreatePayment = async (data: any) => {
    try {
      await createPayment.mutateAsync(data);
      setIsDialogOpen(false);
      toast.success('تم تسجيل الدفعة بنجاح');
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('حدث خطأ في تسجيل الدفعة');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      paid: { label: 'مدفوع', variant: 'default' as const },
      pending: { label: 'معلق', variant: 'secondary' as const },
      overdue: { label: 'متأخر', variant: 'destructive' as const },
      cancelled: { label: 'ملغي', variant: 'outline' as const },
    };
    
    return statusMap[status] || { label: status, variant: 'outline' as const };
  };

  const getPaymentTypeLabel = (type: string) => {
    const typeMap = {
      rental: 'إيجار',
      deposit: 'تأمين',
      commission: 'عمولة',
      maintenance: 'صيانة',
      other: 'أخرى',
    };
    return typeMap[type] || type;
  };

  return (
    <ModuleLayout moduleName="properties">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">دفعات العقارات</h1>
            <p className="text-muted-foreground mt-2">
              إدارة دفعات الإيجارات والتأمينات والعمولات
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              تصفية
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  تسجيل دفعة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>تسجيل دفعة جديدة</DialogTitle>
                </DialogHeader>
                <PropertyPaymentForm
                  onSubmit={handleCreatePayment}
                  onCancel={() => setIsDialogOpen(false)}
                  isLoading={createPayment.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  payments
                    .filter(p => p.status === 'paid')
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                )}
              </div>
              <p className="text-sm text-muted-foreground">إجمالي المحصل</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(
                  payments
                    .filter(p => p.status === 'pending')
                    .reduce((sum, p) => sum + (p.amount || 0), 0)
                )}
              </div>
              <p className="text-sm text-muted-foreground">معلق التحصيل</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {payments.filter(p => p.status === 'overdue').length}
              </div>
              <p className="text-sm text-muted-foreground">دفعات متأخرة</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {payments.filter(p => p.journal_entry_id).length}
              </div>
              <p className="text-sm text-muted-foreground">قيود محاسبية</p>
            </CardContent>
          </Card>
        </div>

        {/* جدول الدفعات */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الدفعات</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">لا توجد دفعات مسجلة</p>
                <Button 
                  className="mt-4" 
                  onClick={() => setIsDialogOpen(true)}
                >
                  تسجيل أول دفعة
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الدفعة</TableHead>
                      <TableHead>العقد</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>القيد المحاسبي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => {
                      const statusInfo = getStatusBadge(payment.status || 'pending');
                      
                      return (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {payment.payment_number || payment.id.slice(-8)}
                          </TableCell>
                          <TableCell>
                            {payment.property_contracts?.contract_number || 'غير محدد'}
                          </TableCell>
                          <TableCell>
                            {getPaymentTypeLabel(payment.payment_type || 'rental')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant}>
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.journal_entry_id ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(`/finance/journal-entries/${payment.journal_entry_id}`, '_blank');
                                }}
                              >
                                عرض القيد
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                لا يوجد قيد
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* عرض التكامل المحاسبي للدفعات الحديثة */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">التكامل المحاسبي</h3>
                  {payments
                    .filter(p => p.journal_entry_id)
                    .slice(0, 3)
                    .map((payment) => (
                      <PropertyAccountingIntegration
                        key={payment.id}
                        payment={payment}
                        onViewJournalEntry={(id) => {
                          window.open(`/finance/journal-entries/${id}`, '_blank');
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}