import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

export interface FinancialRatio {
  name: string
  value: number
  percentage?: boolean
  description: string
}

export interface FinancialMetric {
  name: string
  current: number
  previous: number
  change: number
  trend: 'up' | 'down' | 'stable'
}

export interface BalanceSheetData {
  assets: {
    current: number
    fixed: number
    total: number
  }
  liabilities: {
    current: number
    longTerm: number
    total: number
  }
  equity: number
}

export interface IncomeStatementData {
  revenue: number
  expenses: number
  grossProfit: number
  netIncome: number
}

export const useFinancialAnalysis = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["financialAnalysis", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID required")

      // Get all accounts with current balances
      const { data: accounts, error: accountsError } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)

      if (accountsError) throw accountsError

      // Calculate balance sheet data
      const assets = accounts?.filter(acc => acc.account_type === 'assets') || []
      const liabilities = accounts?.filter(acc => acc.account_type === 'liabilities') || []
      const equity = accounts?.filter(acc => acc.account_type === 'equity') || []
      const revenue = accounts?.filter(acc => acc.account_type === 'revenue') || []
      const expenses = accounts?.filter(acc => acc.account_type === 'expenses') || []

      const currentAssets = assets
        .filter(acc => acc.account_subtype === 'current_assets')
        .reduce((sum, acc) => sum + Number(acc.current_balance), 0)

      const fixedAssets = assets
        .filter(acc => acc.account_subtype === 'fixed_assets')
        .reduce((sum, acc) => sum + Number(acc.current_balance), 0)

      const totalAssets = assets.reduce((sum, acc) => sum + Number(acc.current_balance), 0)

      const currentLiabilities = liabilities
        .filter(acc => acc.account_subtype === 'current_liabilities')
        .reduce((sum, acc) => sum + Number(acc.current_balance), 0)

      const longTermLiabilities = liabilities
        .filter(acc => acc.account_subtype === 'long_term_liabilities')
        .reduce((sum, acc) => sum + Number(acc.current_balance), 0)

      const totalLiabilities = liabilities.reduce((sum, acc) => sum + Number(acc.current_balance), 0)
      const totalEquity = equity.reduce((sum, acc) => sum + Number(acc.current_balance), 0)

      const totalRevenue = revenue.reduce((sum, acc) => sum + Number(acc.current_balance), 0)
      const totalExpenses = expenses.reduce((sum, acc) => sum + Number(acc.current_balance), 0)
      const netIncome = totalRevenue - totalExpenses

      // Calculate financial ratios
      const ratios: FinancialRatio[] = [
        {
          name: "نسبة التداول",
          value: currentLiabilities !== 0 ? currentAssets / currentLiabilities : 0,
          description: "الأصول المتداولة / الخصوم المتداولة"
        },
        {
          name: "النسبة السريعة",
          value: currentLiabilities !== 0 ? (currentAssets - 0) / currentLiabilities : 0, // Assuming no inventory for now
          description: "الأصول السريعة / الخصوم المتداولة"
        },
        {
          name: "هامش الربح الصافي",
          value: totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0,
          percentage: true,
          description: "الربح الصافي / إجمالي الإيرادات"
        },
        {
          name: "العائد على الأصول",
          value: totalAssets !== 0 ? (netIncome / totalAssets) * 100 : 0,
          percentage: true,
          description: "الربح الصافي / إجمالي الأصول"
        },
        {
          name: "العائد على حقوق الملكية",
          value: totalEquity !== 0 ? (netIncome / totalEquity) * 100 : 0,
          percentage: true,
          description: "الربح الصافي / حقوق الملكية"
        },
        {
          name: "نسبة الدين إلى حقوق الملكية",
          value: totalEquity !== 0 ? totalLiabilities / totalEquity : 0,
          description: "إجمالي الالتزامات / حقوق الملكية"
        }
      ]

      const balanceSheet: BalanceSheetData = {
        assets: {
          current: currentAssets,
          fixed: fixedAssets,
          total: totalAssets
        },
        liabilities: {
          current: currentLiabilities,
          longTerm: longTermLiabilities,
          total: totalLiabilities
        },
        equity: totalEquity
      }

      const incomeStatement: IncomeStatementData = {
        revenue: totalRevenue,
        expenses: totalExpenses,
        grossProfit: totalRevenue - 0, // Simplified - no COGS calculation for now
        netIncome
      }

      return {
        ratios,
        balanceSheet,
        incomeStatement,
        trends: [
          {
            name: "الإيرادات",
            current: totalRevenue,
            previous: 0, // TODO: Get previous period data
            change: 0,
            trend: 'stable' as const
          },
          {
            name: "المصروفات", 
            current: totalExpenses,
            previous: 0,
            change: 0,
            trend: 'stable' as const
          },
          {
            name: "الربح الصافي",
            current: netIncome,
            previous: 0,
            change: 0,
            trend: 'stable' as const
          }
        ]
      }
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useBalanceSheet = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["balanceSheet", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID required")

      const { data: accounts, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .in("account_type", ["assets", "liabilities", "equity"])
        .order("account_type, account_code")

      if (error) throw error

      return accounts?.reduce((acc, account) => {
        if (!acc[account.account_type]) {
          acc[account.account_type] = []
        }
        acc[account.account_type].push(account)
        return acc
      }, {} as Record<string, any[]>)
    },
    enabled: !!user?.profile?.company_id
  })
}

export const useIncomeStatement = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["incomeStatement", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID required")

      const { data: accounts, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .in("account_type", ["revenue", "expenses"])
        .order("account_type, account_code")

      if (error) throw error

      return accounts?.reduce((acc, account) => {
        if (!acc[account.account_type]) {
          acc[account.account_type] = []
        }
        acc[account.account_type].push(account)
        return acc
      }, {} as Record<string, any[]>)
    },
    enabled: !!user?.profile?.company_id
  })
}