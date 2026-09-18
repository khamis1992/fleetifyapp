import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { financeToday, readFinancialPages, readFinancialWorkspace } from '@/services/financialReporting';

interface CostCenterPerformance {
  centerName: string;
  centerCode: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
}

interface CashFlowAnalysis {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
}

interface FinancialHealthScore {
  score: number;
  factors: {
    profitabilityScore: number;
    liquidityScore: number;
    efficiencyScore: number;
    solvencyScore: number;
  };
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

interface AdvancedFinancialAnalytics {
  monthlyTrends: MonthlyTrend[];
  costCenterPerformance: CostCenterPerformance[];
  cashFlowAnalysis: CashFlowAnalysis | null;
  financialHealthScore: FinancialHealthScore | null;
}

export const useAdvancedFinancialAnalytics = () => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['advanced-financial-analytics', companyId],
    enabled: Boolean(companyId),
    queryFn: async (): Promise<AdvancedFinancialAnalytics> => {
      if (!companyId) throw new Error('Company ID required');
      const today = financeToday();
      const snapshot = await readFinancialWorkspace(companyId, today);
      const since = snapshot.trend[0]?.month || today;
      const [centers, lines] = await Promise.all([
        readFinancialPages((from, to) =>
          supabase
            .from('cost_centers')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId)
            .order('id')
            .range(from, to)
        ),
        readFinancialPages((from, to) =>
          supabase
            .from('journal_entry_lines')
            .select(
              'cost_center_id,debit_amount,credit_amount,journal_entries!inner(company_id,status,entry_date),chart_of_accounts!fk_journal_entry_lines_account!inner(account_type,company_id)',
              { count: 'exact' }
            )
            .eq('journal_entries.company_id', companyId)
            .eq('chart_of_accounts.company_id', companyId)
            .eq('journal_entries.status', 'posted')
            .in('chart_of_accounts.account_type', ['expense', 'expenses'])
            .gte('journal_entries.entry_date', since)
            .lte('journal_entries.entry_date', today)
            .not('cost_center_id', 'is', null)
            .order('id')
            .range(from, to)
        ),
      ]);
      return {
        monthlyTrends: snapshot.trend.map((row) => ({
          month: row.month,
          revenue: row.revenue,
          expenses: row.expenses,
          profit: row.revenue - row.expenses,
          profitMargin: row.revenue !== 0 ? ((row.revenue - row.expenses) / row.revenue) * 100 : 0,
        })),
        costCenterPerformance: centers.map((center) => {
          const actualAmount = lines
            .filter((line) => line.cost_center_id === center.id)
            .reduce((sum, line) => sum + (line.debit_amount || 0) - (line.credit_amount || 0), 0);
          const budgetAmount = center.budget_amount || 0,
            variance = actualAmount - budgetAmount;
          return {
            centerName: center.center_name,
            centerCode: center.center_code,
            budgetAmount,
            actualAmount,
            variance,
            variancePercentage: budgetAmount !== 0 ? (variance / budgetAmount) * 100 : 0,
          };
        }),
        // Cash-flow categories require approved account mappings. Heuristic
        // 80/10/10 splits and arbitrary health scores are not financial reports.
        cashFlowAnalysis: null,
        financialHealthScore: null,
      };
    },
  });
};
