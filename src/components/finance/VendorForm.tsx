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

  return (
    <Form {...form}>
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