import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { CreditCard, Plus, Edit, Trash2, Check, Users, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_users: number;
  max_companies?: number;
  is_popular: boolean;
  is_active: boolean;
  created_at: string;
}

export const SubscriptionPlansManager: React.FC = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Mock data - in real app this would come from useSubscriptionPlans hook
  const [plans, setPlans] = useState<SubscriptionPlan[]>([
    {
      id: '1',
      name: 'Basic',
      name_ar: 'أساسي',
      description: 'خطة مناسبة للشركات الصغيرة',
      price_monthly: 25,
      price_yearly: 250,
      features: ['5 مستخدمين', 'تقارير أساسية', 'دعم فني', 'تخزين 5 جيجا'],
      max_users: 5,
      is_popular: false,
      is_active: true,
      created_at: '2024-01-01'
    },
    {
      id: '2',
      name: 'Premium',
      name_ar: 'مميز',
      description: 'خطة مناسبة للشركات المتوسطة',
      price_monthly: 50,
      price_yearly: 500,
      features: ['15 مستخدم', 'تقارير متقدمة', 'دعم فني أولوية', 'تخزين 50 جيجا', 'ميزات متقدمة'],
      max_users: 15,
      is_popular: true,
      is_active: true,
      created_at: '2024-01-01'
    },
    {
      id: '3',
      name: 'Enterprise',
      name_ar: 'مؤسسي',
      description: 'خطة مناسبة للشركات الكبيرة',
      price_monthly: 100,
      price_yearly: 1000,
      features: ['مستخدمين غير محدود', 'تقارير شاملة', 'دعم فني مخصص', 'تخزين غير محدود', 'تكامل مخصص'],
      max_users: -1, // unlimited
      is_popular: false,
      is_active: true,
      created_at: '2024-01-01'
    }
  ]);

  const handleSavePlan = (planData: Partial<SubscriptionPlan>) => {
    if (editingPlan) {
      setPlans(plans.map(p => p.id === editingPlan.id ? { ...p, ...planData } : p));
      toast({
        title: "تم تحديث الخطة",
        description: "تم تحديث خطة الاشتراك بنجاح",
      });
    } else {
      const newPlan: SubscriptionPlan = {
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        is_active: true,
        is_popular: false,
        ...planData
      } as SubscriptionPlan;
      setPlans([...plans, newPlan]);
      toast({
        title: "تم إنشاء الخطة",
        description: "تم إنشاء خطة اشتراك جديدة بنجاح",
      });
    }
    setIsDialogOpen(false);
    setEditingPlan(null);
  };

  const PlanFormDialog = () => {
    const [formData, setFormData] = useState({
      name: editingPlan?.name || '',
      name_ar: editingPlan?.name_ar || '',
      description: editingPlan?.description || '',
      price_monthly: editingPlan?.price_monthly || 0,
      price_yearly: editingPlan?.price_yearly || 0,
      max_users: editingPlan?.max_users || 5,
      features: editingPlan?.features?.join('\n') || '',
      is_popular: editingPlan?.is_popular || false,
      is_active: editingPlan?.is_active || true
    });

    return (
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingPlan ? 'تعديل خطة الاشتراك' : 'إضافة خطة اشتراك جديدة'}
          </DialogTitle>
          <DialogDescription>
            قم بتعبئة بيانات خطة الاشتراك
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم (إنجليزي)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name_ar">الاسم (عربي)</Label>
              <Input
                id="name_ar"
                value={formData.name_ar}
                onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_monthly">السعر الشهري (د.ك)</Label>
              <Input
                id="price_monthly"
                type="number"
                value={formData.price_monthly}
                onChange={(e) => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_yearly">السعر السنوي (د.ك)</Label>
              <Input
                id="price_yearly"
                type="number"
                value={formData.price_yearly}
                onChange={(e) => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="max_users">عدد المستخدمين الأقصى</Label>
            <Input
              id="max_users"
              type="number"
              value={formData.max_users}
              onChange={(e) => setFormData({ ...formData, max_users: Number(e.target.value) })}
              placeholder="-1 للاستخدام غير المحدود"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="features">المميزات (سطر واحد لكل ميزة)</Label>
            <Textarea
              id="features"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="ميزة 1&#10;ميزة 2&#10;ميزة 3"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_popular"
              checked={formData.is_popular}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_popular: checked })}
            />
            <Label htmlFor="is_popular">خطة شائعة</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">نشطة</Label>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={() => handleSavePlan({
            ...formData,
            features: formData.features.split('\n').filter(f => f.trim())
          })}>
            {editingPlan ? 'تحديث' : 'إنشاء'}
          </Button>
        </div>
      </DialogContent>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                إدارة خطط الاشتراك
              </CardTitle>
              <CardDescription>
                إنشاء وتعديل خطط الاشتراك المتاحة للشركات
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPlan(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة خطة جديدة
                </Button>
              </DialogTrigger>
              <PlanFormDialog />
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className={`relative ${plan.is_popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.is_popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      الأكثر شعبية
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name_ar}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      {plan.price_monthly} د.ك
                      <span className="text-base font-normal text-muted-foreground">/شهر</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      أو {plan.price_yearly} د.ك سنوياً
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {plan.max_users === -1 ? 'مستخدمين غير محدود' : `حتى ${plan.max_users} مستخدمين`}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4">
                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                      {plan.is_active ? 'نشطة' : 'غير نشطة'}
                    </Badge>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};