import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCreateCustomerWithAccount } from "@/hooks/useCreateCustomerWithAccount";
import { useUpdateCustomer } from "@/hooks/useEnhancedCustomers";
import { Customer } from "@/types/customer";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Building, CreditCard, AlertCircle, Phone, MapPin, FileText, X, Shuffle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomerAccountSelector } from "@/components/finance/CustomerAccountSelector";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";

const formSchema = z.object({
  customer_type: z.enum(['individual', 'corporate']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  first_name_ar: z.string().min(1, "الاسم الأول بالعربي مطلوب"),
  last_name_ar: z.string().min(1, "الاسم الأخير بالعربي مطلوب"),
  company_name: z.string().optional(),
  company_name_ar: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1, "Phone number is required"),
  alternative_phone: z.string().optional(),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
  national_id_expiry: z.string().optional(),
  address: z.string().optional(),
  address_ar: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  date_of_birth: z.string().optional(),
  credit_limit: z.number().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
  // Financial integration fields
  accountIntegrationType: z.enum(['create_new', 'select_existing', 'none']).default('select_existing'),
  selectedAccountId: z.string().optional(),
  createFinancialAccount: z.boolean().default(false),
  initialBalance: z.number().optional(),
}).refine((data) => {
  if (data.customer_type === 'individual') {
    return data.first_name_ar && data.last_name_ar;
  } else {
    return data.company_name_ar || data.company_name;
  }
}, {
  message: "الحقول العربية مطلوبة",
  path: ["customer_type"],
});

type FormValues = z.infer<typeof formSchema>;

