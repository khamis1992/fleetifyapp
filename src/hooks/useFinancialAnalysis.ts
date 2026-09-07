import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import {
  financeToday,
  readAccountBalances,
  readFinancialSummary,
  readFinancialPages,
  readIncomeStatementAccounts,
} from '@/services/financialReporting';
import { format, subYears } from 'date-fns';
import { getAccountNameTranslation } from '@/lib/accountNamesTranslation';

export interface FinancialRatio {
  name: string;
  value: number | null;
  percentage?: boolean;
  description: string;
}

export interface FinancialMetric {
  name: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface BalanceSheetData {
  assets: {
    current: number;
    fixed: number;
    total: number;
  };
  liabilities: {
    current: number;
    longTerm: number;
    total: number;
  };
  equity: number;
}

export interface IncomeStatementData {
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface BudgetComparison {
  budgetedRevenue: number;
  actualRevenue: number;
  budgetedExpenses: number;
  actualExpenses: number;
  revenueVariance: number;
  expenseVariance: number;
  revenueVariancePercentage: number;
  expenseVariancePercentage: number;
}

export interface ForecastData {
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  confidence: number;
}

export interface HistoricalComparison {
  currentYear: number;
  previousYear: number;
  change: number;
  changePercentage: number;
  metric: string;
}

export const useFinancialAnalysis = (period?: { dateFrom?: string; dateTo?: string }) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['financialAnalysis', companyId, period],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID required');

      const today = period?.dateTo || financeToday();
      const periodFrom = period?.dateFrom || today.slice(0, 4) + '-01-01';
      const currentYear = Number(today.slice(0, 4));
      const [current, previous, balances, accounts, budgets] = await Promise.all([
        readFinancialSummary(companyId, periodFrom, today),
        readFinancialSummary(
          companyId,
          format(subYears(new Date(periodFrom + 'T12:00:00'), 1), 'yyyy-MM-dd'),
          format(subYears(new Date(today + 'T12:00:00'), 1), 'yyyy-MM-dd')
        ),
        readAccountBalances(companyId, today),
        readFinancialPages((from, to) =>
          supabase
            .from('chart_of_accounts')
            .select('*', { count: 'exact' })
            .eq('company_id', companyId)
            .order('id')
            .range(from, to)
        ),
        readFinancialPages((from, to) =>
          supabase
            .from('budgets')
            .select('*,budget_items(*,chart_of_accounts(account_type,account_name))', { count: 'exact' })
            .eq('company_id', companyId)
            .eq('budget_year', currentYear)
            .eq('status', 'approved')
            .order('id')
            .range(from, to)
        ),
      ]);
      const balanceById = new Map(balances.map((row) => [row.account_id, row.closing_balance]));
      const sumSubtype = (subtypes: string[]) =>
        accounts
          .filter((a) => subtypes.includes(a.account_subtype || ''))
          .reduce((sum, a) => sum + (balanceById.get(a.id) || 0), 0);
      const currentAssets = sumSubtype([
          'current_assets',
          'current_asset',
          'cash',
          'bank',
          'cash_and_cash_equivalents',
          'accounts_receivable',
          'inventory',
          'prepaid_expenses',
        ]),
        fixedAssets = sumSubtype(['fixed_assets', 'non_current_assets']);
      const currentLiabilities = sumSubtype(['current_liabilities', 'current_liability', 'accounts_payable']),
        longTermLiabilities = sumSubtype(['long_term_liabilities', 'non_current_liabilities']);
      const totalAssets = current.total_assets,
        totalLiabilities = current.total_liabilities,
        totalEquity = current.total_equity;
      const totalRevenue = current.total_revenue,
        totalExpenses = current.total_expenses,
        netIncome = current.net_income;
      const previousYearRevenue = previous.total_revenue,
        previousYearExpenses = previous.total_expenses,
        previousNetIncome = previous.net_income;

      // Calculate budget comparison
      const budgetedRevenue =
        budgets
          .flatMap((budget) => budget.budget_items || [])
          .filter((item) => item.chart_of_accounts?.account_type === 'revenue')
          .reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0) || 0;

