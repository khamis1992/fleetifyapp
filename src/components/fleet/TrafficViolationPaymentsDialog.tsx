import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { TrafficViolation } from '@/hooks/useTrafficViolations';
import { useTrafficViolationPayments } from '@/hooks/useTrafficViolationPayments';
import { TrafficViolationPaymentForm } from './TrafficViolationPaymentForm';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CreditCard, DollarSign, Plus, Receipt } from 'lucide-react';

interface TrafficViolationPaymentsDialogProps {
  violation: TrafficViolation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrafficViolationPaymentsDialog({ violation, open, onOpenChange }: TrafficViolationPaymentsDialogProps) {
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const { data: payments = [], isLoading } = useTrafficViolationPayments(violation?.id || '');

  if (!violation) return null;

  const totalPaid = payments.reduce((sum, payment) => 
    payment.status === 'completed' ? sum + payment.amount : sum, 0
  );
  const remainingAmount = (violation.amount || 0) - totalPaid;

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

  if (isPaymentFormOpen) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تسجيل دفع جديد</DialogTitle>
          </DialogHeader>
          <TrafficViolationPaymentForm
            violation={violation}
            onSuccess={() => {
              setIsPaymentFormOpen(false);
            }}
            onCancel={() => setIsPaymentFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>مدفوعات المخالفة رقم {violation.penalty_number}</DialogTitle>
        </DialogHeader>

        {/* معلومات المخالفة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              تفاصيل المخالفة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">نوع المخالفة</p>
                <p className="font-medium">{violation.violation_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المبلغ الإجمالي</p>
                <p className="font-bold text-lg">{violation.amount?.toFixed(3)} د.ك</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المبلغ المدفوع</p>
                <p className="font-medium text-green-600">{totalPaid.toFixed(3)} د.ك</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المبلغ المستحق</p>
                <p className={`font-medium ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {remainingAmount.toFixed(3)} د.ك
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* إجراءات الدفع */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            سجل المدفوعات
          </h3>
          {remainingAmount > 0 && (
            <Button onClick={() => setIsPaymentFormOpen(true)}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة دفعة جديدة
            </Button>
          )}
        </div>

        {/* جدول المدفوعات */}
        {isLoading ? (
          <div className="text-center py-8">جاري تحميل المدفوعات...</div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد مدفوعات مسجلة لهذه المخالفة</p>
              {remainingAmount > 0 && (
                <Button 
                  className="mt-4" 
                  onClick={() => setIsPaymentFormOpen(true)}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  تسجيل أول دفعة
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الدفع</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">المبلغ</TableHead>
                    <TableHead className="text-right">طريقة الدفع</TableHead>
                    <TableHead className="text-right">النوع</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">المرجع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell className="font-bold">{payment.amount.toFixed(3)} د.ك</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                      <TableCell>
                        <Badge variant={payment.payment_type === 'full' ? 'default' : 'secondary'}>
                          {payment.payment_type === 'full' ? 'كامل' : 'جزئي'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.reference_number || payment.check_number || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ملخص المدفوعات */}
        {payments.length > 0 && (
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm">ملخص المدفوعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">عدد المدفوعات</p>
                  <p className="font-medium">{payments.filter(p => p.status === 'completed').length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">إجمالي المدفوع</p>
                  <p className="font-medium text-green-600">{totalPaid.toFixed(3)} د.ك</p>
                </div>
                <div>
                  <p className="text-muted-foreground">المتبقي</p>
                  <p className={`font-medium ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {remainingAmount.toFixed(3)} د.ك
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}