import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calculator } from "lucide-react";
import { useCreateVehicleInstallment } from "@/hooks/useVehicleInstallments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import type { VehicleInstallmentCreateData } from "@/types/vehicle-installments";

const installmentSchema = z.object({
  vendor_id: z.string().min(1, "يجب اختيار التاجر"),
  vehicle_id: z.string().min(1, "يجب اختيار المركبة"),
  agreement_number: z.string().min(1, "رقم الاتفاقية مطلوب"),
  total_amount: z.number().min(1, "يجب أن يكون المبلغ الإجمالي أكبر من صفر"),
  down_payment: z.number().min(0, "الدفعة المقدمة لا يمكن أن تكون سالبة"),
  installment_amount: z.number().min(0, "مبلغ القسط مطلوب"),
  number_of_installments: z.number().min(1, "عدد الأقساط يجب أن يكون على الأقل 1"),
  interest_rate: z.number().min(0, "معدل الفائدة لا يمكن أن يكون سالب").optional(),
  start_date: z.string().min(1, "تاريخ البداية مطلوب"),
  end_date: z.string().min(1, "تاريخ النهاية مطلوب"),
  agreement_date: z.string().min(1, "تاريخ الاتفاقية مطلوب"),
  notes: z.string().optional(),
});

type InstallmentFormData = z.infer<typeof installmentSchema>;

