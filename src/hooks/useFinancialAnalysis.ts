import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { startOfYear, endOfYear, subYears, format } from "date-fns"
import { getAccountNameTranslation } from "@/lib/accountNamesTranslation"

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

export interface BudgetComparison {
  budgetedRevenue: number
  actualRevenue: number
  budgetedExpenses: number
  actualExpenses: number
  revenueVariance: number
  expenseVariance: number
  revenueVariancePercentage: number
  expenseVariancePercentage: number
}

export interface ForecastData {
  period: string
  revenue: number
  expenses: number
  netIncome: number
  confidence: number
}

export interface HistoricalComparison {
  currentYear: number
  previousYear: number
  change: number
  changePercentage: number
  metric: string
}

export const useFinancialAnalysis = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["financialAnalysis", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID required")

      const currentYear = new Date().getFullYear()
      const previousYear = currentYear - 1
      
      // Get current year journal entries for historical comparison
      const { data: currentJournalEntries } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (
            *,
            account_id,
            debit_amount,
            credit_amount,
            chart_of_accounts!account_id (
              account_type,
              account_subtype,
              account_name
            )
          )
        `)
        .eq("company_id", user.profile.company_id)
        .gte("entry_date", `${currentYear}-01-01`)
        .lte("entry_date", `${currentYear}-12-31`)
        .eq("status", "posted")

      // Get previous year journal entries for comparison
      const { data: previousJournalEntries } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (
            *,
            account_id,
            debit_amount,
            credit_amount,
            chart_of_accounts!account_id (
              account_type,
              account_subtype,
              account_name
            )
          )
        `)
        .eq("company_id", user.profile.company_id)
        .gte("entry_date", `${previousYear}-01-01`)
        .lte("entry_date", `${previousYear}-12-31`)
        .eq("status", "posted")

      // Get budget data for comparison
      const { data: budgets } = await supabase
        .from("budgets")
        .select(`
          *,
          budget_items (
            *,
            chart_of_accounts (
              account_type,
              account_name
            )
          )
        `)
        .eq("company_id", user.profile.company_id)
        .eq("budget_year", currentYear)
        .eq("status", "approved")

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

      // Calculate current year totals from journal entries
      const currentYearRevenue = currentJournalEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_type === 'revenue') {
            return lineTotal + Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      const currentYearExpenses = currentJournalEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_type === 'expenses') {
            return lineTotal + Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      // Calculate previous year totals for comparison
      const previousYearRevenue = previousJournalEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_type === 'revenue') {
            return lineTotal + Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      const previousYearExpenses = previousJournalEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_type === 'expenses') {
            return lineTotal + Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      // If no journal entries, fall back to direct calculations from transactions
      let totalRevenue = currentYearRevenue
      let totalExpenses = currentYearExpenses
      
      // If revenue is zero, try to calculate from contracts and invoices
      if (totalRevenue === 0) {
        // Get revenue from paid invoices
        const { data: paidInvoices } = await supabase
          .from("invoices")
          .select("total_amount")
          .eq("company_id", user.profile.company_id)
          .eq("payment_status", "paid")
          .gte("invoice_date", `${currentYear}-01-01`)
          .lte("invoice_date", `${currentYear}-12-31`)
        
        const invoiceRevenue = paidInvoices?.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0) || 0
        
        // Get revenue from payments
        const { data: payments } = await supabase
          .from("payments")
          .select("amount")
          .eq("company_id", user.profile.company_id)
          .eq("payment_status", "completed")
          .gte("payment_date", `${currentYear}-01-01`)
          .lte("payment_date", `${currentYear}-12-31`)
        
        const paymentRevenue = payments?.reduce((sum, pmt) => sum + Number(pmt.amount || 0), 0) || 0
        
        // Use the higher value between invoices and payments to avoid double counting
        totalRevenue = Math.max(invoiceRevenue, paymentRevenue)
      }
      
      // If expenses are zero, try to calculate from actual expenses
      if (totalExpenses === 0) {
        // Get maintenance expenses
        const { data: maintenanceExpenses } = await supabase
          .from("maintenance_records")
          .select("cost")
          .eq("company_id", user.profile.company_id)
          .gte("maintenance_date", `${currentYear}-01-01`)
          .lte("maintenance_date", `${currentYear}-12-31`)
        
        const maintenanceCost = maintenanceExpenses?.reduce((sum, exp) => sum + Number(exp.cost || 0), 0) || 0
        
        // Get vendor payments as expenses
        const { data: vendorPayments } = await supabase
          .from("vendor_payments")
          .select("amount")
          .eq("company_id", user.profile.company_id)
          .eq("status", "completed")
          .gte("payment_date", `${currentYear}-01-01`)
          .lte("payment_date", `${currentYear}-12-31`)
        
        const vendorCost = vendorPayments?.reduce((sum, vnd) => sum + Number(vnd.amount || 0), 0) || 0
        
        // Get payroll expenses
        const { data: payrollExpenses } = await supabase
          .from("payroll_payments")
          .select("net_salary, total_deductions")
          .eq("company_id", user.profile.company_id)
          .gte("payment_date", `${currentYear}-01-01`)
          .lte("payment_date", `${currentYear}-12-31`)
        
        const payrollCost = payrollExpenses?.reduce((sum, pay) => 
          sum + Number(pay.net_salary || 0) + Number(pay.total_deductions || 0), 0) || 0
        
        totalExpenses = maintenanceCost + vendorCost + payrollCost
        
        // Add estimated 30% for other operational expenses if we have some revenue
        if (totalRevenue > 0 && totalExpenses < totalRevenue * 0.3) {
          totalExpenses = Math.max(totalExpenses, totalRevenue * 0.3)
        }
      }
      
      const netIncome = totalRevenue - totalExpenses
      const previousNetIncome = previousYearRevenue - previousYearExpenses

      // Calculate budget comparison
      const budgetedRevenue = budgets?.[0]?.budget_items?.filter(item => 
        item.chart_of_accounts?.account_type === 'revenue'
      ).reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0) || 0

      const budgetedExpenses = budgets?.[0]?.budget_items?.filter(item => 
        item.chart_of_accounts?.account_type === 'expenses'
      ).reduce((sum, item) => sum + Number(item.budgeted_amount || 0), 0) || 0

      const budgetComparison: BudgetComparison = {
        budgetedRevenue,
        actualRevenue: totalRevenue,
        budgetedExpenses,
        actualExpenses: totalExpenses,
        revenueVariance: totalRevenue - budgetedRevenue,
        expenseVariance: totalExpenses - budgetedExpenses,
        revenueVariancePercentage: budgetedRevenue ? ((totalRevenue - budgetedRevenue) / budgetedRevenue) * 100 : 0,
        expenseVariancePercentage: budgetedExpenses ? ((totalExpenses - budgetedExpenses) / budgetedExpenses) * 100 : 0
      }

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
            previous: previousYearRevenue,
            change: previousYearRevenue ? ((totalRevenue - previousYearRevenue) / previousYearRevenue) * 100 : 0,
            trend: totalRevenue > previousYearRevenue ? 'up' as const : 
                   totalRevenue < previousYearRevenue ? 'down' as const : 'stable' as const
          },
          {
            name: "المصروفات", 
            current: totalExpenses,
            previous: previousYearExpenses,
            change: previousYearExpenses ? ((totalExpenses - previousYearExpenses) / previousYearExpenses) * 100 : 0,
            trend: totalExpenses > previousYearExpenses ? 'up' as const : 
                   totalExpenses < previousYearExpenses ? 'down' as const : 'stable' as const
          },
          {
            name: "الربح الصافي",
            current: netIncome,
            previous: previousNetIncome,
            change: previousNetIncome ? ((netIncome - previousNetIncome) / previousNetIncome) * 100 : 0,
            trend: netIncome > previousNetIncome ? 'up' as const : 
                   netIncome < previousNetIncome ? 'down' as const : 'stable' as const
          }
        ],
        budgetComparison,
        historicalComparison: [
          {
            currentYear: totalRevenue,
            previousYear: previousYearRevenue,
            change: totalRevenue - previousYearRevenue,
            changePercentage: previousYearRevenue ? ((totalRevenue - previousYearRevenue) / previousYearRevenue) * 100 : 0,
            metric: "الإيرادات"
          },
          {
            currentYear: totalExpenses,
            previousYear: previousYearExpenses,
            change: totalExpenses - previousYearExpenses,
            changePercentage: previousYearExpenses ? ((totalExpenses - previousYearExpenses) / previousYearExpenses) * 100 : 0,
            metric: "المصروفات"
          },
          {
            currentYear: netIncome,
            previousYear: previousNetIncome,
            change: netIncome - previousNetIncome,
            changePercentage: previousNetIncome ? ((netIncome - previousNetIncome) / previousNetIncome) * 100 : 0,
            metric: "الربح الصافي"
          }
        ],
        forecast: generateForecast(totalRevenue, totalExpenses, netIncome, previousYearRevenue, previousYearExpenses)
      }
    },
    enabled: !!user?.profile?.company_id
  })
}

