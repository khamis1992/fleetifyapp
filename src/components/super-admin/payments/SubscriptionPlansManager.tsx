import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Car, Check, CreditCard, Edit, FileText, Plus, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type PlanRow = Database['public']['Tables']['subscription_plans']['Row'];
type PlanInsert = Database['public']['Tables']['subscription_plans']['Insert'];
type PlanUpdate = Database['public']['Tables']['subscription_plans']['Update'];

interface PlanFormState {
  name: string;
  name_ar: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_users: number;
  max_vehicles: number;
  max_contracts: number;
  features: string;
  is_default: boolean;
  is_active: boolean;
}

const emptyForm: PlanFormState = {
  name: '',
  name_ar: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  max_users: 5,
  max_vehicles: 10,
  max_contracts: 20,
  features: '',
  is_default: false,
  is_active: true,
};

const parseFeatures = (features: PlanRow['features']): string[] =>
  Array.isArray(features) ? features.filter((feature): feature is string => typeof feature === 'string') : [];

const toFormState = (plan: PlanRow | null): PlanFormState => plan ? {
  name: plan.name,
  name_ar: plan.name_ar || '',
  description: plan.description || '',
  price_monthly: Number(plan.price_monthly ?? plan.price ?? 0),
  price_yearly: Number(plan.price_yearly || 0),
  max_users: Number(plan.max_users ?? -1),
  max_vehicles: Number(plan.max_vehicles ?? -1),
  max_contracts: Number(plan.max_contracts ?? -1),
  features: parseFeatures(plan.features).join('\n'),
  is_default: Boolean(plan.is_default),
  is_active: plan.is_active !== false,
} : emptyForm;

const numberField = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

