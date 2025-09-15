import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useState } from 'react';
import type { DuplicateContract } from './useDuplicateContracts';

interface DuplicateDeleteProgress {
  total: number;
  processed: number;
  deleted: number;
  failed: number;
  currentStep: string;
  errors: Array<{ contractId: string; contractNumber: string; error: string }>;
  currentContract?: string;
}

interface DuplicateDeleteResult {
  total: number;
  deleted: number;
  failed: number;
  errors: Array<{ contractId: string; contractNumber: string; error: string }>;
  companyId: string;
  summary: {
    groupsProcessed: number;
    contractsAnalyzed: number;
    safeToDeleteFound: number;
    actuallyDeleted: number;
  };
}

export const useBulkDeleteDuplicateContracts = () => {
  const queryClient = useQueryClient();
  const { companyId, hasFullCompanyControl, validateCompanyAccess } = useUnifiedCompanyAccess();
  const [progress, setProgress] = useState<DuplicateDeleteProgress>({
    total: 0,
    processed: 0,
    deleted: 0,
    failed: 0,
    currentStep: '',
    errors: [],
    currentContract: undefined
  });

  const deleteContractSafely = async (contract: DuplicateContract): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`Starting safe deletion for contract ${contract.contract_number} (${contract.id})`);
      
      // Double-check that contract is safe to delete
      if (!contract.is_safe_to_delete) {
        return { success: false, error: 'العقد غير آمن للحذف - يحتوي على بيانات مرتبطة' };
      }

      // Verify no related data exists (extra safety check)
      const [paymentsCheck, invoicesCheck, documentsCheck, approvalStepsCheck, paymentSchedulesCheck] = await Promise.all([
        supabase.from('payments').select('id').eq('contract_id', contract.id).limit(1),
        supabase.from('invoices').select('id').eq('contract_id', contract.id).limit(1),
        supabase.from('contract_documents').select('id').eq('contract_id', contract.id).limit(1),
        supabase.from('contract_approval_steps').select('id').eq('contract_id', contract.id).limit(1),
        supabase.from('contract_payment_schedules').select('id').eq('contract_id', contract.id).limit(1)
      ]);

      // If any related data found, abort deletion
      if (paymentsCheck.data?.length || invoicesCheck.data?.length || documentsCheck.data?.length || 
          approvalStepsCheck.data?.length || paymentSchedulesCheck.data?.length) {
        return { success: false, error: 'تم العثور على بيانات مرتبطة - العقد غير آمن للحذف' };
      }

      // Safe to delete - proceed with deletion
      const { error: contractError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (contractError) {
        console.error(`Error deleting contract ${contract.id}:`, contractError);
        return { success: false, error: contractError.message };
      }

      console.log(`Successfully deleted contract ${contract.contract_number} (${contract.id})`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting contract ${contract.id}:`, error);
      return { success: false, error: error.message || 'خطأ غير متوقع' };
    }
  };

  const bulkDeleteDuplicatesMutation = useMutation({
    mutationFn: async (contractsToDelete: DuplicateContract[]): Promise<DuplicateDeleteResult> => {
      // Security checks
      if (!hasFullCompanyControl) {
        throw new Error('ليس لديك صلاحية لحذف العقود');
      }

      if (!companyId) {
        throw new Error('معرف الشركة مطلوب');
      }

      try {
        validateCompanyAccess(companyId);
      } catch (error: any) {
        throw new Error('ليس لديك صلاحية للوصول إلى هذه الشركة');
      }

      // Validate that all contracts are safe to delete
      const unsafeContracts = contractsToDelete.filter(c => !c.is_safe_to_delete);
      if (unsafeContracts.length > 0) {
        throw new Error(`تم العثور على ${unsafeContracts.length} عقد غير آمن للحذف`);
      }

      // Initialize progress
      setProgress({
        total: contractsToDelete.length,
        processed: 0,
        deleted: 0,
        failed: 0,
        currentStep: 'جاري بدء عملية الحذف...',
        errors: [],
        currentContract: undefined
      });

      const errors: Array<{ contractId: string; contractNumber: string; error: string }> = [];
      let deletedCount = 0;
      let processedCount = 0;

      // Process contracts in smaller batches to avoid overwhelming the database
      const batchSize = 3;
      for (let i = 0; i < contractsToDelete.length; i += batchSize) {
        const batch = contractsToDelete.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (contract) => {
          setProgress(prev => ({
            ...prev,
            currentStep: `جاري حذف العقد ${contract.contract_number}...`,
            currentContract: contract.contract_number
          }));

          const result = await deleteContractSafely(contract);
          
          processedCount++;
          if (result.success) {
            deletedCount++;
          } else {
            errors.push({
              contractId: contract.id,
              contractNumber: contract.contract_number,
              error: result.error || `فشل في حذف العقد ${contract.contract_number}`
            });
          }

          // Update progress
          setProgress(prev => ({
            ...prev,
            processed: processedCount,
            deleted: deletedCount,
            failed: errors.length,
            currentStep: `تم معالجة ${processedCount} من ${contractsToDelete.length} عقد...`,
            errors: [...errors]
          }));
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < contractsToDelete.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Calculate summary statistics
      const uniqueContractNumbers = [...new Set(contractsToDelete.map(c => c.contract_number))];
      
      const result: DuplicateDeleteResult = {
        total: contractsToDelete.length,
        deleted: deletedCount,
        failed: errors.length,
        errors,
        companyId: companyId,
        summary: {
          groupsProcessed: uniqueContractNumbers.length,
          contractsAnalyzed: contractsToDelete.length,
          safeToDeleteFound: contractsToDelete.filter(c => c.is_safe_to_delete).length,
          actuallyDeleted: deletedCount
        }
      };

      setProgress(prev => ({
        ...prev,
        currentStep: `اكتملت العملية: تم حذف ${deletedCount} عقد، فشل ${errors.length} عقد`,
        currentContract: undefined
      }));

      return result;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['duplicate-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-statistics'] });
      
      if (result.failed === 0) {
        toast.success(`تم حذف جميع العقود المكررة بنجاح (${result.deleted} عقد)`);
      } else if (result.deleted > 0) {
        toast.warning(`تم حذف ${result.deleted} عقد، فشل حذف ${result.failed} عقد`);
      } else {
        toast.error(`فشل في حذف جميع العقود (${result.failed} عقد)`);
      }
    },
    onError: (error: any) => {
      console.error('Error in bulk delete duplicate contracts:', error);
      toast.error('حدث خطأ في حذف العقود المكررة: ' + error.message);
      
      setProgress(prev => ({
        ...prev,
        currentStep: 'فشلت العملية: ' + error.message,
        currentContract: undefined
      }));
    }
  });

  return {
    bulkDeleteDuplicates: bulkDeleteDuplicatesMutation,
    progress,
    resetProgress: () => setProgress({
      total: 0,
      processed: 0,
      deleted: 0,
      failed: 0,
      currentStep: '',
      errors: [],
      currentContract: undefined
    })
  };
};