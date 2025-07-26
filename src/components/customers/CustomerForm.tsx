import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  
  const { register, handleSubmit, watch, reset, setValue, formState: { errors }, clearErrors } = useForm<CustomerFormData>({
    defaultValues: {
      customer_type: customer?.customer_type || 'individual',
      first_name: customer?.first_name || '',
      last_name: customer?.last_name || '',
      first_name_ar: customer?.first_name_ar || '',
      last_name_ar: customer?.last_name_ar || '',
      company_name: customer?.company_name || '',
      company_name_ar: customer?.company_name_ar || '',
      email: customer?.email || '',
      phone: customer?.phone || '',
      alternative_phone: customer?.alternative_phone || '',
      national_id: customer?.national_id || '',
      passport_number: customer?.passport_number || '',
      license_number: customer?.license_number || '',
      address: customer?.address || '',
      address_ar: customer?.address_ar || '',
      city: customer?.city || 'Kuwait City',
      country: customer?.country || 'Kuwait',
      date_of_birth: customer?.date_of_birth || '',
      credit_limit: customer?.credit_limit || 0,
      emergency_contact_name: customer?.emergency_contact_name || '',
      emergency_contact_phone: customer?.emergency_contact_phone || '',
      notes: customer?.notes || ''
    }
  });

  const customerType = watch('customer_type');
  const createCustomerMutation = useCreateCustomer();
  const updateCustomerMutation = useUpdateCustomer();
  const isSuperAdmin = user?.roles?.includes('super_admin');

  // مراقبة تغيير نوع العميل لمسح الأخطاء
  useEffect(() => {
    setFormErrors([]);
    clearErrors();
  }, [customerType, clearErrors]);

  // التحقق من الصلاحيات
  const hasPermission = isSuperAdmin || 
    user?.roles?.includes('company_admin') || 
    user?.roles?.includes('manager') || 
    user?.roles?.includes('sales_agent');

  // دالة التحقق من صحة البيانات قبل الإرسال
  const validateFormData = (data: CustomerFormData): string[] => {
    const errors: string[] = [];

    // التحقق من البيانات الأساسية
    if (customerType === 'individual') {
      if (!data.first_name?.trim()) {
        errors.push('الاسم الأول مطلوب للعملاء الأفراد');
      }
      if (!data.last_name?.trim()) {
        errors.push('الاسم الأخير مطلوب للعملاء الأفراد');
      }
    } else if (customerType === 'corporate') {
      if (!data.company_name?.trim()) {
        errors.push('اسم الشركة مطلوب للعملاء الشركات');
      }
    }

    if (!data.phone?.trim()) {
      errors.push('رقم الهاتف مطلوب');
    }

    // التحقق من تنسيق رقم الهاتف (اختياري ولكن مفيد)
    if (data.phone && !/^[\+]?[0-9\-\s]{8,15}$/.test(data.phone.trim())) {
      errors.push('رقم الهاتف غير صحيح (يجب أن يحتوي على 8-15 رقم)');
    }

    // التحقق من البريد الإلكتروني إذا تم إدخاله
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('عنوان البريد الإلكتروني غير صحيح');
    }

    // التحقق من اختيار الشركة للمدير العام
    if (isSuperAdmin && mode === 'create' && !selectedCompanyId) {
      errors.push('يجب اختيار شركة لإضافة العميل إليها');
    }

    return errors;
  };

  const onSubmit = (data: CustomerFormData) => {
    // مسح الأخطاء السابقة
    setFormErrors([]);

    // التحقق من صحة البيانات
    const validationErrors = validateFormData(data);
    if (validationErrors.length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    // التحقق من الصلاحيات
    if (!hasPermission) {
      setFormErrors(['ليس لديك الصلاحية المطلوبة لإضافة العملاء. يرجى التواصل مع الإدارة.']);
      return;
    }

    if (mode === 'create') {
      const customerData = {
        ...data,
        ...(isSuperAdmin && selectedCompanyId ? { selectedCompanyId } : {})
      };
      
      createCustomerMutation.mutate(customerData, {
        onSuccess: () => {
          onOpenChange(false);
          reset();
          setSelectedCompanyId('');
          setFormErrors([]);
        },
        onError: (error: any) => {
          setFormErrors([error?.message || 'حدث خطأ أثناء إضافة العميل']);
        }
      });
    } else {
      updateCustomerMutation.mutate({
        customerId: customer.id,
        data
      }, {
        onSuccess: () => {
          onOpenChange(false);
          setFormErrors([]);
        },
        onError: (error: any) => {
          setFormErrors([error?.message || 'حدث خطأ أثناء تحديث بيانات العميل']);
        }
      });
    }
  };

  const isLoading = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setFormErrors([]);
        setSelectedCompanyId('');
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
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

        {/* تحذير عدم وجود صلاحيات */}
        {!hasPermission && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ليس لديك الصلاحية المطلوبة لإدارة العملاء. يرجى التواصل مع الإدارة للحصول على الصلاحيات المناسبة.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Selection for Super Admin */}
          {isSuperAdmin && mode === 'create' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  اختيار الشركة *
                  {selectedCompanyId && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>الشركة *</Label>
                  <Select 
                    value={selectedCompanyId} 
                    onValueChange={setSelectedCompanyId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الشركة..." />
                    </SelectTrigger>
                    <SelectContent>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} {company.name_ar && `(${company.name_ar})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isSuperAdmin && mode === 'create' && !selectedCompanyId && (
                    <p className="text-sm text-red-600">يجب اختيار شركة</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
              <TabsTrigger value="additional">بيانات إضافية</TabsTrigger>
              <TabsTrigger value="contact">معلومات الاتصال</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>نوع العميل</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع العميل</Label>
                    <Select 
                      value={customerType} 
                      onValueChange={(value) => setValue('customer_type', value as 'individual' | 'corporate')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">فرد</SelectItem>
                        <SelectItem value="corporate">شركة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {customerType === 'individual' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الاسم الأول *</Label>
                          <Input 
                            {...register('first_name', { 
                              required: 'الاسم الأول مطلوب',
                              minLength: { value: 2, message: 'الاسم الأول يجب أن يحتوي على حرفين على الأقل' }
                            })} 
                            placeholder="الاسم الأول"
                          />
                          {errors.first_name && (
                            <p className="text-sm text-red-600">{errors.first_name.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>الاسم الأخير *</Label>
                          <Input 
                            {...register('last_name', { 
                              required: 'الاسم الأخير مطلوب',
                              minLength: { value: 2, message: 'الاسم الأخير يجب أن يحتوي على حرفين على الأقل' }
                            })} 
                            placeholder="الاسم الأخير"
                          />
                          {errors.last_name && (
                            <p className="text-sm text-red-600">{errors.last_name.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>الاسم الأول (عربي)</Label>
                          <Input {...register('first_name_ar')} placeholder="الاسم الأول بالعربي" />
                        </div>
                        <div className="space-y-2">
                          <Label>الاسم الأخير (عربي)</Label>
                          <Input {...register('last_name_ar')} placeholder="الاسم الأخير بالعربي" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label>اسم الشركة *</Label>
                        <Input 
                          {...register('company_name', { 
                            required: customerType === 'corporate' ? 'اسم الشركة مطلوب' : false,
                            minLength: { value: 3, message: 'اسم الشركة يجب أن يحتوي على 3 أحرف على الأقل' }
                          })} 
                          placeholder="اسم الشركة"
                        />
                        {errors.company_name && (
                          <p className="text-sm text-red-600">{errors.company_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>اسم الشركة (عربي)</Label>
                        <Input {...register('company_name_ar')} placeholder="اسم الشركة بالعربي" />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات الاتصال الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهاتف *</Label>
                      <Input 
                        {...register('phone', { 
                          required: 'رقم الهاتف مطلوب',
                          pattern: {
                            value: /^[\+]?[0-9\-\s]{8,15}$/,
                            message: 'رقم الهاتف غير صحيح'
                          }
                        })} 
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
                        {...register('alternative_phone', {
                          pattern: {
                            value: /^[\+]?[0-9\-\s]{8,15}$/,
                            message: 'رقم الهاتف البديل غير صحيح'
                          }
                        })} 
                        placeholder="+965 XXXXXXXX"
                        dir="ltr"
                      />
                      {errors.alternative_phone && (
                        <p className="text-sm text-red-600">{errors.alternative_phone.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input 
                      type="email" 
                      {...register('email', {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'عنوان البريد الإلكتروني غير صحيح'
                        }
                      })} 
                      placeholder="example@email.com"
                      dir="ltr"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="additional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>الهوية والوثائق</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الهوية المدنية</Label>
                      <Input 
                        {...register('national_id', {
                          pattern: {
                            value: /^[0-9]{12}$/,
                            message: 'رقم الهوية المدنية يجب أن يحتوي على 12 رقم'
                          }
                        })} 
                        placeholder="123456789012"
                        dir="ltr"
                      />
                      {errors.national_id && (
                        <p className="text-sm text-red-600">{errors.national_id.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>رقم جواز السفر</Label>
                      <Input {...register('passport_number')} placeholder="A12345678" dir="ltr" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم رخصة القيادة</Label>
                      <Input {...register('license_number')} placeholder="DL123456" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الميلاد</Label>
                      <Input 
                        type="date" 
                        {...register('date_of_birth')} 
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>معلومات مالية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>الحد الائتماني (د.ك)</Label>
                    <Input 
                      type="number" 
                      step="0.001"
                      min="0"
                      {...register('credit_limit', { 
                        valueAsNumber: true,
                        min: { value: 0, message: 'الحد الائتماني يجب أن يكون أكبر من أو يساوي صفر' }
                      })} 
                      placeholder="0.000"
                      dir="ltr"
                    />
                    {errors.credit_limit && (
                      <p className="text-sm text-red-600">{errors.credit_limit.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* باقي التبويبات تبقى كما هي... */}
            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>العنوان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>العنوان (إنجليزي)</Label>
                    <Textarea {...register('address')} placeholder="Address in English" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان (عربي)</Label>
                    <Textarea {...register('address_ar')} placeholder="العنوان بالعربي" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>المدينة</Label>
                      <Input {...register('city')} placeholder="Kuwait City" />
                    </div>
                    <div className="space-y-2">
                      <Label>الدولة</Label>
                      <Input {...register('country')} placeholder="Kuwait" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>جهة اتصال طوارئ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم جهة الاتصال</Label>
                      <Input {...register('emergency_contact_name')} placeholder="اسم الشخص" />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم هاتف الطوارئ</Label>
                      <Input 
                        {...register('emergency_contact_phone', {
                          pattern: {
                            value: /^[\+]?[0-9\-\s]{8,15}$/,
                            message: 'رقم هاتف الطوارئ غير صحيح'
                          }
                        })} 
                        placeholder="+965 XXXXXXXX"
                        dir="ltr"
                      />
                      {errors.emergency_contact_phone && (
                        <p className="text-sm text-red-600">{errors.emergency_contact_phone.message}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>ملاحظات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>ملاحظات إضافية</Label>
                    <Textarea 
                      {...register('notes')} 
                      placeholder="أي ملاحظات إضافية حول العميل..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={
                isLoading || 
                !hasPermission ||
                (isSuperAdmin && mode === 'create' && !selectedCompanyId)
              }
            >
              {isLoading ? 'جاري الحفظ...' : (mode === 'create' ? 'إضافة العميل' : 'حفظ التغييرات')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}