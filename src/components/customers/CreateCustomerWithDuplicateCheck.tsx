import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCreateCustomer } from '@/hooks/useEnhancedCustomers';
import { CustomerFormWithDuplicateCheck } from './CustomerFormWithDuplicateCheck';
import { AccountingSettings } from './AccountingSettings';
import { AccountLinking } from './AccountLinking';
import { AccountingSummary } from './AccountingSummary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { User, Phone, Calculator, LinkIcon, CheckCircle, ArrowRight, ArrowLeft, CalendarIcon, AlertTriangle, TestTube } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const customerSchema = z.object({
  // Basic Information
  customer_type: z.enum(['individual', 'corporate']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  license_number: z.string().optional(),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  email: z.string().email('البريد الإلكتروني غير صحيح').optional().or(z.literal('')),
  date_of_birth: z.date().optional(),
  national_id_expiry: z.date().refine(
    (date) => !date || date > new Date(),
    { message: 'تاريخ انتهاء البطاقة المدنية يجب أن يكون في المستقبل' }
  ).optional(),
  license_expiry: z.date().refine(
    (date) => !date || date > new Date(),
    { message: 'تاريخ انتهاء رخصة القيادة يجب أن يكون في المستقبل' }
  ).optional(),
  
  credit_limit: z.number().optional(),
}).refine(
  (data) => {
    // Validate that birth date is not in the future and not too old
    if (data.date_of_birth) {
      const today = new Date();
      const birthDate = data.date_of_birth;
      const age = today.getFullYear() - birthDate.getFullYear();
      return birthDate <= today && age <= 120;
    }
    return true;
  },
  {
    message: 'تاريخ الميلاد غير صحيح',
    path: ['date_of_birth']
  }
);

type CustomerFormData = z.infer<typeof customerSchema>;

interface CreateCustomerWithDuplicateCheckProps {
  editingCustomer?: any;
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
}

