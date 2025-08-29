import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import type { 
  FinancialObligation, 
  FinancialObligationWithDetails,
  FinancialObligationCreationData,
  FinancialObligationUpdateData
} from '@/types/financial-obligations';

// Hook to fetch financial obligations for a customer
export function useCustomerFinancialObligations(customerId?: string) {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['financial-obligations', companyId, customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_financial_obligations')
        .select(`
          *,
          customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          ),
          contracts(
            id,
            contract_number,
            contract_amount
          )
        `)
        .eq('customer_id', customerId)
        .eq('company_id', companyId)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as FinancialObligationWithDetails[];
    },
    enabled: !!user?.id && !!companyId && !!customerId,
  });
}

// Hook to fetch all financial obligations for the company
export function useCompanyFinancialObligations(filters?: {
  status?: string;
  customerType?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  contractId?: string;
}) {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['company-financial-obligations', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('customer_financial_obligations')
        .select(`
          *,
          customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          ),
          contracts(
            id,
            contract_number,
            contract_amount
          )
        `)
        .eq('company_id', companyId);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.contractId) {
        query = query.eq('contract_id', filters.contractId);
      }
      
      if (filters?.dueDateFrom) {
        query = query.gte('due_date', filters.dueDateFrom);
      }
      
      if (filters?.dueDateTo) {
        query = query.lte('due_date', filters.dueDateTo);
      }

      const { data, error } = await query.order('due_date', { ascending: true });

      if (error) throw error;
      
      let filteredData = data as FinancialObligationWithDetails[];
      
      if (filters?.customerType) {
        filteredData = filteredData.filter(obligation => 
          obligation.customers?.customer_type === filters.customerType
        );
      }
      
      return filteredData;
    },
    enabled: !!user?.id && !!companyId,
  });
}

// Hook to fetch overdue obligations
export function useOverdueObligations() {
  const { user, companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['overdue-obligations', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_financial_obligations')
        .select(`
          *,
          customers!inner(
            id,
            first_name,
            last_name,
            company_name,
            customer_type
          ),
          contracts(
            id,
            contract_number,
            contract_amount
          )
        `)
        .eq('company_id', companyId)
        .eq('status', 'overdue')
        .gt('remaining_amount', 0)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as FinancialObligationWithDetails[];
    },
    enabled: !!user?.id && !!companyId,
  });
}

// Hook to create a new financial obligation
export function useCreateFinancialObligation() {
  const queryClient = useQueryClient();
  const { user, companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (data: FinancialObligationCreationData) => {
      // Generate obligation number
      const obligationNumber = `OBL-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      const obligationData = {
        ...data,
        company_id: companyId,
        obligation_number: obligationNumber,
        remaining_amount: data.original_amount,
        created_by: user?.id,
      };

      const { data: result, error } = await supabase
        .from('customer_financial_obligations')
        .insert(obligationData)
        .select()
        .single();

      if (error) throw error;
      
      // Recalculate customer balance
      await supabase.rpc('calculate_customer_financial_balance', {
        customer_id_param: data.customer_id,
        contract_id_param: data.contract_id || null,
      });
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations', companyId, variables.customer_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['company-financial-obligations', companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['customer-financial-balances'] 
      });
      toast.success('تم إنشاء الالتزام المالي بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    },
  });
}

// Hook to update a financial obligation
export function useUpdateFinancialObligation() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FinancialObligationUpdateData }) => {
      const { data, error } = await supabase
        .from('customer_financial_obligations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Recalculate customer balance
      await supabase.rpc('calculate_customer_financial_balance', {
        customer_id_param: data.customer_id,
        contract_id_param: data.contract_id || null,
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['company-financial-obligations', companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['customer-financial-balances'] 
      });
      toast.success('تم تحديث الالتزام المالي بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    },
  });
}

// Hook to delete a financial obligation
export function useDeleteFinancialObligation() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the obligation to recalculate balance later
      const { data: obligation } = await supabase
        .from('customer_financial_obligations')
        .select('customer_id, contract_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('customer_financial_obligations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Recalculate customer balance if obligation was found
      if (obligation) {
        await supabase.rpc('calculate_customer_financial_balance', {
          customer_id_param: obligation.customer_id,
          contract_id_param: obligation.contract_id || null,
        });
      }
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['company-financial-obligations', companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['customer-financial-balances'] 
      });
      toast.success('تم حذف الالتزام المالي بنجاح');
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ: ${error.message}`);
    },
  });
}

// Hook to update obligations status (mark overdue ones)
export function useUpdateObligationsStatus() {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('update_obligations_status');
      if (error) throw error;
      return data;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ 
        queryKey: ['financial-obligations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['company-financial-obligations', companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue-obligations', companyId] 
      });
      
      if (updatedCount > 0) {
        toast.success(`تم تحديث حالة ${updatedCount} التزام مالي`);
      }
    },
    onError: (error: any) => {
      toast.error(`حدث خطأ في تحديث حالة الالتزامات: ${error.message}`);
    },
  });
}