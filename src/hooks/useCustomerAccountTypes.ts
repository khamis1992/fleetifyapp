import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerAccountType } from '@/types/customerAccount';

export const useCustomerAccountTypes = () => {
  return useQuery({
    queryKey: ['customer-account-types'],
    queryFn: async (): Promise<CustomerAccountType[]> => {
      const { data, error } = await supabase
        .from('customer_account_types')
        .select('*')
        .eq('is_active', true)
        .order('type_name');

      if (error) {
        console.error('Error fetching customer account types:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};