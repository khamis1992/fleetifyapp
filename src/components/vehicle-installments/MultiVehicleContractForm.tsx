import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Calculator, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useCreateVehicleInstallment } from "@/hooks/useVehicleInstallments";
import type { VehicleInstallmentCreateData } from "@/types/vehicle-installments";
import { toast } from "sonner";
import { VehicleSelector } from "./VehicleSelector";

const multiVehicleSchema = z.object({
  vendor_company_name: z.string().min(1, "يجب إدخال اسم شركة التاجر"),
  agreement_number: z.string().min(1, "يجب إدخال رقم الاتفاقية"),
  total_amount: z.number().min(1, "يجب إدخال المبلغ الإجمالي"),
  down_payment: z.number().min(0, "يجب إدخال الدفعة المقدمة"),
  number_of_installments: z.number().min(1, "يجب إدخال عدد الأقساط"),
  interest_rate: z.number().min(0, "يجب إدخال معدل الفائدة").max(100, "لا يمكن أن يتجاوز 100%"),
  start_date: z.string().min(1, "يجب اختيار تاريخ البداية"),
  agreement_date: z.string().min(1, "يجب اختيار تاريخ الاتفاقية"),
  notes: z.string().optional(),
});

interface VehicleAllocation {
  vehicle_id: string;
  allocated_amount: number;
}

interface MultiVehicleContractFormProps {
  trigger?: React.ReactNode;
}

