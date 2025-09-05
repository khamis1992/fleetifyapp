import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreateCustomer } from '@/hooks/useEnhancedCustomers';
import { useCustomerOperations } from '@/hooks/business/useCustomerOperations';
import { createCustomerSchema } from '@/schemas/customer.schema';
import { useCustomerDuplicateCheck } from '@/hooks/useCustomerDuplicateCheck';
import { toast } from 'sonner';
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  CreditCard, 
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  TestTube,
  ArrowRight,
  ArrowLeft,
  Calculator,
  LinkIcon,
  CalendarIcon
} from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CustomerFormWithDuplicateCheck } from './CustomerFormWithDuplicateCheck';
import { AccountingSettings } from './AccountingSettings';
import { AccountLinking } from './AccountLinking';
import { AccountingSummary } from './AccountingSummary';

// Unified customer schema
const customerSchema = createCustomerSchema;

type CustomerFormData = z.infer<typeof customerSchema>;

interface EnhancedCustomerFormProps {
  mode?: 'create' | 'edit' | 'inline';
  editingCustomer?: any;
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
  context?: 'standalone' | 'contract' | 'invoice' | 'maintenance';
  integrationMode?: 'dialog' | 'page' | 'embedded';
  initialData?: Partial<CustomerFormData>;
  showDuplicateCheck?: boolean;
}

