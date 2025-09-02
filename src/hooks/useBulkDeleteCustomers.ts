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
  errors: Array<{ customerId: string; error: string }>;
}

export const useBulkDeleteCustomers = () => {
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

  const deleteCustomerAndRelatedData = async (customerId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log(`Starting deletion for customer ${customerId}`);

      // Get contract IDs for this customer
      const { data: contracts, error: contractsFetchError } = await supabase
        .from('contracts')
        .select('id')
        .eq('customer_id', customerId);
      
      if (contractsFetchError) {
        console.warn(`Warning fetching contracts for customer ${customerId}:`, contractsFetchError);
      }

      // Get invoice IDs for this customer
      const { data: invoices, error: invoicesFetchError } = await supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', customerId);
      
      if (invoicesFetchError) {
        console.warn(`Warning fetching invoices for customer ${customerId}:`, invoicesFetchError);
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

      // 2. Delete invoices
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('customer_id', customerId);
      
      if (invoicesError) {
        console.warn(`Warning deleting invoices for customer ${customerId}:`, invoicesError);
      }

      // 3. Delete ALL vehicle condition reports first (comprehensive deletion)
      if (contracts && contracts.length > 0) {
        const contractIds = contracts.map(c => c.id);
        
        // Delete all vehicle condition reports for these contracts in a single operation
        const { error: allConditionReportsError } = await supabase
          .from('vehicle_condition_reports')
          .delete()
          .in('contract_id', contractIds);
        
        if (allConditionReportsError) {
          console.warn(`Warning deleting all vehicle condition reports for contracts:`, allConditionReportsError);
        }

        // Delete contract documents that might reference condition reports
        const { error: contractDocsError } = await supabase
          .from('contract_documents')
          .delete()
          .in('contract_id', contractIds);
        
        if (contractDocsError) {
          console.warn(`Warning deleting contract documents:`, contractDocsError);
        }

        // Delete contract payment schedules
        const { error: scheduleError } = await supabase
          .from('contract_payment_schedules')
          .delete()
          .in('contract_id', contractIds);
        
        if (scheduleError) {
          console.warn(`Warning deleting payment schedules:`, scheduleError);
        }

        // Delete approval steps
        const { error: approvalError } = await supabase
          .from('contract_approval_steps')
          .delete()
          .in('contract_id', contractIds);
        
        if (approvalError) {
          console.warn(`Warning deleting approval steps:`, approvalError);
        }
      }

      // 3.5. Double-check: Delete any remaining vehicle condition reports that might be linked
      const { error: remainingReportsError } = await supabase
        .from('vehicle_condition_reports')
        .delete()
        .in('contract_id', 
          contracts ? contracts.map(c => c.id) : []
        );
      
      if (remainingReportsError) {
        console.warn(`Warning deleting remaining vehicle condition reports:`, remainingReportsError);
      }

      // 4. Delete quotations
      const { error: quotationsError } = await supabase
        .from('quotations')
        .delete()
        .eq('customer_id', customerId);
      
      if (quotationsError) {
        console.warn(`Warning deleting quotations for customer ${customerId}:`, quotationsError);
      }

      // 5. Delete contracts
      const { error: contractsError } = await supabase
        .from('contracts')
        .delete()
        .eq('customer_id', customerId);
      
      if (contractsError) {
        console.warn(`Warning deleting contracts for customer ${customerId}:`, contractsError);
      }

      // 6. Delete customer notes (if table exists)
      const { error: notesError } = await supabase
        .from('customer_notes')
        .delete()
        .eq('customer_id', customerId);
      
      if (notesError) {
        console.warn(`Warning deleting customer notes for customer ${customerId}:`, notesError);
      }

      // 7. Finally delete the customer
      const { error: customerError } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (customerError) {
        console.error(`Error deleting customer ${customerId}:`, customerError);
        return { success: false, error: customerError.message };
      }

      console.log(`Successfully deleted customer ${customerId}`);
      return { success: true };
    } catch (error: any) {
      console.error(`Error deleting customer ${customerId}:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  };

  const bulkDeleteMutation = useMutation({
    mutationFn: async (targetCompanyId?: string) => {
      // Security checks
      if (!hasFullCompanyControl) {
        throw new Error('ليس لديك صلاحية لحذف العملاء');
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
        currentStep: 'جاري تحميل قائمة العملاء...',
        errors: []
      });

      // First, get all customers for the target company
      const { data: customers, error: fetchError } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, customer_type')
        .eq('company_id', actualCompanyId);

      if (fetchError) {
        throw new Error(`خطأ في تحميل العملاء: ${fetchError.message}`);
      }

      if (!customers || customers.length === 0) {
        throw new Error('لا يوجد عملاء للحذف في هذه الشركة');
      }

      // Update progress with total count
      setProgress(prev => ({
        ...prev,
        total: customers.length,
        currentStep: `جاري حذف ${customers.length} عميل...`
      }));

      const errors: Array<{ customerId: string; error: string }> = [];
      let deletedCount = 0;
      let processedCount = 0;

      // Process customers in batches to avoid overwhelming the database
      const batchSize = 3; // Smaller batch size since each customer has more related data
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (customer) => {
          const result = await deleteCustomerAndRelatedData(customer.id);
          
          processedCount++;
          if (result.success) {
            deletedCount++;
          } else {
            const customerName = customer.customer_type === 'individual' 
              ? `${customer.first_name} ${customer.last_name}`.trim()
              : customer.company_name;
            errors.push({
              customerId: customer.id,
              error: result.error || `فشل في حذف العميل ${customerName || customer.id}`
            });
          }

          // Update progress
          setProgress(prev => ({
            ...prev,
            processed: processedCount,
            deleted: deletedCount,
            failed: errors.length,
            currentStep: `تم معالجة ${processedCount} من ${customers.length} عميل...`,
            errors: [...errors]
          }));
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < customers.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Final results
      const result = {
        total: customers.length,
        deleted: deletedCount,
        failed: errors.length,
        errors,
        companyId: actualCompanyId
      };

      setProgress(prev => ({
        ...prev,
        currentStep: `اكتملت العملية: تم حذف ${deletedCount} عميل، فشل ${errors.length} عميل`,
      }));

      return result;
    },
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-statistics'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      
      if (result.failed === 0) {
        toast.success(`تم حذف جميع العملاء بنجاح (${result.deleted} عميل)`);
      } else {
        toast.warning(`تم حذف ${result.deleted} عميل، فشل حذف ${result.failed} عميل`);
      }
    },
    onError: (error: any) => {
      console.error('Error in bulk delete customers:', error);
      toast.error('حدث خطأ في حذف العملاء: ' + error.message);
      
      setProgress(prev => ({
        ...prev,
        currentStep: 'فشلت العملية: ' + error.message
      }));
    }
  });

  return {
    bulkDeleteCustomers: bulkDeleteMutation,
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