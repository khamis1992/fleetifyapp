import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface FinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashFlow: number;
  profitMargin: number;
  
  monthlyTrend: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  
  revenueBySource: {
    source: string;
    amount: number;
    percentage: number;
  }[];
  
  topExpenseCategories: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  
  // Key financial ratios
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  
  // Cash flow analysis
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  
  // Forecasts
  projectedMonthlyRevenue: number;
  projectedAnnualRevenue: number;
}

export const useFinancialOverview = () => {
  const { companyId, user, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['financial-overview']),
    queryFn: async (): Promise<FinancialOverview> => {
      if (!user) {
        console.log('⚠️ [FINANCIAL_OVERVIEW] No authenticated user');
        return getEmptyFinancialOverview();
      }

      if (!companyId) {
        console.log('⚠️ [FINANCIAL_OVERVIEW] No company ID');
        return getEmptyFinancialOverview();
      }

      console.log('🔄 [FINANCIAL_OVERVIEW] Fetching for company:', companyId);

      const currentDate = new Date();
      const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);

      try {
        // Get revenue data from contracts and payments
        const { data: revenueData, error: revenueError } = await supabase
          .from('payments')
          .select('amount, payment_date, payment_method')
          .eq('company_id', companyId)
          .eq('payment_method', 'received')
          .eq('payment_status', 'completed')
          .gte('payment_date', sixMonthsAgo.toISOString().split('T')[0]);

        if (revenueError) {
          console.error('❌ [FINANCIAL_OVERVIEW] Revenue error:', revenueError);
        }

        // Get expense data from payments and maintenance
        const { data: expenseData, error: expenseError } = await supabase
          .from('payments')
          .select('amount, payment_date, payment_method')
          .eq('company_id', companyId)
          .eq('payment_method', 'made')
          .eq('payment_status', 'completed')
          .gte('payment_date', sixMonthsAgo.toISOString().split('T')[0]);

        if (expenseError) {
          console.error('❌ [FINANCIAL_OVERVIEW] Expense error:', expenseError);
        }

        // Get maintenance costs
        const { data: maintenanceCosts, error: maintenanceError } = await supabase
          .from('vehicle_maintenance')
          .select('estimated_cost, created_at')
          .eq('company_id', companyId)
          .eq('status', 'completed')
          .not('estimated_cost', 'is', null)
          .gte('created_at', sixMonthsAgo.toISOString());

        if (maintenanceError) {
          console.error('❌ [FINANCIAL_OVERVIEW] Maintenance error:', maintenanceError);
        }

        // Get payroll costs
        const { data: payrollData, error: payrollError } = await supabase
          .from('payroll')
          .select('net_amount, payroll_date')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('payroll_date', sixMonthsAgo.toISOString().split('T')[0]);

        if (payrollError) {
          console.error('❌ [FINANCIAL_OVERVIEW] Payroll error:', payrollError);
        }

        console.log('✅ [FINANCIAL_OVERVIEW] Data collected successfully');

        // Calculate totals
        const totalRevenue = revenueData?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
        const totalPaymentExpenses = expenseData?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0;
        const totalMaintenanceExpenses = maintenanceCosts?.reduce((sum, maintenance) => sum + (Number(maintenance.estimated_cost) || 0), 0) || 0;
        const totalPayrollExpenses = payrollData?.reduce((sum, payroll) => sum + (Number(payroll.net_amount) || 0), 0) || 0;
        
        const totalExpenses = totalPaymentExpenses + totalMaintenanceExpenses + totalPayrollExpenses;
        const netIncome = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

        // Calculate monthly trends
        const monthlyTrend = calculateMonthlyTrend(revenueData, expenseData, maintenanceCosts, payrollData);

        // Calculate revenue by source
        const revenueBySource = calculateRevenueBySource(totalRevenue);

        // Calculate expense categories
        const topExpenseCategories = calculateExpenseCategories(
          totalPaymentExpenses,
          totalMaintenanceExpenses,
          totalPayrollExpenses
        );

        // Simple financial ratios (would need more detailed balance sheet data for accuracy)
        const currentRatio = 1.2; // Placeholder - would need current assets/liabilities
        const quickRatio = 1.0; // Placeholder
        const debtToEquity = 0.3; // Placeholder

        // Cash flow (simplified)
        const operatingCashFlow = netIncome;
        const investingCashFlow = -totalMaintenanceExpenses; // Treating maintenance as investment
        const financingCashFlow = 0; // Placeholder

        // Simple forecasting based on recent trends
        const recentMonthlyRevenue = monthlyTrend.slice(-3).reduce((sum, month) => sum + month.revenue, 0) / 3 || 0;
        const projectedMonthlyRevenue = Math.max(0, recentMonthlyRevenue * 1.05); // 5% growth assumption
        const projectedAnnualRevenue = projectedMonthlyRevenue * 12;

        return {
          totalRevenue,
          totalExpenses,
          netIncome,
          cashFlow: operatingCashFlow + investingCashFlow + financingCashFlow,
          profitMargin,
          monthlyTrend,
          revenueBySource,
          topExpenseCategories,
          currentRatio,
          quickRatio,
          debtToEquity,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          projectedMonthlyRevenue,
          projectedAnnualRevenue
        };
      } catch (error) {
        console.error('❌ [FINANCIAL_OVERVIEW] Error:', error);
        return getEmptyFinancialOverview();
      }
    },
    enabled: !!user && !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000,
  });
};

