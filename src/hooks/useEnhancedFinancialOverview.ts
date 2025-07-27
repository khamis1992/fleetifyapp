import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FinancialHealthScore {
  profitability_score: number;
  liquidity_score: number;
  efficiency_score: number;
  solvency_score: number;
  overall_score: number;
}

interface CashFlowAnalysis {
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
}

interface MonthlyTrend {
  month_year: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
}

interface EnhancedFinancialOverview {
  healthScore: FinancialHealthScore;
  cashFlow: CashFlowAnalysis;
  monthlyTrends: MonthlyTrend[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  activeContracts: number;
  pendingPayments: number;
  overduePayments: number;
}

export const useEnhancedFinancialOverview = (companyId?: string) => {
  return useQuery({
    queryKey: ["enhanced-financial-overview", companyId],
    queryFn: async () => {
      console.log('[useEnhancedFinancialOverview] Starting query with companyId:', companyId);
      
      if (!companyId) {
        console.error('[useEnhancedFinancialOverview] No company ID provided');
        return {
          healthScore: {
            profitability_score: 0,
            liquidity_score: 0,
            efficiency_score: 0,
            solvency_score: 0,
            overall_score: 0
          },
          cashFlow: {
            total_inflow: 0,
            total_outflow: 0,
            net_cash_flow: 0,
            operating_cash_flow: 0,
            investing_cash_flow: 0,
            financing_cash_flow: 0
          },
          monthlyTrends: [],
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          profitMargin: 0,
          activeContracts: 0,
          pendingPayments: 0,
          overduePayments: 0,
        };
      }

      // Get financial health score
      console.log('[useEnhancedFinancialOverview] Fetching financial health score...');
      const { data: healthData, error: healthError } = await supabase.rpc(
        'calculate_financial_health_score',
        { company_id_param: companyId }
      );
      
      if (healthError) {
        console.error('[useEnhancedFinancialOverview] Health score error:', healthError);
      } else {
        console.log('[useEnhancedFinancialOverview] Health score fetched:', healthData);
      }
      
      const healthScore = healthData?.[0] || {
        profitability_score: 0,
        liquidity_score: 0,
        efficiency_score: 0,
        solvency_score: 0,
        overall_score: 0
      };

      // Get cash flow analysis
      console.log('[useEnhancedFinancialOverview] Fetching cash flow analysis...');
      const { data: cashFlowData, error: cashFlowError } = await supabase.rpc(
        'generate_cash_flow_analysis',
        { company_id_param: companyId }
      );
      
      if (cashFlowError) {
        console.error('[useEnhancedFinancialOverview] Cash flow error:', cashFlowError);
      } else {
        console.log('[useEnhancedFinancialOverview] Cash flow fetched:', cashFlowData);
      }
      
      const cashFlow = cashFlowData?.[0] || {
        total_inflow: 0,
        total_outflow: 0,
        net_cash_flow: 0,
        operating_cash_flow: 0,
        investing_cash_flow: 0,
        financing_cash_flow: 0
      };

      // Get monthly trends
      console.log('[useEnhancedFinancialOverview] Fetching monthly trends...');
      const { data: trendsData, error: trendsError } = await supabase.rpc(
        'generate_monthly_trends',
        { company_id_param: companyId, months_back: 6 }
      );
      
      if (trendsError) {
        console.error('[useEnhancedFinancialOverview] Monthly trends error:', trendsError);
      } else {
        console.log('[useEnhancedFinancialOverview] Monthly trends fetched:', trendsData);
      }
      
      const monthlyTrends = trendsData || [];

      // Calculate summary metrics from trends
      const totalRevenue = monthlyTrends.reduce((sum: number, trend: any) => sum + Number(trend.total_revenue), 0);
      const totalExpenses = monthlyTrends.reduce((sum: number, trend: any) => sum + Number(trend.total_expenses), 0);
      const netIncome = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      console.log('[useEnhancedFinancialOverview] Calculated metrics:', {
        totalRevenue,
        totalExpenses, 
        netIncome,
        profitMargin
      });

      // Get simple counts
      console.log('[useEnhancedFinancialOverview] Fetching active contracts...');
      const contractsResponse = await supabase
        .from("contracts")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "active");

      if (contractsResponse.error) {
        console.warn('[useEnhancedFinancialOverview] Contracts count error (non-critical):', contractsResponse.error);
      }

      const activeContracts = contractsResponse.data?.length || 0;

      const result = {
        healthScore,
        cashFlow,
        monthlyTrends,
        totalRevenue,
        totalExpenses,
        netIncome,
        profitMargin,
        activeContracts,
        pendingPayments: 0, // Simplified for now
        overduePayments: 0, // Simplified for now
      };

      console.log('[useEnhancedFinancialOverview] Final result:', result);
      return result;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      console.error(`[useEnhancedFinancialOverview] Retry ${failureCount}:`, error);
      return failureCount < 2; // Retry up to 2 times
    },
  });
};