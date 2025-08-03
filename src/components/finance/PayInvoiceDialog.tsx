import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCreatePayment } from '@/hooks/usePayments';
import { formatCurrency } from '@/lib/utils';

const paymentSchema = z.object({
  amount: z.number().min(0.001, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_method: z.string().min(1, 'طريقة الدفع مطلوبة'),
  payment_date: z.string().min(1, 'تاريخ الدفع مطلوب'),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PayInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    customer_id?: string;
    vendor_id?: string;
    payment_status: string;
  };
  onPaymentCreated?: () => void;
}

export function PayInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  onPaymentCreated,
}: PayInvoiceDialogProps) {
  // Debug: طباعة بيانات الفاتورة لتتبع المشكلة
  console.log('Invoice data in PayInvoiceDialog:', invoice);
  
  const createPayment = useCreatePayment();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: invoice.balance_due,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    },
  });

  const watchedAmount = form.watch('amount');
  
  // Auto-detect if it's partial payment based on amount
  const isAmountPartial = watchedAmount > 0 && watchedAmount < invoice.balance_due;
  const isAmountFull = watchedAmount === invoice.balance_due;

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPayment.mutateAsync({
        payment_type: invoice.customer_id ? 'receipt' : 'payment',
        payment_method: data.payment_method,
        amount: data.amount,
        payment_date: data.payment_date,
        reference_number: data.reference_number,
        notes: data.notes,
        invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        vendor_id: invoice.vendor_id,
      });
      
      onPaymentCreated?.();
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error creating payment:', error);
    }
  };

  const handleFullPayment = () => {
    form.setValue('amount', invoice.balance_due);
  };

  const handlePartialPayment = () => {
    // Just focus on amount field, let user enter the amount
    const amountField = document.querySelector('input[name="amount"]') as HTMLInputElement;
    if (amountField) {
      amountField.focus();
      amountField.select();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">دفع الفاتورة</DialogTitle>
          <DialogDescription>
            قم بإدخال تفاصيل الدفع للفاتورة رقم {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary Card */}
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📄</span>
                تفاصيل الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">رقم الفاتورة</span>
                    <span className="font-medium text-lg">{invoice.invoice_number}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">المبلغ الإجمالي</span>
                    <span className="font-medium text-lg">{formatCurrency(invoice.total_amount)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">المبلغ المدفوع</span>
                    <span className="font-medium text-lg text-green-600">{formatCurrency(invoice.paid_amount)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">حالة الدفع</span>
                    <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'} className="w-fit">
                      {invoice.payment_status === 'paid' ? 'مدفوعة' : 
                       invoice.payment_status === 'partial' ? 'دفع جزئي' : 'غير مدفوعة'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">المبلغ المستحق:</span>
                    <span className="font-bold text-2xl text-primary">{formatCurrency(invoice.balance_due)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>💳</span>
                خيارات الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={isAmountFull ? 'default' : 'outline'}
                    onClick={handleFullPayment}
                    className="h-12 text-base"
                  >
                    <span>💰</span>
                    دفع كامل
                  </Button>
                  <Button
                    type="button"
                    variant={isAmountPartial ? 'default' : 'outline'}
                    onClick={handlePartialPayment}
                    className="h-12 text-base"
                  >
                    <span>📊</span>
                    دفع جزئي
                  </Button>
                </div>
                
                {/* Auto-detection feedback */}
                {isAmountPartial && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <span>⚡</span>
                      <span className="text-sm font-medium">تم اكتشاف دفع جزئي تلقائياً</span>
                    </div>
                  </div>
                )}
                
                {isAmountFull && watchedAmount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800">
                      <span>✅</span>
                      <span className="text-sm font-medium">دفع كامل - سيتم إغلاق الفاتورة</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>✍️</span>
                بيانات الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">مبلغ الدفع</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.001"
                              placeholder="أدخل مبلغ الدفع"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              max={invoice.balance_due}
                              className="h-12 text-lg"
                            />
                          </FormControl>
                          <FormMessage />
                          {watchedAmount > invoice.balance_due && (
                            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                              ⚠️ المبلغ أكبر من المبلغ المستحق
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="payment_method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">طريقة الدفع</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="اختر طريقة الدفع" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">💵 نقد</SelectItem>
                              <SelectItem value="bank_transfer">🏦 تحويل بنكي</SelectItem>
                              <SelectItem value="check">📝 شيك</SelectItem>
                              <SelectItem value="credit_card">💳 بطاقة ائتمان</SelectItem>
                              <SelectItem value="online">🌐 دفع إلكتروني</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="payment_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">تاريخ الدفع</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reference_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-medium">رقم المرجع (اختياري)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="رقم الشيك، المرجع البنكي، إلخ" 
                              {...field}
                              className="h-12"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">ملاحظات (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أي ملاحظات إضافية حول عملية الدفع"
                            {...field}
                            rows={3}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="h-12 px-8"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={createPayment.isPending || watchedAmount > invoice.balance_due || watchedAmount <= 0}
                      className="h-12 px-8"
                    >
                      {createPayment.isPending ? 'جاري الحفظ...' : '💾 تسجيل الدفع'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}