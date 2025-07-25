import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns"

export interface CostCenterPerformance {
  costCenterId: string
  centerName: string
  budgetAmount: number
  actualAmount: number
  variance: number
  variancePercentage: number
  efficiency: number
}

export interface CashFlowAnalysis {
  operatingCashFlow: number
  investingCashFlow: number
  financingCashFlow: number
  netCashFlow: number
  cashFlowRatio: number
}

export interface FinancialHealthScore {
  score: number
  rating: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical'
  factors: {
    liquidity: number
    profitability: number
    efficiency: number
    leverage: number
  }
}

export interface MonthlyTrend {
  month: string
  revenue: number
  expenses: number
  netIncome: number
  marginPercentage: number
}

export const useAdvancedFinancialAnalytics = () => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ["advancedFinancialAnalytics", user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) throw new Error("Company ID required")

      // Get cost center performance
      const { data: costCenters } = await supabase
        .from("cost_centers")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)

      // Get journal entries with cost center information
      const { data: journalEntriesWithCostCenters } = await supabase
        .from("journal_entry_lines")
        .select(`
          *,
          cost_center_id,
          debit_amount,
          credit_amount,
          journal_entries (
            entry_date,
            status,
            company_id
          ),
          cost_centers (
            id,
            center_name,
            budget_amount
          )
        `)
        .eq("journal_entries.company_id", user.profile.company_id)
        .eq("journal_entries.status", "posted")
        .not("cost_center_id", "is", null)

      // Get monthly trends for the last 12 months
      const monthlyTrends: MonthlyTrend[] = []
      for (let i = 11; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i))
        const monthEnd = endOfMonth(subMonths(new Date(), i))
        
        const { data: monthlyJournalEntries } = await supabase
          .from("journal_entries")
          .select(`
            *,
            journal_entry_lines (
              *,
              chart_of_accounts (
                account_type
              )
            )
          `)
          .eq("company_id", user.profile.company_id)
          .gte("entry_date", format(monthStart, 'yyyy-MM-dd'))
          .lte("entry_date", format(monthEnd, 'yyyy-MM-dd'))
          .eq("status", "posted")

        const monthlyRevenue = monthlyJournalEntries?.reduce((total, entry) => {
          return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
            if (line.chart_of_accounts?.account_type === 'revenue') {
              return lineTotal + Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
            }
            return lineTotal
          }, 0) || 0)
        }, 0) || 0

        const monthlyExpenses = monthlyJournalEntries?.reduce((total, entry) => {
          return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
            if (line.chart_of_accounts?.account_type === 'expenses') {
              return lineTotal + Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
            }
            return lineTotal
          }, 0) || 0)
        }, 0) || 0

        const monthlyNetIncome = monthlyRevenue - monthlyExpenses
        const marginPercentage = monthlyRevenue > 0 ? (monthlyNetIncome / monthlyRevenue) * 100 : 0

        monthlyTrends.push({
          month: format(monthStart, 'yyyy-MM'),
          revenue: monthlyRevenue,
          expenses: monthlyExpenses,
          netIncome: monthlyNetIncome,
          marginPercentage
        })
      }

      // Calculate cost center performance
      const costCenterPerformance: CostCenterPerformance[] = costCenters?.map(center => {
        // Find all journal entries for this cost center
        const centerJournalEntries = journalEntriesWithCostCenters?.filter(
          entry => entry.cost_center_id === center.id
        ) || []

        const actualAmount = centerJournalEntries.reduce((total, line) => {
          return total + Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
        }, 0)

        const budgetAmount = Number(center.budget_amount || 0)
        const variance = actualAmount - budgetAmount
        const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0
        const efficiency = budgetAmount > 0 ? Math.max(0, 100 - Math.abs(variancePercentage)) : 0

        return {
          costCenterId: center.id,
          centerName: center.center_name,
          budgetAmount,
          actualAmount,
          variance,
          variancePercentage,
          efficiency
        }
      }) || []

      // Calculate cash flow analysis (simplified)
      const currentYear = new Date().getFullYear()
      const { data: currentYearEntries } = await supabase
        .from("journal_entries")
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (
              account_type,
              account_subtype
            )
          )
        `)
        .eq("company_id", user.profile.company_id)
        .gte("entry_date", `${currentYear}-01-01`)
        .lte("entry_date", `${currentYear}-12-31`)
        .eq("status", "posted")

      const operatingCashFlow = currentYearEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_type === 'revenue' || 
              line.chart_of_accounts?.account_type === 'expenses') {
            return lineTotal + Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      const investingCashFlow = currentYearEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_subtype === 'fixed_assets') {
            return lineTotal - Number(line.debit_amount || 0) + Number(line.credit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      const financingCashFlow = currentYearEntries?.reduce((total, entry) => {
        return total + (entry.journal_entry_lines?.reduce((lineTotal, line) => {
          if (line.chart_of_accounts?.account_subtype === 'long_term_liabilities' ||
              line.chart_of_accounts?.account_type === 'equity') {
            return lineTotal + Number(line.credit_amount || 0) - Number(line.debit_amount || 0)
          }
          return lineTotal
        }, 0) || 0)
      }, 0) || 0

      const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow
      const cashFlowRatio = operatingCashFlow > 0 ? netCashFlow / operatingCashFlow : 0

      const cashFlowAnalysis: CashFlowAnalysis = {
        operatingCashFlow,
        investingCashFlow,
        financingCashFlow,
        netCashFlow,
        cashFlowRatio
      }

      // Calculate financial health score
      const latestTrend = monthlyTrends[monthlyTrends.length - 1]
      const avgMargin = monthlyTrends.reduce((sum, trend) => sum + trend.marginPercentage, 0) / monthlyTrends.length
      
      const liquidityScore = Math.min(100, Math.max(0, 60 + (cashFlowRatio * 20)))
      const profitabilityScore = Math.min(100, Math.max(0, avgMargin * 5))
      const efficiencyScore = costCenterPerformance.reduce((sum, center) => sum + center.efficiency, 0) / Math.max(1, costCenterPerformance.length)
      const leverageScore = Math.min(100, Math.max(0, 80 - Math.abs(avgMargin - 15)))

      const overallScore = (liquidityScore + profitabilityScore + efficiencyScore + leverageScore) / 4

      let rating: FinancialHealthScore['rating'] = 'Critical'
      if (overallScore >= 80) rating = 'Excellent'
      else if (overallScore >= 65) rating = 'Good'
      else if (overallScore >= 50) rating = 'Average'
      else if (overallScore >= 35) rating = 'Poor'

      const financialHealthScore: FinancialHealthScore = {
        score: overallScore,
        rating,
        factors: {
          liquidity: liquidityScore,
          profitability: profitabilityScore,
          efficiency: efficiencyScore,
          leverage: leverageScore
        }
      }

      return {
        monthlyTrends,
        costCenterPerformance,
        cashFlowAnalysis,
        financialHealthScore
      }
    },
    enabled: !!user?.profile?.company_id
  })
}