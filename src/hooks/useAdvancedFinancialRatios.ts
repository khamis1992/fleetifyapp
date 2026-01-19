import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FinancialRatios {
  // نسب الربحية (Profitability Ratios)
  profitability: {
    grossProfitMargin: number;      // هامش الربح الإجمالي
    operatingProfitMargin: number;  // هامش الربح التشغيلي
    netProfitMargin: number;        // هامش الربح الصافي
    returnOnAssets: number;         // العائد على الأصول (ROA)
    returnOnEquity: number;         // العائد على حقوق الملكية (ROE)
  };
  
  // نسب السيولة (Liquidity Ratios)
  liquidity: {
    currentRatio: number;           // نسبة التداول
    quickRatio: number;             // نسبة السيولة السريعة
    cashRatio: number;              // نسبة النقدية
    workingCapital: number;         // رأس المال العامل
  };
  
  // نسب النشاط (Activity/Efficiency Ratios)
  activity: {
    assetTurnover: number;          // معدل دوران الأصول
    inventoryTurnover: number;      // معدل دوران المخزون
    receivablesTurnover: number;    // معدل دوران المدينين
    daysSalesOutstanding: number;   // متوسط فترة التحصيل
  };
  
  // نسب المديونية (Leverage Ratios)
  leverage: {
    debtToAssets: number;           // نسبة الدين إلى الأصول
    debtToEquity: number;           // نسبة الدين إلى حقوق الملكية
    equityRatio: number;            // نسبة حقوق الملكية
    debtRatio: number;              // نسبة الدين
  };
  
  // البيانات الأساسية المستخدمة في الحسابات
  rawData: {
    revenue: number;
    costOfGoodsSold: number;
    operatingExpenses: number;
    netIncome: number;
    totalAssets: number;
    currentAssets: number;
    cash: number;
    inventory: number;
    accountsReceivable: number;
    totalLiabilities: number;
    currentLiabilities: number;
    totalEquity: number;
  };
}

/**
 * Hook لحساب النسب المالية المتقدمة
 */