interface VehicleInstallmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const VehicleInstallmentForm = ({ onSuccess, onCancel }: VehicleInstallmentFormProps) => {
  const { user } = useAuth();
  const createInstallment = useCreateVehicleInstallment();
  const [calculatedData, setCalculatedData] = useState<{
    installmentAmount: number;
    endDate: string;
    totalWithInterest: number;
  } | null>(null);
  const { formatCurrency } = useCurrencyFormatter();


  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InstallmentFormData>({
    resolver: zodResolver(installmentSchema),
    defaultValues: {
      agreement_date: new Date().toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0],
      interest_rate: 0,
      down_payment: 0,
    },
  });

  // Watch form values for calculations
  const watchedValues = watch(['total_amount', 'down_payment', 'number_of_installments', 'interest_rate', 'start_date']);

  // Fetch vendors (customers with vendor role)
  const { data: vendors } = useQuery({
    queryKey: ['vendors', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch vehicles
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, year')
        .eq('company_id', profile.company_id)
        .order('plate_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const calculateInstallment = () => {
    const [totalAmount, downPayment, numberOfInstallments, interestRate, startDate] = watchedValues;
    
    if (!totalAmount || !numberOfInstallments || !startDate) return;

    const principal = totalAmount - (downPayment || 0);
    const monthlyInterestRate = (interestRate || 0) / 12 / 100;
    
    let installmentAmount: number;
    let totalWithInterest: number;

    if (monthlyInterestRate > 0) {
      // Calculate using compound interest formula
      const denominator = Math.pow(1 + monthlyInterestRate, numberOfInstallments) - 1;
      installmentAmount = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfInstallments) / denominator;
      totalWithInterest = installmentAmount * numberOfInstallments + (downPayment || 0);
    } else {
      // Simple division if no interest
      installmentAmount = principal / numberOfInstallments;
      totalWithInterest = totalAmount;
    }

    // Calculate end date
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + numberOfInstallments);

    setCalculatedData({
      installmentAmount: Math.round(installmentAmount * 100) / 100,
      endDate: endDate.toISOString().split('T')[0],
      totalWithInterest: Math.round(totalWithInterest * 100) / 100,
    });

    setValue('installment_amount', Math.round(installmentAmount * 100) / 100);
    setValue('end_date', endDate.toISOString().split('T')[0]);
  };

  const onSubmit = async (data: InstallmentFormData) => {
    if (!calculatedData) {
      calculateInstallment();
      return;
    }

    const formData: VehicleInstallmentCreateData = {
      vendor_id: data.vendor_id,
      vehicle_id: data.vehicle_id,
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
    };

    await createInstallment.mutateAsync(formData);
    onSuccess();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="h-4 w-4 ml-2" />
          العودة
        </Button>
        <div>
          <h1 className="text-3xl font-bold">إضافة اتفاقية أقساط جديدة</h1>
          <p className="text-muted-foreground">إنشاء اتفاقية أقساط جديدة مع أحد التجار</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الاتفاقية</CardTitle>
              <CardDescription>تفاصيل اتفاقية الأقساط الأساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agreement_number">رقم الاتفاقية</Label>
                <Input
                  id="agreement_number"
                  {...register('agreement_number')}
                  placeholder="INST-2024-001"
                />
                {errors.agreement_number && (
                  <p className="text-sm text-destructive mt-1">{errors.agreement_number.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vendor_id">التاجر</Label>
                <Select onValueChange={(value) => setValue('vendor_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التاجر" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors?.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.customer_type === 'individual' 
                          ? `${vendor.first_name} ${vendor.last_name}`
                          : vendor.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendor_id && (
                  <p className="text-sm text-destructive mt-1">{errors.vendor_id.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_id">المركبة</Label>
                <Select onValueChange={(value) => setValue('vehicle_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المركبة" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate_number} - {vehicle.make} {vehicle.model} ({vehicle.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicle_id && (
                  <p className="text-sm text-destructive mt-1">{errors.vehicle_id.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="agreement_date">تاريخ الاتفاقية</Label>
                  <Input
                    id="agreement_date"
                    type="date"
                    {...register('agreement_date')}
                  />
                  {errors.agreement_date && (
                    <p className="text-sm text-destructive mt-1">{errors.agreement_date.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="start_date">تاريخ البداية</Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register('start_date')}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="ملاحظات إضافية حول الاتفاقية"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>التفاصيل المالية</CardTitle>
              <CardDescription>مبالغ وشروط الأقساط</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="total_amount">المبلغ الإجمالي</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  {...register('total_amount', { valueAsNumber: true })}
                  placeholder="10000"
                />
                {errors.total_amount && (
                  <p className="text-sm text-destructive mt-1">{errors.total_amount.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="down_payment">الدفعة المقدمة</Label>
                <Input
                  id="down_payment"
                  type="number"
                  step="0.01"
                  {...register('down_payment', { valueAsNumber: true })}
                  placeholder="2000"
                />
                {errors.down_payment && (
                  <p className="text-sm text-destructive mt-1">{errors.down_payment.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="number_of_installments">عدد الأقساط</Label>
                  <Input
                    id="number_of_installments"
                    type="number"
                    {...register('number_of_installments', { valueAsNumber: true })}
                    placeholder="12"
                  />
                  {errors.number_of_installments && (
                    <p className="text-sm text-destructive mt-1">{errors.number_of_installments.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="interest_rate">معدل الفائدة السنوي (%)</Label>
                  <Input
                    id="interest_rate"
                    type="number"
                    step="0.01"
                    {...register('interest_rate', { valueAsNumber: true })}
                    placeholder="5.5"
                  />
                  {errors.interest_rate && (
                    <p className="text-sm text-destructive mt-1">{errors.interest_rate.message}</p>
                  )}
                </div>
              </div>

              <Button type="button" onClick={calculateInstallment} className="w-full gap-2">
                <Calculator className="h-4 w-4" />
                حساب الأقساط
              </Button>

              {calculatedData && (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold">نتائج الحساب:</h4>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>مبلغ القسط الشهري:</span>
                      <span className="font-semibold">{formatCurrency(calculatedData.installmentAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تاريخ انتهاء الأقساط:</span>
                      <span className="font-semibold">{calculatedData.endDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>إجمالي المبلغ مع الفوائد:</span>
                      <span className="font-semibold">{formatCurrency(calculatedData.totalWithInterest)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isSubmitting || !calculatedData}>
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الاتفاقية'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default VehicleInstallmentForm;