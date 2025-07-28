import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface EnhancedCustomer {
  id: string;
  name: string;
  name_ar?: string;
  email?: string;
  phone?: string;
  civil_id?: string;
  is_active: boolean;
  company_id: string;
  created_at: string;
  address?: string | null;
  notes?: string | null;
  blacklisted?: boolean;
  blacklist_reason?: string | null;
  alternative_phone?: string | null;
  address_ar?: string | null;
  total_contracts?: number;
  active_contracts?: number;
  total_revenue?: number;
  last_contract_date?: string;
  contracts?: any[];
}

export const useCustomers = (options?: {
  includeInactive?: boolean;
  searchTerm?: string;
  limit?: number;
}) => {
  const { companyId, getQueryKey, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { includeInactive = false, searchTerm, limit } = options || {};
  
  return useQuery({
    queryKey: getQueryKey(['customers'], [includeInactive, searchTerm, limit]),
    queryFn: async (): Promise<EnhancedCustomer[]> => {
      if (!companyId) {
        throw new Error("No company access available");
      }
      
      let query = supabase
        .from('customers')
        .select(`
          *,
          contracts!inner(
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
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%, email.ilike.%${searchTerm}%, phone.ilike.%${searchTerm}%`);
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