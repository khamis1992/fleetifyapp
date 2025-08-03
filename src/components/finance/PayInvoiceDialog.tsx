import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
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
  const [isPartialPayment, setIsPartialPayment] = useState(false);
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
    setIsPartialPayment(false);
  };

  const handlePartialPayment = () => {
    setIsPartialPayment(true);
    form.setValue('amount', 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>دفع الفاتورة</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تفاصيل الفاتورة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الفاتورة:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ الإجمالي:</span>
              <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ المدفوع:</span>
              <span className="font-medium">{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-muted-foreground">المبلغ المستحق:</span>
              <span className="font-bold text-lg">{formatCurrency(invoice.balance_due)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">حالة الدفع:</span>
              <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                {invoice.payment_status === 'paid' ? 'مدفوعة' : 
                 invoice.payment_status === 'partial' ? 'دفع جزئي' : 'غير مدفوعة'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isPartialPayment ? 'default' : 'outline'}
            onClick={handleFullPayment}
            className="flex-1"
          >
            دفع كامل
          </Button>
          <Button
            type="button"
            variant={isPartialPayment ? 'default' : 'outline'}
            onClick={handlePartialPayment}
            className="flex-1"
          >
            دفع جزئي
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مبلغ الدفع</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="أدخل مبلغ الدفع"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      max={invoice.balance_due}
                    />
                  </FormControl>
                  <FormMessage />
                  {watchedAmount > invoice.balance_due && (
                    <p className="text-sm text-destructive">
                      المبلغ أكبر من المبلغ المستحق
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
                  <FormLabel>طريقة الدفع</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">نقد</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="online">دفع إلكتروني</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الدفع</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>رقم المرجع (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="رقم الشيك، المرجع البنكي، إلخ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات (اختياري)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي ملاحظات إضافية"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={createPayment.isPending || watchedAmount > invoice.balance_due || watchedAmount <= 0}
              >
                {createPayment.isPending ? 'جاري الحفظ...' : 'تسجيل الدفع'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}