      const budgetedExpenses =
        budgets
          .flatMap((budget) => budget.budget_items || [])
          .filter((item) => item.chart_of_accounts?.account_type === 'expenses')
          .reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0) || 0;

      const budgetComparison: BudgetComparison = {
        budgetedRevenue,
        actualRevenue: totalRevenue,
        budgetedExpenses,
        actualExpenses: totalExpenses,
        revenueVariance: totalRevenue - budgetedRevenue,
        expenseVariance: totalExpenses - budgetedExpenses,
        revenueVariancePercentage: budgetedRevenue
          ? ((totalRevenue - budgetedRevenue) / budgetedRevenue) * 100
          : 0,
        expenseVariancePercentage: budgetedExpenses
          ? ((totalExpenses - budgetedExpenses) / budgetedExpenses) * 100
          : 0,
      };

      const knownAssetTypes = [
        'current_assets',
        'current_asset',
        'cash',
        'bank',
        'cash_and_cash_equivalents',
        'accounts_receivable',
        'inventory',
        'prepaid_expenses',
        'fixed_assets',
        'non_current_assets',
      ];
      const knownLiabilityTypes = [
        'current_liabilities',
        'current_liability',
        'accounts_payable',
        'long_term_liabilities',
        'non_current_liabilities',
      ];
      const classified = accounts
        .filter((a) => Math.abs(balanceById.get(a.id) || 0) > 0.001)
        .every(
          (a) =>
            !['asset', 'assets', 'liability', 'liabilities'].includes(a.account_type) ||
            (['asset', 'assets'].includes(a.account_type) ? knownAssetTypes : knownLiabilityTypes).includes(
              a.account_subtype || ''
            )
        );
      const quickClassified =
        classified &&
        !accounts.some(
          (a) =>
            ['current_asset', 'current_assets'].includes(a.account_subtype || '') &&
            Math.abs(balanceById.get(a.id) || 0) > 0.001
        );
      // Missing classifications and zero denominators are unavailable ratios, never zero.
      // Calculate financial ratios
      const ratios: FinancialRatio[] = [
        {
          name: 'نسبة التداول',
          value: classified && currentLiabilities !== 0 ? currentAssets / currentLiabilities : null,
          description: 'الأصول المتداولة / الخصوم المتداولة',
        },
        {
          name: 'النسبة السريعة',
          value:
            quickClassified && currentLiabilities !== 0
              ? (currentAssets - sumSubtype(['inventory', 'prepaid_expenses'])) / currentLiabilities
              : null,
          description: 'الأصول السريعة / الخصوم المتداولة',
        },
        {
          name: 'هامش الربح الصافي',
          value: totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : null,
          percentage: true,
          description: 'الربح الصافي / إجمالي الإيرادات',
        },
        {
          name: 'العائد على الأصول',
          value: totalAssets !== 0 ? (netIncome / totalAssets) * 100 : null,
          percentage: true,
          description: 'الربح الصافي / إجمالي الأصول',
        },
        {
          name: 'العائد على حقوق الملكية',
          value: totalEquity !== 0 ? (netIncome / totalEquity) * 100 : null,
          percentage: true,
          description: 'الربح الصافي / حقوق الملكية',
        },
        {
          name: 'نسبة الدين إلى حقوق الملكية',
          value: totalEquity !== 0 ? totalLiabilities / totalEquity : null,
          description: 'إجمالي الالتزامات / حقوق الملكية',
        },
      ];

      const balanceSheet: BalanceSheetData = {
        assets: {
          current: currentAssets,
          fixed: fixedAssets,
          total: totalAssets,
        },
        liabilities: {
          current: currentLiabilities,
          longTerm: longTermLiabilities,
          total: totalLiabilities,
        },
        equity: totalEquity,
      };

      const incomeStatement: IncomeStatementData = {
        revenue: totalRevenue,
        expenses: totalExpenses,
        netIncome,
      };

      return {
        ratios,
        classificationComplete: classified,
        period: { from: periodFrom, to: today },
        balanceSheet,
        incomeStatement,
        trends: [
          {
            name: 'الإيرادات',
            current: totalRevenue,
            previous: previousYearRevenue,
            change: previousYearRevenue
              ? ((totalRevenue - previousYearRevenue) / previousYearRevenue) * 100
              : 0,
            trend:
              totalRevenue > previousYearRevenue
                ? ('up' as const)
                : totalRevenue < previousYearRevenue
                ? ('down' as const)
                : ('stable' as const),
          },
          {
            name: 'المصروفات',
            current: totalExpenses,
            previous: previousYearExpenses,
            change: previousYearExpenses
              ? ((totalExpenses - previousYearExpenses) / previousYearExpenses) * 100
              : 0,
            trend:
              totalExpenses > previousYearExpenses
                ? ('up' as const)
                : totalExpenses < previousYearExpenses
                ? ('down' as const)
                : ('stable' as const),
          },
          {
            name: 'الربح الصافي',
            current: netIncome,
            previous: previousNetIncome,
            change: previousNetIncome ? ((netIncome - previousNetIncome) / previousNetIncome) * 100 : 0,
            trend:
              netIncome > previousNetIncome
                ? ('up' as const)
                : netIncome < previousNetIncome
                ? ('down' as const)
                : ('stable' as const),
          },
        ],
        budgetComparison,
        historicalComparison: [
          {
            currentYear: totalRevenue,
            previousYear: previousYearRevenue,
            change: totalRevenue - previousYearRevenue,
            changePercentage: previousYearRevenue
              ? ((totalRevenue - previousYearRevenue) / previousYearRevenue) * 100
              : 0,
            metric: 'الإيرادات',
          },
          {
            currentYear: totalExpenses,
            previousYear: previousYearExpenses,
            change: totalExpenses - previousYearExpenses,
            changePercentage: previousYearExpenses
              ? ((totalExpenses - previousYearExpenses) / previousYearExpenses) * 100
              : 0,
            metric: 'المصروفات',
          },
          {
            currentYear: netIncome,
            previousYear: previousNetIncome,
            change: netIncome - previousNetIncome,
            changePercentage: previousNetIncome
              ? ((netIncome - previousNetIncome) / previousNetIncome) * 100
              : 0,
            metric: 'الربح الصافي',
          },
        ],
        forecast: [] as ForecastData[],
      };
    },
    enabled: !!companyId,
  });
};

