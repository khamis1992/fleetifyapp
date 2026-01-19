import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { useToast } from "@/hooks/use-toast"

// أنواع البيانات للتكامل
export interface BudgetAlert {
  id: string
  company_id: string
  budget_id: string
  budget_item_id?: string
  alert_type: string
  threshold_percentage: number
  current_percentage: number
  amount_exceeded: number
  message: string
  message_ar?: string
  is_acknowledged: boolean
  acknowledged_by?: string
  acknowledged_at?: string
  created_at: string
  updated_at: string
}

export interface BudgetVarianceReport {
  account_id: string
  account_name: string
  account_name_ar?: string
  account_type: string
  budgeted_amount: number
  actual_amount: number
  variance_amount: number
  variance_percentage: number
  status: 'under_budget' | 'over_budget' | 'on_budget'
}

export interface BudgetExecutionSummary {
  total_budgeted_revenue: number
  total_actual_revenue: number
  total_budgeted_expenses: number
  total_actual_expenses: number
  revenue_variance: number
  expense_variance: number
  net_income_budgeted: number
  net_income_actual: number
  overall_performance: number
}

// Hook لتحديث المبالغ الفعلية للموازنة
export const useUpdateBudgetActuals = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { data, error } = await supabase.rpc('update_budget_actual_amounts', {
        budget_id_param: budgetId
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['budget-items'] })
      toast({
        title: "تم التحديث",
        description: "تم تحديث المبالغ الفعلية للموازنة بنجاح",
      })
    },
    onError: (error) => {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث المبالغ الفعلية",
        variant: "destructive",
      })
    },
  })
}

// Hook لتحديث جميع موازنات الشركة
export const useUpdateAllCompanyBudgets = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Company ID is required")

      const { data, error } = await supabase.rpc('update_all_company_budgets', {
        company_id_param: companyId
      })

      if (error) throw error
      return data
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['budget-items'] })
      toast({
        title: "تم التحديث",
        description: `تم تحديث ${updatedCount} موازنة بنجاح`,
      })
    },
    onError: (error) => {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث الموازنات",
        variant: "destructive",
      })
    },
  })
}

// Hook لجلب تنبيهات الموازنة
export const useBudgetAlerts = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess()

  return useQuery({
    queryKey: getQueryKey(['budget-alerts']),
    queryFn: async () => {
      if (!companyId) return []

      const { data, error } = await supabase
        .from('budget_alerts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as BudgetAlert[]
    },
    enabled: !!companyId,
  })
}

// Hook لتأكيد تنبيه الموازنة
export const useAcknowledgeBudgetAlert = () => {
  const { user } = useUnifiedCompanyAccess()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data, error } = await supabase
        .from('budget_alerts')
        .update({
          is_acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId)

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] })
      toast({
        title: "تم التأكيد",
        description: "تم تأكيد التنبيه بنجاح",
      })
    },
  })
}

// Hook لفحص تجاوز الموازنة
export const useCheckBudgetOverruns = () => {
  const { companyId } = useUnifiedCompanyAccess()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (budgetId: string) => {
      const { data, error } = await supabase.rpc('check_budget_overruns', {
        budget_id_param: budgetId
      })

      if (error) throw error
      return data
    },
    onSuccess: (alertCount) => {
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] })
      if (alertCount > 0) {
        toast({
          title: "تنبيه الموازنة",
          description: `تم إنشاء ${alertCount} تنبيه جديد لتجاوز الموازنة`,
          variant: "destructive",
        })
      }
    },
  })
}

// Hook لجلب تقرير تباين الموازنة
export const useBudgetVarianceReport = (budgetId: string) => {
  const { companyId } = useUnifiedCompanyAccess()

  return useQuery({
    queryKey: ['budget-variance-report', budgetId],
    queryFn: async () => {
      if (!budgetId) return []

      const { data, error } = await supabase
        .from('budget_items')
        .select(`
          *,
          account:chart_of_accounts(
            account_name,
            account_name_ar,
            account_type
          )
        `)
        .eq('budget_id', budgetId)

      if (error) throw error

      return data.map(item => ({
        account_id: item.account_id,
        account_name: item.account?.account_name || '',
        account_name_ar: item.account?.account_name_ar,
        account_type: item.account?.account_type || '',
        budgeted_amount: item.budgeted_amount || 0,
        actual_amount: item.actual_amount || 0,
        variance_amount: item.variance_amount || 0,
        variance_percentage: item.variance_percentage || 0,
        status: item.variance_amount > 0 ? 'under_budget' : 
               item.variance_amount < 0 ? 'over_budget' : 'on_budget'
      })) as BudgetVarianceReport[]
    },
    enabled: !!budgetId,
  })
}

