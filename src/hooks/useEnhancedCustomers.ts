import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';
import { Customer, CustomerFilters } from '@/types/customer';

export type EnhancedCustomer = Customer;

export const useCustomers = (filters?: CustomerFilters) => {
  const { companyId, getQueryKey, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { 
    includeInactive = false, 
    searchTerm, 
    search,
    limit,
    customer_type,
    is_blacklisted 
  } = filters || {};
  
  return useQuery({
    queryKey: getQueryKey(['customers'], [includeInactive, searchTerm, search, limit, customer_type, is_blacklisted]),
    queryFn: async (): Promise<EnhancedCustomer[]> => {
      if (!companyId) {
        throw new Error("No company access available");
      }
      
      let query = supabase
        .from('customers')
        .select(`
          *,
          contracts(
            id,
            status,
            contract_amount,
            start_date,
            end_date
          )
        `)
        .eq('company_id', companyId);
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      if (customer_type) {
        query = query.eq('customer_type', customer_type);
      }

      if (is_blacklisted !== undefined) {
        query = query.eq('is_blacklisted', is_blacklisted);
      }
      
      const searchText = searchTerm || search;
      if (searchText) {
        query = query.or(
          `first_name.ilike.%${searchText}%,` +
          `last_name.ilike.%${searchText}%,` +
          `company_name.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%`
        );
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching customers:', error);
        throw error;
      }
      
      // Transform data to include contract statistics
      return (data || []).map(customer => {
        const contracts = customer.contracts || [];
        const activeContracts = contracts.filter((c: any) => c.status === 'active');
        const totalRevenue = contracts.reduce((sum: number, c: any) => sum + (c.contract_amount || 0), 0);
        const lastContract = contracts.sort((a: any, b: any) => 
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )[0];
        
        return {
          ...customer,
          total_contracts: contracts.length,
          active_contracts: activeContracts.length,
          total_revenue: totalRevenue,
          last_contract_date: lastContract?.start_date
        } as unknown as EnhancedCustomer;
      });
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};

export const useCustomerById = (customerId: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['customer'], [customerId]),
    queryFn: async (): Promise<EnhancedCustomer | null> => {
      if (!companyId || !customerId) return null;
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          contracts(
            id,
            status,
            contract_amount,
            start_date,
            end_date
          )
        `)
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('Error fetching customer:', error);
        throw error;
      }
      
      // Transform data similar to useCustomers
      const contracts = data.contracts || [];
      const activeContracts = contracts.filter((c: any) => c.status === 'active');
      const totalRevenue = contracts.reduce((sum: number, c: any) => sum + (c.contract_amount || 0), 0);
      const lastContract = contracts.sort((a: any, b: any) => 
        new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )[0];
      
      return {
        ...data,
        total_contracts: contracts.length,
        active_contracts: activeContracts.length,
        total_revenue: totalRevenue,
        last_contract_date: lastContract?.start_date
      } as unknown as EnhancedCustomer;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
};

export const useToggleCustomerBlacklist = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({ customerId, isBlacklisted, reason }: { 
      customerId: string; 
      isBlacklisted: boolean; 
      reason?: string 
    }) => {
      const { error } = await supabase
        .from('customers')
        .update({ 
          is_blacklisted: isBlacklisted,
          blacklist_reason: isBlacklisted ? reason : null
        })
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(variables.isBlacklisted ? 'تم إضافة العميل للقائمة السوداء' : 'تم إزالة العميل من القائمة السوداء');
    },
    onError: (error) => {
      console.error('Error toggling customer blacklist:', error);
      toast.error('حدث خطأ أثناء تحديث حالة العميل');
    }
  });
};