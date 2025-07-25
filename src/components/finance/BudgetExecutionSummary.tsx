import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from "lucide-react"
import { useBudgetExecutionSummary } from "@/hooks/useBudgetIntegration"
import { formatCurrency } from "@/lib/utils"

interface BudgetExecutionSummaryProps {
  budgetYear: number
}

export function BudgetExecutionSummary({ budgetYear }: BudgetExecutionSummaryProps) {
  const { data: summary, isLoading } = useBudgetExecutionSummary(budgetYear)

  const getPerformanceStatus = (performance: number) => {
    if (performance >= 100) return { color: "text-success", bg: "bg-success/10", label: "ممتاز" }
    if (performance >= 80) return { color: "text-success", bg: "bg-success/10", label: "جيد" }
    if (performance >= 60) return { color: "text-warning", bg: "bg-warning/10", label: "مقبول" }
    return { color: "text-destructive", bg: "bg-destructive/10", label: "ضعيف" }
  }

  const getVarianceColor = (variance: number) => {
    return variance >= 0 ? "text-success" : "text-destructive"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ملخص تنفيذ الموازنة {budgetYear}</CardTitle>
          <CardDescription>نظرة عامة على أداء الموازنة السنوية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>ملخص تنفيذ الموازنة {budgetYear}</CardTitle>
          <CardDescription>لا توجد بيانات متاحة لهذه السنة</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const performanceStatus = getPerformanceStatus(summary.overall_performance)
  const revenuePerformance = summary.total_budgeted_revenue > 0 
    ? (summary.total_actual_revenue / summary.total_budgeted_revenue) * 100 
    : 0
  const expensePerformance = summary.total_budgeted_expenses > 0 
    ? (summary.total_actual_expenses / summary.total_budgeted_expenses) * 100 
    : 0

  return (
    <div className="space-y-6">
      {/* الأداء الإجمالي */}
      <Card className={performanceStatus.bg}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              الأداء الإجمالي للموازنة {budgetYear}
            </span>
            <Badge variant="outline" className={performanceStatus.color}>
              {performanceStatus.label}
            </Badge>
          </CardTitle>
          <CardDescription>
            مستوى تحقيق أهداف الموازنة المالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">نسبة التحقيق</span>
                <span className={`text-sm font-bold ${performanceStatus.color}`}>
                  {summary.overall_performance.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(summary.overall_performance, 100)} 
                className="h-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(summary.net_income_actual)}
                </div>
                <div className="text-sm text-muted-foreground">صافي الدخل الفعلي</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {formatCurrency(summary.net_income_budgeted)}
                </div>
                <div className="text-sm text-muted-foreground">صافي الدخل المخطط</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التفاصيل المالية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* الإيرادات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <TrendingUp className="h-5 w-5" />
              الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">الإيرادات المخططة</span>
                <span className="font-medium">
                  {formatCurrency(summary.total_budgeted_revenue)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">الإيرادات الفعلية</span>
                <span className="font-medium">
                  {formatCurrency(summary.total_actual_revenue)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">التباين</span>
                <span className={`font-bold ${getVarianceColor(summary.revenue_variance)}`}>
                  {summary.revenue_variance >= 0 ? '+' : ''}
                  {formatCurrency(summary.revenue_variance)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs">نسبة التحقيق</span>
                <span className="text-xs font-bold">
                  {revenuePerformance.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.min(revenuePerformance, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* المصروفات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrendingDown className="h-5 w-5" />
              المصروفات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">المصروفات المخططة</span>
                <span className="font-medium">
                  {formatCurrency(summary.total_budgeted_expenses)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">المصروفات الفعلية</span>
                <span className="font-medium">
                  {formatCurrency(summary.total_actual_expenses)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">الوفر/التجاوز</span>
                <span className={`font-bold ${getVarianceColor(summary.expense_variance)}`}>
                  {summary.expense_variance >= 0 ? '+' : ''}
                  {formatCurrency(summary.expense_variance)}
                </span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs">نسبة الاستهلاك</span>
                <span className="text-xs font-bold">
                  {expensePerformance.toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={Math.min(expensePerformance, 100)} 
                className={`h-2 ${expensePerformance > 100 ? 'bg-destructive' : ''}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* المؤشرات الرئيسية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            المؤشرات المالية الرئيسية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-success">
                {((summary.total_actual_revenue / summary.total_budgeted_revenue) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">معدل تحقيق الإيرادات</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-lg font-bold text-destructive">
                {((summary.total_actual_expenses / summary.total_budgeted_expenses) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">معدل استهلاك المصروفات</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-lg font-bold ${performanceStatus.color}`}>
                {summary.overall_performance.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">الأداء الإجمالي</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}