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

      const invoiceIds = (invoices || []).map(invoice => invoice.id);
      let relatedPaymentsCount = 0;

      if (invoiceIds.length > 0) {
        const { count, error: invoicePaymentsCheckError } = await supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .in('invoice_id', invoiceIds);

        if (invoicePaymentsCheckError) {
          throw invoicePaymentsCheckError;
        }

        relatedPaymentsCount += count || 0;
      }

      const { count: contractPaymentsCount, error: contractPaymentsCheckError } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contractId);

      if (contractPaymentsCheckError) {
        throw contractPaymentsCheckError;
      }

      relatedPaymentsCount += contractPaymentsCount || 0;

      if (relatedPaymentsCount > 0) {
        throw new Error('Cannot permanently delete a contract with recorded payments. Archive or cancel the contract to preserve the financial audit trail.');
      }

      // 3. Delete vehicle condition reports
      const { error: conditionReportsError } = await supabase
        .from('vehicle_condition_reports')
        .delete()
        .eq('contract_id', contractId);
      
      if (conditionReportsError) {
        console.warn(`Warning deleting vehicle condition reports for contract ${contractId}:`, conditionReportsError);
      }

      // 4. Cancel unpaid invoices instead of deleting financial history
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          balance_due: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('contract_id', contractId)
        .or('paid_amount.eq.0,paid_amount.is.null');
      
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
    } catch (error: unknown) {
      console.error(`Error deleting contract ${contractId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
      } catch (error: unknown) {
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
    onError: (error: unknown) => {
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
