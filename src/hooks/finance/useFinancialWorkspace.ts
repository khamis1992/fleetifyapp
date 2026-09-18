import { useQuery } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { readFinancialWorkspace } from '@/services/financialReporting';

export function useFinancialWorkspace(asOf: string) {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['financial-workspace', companyId, asOf],
    enabled: Boolean(companyId),
    staleTime: 30_000,
    queryFn: () => readFinancialWorkspace(companyId!, asOf),
  });
}
