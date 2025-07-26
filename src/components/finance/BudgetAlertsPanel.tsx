import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Check, X } from "lucide-react"
import { useBudgetAlerts, useAcknowledgeBudgetAlert } from "@/hooks/useBudgetIntegration"
import { formatCurrency } from "@/lib/utils"

export function BudgetAlertsPanel() {
  const { data: alerts, isLoading } = useBudgetAlerts()
  const acknowledgeMutation = useAcknowledgeBudgetAlert()

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate(alertId)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            تنبيهات الموازنة
          </CardTitle>
          <CardDescription>
            تنبيهات تجاوز الموازنة والمراقبة المالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-success" />
            تنبيهات الموازنة
          </CardTitle>
          <CardDescription>
            لا توجد تنبيهات حالياً - جميع الموازنات في حدودها المحددة
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          تنبيهات الموازنة
          <Badge variant="destructive" className="mr-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          تنبيهات تجاوز الموازنة التي تحتاج إلى انتباه
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <Alert key={alert.id} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium">
                  {alert.message_ar || alert.message}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span>
                    تجاوز بنسبة: {alert.current_percentage.toFixed(1)}%
                  </span>
                  <span>
                    المبلغ المتجاوز: {formatCurrency(alert.amount_exceeded)}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(alert.created_at).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAcknowledge(alert.id)}
                disabled={acknowledgeMutation.isPending}
                className="shrink-0 mr-4"
              >
                <Check className="h-4 w-4 ml-2" />
                تأكيد
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}