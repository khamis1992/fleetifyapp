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
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { PropertyContract } from '@/modules/properties/types';

const contractSchema = z.object({
  property_id: z.string().min(1, 'اختيار العقار مطلوب'),
  tenant_name: z.string().min(1, 'اسم المستأجر مطلوب'),
  tenant_phone: z.string().optional(),
  tenant_email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  tenant_civil_id: z.string().optional(),
  contract_type: z.enum(['rental', 'sale']),
  start_date: z.date({
    required_error: 'تاريخ البداية مطلوب',
  }),
  end_date: z.date({
    required_error: 'تاريخ النهاية مطلوب',
  }),
  rental_amount: z.number().min(0, 'قيمة الإيجار يجب أن تكون موجبة'),
  payment_frequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']),
  deposit_amount: z.number().min(0, 'قيمة التأمين يجب أن تكون موجبة').optional(),
  commission_amount: z.number().min(0, 'قيمة العمولة يجب أن تكون موجبة').optional(),
  account_id: z.string().optional(),
  terms: z.string().optional(),
  notes: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface PropertyContractFormProps {
  contract?: PropertyContract;
  propertyId?: string;
  onSubmit: (data: ContractFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const contractTypeOptions = [
  { value: 'rental', label: 'عقد إيجار' },
  { value: 'sale', label: 'عقد بيع' },
];

const paymentFrequencyOptions = [
  { value: 'monthly', label: 'شهري' },
  { value: 'quarterly', label: 'ربع سنوي' },
  { value: 'semi_annual', label: 'نصف سنوي' },
  { value: 'annual', label: 'سنوي' },
];

export const PropertyContractForm: React.FC<PropertyContractFormProps> = ({
  contract,
  propertyId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { data: accounts = [], isLoading: accountsLoading } = useChartOfAccounts();

  // Filter accounts suitable for property rentals
  const rentalAccounts = accounts.filter(account => 
    account.is_active && 
    (account.account_type === 'revenue' || account.account_type === 'current_assets')
  );

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      property_id: propertyId || contract?.property_id || '',
      tenant_name: '',
      tenant_phone: '',
      tenant_email: '',
      tenant_civil_id: '',
      contract_type: 'rental',
      start_date: contract?.start_date ? new Date(contract.start_date) : new Date(),
      end_date: contract?.end_date ? new Date(contract.end_date) : new Date(),
      rental_amount: contract?.rental_amount || 0,
      payment_frequency: 'monthly',
      deposit_amount: contract?.deposit_amount || 0,
      commission_amount: contract?.commission_amount || 0,
      account_id: '',
      terms: contract?.terms || '',
      notes: contract?.notes || '',
    },
  });

  const handleSubmit = (data: ContractFormData) => {
    onSubmit(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* معلومات العقد */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات العقد</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contract_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع العقد</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع العقد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contractTypeOptions.map((option) => (
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
                name="payment_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تكرار الدفع</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر تكرار الدفع" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentFrequencyOptions.map((option) => (
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
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ البداية</FormLabel>
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
                              <span>اختر تاريخ البداية</span>
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
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ النهاية</FormLabel>
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
                              <span>اختر تاريخ النهاية</span>
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

          {/* معلومات المستأجر */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات المستأجر</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tenant_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستأجر</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم المستأجر" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم الهاتف" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل البريد الإلكتروني" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant_civil_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم المدني</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل الرقم المدني" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* المبالغ المالية */}
          <Card>
            <CardHeader>
              <CardTitle>المبالغ المالية</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rental_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قيمة الإيجار (دينار)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
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
                name="deposit_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قيمة التأمين (دينار)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
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
                name="commission_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>قيمة العمولة (دينار)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* الإعدادات المحاسبية */}
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات المحاسبية</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحساب المحاسبي</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحساب المحاسبي (اختياري)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accountsLoading ? (
                          <SelectItem value="" disabled>
                            جاري التحميل...
                          </SelectItem>
                        ) : (
                          <>
                            <SelectItem value="">استخدام الحساب الافتراضي</SelectItem>
                            {rentalAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {account.account_name}
                                {account.account_name_ar && ` (${account.account_name_ar})`}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* الشروط والملاحظات */}
          <Card>
            <CardHeader>
              <CardTitle>الشروط والملاحظات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>شروط العقد</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أدخل شروط العقد..."
                        className="min-h-20"
                        {...field}
                      />
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
              {contract ? 'تحديث العقد' : 'إنشاء العقد'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};