export interface StatementAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string | null;
  account_name_translated: string;
  account_type: string;
  current_balance: number;
}
export const useBalanceSheet = () => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['balanceSheet', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const balances = await readAccountBalances(companyId!);
      const grouped: Record<string, StatementAccount[]> = { assets: [], liabilities: [], equity: [] };
      let unclosed = 0;
      for (const row of balances) {
        const type =
          { asset: 'assets', liability: 'liabilities', expense: 'expenses', income: 'revenue' }[
            row.account_type
          ] || row.account_type;
        if (type === 'revenue') unclosed += row.total_credits - row.total_debits;
        if (type === 'expenses') unclosed += row.total_credits - row.total_debits;
        if (!grouped[type]) continue;
        grouped[type].push({
          id: row.account_id,
          account_code: row.account_code,
          account_type: type,
          account_name: row.account_name,
          account_name_ar: row.account_name_ar,
          account_name_translated: getAccountNameTranslation(row.account_name),
          current_balance: row.closing_balance,
        });
      }
      if (Math.abs(unclosed) > 0.001)
        grouped.equity.push({
          id: 'unclosed-earnings',
          account_code: 'RESULT',
          account_type: 'equity',
          account_name: 'Unclosed earnings',
          account_name_translated: 'نتيجة الأعمال غير المقفلة',
          current_balance: unclosed,
        });
      return grouped;
    },
  });
};
export const useIncomeStatement = () => {
  const { companyId } = useUnifiedCompanyAccess();
  return useQuery({
    queryKey: ['incomeStatement', companyId],
    enabled: Boolean(companyId),
    queryFn: async () => {
      const accounts = await readIncomeStatementAccounts(companyId!, financeToday().slice(0, 4) + '-01-01');
      const grouped: Record<string, StatementAccount[]> = { revenue: [], expenses: [] };
      for (const account of accounts) {
        const type = ['revenue', 'income'].includes(account.account_type) ? 'revenue' : 'expenses';
        grouped[type].push({
          ...account,
          account_name_translated: getAccountNameTranslation(account.account_name),
        });
      }
      return grouped;
    },
  });
};
