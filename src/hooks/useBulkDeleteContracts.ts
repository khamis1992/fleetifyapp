import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

interface BulkDeleteProgress {
  total: number;
  processed: number;
  deleted: number;
  failed: number;
  currentStep: string;
  errors: Array<{ contractId: string; error: string }>;
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
 * Bulk contract deletion is deliberately unavailable. Each contract must use
 * its approved cancellation workflow so invoices, payments, vehicles, and
 * journals are handled atomically.
 */
export const useBulkDeleteContracts = () => {
  const [progress, setProgress] = useState<BulkDeleteProgress>(initialProgress);

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const message = 'تم إيقاف الحذف الجماعي للعقود. ألغِ كل عقد من إجراء الإلغاء المعتمد للحفاظ على السجل المالي.';
      setProgress({
        ...initialProgress,
        failed: 1,
        currentStep: message,
        errors: [{ contractId: 'bulk-operation', error: message }],
      });
      throw new Error(message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    bulkDeleteContracts: bulkDeleteMutation,
    progress,
    resetProgress: () => setProgress(initialProgress),
  };
};
