import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createAuditLog } from './useAuditLog';

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string) => {
      // Get contract details before deletion for audit log
      const { data: contractData } = await supabase
        .from('contracts')
        .select('contract_number, status, customer_id, customers(first_name, last_name, company_name)')
        .eq('id', contractId)
        .single();
      
      // First, delete related records that might reference this contract
      
      // Delete vehicle condition reports
      const { error: conditionReportsError } = await supabase
        .from('vehicle_condition_reports')
        .delete()
        .eq('contract_id', contractId);
      
      if (conditionReportsError) {
        console.warn('Warning deleting vehicle condition reports:', conditionReportsError);
      }

      // Delete contract payment schedules
      const { error: scheduleError } = await supabase
        .from('contract_payment_schedules')
        .delete()
        .eq('contract_id', contractId);
      
      if (scheduleError) {
        console.warn('Warning deleting payment schedules:', scheduleError);
      }

      // Delete invoices
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('contract_id', contractId);
      
      if (invoiceError) {
        console.warn('Warning deleting invoices:', invoiceError);
      }

      // Delete contract documents
      const { error: documentsError } = await supabase
        .from('contract_documents')
        .delete()
        .eq('contract_id', contractId);
      
      if (documentsError) {
        console.warn('Warning deleting documents:', documentsError);
      }

      // Delete approval steps
      const { error: approvalError } = await supabase
        .from('contract_approval_steps')
        .delete()
        .eq('contract_id', contractId);
      
      if (approvalError) {
        console.warn('Warning deleting approval steps:', approvalError);
      }

      // Then delete the contract itself
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);

      if (error) {
        throw error;
      }

      return { contractId, contractData };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-statistics'] });
      
      // Log audit trail
      const customerName = result.contractData?.customers
        ? result.contractData.customers.company_name || 
          `${result.contractData.customers.first_name} ${result.contractData.customers.last_name}`
        : 'Unknown';
      
      await createAuditLog(
        'DELETE',
        'contract',
        result.contractId,
        result.contractData?.contract_number,
        {
          old_values: {
            status: result.contractData?.status,
            customer_name: customerName,
          },
          changes_summary: `Deleted contract ${result.contractData?.contract_number}`,
          severity: 'critical',
        }
      );
      
      toast.success('تم حذف العقد بنجاح');
    },
    onError: (error: unknown) => {
      console.error('Error deleting contract:', error);
      toast.error('حدث خطأ في حذف العقد: ' + error.message);
    }
  });
};