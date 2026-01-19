import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { PayrollRecord } from '@/hooks/usePayroll';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface PayrollDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll: PayrollRecord | null;
}

export default function PayrollDetailsModal({ 
  open, 
  onOpenChange, 
  payroll 
}: PayrollDetailsModalProps) {
  const { formatCurrency } = useCurrencyFormatter();
  if (!payroll) return null;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: 'مسودة', variant: 'secondary' as const, icon: Clock },
      approved: { label: 'معتمد', variant: 'default' as const, icon: CheckCircle },
      paid: { label: 'مدفوع', variant: 'secondary' as const, icon: CheckCircle },
    };
    
    return statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'outline' as const, 
      icon: AlertCircle 
    };
  };

  const statusInfo = getStatusBadge(payroll.status);
  const StatusIcon = statusInfo.icon;

  const gross_amount = payroll.basic_salary + payroll.allowances + payroll.overtime_amount;
  const total_deductions = payroll.deductions + payroll.tax_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            تفاصيل الراتب - {payroll.payroll_number}
          </DialogTitle>
          <DialogDescription>
            عرض تفاصيل راتب الموظف الكاملة
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <StatusIcon className="h-5 w-5" />
                  معلومات عامة
                </span>
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {statusInfo.label}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">رقم الراتب</p>
                  <p className="font-medium">{payroll.payroll_number}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">تاريخ الراتب</p>
                  <p className="font-medium">
                    {new Date(payroll.payroll_date).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">فترة الراتب</p>
                  <p className="font-medium">
                    {new Date(payroll.pay_period_start).toLocaleDateString('en-GB')} - {' '}
                    {new Date(payroll.pay_period_end).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">حالة التكامل المحاسبي</p>
                  <div className="flex items-center gap-1">
                    {payroll.journal_entry_id ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">مدمج</span>
                      </>
                    ) : payroll.status === 'paid' ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">خطأ في التكامل</span>
                      </>
                    ) : (
                      <>
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-600">في الانتظار</span>
                      </>
                    )}
                  </div>
                  {payroll.journal_entry_id && (
                    <p className="text-xs text-muted-foreground">
                      قيد رقم: {payroll.journal_entry_id.substring(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Information */}
          {payroll.employee && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات الموظف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">الاسم</p>
                    <p className="font-medium">
                      {payroll.employee.first_name} {payroll.employee.last_name}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">رقم الموظف</p>
                    <p className="font-medium">{payroll.employee.employee_number}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">المنصب</p>
                    <p className="font-medium">{payroll.employee.position || 'غير محدد'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">القسم</p>
                    <p className="font-medium">{payroll.employee.department || 'غير محدد'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Salary Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                تفاصيل الراتب
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">الراتب الأساسي</p>
                    <p className="font-medium text-lg">{formatCurrency(payroll.basic_salary)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">البدلات</p>
                    <p className="font-medium text-lg">{formatCurrency(payroll.allowances)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">الساعات الإضافية</p>
                    <p className="font-medium text-lg">{formatCurrency(payroll.overtime_amount)}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">إجمالي المستحقات</p>
                    <p className="font-semibold text-xl text-green-600">
                      {formatCurrency(gross_amount)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">إجمالي الخصومات</p>
                    <p className="font-semibold text-xl text-red-600">
                      -{formatCurrency(total_deductions)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">الخصومات</p>
                    <p className="font-medium">{formatCurrency(payroll.deductions)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">الضريبة</p>
                    <p className="font-medium">{formatCurrency(payroll.tax_amount)}</p>
                  </div>
                </div>

                <Separator />

                <div className="bg-primary/5 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">صافي الراتب:</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(payroll.net_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                تفاصيل الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                  <p className="font-medium">
                    {payroll.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                    {payroll.payment_method === 'cash' && 'نقدي'}
                    {payroll.payment_method === 'check' && 'شيك'}
                  </p>
                </div>
                {payroll.bank_account && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">الحساب البنكي</p>
                    <p className="font-medium">{payroll.bank_account}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {payroll.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  ملاحظات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{payroll.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}