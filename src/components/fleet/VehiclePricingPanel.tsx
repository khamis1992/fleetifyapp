import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useVehiclePricing, useCreateVehiclePricing } from "@/hooks/useVehicles";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { Plus, Edit, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";

interface VehiclePricingPanelProps {
  vehicleId: string;
}

interface PricingFormData {
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  annual_rate: number;
  effective_from: string;
  effective_to?: string;
}

export function VehiclePricingPanel({ vehicleId }: VehiclePricingPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const { formatCurrency, currency } = useCurrencyFormatter();
  const { data: pricing, isLoading } = useVehiclePricing(vehicleId);
  const createPricing = useCreateVehiclePricing();

  const form = useForm<PricingFormData>({
    defaultValues: {
      daily_rate: 0,
      weekly_rate: 0,
      monthly_rate: 0,
      annual_rate: 0,
      effective_from: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data: PricingFormData) => {
    await createPricing.mutateAsync({
      vehicle_id: vehicleId,
      currency: currency,
      is_active: true,
      ...data,
    });
    setShowForm(false);
    form.reset();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">جاري تحميل التسعير...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activePricing = pricing?.find(p => p.is_active);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">تسعير المركبة</CardTitle>
            <CardDescription>إدارة أسعار الإيجار وتاريخ التسعير</CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                إضافة تسعير
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة تسعير جديد</DialogTitle>
                <DialogDescription>
                  تحديد أسعار إيجار جديدة لهذه المركبة
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="daily_rate">التعرفة اليومية (د.ك)</Label>
                    <Input
                      id="daily_rate"
                      type="number"
                      step="0.001"
                      {...form.register("daily_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weekly_rate">التعرفة الأسبوعية (د.ك)</Label>
                    <Input
                      id="weekly_rate"
                      type="number"
                      step="0.001"
                      {...form.register("weekly_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="monthly_rate">التعرفة الشهرية (د.ك)</Label>
                    <Input
                      id="monthly_rate"
                      type="number"
                      step="0.001"
                      {...form.register("monthly_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_rate">التعرفة السنوية (د.ك)</Label>
                    <Input
                      id="annual_rate"
                      type="number"
                      step="0.001"
                      {...form.register("annual_rate", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="effective_from">ساري من</Label>
                    <Input
                      id="effective_from"
                      type="date"
                      {...form.register("effective_from")}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="effective_to">ساري إلى (اختياري)</Label>
                  <Input
                    id="effective_to"
                    type="date"
                    {...form.register("effective_to")}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={createPricing.isPending}>
                    {createPricing.isPending ? "جاري الحفظ..." : "حفظ التسعير"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {pricing && pricing.length > 0 ? (
          <>
            {activePricing ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">التسعير الحالي</h4>
              <Badge variant="default">نشط</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">يومي</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.daily_rate)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">أسبوعي</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.weekly_rate)}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">شهري</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.monthly_rate)}</p>
              </div>
            </div>
            {activePricing.annual_rate && (
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">سنوي</p>
                <p className="text-lg font-semibold">{formatCurrency(activePricing.annual_rate)}</p>
              </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              ساري من {new Date(activePricing.effective_from).toLocaleDateString()}
              {activePricing.effective_to && (
                <span> إلى {new Date(activePricing.effective_to).toLocaleDateString()}</span>
              )}
            </div>
          </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">يوجد تسعير سابق لكنه غير نشط حالياً</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة تسعير جديد
                </Button>
              </div>
            )}

            {/* Pricing History */}
            {pricing && pricing.length > 1 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-3">تاريخ التسعير</h4>
                <div className="space-y-2">
                  {pricing
                    .filter(p => !p.is_active)
                    .slice(0, 3)
                    .map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>
                          يومي: {formatCurrency(p.daily_rate)} | 
                          أسبوعي: {formatCurrency(p.weekly_rate)} | 
                          شهري: {formatCurrency(p.monthly_rate)}
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(p.effective_from).toLocaleDateString('en-US')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لم يتم تحديد تسعير لهذه المركبة</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة تسعير
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}