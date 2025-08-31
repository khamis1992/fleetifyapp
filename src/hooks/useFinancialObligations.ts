import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface FinancialObligation {
  id: string;
  company_id: string;
  contract_id: string;
  customer_id: string;
  obligation_type: 'installment' | 'deposit' | 'fee' | 'penalty' | 'insurance';
  amount: number;
  original_amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  days_overdue: number;
  obligation_number?: string;
  description?: string;
  reference_number?: string;
  invoice_id?: string;
  journal_entry_id?: string;
  payment_method?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface UnpaidObligation {
  id: string;
  contract_id: string;
  obligation_type: string;
  amount: number;
  due_date: string;
  remaining_amount: number;
  days_overdue: number;
  priority_score: number;
}

export interface SmartAllocationResult {
  success: boolean;
  total_allocated: number;
  allocations: Array<{
    obligation_id: string;
    amount: number;
  }>;
  error?: string;
}

export interface ManualAllocationRequest {
  obligation_id: string;
  amount: number;
}

export type AllocationStrategy = 'fifo' | 'highest_interest' | 'nearest_due' | 'manual';

// Mock implementation since financial_obligations table doesn't exist yet
// These hooks return empty data and are disabled until the table is created

export const useCustomerObligations = (customerId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['financial-obligations', customerId]),
    queryFn: async (): Promise<FinancialObligation[]> => {
      return [];
    },
    enabled: false, // Disabled until table is created
  });
};

export const useContractObligations = (contractId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['contract-obligations', contractId]),
    queryFn: async (): Promise<FinancialObligation[]> => {
      return [];
    },
    enabled: false, // Disabled until table is created
  });
};

export const useOverdueObligations = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['overdue-obligations']),
    queryFn: async (): Promise<FinancialObligation[]> => {
      return [];
    },
    enabled: false, // Disabled until table is created
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useUnpaidObligations = (customerId?: string, strategy: AllocationStrategy = 'fifo') => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['unpaid-obligations', customerId, strategy, companyId],
    queryFn: async (): Promise<UnpaidObligation[]> => {
      return [];
    },
    enabled: false, // Disabled until RPC is created
  });
};

export const useCreateContractObligations = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ contractId }: { contractId: string }) => {
      // Mock implementation
      return { success: true, obligations_created: [] };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['contract-obligations', variables.contractId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      
      toast.info('إنشاء الالتزامات المالية غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error creating contract obligations:', error);
      toast.error(`خطأ في إنشاء الالتزامات المالية: ${error.message}`);
    },
  });
};

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
      // Mock implementation
      return { 
        success: true, 
        total_allocated: 0, 
        allocations: [] 
      } as SmartAllocationResult;
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
      
      toast.info('تخصيص الدفعة الذكي غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error in smart payment allocation:', error);
      toast.error(`خطأ في تخصيص الدفعة: ${error.message}`);
    },
  });
};

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
      // Mock implementation
      return { 
        success: true, 
        total_allocated: 0, 
        allocations: [] 
      } as SmartAllocationResult;
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
      
      toast.info('التخصيص اليدوي غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error in manual payment allocation:', error);
      toast.error(`خطأ في التخصيص اليدوي: ${error.message}`);
    },
  });
};

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
      // Mock implementation
      return { id: obligationId, status, contract_id: null };
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
      
      toast.info('تحديث حالة الالتزام المالي غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error updating obligation status:', error);
      toast.error(`خطأ في تحديث الالتزام المالي: ${error.message}`);
    },
  });
};

export const usePaymentAllocations = (paymentId?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['payment-allocations', paymentId]),
    queryFn: async () => {
      return [];
    },
    enabled: false, // Disabled until table is created
  });
};