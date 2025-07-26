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
import { useCreateTrafficViolation } from '@/hooks/useTrafficViolations';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const violationSchema = z.object({
  penalty_number: z.string().min(1, 'رقم المخالفة مطلوب'),
  violation_type: z.string().min(1, 'نوع المخالفة مطلوب'),
  penalty_date: z.string().min(1, 'تاريخ المخالفة مطلوب'),
  amount: z.string().min(1, 'مبلغ المخالفة مطلوب'),
  location: z.string().min(1, 'موقع المخالفة مطلوب'),
  vehicle_plate: z.string().optional(),
  customer_id: z.string().optional(),
  contract_id: z.string().optional(),
  reason: z.string().min(1, 'سبب المخالفة مطلوب'),
  notes: z.string().optional(),
  status: z.string().default('pending'),
  payment_status: z.string().default('unpaid')
});

type ViolationFormData = z.infer<typeof violationSchema>;

interface TrafficViolationFormProps {
  onSuccess: () => void;
}

export function TrafficViolationForm({ onSuccess }: TrafficViolationFormProps) {
  const createViolationMutation = useCreateTrafficViolation();
  const { data: vehicles = [] } = useVehicles();

  // جلب قائمة العملاء
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, phone')
        .eq('is_active', true)
        .order('first_name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // جلب قائمة العقود النشطة
  const { data: contracts = [] } = useQuery({
    queryKey: ['active-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id, 
          contract_number, 
          start_date, 
          end_date,
          customers (first_name, last_name, company_name),
          vehicles (plate_number, make, model)
        `)
        .eq('status', 'active')
        .order('contract_number');
      
      if (error) throw error;
      return data || [];
    }
  });

  const form = useForm<ViolationFormData>({
    resolver: zodResolver(violationSchema),
    defaultValues: {
      status: 'pending',
      payment_status: 'unpaid'
    }
  });

  const onSubmit = async (data: ViolationFormData) => {
    try {
      const violationData = {
        ...data,
        amount: parseFloat(data.amount),
        penalty_date: new Date(data.penalty_date).toISOString().split('T')[0]
      };

      await createViolationMutation.mutateAsync(violationData);
      toast.success('تم إضافة المخالفة بنجاح');
      onSuccess();
    } catch (error) {
      console.error('Error creating violation:', error);
      toast.error('حدث خطأ أثناء إضافة المخالفة');
    }
  };

  const violationTypes = [
    'تجاوز السرعة المحددة',
    'قطع الإشارة الحمراء',
    'استخدام الهاتف أثناء القيادة',
    'عدم ربط حزام الأمان',
    'الوقوف في مكان ممنوع',
    'القيادة بدون رخصة',
    'القيادة تحت تأثير الكحول',
    'عدم إعطاء الأولوية',
    'القيادة العكسية',
    'تجاوز خاطئ',
    'عدم الالتزام بالمسار',
    'أخرى'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>بيانات المخالفة المرورية</CardTitle>
        <CardDescription>
          يرجى ملء جميع البيانات المطلوبة لتسجيل المخالفة المرورية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="penalty_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم المخالفة *</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل رقم المخالفة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="penalty_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تاريخ المخالفة *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="violation_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المخالفة *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المخالفة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {violationTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                    <FormLabel>مبلغ المخالفة (د.ك) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001" 
                        placeholder="0.000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>موقع المخالفة *</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل موقع المخالفة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicle_plate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم اللوحة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المركبة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.plate_number}>
                            {vehicle.plate_number} - {vehicle.make} {vehicle.model}
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
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.company_name || `${customer.first_name} ${customer.last_name}`} - {customer.phone}
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
                name="contract_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم العقد</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العقد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.contract_number} - {contract.vehicles?.plate_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب المخالفة *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="اكتب تفاصيل سبب المخالفة" 
                      className="min-h-[100px]"
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
                      placeholder="أي ملاحظات إضافية حول المخالفة" 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button 
                type="submit" 
                disabled={createViolationMutation.isPending}
                className="px-8"
              >
                {createViolationMutation.isPending ? 'جاري الحفظ...' : 'حفظ المخالفة'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}