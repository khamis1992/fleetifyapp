import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { useState } from 'react';

interface BulkDeleteProgress {
  total: number;
  processed: number;
  deleted: number;
  failed: number;
  currentStep: string;
  errors: Array<{ contractId: string; error: string }>;
}

export const useBulkDeleteContracts = () => {
  const queryClient = useQueryClient();
  const { companyId, hasFullCompanyControl, validateCompanyAccess } = useUnifiedCompanyAccess();
  const [progress, setProgress] = useState<BulkDeleteProgress>({
    total: 0,
    processed: 0,
    deleted: 0,
    failed: 0,
    currentStep: '',
    errors: []
  });

  const deleteContractAndRelatedData = async (contractId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`Starting deletion for contract ${contractId}`);
      
      // Get invoice IDs first to delete related payments
      const { data: invoices, error: invoicesFetchError } = await supabase
        .from('invoices')
        .select('id')
        .eq('contract_id', contractId);
      
      if (invoicesFetchError) {
        console.warn(`Warning fetching invoices for contract ${contractId}:`, invoicesFetchError);
      }

      // 1. Delete payments related to invoices first
      if (invoices && invoices.length > 0) {
        for (const invoice of invoices) {
          const { error: paymentsError } = await supabase
            .from('payments')
            .delete()
            .eq('invoice_id', invoice.id);
          
          if (paymentsError) {
            console.warn(`Warning deleting payments for invoice ${invoice.id}:`, paymentsError);
          }
        }
      }

      // 2. Delete any payments directly linked to contract
      const { error: contractPaymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('contract_id', contractId);
      
      if (contractPaymentsError) {
        console.warn(`Warning deleting contract payments for ${contractId}:`, contractPaymentsError);
      }

      // 3. Delete vehicle condition reports
      const { error: conditionReportsError } = await supabase
        .from('vehicle_condition_reports')
        .delete()
        .eq('contract_id', contractId);
      
      if (conditionReportsError) {
        console.warn(`Warning deleting vehicle condition reports for contract ${contractId}:`, conditionReportsError);
      }

      // 4. Delete invoices (after payments are deleted)
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('contract_id', contractId);
      
      if (invoiceError) {
        console.warn(`Warning deleting invoices for contract ${contractId}:`, invoiceError);
      }

      // 5. Delete contract payment schedules
      const { error: scheduleError } = await supabase
        .from('contract_payment_schedules')
        .delete()
        .eq('contract_id', contractId);
      
      if (scheduleError) {
        console.warn(`Warning deleting payment schedules for contract ${contractId}:`, scheduleError);
      }

      // 6. Delete contract documents
      const { error: documentsError } = await supabase
        .from('contract_documents')
        .delete()
        .eq('contract_id', contractId);
      
      if (documentsError) {
        console.warn(`Warning deleting documents for contract ${contractId}:`, documentsError);
      }

      // 7. Delete approval steps
      const { error: approvalError } = await supabase
        .from('contract_approval_steps')
        .delete()
        .eq('contract_id', contractId);
      
      if (approvalError) {
        console.warn(`Warning deleting approval steps for contract ${contractId}:`, approvalError);
      }

      // 8. Finally delete the contract itself
      const { error: contractError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (contractError) {
        console.error(`Error deleting contract ${contractId}:`, contractError);
        return { success: false, error: contractError.message };
      }

      console.log(`Successfully deleted contract ${contractId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting contract ${contractId}:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (targetCompanyId?: string) => {
      // Security checks
      if (!hasFullCompanyControl) {
        throw new Error('ليس لديك صلاحية لحذف العقود');
      }

      const actualCompanyId = targetCompanyId || companyId;
      if (!actualCompanyId) {
        throw new Error('معرف الشركة مطلوب');
      }

      try {
        validateCompanyAccess(actualCompanyId);
      } catch (error: any) {
        throw new Error('ليس لديك صلاحية للوصول إلى هذه الشركة');
      }

      // Initialize progress
      setProgress({
        total: 0,
        processed: 0,
        deleted: 0,
        failed: 0,
        currentStep: 'جاري تحميل قائمة العقود...',
        errors: []
      });

      // First, get all contracts for the target company
      const { data: contracts, error: fetchError } = await supabase
        .from('contracts')
        .select('id, contract_number')
        .eq('company_id', actualCompanyId);

      if (fetchError) {
        throw new Error(`خطأ في تحميل العقود: ${fetchError.message}`);
      }

      if (!contracts || contracts.length === 0) {
        throw new Error('لا توجد عقود للحذف في هذه الشركة');
      }

      // Update progress with total count
      setProgress(prev => ({
        ...prev,
        total: contracts.length,
        currentStep: `جاري حذف ${contracts.length} عقد...`
      }));

      const errors: Array<{ contractId: string; error: string }> = [];
      let deletedCount = 0;
      let processedCount = 0;

      // Process contracts in batches to avoid overwhelming the database
      const batchSize = 5;
      for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (contract) => {
          const result = await deleteContractAndRelatedData(contract.id);
          
          processedCount++;
          if (result.success) {
            deletedCount++;
          } else {
            errors.push({
              contractId: contract.id,
              error: result.error || `فشل في حذف العقد ${contract.contract_number || contract.id}`
            });
          }

          // Update progress
          setProgress(prev => ({
            ...prev,
            processed: processedCount,
            deleted: deletedCount,
            failed: errors.length,
            currentStep: `تم معالجة ${processedCount} من ${contracts.length} عقد...`,
            errors: [...errors]
          }));
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < contracts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final results
      const result = {
        total: contracts.length,
        deleted: deletedCount,
        failed: errors.length,
        errors,
        companyId: actualCompanyId
      };

      setProgress(prev => ({
        ...prev,
        currentStep: `اكتملت العملية: تم حذف ${deletedCount} عقد، فشل ${errors.length} عقد`,
      }));

      return result;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-statistics'] });
      
      if (result.failed === 0) {
        toast.success(`تم حذف جميع العقود بنجاح (${result.deleted} عقد)`);
      } else {
        toast.warning(`تم حذف ${result.deleted} عقد، فشل حذف ${result.failed} عقد`);
      }
    },
    onError: (error: any) => {
      console.error('Error in bulk delete contracts:', error);
      toast.error('حدث خطأ في حذف العقود: ' + error.message);
      
      setProgress(prev => ({
        ...prev,
        currentStep: 'فشلت العملية: ' + error.message
      }));
    }
  });

  return {
    bulkDeleteContracts: bulkDeleteMutation,
    progress,
    resetProgress: () => setProgress({
      total: 0,
      processed: 0,
      deleted: 0,
      failed: 0,
      currentStep: '',
      errors: []
    })
  };
};