import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProperties } from "@/modules/properties/hooks";
import { useTenants } from "@/modules/tenants/hooks";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import { PropertyContract } from "@/modules/properties/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

// Form validation schema
const contractSchema = z.object({
  property_id: z.string().min(1, "يجب اختيار العقار"),
  tenant_id: z.string().min(1, "يجب اختيار المستأجر"),
  contract_number: z.string().optional(),
  contract_type: z.string().min(1, "يجب اختيار نوع العقد"),
  start_date: z.string().min(1, "تاريخ البداية مطلوب"),
  end_date: z.string().min(1, "تاريخ النهاية مطلوب"),
  rental_amount: z.number().min(0.01, "مبلغ الإيجار يجب أن يكون أكبر من صفر"),
  deposit_amount: z.number().min(0, "مبلغ الضمان لا يمكن أن يكون سالب").optional(),
  commission_amount: z.number().min(0, "العمولة لا يمكن أن تكون سالبة").optional(),
  payment_frequency: z.string().min(1, "يجب اختيار تكرار الدفع"),
  grace_period_days: z.number().min(0, "فترة السماح لا يمكن أن تكون سالبة").optional(),
  terms_and_conditions: z.string().optional(),
  status: z.string().min(1, "يجب اختيار الحالة"),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
  path: ["end_date"]
});

type ContractFormData = z.infer<typeof contractSchema>;

interface PropertyContractWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: PropertyContract | null;
  isEditing?: boolean;
}

