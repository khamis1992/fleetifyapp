import { useState } from "react";
import { Plus, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useVehiclePricing, useCreateVehiclePricing } from "@/hooks/useVehicles";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";

interface EnhancedVehiclePricingPanelProps {
  vehicleId: string;
}

interface EnhancedPricingFormData {
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  annual_rate: number;
  effective_from: string;
  effective_to?: string;
  mileage_limit_daily: number;
  mileage_limit_weekly: number;
  mileage_limit_monthly: number;
  excess_mileage_rate: number;
  late_return_hourly_rate: number;
  cleaning_fee: number;
  fuel_policy: string;
  security_deposit: number;
  cancellation_fee: number;
  peak_season_multiplier: number;
  weekend_multiplier: number;
}

export function EnhancedVehiclePricingPanel({ vehicleId }: EnhancedVehiclePricingPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: pricing, isLoading } = useVehiclePricing(vehicleId);
  const createPricing = useCreateVehiclePricing();

  const { register, handleSubmit, reset, watch } = useForm<EnhancedPricingFormData>({
    defaultValues: {
      mileage_limit_daily: 200,
      mileage_limit_weekly: 1400,
      mileage_limit_monthly: 6000,
      excess_mileage_rate: 0,
      late_return_hourly_rate: 0,
      cleaning_fee: 0,
      fuel_policy: 'full_to_full',
      security_deposit: 0,
      cancellation_fee: 0,
      peak_season_multiplier: 1.0,
      weekend_multiplier: 1.0,
    }
  });

  const onSubmit = async (data: EnhancedPricingFormData) => {
    await createPricing.mutateAsync({
      ...data,
      vehicle_id: vehicleId,
      is_active: true,
      currency: 'KWD', // Default currency
    });
    
    reset();
    setShowForm(false);
  };

  const activePricing = pricing?.find(p => p.is_active);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          التسعير المطور
        </CardTitle>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              إضافة تسعير
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>إضافة تسعير محدث</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daily_rate">السعر اليومي (د.ك)</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    {...register('daily_rate', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weekly_rate">السعر الأسبوعي (د.ك)</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    {...register('weekly_rate', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthly_rate">السعر الشهري (د.ك)</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    {...register('monthly_rate', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annual_rate">السعر السنوي (د.ك)</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    {...register('annual_rate', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="security_deposit">مبلغ التأمين (د.ك)</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    {...register('security_deposit', { valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cleaning_fee">رسوم التنظيف (د.ك)</Label>
                  <Input 
                    type="number" 
                    step="0.001"
                    {...register('cleaning_fee', { valueAsNumber: true })} 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">حدود المسافة</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mileage_limit_daily">الحد اليومي (كم)</Label>
                    <Input 
                      type="number" 
                      {...register('mileage_limit_daily', { valueAsNumber: true })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage_limit_weekly">الحد الأسبوعي (كم)</Label>
                    <Input 
                      type="number" 
                      {...register('mileage_limit_weekly', { valueAsNumber: true })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage_limit_monthly">الحد الشهري (كم)</Label>
                    <Input 
                      type="number" 
                      {...register('mileage_limit_monthly', { valueAsNumber: true })} 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">الرسوم الإضافية</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="excess_mileage_rate">رسوم تجاوز المسافة (د.ك/كم)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      {...register('excess_mileage_rate', { valueAsNumber: true })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="late_return_hourly_rate">رسوم التأخير بالساعة (د.ك)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      {...register('late_return_hourly_rate', { valueAsNumber: true })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cancellation_fee">رسوم الإلغاء (د.ك)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      {...register('cancellation_fee', { valueAsNumber: true })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuel_policy">سياسة الوقود</Label>
                    <Select onValueChange={(value) => register('fuel_policy').onChange({ target: { value } })}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر سياسة الوقود" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_to_full">ممتلئ إلى ممتلئ</SelectItem>
                        <SelectItem value="same_to_same">نفس المستوى</SelectItem>
                        <SelectItem value="prepaid">مدفوع مسبقاً</SelectItem>
                        <SelectItem value="empty_to_empty">فارغ إلى فارغ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">مضاعفات الأسعار</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="peak_season_multiplier">مضاعف الموسم العالي</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      {...register('peak_season_multiplier', { valueAsNumber: true })} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekend_multiplier">مضاعف نهاية الأسبوع</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      {...register('weekend_multiplier', { valueAsNumber: true })} 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="effective_from">ساري من</Label>
                  <Input 
                    type="date" 
                    {...register('effective_from', { required: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effective_to">ساري إلى (اختياري)</Label>
                  <Input 
                    type="date" 
                    {...register('effective_to')} 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={createPricing.isPending}>
                {createPricing.isPending ? 'جاري الحفظ...' : 'حفظ التسعير'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePricing ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">التسعير النشط</h4>
              <Badge variant="secondary">ساري</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">الأسعار الأساسية</p>
                <div className="space-y-1 text-sm">
                  <div>يومي: {activePricing.daily_rate?.toLocaleString()} د.ك</div>
                  <div>أسبوعي: {activePricing.weekly_rate?.toLocaleString()} د.ك</div>
                  <div>شهري: {activePricing.monthly_rate?.toLocaleString()} د.ك</div>
                  <div>سنوي: {activePricing.annual_rate?.toLocaleString()} د.ك</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">الرسوم الإضافية</p>
                <div className="space-y-1 text-sm">
                  <div>التأمين: {activePricing.security_deposit?.toLocaleString()} د.ك</div>
                  <div>التنظيف: {activePricing.cleaning_fee?.toLocaleString()} د.ك</div>
                  <div>الإلغاء: {activePricing.cancellation_fee?.toLocaleString()} د.ك</div>
                  <div>التأخير: {activePricing.late_return_hourly_rate?.toLocaleString()} د.ك/ساعة</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">حدود المسافة</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>يومي: {activePricing.mileage_limit_daily} كم</div>
                <div>أسبوعي: {activePricing.mileage_limit_weekly} كم</div>
                <div>شهري: {activePricing.mileage_limit_monthly} كم</div>
              </div>
              {activePricing.excess_mileage_rate > 0 && (
                <div className="text-sm">
                  رسوم تجاوز المسافة: {activePricing.excess_mileage_rate} د.ك/كم
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              ساري من: {format(new Date(activePricing.effective_from), 'dd/MM/yyyy')}
              {activePricing.effective_to && (
                <> إلى: {format(new Date(activePricing.effective_to), 'dd/MM/yyyy')}</>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">لا توجد أسعار محددة بعد</p>
          </div>
        )}

        {pricing && pricing.length > 1 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">تاريخ التسعير</h4>
            {pricing.filter(p => !p.is_active).slice(0, 3).map((price) => (
              <div key={price.id} className="p-3 border rounded-lg opacity-60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>يومي: {price.daily_rate?.toLocaleString()} د.ك</div>
                      <div>أسبوعي: {price.weekly_rate?.toLocaleString()} د.ك</div>
                      <div>شهري: {price.monthly_rate?.toLocaleString()} د.ك</div>
                      <div>سنوي: {price.annual_rate?.toLocaleString()} د.ك</div>
                    </div>
                  </div>
                  <Badge variant="outline">سابق</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(price.effective_from), 'dd/MM/yyyy')}
                  {price.effective_to && (
                    <> - {format(new Date(price.effective_to), 'dd/MM/yyyy')}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}