export default function MultiVehicleContractForm({ trigger }: MultiVehicleContractFormProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { formatCurrency } = useCurrencyFormatter();
  const [vehicleAllocations, setVehicleAllocations] = useState<VehicleAllocation[]>([]);
  const [distributionMode, setDistributionMode] = useState<'equal' | 'custom'>('equal');
  
  const createInstallment = useCreateVehicleInstallment();

  const form = useForm<z.infer<typeof multiVehicleSchema>>({
    resolver: zodResolver(multiVehicleSchema),
    defaultValues: {
      vendor_company_name: "",
      agreement_number: "",
      total_amount: 0,
      down_payment: 0,
      number_of_installments: 12,
      interest_rate: 0,
      start_date: "",
      agreement_date: new Date().toISOString().split('T')[0],
      notes: "",
    },
  });

  // تم إدخال اسم شركة التاجر نصيًا، لا حاجة لجلب قائمة التجار

  // Fetch available vehicles - ENHANCED with comprehensive error handling
  const { data: vehicles, isLoading: vehiclesLoading, error: vehiclesError } = useQuery({
    queryKey: ['available-vehicles', user?.id],
    queryFn: async () => {
      try {
        console.log('🔄 بدء جلب المركبات المتاحة...');
        
        if (!user?.id) {
          console.warn('⚠️ لا يوجد معرف مستخدم لجلب المركبات');
          return [];
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('❌ خطأ في جلب بيانات ملف التعريف:', profileError);
          throw new Error('تعذر الوصول لبيانات الشركة');
        }

        if (!profile?.company_id) {
          console.warn('⚠️ لا يوجد معرف شركة في ملف التعريف');
          return [];
        }

        const { data, error } = await supabase
          .from('vehicles')
          .select('id, plate_number, make, model, year')
          .eq('company_id', profile.company_id)
          .eq('is_active', true)
          .order('plate_number', { ascending: true });

        if (error) {
          console.error('❌ خطأ في جلب المركبات:', error);
          throw new Error('تعذر تحميل قائمة المركبات');
        }

        // Enhanced data validation
        const validVehicles = (data || []).filter(vehicle => {
          const isValid = vehicle && 
                         typeof vehicle.id === 'string' && 
                         vehicle.id.length > 0 &&
                         typeof vehicle.plate_number === 'string' &&
                         vehicle.plate_number.length > 0;
          
          if (!isValid) {
            console.warn('⚠️ مركبة غير صالحة تم تجاهلها:', vehicle);
          }
          return isValid;
        });

        console.log(`✅ تم جلب ${validVehicles.length} مركبة صالحة بنجاح`);
        return validVehicles;
      } catch (error) {
        console.error('💥 خطأ شامل في جلب المركبات:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const addVehicle = () => {
    try {
      console.log('➕ إضافة مركبة جديدة...');
      setVehicleAllocations(prev => {
        // Validate current state
        if (!Array.isArray(prev)) {
          console.error('❌ vehicleAllocations ليس مصفوفة:', prev);
          return [{ vehicle_id: "", allocated_amount: 0 }];
        }
        
        const newAllocations = [...prev, { vehicle_id: "", allocated_amount: 0 }];
        console.log(`✅ تمت إضافة مركبة. العدد الحالي: ${newAllocations.length}`);
        return newAllocations;
      });
    } catch (error) {
      console.error('💥 خطأ في إضافة المركبة:', error);
      toast.error('حدث خطأ في إضافة المركبة');
    }
  };

  const removeVehicle = (index: number) => {
    try {
      console.log(`🗑️ إزالة المركبة في المؤشر: ${index}`);
      
      if (typeof index !== 'number' || index < 0) {
        console.error('❌ مؤشر غير صالح للحذف:', index);
        toast.error('خطأ في تحديد المركبة للحذف');
        return;
      }
      
      setVehicleAllocations(prev => {
        if (!Array.isArray(prev)) {
          console.error('❌ vehicleAllocations ليس مصفوفة:', prev);
          return [];
        }
        
        if (index >= prev.length) {
          console.error('❌ المؤشر خارج النطاق:', index, 'الطول:', prev.length);
          return prev;
        }
        
        const newAllocations = prev.filter((_, i) => i !== index);
        console.log(`✅ تمت إزالة المركبة. العدد المتبقي: ${newAllocations.length}`);
        return newAllocations;
      });
    } catch (error) {
      console.error('💥 خطأ في إزالة المركبة:', error);
      toast.error('حدث خطأ في إزالة المركبة');
    }
  };

  const updateVehicleAllocation = (index: number, field: keyof VehicleAllocation, value: string | number) => {
    try {
      // Validate inputs
      if (typeof index !== 'number' || index < 0) {
        console.error('Invalid index provided:', index);
        toast.error('خطأ في تحديد المركبة');
        return;
      }

      if (!field || (field !== 'vehicle_id' && field !== 'allocated_amount')) {
        console.error('Invalid field provided:', field);
        toast.error('خطأ في نوع البيانات');
        return;
      }

      // Additional validation for vehicle_id
      if (field === 'vehicle_id' && (!value || typeof value !== 'string')) {
        console.error('Invalid vehicle_id provided:', value);
        toast.error('معرف المركبة غير صالح');
        return;
      }

      // Additional validation for allocated_amount
      if (field === 'allocated_amount' && (typeof value !== 'number' || isNaN(value) || value < 0)) {
        console.error('Invalid allocated_amount provided:', value);
        toast.error('المبلغ المخصص غير صالح');
        return;
      }

      setVehicleAllocations(prev => {
        // Validate current state
        if (!Array.isArray(prev)) {
          console.error('vehicleAllocations is not an array:', prev);
          return [];
        }

        // Check if index is within bounds
        if (index >= prev.length) {
          console.error('Index out of bounds:', index, 'length:', prev.length);
          return prev;
        }

        return prev.map((allocation, i) => {
          if (i === index) {
            // Validate current allocation
            if (!allocation || typeof allocation !== 'object') {
              console.error('Invalid allocation object at index:', index, allocation);
              return { vehicle_id: '', allocated_amount: 0 };
            }
            return { ...allocation, [field]: value };
          }
          return allocation;
        });
      });
      
      console.log(`تم تحديث المركبة في المؤشر ${index}:`, { field, value });
    } catch (error) {
      console.error('خطأ في تحديث تخصيص المركبة:', error);
      toast.error('حدث خطأ في تحديث المركبة');
    }
  };

  const calculateEqualDistribution = () => {
    const totalAmount = form.getValues('total_amount');
    const downPayment = form.getValues('down_payment');
    const amountToDistribute = totalAmount - downPayment;
    const vehicleCount = vehicleAllocations.length;
    
    if (vehicleCount === 0) return;
    
    const amountPerVehicle = amountToDistribute / vehicleCount;
    
    setVehicleAllocations(prev => prev.map(allocation => ({
      ...allocation,
      allocated_amount: amountPerVehicle
    })));
  };

  const getTotalAllocated = () => {
    return vehicleAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0);
  };

  const getRemainingAmount = () => {
    const totalAmount = form.getValues('total_amount');
    const downPayment = form.getValues('down_payment');
    const amountToDistribute = totalAmount - downPayment;
    return amountToDistribute - getTotalAllocated();
  };

  const calculateInstallmentDetails = () => {
    const data = form.getValues();
    const totalAmount = data.total_amount;
    const downPayment = data.down_payment;
    const financeAmount = totalAmount - downPayment;
    const interestRate = data.interest_rate / 100;
    const numberOfInstallments = data.number_of_installments;

    if (interestRate === 0) {
      return {
        installmentAmount: financeAmount / numberOfInstallments,
        endDate: new Date(new Date(data.start_date).getTime() + numberOfInstallments * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    }

    const monthlyRate = interestRate / 12;
    const installmentAmount = (financeAmount * monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments)) / 
                             (Math.pow(1 + monthlyRate, numberOfInstallments) - 1);
    
    const endDate = new Date(new Date(data.start_date).getTime() + numberOfInstallments * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return { installmentAmount, endDate };
  };

  const onSubmit = async (data: z.infer<typeof multiVehicleSchema>) => {
    if (vehicleAllocations.length === 0) {
      toast.error("يجب إضافة مركبة واحدة على الأقل");
      return;
    }

    const remainingAmount = getRemainingAmount();
    if (Math.abs(remainingAmount) > 0.01) {
      toast.error(`يجب توزيع كامل المبلغ. المتبقي: ${formatCurrency(remainingAmount)}`);
      return;
    }

    const calculatedData = calculateInstallmentDetails();

    // تحديد/إنشاء التاجر (شركة) تلقائياً بناءً على الاسم المُدخل
    let vendorId: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user!.id)
        .single();

      if (!profile?.company_id) {
        toast.error("تعذر تحديد الشركة");
        return;
      }

      const companyName = data.vendor_company_name.trim();

      const { data: existing, error: searchError } = await supabase
        .from('customers')
        .select('id, customer_type, company_name')
        .eq('company_id', profile.company_id)
        .ilike('company_name', companyName)
        .maybeSingle();

      if (searchError) {
        console.error('Error searching customer:', searchError);
      }

      if (existing?.id) {
        vendorId = existing.id;
      } else {
        const { data: created, error: insertError } = await supabase
          .from('customers')
.insert({
            company_id: profile.company_id,
            customer_type: 'corporate',
            company_name: companyName,
            created_by: user!.id,
          } as any)
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }
        vendorId = created.id;
      }
    } catch (e: any) {
      console.error('Vendor resolution failed:', e);
      toast.error("حدث خطأ أثناء تحديد التاجر");
      return;
    }

    const formData: VehicleInstallmentCreateData = {
      vendor_id: vendorId!,
      vehicle_ids: vehicleAllocations.map(v => v.vehicle_id),
      vehicle_amounts: vehicleAllocations.reduce((acc, v) => {
        acc[v.vehicle_id] = v.allocated_amount;
        return acc;
      }, {} as { [key: string]: number }),
      agreement_number: data.agreement_number,
      total_amount: data.total_amount,
      down_payment: data.down_payment,
      installment_amount: calculatedData.installmentAmount,
      number_of_installments: data.number_of_installments,
      interest_rate: data.interest_rate,
      start_date: data.start_date,
      end_date: calculatedData.endDate,
      agreement_date: data.agreement_date,
      notes: data.notes,
      contract_type: 'multi_vehicle',
    };

    await createInstallment.mutateAsync(formData);
    setOpen(false);
    form.reset();
    setVehicleAllocations([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 ml-2" />
            إضافة عقد متعدد المركبات
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إنشاء عقد أقساط متعدد المركبات</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>معلومات العقد الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vendor_company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>شركة التاجر</FormLabel>
                        <FormControl>
                          <Input placeholder="اسم شركة التاجر" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="agreement_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رقم الاتفاقية</FormLabel>
                        <FormControl>
                          <Input placeholder="رقم الاتفاقية" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ الإجمالي (دينار كويتي)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="المبلغ الإجمالي" 
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
                    name="down_payment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الدفعة المقدمة (دينار كويتي)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="الدفعة المقدمة" 
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
                    name="number_of_installments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الأقساط</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="عدد الأقساط" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interest_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>معدل الفائدة السنوي (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="معدل الفائدة" 
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
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ البداية</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="agreement_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الاتفاقية</FormLabel>
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
                        <Textarea placeholder="ملاحظات إضافية" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Vehicle Allocation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  توزيع المركبات
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={calculateEqualDistribution}
                      disabled={vehicleAllocations.length === 0}
                    >
                      <Calculator className="h-4 w-4 ml-1" />
                      توزيع متساوي
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={addVehicle}
                      disabled={vehiclesLoading || (!vehicles || vehicles.length === 0)}
                    >
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة مركبة
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {vehicleAllocations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {vehiclesLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        جاري تحميل المركبات...
                      </div>
                    ) : vehiclesError ? (
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                        <p className="text-red-600">خطأ في تحميل المركبات</p>
                        <p className="text-sm">{vehiclesError.message}</p>
                      </div>
                    ) : (!vehicles || vehicles.length === 0) ? (
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
                        <p>لا توجد مركبات متاحة في النظام</p>
                        <p className="text-sm">يرجى إضافة مركبات أولاً من قسم إدارة الأسطول</p>
                      </div>
                    ) : (
                      "لم يتم إضافة أي مركبات بعد"
                    )}
                  </div>
                )}

                {vehicleAllocations.map((allocation, index) => (
                  <div key={index} className="flex gap-4 items-end p-4 border rounded-lg">
                    <div className="flex-1">
                      <label className="text-sm font-medium">المركبة</label>
                       <VehicleSelector
                        vehicles={(() => {
                          try {
                            console.log('🔄 إعداد المركبات لـ VehicleSelector...');
                            
                            if (!vehicles || !Array.isArray(vehicles)) {
                              console.warn('⚠️ المركبات غير متاحة أو ليست مصفوفة:', vehicles);
                              return [];
                            }
                            
                            const safeVehicles = vehicles.filter(v => {
                              return v && 
                                     typeof v.id === 'string' && 
                                     v.id.length > 0 &&
                                     typeof v.plate_number === 'string' &&
                                     v.plate_number.length > 0;
                            });
                            
                            console.log(`✅ تم إعداد ${safeVehicles.length} مركبة صالحة`);
                            return safeVehicles;
                          } catch (error) {
                            console.error('💥 خطأ في إعداد المركبات:', error);
                            return [];
                          }
                        })()}
                        selectedVehicleId={allocation?.vehicle_id || ''}
                        excludeVehicleIds={(() => {
                          try {
                            console.log('🔄 إعداد قائمة الاستثناءات...');
                            
                            if (!Array.isArray(vehicleAllocations)) {
                              console.warn('⚠️ vehicleAllocations ليس مصفوفة:', vehicleAllocations);
                              return [];
                            }
                            
                            const excludeIds = vehicleAllocations
                              .map((a, i) => {
                                // Don't exclude current allocation
                                if (i === index) return null;
                                // Only include valid vehicle IDs
                                return (a && a.vehicle_id && typeof a.vehicle_id === 'string' && a.vehicle_id.length > 0) 
                                  ? a.vehicle_id 
                                  : null;
                              })
                              .filter(id => id !== null) as string[];
                            
                            console.log(`✅ تم إعداد ${excludeIds.length} معرف استثناء`);
                            return excludeIds;
                          } catch (error) {
                            console.error('💥 خطأ في إعداد قائمة الاستثناءات:', error);
                            return [];
                          }
                        })()}
                        onSelect={(vehicleId) => {
                          try {
                            console.log('🎯 تم اختيار المركبة:', vehicleId);
                            
                            if (!vehicleId || typeof vehicleId !== 'string' || vehicleId.length === 0) {
                              console.error('❌ معرف المركبة غير صالح:', vehicleId);
                              toast.error('معرف المركبة غير صالح');
                              return;
                            }
                            
                            updateVehicleAllocation(index, 'vehicle_id', vehicleId);
                            console.log('✅ تم تحديث تخصيص المركبة بنجاح');
                          } catch (error) {
                            console.error('💥 خطأ في معالجة اختيار المركبة:', error);
                            toast.error('حدث خطأ في اختيار المركبة');
                          }
                        }}
                        placeholder="اختر المركبة..."
                        isLoading={vehiclesLoading}
                        error={vehiclesError?.message || null}
                      />
                    </div>
                    
                    <div className="flex-1">
                      <label className="text-sm font-medium">المبلغ المخصص (دينار كويتي)</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="المبلغ المخصص"
                        value={allocation.allocated_amount || ''}
                        onChange={(e) => updateVehicleAllocation(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeVehicle(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {vehicleAllocations.length > 0 && (
                  <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                    <div className="flex justify-between">
                      <span>المبلغ الإجمالي:</span>
                      <span className="font-semibold">{formatCurrency(form.watch('total_amount') || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الدفعة المقدمة:</span>
                      <span className="font-semibold">{formatCurrency(form.watch('down_payment') || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المبلغ للتوزيع:</span>
                      <span className="font-semibold">{formatCurrency((form.watch('total_amount') || 0) - (form.watch('down_payment') || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>المبلغ الموزع:</span>
                      <span className="font-semibold">{formatCurrency(getTotalAllocated())}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>المتبقي:</span>
                      <Badge variant={Math.abs(getRemainingAmount()) < 0.01 ? "default" : "destructive"}>
                        {formatCurrency(getRemainingAmount())}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={createInstallment.isPending || vehicleAllocations.length === 0}
              >
                {createInstallment.isPending ? "جاري الإنشاء..." : "إنشاء العقد"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}