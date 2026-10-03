import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import type { CustomerAccountTransaction } from '@/types/customer';

interface UseCustomerAccountStatementParams {
  customerCode?: string;
  dateFrom?: string;
  dateTo?: string;
  enabled?: boolean;
}

export const useCustomerAccountStatement = ({
  customerCode, dateFrom, dateTo, enabled = true,
}: UseCustomerAccountStatementParams) => {
  const access = useUnifiedCompanyAccess();
  const scopeBusy = access.isInitializing || access.isAuthenticating;
  const actorId = access.user?.id;
  const canRead = enabled && !!customerCode && !!access.companyId && !!actorId && !scopeBusy && !access.authError;
  const scopeError = enabled && !!customerCode && !scopeBusy && (access.authError || !access.companyId || !actorId)
    ? new Error(access.authError || 'تعذر تحديد جلسة المستخدم أو شركة كشف الحساب.')
    : null;
  const query = useQuery({
    queryKey: ['customer-account-statement', actorId, access.companyId, customerCode, dateFrom, dateTo],
    queryFn: async (): Promise<CustomerAccountTransaction[]> => {
      if (!customerCode || !access.companyId || !actorId || scopeBusy || access.authError) {
        throw new Error('تعذر تحديد نطاق كشف الحساب.');
      }
      access.validateCompanyAccess(access.companyId);
      const { data, error } = await supabase.rpc('get_customer_account_statement_by_code', {
        p_company_id: access.companyId,
        p_customer_code: customerCode,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });
      if (error) throw new Error(error.message || 'تعذر قراءة كشف حساب العميل.');
      return (data || []).map(item => ({
        ...item,
        transaction_type: item.transaction_type as 'payment' | 'invoice',
      }));
    },
    enabled: canRead,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
  return {
    ...query,
    data: canRead && !query.isFetching && !query.isError ? query.data : undefined,
    isLoading: scopeBusy || (canRead && (query.isLoading || query.isFetching)),
    error: scopeError || query.error,
  };
};
