/**
 * Enhanced Customer Form - Redesigned with Dashboard Theme (#009688 teal)
 *
 * Features:
 * - 3-step wizard design matching SimpleContractWizard
 * - Teal color scheme (#009688) matching system design
 * - Smooth animations with framer-motion
 * - Duplicate detection
 * - All existing functionality preserved
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useCustomerOperations } from '@/hooks/business/useCustomerOperations';
import { createCustomerSchema } from '@/schemas/customer.schema';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  User, 
  Building2, 
  Phone, 
  Mail, 
  CreditCard, 
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  FileText,
  CalendarIcon,
  Loader2,
  MapPin
} from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CustomerFormWithDuplicateCheck } from './CustomerFormWithDuplicateCheck';

// === Schema ===
const customerSchema = createCustomerSchema;
type CustomerFormData = z.infer<typeof customerSchema>;

// === Types ===
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

// === Step Configuration ===
const STEPS = [
  { 
    id: 'basic', 
    title: 'البيانات الأساسية', 
    subtitle: 'المعلومات الشخصية والوثائق',
    icon: User 
  },
  { 
    id: 'contact', 
    title: 'معلومات الاتصال', 
    subtitle: 'الهاتف والبريد الإلكتروني',
    icon: Phone 
  },
  { 
    id: 'review', 
    title: 'المراجعة والحفظ', 
    subtitle: 'تأكيد البيانات',
    icon: CheckCircle 
  },
];

// === Animation Variants ===
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0
  })
};

// === Progress Bar Component ===
const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="relative h-2 bg-gradient-to-l from-teal-50 to-teal-100 rounded-full overflow-hidden shadow-inner">
      <motion.div
        className="absolute inset-y-0 right-0 bg-gradient-to-l from-teal-500 to-teal-600 rounded-full shadow-lg shadow-teal-500/30"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

// === Step Indicator Component ===
const StepIndicator: React.FC<{
  steps: typeof STEPS;
  currentStep: number;
  onStepClick: (index: number) => void;
}> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isClickable = index <= currentStep;

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div className={cn(
                "h-0.5 w-8 rounded-full transition-all duration-300 shadow-sm",
                index <= currentStep
                  ? "bg-gradient-to-l from-teal-500 to-teal-600"
                  : "bg-gradient-to-r from-teal-100 to-teal-50"
              )} />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(index)}
              disabled={!isClickable}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300",
                isActive && "bg-gradient-to-l from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/30 scale-105",
                isCompleted && !isActive && "bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 border border-teal-200",
                !isActive && !isCompleted && "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 border border-slate-200",
                isClickable && "cursor-pointer hover:scale-105 hover:shadow-md",
                !isClickable && "cursor-not-allowed opacity-60"
              )}
            >
              {isCompleted && !isActive ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-full ring-2 ring-teal-400 ring-opacity-50"
                  layoutId="activeStep"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};

// === Main Form Component ===
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
  const [currentStep, setCurrentStep] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const [hasDuplicates, setHasDuplicates] = React.useState(false);
  const [forceCreate, setForceCreate] = React.useState(false);

  const { createCustomer, updateCustomer } = useCustomerOperations({
    enableDuplicateCheck: showDuplicateCheck,
    autoCreateAccounts: context === 'standalone',
    sendWelcomeEmail: false
  });

  // Sanitize editingCustomer - keep null values as undefined to avoid validation issues
  const sanitizedEditingCustomer = editingCustomer ? {
    customer_type: editingCustomer.customer_type || 'individual',
    first_name: editingCustomer.first_name || undefined,
    last_name: editingCustomer.last_name || undefined,
    first_name_ar: editingCustomer.first_name_ar || undefined,
    last_name_ar: editingCustomer.last_name_ar || undefined,
    company_name: editingCustomer.company_name || undefined,
    company_name_ar: editingCustomer.company_name_ar || undefined,
    phone: editingCustomer.phone || '',
    email: editingCustomer.email || undefined,
    national_id: editingCustomer.national_id || undefined,
    passport_number: editingCustomer.passport_number || undefined,
    license_number: editingCustomer.license_number || undefined,
    notes: editingCustomer.notes || undefined,
    address: editingCustomer.address || undefined,
    city: editingCustomer.city || undefined,
    country: editingCustomer.country || undefined,
  } : undefined;

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
      address: '',
      city: '',
      country: '',
      ...initialData,
      ...sanitizedEditingCustomer
    },
  });

  const watchedValues = form.watch();
  const customerType = form.watch('customer_type');
  const nationalId = form.watch('national_id');

  // Update form when editingCustomer changes (e.g., when dialog opens)
  React.useEffect(() => {
    if (mode === 'edit' && sanitizedEditingCustomer) {
      form.reset(sanitizedEditingCustomer);
    }
  }, [mode, sanitizedEditingCustomer, form]);

  // Auto-fill license number when national ID changes
  React.useEffect(() => {
    if (nationalId && customerType === 'individual') {
      form.setValue('license_number', nationalId);
    }
  }, [nationalId, customerType, form]);

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (index: number) => {
    if (index <= currentStep) {
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    try {
      // Check for duplicates (only for create mode)
      if (mode === 'create' && hasDuplicates && !forceCreate && showDuplicateCheck) {
        toast.error('يوجد عملاء مشابهين في النظام. يرجى مراجعة التحذيرات.');
        return;
      }

      let result;
      
      if (mode === 'edit' && editingCustomer?.id) {
        // Update existing customer
        result = await updateCustomer.mutateAsync({
          id: editingCustomer.id,
          ...data,
          // Keep empty strings for optional fields (schema expects string, not null)
          email: data.email || undefined,
          notes: data.notes || undefined,
          passport_number: data.passport_number || undefined,
        });
      } else {
        // Create new customer
        result = await createCustomer.mutateAsync({
          ...data,
          force_create: forceCreate
        });
        
        form.reset();
        setCurrentStep(0);
        setForceCreate(false);
        setHasDuplicates(false);
      }
      
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
    if (!detected) setForceCreate(false);
  };

  const handleProceedWithDuplicates = () => {
    setForceCreate(true);
    setHasDuplicates(false);
  };

  // === Step 1: Basic Information ===
  const renderBasicStep = () => (
    <motion.div
      key="basic"
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Step Header */}
      <div className="text-center mb-6">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 mb-4 shadow-lg shadow-teal-500/20 border border-teal-200"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <User className="h-8 w-8" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-800">البيانات الأساسية</h3>
        <p className="text-slate-500 text-sm">أدخل المعلومات الشخصية والوثائق</p>
      </div>

      {/* Customer Type */}
      <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl p-4 border border-teal-200 shadow-sm">
        <FormField
          control={form.control}
          name="customer_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 font-medium">نوع العميل *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white/80 backdrop-blur-sm border-teal-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all">
                    <SelectValue placeholder="اختر نوع العميل" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="individual">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-teal-600" />
                      فرد
                    </span>
                  </SelectItem>
                  <SelectItem value="corporate">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-teal-600" />
                      شركة
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Individual Fields */}
      {customerType === 'individual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">الاسم الأول *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="أدخل الاسم الأول" 
                      className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">اسم العائلة *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="أدخل اسم العائلة"
                      className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {/* Company Fields */}
      {customerType === 'corporate' && (
        <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
          <FormField
            control={form.control}
            name="company_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium">اسم الشركة *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder="أدخل اسم الشركة" 
                    className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Identification Documents */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-600">
          <CreditCard className="h-5 w-5 text-teal-600" />
          <span className="font-medium">الوثائق والهوية</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <FormField
              control={form.control}
              name="national_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">البطاقة المدنية / الرقم الشخصي</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="أدخل رقم البطاقة المدنية" 
                      className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <FormField
              control={form.control}
              name="national_id_expiry"
              render={({ field }) => {
                const isExpired = field.value && field.value <= new Date();
                return (
                  <FormItem>
                    <FormLabel className={cn("text-slate-700 font-medium", isExpired && "text-red-500")}>
                      تاريخ انتهاء البطاقة
                      {isExpired && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-right font-normal bg-white/80 backdrop-blur-sm border-teal-200/50 hover:border-teal-300 transition-all",
                              !field.value && "text-muted-foreground",
                              isExpired && "border-red-500 text-red-500 hover:border-red-600"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: ar }) : "اختر التاريخ"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {isExpired && (
                      <p className="text-xs text-red-500 mt-1">⚠️ البطاقة منتهية الصلاحية</p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <FormField
              control={form.control}
              name="passport_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-medium">رقم الجواز</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="أدخل رقم الجواز" 
                      className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {customerType === 'individual' && (
            <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
              <FormField
                control={form.control}
                name="license_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-medium">رقم رخصة القيادة</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="يتم تعبئتها تلقائياً" 
                        className="bg-slate-100 border-slate-200"
                        readOnly
                      />
                    </FormControl>
                    <p className="text-xs text-slate-500">يتم تعبئة هذا الحقل تلقائياً من رقم البطاقة</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {customerType === 'individual' && (
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <FormField
              control={form.control}
              name="license_expiry"
              render={({ field }) => {
                const isExpired = field.value && field.value <= new Date();
                return (
                  <FormItem>
                    <FormLabel className={cn("text-slate-700 font-medium", isExpired && "text-red-500")}>
                      تاريخ انتهاء رخصة القيادة
                      {isExpired && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-right font-normal bg-white/80 backdrop-blur-sm border-teal-200/50 hover:border-teal-300 transition-all",
                              !field.value && "text-muted-foreground",
                              isExpired && "border-red-500 text-red-500 hover:border-red-600"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale: ar }) : "اختر التاريخ"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {isExpired && (
                      <p className="text-xs text-red-500 mt-1">⚠️ الرخصة منتهية الصلاحية</p>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );

  // === Step 2: Contact Information ===
  const renderContactStep = () => (
    <motion.div
      key="contact"
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Step Header */}
      <div className="text-center mb-6">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 mb-4 shadow-lg shadow-teal-500/20 border border-teal-200"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Phone className="h-8 w-8" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-800">معلومات الاتصال</h3>
        <p className="text-slate-500 text-sm">أدخل بيانات التواصل مع العميل</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-teal-600" />
                  رقم الهاتف *
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="أدخل رقم الهاتف"
                    className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                    dir="ltr"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-teal-600" />
                  البريد الإلكتروني
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="أدخل البريد الإلكتروني"
                    className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                    dir="ltr"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-4 w-4 text-teal-600" />
          <span className="text-slate-700 font-medium">معلومات العنوان</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-600 text-sm">العنوان</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    value={field.value || ''}
                    placeholder="أدخل العنوان" 
                    className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-600 text-sm">المدينة</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    value={field.value || ''}
                    placeholder="أدخل المدينة" 
                    className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-600 text-sm">البلد</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    value={field.value || ''}
                    placeholder="أدخل البلد" 
                    className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-600" />
                ملاحظات
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="أدخل أي ملاحظات إضافية..."
                  className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </motion.div>
  );

  // === Step 3: Review ===
  const renderReviewStep = () => (
    <motion.div
      key="review"
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Step Header */}
      <div className="text-center mb-6">
        <motion.div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 mb-4 shadow-lg shadow-teal-500/20 border border-teal-200"
          whileHover={{ scale: 1.05, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <CheckCircle className="h-8 w-8" />
        </motion.div>
        <h3 className="text-xl font-bold text-slate-800">مراجعة البيانات</h3>
        <p className="text-slate-500 text-sm">تأكد من صحة البيانات قبل الحفظ</p>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-teal-50 to-teal-100/80 rounded-2xl p-6 border border-teal-200 shadow-lg shadow-teal-500/10 backdrop-blur-sm">
        <div className="grid gap-4">
          {/* Customer Type */}
          <div className="flex items-center justify-between py-2 border-b border-teal-200">
            <span className="text-slate-600">نوع العميل</span>
            <Badge className="bg-teal-500">
              {watchedValues.customer_type === 'individual' ? 'فرد' : 'شركة'}
            </Badge>
          </div>

          {/* Name */}
          <div className="flex items-center justify-between py-2 border-b border-teal-200">
            <span className="text-slate-600">الاسم</span>
            <span className="font-medium text-slate-800">
              {customerType === 'individual' 
                ? `${watchedValues.first_name || ''} ${watchedValues.last_name || ''}`
                : watchedValues.company_name || '-'}
            </span>
          </div>

          {/* National ID */}
          {watchedValues.national_id && (
            <div className="flex items-center justify-between py-2 border-b border-teal-200">
              <span className="text-slate-600">الرقم الشخصي</span>
              <span className="font-medium text-slate-800 font-mono">{watchedValues.national_id}</span>
            </div>
          )}

          {/* Phone */}
          <div className="flex items-center justify-between py-2 border-b border-teal-200">
            <span className="text-slate-600">الهاتف</span>
            <span className="font-medium text-slate-800 font-mono" dir="ltr">{watchedValues.phone || '-'}</span>
          </div>

          {/* Email */}
          {watchedValues.email && (
            <div className="flex items-center justify-between py-2 border-b border-teal-200">
              <span className="text-slate-600">البريد الإلكتروني</span>
              <span className="font-medium text-slate-800" dir="ltr">{watchedValues.email}</span>
            </div>
          )}

          {/* Notes */}
          {watchedValues.notes && (
            <div className="py-2">
              <span className="text-slate-600 block mb-2">ملاحظات</span>
              <p className="text-slate-800 bg-white rounded-2xl p-3 text-sm">{watchedValues.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Message */}
      <Alert className="border-teal-200/50 bg-gradient-to-br from-teal-50 to-teal-100/50 shadow-md">
        <Sparkles className="h-4 w-4 text-teal-600" />
        <AlertDescription className="text-teal-900 font-medium">
          بعد الحفظ، سيتم إنشاء حساب مالي للعميل تلقائياً في دليل الحسابات.
        </AlertDescription>
      </Alert>
    </motion.div>
  );

  // === Render Current Step Content ===
  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'basic':
        return renderBasicStep();
      case 'contact':
        return renderContactStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  // === Main Render ===
  const formContent = (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar currentStep={currentStep} totalSteps={STEPS.length} />

      {/* Step Indicators */}
      <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={goToStep} />

      {/* Duplicate Check Wrapper */}
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
          enableRealTimeCheck={currentStep === 0 || currentStep === 1}
        >
          <AnimatePresence mode="wait" custom={direction}>
            {renderStepContent()}
          </AnimatePresence>
        </CustomerFormWithDuplicateCheck>
      ) : (
        <AnimatePresence mode="wait" custom={direction}>
          {renderStepContent()}
        </AnimatePresence>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-teal-200/50">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2 border-teal-200/50 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-4 w-4" />
          السابق
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">
            الخطوة {currentStep + 1} من {STEPS.length}
          </span>
        </div>

        {currentStep === STEPS.length - 1 ? (
          <Button
            type="submit"
            disabled={createCustomer.isPending || updateCustomer.isPending || (hasDuplicates && !forceCreate)}
            className="flex items-center gap-2 bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {(createCustomer.isPending || updateCustomer.isPending) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {mode === 'edit' ? 'حفظ التعديلات' : 'حفظ العميل'}
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={nextStep}
            disabled={hasDuplicates && !forceCreate}
            className="flex items-center gap-2 bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            التالي
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // === Return based on integration mode ===
  if (integrationMode === 'page') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {formContent}
          </form>
        </Form>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {formContent}
        </form>
      </Form>
    </div>
  );
};

// === Dialog Wrapper ===
export const EnhancedCustomerDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCustomer?: any;
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
  context?: 'standalone' | 'contract' | 'invoice' | 'maintenance';
  variant?: 'full' | 'quick';
}> = ({ open, onOpenChange, editingCustomer, onSuccess, onCancel, context, variant = 'full' }) => {
  const handleClose = () => {
    onOpenChange(false);
    if (onCancel) onCancel();
  };

  const handleSuccess = (customer: any) => {
    onOpenChange(false);
    if (onSuccess) onSuccess(customer);
  };

  // Quick variant
  if (variant === 'quick') {
    return (
      <QuickCustomerDialogContent
        open={open}
        onOpenChange={onOpenChange}
        onSuccess={handleSuccess}
        onCancel={handleClose}
      />
    );
  }

  // Full variant
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 shadow-lg shadow-teal-500/20 flex items-center justify-center">
              <User className="h-5 w-5 text-teal-600" />
            </div>
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

// === Quick Customer Dialog ===
const QuickCustomerDialogContent: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customer: any) => void;
  onCancel: () => void;
}> = ({ open, onOpenChange, onSuccess, onCancel }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [duplicateCheck, setDuplicateCheck] = React.useState<{
    checking: boolean;
    exists: boolean;
    existingCustomer?: { 
      id: string; 
      first_name: string | null;
      last_name: string | null;
      first_name_ar: string | null; 
      last_name_ar: string | null;
      phone: string | null;
      national_id: string | null;
    };
  }>({ checking: false, exists: false });

  const quickSchema = z.object({
    full_name: z.string().min(2, 'الاسم يجب أن يكون أكثر من حرفين'),
    phone: z.string().min(8, 'رقم الهاتف غير صحيح'),
    national_id: z.string().min(5, 'الرقم الشخصي غير صحيح'),
  });

  const form = useForm({
    resolver: zodResolver(quickSchema),
    defaultValues: { full_name: '', phone: '', national_id: '' },
  });

  const nationalId = form.watch('national_id');

  React.useEffect(() => {
    const checkDuplicate = async () => {
      if (!nationalId || nationalId.length < 5 || !user?.profile?.company_id) {
        setDuplicateCheck({ checking: false, exists: false });
        return;
      }

      setDuplicateCheck({ checking: true, exists: false });

      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, national_id')
        .eq('company_id', user.profile.company_id)
        .eq('national_id', nationalId)
        .maybeSingle();

      if (data) {
        setDuplicateCheck({ checking: false, exists: true, existingCustomer: data });
      } else {
        setDuplicateCheck({ checking: false, exists: false });
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [nationalId, user?.profile?.company_id]);

  const onSubmit = async (data: any) => {
    if (!user?.profile?.company_id) {
      toast.error('خطأ في جلب بيانات الشركة');
      return;
    }

    if (duplicateCheck.exists && duplicateCheck.existingCustomer) {
      const ec = duplicateCheck.existingCustomer;
      onSuccess({
        id: ec.id,
        first_name: ec.first_name,
        last_name: ec.last_name,
        first_name_ar: ec.first_name_ar,
        last_name_ar: ec.last_name_ar,
        phone: ec.phone,
        national_id: ec.national_id,
        full_name: `${ec.first_name_ar || ec.first_name || ''} ${ec.last_name_ar || ec.last_name || ''}`.trim(),
      });
      form.reset();
      return;
    }

    setIsSubmitting(true);
    try {
      const nameParts = data.full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          company_id: user.profile.company_id,
          first_name: firstName,
          last_name: lastName,
          first_name_ar: firstName,
          last_name_ar: lastName,
          phone: data.phone,
          national_id: data.national_id,
          license_number: data.national_id,
          customer_type: 'individual',
          is_active: true,
        })
        .select('id, first_name, last_name, first_name_ar, last_name_ar, phone, national_id')
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم إضافة العميل بنجاح');
      
      // Return full customer object for proper display in contract wizard
      onSuccess({
        id: newCustomer.id,
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        first_name_ar: newCustomer.first_name_ar,
        last_name_ar: newCustomer.last_name_ar,
        phone: newCustomer.phone,
        national_id: newCustomer.national_id,
        full_name: `${newCustomer.first_name_ar} ${newCustomer.last_name_ar}`.trim(),
      });
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'فشل في إضافة العميل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 shadow-lg shadow-teal-500/20 flex items-center justify-center">
              <User className="h-5 w-5 text-teal-600" />
            </div>
            إضافة عميل سريع
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-teal-600" />
              الاسم الكامل
            </label>
            <Input
              {...form.register('full_name')}
              placeholder="أدخل اسم العميل"
              className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
            />
            {form.formState.errors.full_name && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.full_name.message as string}</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
              <Phone className="h-4 w-4 text-teal-600" />
              رقم الهاتف
            </label>
            <Input
              {...form.register('phone')}
              placeholder="أدخل رقم الهاتف"
              className="bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all"
              dir="ltr"
            />
            {form.formState.errors.phone && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.phone.message as string}</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-teal-50/50 to-teal-100/30 rounded-xl p-4 border border-teal-200/50 shadow-sm hover:shadow-md transition-shadow">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-teal-600" />
              الرقم الشخصي
            </label>
            <div className="relative">
              <Input
                {...form.register('national_id')}
                placeholder="أدخل الرقم الشخصي"
                className={cn("bg-white/80 backdrop-blur-sm border-teal-200/50 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 hover:border-teal-300 transition-all", duplicateCheck.exists && "border-amber-500")}
                dir="ltr"
              />
              {duplicateCheck.checking && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-teal-600" />
              )}
            </div>
            {form.formState.errors.national_id && (
              <p className="text-xs text-red-500 mt-1">{form.formState.errors.national_id.message as string}</p>
            )}
          </div>

          {duplicateCheck.exists && duplicateCheck.existingCustomer && (
            <Alert className="border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-md">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                العميل موجود: {duplicateCheck.existingCustomer.first_name_ar || duplicateCheck.existingCustomer.first_name} {duplicateCheck.existingCustomer.last_name_ar || duplicateCheck.existingCustomer.last_name}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ec = duplicateCheck.existingCustomer!;
                    onSuccess({
                      id: ec.id,
                      first_name: ec.first_name,
                      last_name: ec.last_name,
                      first_name_ar: ec.first_name_ar,
                      last_name_ar: ec.last_name_ar,
                      phone: ec.phone,
                      national_id: ec.national_id,
                      full_name: `${ec.first_name_ar || ec.first_name || ''} ${ec.last_name_ar || ec.last_name || ''}`.trim(),
                    });
                    form.reset();
                  }}
                  className="mt-2 w-full border-amber-300 bg-white/80 backdrop-blur-sm hover:bg-amber-50 hover:border-amber-400 transition-all"
                >
                  <CheckCircle className="h-4 w-4 ml-1" />
                  استخدام العميل الموجود
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-l from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/20 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الحفظ...</>
              ) : (
                <><CheckCircle className="h-4 w-4 ml-2" />إضافة العميل</>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="border-teal-200/50 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all">
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Legacy alias
export { EnhancedCustomerDialog as QuickCustomerDialog };
