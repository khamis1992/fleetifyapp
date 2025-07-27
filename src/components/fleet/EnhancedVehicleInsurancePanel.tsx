import { useState } from "react";
import { Plus, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { useVehicleInsurancePolicies, useCreateVehicleInsurancePolicy } from "@/hooks/useVehicleInsurancePolicies";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";

interface EnhancedVehicleInsurancePanelProps {
  vehicleId: string;
}

interface InsurancePolicyFormData {
  policy_type: 'third_party' | 'comprehensive' | 'collision' | 'theft';
  insurance_company: string;
  policy_number: string;
  coverage_amount: number;
  deductible_amount: number;
  premium_amount: number;
  premium_frequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  effective_date: string;
  expiry_date: string;
  agent_name?: string;
  agent_phone?: string;
  agent_email?: string;
  is_active: boolean;
  auto_renew: boolean;
  renewal_notice_days: number;
}

export function EnhancedVehicleInsurancePanel({ vehicleId }: EnhancedVehicleInsurancePanelProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: policies, isLoading } = useVehicleInsurancePolicies(vehicleId);
  const createPolicy = useCreateVehicleInsurancePolicy();

  const { register, handleSubmit, reset, watch } = useForm<InsurancePolicyFormData>({
    defaultValues: {
      is_active: true,
      auto_renew: false,
      renewal_notice_days: 30,
      premium_frequency: 'annual',
      policy_type: 'third_party',
    }
  });

  const onSubmit = async (data: InsurancePolicyFormData) => {
    await createPolicy.mutateAsync({
      ...data,
      vehicle_id: vehicleId,
      coverage_details: {},
      documents: [],
    });
    
    reset();
    setShowForm(false);
  };

  const activePolicies = policies?.filter(p => p.is_active) || [];
  const expiredPolicies = policies?.filter(p => !p.is_active) || [];

  const getPolicyTypeLabel = (type: string) => {
    const labels = {
      third_party: 'تأمين طرف ثالث',
      comprehensive: 'تأمين شامل',
      collision: 'تأمين تصادم',
      theft: 'تأمين سرقة'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPriorityBadge = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">منتهي الصلاحية</Badge>;
    } else if (daysUntilExpiry <= 7) {
      return <Badge variant="destructive">ينتهي خلال أسبوع</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-amber-500">ينتهي قريباً</Badge>;
    }
    return <Badge variant="secondary">ساري</Badge>;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          التأمين المطور
        </CardTitle>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              إضافة بوليصة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة بوليصة تأمين جديدة</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="policy_type">نوع البوليصة</Label>
                  <Select onValueChange={(value) => register('policy_type').onChange({ target: { value } })}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع البوليصة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="third_party">تأمين طرف ثالث</SelectItem>
                      <SelectItem value="comprehensive">تأمين شامل</SelectItem>
                      <SelectItem value="collision">تأمين تصادم</SelectItem>
                      <SelectItem value="theft">تأمين سرقة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insurance_company">شركة التأمين</Label>
                  <Input {...register('insurance_company', { required: true })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="policy_number">رقم البوليصة</Label>
                  <Input {...register('policy_number', { required: true })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverage_amount">مبلغ التغطية</Label>
                  <Input 
                    type="number" 
                    {...register('coverage_amount', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="premium_amount">مبلغ القسط</Label>
                  <Input 
                    type="number" 
                    {...register('premium_amount', { required: true, valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deductible_amount">مبلغ التحمل</Label>
                  <Input 
                    type="number" 
                    {...register('deductible_amount', { valueAsNumber: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effective_date">تاريخ البداية</Label>
                  <Input 
                    type="date" 
                    {...register('effective_date', { required: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry_date">تاريخ الانتهاء</Label>
                  <Input 
                    type="date" 
                    {...register('expiry_date', { required: true })} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent_name">اسم الوكيل</Label>
                  <Input {...register('agent_name')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent_phone">هاتف الوكيل</Label>
                  <Input {...register('agent_phone')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent_email">بريد الوكيل الإلكتروني</Label>
                  <Input type="email" {...register('agent_email')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="renewal_notice_days">أيام التنبيه للتجديد</Label>
                  <Input 
                    type="number" 
                    {...register('renewal_notice_days', { valueAsNumber: true })} 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  {...register('auto_renew')} 
                  className="rounded"
                />
                <Label>تجديد تلقائي</Label>
              </div>

              <Button type="submit" className="w-full" disabled={createPolicy.isPending}>
                {createPolicy.isPending ? 'جاري الحفظ...' : 'حفظ البوليصة'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {activePolicies.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">البوليصات النشطة</h4>
            {activePolicies.map((policy) => (
              <div key={policy.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{getPolicyTypeLabel(policy.policy_type)}</p>
                    <p className="text-sm text-muted-foreground">{policy.insurance_company}</p>
                    <p className="text-sm">رقم البوليصة: {policy.policy_number}</p>
                  </div>
                  {getPriorityBadge(policy.expiry_date)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">مبلغ التغطية: </span>
                    <span>{policy.coverage_amount.toLocaleString()} د.ك</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">القسط: </span>
                    <span>{policy.premium_amount.toLocaleString()} د.ك</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ينتهي في: </span>
                    <span>{format(new Date(policy.expiry_date), 'dd/MM/yyyy')}</span>
                  </div>
                  {policy.agent_name && (
                    <div>
                      <span className="text-muted-foreground">الوكيل: </span>
                      <span>{policy.agent_name}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">لا توجد بوليصات تأمين نشطة</p>
          </div>
        )}

        {expiredPolicies.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">البوليصات المنتهية</h4>
            {expiredPolicies.slice(0, 3).map((policy) => (
              <div key={policy.id} className="p-3 border rounded-lg opacity-60 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{getPolicyTypeLabel(policy.policy_type)}</p>
                    <p className="text-sm text-muted-foreground">{policy.insurance_company}</p>
                  </div>
                  <Badge variant="secondary">منتهية</Badge>
                </div>
                <p className="text-sm">انتهت في: {format(new Date(policy.expiry_date), 'dd/MM/yyyy')}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}