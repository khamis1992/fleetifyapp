import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomers } from '@/hooks/useCustomers';
import { useCreateDeposit, useUpdateDeposit } from '@/hooks/useDeposits';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const depositSchema = z.object({
  customer_id: z.string().min(1, 'اختيار العميل مطلوب'),
  deposit_type: z.string().min(1, 'نوع الوديعة مطلوب'),
  amount: z.number().min(0.001, 'المبلغ مطلوب ويجب أن يكون أكبر من صفر'),
  received_date: z.string().min(1, 'تاريخ الاستلام مطلوب'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

type DepositFormData = z.infer<typeof depositSchema>;

interface DepositFormProps {
  deposit?: any;
  onSuccess: () => void;
}

export function DepositForm({ deposit, onSuccess }: DepositFormProps) {
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const createDeposit = useCreateDeposit();
  const updateDeposit = useUpdateDeposit();

  const form = useForm<DepositFormData>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      customer_id: deposit?.customer_id || '',
      deposit_type: deposit?.deposit_type || 'security',
      amount: deposit?.amount || 0,
      received_date: deposit?.received_date || new Date().toISOString().split('T')[0],
      due_date: deposit?.due_date || '',
      notes: deposit?.notes || '',
    },
  });

  const onSubmit = async (data: DepositFormData) => {
    try {
      if (deposit) {
        await updateDeposit.mutateAsync({
          id: deposit.id,
          updates: {
            customer_id: data.customer_id,
            deposit_type: data.deposit_type,
            amount: data.amount,
            received_date: data.received_date,
            due_date: data.due_date,
            notes: data.notes,
          },
        });
      } else {
        await createDeposit.mutateAsync({
          customer_id: data.customer_id,
          deposit_type: data.deposit_type,
          amount: data.amount,
          received_date: data.received_date,
          due_date: data.due_date,
          notes: data.notes,
        });
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving deposit:', error);
    }
  };

  const isLoading = createDeposit.isPending || updateDeposit.isPending;

  const depositTypes = [
    { value: 'security', label: 'وديعة ضمان' },
    { value: 'advance', label: 'دفعة مقدمة' },
    { value: 'maintenance', label: 'وديعة صيانة' },
    { value: 'other', label: 'أخرى' },
  ];

  if (customersLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="customer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العميل</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العميل" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name || customer.company_name_ar || `Customer ${customer.id}`}
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
            name="deposit_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الوديعة</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الوديعة" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {depositTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ (د.ك)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="received_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ الاستلام</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ الاستحقاق (اختياري)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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
              <FormLabel>ملاحظات</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="أي ملاحظات إضافية..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
            {deposit ? 'تحديث الوديعة' : 'إضافة الوديعة'}
          </Button>
        </div>
      </form>
    </Form>
  );
}