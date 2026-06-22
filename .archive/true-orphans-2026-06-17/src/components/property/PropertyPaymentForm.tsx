import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePropertyContracts } from '@/modules/properties/hooks';

const paymentSchema = z.object({
  property_contract_id: z.string().min(1, 'اختيار العقد مطلوب'),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  payment_date: z.date({
    required_error: 'تاريخ الدفع مطلوب',
  }),
  due_date: z.date({
    required_error: 'تاريخ الاستحقاق مطلوب',
  }),
  payment_method: z.enum(['cash', 'bank_transfer', 'check', 'credit_card']),
  payment_type: z.enum(['rental', 'deposit', 'commission', 'maintenance', 'other']),
  reference_number: z.string().optional(),
  installment_number: z.number().min(1, 'رقم القسط يجب أن يكون موجباً').optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PropertyPaymentFormProps {
  payment?: any; // Property payment type
  contractId?: string;
  onSubmit: (data: PaymentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const paymentMethodOptions = [
  { value: 'cash', label: 'نقداً' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'check', label: 'شيك' },
  { value: 'credit_card', label: 'بطاقة ائتمان' },
];

const paymentTypeOptions = [
  { value: 'rental', label: 'إيجار' },
  { value: 'deposit', label: 'تأمين' },
  { value: 'commission', label: 'عمولة' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'other', label: 'أخرى' },
];

export const PropertyPaymentForm: React.FC<PropertyPaymentFormProps> = ({
  payment,
  contractId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { data: contracts = [], isLoading: contractsLoading } = usePropertyContracts();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      property_contract_id: contractId || payment?.property_contract_id || '',
      amount: payment?.amount || 0,
      payment_date: payment?.payment_date ? new Date(payment.payment_date) : new Date(),
      due_date: payment?.due_date ? new Date(payment.due_date) : new Date(),
      payment_method: payment?.payment_method || 'cash',
      payment_type: payment?.payment_type || 'rental',
      reference_number: payment?.reference_number || '',
      installment_number: payment?.installment_number || 1,
      notes: payment?.notes || '',
    },
  });

  const handleSubmit = (data: PaymentFormData) => {
    onSubmit(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* معلومات الدفعة */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات الدفعة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="property_contract_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العقد</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العقد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contractsLoading ? (
                          <SelectItem value="" disabled>
                            جاري التحميل...
                          </SelectItem>
                        ) : (
                          contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.contract_number} - {contract.tenant_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الدفعة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الدفعة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المبلغ (دينار)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installment_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم القسط</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="payment_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
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
                              <span>اختر تاريخ الدفع</span>
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
                name="due_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الاستحقاق</FormLabel>
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
                              <span>اختر تاريخ الاستحقاق</span>
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
            </CardContent>
          </Card>

          {/* تفاصيل الدفع */}
          <Card>
            <CardHeader>
              <CardTitle>تفاصيل الدفع</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم المرجع</FormLabel>
                    <FormControl>
                      <Input placeholder="رقم الشيك أو رقم التحويل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ملاحظات */}
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أدخل ملاحظات إضافية..."
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Separator />

          {/* أزرار الإجراءات */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {payment ? 'تحديث الدفعة' : 'تسجيل الدفعة'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};