export const CreateCustomerWithDuplicateCheck: React.FC<CreateCustomerWithDuplicateCheckProps> = ({
  editingCustomer,
  onSuccess,
  onCancel
}) => {
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);
  const [currentStep, setCurrentStep] = useState('basic');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  
  const createCustomer = useCreateCustomer();
  
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: 'individual',
      first_name: '',
      last_name: '',
      company_name: '',
      national_id: '',
      passport_number: '',
      license_number: '',
      phone: '',
      email: '',
    },
  });

  const watchedValues = form.watch();

  const onSubmit = async (data: CustomerFormData) => {
    console.log('🚀 [CUSTOMER_FORM] Starting customer submission with data:', {
      customer_type: data.customer_type,
      first_name: data.first_name,
      last_name: data.last_name,
      company_name: data.company_name,
      national_id: data.national_id,
      passport_number: data.passport_number,
      license_number: data.license_number,
      phone: data.phone,
      email: data.email,
      date_of_birth: data.date_of_birth,
      national_id_expiry: data.national_id_expiry,
      license_expiry: data.license_expiry,
      credit_limit: data.credit_limit,
      force_create: forceCreate,
      hasDuplicates,
      editingCustomer: !!editingCustomer
    });

    try {
      // Check for expired documents
      const expiredDocs = [];
      if (data.national_id_expiry && data.national_id_expiry <= new Date()) {
        expiredDocs.push('البطاقة المدنية');
      }
      if (data.license_expiry && data.license_expiry <= new Date()) {
        expiredDocs.push('رخصة القيادة');
      }

      if (expiredDocs.length > 0) {
        console.error('❌ [CUSTOMER_FORM] Expired documents detected:', expiredDocs);
        toast.error(`لا يمكن حفظ العميل: ${expiredDocs.join(' و ')} منتهية الصلاحية`);
        return;
      }

      // If there are duplicates and user hasn't forced creation, show error
      if (hasDuplicates && !forceCreate) {
        console.warn('⚠️ [CUSTOMER_FORM] Duplicates detected but not forced:', { hasDuplicates, forceCreate });
        toast.error('يوجد عملاء مشابهين في النظام. يرجى مراجعة التحذيرات أعلاه.');
        return;
      }

      console.log('✅ [CUSTOMER_FORM] All validations passed, sending to createCustomer:', {
        ...data,
        force_create: forceCreate,
      });

      const result = await createCustomer.mutateAsync({
        ...data,
        force_create: forceCreate,
      });

      console.log('🎉 [CUSTOMER_FORM] Customer creation successful! Result:', result);
      
      toast.success(editingCustomer ? 'تم تحديث العميل بنجاح' : 'تم إنشاء العميل بنجاح');
      
      if (onSuccess) {
        console.log('📞 [CUSTOMER_FORM] Calling onSuccess callback with result:', result);
        onSuccess(result);
      } else {
        console.log('🔄 [CUSTOMER_FORM] Resetting form state');
        form.reset();
        setForceCreate(false);
        setHasDuplicates(false);
      }
    } catch (error: unknown) {
      console.error('💥 [CUSTOMER_FORM] Error creating customer:', {
        error,
        message: error.message,
        stack: error.stack,
        originalData: data
      });
      toast.error(error.message || 'حدث خطأ أثناء إنشاء العميل');
    }
  };

  const handleDuplicateDetected = (detected: boolean) => {
    setHasDuplicates(detected);
    if (!detected) {
      setForceCreate(false);
    }
  };

  const handleProceedWithDuplicates = () => {
    setForceCreate(true);
    setHasDuplicates(false);
  };

  const customerType = form.watch('customer_type');

  // Mock data generation functions
  const generateMockIndividualData = () => {
    const firstNames = ['محمد', 'أحمد', 'علي', 'فاطمة', 'عائشة', 'خديجة', 'يوسف', 'إبراهيم', 'مريم', 'زينب'];
    const lastNames = ['الأحمد', 'المحمد', 'العلي', 'الخالدي', 'السالم', 'العثمان', 'الراشد', 'المطيري', 'العنزي', 'الشمري'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomId = Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
    const randomPhone = '9' + Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    
    // Generate future expiry dates
    const futureDate1 = new Date();
    futureDate1.setFullYear(futureDate1.getFullYear() + 2);
    
    const futureDate2 = new Date();
    futureDate2.setFullYear(futureDate2.getFullYear() + 3);
    
    // Generate past birth date
    const birthDate = new Date();
    birthDate.setFullYear(birthDate.getFullYear() - 30 - Math.floor(Math.random() * 20));
    
    return {
      customer_type: 'individual' as const,
      first_name: firstName,
      last_name: lastName,
      national_id: `2${randomId}`,
      license_number: `L${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      passport_number: `P${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}`,
      phone: randomPhone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      date_of_birth: birthDate,
      national_id_expiry: futureDate1,
      license_expiry: futureDate2,
      credit_limit: Math.floor(Math.random() * 10000) + 1000,
    };
  };

  const generateMockCorporateData = () => {
    const companies = [
      'شركة الخليج للتجارة',
      'مؤسسة النور للمقاولات',
      'شركة الأمل للاستثمار',
      'مجموعة الفجر التجارية',
      'شركة البحر للنقل',
      'مؤسسة الضياء للتطوير',
      'شركة الوادي للصناعات',
      'مجموعة الشروق للخدمات',
      'شركة الرياض للتقنية',
      'مؤسسة القمة للاستشارات'
    ];
    
    const company = companies[Math.floor(Math.random() * companies.length)];
    const randomId = Math.floor(Math.random() * 999999999).toString().padStart(9, '0');
    const randomPhone = '2' + Math.floor(Math.random() * 9999999).toString().padStart(7, '0');
    
    // Generate future expiry dates
    const futureDate1 = new Date();
    futureDate1.setFullYear(futureDate1.getFullYear() + 2);
    
    const futureDate2 = new Date();
    futureDate2.setFullYear(futureDate2.getFullYear() + 3);
    
    return {
      customer_type: 'corporate' as const,
      company_name: company,
      national_id: `3${randomId}`,
      license_number: `C${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`,
      passport_number: undefined,
      phone: randomPhone,
      email: `info@${company.split(' ')[1].toLowerCase()}.com`,
      date_of_birth: undefined,
      national_id_expiry: futureDate1,
      license_expiry: futureDate2,
      credit_limit: Math.floor(Math.random() * 50000) + 5000,
      first_name: '',
      last_name: '',
    };
  };

  const fillMockData = () => {
    const mockData = customerType === 'individual' ? generateMockIndividualData() : generateMockCorporateData();
    
    // Fill form with mock data
    Object.keys(mockData).forEach(key => {
      const value = mockData[key as keyof typeof mockData];
      if (value !== undefined) {
        form.setValue(key as keyof CustomerFormData, value);
      }
    });
    
    toast.success('تم ملء البيانات الوهمية بنجاح');
  };

  const steps = [
    { id: 'basic', label: 'البيانات الأساسية', icon: User },
    { id: 'contact', label: 'معلومات الاتصال', icon: Phone },
    { id: 'accounting', label: 'الإعدادات المحاسبية', icon: Calculator },
    { id: 'linking', label: 'ربط الحسابات', icon: LinkIcon },
    { id: 'summary', label: 'المراجعة والحفظ', icon: CheckCircle },
  ];

  const getStepProgress = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 'basic':
        const basicValid = watchedValues.customer_type && 
          (customerType === 'individual' ? watchedValues.first_name && watchedValues.last_name : watchedValues.company_name);
        return !!basicValid;
      case 'contact':
        return !!watchedValues.phone;
      case 'accounting':
        return true; // Optional step
      case 'linking':
        return true; // Optional step
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateCurrentStep()) {
      toast.error('يرجى إكمال الحقول المطلوبة قبل المتابعة');
      return;
    }
    
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex < steps.length - 1) {
      const nextStepId = steps[currentIndex + 1].id;
      setCurrentStep(nextStepId);
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps([...completedSteps, currentStep]);
      }
    }
  };

  const previousStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <User className="h-6 w-6" />
          إنشاء عميل جديد
        </CardTitle>
        
        {/* Progress Bar */}
        <div className="space-y-2 mt-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>التقدم: {Math.round(getStepProgress())}%</span>
            <span>الخطوة {steps.findIndex(s => s.id === currentStep) + 1} من {steps.length}</span>
          </div>
          <Progress value={getStepProgress()} className="h-2" />
        </div>

        {/* Steps Navigation */}
        <div className="flex flex-wrap gap-2 mt-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = completedSteps.includes(step.id);
            const isAccessible = index === 0 || completedSteps.includes(steps[index - 1].id);
            
            return (
              <Button
                key={step.id}
                variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                size="sm"
                className={`flex items-center gap-2 ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isAccessible && setCurrentStep(step.id)}
                disabled={!isAccessible}
              >
                <Icon className="h-4 w-4" />
                {step.label}
                {isCompleted && <CheckCircle className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <CustomerFormWithDuplicateCheck
          customerData={{
            customer_type: watchedValues.customer_type,
            national_id: watchedValues.national_id,
            passport_number: watchedValues.passport_number,
            phone: watchedValues.phone,
            email: watchedValues.email,
            company_name: watchedValues.company_name,
          }}
          onDuplicateDetected={handleDuplicateDetected}
          onProceedWithDuplicates={handleProceedWithDuplicates}
          enableRealTimeCheck={currentStep === 'basic' || currentStep === 'contact'}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Basic Information */}
              {currentStep === 'basic' && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        البيانات الأساسية
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={fillMockData}
                        className="flex items-center gap-2 text-xs"
                        title="ملء بيانات وهمية لتسريع الاختبار"
                      >
                        <TestTube className="h-4 w-4" />
                        بيانات وهمية
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Customer Type */}
                    <FormField
                      control={form.control}
                      name="customer_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع العميل *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع العميل" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="individual">فرد</SelectItem>
                              <SelectItem value="corporate">شركة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Individual Fields */}
                    {customerType === 'individual' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="first_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>الاسم الأول *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="أدخل الاسم الأول" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="last_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم العائلة *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="أدخل اسم العائلة" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Company Fields */}
                    {customerType === 'corporate' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="company_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>اسم الشركة *</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="أدخل اسم الشركة" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                      </div>
                    )}

                    {/* Identification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="national_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>البطاقة المدنية</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="أدخل رقم البطاقة المدنية" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="national_id_expiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاريخ انتهاء البطاقة المدنية</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                      field.value && field.value <= new Date() && "border-destructive text-destructive"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>اختر التاريخ</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            {field.value && field.value <= new Date() && (
                              <Alert className="border-destructive/50 bg-destructive/10">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <AlertDescription className="text-destructive">
                                  البطاقة المدنية منتهية الصلاحية
                                </AlertDescription>
                              </Alert>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="license_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم رخصة القيادة</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="أدخل رقم رخصة القيادة" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="license_expiry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاريخ انتهاء رخصة القيادة</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                      field.value && field.value <= new Date() && "border-destructive text-destructive"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>اختر التاريخ</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date < new Date()}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            {field.value && field.value <= new Date() && (
                              <Alert className="border-destructive/50 bg-destructive/10">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <AlertDescription className="text-destructive">
                                  رخصة القيادة منتهية الصلاحية
                                </AlertDescription>
                              </Alert>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="passport_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الجواز</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="أدخل رقم الجواز" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date_of_birth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاريخ الميلاد</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>اختر التاريخ</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                  initialFocus
                                  className={cn("p-3 pointer-events-auto")}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Contact Information */}
              {currentStep === 'contact' && (
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      معلومات الاتصال
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الهاتف *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="أدخل رقم الهاتف" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <Input {...field} type="email" placeholder="أدخل البريد الإلكتروني" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Accounting Settings */}
              {currentStep === 'accounting' && (
                <AccountingSettings 
                  control={form.control} 
                  customerType={customerType}
                  setValue={form.setValue}
                  getValues={form.getValues}
                />
              )}

              {/* Step 4: Account Linking */}
              {currentStep === 'linking' && (
                <AccountLinking 
                  control={form.control}
                  customerType={customerType}
                  customerName={customerType === 'individual' ? `${watchedValues.first_name} ${watchedValues.last_name}` : undefined}
                  companyName={customerType === 'corporate' ? watchedValues.company_name : undefined}
                />
              )}

              {/* Step 5: Summary */}
              {currentStep === 'summary' && (
                <AccountingSummary customerData={watchedValues} />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center pt-6 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={previousStep}
                  disabled={currentStep === 'basic'}
                  className="flex items-center gap-2"
                >
                  السابق
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (onCancel) {
                        onCancel();
                      } else {
                        form.reset();
                        setCurrentStep('basic');
                        setCompletedSteps([]);
                        setForceCreate(false);
                        setHasDuplicates(false);
                      }
                    }}
                  >
                    إلغاء
                  </Button>

                  {currentStep === 'summary' ? (
                    <Button 
                      type="submit" 
                      disabled={createCustomer.isPending}
                      className={`flex items-center gap-2 ${hasDuplicates && !forceCreate ? 'bg-warning hover:bg-warning/90' : ''}`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {createCustomer.isPending ? 'جاري الحفظ...' : 'حفظ العميل'}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      التالي
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CustomerFormWithDuplicateCheck>
      </CardContent>
    </Card>
  );
};