import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useVendors } from '@/hooks/useFinance';
import { useBanks } from '@/hooks/useTreasury';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useCreateVendorPayment, CreateVendorPaymentData } from '@/hooks/useVendorPayments';

const vendorPaymentSchema = z.object({
  vendor_id: z.string().min(1, 'المورد مطلوب'),
  payment_date: z.date({ required_error: 'تاريخ الدفع مطلوب' }),
  amount: z.number().min(0.001, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_method: z.enum(['cash', 'bank_transfer', 'cheque', 'credit_card'], {
    required_error: 'طريقة الدفع مطلوبة',
  }),
  reference_number: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  bank_id: z.string().optional(),
  purchase_order_id: z.string().optional(),
});

type VendorPaymentFormData = z.infer<typeof vendorPaymentSchema>;

interface VendorPaymentFormProps {
  vendorId?: string;
  purchaseOrderId?: string;
  onSuccess?: () => void;
}

export const VendorPaymentForm: React.FC<VendorPaymentFormProps> = ({ 
  vendorId, 
  purchaseOrderId, 
  onSuccess 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: banks, isLoading: banksLoading } = useBanks();
  const { data: purchaseOrders, isLoading: purchaseOrdersLoading } = usePurchaseOrders();
  const createVendorPayment = useCreateVendorPayment();

  const form = useForm<VendorPaymentFormData>({
    resolver: zodResolver(vendorPaymentSchema),
    defaultValues: {
      vendor_id: vendorId || '',
      payment_date: new Date(),
      amount: 0,
      payment_method: 'bank_transfer',
      purchase_order_id: purchaseOrderId || '',
    },
  });

  const selectedPaymentMethod = form.watch('payment_method');
  const selectedVendorId = form.watch('vendor_id');

  // Filter purchase orders by selected vendor
  const filteredPurchaseOrders = purchaseOrders?.filter(
    po => po.vendor_id === selectedVendorId && po.status !== 'cancelled'
  );

  const onSubmit = async (data: VendorPaymentFormData) => {
    setIsSubmitting(true);
    try {
      const submitData: CreateVendorPaymentData = {
        vendor_id: data.vendor_id,
        payment_date: format(data.payment_date, 'yyyy-MM-dd'),
        amount: data.amount,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        description: data.description,
        notes: data.notes,
        bank_id: data.bank_id,
        purchase_order_id: data.purchase_order_id,
      };

      await createVendorPayment.mutateAsync(submitData);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating vendor payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (vendorsLoading || banksLoading || purchaseOrdersLoading) {
    return <div className="p-4">جاري تحميل البيانات...</div>;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>إنشاء دفعة مورد جديدة</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المورد</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!!vendorId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المورد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendor_name}
                          </SelectItem>
                        ))}
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
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: ar })
                            ) : (
                              <span>اختر التاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (د.ك)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
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
                        <SelectItem value="cheque">شيك</SelectItem>
                        <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(selectedPaymentMethod === 'bank_transfer' || selectedPaymentMethod === 'cheque') && (
                <FormField
                  control={form.control}
                  name="bank_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البنك</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر البنك" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {banks?.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.bank_name} - {bank.account_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel>رقم المرجع</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="رقم المرجع أو الشيك" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Purchase Order Selection */}
            {selectedVendorId && filteredPurchaseOrders && filteredPurchaseOrders.length > 0 && (
              <FormField
                control={form.control}
                name="purchase_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>أمر الشراء (اختياري)</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!!purchaseOrderId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر أمر الشراء" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">بدون ربط بأمر شراء</SelectItem>
                        {filteredPurchaseOrders.map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.order_number} - {po.total_amount.toFixed(3)} د.ك
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="وصف الدفعة" />
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
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="ملاحظات إضافية" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء الدفعة'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};