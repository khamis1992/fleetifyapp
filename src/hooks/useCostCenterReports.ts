import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

interface CostCenterFinancialData {
  totalBudget: number
  totalActual: number
  utilizationRate: number
  variance: number
  costCenterDistribution: Array<{
    name: string
    value: number
  }>
  budgetVsActual: Array<{
    name: string
    budget: number
    actual: number
  }>
  performanceData: Array<{
    id: string
    code: string
    name: string
    budget: number
    actual: number
    remaining: number
    utilization: number
  }>
  varianceAnalysis: Array<{
    name: string
    variance: number
  }>
  monthlyTrends: Array<{
    month: string
    amount: number
  }>
}

export const useCostCenterFinancialData = (costCenterId: string, period: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['costCenterFinancialData', user?.profile?.company_id, costCenterId, period],
    queryFn: async (): Promise<CostCenterFinancialData> => {
      if (!user?.profile?.company_id) throw new Error('Company ID is required')
      
      // Get cost centers with budget and actual data
      const costCentersQuery = supabase
        .from('cost_centers')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)
      
      if (costCenterId !== 'all') {
        costCentersQuery.eq('id', costCenterId)
      }
      
      const { data: costCenters, error: costCentersError } = await costCentersQuery
      if (costCentersError) throw costCentersError
      
      // Use posted journal lines as the period source of truth. The cached
      // actual_amount on cost_centers is not period-specific.
      const startDate = getStartDateForPeriod(period)
      const endDate = getEndDateForPeriod(period)
      
      const { data: journalLines, error: journalError } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entries!inner(
            entry_date,
            company_id,
            status
          )
        `)
        .eq('journal_entries.company_id', user.profile.company_id)
        .eq('journal_entries.status', 'posted')
        .gte('journal_entries.entry_date', startDate)
        .lte('journal_entries.entry_date', endDate)
        .not('cost_center_id', 'is', null)
      
      if (journalError) throw journalError
      
      // Calculate totals
      const actualByCostCenter = new Map<string, number>()
      const monthlyTotals = new Map<string, number>()

      for (const line of journalLines || []) {
        if (!line.cost_center_id) continue

        const amount = Number(line.debit_amount || 0) - Number(line.credit_amount || 0)
        actualByCostCenter.set(
          line.cost_center_id,
          (actualByCostCenter.get(line.cost_center_id) || 0) + amount
        )

        const entry = Array.isArray(line.journal_entries)
          ? line.journal_entries[0]
          : line.journal_entries
        if (entry?.entry_date) {
          const monthKey = entry.entry_date.slice(0, 7)
          monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + amount)
        }
      }

      const totalBudget = costCenters?.reduce((sum, cc) => sum + Number(cc.budget_amount || 0), 0) || 0
      const totalActual = costCenters?.reduce(
        (sum, cc) => sum + (actualByCostCenter.get(cc.id) || 0),
        0
      ) || 0
      const utilizationRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0
      const variance = totalBudget > 0 ? ((totalActual - totalBudget) / totalBudget) * 100 : 0
      
      // Cost center distribution
      const costCenterDistribution = costCenters?.map(cc => ({
        name: cc.center_name,
        value: actualByCostCenter.get(cc.id) || 0
      })) || []
      
      // Budget vs Actual
      const budgetVsActual = costCenters?.map(cc => ({
        name: cc.center_name,
        budget: Number(cc.budget_amount || 0),
        actual: actualByCostCenter.get(cc.id) || 0
      })) || []
      
      // Performance data
      const performanceData = costCenters?.map(cc => {
        const budget = Number(cc.budget_amount || 0)
        const actual = actualByCostCenter.get(cc.id) || 0
        const remaining = budget - actual
        const utilization = budget > 0 ? (actual / budget) * 100 : 0
        
        return {
          id: cc.id,
          code: cc.center_code,
          name: cc.center_name,
          budget,
          actual,
          remaining,
          utilization
        }
      }) || []
      
      // Variance analysis
      const varianceAnalysis = costCenters?.map(cc => {
        const budget = Number(cc.budget_amount || 0)
        const actual = actualByCostCenter.get(cc.id) || 0
        const variance = budget > 0 ? ((actual - budget) / budget) * 100 : 0
        
        return {
          name: cc.center_name,
          variance
        }
      }) || []
      
      const monthFormatter = new Intl.DateTimeFormat('ar-QA', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC'
      })
      const monthlyTrends = Array.from(monthlyTotals.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([monthKey, amount]) => ({
          month: monthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`)),
          amount
        }))
      
      return {
        totalBudget,
        totalActual,
        utilizationRate,
        variance,
        costCenterDistribution,
        budgetVsActual,
        performanceData,
        varianceAnalysis,
        monthlyTrends
      }
    },
    enabled: !!user?.profile?.company_id
  })
}

function getStartDateForPeriod(period: string): string {
  const now = new Date()
  
  switch (period) {
    case 'current-month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    case 'last-month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return lastMonth.toISOString().split('T')[0]
    }
    case 'current-quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]
    }
    case 'current-year':
      return new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  }
}

function getEndDateForPeriod(period: string): string {
  const now = new Date()
  
  switch (period) {
    case 'current-month':
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    case 'last-month':
      return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    case 'current-quarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      return new Date(now.getFullYear(), (quarter + 1) * 3, 0).toISOString().split('T')[0]
    }
    case 'current-year':
      return new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
    default:
      return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  }
}

// Hook for detailed cost center analysis
export const useCostCenterAnalysis = (costCenterId: string) => {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: ['costCenterAnalysis', user?.profile?.company_id, costCenterId],
    queryFn: async () => {
      if (!user?.profile?.company_id || !costCenterId) throw new Error('Required parameters missing')
      
      // Get cost center details
      const { data: costCenter, error: centerError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('id', costCenterId)
        .eq('company_id', user.profile.company_id)
        .single()
      
      if (centerError) throw centerError
      
      // Get all journal entries related to this cost center
      const { data: journalLines, error: journalError } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entries!inner(
            entry_date,
            description,
            entry_number,
            company_id
          ),
          chart_of_accounts(
            account_name,
            account_code,
            account_type
          )
        `)
        .eq('cost_center_id', costCenterId)
        .eq('journal_entries.company_id', user.profile.company_id)
        .order('journal_entries.entry_date', { ascending: false })
      
      if (journalError) throw journalError
      
      // Get contracts related to this cost center
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select(`
          *,
          customers(
            first_name,
            last_name,
            company_name
          )
        `)
        .eq('cost_center_id', costCenterId)
        .eq('company_id', user.profile.company_id)
      
      if (contractsError) throw contractsError
      
      return {
        costCenter,
        journalLines: journalLines || [],
        contracts: contracts || []
      }
    },
    enabled: !!user?.profile?.company_id && !!costCenterId
  })
}
