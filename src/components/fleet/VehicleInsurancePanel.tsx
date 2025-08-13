import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Plus, Calendar, AlertTriangle } from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { format } from "date-fns";
import { useVehicleInsurance, useCreateVehicleInsurance } from "@/hooks/useVehicleInsurance";

interface VehicleInsurancePanelProps {
  vehicleId: string;
}

interface InsuranceFormData {
  insurance_company: string;
  policy_number: string;
  policy_type: string;
  start_date: string;
  end_date: string;
  premium_amount: number;
  coverage_amount?: number;
  deductible_amount?: number;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
}

export function VehicleInsurancePanel({ vehicleId }: VehicleInsurancePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: insurance, isLoading } = useVehicleInsurance(vehicleId);
  const createInsurance = useCreateVehicleInsurance();
  const { formatCurrency } = useCurrencyFormatter();


  const form = useForm<InsuranceFormData>({
    defaultValues: {
      insurance_company: "",
      policy_number: "",
      policy_type: "comprehensive",
      start_date: new Date().toISOString().split('T')[0],
      end_date: "",
      premium_amount: 0,
      coverage_amount: 0,
      deductible_amount: 0,
      contact_person: "",
      contact_phone: "",
      contact_email: "",
      notes: "",
    }
  });

  const onSubmit = async (data: InsuranceFormData) => {
    await createInsurance.mutateAsync({
      vehicle_id: vehicleId,
      is_active: true,
      ...data,
    });
    setShowForm(false);
    form.reset();
  };

  if (isLoading) {
    return <div>Loading insurance...</div>;
  }

  const activeInsurance = insurance?.find(p => p.is_active);
  const isExpiringSoon = activeInsurance && new Date(activeInsurance.end_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">تأمين المركبة</CardTitle>
            <CardDescription>إدارة بوالص التأمين وتواريخ التجديد</CardDescription>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                إضافة تأمين
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة بوليصة تأمين جديدة</DialogTitle>
                <DialogDescription>
                  تسجيل بيانات التأمين وتفاصيل البوليصة
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insurance_company">شركة التأمين</Label>
                    <Input
                      id="insurance_company"
                      {...form.register("insurance_company", { required: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="policy_number">رقم البوليصة</Label>
                    <Input
                      id="policy_number"
                      {...form.register("policy_number", { required: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="policy_type">نوع التأمين</Label>
                    <select
                      id="policy_type"
                      className="w-full p-2 border rounded"
                      {...form.register("policy_type")}
                    >
                      <option value="comprehensive">شامل</option>
                      <option value="third_party">طرف ثالث</option>
                      <option value="collision">تصادم</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="premium_amount">قسط التأمين (د.ك)</Label>
                    <Input
                      id="premium_amount"
                      type="number"
                      step="0.001"
                      {...form.register("premium_amount", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="coverage_amount">مبلغ التغطية (د.ك)</Label>
                    <Input
                      id="coverage_amount"
                      type="number"
                      step="0.001"
                      {...form.register("coverage_amount", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="deductible_amount">مبلغ التحمل (د.ك)</Label>
                    <Input
                      id="deductible_amount"
                      type="number"
                      step="0.001"
                      {...form.register("deductible_amount", { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="start_date">تاريخ البداية</Label>
                    <Input
                      id="start_date"
                      type="date"
                      {...form.register("start_date")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">تاريخ الانتهاء</Label>
                    <Input
                      id="end_date"
                      type="date"
                      {...form.register("end_date")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_person">شخص الاتصال</Label>
                    <Input
                      id="contact_person"
                      {...form.register("contact_person")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact_phone">رقم الهاتف</Label>
                    <Input
                      id="contact_phone"
                      {...form.register("contact_phone")}
                      dir="ltr"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="contact_email">البريد الإلكتروني</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    {...form.register("contact_email")}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">ملاحظات</Label>
                  <textarea
                    id="notes"
                    className="w-full p-2 border rounded"
                    rows={3}
                    {...form.register("notes")}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={createInsurance.isPending}>
                    {createInsurance.isPending ? "جاري الحفظ..." : "حفظ التأمين"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {activeInsurance ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">التأمين الحالي</h4>
              <div className="flex gap-2">
                <Badge variant="default">نشط</Badge>
                {isExpiringSoon && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    ينتهي قريباً
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">شركة التأمين</p>
                <p className="font-semibold">{activeInsurance.insurance_company}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">رقم البوليصة</p>
                <p className="font-semibold">{activeInsurance.policy_number}</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">نوع التأمين</p>
                <p className="font-semibold">
                  {activeInsurance.policy_type === 'comprehensive' ? 'شامل' : 
                   activeInsurance.policy_type === 'third_party' ? 'طرف ثالث' : 'تصادم'}
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">قسط التأمين</p>
                <p className="font-semibold">{formatCurrency(activeInsurance.premium_amount)}</p>
              </div>
              {activeInsurance.coverage_amount && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">مبلغ التغطية</p>
                  <p className="font-semibold">{formatCurrency(activeInsurance.coverage_amount)}</p>
                </div>
              )}
              {activeInsurance.deductible_amount && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">مبلغ التحمل</p>
                  <p className="font-semibold">{formatCurrency(activeInsurance.deductible_amount)}</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-2" />
              ساري من {format(new Date(activeInsurance.start_date), 'dd/MM/yyyy')} 
              إلى {format(new Date(activeInsurance.end_date), 'dd/MM/yyyy')}
            </div>

            {activeInsurance.contact_person && (
              <div className="pt-4 border-t">
                <h5 className="font-medium mb-2">بيانات الاتصال</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                  <p><span className="font-medium">الاسم:</span> {activeInsurance.contact_person}</p>
                  {activeInsurance.contact_phone && (
                    <p><span className="font-medium">الهاتف:</span> <span dir="ltr">{activeInsurance.contact_phone}</span></p>
                  )}
                  {activeInsurance.contact_email && (
                    <p><span className="font-medium">البريد:</span> {activeInsurance.contact_email}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لم يتم تسجيل تأمين لهذه المركبة</p>
            <Button
              variant="outline"
              className="mt-2"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة تأمين
            </Button>
          </div>
        )}

        {/* Insurance History */}
        {insurance && insurance.length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">تاريخ التأمين</h4>
            <div className="space-y-2">
              {insurance
                .filter(p => !p.is_active)
                .slice(0, 3)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>
                      {p.insurance_company} - {p.policy_number}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(p.start_date), 'dd/MM/yyyy')} - {format(new Date(p.end_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}