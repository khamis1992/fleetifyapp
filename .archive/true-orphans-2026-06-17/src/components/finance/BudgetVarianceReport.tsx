import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { useBudgetVarianceReport } from "@/hooks/useBudgetIntegration"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"

interface BudgetVarianceReportProps {
  budgetId: string
}

export function BudgetVarianceReport({ budgetId }: BudgetVarianceReportProps) {
  const { data: varianceData, isLoading } = useBudgetVarianceReport(budgetId)
  const { formatCurrency } = useCurrencyFormatter()

  const getVarianceStatus = (variance: number) => {
    if (variance > 0) return { icon: TrendingUp, color: "text-success", label: "تحت الموازنة" }
    if (variance < 0) return { icon: TrendingDown, color: "text-destructive", label: "تجاوز الموازنة" }
    return { icon: Minus, color: "text-muted-foreground", label: "ضمن الموازنة" }
  }

  const getProgressValue = (actual: number, budgeted: number) => {
    if (budgeted === 0) return 0
    return Math.min((actual / budgeted) * 100, 100)
  }

  const getProgressColor = (percentage: number) => {
    if (percentage <= 80) return "bg-success"
    if (percentage <= 95) return "bg-warning"
    return "bg-destructive"
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تقرير تباين الموازنة</CardTitle>
          <CardDescription>مقارنة المبالغ المخططة مع الفعلية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!varianceData || varianceData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>تقرير تباين الموازنة</CardTitle>
          <CardDescription>لا توجد بيانات متاحة لهذه الموازنة</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // تجميع البيانات حسب نوع الحساب
  const revenueItems = varianceData.filter(item => item.account_type === 'revenue')
  const expenseItems = varianceData.filter(item => item.account_type === 'expenses')

  return (
    <div className="space-y-6">
      {/* إجماليات الإيرادات */}
      {revenueItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-success">الإيرادات</CardTitle>
            <CardDescription>
              مقارنة الإيرادات المخططة مع الفعلية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحساب</TableHead>
                  <TableHead className="text-right">المخطط</TableHead>
                  <TableHead className="text-right">الفعلي</TableHead>
                  <TableHead className="text-right">التباين</TableHead>
                  <TableHead className="text-right">النسبة</TableHead>
                  <TableHead className="text-center">التقدم</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueItems.map((item) => {
                  const { icon: Icon, color, label } = getVarianceStatus(item.variance_amount)
                  const progressValue = getProgressValue(item.actual_amount, item.budgeted_amount)
                  
                  return (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_name_ar || item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.budgeted_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.actual_amount)}
                      </TableCell>
                      <TableCell className={`text-right ${color}`}>
                        {formatCurrency(Math.abs(item.variance_amount))}
                      </TableCell>
                      <TableCell className={`text-right ${color}`}>
                        {item.variance_percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <div className="w-full max-w-[100px] mx-auto">
                          <Progress 
                            value={progressValue} 
                            className="h-2"
                          />
                          <span className="text-xs text-muted-foreground mt-1 block text-center">
                            {progressValue.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={color}>
                          <Icon className="h-3 w-3 ml-1" />
                          {label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* إجماليات المصروفات */}
      {expenseItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">المصروفات</CardTitle>
            <CardDescription>
              مقارنة المصروفات المخططة مع الفعلية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحساب</TableHead>
                  <TableHead className="text-right">المخطط</TableHead>
                  <TableHead className="text-right">الفعلي</TableHead>
                  <TableHead className="text-right">التباين</TableHead>
                  <TableHead className="text-right">النسبة</TableHead>
                  <TableHead className="text-center">التقدم</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseItems.map((item) => {
                  const { icon: Icon, color, label } = getVarianceStatus(item.variance_amount)
                  const progressValue = getProgressValue(item.actual_amount, item.budgeted_amount)
                  
                  return (
                    <TableRow key={item.account_id}>
                      <TableCell className="font-medium">
                        {item.account_name_ar || item.account_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.budgeted_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.actual_amount)}
                      </TableCell>
                      <TableCell className={`text-right ${color}`}>
                        {formatCurrency(Math.abs(item.variance_amount))}
                      </TableCell>
                      <TableCell className={`text-right ${color}`}>
                        {item.variance_percentage.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        <div className="w-full max-w-[100px] mx-auto">
                          <Progress 
                            value={progressValue} 
                            className={`h-2 ${getProgressColor(progressValue)}`}
                          />
                          <span className="text-xs text-muted-foreground mt-1 block text-center">
                            {progressValue.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={color}>
                          <Icon className="h-3 w-3 ml-1" />
                          {label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}