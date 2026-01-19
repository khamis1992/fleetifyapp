import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateTrafficViolationPayment } from '@/hooks/useTrafficViolationPayments';
import { toast } from 'sonner';
import { TrafficViolation } from '@/hooks/useTrafficViolations';

const paymentSchema = z.object({
  amount: z.string().min(1, 'مبلغ الدفع مطلوب'),
  payment_method: z.enum(['cash', 'bank_transfer', 'check', 'credit_card'], {
    required_error: 'طريقة الدفع مطلوبة'
  }),
  payment_type: z.enum(['full', 'partial']).default('full'),
  payment_date: z.string().min(1, 'تاريخ الدفع مطلوب'),
  bank_account: z.string().optional(),
  check_number: z.string().optional(),
  reference_number: z.string().optional(),
  notes: z.string().optional()
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface TrafficViolationPaymentFormProps {
  violation: TrafficViolation;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TrafficViolationPaymentForm({ violation, onSuccess, onCancel }: TrafficViolationPaymentFormProps) {
  const createPaymentMutation = useCreateTrafficViolationPayment();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: violation.amount?.toString() || '0',
      payment_method: 'cash',
      payment_type: 'full',
      payment_date: new Date().toISOString().split('T')[0]
    }
  });

  const selectedPaymentMethod = form.watch('payment_method');
  const selectedPaymentType = form.watch('payment_type');

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPaymentMutation.mutateAsync({
        traffic_violation_id: violation.id,
        amount: parseFloat(data.amount),
        payment_method: data.payment_method,
        payment_type: data.payment_type,
        payment_date: data.payment_date,
        bank_account: data.bank_account,
        check_number: data.check_number,
        reference_number: data.reference_number,
        notes: data.notes
      });
      toast.success('تم تسجيل الدفع بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('حدث خطأ أثناء تسجيل الدفع');
    }
  };

  // حساب المبلغ المستحق
  const remainingAmount = violation.amount || 0;
  const maxPaymentAmount = selectedPaymentType === 'partial' ? remainingAmount : remainingAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle>تسجيل دفع للمخالفة رقم {violation.penalty_number}</CardTitle>
        <CardDescription>
          المبلغ الإجمالي: {violation.amount?.toFixed(3)} د.ك | 
          المبلغ المستحق: {remainingAmount.toFixed(3)} د.ك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ الدفع *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الدفع *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full">دفع كامل</SelectItem>
                        <SelectItem value="partial">دفع جزئي</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>مبلغ الدفع (د.ك) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="0.000"
                        max={maxPaymentAmount}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                    {selectedPaymentType === 'partial' && (
                      <p className="text-sm text-muted-foreground">
                        الحد الأقصى: {maxPaymentAmount.toFixed(3)} د.ك
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
                    <FormLabel>طريقة الدفع *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cash">نقداً</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                        <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedPaymentMethod === 'bank_transfer' && (
                <FormField
                  control={form.control}
                  name="bank_account"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الحساب البنكي</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل رقم الحساب" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedPaymentMethod === 'check' && (
                <FormField
                  control={form.control}
                  name="check_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الشيك</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل رقم الشيك" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم المرجع (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم المرجع أو المعاملة" {...field} />
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
                  <FormLabel>ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="أي ملاحظات حول عملية الدفع" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={createPaymentMutation.isPending}
                className="px-8"
              >
                {createPaymentMutation.isPending ? 'جاري التسجيل...' : 'تسجيل الدفع'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}