export function useAdvancedFinancialRatios(startDate?: string, endDate?: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['advanced-financial-ratios', companyId, startDate, endDate],
    queryFn: async (): Promise<FinancialRatios | null> => {
      if (!companyId) return null;

      // 1. Get Chart of Accounts structure
      const { data: accounts, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', companyId);

      if (accountsError) throw accountsError;
      if (!accounts) return null;

      // 2. Get Journal Entry Lines with filters
      let query = supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entries!inner(
            company_id,
            entry_date,
            status
          )
        `)
        .eq('journal_entries.company_id', companyId)
        .eq('journal_entries.status', 'posted');

      if (startDate) {
        query = query.gte('journal_entries.entry_date', startDate);
      }
      if (endDate) {
        query = query.lte('journal_entries.entry_date', endDate);
      }

      const { data: lines, error: linesError } = await query;

      if (linesError) throw linesError;
      if (!lines) return null;

      // 3. Calculate account balances
      const balances = new Map<string, number>();
      
      lines.forEach((line: any) => {
        const accountCode = line.account_code;
        if (!accountCode) return;

        const debit = Number(line.debit_amount || 0);
        const credit = Number(line.credit_amount || 0);
        const balance = debit - credit;

        balances.set(
          accountCode,
          (balances.get(accountCode) || 0) + balance
        );
      });

      // 4. Helper function to sum accounts by prefix
      const sumByPrefix = (prefix: string): number => {
        return accounts
          .filter(acc => acc.account_code.startsWith(prefix))
          .reduce((sum, acc) => {
            const balance = balances.get(acc.account_code) || 0;
            return sum + balance;
          }, 0);
      };

      // 5. Extract financial data
      const revenue = Math.abs(sumByPrefix('4'));           // الإيرادات
      const costOfGoodsSold = sumByPrefix('51');            // تكلفة البضاعة المباعة
      const operatingExpenses = sumByPrefix('52') + sumByPrefix('53'); // مصروفات تشغيلية وإدارية
      const netIncome = revenue - costOfGoodsSold - operatingExpenses;
      
      const currentAssets = sumByPrefix('11');              // الأصول المتداولة
      const cash = sumByPrefix('1115');                     // النقدية
      const inventory = sumByPrefix('114');                 // المخزون
      const accountsReceivable = sumByPrefix('1121');       // المدينون
      const totalAssets = sumByPrefix('1');                 // إجمالي الأصول
      
      const currentLiabilities = sumByPrefix('21');         // الخصوم المتداولة
      const totalLiabilities = sumByPrefix('2');            // إجمالي الخصوم
      const totalEquity = sumByPrefix('3');                 // حقوق الملكية

      const rawData = {
        revenue,
        costOfGoodsSold,
        operatingExpenses,
        netIncome,
        totalAssets,
        currentAssets,
        cash,
        inventory,
        accountsReceivable,
        totalLiabilities,
        currentLiabilities,
        totalEquity
      };

      // 6. Calculate Profitability Ratios
      const grossProfit = revenue - costOfGoodsSold;
      const operatingProfit = grossProfit - operatingExpenses;

      const profitability = {
        grossProfitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        operatingProfitMargin: revenue > 0 ? (operatingProfit / revenue) * 100 : 0,
        netProfitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
        returnOnAssets: totalAssets > 0 ? (netIncome / totalAssets) * 100 : 0,
        returnOnEquity: totalEquity > 0 ? (netIncome / totalEquity) * 100 : 0
      };

      // 7. Calculate Liquidity Ratios
      const liquidity = {
        currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
        quickRatio: currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0,
        cashRatio: currentLiabilities > 0 ? cash / currentLiabilities : 0,
        workingCapital: currentAssets - currentLiabilities
      };

      // 8. Calculate Activity Ratios
      const activity = {
        assetTurnover: totalAssets > 0 ? revenue / totalAssets : 0,
        inventoryTurnover: inventory > 0 ? costOfGoodsSold / inventory : 0,
        receivablesTurnover: accountsReceivable > 0 ? revenue / accountsReceivable : 0,
        daysSalesOutstanding: accountsReceivable > 0 && revenue > 0 ? (accountsReceivable / revenue) * 365 : 0
      };

      // 9. Calculate Leverage Ratios
      const leverage = {
        debtToAssets: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0,
        debtToEquity: totalEquity > 0 ? (totalLiabilities / totalEquity) * 100 : 0,
        equityRatio: totalAssets > 0 ? (totalEquity / totalAssets) * 100 : 0,
        debtRatio: totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0
      };

      return {
        profitability,
        liquidity,
        activity,
        leverage,
        rawData
      };
    },
    enabled: !!companyId
  });
}

/**
 * Helper للحصول على تقييم نوعي للنسبة
 */
export function getRatioAssessment(
  ratioType: 'profitability' | 'liquidity' | 'activity' | 'leverage',
  ratioName: string,
  value: number
): { status: 'excellent' | 'good' | 'fair' | 'poor'; label: string; color: string } {
  // Profitability Ratios
  if (ratioType === 'profitability') {
    if (ratioName === 'grossProfitMargin' || ratioName === 'operatingProfitMargin' || ratioName === 'netProfitMargin') {
      if (value >= 20) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value >= 10) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value >= 5) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
    if (ratioName === 'returnOnAssets' || ratioName === 'returnOnEquity') {
      if (value >= 15) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value >= 10) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value >= 5) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
  }

  // Liquidity Ratios
  if (ratioType === 'liquidity') {
    if (ratioName === 'currentRatio') {
      if (value >= 2) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value >= 1.5) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value >= 1) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
    if (ratioName === 'quickRatio') {
      if (value >= 1.5) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value >= 1) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value >= 0.75) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
  }

  // Activity Ratios
  if (ratioType === 'activity') {
    if (ratioName === 'assetTurnover') {
      if (value >= 2) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value >= 1) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value >= 0.5) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
    if (ratioName === 'daysSalesOutstanding') {
      if (value <= 30) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value <= 45) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value <= 60) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
  }

  // Leverage Ratios
  if (ratioType === 'leverage') {
    if (ratioName === 'debtToEquity') {
      if (value <= 50) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value <= 100) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value <= 150) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
    if (ratioName === 'debtToAssets') {
      if (value <= 30) return { status: 'excellent', label: 'ممتاز', color: 'text-green-600' };
      if (value <= 50) return { status: 'good', label: 'جيد', color: 'text-blue-600' };
      if (value <= 70) return { status: 'fair', label: 'مقبول', color: 'text-yellow-600' };
      return { status: 'poor', label: 'ضعيف', color: 'text-red-600' };
    }
  }

  return { status: 'fair', label: 'غير محدد', color: 'text-slate-600' };
}

