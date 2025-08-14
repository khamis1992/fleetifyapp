
import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertCircle, CheckCircle2, Building2, User, Phone, Mail, MapPin, CreditCard, InfoIcon, Search, Check, ChevronsUpDown } from "lucide-react";
import { useCreateCustomer, useUpdateCustomer } from "@/hooks/useEnhancedCustomers";
import { CustomerFormData } from "@/types/customer";
import { useCompanies } from "@/hooks/useCompanies";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAvailableCustomerAccounts, useCompanyAccountSettings } from "@/hooks/useCustomerAccounts";
import { useEntryAllowedAccounts } from "@/hooks/useEntryAllowedAccounts";
import { AccountLevelBadge } from "@/components/finance/AccountLevelBadge";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: any;
  mode: 'create' | 'edit';
}

export function CustomerForm({ open, onOpenChange, customer, mode }: CustomerFormProps) {
  const { user } = useAuth();
  const { data: companies } = useCompanies();
  const { companyId: defaultCompanyId, hasGlobalAccess } = useUnifiedCompanyAccess();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>(undefined);
  
  // Determine the effective company ID for queries
  const effectiveCompanyId = hasGlobalAccess ? selectedCompanyId : defaultCompanyId;
  
  const { data: availableAccounts } = useAvailableCustomerAccounts(effectiveCompanyId);
  const { data: accountSettings } = useCompanyAccountSettings(effectiveCompanyId);
  const { data: entryAllowedAccounts } = useEntryAllowedAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [accountSearchOpen, setAccountSearchOpen] = useState(false);
  const [accountSearchValue, setAccountSearchValue] = useState("");
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
  const { toast } = useToast();

  console.log('👤 CustomerForm render:', { 
    open, 
    mode, 
    user: user?.email, 
    isSuperAdmin,
    companies: companies?.length,
    selectedCompanyId,
    effectiveCompanyId,
    hasGlobalAccess,
    defaultCompanyId,
    availableAccountsCount: availableAccounts?.length,
    accountSettings: !!accountSettings
  });

  // Additional detailed logging for debugging account 1130201
  console.log('📊 Available Accounts Detail:', {
    totalAccounts: availableAccounts?.length || 0,
    accounts: availableAccounts?.map(acc => ({
      id: acc.id,
      code: acc.account_code,
      name: acc.account_name,
      nameAr: acc.account_name_ar,
      parentName: acc.parent_account_name,
      isAvailable: acc.is_available
    })) || [],
    targetAccount: availableAccounts?.find(acc => acc.account_code === '1130201'),
    hasTargetAccount: !!availableAccounts?.find(acc => acc.account_code === '1130201')
  });

  // Log current company information
  const currentCompany = companies?.find(c => c.id === effectiveCompanyId);
  console.log('🏢 Current Company Info:', {
    effectiveCompanyId,
    companyName: currentCompany?.name,
    isAlBashairCompany: currentCompany?.name?.includes('البشائر'),
    allCompanies: companies?.map(c => ({ id: c.id, name: c.name })) || []
  });

  // إعادة تعيين البيانات عند فتح النموذج
  useEffect(() => {
    if (open) {
      console.log('🔄 Resetting form for mode:', mode);
      
      if (customer && mode === 'edit') {
        console.log('📝 Editing customer:', customer.id);
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
          license_expiry: customer.license_expiry || '',
          national_id_expiry: customer.national_id_expiry || '',
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
        // Set company for editing mode
        setSelectedCompanyId(customer.company_id);
      } else {
        console.log('➕ Creating new customer');
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
        // Initialize company for create mode
        if (!hasGlobalAccess && defaultCompanyId) {
          setSelectedCompanyId(defaultCompanyId);
        } else {
          setSelectedCompanyId(undefined);
        }
      }
      setFormErrors([]);
      setSelectedAccountId(undefined);
    }
  }, [open, customer, mode, reset, hasGlobalAccess, defaultCompanyId]);

  // Fill dummy data function
  const fillDummyData = () => {
    const randomId = Math.floor(Math.random() * 1000)
    
    // Generate dummy data for individual customer
    const dummyDataIndividual = {
      customer_type: 'individual' as const,
      first_name: 'أحمد',
      last_name: 'محمد',
      first_name_ar: 'أحمد',
      last_name_ar: 'محمد',
      email: `ahmed.mohamed${randomId}@example.com`,
      phone: `+965 ${20000000 + randomId}`,
      alternative_phone: `+965 ${50000000 + randomId}`,
      national_id: `${290000000000 + randomId}`,
      passport_number: `K${String(randomId).padStart(7, '0')}`,
      license_number: `L${String(randomId).padStart(8, '0')}`,
      address: 'شارع الخليج العربي، قطعة 3، منزل 15',
      address_ar: 'شارع الخليج العربي، قطعة 3، منزل 15',
      city: 'Kuwait City',
      country: 'Kuwait',
      date_of_birth: '1990-05-15',
      credit_limit: 5000,
      emergency_contact_name: 'فاطمة أحمد',
      emergency_contact_phone: `+965 ${60000000 + randomId}`,
      notes: 'عميل موثوق، يدفع في الموعد المحدد، يفضل التعامل صباحاً.'
    }

    // Generate dummy data for corporate customer
    const dummyDataCorporate = {
      customer_type: 'corporate' as const,
      first_name: '',
      last_name: '',
      first_name_ar: '',
      last_name_ar: '',
      company_name: 'شركة التجارة المتقدمة',
      company_name_ar: 'شركة التجارة المتقدمة',
      email: `info${randomId}@tradingcompany.com`,
      phone: `+965 ${22000000 + randomId}`,
      alternative_phone: `+965 ${55000000 + randomId}`,
      national_id: '',
      passport_number: '',
      license_number: `CR${String(randomId).padStart(8, '0')}`,
      address: 'شارع أحمد الجابر، برج التجارة، الطابق العاشر، مكتب 1005',
      address_ar: 'شارع أحمد الجابر، برج التجارة، الطابق العاشر، مكتب 1005',
      city: 'Kuwait City',
      country: 'Kuwait',
      date_of_birth: '',
      credit_limit: 25000,
      emergency_contact_name: 'مدير المبيعات',
      emergency_contact_phone: `+965 ${66000000 + randomId}`,
      notes: 'شركة رائدة في مجال التجارة، تتعامل بمبالغ كبيرة، دورة دفع شهرية.'
    }

    // Use current customer type or default to individual
    const currentType = customerType || 'individual'
    const dummyData = currentType === 'individual' ? dummyDataIndividual : dummyDataCorporate
    
    // Fill form with dummy data
    Object.entries(dummyData).forEach(([key, value]) => {
      setValue(key as any, value)
    })
    
    // Show success message
    toast({
      title: "تم تعبئة البيانات",
      description: "تم ملء النموذج ببيانات تجريبية. يمكنك تعديلها حسب الحاجة.",
    })
  }

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
        console.log('❌ Validation errors:', validationErrors);
        return;
      }

      // إعداد البيانات للإرسال
      const customerData = {
        ...data,
        ...(isSuperAdmin && selectedCompanyId ? { selectedCompanyId } : {}),
        ...(selectedAccountId ? { selectedAccountId } : {})
      };

      console.log('📤 Submitting customer data:', customerData);

      if (mode === 'create') {
        await createCustomerMutation.mutateAsync(customerData);
        console.log('✅ Customer created successfully');
      } else {
        await updateCustomerMutation.mutateAsync({
          id: customer.id,
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="accounting">الحسابات المحاسبية</TabsTrigger>
              <TabsTrigger value="additional">بيانات إضافية</TabsTrigger>
              <TabsTrigger value="contact">معلومات الاتصال</TabsTrigger>
              <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <Card dir="rtl">
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
              <Card dir="rtl">
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
              <Card dir="rtl">
                <CardHeader>
                  <CardTitle>الوثائق الرسمية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>الرقم المدني</Label>
                      <Input 
                        {...register('national_id')} 
                        placeholder="ادخل الرقم المدني"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الجواز</Label>
                      <Input 
                        {...register('passport_number')} 
                        placeholder="ادخل رقم الجواز"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الرخصة</Label>
                      <Input 
                        {...register('license_number')} 
                        placeholder="يتم تعبئته تلقائياً من الرقم المدني"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ انتهاء الرخصة</Label>
                      <Input 
                        type="date"
                        {...register('license_expiry')} 
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>تاريخ الميلاد</Label>
                      <Input 
                        type="date"
                        {...register('date_of_birth')} 
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ انتهاء البطاقة المدنية</Label>
                      <Input 
                        type="date"
                        {...register('national_id_expiry')} 
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

            {/* تبويب الحسابات المحاسبية */}
            <TabsContent value="accounting" className="space-y-4">
              <Card dir="rtl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    الحسابات المحاسبية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   {/* Debug Panel - Show only in development */}
                   {process.env.NODE_ENV === 'development' && (
                     <Card className="border-orange-200 bg-orange-50">
                       <CardHeader>
                         <CardTitle className="text-orange-800 text-sm">🔍 Debug Info - Account 1130201</CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-2">
                         <div className="text-xs space-y-1">
                           <div>شركة حالية: {currentCompany?.name || 'غير محدد'}</div>
                           <div>معرف الشركة: {effectiveCompanyId || 'غير محدد'}</div>
                           <div>عدد الحسابات المتاحة: {availableAccounts?.length || 0}</div>
                           <div>تفعيل اختيار الحساب: {accountSettings?.enable_account_selection ? 'نعم' : 'لا'}</div>
                           <div>هل الحساب 1130201 موجود: {availableAccounts?.find(acc => acc.account_code === '1130201') ? '✅ نعم' : '❌ لا'}</div>
                           {availableAccounts?.find(acc => acc.account_code === '1130201') && (
                             <div className="bg-green-100 p-2 rounded text-green-800">
                               <div>الحساب موجود:</div>
                               <div>الكود: {availableAccounts.find(acc => acc.account_code === '1130201')?.account_code}</div>
                               <div>الاسم: {availableAccounts.find(acc => acc.account_code === '1130201')?.account_name}</div>
                               <div>متاح: {availableAccounts.find(acc => acc.account_code === '1130201')?.is_available ? 'نعم' : 'لا'}</div>
                             </div>
                           )}
                         </div>
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={async () => {
                             try {
                               console.log('🧪 Testing RPC function directly...');
                               const { data, error } = await supabase.rpc('get_available_customer_accounts', {
                                 company_id_param: effectiveCompanyId
                               });
                               console.log('🧪 Direct RPC result:', data);
                               if (error) console.error('🧪 Direct RPC error:', error);
                               
                               const account1130201 = data?.find(acc => acc.account_code === '1130201');
                               toast({
                                 title: "نتيجة الاختبار المباشر",
                                 description: account1130201 
                                   ? `تم العثور على الحساب: ${account1130201.account_name}`
                                   : "لم يتم العثور على الحساب 1130201",
                                 variant: account1130201 ? "default" : "destructive"
                               });
                             } catch (error) {
                               console.error('🧪 Test failed:', error);
                               toast({
                                 title: "فشل الاختبار",
                                 description: "حدث خطأ أثناء اختبار RPC function",
                                 variant: "destructive"
                               });
                             }
                           }}
                         >
                           اختبار RPC مباشرة
                         </Button>
                       </CardContent>
                     </Card>
                   )}

                   {accountSettings?.enable_account_selection ? (
                     <div className="space-y-4">
                        {/* خيار اختيار الحساب المحاسبي */}
                        {mode === 'create' && availableAccounts && availableAccounts.length > 0 && (
                         <div className="space-y-2">
                           <Label>اختيار حساب محاسبي مخصص (اختياري)</Label>
                           <Popover open={accountSearchOpen} onOpenChange={setAccountSearchOpen}>
                             <PopoverTrigger asChild>
                               <Button
                                 variant="outline"
                                 role="combobox"
                                 aria-expanded={accountSearchOpen}
                                 className="w-full justify-between h-auto min-h-[2.5rem] text-right"
                               >
                                 {selectedAccountId && selectedAccountId !== "auto" ? (
                                   <div className="flex flex-col items-start">
                                     <span className="font-medium">
                                       {availableAccounts.find(acc => acc.id === selectedAccountId)?.account_name_ar || 
                                        availableAccounts.find(acc => acc.id === selectedAccountId)?.account_name}
                                     </span>
                                     <span className="text-xs text-muted-foreground">
                                       {availableAccounts.find(acc => acc.id === selectedAccountId)?.account_code} | 
                                       {availableAccounts.find(acc => acc.id === selectedAccountId)?.parent_account_name}
                                     </span>
                                   </div>
                                 ) : (
                                   <span>اختر حساب محاسبي أو اترك فارغاً للإنشاء التلقائي...</span>
                                 )}
                                 <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                               </Button>
                             </PopoverTrigger>
                             <PopoverContent className="w-full p-0" align="start">
                               <Command>
                                 <CommandInput 
                                   placeholder="البحث في الحسابات..." 
                                   value={accountSearchValue}
                                   onValueChange={setAccountSearchValue}
                                 />
                                 <CommandList>
                                   <CommandEmpty>لا توجد حسابات مطابقة للبحث.</CommandEmpty>
                                   <CommandGroup>
                                     <CommandItem
                                       value="auto"
                                       onSelect={() => {
                                         setSelectedAccountId(undefined);
                                         setAccountSearchOpen(false);
                                         setAccountSearchValue("");
                                       }}
                                     >
                                       <Check
                                         className={`mr-2 h-4 w-4 ${
                                           !selectedAccountId || selectedAccountId === "auto" ? "opacity-100" : "opacity-0"
                                         }`}
                                       />
                                       <div className="flex flex-col">
                                         <span className="font-medium">إنشاء حساب تلقائياً</span>
                                         <span className="text-xs text-muted-foreground">
                                           سيتم إنشاء حساب جديد باسم العميل
                                         </span>
                                       </div>
                                     </CommandItem>
                                       {(availableAccounts || [])
                                        .filter(account => {
                                          if (!accountSearchValue) return true;
                                          const searchLower = accountSearchValue.toLowerCase();
                                          const matches = (
                                            account.account_name?.toLowerCase().includes(searchLower) ||
                                            (account.account_name_ar && account.account_name_ar.includes(accountSearchValue)) ||
                                            account.account_code?.toLowerCase().includes(searchLower) ||
                                            account.parent_account_name?.toLowerCase().includes(searchLower)
                                          );
                                          
                                          // Debug logging for account 1130201
                                          if (accountSearchValue === "1130201" || account.account_code === "1130201") {
                                            console.log("Account search debug:", {
                                              searchValue: accountSearchValue,
                                              account: {
                                                code: account.account_code,
                                                name: account.account_name,
                                                name_ar: account.account_name_ar,
                                                parent_name: account.parent_account_name
                                              },
                                              matches
                                            });
                                          }
                                          
                                          return matches;
                                        })
                                       .map((account) => (
                                         <CommandItem
                                           key={account.id}
                                           value={account.id}
                                           onSelect={() => {
                                             setSelectedAccountId(account.id);
                                             setAccountSearchOpen(false);
                                             setAccountSearchValue("");
                                           }}
                                           className={!account.is_available ? "opacity-60" : ""}
                                         >
                                           <Check
                                             className={`mr-2 h-4 w-4 ${
                                               selectedAccountId === account.id ? "opacity-100" : "opacity-0"
                                             }`}
                                           />
                                           <div className="flex flex-col flex-1">
                                             <div className="flex items-center gap-2">
                                               <span className="font-medium">
                                                 {account.account_name_ar || account.account_name}
                                               </span>
                                               {!account.is_available && (
                                                 <span className="text-xs bg-orange-100 text-orange-700 px-1 rounded">
                                                   مستخدم
                                                 </span>
                                               )}
                                             </div>
                                             <span className="text-xs text-muted-foreground">
                                               {account.account_code} | {account.parent_account_name}
                                             </span>
                                           </div>
                                         </CommandItem>
                                       ))}
                                   </CommandGroup>
                                 </CommandList>
                               </Command>
                             </PopoverContent>
                           </Popover>
                           <p className="text-xs text-muted-foreground">
                             إذا لم تختر حساباً، سيتم إنشاء حساب جديد تلقائياً باسم العميل
                           </p>
                         </div>
                       )}

                      {/* معلومات الحساب التلقائي */}
                      {accountSettings?.auto_create_account && (
                        <Alert>
                          <InfoIcon className="h-4 w-4" />
                          <AlertDescription>
                            {selectedAccountId && selectedAccountId !== "auto" 
                              ? "سيتم ربط العميل بالحساب المحاسبي المحدد."
                              : "سيتم إنشاء حساب محاسبي جديد تلقائياً لهذا العميل."}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertDescription>
                        يتم إنشاء الحسابات المحاسبية تلقائياً للعملاء في هذه الشركة.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-6 border-t">
            {/* Dummy data button - only show when adding new customer */}
            {mode === 'create' && (
              <Button 
                type="button" 
                variant="secondary" 
                onClick={fillDummyData}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                تعبئة بيانات تجريبية
              </Button>
            )}
            
            <div className="flex gap-3">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
