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
import { useCreateCustomerWithAccount } from "@/hooks/useCreateCustomerWithAccount";
import { useUpdateCustomer } from "@/hooks/useEnhancedCustomers";
import { Customer } from "@/types/customer";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Building, CreditCard, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomerAccountFormSelector } from "./CustomerAccountSelector";

const formSchema = z.object({
  customer_type: z.enum(['individual', 'corporate']),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  company_name: z.string().optional(),
  company_name_ar: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1, "Phone number is required"),
  alternative_phone: z.string().optional(),
  national_id: z.string().optional(),
  passport_number: z.string().optional(),
  license_number: z.string().optional(),
  license_expiry: z.string().optional(),
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
  accountIntegrationType: z.enum(['create_new', 'select_existing', 'none']).default('create_new'),
  selectedAccountId: z.string().optional(),
  createFinancialAccount: z.boolean().default(false),
  initialBalance: z.number().optional(),
}).refine((data) => {
  if (data.customer_type === 'individual') {
    return data.first_name && data.last_name;
  } else {
    return data.company_name;
  }
}, {
  message: "Required fields are missing",
  path: ["customer_type"],
});

type FormValues = z.infer<typeof formSchema>;

interface EnhancedCustomerFormProps {
  customer?: Customer | null;
  onSuccess?: (customer: any) => void;
  onCancel?: () => void;
}

export const EnhancedCustomerForm = ({ customer, onSuccess, onCancel }: EnhancedCustomerFormProps) => {
  const [showFinancialSection, setShowFinancialSection] = useState(false);
  const createMutation = useCreateCustomerWithAccount();
  const updateMutation = useUpdateCustomer();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_type: 'individual',
      accountIntegrationType: 'create_new',
      createFinancialAccount: true,
      initialBalance: 0,
      country: 'Kuwait',
      credit_limit: 0,
      ...customer,
    },
  });

  const customerType = form.watch('customer_type');
  const accountIntegrationType = form.watch('accountIntegrationType');
  const createFinancialAccount = form.watch('createFinancialAccount');

  useEffect(() => {
    if (!customer && accountIntegrationType !== 'none') {
      setShowFinancialSection(true);
    } else {
      setShowFinancialSection(false);
    }
  }, [customer, accountIntegrationType]);

  const onSubmit = (values: FormValues) => {
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {customerType === 'individual' ? <Users className="h-5 w-5" /> : <Building className="h-5 w-5" />}
              نوع العميل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="customer_type"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع العميل" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="individual">شخص طبيعي</SelectItem>
                      <SelectItem value="corporate">شخص اعتباري</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customerType === 'individual' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأول *</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="first_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الاسم الأول بالعربي</FormLabel>
                      <FormControl>
                        <Input {...field} />
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
                      <FormLabel>اسم العائلة بالعربي</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الشركة *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_name_ar"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم الشركة بالعربي</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف *</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
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
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Integration Section */}
        {!customer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                الربط المحاسبي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="accountIntegrationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">خيارات الربط المحاسبي</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر طريقة الربط المحاسبي" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="create_new">إنشاء حساب جديد</SelectItem>
                        <SelectItem value="select_existing">اختيار حساب موجود</SelectItem>
                        <SelectItem value="none">بدون ربط محاسبي</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-sm text-muted-foreground">
                      {accountIntegrationType === 'create_new' && "سيتم إنشاء حساب محاسبي جديد خاص بالعميل"}
                      {accountIntegrationType === 'select_existing' && "اختر حساب محاسبي موجود من القائمة"}
                      {accountIntegrationType === 'none' && "لن يتم ربط العميل بأي حساب محاسبي"}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {accountIntegrationType === 'select_existing' && (
                <>
                  <Separator />
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      اختر حساب محاسبي موجود من قائمة الحسابات المتاحة. يمكنك البحث بكود الحساب أو اسم الحساب.
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="selectedAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحساب المحاسبي</FormLabel>
                        <FormControl>
                          <CustomerAccountFormSelector
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="اختر الحساب المحاسبي"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {accountIntegrationType === 'create_new' && (
                <>
                  <Separator />
                  <Alert>
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
                        <FormLabel>الرصيد الافتتاحي (اختياري)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.001"
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.000"
                          />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          الرصيد الموجب يعني مديونية للعميل، والرصيد السالب يعني دين على العميل
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Additional Information Cards */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات إضافية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        step="0.001"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                    <FormLabel>رقم هاتف بديل</FormLabel>
                    <FormControl>
                      <Input {...field} type="tel" />
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
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {customer ? "تحديث العميل" : "إنشاء العميل"}
          </Button>
        </div>

        {/* Success Status Display */}
        {createMutation.isSuccess && createMutation.data && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">تم إنشاء العميل</Badge>
                  {createMutation.data.financialAccount && (
                    <Badge variant="outline">تم إنشاء الحساب المحاسبي</Badge>
                  )}
                  {createMutation.data.journalEntry && (
                    <Badge variant="outline">تم تسجيل الرصيد الافتتاحي</Badge>
                  )}
                </div>
                {createMutation.data.financialAccount && (
                  <div className="text-sm text-muted-foreground">
                    الحساب المحاسبي: {createMutation.data.financialAccount.account_code} - {createMutation.data.financialAccount.account_name}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
};