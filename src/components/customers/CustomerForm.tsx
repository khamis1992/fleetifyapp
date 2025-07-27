
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertCircle, CheckCircle2, Building2, User, Phone, Mail, MapPin } from "lucide-react";
import { CustomerFormData, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  mode: 'create' | 'edit';
}

export function CustomerForm({ open, onOpenChange, customer, mode }: CustomerFormProps) {
  const { user } = useAuth();
  const { data: companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<CustomerFormData>({
    defaultValues: {
      customer_type: 'individual',
      first_name: '',
      last_name: '',
      company_name: '',
      email: '',
      phone: '',
      city: 'Kuwait City',
      country: 'Kuwait',
      credit_limit: 0,
    }
  });

  const customerType = watch('customer_type');
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const isSuperAdmin = user?.roles?.includes('super_admin');

  // إعادة تعيين البيانات عند فتح النموذج
  useEffect(() => {
    if (open) {
      if (customer && mode === 'edit') {
        reset({
          customer_type: customer.customer_type || 'individual',
          first_name: customer.first_name || '',
          last_name: customer.last_name || '',
          first_name_ar: customer.first_name_ar || '',
          last_name_ar: customer.last_name_ar || '',
          company_name: customer.company_name || '',
          company_name_ar: customer.company_name_ar || '',
          email: customer.email || '',
          phone: customer.phone || '',
          alternative_phone: customer.alternative_phone || '',
          national_id: customer.national_id || '',
          passport_number: customer.passport_number || '',
          license_number: customer.license_number || '',
          address: customer.address || '',
          address_ar: customer.address_ar || '',
          city: customer.city || 'Kuwait City',
          country: customer.country || 'Kuwait',
          date_of_birth: customer.date_of_birth || '',
          credit_limit: customer.credit_limit || 0,
          emergency_contact_name: customer.emergency_contact_name || '',
          emergency_contact_phone: customer.emergency_contact_phone || '',
          notes: customer.notes || ''
        });
      } else {
        reset({
          customer_type: 'individual',
          first_name: '',
          last_name: '',
          company_name: '',
          email: '',
          phone: '',
          city: 'Kuwait City',
          country: 'Kuwait',
          credit_limit: 0,
        });
      }
      setFormErrors([]);
      setSelectedCompanyId('');
    }
  }, [open, customer, mode, reset]);

  const onSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true);
    setFormErrors([]);

    try {
      console.log('🚀 Form submission started with data:', data);

      // التحقق من البيانات الأساسية
      const validationErrors: string[] = [];

      if (!data.phone?.trim()) {
        validationErrors.push('رقم الهاتف مطلوب');
      }

      if (customerType === 'individual') {
        if (!data.first_name?.trim()) {
          validationErrors.push('الاسم الأول مطلوب للعملاء الأفراد');
        }
        if (!data.last_name?.trim()) {
          validationErrors.push('الاسم الأخير مطلوب للعملاء الأفراد');
        }
      } else if (customerType === 'corporate') {
        if (!data.company_name?.trim()) {
          validationErrors.push('اسم الشركة مطلوب للعملاء الشركات');
        }
      }

      if (isSuperAdmin && mode === 'create' && !selectedCompanyId) {
        validationErrors.push('يجب اختيار شركة لإضافة العميل إليها');
      }

      if (validationErrors.length > 0) {
        setFormErrors(validationErrors);
        return;
      }

      // إعداد البيانات للإرسال
      const customerData = {
        ...data,
        ...(isSuperAdmin && selectedCompanyId ? { selectedCompanyId } : {})
      };

      if (mode === 'create') {
        await createCustomerMutation.mutateAsync(customerData);
        console.log('✅ Customer created successfully');
      } else {
        await updateCustomerMutation.mutateAsync({
          customerId: customer.id,
          data: customerData
        });
        console.log('✅ Customer updated successfully');
      }

      // إغلاق النموذج عند النجاح
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Form submission error:', error);
      setFormErrors([error.message || 'حدث خطأ أثناء حفظ البيانات']);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {customerType === 'individual' ? (
              <User className="h-5 w-5" />
            ) : (
              <Building2 className="h-5 w-5" />
            )}
            {mode === 'create' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}
          </DialogTitle>
        </DialogHeader>

        {/* عرض الأخطاء */}
        {formErrors.length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {formErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* اختيار الشركة للمدير العام */}
          {isSuperAdmin && mode === 'create' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  اختيار الشركة *
                  {selectedCompanyId && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>الشركة *</Label>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الشركة..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
              <TabsTrigger value="contact">معلومات الاتصال</TabsTrigger>
              <TabsTrigger value="additional">بيانات إضافية</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>نوع العميل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع العميل *</Label>
                    <Select 
                      value={customerType} 
                      onValueChange={(value) => setValue('customer_type', value as 'individual' | 'corporate')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            فرد
                          </div>
                        </SelectItem>
                        <SelectItem value="corporate">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            شركة
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {customerType === 'individual' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>الاسم الأول *</Label>
                        <Input 
                          {...register('first_name', { required: 'الاسم الأول مطلوب' })} 
                          placeholder="أدخل الاسم الأول"
                        />
                        {errors.first_name && (
                          <p className="text-sm text-red-600">{errors.first_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>الاسم الأخير *</Label>
                        <Input 
                          {...register('last_name', { required: 'الاسم الأخير مطلوب' })} 
                          placeholder="أدخل الاسم الأخير"
                        />
                        {errors.last_name && (
                          <p className="text-sm text-red-600">{errors.last_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>الاسم الأول (عربي)</Label>
                        <Input 
                          {...register('first_name_ar')} 
                          placeholder="أدخل الاسم الأول بالعربي"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الاسم الأخير (عربي)</Label>
                        <Input 
                          {...register('last_name_ar')} 
                          placeholder="أدخل الاسم الأخير بالعربي"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>اسم الشركة *</Label>
                        <Input 
                          {...register('company_name', { required: 'اسم الشركة مطلوب' })} 
                          placeholder="أدخل اسم الشركة"
                        />
                        {errors.company_name && (
                          <p className="text-sm text-red-600">{errors.company_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>اسم الشركة (عربي)</Label>
                        <Input 
                          {...register('company_name_ar')} 
                          placeholder="أدخل اسم الشركة بالعربي"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    معلومات الاتصال
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهاتف *</Label>
                      <Input 
                        {...register('phone', { required: 'رقم الهاتف مطلوب' })} 
                        placeholder="+965 XXXXXXXX"
                        dir="ltr"
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>رقم هاتف بديل</Label>
                      <Input 
                        {...register('alternative_phone')} 
                        placeholder="+965 XXXXXXXX"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      البريد الإلكتروني
                    </Label>
                    <Input 
                      type="email" 
                      {...register('email')} 
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      العنوان
                    </Label>
                    <Textarea 
                      {...register('address')} 
                      placeholder="أدخل العنوان"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المدينة</Label>
                      <Input {...register('city')} placeholder="Kuwait City" />
                    </div>
                    <div className="space-y-2">
                      <Label>البلد</Label>
                      <Input {...register('country')} placeholder="Kuwait" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>بيانات إضافية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهوية المدنية</Label>
                      <Input 
                        {...register('national_id')} 
                        placeholder="123456789012"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم جواز السفر</Label>
                      <Input 
                        {...register('passport_number')} 
                        placeholder="A12345678"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>الحد الائتماني (د.ك)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      {...register('credit_limit', { valueAsNumber: true })} 
                      placeholder="0.000"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ملاحظات</Label>
                    <Textarea 
                      {...register('notes')} 
                      placeholder="أي ملاحظات إضافية..."
                      rows={4}
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
              disabled={isLoading}
            >
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (isSuperAdmin && mode === 'create' && !selectedCompanyId)}
            >
              {isLoading && <LoadingSpinner size="sm" className="ml-2" />}
              {mode === 'create' ? 'إضافة العميل' : 'حفظ التغييرات'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
