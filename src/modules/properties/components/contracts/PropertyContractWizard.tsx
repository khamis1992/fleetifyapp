import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { useProperties } from "@/modules/properties/hooks";
import { useTenants } from "@/modules/tenants/hooks";
import { PropertyContract } from "@/modules/properties/types";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  
  const { data: properties, isLoading: propertiesLoading } = useProperties();
  const { data: tenants, isLoading: tenantsLoading } = useTenants();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm();

  // Reset form when dialog opens/closes or initial data changes
  useEffect(() => {
    if (open) {
      if (isEditing && initialData) {
        // Populate form with existing data
        setValue("property_id", initialData.property_id);
        setValue("tenant_id", initialData.tenant_id);
        setValue("contract_number", initialData.contract_number);
        setValue("contract_type", initialData.contract_type);
        setValue("start_date", initialData.start_date);
        setValue("end_date", initialData.end_date);
        setValue("rental_amount", initialData.rental_amount);
        setValue("deposit_amount", initialData.deposit_amount || '');
        setValue("commission_amount", initialData.commission_amount || '');
        setValue("payment_frequency", initialData.payment_frequency);
        setValue("grace_period_days", initialData.grace_period_days || '');
        setValue("terms_and_conditions", initialData.terms || '');
        setValue("status", initialData.status);
      } else {
        // Reset form for new contract
        reset({
          contract_type: 'rental',
          payment_frequency: 'monthly',
          status: 'pending',
          start_date: new Date().toISOString().split('T')[0],
        });
      }
    }
  }, [open, isEditing, initialData, setValue, reset]);

  const onFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        rental_amount: parseFloat(data.rental_amount),
        deposit_amount: data.deposit_amount ? parseFloat(data.deposit_amount) : null,
        commission_amount: data.commission_amount ? parseFloat(data.commission_amount) : null,
        grace_period_days: data.grace_period_days ? parseInt(data.grace_period_days) : null,
      });
      reset();
    } catch (error) {
      console.error("Error submitting contract:", error);
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
                <Select onValueChange={(value) => setValue("property_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العقار" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties?.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.property_id && (
                  <p className="text-sm text-destructive">العقار مطلوب</p>
                )}
              </div>

              {/* Tenant Selection */}
              <div className="space-y-2">
                <Label htmlFor="tenant_id">المستأجر *</Label>
                <Select onValueChange={(value) => setValue("tenant_id", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستأجر" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants?.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.full_name || tenant.full_name_ar || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tenant_id && (
                  <p className="text-sm text-destructive">المستأجر مطلوب</p>
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
                <Select onValueChange={(value) => setValue("contract_type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع العقد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rental">إيجار</SelectItem>
                    <SelectItem value="sale">بيع</SelectItem>
                    <SelectItem value="lease">تأجير طويل المدى</SelectItem>
                  </SelectContent>
                </Select>
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
                <Input
                  id="rental_amount"
                  type="number"
                  step="0.001"
                  {...register("rental_amount", { required: "مبلغ الإيجار مطلوب" })}
                  placeholder="0.000"
                />
                {errors.rental_amount && (
                  <p className="text-sm text-destructive">{errors.rental_amount.message as string}</p>
                )}
              </div>

              {/* Deposit Amount */}
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">مبلغ الضمان (د.ك)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  step="0.001"
                  {...register("deposit_amount")}
                  placeholder="0.000"
                />
              </div>

              {/* Commission Amount */}
              <div className="space-y-2">
                <Label htmlFor="commission_amount">العمولة (د.ك)</Label>
                <Input
                  id="commission_amount"
                  type="number"
                  step="0.001"
                  {...register("commission_amount")}
                  placeholder="0.000"
                />
              </div>

              {/* Payment Frequency */}
              <div className="space-y-2">
                <Label htmlFor="payment_frequency">تكرار الدفع *</Label>
                <Select onValueChange={(value) => setValue("payment_frequency", value)}>
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
              </div>

              {/* Grace Period */}
              <div className="space-y-2">
                <Label htmlFor="grace_period_days">فترة السماح (أيام)</Label>
                <Input
                  id="grace_period_days"
                  type="number"
                  {...register("grace_period_days")}
                  placeholder="30"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">الحالة *</Label>
                <Select onValueChange={(value) => setValue("status", value)}>
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