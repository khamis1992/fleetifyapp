import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerAccountTransaction } from '@/types/customer';

interface UseCustomerAccountStatementParams {
  customerCode?: string;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export const useCustomerAccountStatement = ({
  customerCode,
  dateFrom,
  dateTo,
  enabled = true
}: UseCustomerAccountStatementParams) => {
  return useQuery({
    queryKey: ['customer-account-statement', customerCode, dateFrom, dateTo],
    queryFn: async (): Promise<CustomerAccountTransaction[]> => {
      if (!customerCode) {
        throw new Error('Customer code is required');
      }

      // Get current user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User company not found');
      }

      // Call the database function
      console.log('🔍 [useCustomerAccountStatement] Calling RPC with:', {
        p_company_id: profile.company_id,
        p_customer_code: customerCode,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      });

      const { data, error } = await supabase.rpc('get_customer_account_statement_by_code', {
        p_company_id: profile.company_id,
        p_customer_code: customerCode,
        p_date_from: dateFrom || null,
        p_date_to: dateTo || null
      });

      if (error) {
        console.error('❌ [useCustomerAccountStatement] RPC Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Check if function doesn't exist
        if (error.message?.includes('function') && error.message?.includes('does not exist')) {
          throw new Error('Database function not installed. Please run CREATE_SIMPLE_CUSTOMER_STATEMENT.sql in Supabase Dashboard.');
        }
        
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        transaction_type: item.transaction_type as 'payment' | 'invoice'
      }));
    },
    enabled: enabled && !!customerCode,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10 // 10 minutes
  });
};