export function PropertyContractWizard({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isEditing = false
}: PropertyContractWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const companyId = useCurrentCompanyId();
  
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  
  // Calculate default dates
  const today = new Date();
  const oneYearLater = new Date(today);
  oneYearLater.setFullYear(today.getFullYear() + 1);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: 'rental',
      payment_frequency: 'monthly',
      status: 'active',
      start_date: today.toISOString().split('T')[0],
      end_date: oneYearLater.toISOString().split('T')[0],
      rental_amount: 0,
      deposit_amount: 0,
      commission_amount: 0,
      grace_period_days: 30
    }
  });

  // Reset form when dialog opens/closes or initial data changes
  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        // Populate form with existing data with proper types
        setValue("property_id", initialData.property_id);
        setValue("tenant_id", initialData.tenant_id);
        setValue("contract_number", initialData.contract_number || '');
        setValue("contract_type", initialData.contract_type);
        setValue("start_date", initialData.start_date);
        setValue("end_date", initialData.end_date);
        setValue("rental_amount", Number(initialData.rental_amount) || 0);
        setValue("deposit_amount", Number(initialData.deposit_amount) || 0);
        setValue("commission_amount", Number(initialData.commission_amount) || 0);
        setValue("payment_frequency", initialData.payment_frequency);
        setValue("grace_period_days", Number(initialData.grace_period_days) || 30);
        setValue("terms_and_conditions", initialData.terms || '');
        setValue("status", initialData.status);
      } else {
        // Reset form for new contract with proper defaults
        reset({
          contract_type: 'rental',
          payment_frequency: 'monthly',
          status: 'active',
          start_date: today.toISOString().split('T')[0],
          end_date: oneYearLater.toISOString().split('T')[0],
          rental_amount: 0,
          deposit_amount: 0,
          commission_amount: 0,
          grace_period_days: 30
        });
      }
    }
  }, [open, isEditing, initialData, setValue, reset, today, oneYearLater]);

  const onFormSubmit = async (data: ContractFormData) => {
    if (!companyId) {
      toast.error("خطأ: لم يتم تحديد الشركة");
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare data with company_id and proper types
      const contractData = {
        ...data,
        company_id: companyId,
        rental_amount: Number(data.rental_amount),
        deposit_amount: data.deposit_amount ? Number(data.deposit_amount) : null,
        commission_amount: data.commission_amount ? Number(data.commission_amount) : null,
        grace_period_days: data.grace_period_days ? Number(data.grace_period_days) : null,
        terms: data.terms_and_conditions || null
      };

      await onSubmit(contractData);
      reset();
      onOpenChange(false);
      toast.success(isEditing ? "تم تحديث العقد بنجاح" : "تم إنشاء العقد بنجاح");
    } catch (error) {
      console.error("Error submitting contract:", error);
      toast.error(isEditing ? "فشل في تحديث العقد" : "فشل في إنشاء العقد");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = propertiesLoading || tenantsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "تعديل عقد الإيجار" : "إنشاء عقد إيجار جديد"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Property Selection */}
              <div className="space-y-2">
                <Label htmlFor="property_id">العقار *</Label>
                <Controller
                  name="property_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العقار" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties?.filter(p => p.property_status === 'available' || (isEditing && p.id === field.value))?.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.property_name || property.property_name_ar || 'عقار غير محدد'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.property_id && (
                  <p className="text-sm text-destructive">{errors.property_id.message}</p>
                )}
              </div>

              {/* Tenant Selection */}
              <div className="space-y-2">
                <Label htmlFor="tenant_id">المستأجر *</Label>
                <Controller
                  name="tenant_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المستأجر" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants?.filter(t => t.status === 'active' && t.is_active)?.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.full_name || tenant.full_name_ar || 'مستأجر غير محدد'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tenant_id && (
                  <p className="text-sm text-destructive">{errors.tenant_id.message}</p>
                )}
              </div>

              {/* Contract Number */}
              <div className="space-y-2">
                <Label htmlFor="contract_number">رقم العقد</Label>
                <Input
                  id="contract_number"
                  {...register("contract_number")}
                  placeholder="سيتم إنشاؤه تلقائياً إذا ترك فارغاً"
                />
              </div>

              {/* Contract Type */}
              <div className="space-y-2">
                <Label htmlFor="contract_type">نوع العقد *</Label>
                <Controller
                  name="contract_type"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع العقد" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rental">إيجار</SelectItem>
                        <SelectItem value="sale">بيع</SelectItem>
                        <SelectItem value="lease">تأجير طويل المدى</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.contract_type && (
                  <p className="text-sm text-destructive">{errors.contract_type.message}</p>
                )}
              </div>

              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start_date">تاريخ البداية *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register("start_date", { required: "تاريخ البداية مطلوب" })}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive">{errors.start_date.message as string}</p>
                )}
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end_date">تاريخ النهاية *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register("end_date", { required: "تاريخ النهاية مطلوب" })}
                />
                {errors.end_date && (
                  <p className="text-sm text-destructive">{errors.end_date.message as string}</p>
                )}
              </div>

              {/* Rental Amount */}
              <div className="space-y-2">
                <Label htmlFor="rental_amount">مبلغ الإيجار (د.ك) *</Label>
                <Controller
                  name="rental_amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="rental_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  )}
                />
                {errors.rental_amount && (
                  <p className="text-sm text-destructive">{errors.rental_amount.message}</p>
                )}
              </div>

              {/* Deposit Amount */}
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">مبلغ الضمان (د.ك)</Label>
                <Controller
                  name="deposit_amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="deposit_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  )}
                />
              </div>

              {/* Commission Amount */}
              <div className="space-y-2">
                <Label htmlFor="commission_amount">العمولة (د.ك)</Label>
                <Controller
                  name="commission_amount"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="commission_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  )}
                />
              </div>

              {/* Payment Frequency */}
              <div className="space-y-2">
                <Label htmlFor="payment_frequency">تكرار الدفع *</Label>
                <Controller
                  name="payment_frequency"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر تكرار الدفع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">شهري</SelectItem>
                        <SelectItem value="quarterly">ربع سنوي</SelectItem>
                        <SelectItem value="semi_annual">نصف سنوي</SelectItem>
                        <SelectItem value="annual">سنوي</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.payment_frequency && (
                  <p className="text-sm text-destructive">{errors.payment_frequency.message}</p>
                )}
              </div>

              {/* Grace Period */}
              <div className="space-y-2">
                <Label htmlFor="grace_period_days">فترة السماح (أيام)</Label>
                <Controller
                  name="grace_period_days"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="grace_period_days"
                      type="number"
                      min="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      placeholder="30"
                    />
                  )}
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">الحالة *</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">في الانتظار</SelectItem>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="expired">منتهي</SelectItem>
                        <SelectItem value="cancelled">ملغي</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.status && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-2">
              <Label htmlFor="terms_and_conditions">الشروط والأحكام</Label>
              <Textarea
                id="terms_and_conditions"
                {...register("terms_and_conditions")}
                placeholder="اكتب الشروط والأحكام الخاصة بالعقد..."
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="ml-2" />
                    {isEditing ? "جارٍ التحديث..." : "جارٍ الإنشاء..."}
                  </>
                ) : (
                  isEditing ? "تحديث العقد" : "إنشاء العقد"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}