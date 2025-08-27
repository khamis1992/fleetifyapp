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
import { User, Phone, Calculator, LinkIcon, CheckCircle, ArrowRight, ArrowLeft, CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const customerSchema = z.object({
  // Basic Information
  customer_type: z.enum(['individual', 'company']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  company_name: z.string().optional(),
  commercial_register: z.string().optional(),
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
  
  base_currency: z.string().default('KWD'),
  initial_credit_limit: z.number().optional(),
  
  // Account Linking
  accounts: z.object({
    receivables: z.string().optional(),
    advances: z.string().optional(), 
    deposits: z.string().optional(),
    discounts: z.string().optional(),
  }).optional(),
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
      commercial_register: '',
      national_id: '',
      passport_number: '',
      license_number: '',
      phone: '',
      email: '',
      
      base_currency: 'KWD',
    },
  });

  const watchedValues = form.watch();

  const onSubmit = async (data: CustomerFormData) => {
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
        toast.error(`لا يمكن حفظ العميل: ${expiredDocs.join(' و ')} منتهية الصلاحية`);
        return;
      }

      // If there are duplicates and user hasn't forced creation, show error
      if (hasDuplicates && !forceCreate) {
        toast.error('يوجد عملاء مشابهين في النظام. يرجى مراجعة التحذيرات أعلاه.');
        return;
      }

      const result = await createCustomer.mutateAsync({
        ...data,
        force_create: forceCreate,
      });

      toast.success(editingCustomer ? 'تم تحديث العميل بنجاح' : 'تم إنشاء العميل بنجاح');
      
      if (onSuccess) {
        onSuccess(result);
      } else {
        form.reset();
        setForceCreate(false);
        setHasDuplicates(false);
      }
    } catch (error: any) {
      console.error('Error creating customer:', error);
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
        return !!watchedValues.base_currency;
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
            commercial_register: watchedValues.commercial_register,
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
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      البيانات الأساسية
                    </CardTitle>
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
                              <SelectItem value="company">شركة</SelectItem>
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
                    {customerType === 'company' && (
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

                        <FormField
                          control={form.control}
                          name="commercial_register"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>السجل التجاري</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="أدخل رقم السجل التجاري" />
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
                  companyName={customerType === 'company' ? watchedValues.company_name : undefined}
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