export const EnhancedCustomerForm: React.FC<EnhancedCustomerFormProps> = ({
  mode = 'create',
  editingCustomer,
  onSuccess,
  onCancel,
  context = 'standalone',
  integrationMode = 'dialog',
  initialData,
  showDuplicateCheck = true
}) => {
  const [currentStep, setCurrentStep] = useState('basic');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [hasDuplicates, setHasDuplicates] = useState(false);
  const [forceCreate, setForceCreate] = useState(false);

  const { createCustomer } = useCustomerOperations({
    enableDuplicateCheck: showDuplicateCheck,
    autoCreateAccounts: context === 'standalone',
    sendWelcomeEmail: false
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: 'individual',
      first_name: '',
      last_name: '',
      company_name: '',
      phone: '',
      email: '',
      national_id: '',
      passport_number: '',
      license_number: '',
      notes: '',
      ...initialData,
      ...editingCustomer
    },
  });

  const watchedValues = form.watch();
  const customerType = form.watch('customer_type');
  const nationalId = form.watch('national_id');

  // Auto-fill license number when national ID changes
  useEffect(() => {
    if (nationalId && customerType === 'individual') {
      form.setValue('license_number', nationalId);
    }
  }, [nationalId, customerType, form]);

  // Steps configuration
  const steps = [
    { id: 'basic', label: 'البيانات الأساسية', icon: User, required: true },
    { id: 'contact', label: 'معلومات الاتصال', icon: Phone, required: true },
    { id: 'accounting', label: 'الإعدادات المحاسبية', icon: Calculator, required: context !== 'contract' },
    { id: 'linking', label: 'ربط الحسابات', icon: LinkIcon, required: context === 'standalone' },
    { id: 'summary', label: 'المراجعة والحفظ', icon: CheckCircle, required: true },
  ];

  const visibleSteps = steps.filter(step => {
    if (context === 'contract' && (step.id === 'accounting' || step.id === 'linking')) {
      return false;
    }
    if (context === 'invoice' && step.id === 'linking') {
      return false;
    }
    return true;
  });

  const nextStep = () => {
    const currentIndex = visibleSteps.findIndex(step => step.id === currentStep);
    if (currentIndex < visibleSteps.length - 1) {
      const nextStepId = visibleSteps[currentIndex + 1].id;
      setCompletedSteps(prev => [...prev, currentStep]);
      setCurrentStep(nextStepId);
    }
  };

  const previousStep = () => {
    const currentIndex = visibleSteps.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      const prevStepId = visibleSteps[currentIndex - 1].id;
      setCurrentStep(prevStepId);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      // Enhanced validation for expired documents
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

      // Check for duplicates if enabled
      if (hasDuplicates && !forceCreate && showDuplicateCheck) {
        toast.error('يوجد عملاء مشابهين في النظام. يرجى مراجعة التحذيرات أعلاه.');
        return;
      }

      console.log('📝 [FORM] Submitting customer form:', data);
      
      const result = await createCustomer.mutateAsync({
        ...data,
        force_create: forceCreate
      });

      // Form reset and UI updates - immediate for better UX
      form.reset();
      setCurrentStep('basic');
      setCompletedSteps([]);
      setForceCreate(false);
      setHasDuplicates(false);
      
      console.log('✅ [FORM] Customer created successfully, calling onSuccess');
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);
      toast.error(error.message || 'حدث خطأ أثناء حفظ العميل');
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

  // Mock data generation for testing
  const generateMockData = () => {
    const mockData = customerType === 'individual' 
      ? {
          first_name: 'أحمد',
          last_name: 'المحمد',
          phone: '+96599123456',
          email: 'ahmed@example.com',
          national_id: '12345678901',
          license_number: 'C123456'
        }
      : {
          company_name: 'شركة التطوير المتقدم',
          phone: '+96522123456',
          email: 'info@company.com',
          national_id: '98765432101'
        };
    
    Object.keys(mockData).forEach(key => {
      form.setValue(key as keyof CustomerFormData, mockData[key as keyof typeof mockData]);
    });
    
    toast.success('تم ملء البيانات الوهمية بنجاح');
  };

  const renderFormContent = () => (
    <div className="space-y-6">
      {/* Step Navigation */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {visibleSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isAccessible = index === 0 || completedSteps.includes(visibleSteps[index - 1].id);
          
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

      {/* Form Content with Duplicate Check Wrapper */}
      {showDuplicateCheck ? (
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
          {renderStepContent()}
        </CustomerFormWithDuplicateCheck>
      ) : (
        renderStepContent()
      )}

      {/* Navigation Buttons */}
      <div className={`flex justify-between items-center pt-6 border-t border-border/50 form-button-container ${hasDuplicates ? 'duplicate-check-active' : ''}`}>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            console.log('🔙 [FORM] Previous button clicked');
            previousStep();
          }}
          disabled={currentStep === visibleSteps[0].id}
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
              console.log('❌ [FORM] Cancel button clicked');
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
              onClick={() => {
                console.log('💾 [FORM] Save button clicked', { hasDuplicates, forceCreate });
              }}
            >
              <CheckCircle className="h-4 w-4" />
              {createCustomer.isPending ? 'جاري الحفظ...' : 'حفظ العميل'}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => {
                console.log('➡️ [FORM] Next button clicked', {
                  currentStep,
                  hasDuplicates,
                  forceCreate,
                  formValues: form.getValues(),
                  formErrors: form.formState.errors
                });
                nextStep();
              }}
              disabled={hasDuplicates && !forceCreate}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              التالي
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic':
        return (
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
                  onClick={generateMockData}
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
              )}

              {/* Identification and Documents */}
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
                  render={({ field }) => {
                    const isExpired = field.value && field.value <= new Date();
                    return (
                      <FormItem>
                        <FormLabel className={isExpired ? "text-destructive" : ""}>
                          تاريخ انتهاء البطاقة المدنية
                          {isExpired && <AlertTriangle className="inline h-4 w-4 ml-1" />}
                        </FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground",
                                  isExpired && "border-destructive text-destructive"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>اختر تاريخ الانتهاء</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        {isExpired && (
                          <Alert className="mt-2 border-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-destructive">
                              البطاقة المدنية منتهية الصلاحية
                            </AlertDescription>
                          </Alert>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
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
              </div>

              {/* License Information - Only for Individuals */}
              {customerType === 'individual' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-4">
                    <CreditCard className="h-4 w-4" />
                    <span>معلومات رخصة القيادة</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="license_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم رخصة القيادة</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="يتم تعبئتها تلقائياً من رقم الهوية"
                              className="bg-muted/50"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            يتم تعبئة هذا الحقل تلقائياً من رقم البطاقة المدنية
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="license_expiry"
                      render={({ field }) => {
                        const isExpired = field.value && field.value <= new Date();
                        return (
                          <FormItem>
                            <FormLabel className={isExpired ? "text-destructive" : ""}>
                              تاريخ انتهاء رخصة القيادة
                              {isExpired && <AlertTriangle className="inline h-4 w-4 ml-1" />}
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground",
                                      isExpired && "border-destructive text-destructive"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>اختر تاريخ انتهاء الرخصة</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="p-3 pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            {isExpired && (
                              <Alert className="mt-2 border-destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-destructive">
                                  رخصة القيادة منتهية الصلاحية
                                </AlertDescription>
                              </Alert>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'contact':
        return (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="أدخل أي ملاحظات إضافية" rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        );

      case 'accounting':
        return (
          <AccountingSettings 
            control={form.control} 
            customerType={customerType}
            setValue={form.setValue}
            getValues={form.getValues}
          />
        );

      case 'linking':
        return (
          <AccountLinking 
            control={form.control}
            customerType={customerType}
            customerName={customerType === 'individual' ? `${watchedValues.first_name} ${watchedValues.last_name}` : undefined}
            companyName={customerType === 'corporate' ? watchedValues.company_name : undefined}
          />
        );

      case 'summary':
        return <AccountingSummary customerData={watchedValues} />;

      default:
        return null;
    }
  };

  // Render based on integration mode
  if (integrationMode === 'dialog') {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {renderFormContent()}
        </form>
      </Form>
    );
  }

  if (integrationMode === 'page') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {renderFormContent()}
          </form>
        </Form>
      </div>
    );
  }

  // Embedded mode
  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {renderFormContent()}
        </form>
      </Form>
    </div>
  );
};

// Export with wrapper for dialog usage
export const EnhancedCustomerDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: any;
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
  context?: 'standalone' | 'contract' | 'invoice' | 'maintenance';
}> = ({ open, onOpenChange, editingCustomer, onSuccess, onCancel, context }) => {
  const handleClose = () => {
    onOpenChange(false);
    if (onCancel) {
      onCancel();
    }
  };

  const handleSuccess = (customer: any) => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess(customer);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {editingCustomer ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
          </DialogTitle>
        </DialogHeader>
        
        <EnhancedCustomerForm
          mode={editingCustomer ? 'edit' : 'create'}
          editingCustomer={editingCustomer}
          onSuccess={handleSuccess}
          onCancel={handleClose}
          context={context}
          integrationMode="dialog"
        />
      </DialogContent>
    </Dialog>
  );
};