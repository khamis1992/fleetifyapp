import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Phone, CreditCard, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Validation schema
const quickCustomerSchema = z.object({
  full_name: z.string().min(2, 'الاسم يجب أن يكون أكثر من حرفين'),
  phone: z.string().min(8, 'رقم الهاتف غير صحيح'),
  national_id: z.string().min(5, 'الرقم الشخصي غير صحيح'),
});

type QuickCustomerFormData = z.infer<typeof quickCustomerSchema>;

interface QuickCustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customer: { id: string; full_name: string }) => void;
}

export const QuickCustomerForm: React.FC<QuickCustomerFormProps> = ({
  open,
  onOpenChange,
  onCustomerCreated,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [duplicateCheck, setDuplicateCheck] = useState<{
    checking: boolean;
    exists: boolean;
    existingCustomer?: { id: string; full_name: string };
  }>({ checking: false, exists: false });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<QuickCustomerFormData>({
    resolver: zodResolver(quickCustomerSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      national_id: '',
    },
  });

  const nationalId = watch('national_id');

  // Check for duplicate national_id
  React.useEffect(() => {
    const checkDuplicate = async () => {
      if (!nationalId || nationalId.length < 5 || !user?.profile?.company_id) {
        setDuplicateCheck({ checking: false, exists: false });
        return;
      }

      setDuplicateCheck({ checking: true, exists: false });

      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name')
        .eq('company_id', user.profile.company_id)
        .eq('national_id', nationalId)
        .maybeSingle();

      if (error) {
        console.error('Error checking duplicate:', error);
        setDuplicateCheck({ checking: false, exists: false });
        return;
      }

      if (data) {
        setDuplicateCheck({
          checking: false,
          exists: true,
          existingCustomer: { id: data.id, full_name: data.full_name },
        });
      } else {
        setDuplicateCheck({ checking: false, exists: false });
      }
    };

    const timer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(timer);
  }, [nationalId, user?.profile?.company_id]);

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: QuickCustomerFormData) => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID not found');
      }

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          full_name: data.full_name,
          phone: data.phone,
          national_id: data.national_id,
          company_id: user.profile.company_id,
          status: 'active',
        })
        .select('id, full_name')
        .single();

      if (error) throw error;
      return newCustomer;
    },
    onSuccess: (newCustomer) => {
      toast.success('تم إضافة العميل بنجاح');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      reset();
      onOpenChange(false);
      onCustomerCreated?.(newCustomer);
    },
    onError: (error: Error) => {
      console.error('Error creating customer:', error);
      toast.error('حدث خطأ أثناء إضافة العميل');
    },
  });

  const onSubmit = (data: QuickCustomerFormData) => {
    if (duplicateCheck.exists) {
      toast.error('العميل موجود مسبقاً بهذا الرقم الشخصي');
      return;
    }
    createCustomerMutation.mutate(data);
  };

  const handleUseExisting = () => {
    if (duplicateCheck.existingCustomer) {
      onOpenChange(false);
      onCustomerCreated?.(duplicateCheck.existingCustomer);
      reset();
    }
  };

  const handleClose = () => {
    reset();
    setDuplicateCheck({ checking: false, exists: false });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-coral-500" />
            إضافة عميل سريع
          </DialogTitle>
          <DialogDescription>
            أدخل البيانات الأساسية للعميل. يمكنك إضافة باقي التفاصيل لاحقاً.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="flex items-center gap-1">
              <User className="h-4 w-4" />
              الاسم الكامل <span className="text-red-500">*</span>
            </Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="أدخل اسم العميل"
              className={cn(errors.full_name && 'border-red-500')}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.full_name.message}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              رقم الهاتف <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+974 5555 5555"
              className={cn(errors.phone && 'border-red-500')}
              dir="ltr"
            />
            {errors.phone && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* National ID */}
          <div className="space-y-2">
            <Label htmlFor="national_id" className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" />
              الرقم الشخصي <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="national_id"
                {...register('national_id')}
                placeholder="أدخل الرقم الشخصي"
                className={cn(
                  errors.national_id && 'border-red-500',
                  duplicateCheck.exists && 'border-amber-500'
                )}
                dir="ltr"
              />
              {duplicateCheck.checking && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-neutral-400" />
              )}
              {!duplicateCheck.checking && duplicateCheck.exists && (
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500" />
              )}
              {!duplicateCheck.checking && !duplicateCheck.exists && nationalId && nationalId.length >= 5 && (
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            {errors.national_id && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.national_id.message}
              </p>
            )}
            
            {/* Duplicate Warning */}
            {duplicateCheck.exists && duplicateCheck.existingCustomer && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-2">
                  ⚠️ العميل موجود مسبقاً: <strong>{duplicateCheck.existingCustomer.full_name}</strong>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseExisting}
                  className="text-amber-700 border-amber-300 hover:bg-amber-100"
                >
                  استخدام العميل الموجود
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || duplicateCheck.exists || duplicateCheck.checking}
              className="bg-coral-500 hover:bg-coral-600"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                  حفظ ومتابعة
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickCustomerForm;