export const SubscriptionPlansManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);
  const [formData, setFormData] = useState<PlanFormState>(emptyForm);

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['subscription-plans-admin'],
    queryFn: async () => {
      const { data, error: queryError } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });
      if (queryError) throw queryError;
      return data;
    },
  });

  useEffect(() => {
    if (isDialogOpen) setFormData(toFormState(editingPlan));
  }, [editingPlan, isDialogOpen]);

  const savePlan = useMutation({
    mutationFn: async ({ plan, values }: { plan: PlanRow | null; values: PlanFormState }) => {
      const name = values.name.trim();
      if (!name) throw new Error('اسم الخطة مطلوب');
      if (values.price_monthly < 0 || values.price_yearly < 0) throw new Error('أسعار الخطة لا يمكن أن تكون سالبة');

      const features = values.features.split('\n').map(feature => feature.trim()).filter(Boolean);
      const common: PlanUpdate = {
        name,
        name_ar: values.name_ar.trim() || null,
        description: values.description.trim() || null,
        price: values.price_monthly,
        price_monthly: values.price_monthly,
        price_yearly: values.price_yearly,
        max_users: values.max_users,
        max_vehicles: values.max_vehicles,
        max_contracts: values.max_contracts,
        features,
        is_default: values.is_default,
        is_active: values.is_active,
        updated_at: new Date().toISOString(),
      };

      if (plan) {
        const { data, error: updateError } = await supabase
          .from('subscription_plans')
          .update(common)
          .eq('id', plan.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return data;
      }

      const planCodeBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan';
      const insert: PlanInsert = {
        ...common,
        name,
        plan_code: `${planCodeBase}-${Date.now().toString().slice(-6)}`,
        billing_cycle: 'monthly',
      };
      const { data, error: insertError } = await supabase
        .from('subscription_plans')
        .insert(insert)
        .select()
        .single();
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      toast.success(variables.plan ? 'تم تحديث خطة الاشتراك' : 'تم إنشاء خطة الاشتراك');
      setIsDialogOpen(false);
      setEditingPlan(null);
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const sortedPlans = useMemo(
    () => [...plans].sort((left, right) => Number(left.price_monthly ?? left.price) - Number(right.price_monthly ?? right.price)),
    [plans]
  );

  const openCreate = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const openEdit = (plan: PlanRow) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري تحميل الخطط...</div>;
  if (error) return <div className="p-8 text-center text-destructive">تعذر تحميل خطط الاشتراك</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold"><CreditCard className="h-5 w-5" />إدارة خطط الاشتراك</h2>
          <p className="text-sm text-muted-foreground">الخطط المحفوظة فعليًا في قاعدة البيانات</p>
        </div>
        <Button onClick={openCreate}><Plus className="ml-2 h-4 w-4" />إضافة خطة</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedPlans.map(plan => {
          const features = parseFeatures(plan.features);
          const monthlyPrice = Number(plan.price_monthly ?? plan.price ?? 0);
          return (
            <Card key={plan.id} className={plan.is_default ? 'border-primary' : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div><CardTitle>{plan.name_ar || plan.name}</CardTitle><CardDescription>{plan.description || plan.name}</CardDescription></div>
                  {plan.is_default && <Badge><Star className="ml-1 h-3 w-3" />افتراضية</Badge>}
                </div>
                <p className="text-2xl font-bold">{monthlyPrice.toLocaleString('ar-QA')} ر.ق <span className="text-sm font-normal text-muted-foreground">/ شهر</span></p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{plan.max_users ?? 'غير محدد'}</span>
                  <span className="flex items-center gap-1"><Car className="h-4 w-4" />{plan.max_vehicles ?? 'غير محدد'}</span>
                  <span className="flex items-center gap-1"><FileText className="h-4 w-4" />{plan.max_contracts ?? 'غير محدد'}</span>
                </div>
                <div className="space-y-1">
                  {features.slice(0, 6).map(feature => <p key={feature} className="flex items-center gap-2 text-sm"><Check className="h-3 w-3 text-green-600" />{feature}</p>)}
                  {!features.length && <p className="text-sm text-muted-foreground">لا توجد مزايا مسجلة</p>}
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <Badge variant={plan.is_active === false ? 'secondary' : 'default'}>{plan.is_active === false ? 'غير نشطة' : 'نشطة'}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(plan)} title="تعديل الخطة"><Edit className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!sortedPlans.length && <p className="py-10 text-center text-muted-foreground md:col-span-2 xl:col-span-3">لا توجد خطط اشتراك</p>}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>{editingPlan ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك'}</DialogTitle><DialogDescription>تُحفظ التغييرات مباشرة في قاعدة البيانات.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="plan-name">الاسم الإنجليزي</Label><Input id="plan-name" value={formData.name} onChange={event => setFormData(current => ({ ...current, name: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="plan-name-ar">الاسم العربي</Label><Input id="plan-name-ar" value={formData.name_ar} onChange={event => setFormData(current => ({ ...current, name_ar: event.target.value }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="plan-description">الوصف</Label><Textarea id="plan-description" value={formData.description} onChange={event => setFormData(current => ({ ...current, description: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="monthly-price">السعر الشهري</Label><Input id="monthly-price" type="number" min="0" value={formData.price_monthly} onChange={event => setFormData(current => ({ ...current, price_monthly: numberField(event.target.value) }))} /></div>
            <div className="space-y-2"><Label htmlFor="yearly-price">السعر السنوي</Label><Input id="yearly-price" type="number" min="0" value={formData.price_yearly} onChange={event => setFormData(current => ({ ...current, price_yearly: numberField(event.target.value) }))} /></div>
            <div className="space-y-2"><Label htmlFor="max-users">حد المستخدمين</Label><Input id="max-users" type="number" min="-1" value={formData.max_users} onChange={event => setFormData(current => ({ ...current, max_users: numberField(event.target.value) }))} /></div>
            <div className="space-y-2"><Label htmlFor="max-vehicles">حد المركبات</Label><Input id="max-vehicles" type="number" min="-1" value={formData.max_vehicles} onChange={event => setFormData(current => ({ ...current, max_vehicles: numberField(event.target.value) }))} /></div>
            <div className="space-y-2"><Label htmlFor="max-contracts">حد العقود</Label><Input id="max-contracts" type="number" min="-1" value={formData.max_contracts} onChange={event => setFormData(current => ({ ...current, max_contracts: numberField(event.target.value) }))} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="plan-features">المزايا، ميزة في كل سطر</Label><Textarea id="plan-features" rows={5} value={formData.features} onChange={event => setFormData(current => ({ ...current, features: event.target.value }))} /></div>
            <div className="flex items-center gap-2"><Switch id="plan-default" checked={formData.is_default} onCheckedChange={checked => setFormData(current => ({ ...current, is_default: checked }))} /><Label htmlFor="plan-default">الخطة الافتراضية</Label></div>
            <div className="flex items-center gap-2"><Switch id="plan-active" checked={formData.is_active} onCheckedChange={checked => setFormData(current => ({ ...current, is_active: checked }))} /><Label htmlFor="plan-active">نشطة</Label></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button><Button disabled={savePlan.isPending} onClick={() => savePlan.mutate({ plan: editingPlan, values: formData })}>{savePlan.isPending ? 'جاري الحفظ...' : 'حفظ'}</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
