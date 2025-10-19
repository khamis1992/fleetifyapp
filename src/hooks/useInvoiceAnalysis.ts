import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface InvoiceAnalysisData {
  cost_center_id: string
  center_code: string
  center_name: string
  invoice_type: string
  total_invoices: number
  total_amount: number
  budget_amount: number
  variance_amount: number
  variance_percentage: number
}

export interface InvoiceBudgetComparison {
  period: string
  budgeted_sales: number
  actual_sales: number
  budgeted_purchases: number
  actual_purchases: number
  sales_variance: number
  purchase_variance: number
  sales_variance_percentage: number
  purchase_variance_percentage: number
}

export interface FixedAssetInvoiceData {
  asset_id: string
  asset_name: string
  asset_code: string
  total_purchase_invoices: number
  total_purchase_amount: number
  maintenance_invoices: number
  maintenance_amount: number
  total_cost: number
}

// تحليل الفواتير حسب مراكز التكلفة
export const useInvoiceCostCenterAnalysis = (startDate?: string, endDate?: string) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['invoice-cost-center-analysis', startDate, endDate],
    queryFn: async (): Promise<InvoiceAnalysisData[]> => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID not found')
      }

      let query = supabase
        .from('invoices')
        .select(`
          cost_center_id,
          invoice_type,
          total_amount,
          cost_centers (
            center_code,
            center_name,
            budget_amount
          )
        `)
        .eq('company_id', user.profile.company_id)
        .not('cost_center_id', 'is', null)

      if (startDate) {
        query = query.gte('invoice_date', startDate)
      }
      if (endDate) {
        query = query.lte('invoice_date', endDate)
      }

      const { data, error } = await query

      if (error) throw error

      // تجميع البيانات حسب مركز التكلفة ونوع الفاتورة
      const groupedData = data.reduce((acc: unknown, invoice: any) => {
        const key = `${invoice.cost_center_id}_${invoice.invoice_type}`
        
        if (!acc[key]) {
          acc[key] = {
            cost_center_id: invoice.cost_center_id,
            center_code: invoice.cost_centers?.center_code || '',
            center_name: invoice.cost_centers?.center_name || '',
            invoice_type: invoice.invoice_type,
            total_invoices: 0,
            total_amount: 0,
            budget_amount: invoice.cost_centers?.budget_amount || 0
          }
        }

        acc[key].total_invoices += 1
        acc[key].total_amount += Number(invoice.total_amount)

        return acc
      }, {})

      // حساب الانحرافات
      return Object.values(groupedData).map((item: unknown) => ({
        ...item,
        variance_amount: item.total_amount - item.budget_amount,
        variance_percentage: item.budget_amount > 0 
          ? ((item.total_amount - item.budget_amount) / item.budget_amount) * 100 
          : 0
      }))
    },
    enabled: !!user?.profile?.company_id
  })
}

// مقارنة الفواتير الفعلية بالميزانية
export const useInvoiceBudgetComparison = (year: number) => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['invoice-budget-comparison', year],
    queryFn: async (): Promise<InvoiceBudgetComparison[]> => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID not found')
      }

      // الحصول على بيانات الميزانية
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          *,
          budget_items (
            account_id,
            budgeted_amount,
            chart_of_accounts (
              account_type
            )
          )
        `)
        .eq('company_id', user.profile.company_id)
        .eq('budget_year', year)

      if (budgetError) throw budgetError

      // الحصول على بيانات الفواتير الفعلية
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select('invoice_type, total_amount, invoice_date')
        .eq('company_id', user.profile.company_id)
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`)

      if (invoiceError) throw invoiceError

      // تجميع البيانات حسب الشهر
      const monthlyData: InvoiceBudgetComparison[] = []
      
      for (let month = 1; month <= 12; month++) {
        const monthString = month.toString().padStart(2, '0')
        const period = `${year}-${monthString}`
        
        // حساب الفواتير الفعلية للشهر
        const monthInvoices = invoiceData.filter(invoice => 
          invoice.invoice_date.startsWith(period)
        )
        
        const actualSales = monthInvoices
          .filter(inv => inv.invoice_type === 'sales')
          .reduce((sum, inv) => sum + Number(inv.total_amount), 0)
          
        const actualPurchases = monthInvoices
          .filter(inv => inv.invoice_type === 'purchase')
          .reduce((sum, inv) => sum + Number(inv.total_amount), 0)

        // حساب الميزانية الشهرية (الميزانية السنوية / 12)
        const budget = budgetData[0]
        const monthlySalesBudget = budget ? budget.total_revenue / 12 : 0
        const monthlyPurchaseBudget = budget ? budget.total_expenses / 12 : 0

        monthlyData.push({
          period: `${year}-${monthString}`,
          budgeted_sales: monthlySalesBudget,
          actual_sales: actualSales,
          budgeted_purchases: monthlyPurchaseBudget,
          actual_purchases: actualPurchases,
          sales_variance: actualSales - monthlySalesBudget,
          purchase_variance: actualPurchases - monthlyPurchaseBudget,
          sales_variance_percentage: monthlySalesBudget > 0 
            ? ((actualSales - monthlySalesBudget) / monthlySalesBudget) * 100 
            : 0,
          purchase_variance_percentage: monthlyPurchaseBudget > 0 
            ? ((actualPurchases - monthlyPurchaseBudget) / monthlyPurchaseBudget) * 100 
            : 0
        })
      }

      return monthlyData
    },
    enabled: !!user?.profile?.company_id
  })
}

// تحليل فواتير الأصول الثابتة
export const useFixedAssetInvoiceAnalysis = () => {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['fixed-asset-invoice-analysis'],
    queryFn: async (): Promise<FixedAssetInvoiceData[]> => {
      if (!user?.profile?.company_id) {
        throw new Error('Company ID not found')
      }

      const { data, error } = await supabase
        .from('fixed_assets')
        .select(`
          id,
          asset_name,
          asset_code,
          invoices (
            id,
            invoice_type,
            total_amount,
            notes
          )
        `)
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true)

      if (error) throw error

      return data.map(asset => {
        const invoices = asset.invoices || []
        const purchaseInvoices = invoices.filter(inv => 
          inv.invoice_type === 'purchase' && 
          (!inv.notes || !inv.notes.toLowerCase().includes('maintenance'))
        )
        const maintenanceInvoices = invoices.filter(inv => 
          inv.notes && inv.notes.toLowerCase().includes('maintenance')
        )

        const totalPurchaseAmount = purchaseInvoices.reduce(
          (sum, inv) => sum + Number(inv.total_amount), 0
        )
        const totalMaintenanceAmount = maintenanceInvoices.reduce(
          (sum, inv) => sum + Number(inv.total_amount), 0
        )

        return {
          asset_id: asset.id,
          asset_name: asset.asset_name,
          asset_code: asset.asset_code,
          total_purchase_invoices: purchaseInvoices.length,
          total_purchase_amount: totalPurchaseAmount,
          maintenance_invoices: maintenanceInvoices.length,
          maintenance_amount: totalMaintenanceAmount,
          total_cost: totalPurchaseAmount + totalMaintenanceAmount
        }
      })
    },
    enabled: !!user?.profile?.company_id
  })
}