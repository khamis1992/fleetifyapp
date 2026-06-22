import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

interface BudgetVarianceItem {
  account_id: string
  account_name: string
  account_type: string
  budgeted_amount: number
  actual_amount: number
  variance: number
  variance_percentage: number
}

export const useBudgetVarianceReport = (budgetId: string) => {
  return useQuery({
    queryKey: ["budget-variance-report", budgetId],
    queryFn: async () => {
      // Get budget items with account details
      const { data: budgetItems, error: budgetError } = await supabase
        .from("budget_items")
        .select(`
          *,
          account:chart_of_accounts(
            id,
            account_name,
            account_type,
            current_balance
          )
        `)
        .eq("budget_id", budgetId)

      if (budgetError) {
        console.error("Error fetching budget items:", budgetError)
        throw budgetError
      }

      // Transform data for variance report
      const varianceData: BudgetVarianceItem[] = (budgetItems || []).map(item => {
        const actualAmount = Number(item.account?.current_balance || 0)
        const budgetedAmount = Number(item.budgeted_amount || 0)
        const variance = actualAmount - budgetedAmount
        const variancePercentage = budgetedAmount !== 0 ? (variance / budgetedAmount) * 100 : 0

        return {
          account_id: item.account_id,
          account_name: item.account?.account_name || '',
          account_type: item.account?.account_type || '',
          budgeted_amount: budgetedAmount,
          actual_amount: actualAmount,
          variance,
          variance_percentage: variancePercentage
        }
      })

      return varianceData
    },
    enabled: !!budgetId
  })
}