import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { Tenant, CreateTenantRequest, TenantType, TenantStatus } from "@/types/tenant";

const tenantSchema = z.object({
  full_name: z.string().min(1, "الاسم الكامل مطلوب"),
  full_name_ar: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  civil_id: z.string().optional(),
  passport_number: z.string().optional(),
  nationality: z.string().default("Kuwaiti"),
  date_of_birth: z.string().optional(),
  occupation: z.string().optional(),
  employer_name: z.string().optional(),
  monthly_income: z.number().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  current_address: z.string().optional(),
  current_address_ar: z.string().optional(),
  tenant_type: z.enum(["individual", "company"]).default("individual"),
  status: z.enum(["active", "inactive", "suspended", "pending"]).optional(),
  notes: z.string().optional(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormProps {
  tenant?: Tenant;
  onSubmit: (data: CreateTenantRequest | { status?: TenantStatus; [key: string]: any }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<CreateTenantRequest>;
}

export function TenantForm({ tenant, onSubmit, onCancel, isLoading, initialData }: TenantFormProps) {
  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      full_name: initialData?.full_name || tenant?.full_name || "",
      full_name_ar: initialData?.full_name_ar || tenant?.full_name_ar || "",
      phone: initialData?.phone || tenant?.phone || "",
      email: initialData?.email || tenant?.email || "",
      civil_id: initialData?.civil_id || tenant?.civil_id || "",
      passport_number: initialData?.passport_number || tenant?.passport_number || "",
      nationality: initialData?.nationality || tenant?.nationality || "Kuwaiti",
      date_of_birth: initialData?.date_of_birth || tenant?.date_of_birth || "",
      occupation: initialData?.occupation || tenant?.occupation || "",
      employer_name: initialData?.employer_name || tenant?.employer_name || "",
      monthly_income: initialData?.monthly_income || tenant?.monthly_income || undefined,
      emergency_contact_name: initialData?.emergency_contact_name || tenant?.emergency_contact_name || "",
      emergency_contact_phone: initialData?.emergency_contact_phone || tenant?.emergency_contact_phone || "",
      current_address: initialData?.current_address || tenant?.current_address || "",
      current_address_ar: initialData?.current_address_ar || tenant?.current_address_ar || "",
      tenant_type: (initialData?.tenant_type as TenantType) || (tenant?.tenant_type as TenantType) || "individual",
      status: tenant?.status as TenantStatus,
      notes: initialData?.notes || tenant?.notes || "",
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        full_name: initialData.full_name || "",
        full_name_ar: initialData.full_name_ar || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        civil_id: initialData.civil_id || "",
        passport_number: initialData.passport_number || "",
        nationality: initialData.nationality || "Kuwaiti",
        date_of_birth: initialData.date_of_birth || "",
        occupation: initialData.occupation || "",
        employer_name: initialData.employer_name || "",
        monthly_income: initialData.monthly_income || undefined,
        emergency_contact_name: initialData.emergency_contact_name || "",
        emergency_contact_phone: initialData.emergency_contact_phone || "",
        current_address: initialData.current_address || "",
        current_address_ar: initialData.current_address_ar || "",
        tenant_type: (initialData.tenant_type as TenantType) || "individual",
        status: tenant?.status as TenantStatus,
        notes: initialData.notes || "",
      });
    }
  }, [initialData, form, tenant?.status]);

  const handleSubmit = (data: TenantFormData) => {
    const submitData = {
      ...data,
      monthly_income: data.monthly_income || undefined,
    };
    onSubmit(submitData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="full_name_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم بالعربي</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenant_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المستأجر</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المستأجر" />
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

              {tenant && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحالة</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر الحالة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">نشط</SelectItem>
                          <SelectItem value="inactive">غير نشط</SelectItem>
                          <SelectItem value="suspended">معلق</SelectItem>
                          <SelectItem value="pending">قيد المراجعة</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات الاتصال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input {...field} />
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

              <FormField
                control={form.control}
                name="current_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان الحالي</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_address_ar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>العنوان بالعربي</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>المعلومات الشخصية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="civil_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم المدني</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجنسية</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <CardTitle>معلومات العمل</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المهنة</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>جهة العمل</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthly_income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الراتب الشهري</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>جهة الاتصال للطوارئ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emergency_contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الشخص المرجعي</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>رقم هاتف الشخص المرجعي</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>ملاحظات</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "جاري الحفظ..." : tenant ? "تحديث" : "إضافة"}
          </Button>
        </div>
      </form>
    </Form>
  );
}