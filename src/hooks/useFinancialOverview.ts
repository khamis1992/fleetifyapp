import { useQuery } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { financeToday, readFinancialSummary } from '@/services/financialReporting';

export interface FinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}
export const useFinancialOverview = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const today = financeToday();
  return useQuery({
    queryKey: ['financial-overview', companyId, today],
    enabled: Boolean(companyId),
    staleTime: 30000,
    queryFn: async (): Promise<FinancialOverview> => {
      const summary = await readFinancialSummary(companyId!, today.slice(0, 4) + '-01-01', today);
      return {
        totalRevenue: summary.total_revenue,
        totalExpenses: summary.total_expenses,
        netIncome: summary.net_income,
      };
    },
  });
};
