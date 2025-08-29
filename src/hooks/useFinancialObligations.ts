import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import type { 
  FinancialObligation, 
  SmartAllocationResult, 
  ManualAllocationRequest,
  AllocationStrategy,
  UnpaidObligation 
} from '@/types/financial-obligations';

// Hook to get financial obligations for a customer
export const useCustomerObligations = (customerId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['financial-obligations', customerId]),
    queryFn: async (): Promise<FinancialObligation[]> => {
      if (!companyId || !customerId) return [];

      const { data, error } = await supabase
        .from('financial_obligations')
        .select('*')
        .eq('company_id', companyId)
        .eq('customer_id', customerId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!customerId,
  });
};

// Hook to get financial obligations for a contract
export const useContractObligations = (contractId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['contract-obligations', contractId]),
    queryFn: async (): Promise<FinancialObligation[]> => {
      if (!companyId || !contractId) return [];

      const { data, error } = await supabase
        .from('financial_obligations')
        .select('*')
        .eq('company_id', companyId)
        .eq('contract_id', contractId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!contractId,
  });
};

// Hook to get all overdue obligations
export const useOverdueObligations = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['overdue-obligations']),
    queryFn: async (): Promise<FinancialObligation[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('financial_obligations')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            customer_type,
            phone,
            email
          ),
          contracts (
            id,
            contract_number,
            contract_type
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['overdue', 'partially_paid'])
        .gt('remaining_amount', 0)
        .order('days_overdue', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook to get unpaid obligations for smart allocation
export const useUnpaidObligations = (customerId?: string, strategy: AllocationStrategy = 'fifo') => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['unpaid-obligations', customerId, strategy, companyId],
    queryFn: async (): Promise<UnpaidObligation[]> => {
      if (!companyId || !customerId) return [];

      const { data, error } = await supabase
        .rpc('get_unpaid_obligations', {
          p_customer_id: customerId,
          p_company_id: companyId,
          p_strategy: strategy
        });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!customerId,
  });
};

// Hook to create financial obligations for a contract
export const useCreateContractObligations = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const { data, error } = await supabase
        .rpc('create_contract_financial_obligations', {
          p_contract_id: contractId,
          p_company_id: companyId
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['contract-obligations', variables.contractId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      
      const result = data as any;
      if (result.success) {
        toast.success(`تم إنشاء ${result.obligations_created?.length || 0} التزام مالي بنجاح`);
      }
    },
    onError: (error: any) => {
      console.error('Error creating contract obligations:', error);
      toast.error(`خطأ في إنشاء الالتزامات المالية: ${error.message}`);
    },
  });
};

// Hook for smart payment allocation
export const useSmartPaymentAllocation = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({
      paymentId,
      customerId,
      amount,
      strategy = 'fifo'
    }: {
      paymentId: string;
      customerId: string;
      amount: number;
      strategy?: AllocationStrategy;
    }) => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const { data, error } = await supabase
        .rpc('allocate_payment_smart', {
          p_payment_id: paymentId,
          p_customer_id: customerId,
          p_company_id: companyId,
          p_amount: amount,
          p_strategy: strategy
        });

      if (error) throw error;
      return data as SmartAllocationResult;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations', variables.customerId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payment-allocations', variables.paymentId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue-obligations'] 
      });
      
      if (data.success) {
        toast.success(
          `تم تخصيص ${data.total_allocated} د.ك على ${data.allocations.length} التزام مالي`
        );
      } else {
        toast.error(`خطأ في تخصيص الدفعة: ${data.error}`);
      }
    },
    onError: (error: any) => {
      console.error('Error in smart payment allocation:', error);
      toast.error(`خطأ في تخصيص الدفعة: ${error.message}`);
    },
  });
};

// Hook for manual payment allocation
export const useManualPaymentAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      allocations
    }: {
      paymentId: string;
      allocations: ManualAllocationRequest[];
    }) => {
      const { data, error } = await supabase
        .rpc('allocate_payment_manual', {
          p_payment_id: paymentId,
          p_allocations: allocations
        });

      if (error) throw error;
      return data as SmartAllocationResult;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payment-allocations', variables.paymentId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue-obligations'] 
      });
      
      if (data.success) {
        toast.success(
          `تم التخصيص اليدوي بنجاح: ${data.total_allocated} د.ك على ${data.allocations.length} التزام`
        );
      } else {
        toast.error(`خطأ في التخصيص اليدوي: ${data.error}`);
      }
    },
    onError: (error: any) => {
      console.error('Error in manual payment allocation:', error);
      toast.error(`خطأ في التخصيص اليدوي: ${error.message}`);
    },
  });
};

// Hook to update obligation status
export const useUpdateObligationStatus = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({
      obligationId,
      status,
      paidAmount,
      notes
    }: {
      obligationId: string;
      status: FinancialObligation['status'];
      paidAmount?: number;
      notes?: string;
    }) => {
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (paidAmount !== undefined) {
        updateData.paid_amount = paidAmount;
      }
      
      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('financial_obligations')
        .update(updateData)
        .eq('id', obligationId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue-obligations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['contract-obligations', data.contract_id] 
      });
      
      toast.success('تم تحديث حالة الالتزام المالي بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating obligation status:', error);
      toast.error(`خطأ في تحديث الالتزام المالي: ${error.message}`);
    },
  });
};

// Hook to get payment allocations for a payment
export const usePaymentAllocations = (paymentId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['payment-allocations', paymentId]),
    queryFn: async () => {
      if (!companyId || !paymentId) return [];

      const { data, error } = await supabase
        .from('payment_allocations')
        .select(`
          *,
          financial_obligations (
            id,
            obligation_type,
            amount,
            due_date,
            description
          )
        `)
        .eq('company_id', companyId)
        .eq('payment_id', paymentId)
        .order('allocation_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!paymentId,
  });
};