import { useQuery } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { financeToday, requireFinanceCompany } from '@/services/financialReporting';
import { readArAging } from './arAgingReportData';

export function useArAgingReport(cutoff?: string) {
  const { companyId, user, isInitializing, isAuthenticating, authError } = useUnifiedCompanyAccess();
  const asOf = cutoff ?? financeToday();
  const query = useQuery({
    queryKey: ['verified-ar-aging', companyId, user?.id, asOf],
    enabled: !isInitializing && !isAuthenticating,
    retry: false, staleTime: 0,
    queryFn: async () => {
      if (authError || !user) throw new Error('يلزم تسجيل الدخول لقراءة أعمار الذمم.');
      requireFinanceCompany(companyId);
      return readArAging(companyId, asOf);
    },
  });
  return { ...query, data: query.isError || isInitializing || isAuthenticating ? undefined : query.data,
    isLoading: query.isLoading || isInitializing || isAuthenticating, asOf };
}
