import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useVendors } from '@/hooks/useFinance';
import { useCreatePurchaseOrder, CreatePurchaseOrderData } from '@/hooks/usePurchaseOrders';
import { toast } from 'sonner';

const purchaseOrderItemSchema = z.object({
  item_code: z.string().optional(),
  description: z.string().min(1, 'وصف العنصر مطلوب'),
  description_ar: z.string().optional(),
  quantity: z.number().min(0.001, 'الكمية يجب أن تكون أكبر من صفر'),
  unit_price: z.number().min(0, 'السعر يجب أن يكون أكبر من أو يساوي صفر'),
  unit_of_measure: z.string().optional(),
  notes: z.string().optional(),
});

const purchaseOrderSchema = z.object({
  vendor_id: z.string().min(1, 'المورد مطلوب'),
  order_date: z.date({ required_error: 'تاريخ الطلب مطلوب' }),
  expected_delivery_date: z.date().optional(),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  delivery_address: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  items: z.array(purchaseOrderItemSchema).min(1, 'يجب إضافة عنصر واحد على الأقل'),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFormProps {
  onSuccess?: () => void;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const createPurchaseOrder = useCreatePurchaseOrder();

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      order_date: new Date(),
      items: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          unit_of_measure: 'PCS',
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const addItem = () => {
    append({
      description: '',
      quantity: 1,
      unit_price: 0,
      unit_of_measure: 'PCS',
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.error('يجب أن يحتوي أمر الشراء على عنصر واحد على الأقل');
    }
  };

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const calculateTotal = () => {
    const items = form.watch('items');
    return items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.unit_price), 0);
  };

  const onSubmit = async (data: PurchaseOrderFormData) => {
    setIsSubmitting(true);
    try {
      const submitData: CreatePurchaseOrderData = {
        vendor_id: data.vendor_id,
        order_date: format(data.order_date, 'yyyy-MM-dd'),
        expected_delivery_date: data.expected_delivery_date ? format(data.expected_delivery_date, 'yyyy-MM-dd') : undefined,
        notes: data.notes,
        terms_and_conditions: data.terms_and_conditions,
        delivery_address: data.delivery_address,
        contact_person: data.contact_person,
        phone: data.phone,
        email: data.email,
        items: data.items.map(item => ({
          item_code: item.item_code,
          description: item.description,
          description_ar: item.description_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.unit_of_measure || 'PCS',
          notes: item.notes,
        })),
      };

      await createPurchaseOrder.mutateAsync(submitData);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating purchase order:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (vendorsLoading) {
    return <div className="p-4">جاري تحميل البيانات...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>إنشاء أمر شراء جديد</CardTitle>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  name="order_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ الطلب</FormLabel>
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
                            disabled={(date) => date < new Date('1900-01-01')}
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
                  name="expected_delivery_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ التسليم المتوقع</FormLabel>
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
                            disabled={(date) => date < new Date()}
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
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>شخص الاتصال</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="اسم شخص الاتصال" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الهاتف</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="رقم الهاتف" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="البريد الإلكتروني" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="delivery_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان التسليم</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="عنوان التسليم" rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">عناصر أمر الشراء</h3>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة عنصر
                  </Button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.item_code`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>رمز العنصر</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="رمز العنصر" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>الوصف</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="وصف العنصر" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>الكمية</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.001"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.unit_price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>السعر</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    step="0.001"
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-end justify-between">
                            <div className="text-sm">
                              <p className="text-muted-foreground">الإجمالي</p>
                              <p className="font-medium">
                                {calculateItemTotal(
                                  form.watch(`items.${index}.quantity`) || 0,
                                  form.watch(`items.${index}.unit_price`) || 0
                                ).toFixed(3)} د.ك
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeItem(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold">
                    الإجمالي الكلي: {calculateTotal().toFixed(3)} د.ك
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="terms_and_conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الشروط والأحكام</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="الشروط والأحكام" rows={3} />
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
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء أمر الشراء'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};