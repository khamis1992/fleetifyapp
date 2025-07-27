import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  cashFlowAnalysis: CashFlowAnalysis;
  financialHealthScore: FinancialHealthScore;
}

export const useAdvancedFinancialAnalytics = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["advanced-financial-analytics", user?.id],
    queryFn: async (): Promise<AdvancedFinancialAnalytics> => {
      if (!user?.user_metadata?.company_id) {
        return getEmptyAnalytics();
      }

      const companyId = user.user_metadata.company_id;
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      // جلب بيانات مراكز التكلفة
      const { data: costCenters } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      // جلب القيود اليومية للأشهر الستة الماضية
      const { data: journalEntries } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (
              account_type,
              account_name
            ),
            cost_centers (
              center_name,
              center_code
            )
          )
        `)
        .eq("company_id", companyId)
        .eq("status", "posted")
        .gte("entry_date", sixMonthsAgo.toISOString().split('T')[0]);

      // جلب المدفوعات والعمليات البنكية
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("payment_date", sixMonthsAgo.toISOString().split('T')[0]);

      const { data: bankTransactions } = await supabase
        .from("bank_transactions")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("transaction_date", sixMonthsAgo.toISOString().split('T')[0]);

      // حساب الاتجاهات الشهرية
      const monthlyTrends = calculateMonthlyTrends(journalEntries || [], payments || []);
      
      // حساب أداء مراكز التكلفة
      const costCenterPerformance = calculateCostCenterPerformance(
        costCenters || [],
        journalEntries || []
      );
      
      // تحليل التدفق النقدي
      const cashFlowAnalysis = calculateCashFlowAnalysis(
        payments || [],
        bankTransactions || []
      );
      
      // حساب درجة الصحة المالية
      const financialHealthScore = calculateFinancialHealthScore(
        monthlyTrends,
        cashFlowAnalysis
      );

      return {
        monthlyTrends,
        costCenterPerformance,
        cashFlowAnalysis,
        financialHealthScore,
      };
    },
    enabled: !!user?.user_metadata?.company_id,
  });
};

function calculateMonthlyTrends(journalEntries: any[], payments: any[]): MonthlyTrend[] {
  const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
  
  // تجميع البيانات حسب الشهر
  journalEntries.forEach(entry => {
    const month = new Date(entry.entry_date).toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long' 
    });
    
    if (!monthlyData[month]) {
      monthlyData[month] = { revenue: 0, expenses: 0 };
    }
    
    entry.journal_entry_lines?.forEach((line: any) => {
      if (line.chart_of_accounts?.account_type === 'revenue') {
        monthlyData[month].revenue += line.credit_amount || 0;
      } else if (line.chart_of_accounts?.account_type === 'expenses') {
        monthlyData[month].expenses += line.debit_amount || 0;
      }
    });
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    expenses: data.expenses,
    profit: data.revenue - data.expenses,
    profitMargin: data.revenue > 0 ? ((data.revenue - data.expenses) / data.revenue) * 100 : 0,
  })).slice(-6); // آخر 6 أشهر فقط
}

function calculateCostCenterPerformance(
  costCenters: any[],
  journalEntries: any[]
): CostCenterPerformance[] {
  return costCenters.map(center => {
    let actualAmount = 0;
    
    journalEntries.forEach(entry => {
      entry.journal_entry_lines?.forEach((line: any) => {
        if (line.cost_center_id === center.id) {
          actualAmount += line.debit_amount || 0;
        }
      });
    });

    const variance = actualAmount - (center.budget_amount || 0);
    const variancePercentage = center.budget_amount > 0 
      ? (variance / center.budget_amount) * 100 
      : 0;

    return {
      centerName: center.center_name,
      centerCode: center.center_code,
      budgetAmount: center.budget_amount || 0,
      actualAmount,
      variance,
      variancePercentage,
    };
  });
}

function calculateCashFlowAnalysis(
  payments: any[],
  bankTransactions: any[]
): CashFlowAnalysis {
  let totalInflow = 0;
  let totalOutflow = 0;

  // حساب التدفقات من المدفوعات
  payments.forEach(payment => {
    if (payment.payment_type === 'receipt') {
      totalInflow += payment.amount;
    } else {
      totalOutflow += payment.amount;
    }
  });

  // حساب التدفقات من العمليات البنكية
  bankTransactions.forEach(transaction => {
    if (transaction.transaction_type === 'deposit') {
      totalInflow += transaction.amount;
    } else {
      totalOutflow += transaction.amount;
    }
  });

  const netCashFlow = totalInflow - totalOutflow;

  return {
    totalInflow,
    totalOutflow,
    netCashFlow,
    operatingCashFlow: netCashFlow * 0.8, // تقدير
    investingCashFlow: netCashFlow * 0.1, // تقدير
    financingCashFlow: netCashFlow * 0.1, // تقدير
  };
}

function calculateFinancialHealthScore(
  monthlyTrends: MonthlyTrend[],
  cashFlowAnalysis: CashFlowAnalysis
): FinancialHealthScore {
  // حساب درجة الربحية
  const avgProfitMargin = monthlyTrends.length > 0
    ? monthlyTrends.reduce((sum, trend) => sum + trend.profitMargin, 0) / monthlyTrends.length
    : 0;
  const profitabilityScore = Math.min(100, Math.max(0, avgProfitMargin * 5));

  // حساب درجة السيولة
  const liquidityScore = cashFlowAnalysis.netCashFlow > 0 ? 80 : 40;

  // حساب درجة الكفاءة
  const revenueGrowth = monthlyTrends.length >= 2
    ? ((monthlyTrends[monthlyTrends.length - 1].revenue - monthlyTrends[0].revenue) / monthlyTrends[0].revenue) * 100
    : 0;
  const efficiencyScore = Math.min(100, Math.max(0, 50 + revenueGrowth));

  // حساب درجة الملاءة المالية
  const solvencyScore = cashFlowAnalysis.totalInflow > cashFlowAnalysis.totalOutflow ? 85 : 50;

  // حساب الدرجة الإجمالية
  const score = Math.round(
    (profitabilityScore * 0.3) +
    (liquidityScore * 0.25) +
    (efficiencyScore * 0.25) +
    (solvencyScore * 0.2)
  );

  return {
    score,
    factors: {
      profitabilityScore: Math.round(profitabilityScore),
      liquidityScore: Math.round(liquidityScore),
      efficiencyScore: Math.round(efficiencyScore),
      solvencyScore: Math.round(solvencyScore),
    },
  };
}

function getEmptyAnalytics(): AdvancedFinancialAnalytics {
  return {
    monthlyTrends: [],
    costCenterPerformance: [],
    cashFlowAnalysis: {
      totalInflow: 0,
      totalOutflow: 0,
      netCashFlow: 0,
      operatingCashFlow: 0,
      investingCashFlow: 0,
      financingCashFlow: 0,
    },
    financialHealthScore: {
      score: 0,
      factors: {
        profitabilityScore: 0,
        liquidityScore: 0,
        efficiencyScore: 0,
        solvencyScore: 0,
      },
    },
  };
}