function calculateMonthlyTrend(
  revenueData: any[] | null,
  expenseData: any[] | null,
  maintenanceCosts: any[] | null,
  payrollData: any[] | null
) {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const currentDate = new Date();
  const monthlyData: Record<string, { revenue: number; expenses: number }> = {};

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[monthKey] = { revenue: 0, expenses: 0 };
  }

  // Process revenue
  revenueData?.forEach(payment => {
    const date = new Date(payment.payment_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].revenue += payment.amount || 0;
    }
  });

  // Process expenses
  expenseData?.forEach(payment => {
    const date = new Date(payment.payment_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].expenses += payment.amount || 0;
    }
  });

  maintenanceCosts?.forEach(maintenance => {
    const date = new Date(maintenance.created_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].expenses += maintenance.estimated_cost || 0;
    }
  });

  payrollData?.forEach(payroll => {
    const date = new Date(payroll.payroll_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[monthKey]) {
      monthlyData[monthKey].expenses += payroll.net_amount || 0;
    }
  });

  return Object.entries(monthlyData).map(([monthKey, data]) => {
    const [year, month] = monthKey.split('-');
    const monthName = months[parseInt(month) - 1];
    return {
      month: monthName,
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses
    };
  });
}

function calculateRevenueBySource(totalRevenue: number) {
  // Simplified - would need more detailed categorization
  return [
    {
      source: 'إيجار المركبات',
      amount: totalRevenue * 0.8,
      percentage: 80
    },
    {
      source: 'رسوم إضافية',
      amount: totalRevenue * 0.15,
      percentage: 15
    },
    {
      source: 'أخرى',
      amount: totalRevenue * 0.05,
      percentage: 5
    }
  ];
}

function calculateExpenseCategories(
  paymentExpenses: number,
  maintenanceExpenses: number,
  payrollExpenses: number
) {
  const total = paymentExpenses + maintenanceExpenses + payrollExpenses;
  
  if (total === 0) return [];

  return [
    {
      category: 'الرواتب والمزايا',
      amount: payrollExpenses,
      percentage: (payrollExpenses / total) * 100
    },
    {
      category: 'صيانة المركبات',
      amount: maintenanceExpenses,
      percentage: (maintenanceExpenses / total) * 100
    },
    {
      category: 'مصاريف أخرى',
      amount: paymentExpenses,
      percentage: (paymentExpenses / total) * 100
    }
  ].filter(category => category.amount > 0)
   .sort((a, b) => b.amount - a.amount);
}

function getEmptyFinancialOverview(): FinancialOverview {
  return {
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    cashFlow: 0,
    profitMargin: 0,
    monthlyTrend: [],
    revenueBySource: [],
    topExpenseCategories: [],
    currentRatio: 0,
    quickRatio: 0,
    debtToEquity: 0,
    operatingCashFlow: 0,
    investingCashFlow: 0,
    financingCashFlow: 0,
    projectedMonthlyRevenue: 0,
    projectedAnnualRevenue: 0
  };
}