// Generate simple forecast based on historical trends
function generateForecast(
  currentRevenue: number,
  currentExpenses: number,
  currentNetIncome: number,
  previousRevenue: number,
  previousExpenses: number
): ForecastData[] {
  const revenueGrowthRate = previousRevenue ? (currentRevenue - previousRevenue) / previousRevenue : 0.05
  const expenseGrowthRate = previousExpenses ? (currentExpenses - previousExpenses) / previousExpenses : 0.03
  
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const nextYear = new Date().getFullYear() + 1
  
  return quarters.map((quarter, index) => {
    const quarterRevenue = (currentRevenue * (1 + revenueGrowthRate)) / 4
    const quarterExpenses = (currentExpenses * (1 + expenseGrowthRate)) / 4
    const quarterNetIncome = quarterRevenue - quarterExpenses
    
    return {
      period: `${nextYear} ${quarter}`,
      revenue: quarterRevenue,
      expenses: quarterExpenses,
      netIncome: quarterNetIncome,
      confidence: Math.max(0.6, 0.9 - (index * 0.1)) // Decreasing confidence over time
    }
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

      // Calculate balances from journal entry lines
      const { data: entryLines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries!inner(status, company_id)
        `)
        .eq("journal_entries.company_id", user.profile.company_id)
        .eq("journal_entries.status", "posted")

      if (linesError) {
        console.error("Error fetching journal entry lines:", linesError)
      }

      // Calculate balance for each account from journal entries
      const accountBalances = new Map<string, number>()
      
      entryLines?.forEach(line => {
        const currentBalance = accountBalances.get(line.account_id) || 0
        const debit = Number(line.debit_amount) || 0
        const credit = Number(line.credit_amount) || 0
        accountBalances.set(line.account_id, currentBalance + debit - credit)
      })

      // Update account balances from journal entries
      accounts?.forEach(account => {
        const calculatedBalance = accountBalances.get(account.id) || 0
        // For liabilities and equity, credit increases balance (so we negate)
        if (account.account_type === 'liabilities' || account.account_type === 'equity') {
          account.current_balance = -calculatedBalance
        } else {
          account.current_balance = calculatedBalance
        }
      })

      return accounts?.reduce((acc, account) => {
        if (!acc[account.account_type]) {
          acc[account.account_type] = []
        }
        // Add translated account name to the account object
        const translatedAccount = {
          ...account,
          account_name_translated: getAccountNameTranslation(account.account_name)
        }
        acc[account.account_type].push(translatedAccount)
        return acc
      }, {} as Record<string, any[]>)
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useIncomeStatement = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["incomeStatement", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID required")

      const currentYear = new Date().getFullYear()

      const { data: accounts, error } = await supabase
        .from("chart_of_accounts")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .in("account_type", ["revenue", "expenses"])
        .order("account_type, account_code")

      if (error) throw error

      // Calculate balances from journal entry lines
      const { data: entryLines, error: linesError } = await supabase
        .from("journal_entry_lines")
        .select(`
          account_id,
          debit_amount,
          credit_amount,
          journal_entries!inner(status, company_id, entry_date)
        `)
        .eq("journal_entries.company_id", user.profile.company_id)
        .eq("journal_entries.status", "posted")
        .gte("journal_entries.entry_date", `${currentYear}-01-01`)
        .lte("journal_entries.entry_date", `${currentYear}-12-31`)

      if (linesError) {
        console.error("Error fetching journal entry lines:", linesError)
      }

      // Calculate balance for each account from journal entries
      const accountBalances = new Map<string, number>()
      
      entryLines?.forEach(line => {
        const currentBalance = accountBalances.get(line.account_id) || 0
        const debit = Number(line.debit_amount) || 0
        const credit = Number(line.credit_amount) || 0
        // For revenue: credit increases, debit decreases
        // For expenses: debit increases, credit decreases
        accountBalances.set(line.account_id, currentBalance + credit - debit)
      })

      // Update account balances from journal entries
      accounts?.forEach(account => {
        const calculatedBalance = accountBalances.get(account.id) || 0
        // For revenue, credit increases balance (positive)
        // For expenses, debit increases balance (so we negate)
        if (account.account_type === 'revenue') {
          account.current_balance = calculatedBalance
        } else if (account.account_type === 'expenses') {
          account.current_balance = -calculatedBalance
        }
      })

      return accounts?.reduce((acc, account) => {
        if (!acc[account.account_type]) {
          acc[account.account_type] = []
        }
        // Add translated account name to the account object
        const translatedAccount = {
          ...account,
          account_name_translated: getAccountNameTranslation(account.account_name)
        }
        acc[account.account_type].push(translatedAccount)
        return acc
      }, {} as Record<string, any[]>)
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}