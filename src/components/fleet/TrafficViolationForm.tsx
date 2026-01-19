import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCreateTrafficViolation, useUpdateTrafficViolation, TrafficViolation } from '@/hooks/useTrafficViolations';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

const violationSchema = z.object({
  penalty_number: z.string().optional(), // اجعله اختيارياً
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
  vehicleId?: string;
  violation?: TrafficViolation | null;
}

export function TrafficViolationForm({ onSuccess, vehicleId, violation }: TrafficViolationFormProps) {
  const createViolationMutation = useCreateTrafficViolation();
  const updateViolationMutation = useUpdateTrafficViolation();
  const isEditMode = !!violation;
  
  // Lazy load vehicles only when form opens
  const { data: vehicles = [] } = useVehicles({ limit: 50 });

  // جلب بيانات المركبة المحددة مسبقاً
  const { data: preselectedVehicle } = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model')
        .eq('id', vehicleId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!vehicleId,
  });

  // جلب قائمة العملاء - محدودة للأداء
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-limited'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, phone')
        .eq('is_active', true)
        .order('first_name')
        .limit(100); // Limit to 100 customers for performance
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // جلب قائمة العقود النشطة - مبسطة ومحدودة
  const { data: contracts = [] } = useQuery({
    queryKey: ['active-contracts-limited'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id, vehicle_id, start_date, end_date')
        .eq('status', 'active')
        .order('contract_number')
        .limit(50); // Limit to 50 contracts for performance
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const form = useForm<ViolationFormData>({
    resolver: zodResolver(violationSchema),
    defaultValues: {
      status: 'pending',
      payment_status: 'unpaid'
    }
  });

  // Watch for changes in penalty_date and vehicle_plate
  const watchedPenaltyDate = form.watch('penalty_date');
  const watchedVehiclePlate = form.watch('vehicle_plate');

  // Automatically find and set contract and customer based on penalty date and vehicle
  useEffect(() => {
    const fetchContractForViolation = async () => {
      if (!watchedPenaltyDate || (!watchedVehiclePlate && !vehicleId)) return;

      try {
        const vehicleIdToUse = vehicleId || (watchedVehiclePlate ? vehicles.find(v => v.plate_number === watchedVehiclePlate)?.id : null);
        
        if (!vehicleIdToUse) return;

        const date = new Date(watchedPenaltyDate).toISOString().split('T')[0];
        
        // Find contract active during penalty date
        const { data: contract, error } = await supabase
          .from('contracts')
          .select('id, customer_id')
          .eq('vehicle_id', vehicleIdToUse)
          .lte('start_date', date)
          .gte('end_date', date)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching contract for violation:', error);
          return;
        }

        if (contract) {
          form.setValue('contract_id', contract.id);
          form.setValue('customer_id', contract.customer_id);
          toast.info('تم تحديد العقد والعميل تلقائياً بناءً على تاريخ المخالفة');
        } else {
          // If no contract found, maybe clear the fields or warn user
          // form.setValue('contract_id', '');
          // form.setValue('customer_id', '');
        }
      } catch (err) {
        console.error('Error in auto-linking contract:', err);
      }
    };

    fetchContractForViolation();
  }, [watchedPenaltyDate, watchedVehiclePlate, vehicleId, form, vehicles]);

  // ملء النموذج ببيانات المخالفة عند التعديل
  useEffect(() => {
    if (violation) {
      form.reset({
        penalty_number: violation.penalty_number || '',
        violation_type: violation.violation_type || '',
        penalty_date: violation.penalty_date ? new Date(violation.penalty_date).toISOString().split('T')[0] : '',
        amount: violation.amount?.toString() || '0',
        location: violation.location || '',
        vehicle_plate: violation.vehicles?.plate_number || violation.vehicle_plate || '',
        customer_id: violation.customer_id || '',
        contract_id: violation.contract_id || '',
        reason: violation.reason || '',
        notes: violation.notes || '',
        status: violation.status || 'pending',
        payment_status: violation.payment_status || 'unpaid'
      });
    }
  }, [violation, form]);

  // تعيين المركبة تلقائياً عند وجود vehicleId
  useEffect(() => {
    if (preselectedVehicle?.plate_number && !violation) {
      form.setValue('vehicle_plate', preselectedVehicle.plate_number);
    }
  }, [preselectedVehicle, form, violation]);

  const onSubmit = async (data: ViolationFormData) => {
    try {
      if (isEditMode && violation) {
        // تحديث المخالفة
        const updateData: any = {
          id: violation.id,
          violation_type: data.violation_type,
          penalty_date: new Date(data.penalty_date).toISOString().split('T')[0],
          amount: parseFloat(data.amount),
          location: data.location,
          vehicle_plate: data.vehicle_plate,
          vehicle_id: vehicleId || violation.vehicle_id,
          customer_id: data.customer_id,
          contract_id: data.contract_id,
          reason: data.reason,
          notes: data.notes,
          status: data.status,
          payment_status: data.payment_status
        };

        await updateViolationMutation.mutateAsync(updateData);
        toast.success('تم تحديث المخالفة بنجاح');
      } else {
        // إنشاء مخالفة جديدة
        const violationData: any = {
          penalty_number: data.penalty_number,
          violation_type: data.violation_type,
          penalty_date: new Date(data.penalty_date).toISOString().split('T')[0],
          amount: parseFloat(data.amount),
          location: data.location,
          vehicle_plate: data.vehicle_plate,
          vehicle_id: vehicleId,
          customer_id: data.customer_id,
          contract_id: data.contract_id,
          reason: data.reason,
          notes: data.notes,
          status: data.status,
          payment_status: data.payment_status
        };

        await createViolationMutation.mutateAsync(violationData);
        toast.success('تم إضافة المخالفة بنجاح');
      }
      onSuccess();
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} violation:`, error);
      toast.error(`حدث خطأ أثناء ${isEditMode ? 'تحديث' : 'إضافة'} المخالفة`);
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
        <CardTitle>{isEditMode ? 'تعديل المخالفة المرورية' : 'بيانات المخالفة المرورية'}</CardTitle>
        <CardDescription>
          {isEditMode 
            ? 'تعديل بيانات المخالفة المرورية' 
            : 'يرجى ملء جميع البيانات المطلوبة لتسجيل المخالفة المرورية'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!isEditMode && (
                <FormField
                  control={form.control}
                  name="penalty_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم المخالفة (اختياري)</FormLabel>
                      <FormControl>
                        <Input placeholder="سيتم توليده تلقائياً إذا ترك فارغاً" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              {isEditMode && (
                <FormItem>
                  <FormLabel>رقم المخالفة</FormLabel>
                  <Input value={violation?.penalty_number || ''} disabled />
                </FormItem>
              )}

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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العقد" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contracts.map((contract) => (
                          <SelectItem key={contract.id} value={contract.id}>
                            {contract.contract_number}
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
                disabled={isEditMode ? updateViolationMutation.isPending : createViolationMutation.isPending}
                className="px-8"
              >
                {isEditMode 
                  ? (updateViolationMutation.isPending ? 'جاري التحديث...' : 'تحديث المخالفة')
                  : (createViolationMutation.isPending ? 'جاري الحفظ...' : 'حفظ المخالفة')
                }
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}