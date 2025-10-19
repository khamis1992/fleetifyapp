import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Building2, Mail, Phone, MapPin, CreditCard, Settings, Users, Briefcase } from 'lucide-react';
import { useCompanyCurrency } from '@/hooks/useCompanyCurrency';
import { BusinessTypeSelector, businessTypes } from './BusinessTypeSelector';
import { BusinessType } from '@/types/modules';

const companySchema = z.object({
  name: z.string().min(2, 'اسم الشركة مطلوب (حد أدنى حرفين)'),
  name_ar: z.string().optional(),
  business_type: z.enum(['car_rental', 'real_estate', 'retail', 'medical', 'manufacturing', 'restaurant', 'logistics', 'education', 'consulting', 'construction']),
  email: z.string().email('بريد إلكتروني غير صحيح').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  address_ar: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  commercial_register: z.string().optional(),
  license_number: z.string().optional(),
  subscription_plan: z.enum(['basic', 'premium', 'enterprise']),
  subscription_status: z.enum(['active', 'inactive', 'suspended']),
  currency: z.string().optional(),
  office_latitude: z.number().optional(),
  office_longitude: z.number().optional(),
  allowed_radius: z.number().optional(),
  work_start_time: z.string().optional(),
  work_end_time: z.string().optional(),
  auto_checkout_enabled: z.boolean().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: any;
  onSuccess: () => void;
}

export const CompanyForm: React.FC<CompanyFormProps> = ({
  open,
  onOpenChange,
  company,
  onSuccess
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const { currency: companyCurrency } = useCompanyCurrency();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      name_ar: '',
      business_type: 'car_rental' as BusinessType,
      email: '',
      phone: '',
      address: '',
      address_ar: '',
      city: 'Kuwait City',
      country: 'Kuwait',
      commercial_register: '',
      license_number: '',
      subscription_plan: 'basic',
      subscription_status: 'active',
      currency: companyCurrency,
      office_latitude: 29.3759,
      office_longitude: 47.9774,
      allowed_radius: 100,
      work_start_time: '08:00:00',
      work_end_time: '17:00:00',
      auto_checkout_enabled: true,
    }
  });

  React.useEffect(() => {
    if (company && open) {
      // Reset form with company data
      reset({
        name: company.name || '',
        name_ar: company.name_ar || '',
        business_type: company.business_type || 'car_rental',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        address_ar: company.address_ar || '',
        city: company.city || 'Kuwait City',
        country: company.country || 'Kuwait',
        commercial_register: company.commercial_register || '',
        license_number: company.license_number || '',
        subscription_plan: company.subscription_plan || 'basic',
        subscription_status: company.subscription_status || 'active',
        currency: company.currency || companyCurrency,
        office_latitude: company.office_latitude || 29.3759,
        office_longitude: company.office_longitude || 47.9774,
        allowed_radius: company.allowed_radius || 100,
        work_start_time: company.work_start_time || '08:00:00',
        work_end_time: company.work_end_time || '17:00:00',
        auto_checkout_enabled: company.auto_checkout_enabled ?? true,
      });
    } else if (!company && open) {
      // Reset form for new company
      reset();
    }
  }, [company, open, reset]);

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true);
    try {
      // Get selected business type modules
      const selectedBusinessType = businessTypes.find(bt => bt.type === data.business_type);
      const activeModules = selectedBusinessType?.modules || ['core', 'finance'];

      const formattedData = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        address_ar: data.address_ar || null,
        name_ar: data.name_ar || null,
        business_type: data.business_type,
        active_modules: activeModules,
        city: data.city || null,
        country: data.country || null,
        commercial_register: data.commercial_register || null,
        license_number: data.license_number || null,
        subscription_plan: data.subscription_plan,
        subscription_status: data.subscription_status,
        currency: data.currency || companyCurrency,
        office_latitude: data.office_latitude || null,
        office_longitude: data.office_longitude || null,
        allowed_radius: data.allowed_radius || 100,
        work_start_time: data.work_start_time || '08:00:00',
        work_end_time: data.work_end_time || '17:00:00',
        auto_checkout_enabled: data.auto_checkout_enabled ?? true,
      };

      if (company) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update(formattedData)
          .eq('id', company.id);

        if (error) throw error;

        toast({
          title: 'تم تحديث الشركة بنجاح',
          description: 'تم حفظ التغييرات على معلومات الشركة',
        });
      } else {
        // Create new company
        const { error } = await supabase
          .from('companies')
          .insert([formattedData]);

        if (error) throw error;

        toast({
          title: 'تم إنشاء الشركة بنجاح',
          description: 'تم إضافة الشركة الجديدة إلى النظام',
        });
      }

      onSuccess();
    } catch (error: unknown) {
      console.error('Error saving company:', error);
      toast({
        title: 'خطأ في حفظ البيانات',
        description: error.message || 'حدث خطأ أثناء حفظ معلومات الشركة',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscriptionPlanOptions = [
    { value: 'basic', label: 'أساسي' },
    { value: 'premium', label: 'مميز' },
    { value: 'enterprise', label: 'مؤسسي' },
  ];

  const subscriptionStatusOptions = [
    { value: 'active', label: 'نشط' },
    { value: 'inactive', label: 'غير نشط' },
    { value: 'suspended', label: 'معلق' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {company ? 'تعديل الشركة' : 'إضافة شركة جديدة'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="business" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="business">نوع النشاط</TabsTrigger>
              <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="contact">معلومات الاتصال</TabsTrigger>
              <TabsTrigger value="subscription">الاشتراك</TabsTrigger>
              <TabsTrigger value="settings">الإعدادات</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    نوع النشاط التجاري
                  </CardTitle>
                  <CardDescription>
                    حدد نوع النشاط التجاري لتفعيل الوحدات المناسبة
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BusinessTypeSelector
                    selectedType={watch('business_type')}
                    onTypeSelect={(type) => setValue('business_type', type)}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    المعلومات الأساسية
                  </CardTitle>
                  <CardDescription>
                    أدخل المعلومات الأساسية للشركة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">اسم الشركة *</Label>
                      <Input
                        id="name"
                        {...register('name')}
                        placeholder="اسم الشركة باللغة الإنجليزية"
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name_ar">اسم الشركة بالعربية</Label>
                      <Input
                        id="name_ar"
                        {...register('name_ar')}
                        placeholder="اسم الشركة باللغة العربية"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commercial_register">السجل التجاري</Label>
                      <Input
                        id="commercial_register"
                        {...register('commercial_register')}
                        placeholder="رقم السجل التجاري"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="license_number">رقم الرخصة</Label>
                      <Input
                        id="license_number"
                        {...register('license_number')}
                        placeholder="رقم الرخصة"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    معلومات الاتصال
                  </CardTitle>
                  <CardDescription>
                    معلومات الاتصال والعنوان
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="company@example.com"
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        {...register('phone')}
                        placeholder="+965 XXXX XXXX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">المدينة</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="مدينة الكويت"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">البلد</Label>
                      <Input
                        id="country"
                        {...register('country')}
                        placeholder="الكويت"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">العنوان</Label>
                      <Textarea
                        id="address"
                        {...register('address')}
                        placeholder="العنوان باللغة الإنجليزية"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address_ar">العنوان بالعربية</Label>
                      <Textarea
                        id="address_ar"
                        {...register('address_ar')}
                        placeholder="العنوان باللغة العربية"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    معلومات الاشتراك
                  </CardTitle>
                  <CardDescription>
                    إعدادات الاشتراك والباقة
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subscription_plan">باقة الاشتراك</Label>
                      <Select
                        value={watch('subscription_plan')}
                        onValueChange={(value: unknown) => setValue('subscription_plan', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الباقة" />
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionPlanOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subscription_status">حالة الاشتراك</Label>
                      <Select
                        value={watch('subscription_status')}
                        onValueChange={(value: unknown) => setValue('subscription_status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                          {subscriptionStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">العملة</Label>
                      <Select
                        value={watch('currency')}
                        onValueChange={(value) => setValue('currency', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                          <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                          <SelectItem value="EUR">يورو (EUR)</SelectItem>
                          <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                          <SelectItem value="QAR">ريال قطري (QAR)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    إعدادات الشركة
                  </CardTitle>
                  <CardDescription>
                    إعدادات الموقع والعمل
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="office_latitude">خط العرض للمكتب</Label>
                      <Input
                        id="office_latitude"
                        type="number"
                        step="any"
                        {...register('office_latitude', { valueAsNumber: true })}
                        placeholder="29.3759"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="office_longitude">خط الطول للمكتب</Label>
                      <Input
                        id="office_longitude"
                        type="number"
                        step="any"
                        {...register('office_longitude', { valueAsNumber: true })}
                        placeholder="47.9774"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allowed_radius">نطاق العمل المسموح (متر)</Label>
                      <Input
                        id="allowed_radius"
                        type="number"
                        {...register('allowed_radius', { valueAsNumber: true })}
                        placeholder="100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="work_start_time">وقت بداية العمل</Label>
                      <Input
                        id="work_start_time"
                        type="time"
                        {...register('work_start_time')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="work_end_time">وقت نهاية العمل</Label>
                      <Input
                        id="work_end_time"
                        type="time"
                        {...register('work_end_time')}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="auto_checkout_enabled">تسجيل الخروج التلقائي</Label>
                      <p className="text-sm text-muted-foreground">
                        تفعيل تسجيل الخروج التلقائي للموظفين
                      </p>
                    </div>
                    <Switch
                      id="auto_checkout_enabled"
                      checked={watch('auto_checkout_enabled')}
                      onCheckedChange={(checked) => setValue('auto_checkout_enabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <LoadingSpinner size="sm" className="ml-2" />}
              {company ? 'تحديث الشركة' : 'إنشاء الشركة'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};