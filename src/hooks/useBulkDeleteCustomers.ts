import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

interface BulkDeleteProgress {
  total: number;
  processed: number;
  deleted: number;
  failed: number;
  currentStep: string;
  errors: Array<{ customerId: string; error: string }>;
}

const initialProgress: BulkDeleteProgress = {
  total: 0,
  processed: 0,
  deleted: 0,
  failed: 0,
  currentStep: '',
  errors: [],
};

/**
 * Legacy name retained for callers. The operation now deactivates customers
 * and never deletes contracts, invoices, payments, or supporting documents.
 */
export const useBulkDeleteCustomers = () => {
  const queryClient = useQueryClient();
  const { companyId, hasFullCompanyControl, validateCompanyAccess } = useUnifiedCompanyAccess();
  const [progress, setProgress] = useState<BulkDeleteProgress>(initialProgress);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (targetCompanyId?: string) => {
      if (!hasFullCompanyControl) {
        throw new Error('ليس لديك صلاحية لتعطيل العملاء');
      }

      const actualCompanyId = targetCompanyId || companyId;
      if (!actualCompanyId) {
        throw new Error('معرف الشركة مطلوب');
      }
      validateCompanyAccess(actualCompanyId);

      setProgress({ ...initialProgress, currentStep: 'جاري تحميل العملاء النشطين...' });
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id')
        .eq('company_id', actualCompanyId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;
      const customerIds = (customers || []).map((customer) => customer.id);
      if (customerIds.length === 0) {
        return {
          total: 0,
          deleted: 0,
          failed: 0,
          errors: [],
          companyId: actualCompanyId,
        };
      }

      setProgress({
        ...initialProgress,
        total: customerIds.length,
        currentStep: `جاري تعطيل ${customerIds.length} عميل...`,
      });

      const { data: deactivated, error: updateError } = await supabase
        .from('customers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('company_id', actualCompanyId)
        .in('id', customerIds)
        .select('id');

      if (updateError) throw updateError;
      const deactivatedCount = deactivated?.length || 0;
      setProgress({
        ...initialProgress,
        total: customerIds.length,
        processed: customerIds.length,
        deleted: deactivatedCount,
        failed: customerIds.length - deactivatedCount,
        currentStep: `تم تعطيل ${deactivatedCount} عميل مع الحفاظ على السجل المالي`,
      });

      return {
        total: customerIds.length,
        deleted: deactivatedCount,
        failed: customerIds.length - deactivatedCount,
        errors: [],
        companyId: actualCompanyId,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-statistics'] });
      toast.success(`تم تعطيل ${result.deleted} عميل مع الحفاظ على العقود والفواتير والدفعات`);
    },
    onError: (error: Error) => {
      setProgress((current) => ({ ...current, failed: current.total || 1, currentStep: error.message }));
      toast.error(error.message);
    },
  });

  return {
    bulkDeleteCustomers: bulkDeleteMutation,
    progress,
    resetProgress: () => setProgress(initialProgress),
  };
};