interface EnhancedCustomerFormProps {
  customer?: Customer | null;
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const EnhancedCustomerForm = ({ customer, onSuccess, onCancel, open = true, onOpenChange }: EnhancedCustomerFormProps) => {
  const [showFinancialSection, setShowFinancialSection] = useState(false);
  const [licenseExpiryWarning, setLicenseExpiryWarning] = useState<string | null>(null);
  const [nationalIdExpiryWarning, setNationalIdExpiryWarning] = useState<string | null>(null);
  const { companyId } = useUnifiedCompanyAccess();
  const createMutation = useCreateCustomerWithAccount();
  const updateMutation = useUpdateCustomer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_type: 'individual',
      accountIntegrationType: 'select_existing',
      createFinancialAccount: true,
      initialBalance: 0,
      country: 'Kuwait',
      credit_limit: 0,
    },
  });

  // Reset form data when customer prop changes
  useEffect(() => {
    if (customer) {
      console.log('Loading customer data for editing:', customer);
      form.reset({
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
        city: customer.city || '',
        country: customer.country || 'Kuwait',
        date_of_birth: customer.date_of_birth || '',
        credit_limit: customer.credit_limit || 0,
        emergency_contact_name: customer.emergency_contact_name || '',
        emergency_contact_phone: customer.emergency_contact_phone || '',
        notes: customer.notes || '',
        accountIntegrationType: 'none', // Don't show financial section for existing customers
        createFinancialAccount: false,
        initialBalance: 0,
      });
    } else {
      console.log('Resetting form for new customer');
      form.reset({
        customer_type: 'individual',
        accountIntegrationType: 'select_existing',
        createFinancialAccount: true,
        initialBalance: 0,
        country: 'Kuwait',
        credit_limit: 0,
      });
    }
  }, [customer, form]);

  const customerType = form.watch('customer_type');
  const accountIntegrationType = form.watch('accountIntegrationType');
  const createFinancialAccount = form.watch('createFinancialAccount');
  const licenseExpiry = form.watch('license_expiry');
  const nationalIdExpiry = form.watch('national_id_expiry');

  useEffect(() => {
    if (!customer && accountIntegrationType !== 'none') {
      setShowFinancialSection(true);
    } else {
      setShowFinancialSection(false);
    }
  }, [customer, accountIntegrationType]);

  // التحقق من تاريخ انتهاء الرخصة فوريًا
  useEffect(() => {
    if (licenseExpiry) {
      const expiryDate = new Date(licenseExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // إزالة الوقت للمقارنة بالتاريخ فقط
      
      if (expiryDate < today) {
        setLicenseExpiryWarning("رخصة القيادة منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل");
      } else {
        setLicenseExpiryWarning(null);
      }
    } else {
      setLicenseExpiryWarning(null);
    }
  }, [licenseExpiry]);

  // التحقق من تاريخ انتهاء البطاقة المدنية فوريًا
  useEffect(() => {
    if (nationalIdExpiry) {
      const expiryDate = new Date(nationalIdExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // إزالة الوقت للمقارنة بالتاريخ فقط
      
      if (expiryDate < today) {
        setNationalIdExpiryWarning("البطاقة المدنية منتهية الصلاحية. يجب تجديدها قبل تسجيل العميل");
      } else {
        setNationalIdExpiryWarning(null);
      }
    } else {
      setNationalIdExpiryWarning(null);
    }
  }, [nationalIdExpiry]);

  const onSubmit = (values: FormValues) => {
    console.log('🔄 Form submitted with values:', values);
    console.log('👤 Customer prop:', customer);
    
    if (customer) {
      // Update existing customer
      updateMutation.mutate(
        { 
          id: customer.id,
          data: {
            customer_type: values.customer_type,
            first_name: values.first_name,
            last_name: values.last_name,
            first_name_ar: values.first_name_ar,
            last_name_ar: values.last_name_ar,
            company_name: values.company_name,
            company_name_ar: values.company_name_ar,
            email: values.email,
            phone: values.phone,
            alternative_phone: values.alternative_phone,
            national_id: values.national_id,
            passport_number: values.passport_number,
            license_number: values.license_number,
            license_expiry: values.license_expiry,
            national_id_expiry: values.national_id_expiry,
            address: values.address,
            address_ar: values.address_ar,
            city: values.city,
            country: values.country,
            date_of_birth: values.date_of_birth,
            credit_limit: values.credit_limit,
            emergency_contact_name: values.emergency_contact_name,
            emergency_contact_phone: values.emergency_contact_phone,
            notes: values.notes,
          }
        },
        {
          onSuccess: (updatedCustomer) => {
            onSuccess?.(updatedCustomer);
          },
        }
      );
    } else {
      // Create new customer with financial integration
      const createData = {
        customer_type: values.customer_type,
        first_name: values.first_name,
        last_name: values.last_name,
        first_name_ar: values.first_name_ar,
        last_name_ar: values.last_name_ar,
        company_name: values.company_name,
        company_name_ar: values.company_name_ar,
        email: values.email,
        phone: values.phone,
        alternative_phone: values.alternative_phone,
        national_id: values.national_id,
        passport_number: values.passport_number,
        license_number: values.license_number,
        license_expiry: values.license_expiry,
        national_id_expiry: values.national_id_expiry,
        address: values.address,
        address_ar: values.address_ar,
        city: values.city,
        country: values.country,
        date_of_birth: values.date_of_birth,
        credit_limit: values.credit_limit,
        emergency_contact_name: values.emergency_contact_name,
        emergency_contact_phone: values.emergency_contact_phone,
        notes: values.notes,
        createFinancialAccount: values.accountIntegrationType === 'create_new',
        selectedAccountId: values.selectedAccountId,
        initialBalance: values.initialBalance,
      };
      
      createMutation.mutate(createData, {
        onSuccess: (result) => {
          onSuccess?.(result.customer);
        },
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && onCancel) {
      onCancel();
    }
    onOpenChange?.(newOpen);
  };

  const fillTestData = () => {
    form.setValue('customer_type', 'individual');
    form.setValue('first_name_ar', 'أحمد');
    form.setValue('last_name_ar', 'محمد');
    form.setValue('first_name', 'Ahmed');
    form.setValue('last_name', 'Mohammed');
    form.setValue('phone', '+965 12345678');
    form.setValue('email', 'ahmed@example.com');
    form.setValue('national_id', '123456789012');
    form.setValue('city', 'الكويت');
    form.setValue('country', 'الكويت');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold">
              {customer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
            </DialogTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <Tabs defaultValue="basic" className="flex-1">
              <div className="px-6 border-b">
                <TabsList className="grid w-full grid-cols-4" dir="rtl">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    البيانات الأساسية
                  </TabsTrigger>
                  <TabsTrigger value="contact" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    معلومات الاتصال
                  </TabsTrigger>
                  <TabsTrigger value="additional" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    بيانات إضافية
                  </TabsTrigger>
                  <TabsTrigger value="accounting" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    الحسابات المحاسبية
                  </TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 max-h-[65vh] overflow-y-auto">
                <div className="p-6 pb-8">
                  {/* البيانات الأساسية */}
                  <TabsContent value="basic" className="space-y-8 mt-0" dir="rtl">
                    <div className="space-y-8">
                      {/* نوع العميل */}
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-right">نوع العميل</h3>
                        <FormField
                          control={form.control}
                          name="customer_type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium text-right">نوع العميل *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                                <FormControl>
                                  <SelectTrigger className="text-right h-12">
                                    <SelectValue placeholder="اختر نوع العميل" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="individual">
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      فرد
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="corporate">
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4" />
                                      شركة
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* بيانات الاسم حسب نوع العميل */}
                      {customerType === 'individual' ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="first_name_ar"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">الاسم الأول *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="ادخل الاسم الأول بالعربي" 
                                      className="text-right h-12 text-base"
                                      dir="rtl"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="last_name_ar"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">الاسم الأخير *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="ادخل الاسم الأخير بالعربي" 
                                      className="text-right h-12 text-base"
                                      dir="rtl"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="first_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">الاسم الأول (إنجليزي)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="ادخل الاسم الأول بالإنجليزي (اختياري)" 
                                      className="text-right h-12 text-base"
                                      dir="ltr"
                                    />
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
                                  <FormLabel className="text-base font-medium text-right">الاسم الأخير (إنجليزي)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="ادخل الاسم الأخير بالإنجليزي (اختياري)" 
                                      className="text-right h-12 text-base"
                                      dir="ltr"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="company_name_ar"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">اسم الشركة *</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="ادخل اسم الشركة بالعربي" 
                                      className="text-right h-12 text-base"
                                      dir="rtl"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="company_name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">اسم الشركة (إنجليزي)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      placeholder="ادخل اسم الشركة بالإنجليزي (اختياري)" 
                                      className="text-right h-12 text-base"
                                      dir="ltr"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* معلومات الاتصال */}
                  <TabsContent value="contact" className="space-y-8 mt-0" dir="rtl">
                    <div className="space-y-8">
                      {/* معلومات الاتصال */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-right">معلومات الاتصال</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">رقم الهاتف *</FormLabel>
                                <FormControl>
                                   <Input 
                                     {...field} 
                                     type="tel" 
                                     placeholder="+965 XXXXXXXX" 
                                     className="text-left h-12 text-base"
                                     dir="ltr"
                                   />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="alternative_phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">رقم هاتف بديل</FormLabel>
                                <FormControl>
                                   <Input 
                                     {...field} 
                                     type="tel" 
                                     placeholder="+965 XXXXXXXX" 
                                     className="text-left h-12 text-base"
                                     dir="ltr"
                                   />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">البريد الإلكتروني</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email" 
                                    placeholder="example@email.com" 
                                    className="text-right h-12 text-base"
                                    dir="rtl"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* معلومات العنوان */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-right">العنوان</h3>
                        <div className="grid grid-cols-1 gap-6">
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">العنوان</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="ادخل العنوان" 
                                    className="min-h-[100px] text-right text-base"
                                    dir="rtl"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">البلد</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Kuwait" 
                                    className="text-right h-12 text-base"
                                    dir="rtl"
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
                                <FormLabel className="text-base font-medium text-right">المدينة</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Kuwait City" 
                                    className="text-right h-12 text-base"
                                    dir="rtl"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* بيانات إضافية */}
                  <TabsContent value="additional" className="space-y-8 mt-0" dir="rtl">
                    <div className="space-y-8">
                      {/* الوثائق الرسمية */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-right">الوثائق الرسمية</h3>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="passport_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">رقم الجواز</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="ادخل رقم الجواز" 
                                    className="text-right h-12 text-base"
                                    dir="rtl"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="national_id"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">الرقم المدني</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="ادخل الرقم المدني" 
                                    className="text-right h-12 text-base"
                                    dir="rtl"
                                    onChange={(e) => {
                                      field.onChange(e);
                                      // تعبئة رقم الرخصة تلقائياً بنفس الرقم المدني
                                      form.setValue('license_number', e.target.value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="license_expiry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">تاريخ انتهاء الرخصة</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="date" 
                                    className="text-right h-12 text-base"
                                    dir="rtl"
                                  />
                                 </FormControl>
                                 <FormMessage />
                                 {licenseExpiryWarning && (
                                   <Alert variant="destructive" className="mt-2">
                                     <AlertCircle className="h-4 w-4" />
                                     <AlertDescription>{licenseExpiryWarning}</AlertDescription>
                                   </Alert>
                                 )}
                               </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="license_number"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">رقم الرخصة</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="يتم تعبئته تلقائياً من الرقم المدني" 
                                    className="text-right h-12 text-base bg-muted"
                                    dir="rtl"
                                    readOnly
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                         <div className="grid grid-cols-2 gap-6">
                           <FormField
                             control={form.control}
                             name="national_id_expiry"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel className="text-base font-medium text-right">تاريخ انتهاء البطاقة المدنية</FormLabel>
                                 <FormControl>
                                   <Input 
                                     {...field} 
                                     type="date" 
                                     className="text-right h-12 text-base"
                                     dir="rtl"
                                   />
                                 </FormControl>
                                  <FormMessage />
                                  {nationalIdExpiryWarning && (
                                    <Alert variant="destructive" className="mt-2">
                                      <AlertCircle className="h-4 w-4" />
                                      <AlertDescription>{nationalIdExpiryWarning}</AlertDescription>
                                    </Alert>
                                  )}
                               </FormItem>
                             )}
                           />
                           <FormField
                             control={form.control}
                             name="date_of_birth"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel className="text-base font-medium text-right">تاريخ الميلاد</FormLabel>
                                 <FormControl>
                                   <Input 
                                     {...field} 
                                     type="date" 
                                     className="text-right h-12 text-base"
                                     dir="rtl"
                                   />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                         </div>
                      </div>

                      {/* المعلومات المالية */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-right">المعلومات المالية</h3>
                        <div className="grid grid-cols-1 gap-6">
                          <FormField
                            control={form.control}
                            name="credit_limit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">الحد الائتماني</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="number" 
                                    placeholder="0.000"
                                    className="text-right h-12 text-base"
                                    dir="rtl"
                                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                       </div>

                       {/* جهة الاتصال للطوارئ */}
                       <div className="space-y-6">
                         <h3 className="text-xl font-semibold text-right">جهة الاتصال للطوارئ</h3>
                         <div className="grid grid-cols-2 gap-6">
                           <FormField
                             control={form.control}
                             name="emergency_contact_name"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel className="text-base font-medium text-right">اسم جهة الاتصال</FormLabel>
                                 <FormControl>
                                   <Input 
                                     {...field} 
                                     placeholder="ادخل اسم جهة الاتصال" 
                                     className="text-right h-12 text-base"
                                     dir="rtl"
                                   />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                           <FormField
                             control={form.control}
                             name="emergency_contact_phone"
                             render={({ field }) => (
                               <FormItem>
                                 <FormLabel className="text-base font-medium text-right">رقم هاتف الطوارئ</FormLabel>
                                 <FormControl>
                                   <Input 
                                     {...field} 
                                     type="tel" 
                                     placeholder="+965 XXXXXXXX" 
                                     className="text-left h-12 text-base"
                                     dir="ltr"
                                   />
                                 </FormControl>
                                 <FormMessage />
                               </FormItem>
                             )}
                           />
                         </div>
                       </div>

                      {/* ملاحظات إضافية */}
                      <div className="space-y-6">
                        <h3 className="text-xl font-semibold text-right">ملاحظات إضافية</h3>
                        <div className="grid grid-cols-1 gap-6">
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">ملاحظات</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="ادخل أي ملاحظات إضافية" 
                                    className="min-h-[120px] text-right text-base"
                                    dir="rtl"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* الحسابات المحاسبية */}
                  <TabsContent value="accounting" className="space-y-8 mt-0" dir="rtl">
                    {!customer && (
                      <div className="space-y-8">
                        {/* الربط المحاسبي */}
                        <div className="space-y-6">
                          <h3 className="text-xl font-semibold text-right">الربط المحاسبي</h3>
                          
                          <FormField
                            control={form.control}
                            name="accountIntegrationType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium text-right">خيارات الربط المحاسبي</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value} dir="rtl">
                                  <FormControl>
                                    <SelectTrigger className="text-right h-12">
                                      <SelectValue placeholder="اختر طريقة الربط المحاسبي" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="select_existing">🔗 اختيار حساب موجود (الافتراضي)</SelectItem>
                                    <SelectItem value="create_new">➕ إنشاء حساب جديد</SelectItem>
                                    <SelectItem value="none">❌ بدون ربط محاسبي</SelectItem>
                                  </SelectContent>
                                </Select>
                                <div className="text-sm text-muted-foreground space-y-1 text-right">
                                  {accountIntegrationType === 'create_new' && (
                                    <div className="text-amber-600">سيتم إنشاء حساب محاسبي جديد خاص بالعميل</div>
                                  )}
                                  {accountIntegrationType === 'none' && (
                                    <div className="text-red-600">لن يتم ربط العميل بأي حساب محاسبي</div>
                                  )}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* اختيار حساب موجود */}
                        {accountIntegrationType === 'select_existing' && (
                          <div className="space-y-6">

                            <FormField
                              control={form.control}
                              name="selectedAccountId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">الحساب المحاسبي</FormLabel>
                                  <FormControl>
                                    <CustomerAccountSelector
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      placeholder="اختر الحساب المحاسبي"
                                      accountType="receivable"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* إنشاء حساب جديد */}
                        {accountIntegrationType === 'create_new' && (
                          <div className="space-y-6">
                            <h3 className="text-xl font-semibold text-right">إنشاء حساب محاسبي جديد</h3>
                            
                            <Alert className="text-right" dir="rtl">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                سيتم إنشاء حساب محاسبي تحت مجموعة "ذمم العملاء" مع إمكانية تسجيل رصيد افتتاحي
                              </AlertDescription>
                            </Alert>

                            <FormField
                              control={form.control}
                              name="initialBalance"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium text-right">الرصيد الافتتاحي (اختياري)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.001"
                                      placeholder="0.000"
                                      className="text-right h-12 text-base"
                                      dir="rtl"
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <div className="text-xs text-muted-foreground text-right">
                                    الرصيد الموجب يعني مديونية للعميل، والرصيد السالب يعني دين على العميل
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>

              {/* Form Actions */}
              <div className="flex gap-4 justify-between items-center px-6 py-4 border-t bg-background">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={fillTestData}
                  className="flex items-center gap-2"
                >
                  <Shuffle className="h-4 w-4" />
                  تعبئة بيانات تجريبية
                </Button>
                
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    إلغاء
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => console.log('💾 Submit button clicked, isLoading:', isLoading)}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {customer ? "تحديث العميل" : "إضافة العميل"}
                  </Button>
                </div>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};