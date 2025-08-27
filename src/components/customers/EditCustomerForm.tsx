import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { Users, Building, Phone, MapPin, FileText, User, Shuffle } from "lucide-react";
import { useSimpleUpdateCustomer } from "@/hooks/useSimpleUpdateCustomer";
import { Customer, CustomerFormData } from "@/types/customer";
import { toast } from "sonner";

const formSchema = z.object({
  customer_type: z.enum(['individual', 'corporate']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  first_name_ar: z.string().min(1, "الاسم الأول بالعربي مطلوب"),
  last_name_ar: z.string().min(1, "الاسم الأخير بالعربي مطلوب"),
  company_name: z.string().optional(),
  company_name_ar: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1, "رقم الهاتف مطلوب"),
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
}).refine((data) => {
  if (data.customer_type === 'individual') {
    return data.first_name_ar && data.last_name_ar;
  } else {
    return data.company_name_ar || data.company_name;
  }
}, {
  message: "الحقول المطلوبة لم تكتمل",
  path: ["customer_type"],
});

type FormValues = z.infer<typeof formSchema>;

interface EditCustomerFormProps {
  customer: Customer;
  onSuccess?: (customer: Customer) => void;
  onCancel?: () => void;
}

export const EditCustomerForm = ({ customer, onSuccess, onCancel }: EditCustomerFormProps) => {
  const updateMutation = useSimpleUpdateCustomer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  // تحميل بيانات العميل عند تمرير العميل
  useEffect(() => {
    if (customer) {
      console.log('📝 Loading customer data:', customer);
      
      // تنسيق البيانات مع التعامل مع القيم الفارغة
      const formData: FormValues = {
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
        credit_limit: customer.credit_limit ?? 0,
        emergency_contact_name: customer.emergency_contact_name || '',
        emergency_contact_phone: customer.emergency_contact_phone || '',
        notes: customer.notes || '',
      };
      
      console.log('📝 Formatted form data:', formData);
      
      // إعادة تعيين النموذج بالبيانات المنسقة
      form.reset(formData);
      
      // التحقق من أن البيانات تم تحميلها بشكل صحيح
      setTimeout(() => {
        const currentValues = form.getValues();
        console.log('✅ Current form values after reset:', currentValues);
      }, 100);
    }
  }, [customer, form]);

  const customerType = form.watch('customer_type');

  const onSubmit = (values: FormValues) => {
    console.log('🚀 Submitting form with values:', values);
    
    updateMutation.mutate({
      customerId: customer.id,
      data: values as CustomerFormData
    }, {
      onSuccess: (updatedCustomer) => {
        toast.success('تم تحديث بيانات العميل بنجاح');
        onSuccess?.(updatedCustomer);
      },
      onError: (error) => {
        console.error('❌ Update failed:', error);
      }
    });
  };

  const fillDummyData = () => {
    form.setValue('customer_type', 'individual');
    form.setValue('first_name_ar', 'محمد');
    form.setValue('last_name_ar', 'أحمد');
    form.setValue('first_name', 'Mohammed');
    form.setValue('last_name', 'Ahmed');
    form.setValue('phone', '+965 99887766');
    form.setValue('email', 'mohammed@example.com');
    form.setValue('national_id', '987654321098');
    form.setValue('city', 'الكويت');
    form.setValue('country', 'الكويت');
  };

  const isSubmitting = updateMutation.isPending;

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8 text-primary" />
            تعديل بيانات العميل
          </h1>
          <p className="text-muted-foreground mt-2">
            تحديث معلومات العميل الأساسية
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {customer.customer_type === 'individual' ? (
            <><Users className="h-4 w-4 mr-2" />فرد</>
          ) : (
            <><Building className="h-4 w-4 mr-2" />شركة</>
          )}
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* البيانات الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                البيانات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* نوع العميل */}
              <FormField
                control={form.control}
                name="customer_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع العميل *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} dir="rtl">
                      <FormControl>
                        <SelectTrigger>
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

              {/* بيانات الاسم حسب نوع العميل */}
              {customerType === 'individual' ? (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="first_name_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الأول *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="الاسم الأول بالعربي" dir="rtl" />
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
                        <FormLabel>الاسم الأخير *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="الاسم الأخير بالعربي" dir="rtl" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الاسم الأول (انجليزي)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First Name" dir="ltr" />
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
                        <FormLabel>الاسم الأخير (انجليزي)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last Name" dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company_name_ar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الشركة *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="اسم الشركة بالعربي" dir="rtl" />
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
                        <FormLabel>اسم الشركة (انجليزي)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Company Name" dir="ltr" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* معلومات الاتصال */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                معلومات الاتصال
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الهاتف *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="+965 XXXXXXXX"
                          dir="ltr"
                          className="text-left"
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
                      <FormLabel>هاتف بديل</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="+965 XXXXXXXX"
                          dir="ltr"
                          className="text-left"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="example@email.com" dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* الوثائق والهوية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                الوثائق والهوية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="national_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم البطاقة المدنية</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123456789012" dir="ltr" />
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
                      <FormLabel>انتهاء البطاقة المدنية</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="passport_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الجواز</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A1234567" dir="ltr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم رخصة القيادة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="DL123456" dir="ltr" />
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
                      <FormLabel>انتهاء رخصة القيادة</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
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
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* العنوان */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                العنوان
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان (عربي)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="العنوان التفصيلي بالعربي" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العنوان (انجليزي)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Detailed Address" dir="ltr" />
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
                      <FormLabel>المدينة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="الكويت" dir="rtl" />
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
                      <FormLabel>الدولة</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="الكويت" dir="rtl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* معلومات إضافية */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات إضافية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="credit_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحد الائتماني</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          placeholder="0"
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FormLabel>هاتف الطوارئ</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="+965 XXXXXXXX"
                          dir="ltr"
                          className="text-left"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="emergency_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم جهة الاتصال في الطوارئ</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="اسم جهة الاتصال" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="ملاحظات إضافية عن العميل" dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* أزرار التحكم */}
          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={fillDummyData}
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <Shuffle className="h-4 w-4" />
              تعبئة بيانات تجريبية
            </Button>
            
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting && <LoadingSpinner size="sm" className="ml-2" />}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};