// Hook لجلب ملخص تنفيذ الموازنة
export const useBudgetExecutionSummary = (budgetYear: number) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess()

  return useQuery({
    queryKey: getQueryKey(['budget-execution-summary', budgetYear.toString()]),
    queryFn: async () => {
      if (!companyId) return null

      // جلب بيانات الموازنة للسنة المحددة
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          budget_items!inner(
            *,
            account:chart_of_accounts(account_type)
          )
        `)
        .eq('company_id', companyId)
        .eq('budget_year', budgetYear)
        .in('status', ['approved', 'active'])

      if (budgetError) throw budgetError

      // حساب الإجماليات
      let totalBudgetedRevenue = 0
      let totalActualRevenue = 0
      let totalBudgetedExpenses = 0
      let totalActualExpenses = 0

      budgets.forEach(budget => {
        budget.budget_items.forEach((item: unknown) => {
          if (item.account?.account_type === 'revenue') {
            totalBudgetedRevenue += item.budgeted_amount || 0
            totalActualRevenue += item.actual_amount || 0
          } else if (item.account?.account_type === 'expenses') {
            totalBudgetedExpenses += item.budgeted_amount || 0
            totalActualExpenses += item.actual_amount || 0
          }
        })
      })

      const revenueVariance = totalActualRevenue - totalBudgetedRevenue
      const expenseVariance = totalBudgetedExpenses - totalActualExpenses
      const netIncomeBudgeted = totalBudgetedRevenue - totalBudgetedExpenses
      const netIncomeActual = totalActualRevenue - totalActualExpenses
      
      // حساب الأداء الإجمالي (النسبة المئوية لتحقيق الموازنة)
      const overallPerformance = netIncomeBudgeted !== 0 
        ? (netIncomeActual / netIncomeBudgeted) * 100 
        : 0

      return {
        total_budgeted_revenue: totalBudgetedRevenue,
        total_actual_revenue: totalActualRevenue,
        total_budgeted_expenses: totalBudgetedExpenses,
        total_actual_expenses: totalActualExpenses,
        revenue_variance: revenueVariance,
        expense_variance: expenseVariance,
        net_income_budgeted: netIncomeBudgeted,
        net_income_actual: netIncomeActual,
        overall_performance: overallPerformance
      } as BudgetExecutionSummary
    },
    enabled: !!companyId && !!budgetYear,
  })
}

// Hook لجلب تقرير الموازنة حسب مركز التكلفة
export const useBudgetByCostCenter = (budgetId: string) => {
  const { companyId } = useUnifiedCompanyAccess()

  return useQuery({
    queryKey: ['budget-by-cost-center', budgetId],
    queryFn: async () => {
      if (!budgetId) return []

      const { data, error } = await supabase
        .from('budget_items')
        .select(`
          *,
          account:chart_of_accounts(
            account_name,
            account_name_ar,
            account_type
          )
        `)
        .eq('budget_id', budgetId)

      if (error) throw error

      // تجميع البيانات حسب نوع الحساب
      const groupedData = data.reduce((acc, item) => {
        const accountType = item.account?.account_type || 'other'
        if (!acc[accountType]) {
          acc[accountType] = {
            type: accountType,
            budgeted_total: 0,
            actual_total: 0,
            variance_total: 0,
            items: []
          }
        }
        
        acc[accountType].budgeted_total += item.budgeted_amount || 0
        acc[accountType].actual_total += item.actual_amount || 0
        acc[accountType].variance_total += item.variance_amount || 0
        acc[accountType].items.push(item)

        return acc
      }, {} as any)

      return Object.values(groupedData)
    },
    enabled: !!budgetId,
  })
}