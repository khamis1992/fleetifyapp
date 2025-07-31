import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { useCreateVendor, useUpdateVendor, type Vendor } from "@/hooks/useFinance"
import { TestTube, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"

const vendorSchema = z.object({
  vendor_code: z.string().min(1, "كود المورد مطلوب"),
  vendor_name: z.string().min(1, "اسم المورد مطلوب"),
  vendor_name_ar: z.string().optional(),
  contact_person: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  address_ar: z.string().optional(),
  tax_number: z.string().optional(),
  payment_terms: z.number().min(0, "مدة الدفع يجب أن تكون رقم موجب").optional(),
  credit_limit: z.number().min(0, "حد الائتمان يجب أن يكون رقم موجب").optional(),
  notes: z.string().optional()
})

type VendorFormValues = z.infer<typeof vendorSchema>

interface VendorFormProps {
  vendor?: Vendor
  onSuccess?: () => void
}

export const VendorForm = ({ vendor, onSuccess }: VendorFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const createVendor = useCreateVendor()
  const updateVendor = useUpdateVendor()

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendor_code: vendor?.vendor_code || "",
      vendor_name: vendor?.vendor_name || "",
      vendor_name_ar: vendor?.vendor_name_ar || "",
      contact_person: vendor?.contact_person || "",
      email: vendor?.email || "",
      phone: vendor?.phone || "",
      address: vendor?.address || "",
      address_ar: vendor?.address_ar || "",
      tax_number: vendor?.tax_number || "",
      payment_terms: vendor?.payment_terms || 30,
      credit_limit: vendor?.credit_limit || 0,
      notes: vendor?.notes || ""
    }
  })

  const onSubmit = async (data: VendorFormValues) => {
    try {
      setIsSubmitting(true)
      
      if (vendor) {
        await updateVendor.mutateAsync({ 
          id: vendor.id,
          ...data
        })
      } else {
        await createVendor.mutateAsync(data as Required<Pick<VendorFormValues, 'vendor_code' | 'vendor_name'>> & VendorFormValues)
      }
      
      onSuccess?.()
    } catch (error) {
      console.error("Error submitting vendor form:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fillSampleData = () => {
    const sampleVendors = [
      {
        vendor_code: 'VEN001',
        vendor_name: 'Al-Salam Trading Company',
        vendor_name_ar: 'شركة السلام التجارية',
        contact_person: 'أحمد محمد الأحمد',
        email: 'info@alsalam-trading.com',
        phone: '+965 2245-8899',
        address: 'Block 1, Sharq Area, Kuwait City',
        address_ar: 'قطعة 1، منطقة شرق، مدينة الكويت',
        tax_number: 'TAX-KW-001234',
        payment_terms: 30,
        credit_limit: 5000,
        notes: 'مورد موثوق للمعدات المكتبية'
      },
      {
        vendor_code: 'VEN002',
        vendor_name: 'Kuwait Office Supplies',
        vendor_name_ar: 'أدوات المكاتب الكويتية',
        contact_person: 'فاطمة عبدالله',
        email: 'sales@kw-office.com',
        phone: '+965 2234-5677',
        address: 'Hawally, Building 15, Floor 2',
        address_ar: 'حولي، مبنى 15، الطابق الثاني',
        tax_number: 'TAX-KW-005678',
        payment_terms: 15,
        credit_limit: 3000,
        notes: 'متخصص في القرطاسية والأجهزة المكتبية'
      },
      {
        vendor_code: 'VEN003',
        vendor_name: 'Gulf Technology Solutions',
        vendor_name_ar: 'حلول التكنولوجيا الخليجية',
        contact_person: 'خالد الراشد',
        email: 'contact@gulf-tech.com',
        phone: '+965 2298-7654',
        address: 'Salmiya, Saeed Complex, Office 301',
        address_ar: 'السالمية، مجمع سعيد، مكتب 301',
        tax_number: 'TAX-KW-009876',
        payment_terms: 45,
        credit_limit: 10000,
        notes: 'مورد للأجهزة التقنية والحاسوبية'
      }
    ]
    
    const randomVendor = sampleVendors[Math.floor(Math.random() * sampleVendors.length)]
    
    // Reset the form with sample data
    form.reset(randomVendor)
  }

  // Show authentication warning if user is not logged in or lacks proper role
  if (!user) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          يجب تسجيل الدخول لإضافة موردين جدد. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      {!vendor && (
        <div className="mb-4">
          <Button 
            type="button"
            variant="outline" 
            size="sm" 
            onClick={fillSampleData}
            className="text-xs"
          >
            <TestTube className="h-3 w-3 mr-1" />
            ملء بيانات تجريبية
          </Button>
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vendor_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>كود المورد *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="مثال: VEN001" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vendor_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم المورد (بالإنجليزية) *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Vendor Name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vendor_name_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم المورد (بالعربية)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="اسم المورد" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_person"
            render={({ field }) => (
              <FormItem>
                <FormLabel>جهة الاتصال</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="اسم الشخص المسؤول" />
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
                  <Input {...field} type="email" placeholder="example@company.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الهاتف</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+965 XXXX XXXX" dir="ltr" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tax_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الرقم الضريبي</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="رقم التسجيل الضريبي" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مدة الدفع (بالأيام)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="30"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="credit_limit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>حد الائتمان (د.ك)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.001"
                    placeholder="0.000"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>العنوان (بالإنجليزية)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address_ar"
          render={({ field }) => (
            <FormItem>
              <FormLabel>العنوان (بالعربية)</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="العنوان" />
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
                <Textarea {...field} placeholder="ملاحظات إضافية..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-24"
          >
            {isSubmitting ? (
              <LoadingSpinner size="sm" />
            ) : vendor ? (
              "تحديث"
            ) : (
              "إضافة"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}