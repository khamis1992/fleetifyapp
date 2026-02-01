import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Activity,
  Settings,
  Zap,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { useContractHealthMonitor } from '@/hooks/useContractHealthMonitor'
import { cn } from '@/lib/utils'
import { StatCardNumber } from '@/components/ui/NumberDisplay'

export const ContractHealthDashboard: React.FC = () => {
  const {
    healthIssues,
    healthStats,
    creationRequirements,
    isLoadingHealth,
    isLoadingRequirements,
    checkHealth,
    checkRequirements,
    cleanup,
    processPending,
    isCleaningUp,
    isProcessingPending,
    hasUnresolvedCriticalIssues,
    requiresAttention,
    canManageHealth
  } = useContractHealthMonitor()

  if (!canManageHealth) {
    return null
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-destructive" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning" />
      case 'good':
      default:
        return <CheckCircle className="h-5 w-5 text-success" />
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'destructive'
      case 'warning':
        return 'destructive' // استخدام destructive بدلاً من warning
      case 'good':
      default:
        return 'default'
    }
  }

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive'
      case 'high':
        return 'destructive'
      case 'medium':
        return 'destructive' // استخدام destructive بدلاً من warning
      case 'low':
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      {/* تنبيهات عاجلة */}
      {hasUnresolvedCriticalIssues && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>تحذير: مشاكل حرجة في النظام</AlertTitle>
          <AlertDescription>
            يوجد {healthStats.criticalIssues} مشكلة حرجة تتطلب انتباهًا فوريًا لضمان عمل نظام العقود بشكل صحيح.
          </AlertDescription>
        </Alert>
      )}

      {requiresAttention && !hasUnresolvedCriticalIssues && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>انتباه: مشاكل تتطلب المراجعة</AlertTitle>
          <AlertDescription>
            يوجد {healthStats.warningIssues} تحذير يحتاج للمراجعة لتحسين أداء النظام.
          </AlertDescription>
        </Alert>
      )}

      {/* لوحة الحالة الصحية العامة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حالة النظام</CardTitle>
            {getHealthStatusIcon(healthStats.healthStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={getHealthStatusColor(healthStats.healthStatus) as any}>
                {healthStats.healthStatus === 'good' ? 'سليم' : 
                 healthStats.healthStatus === 'warning' ? 'تحذير' : 'حرج'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {healthStats.totalIssues === 0 ? 'لا توجد مشاكل' : `${healthStats.totalIssues} مشكلة`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مشاكل حرجة</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <StatCardNumber value={healthStats.criticalIssues} className="text-destructive" />
            <p className="text-xs text-muted-foreground">
              تتطلب حلاً فورياً
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تحذيرات</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <StatCardNumber value={healthStats.warningIssues} className="text-warning" />
            <p className="text-xs text-muted-foreground">
              تحتاج للمراجعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معلومات</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <StatCardNumber value={healthStats.infoIssues} className="text-primary" />
            <p className="text-xs text-muted-foreground">
              إشعارات عامة
            </p>
          </CardContent>
        </Card>
      </div>

      {/* إجراءات الصيانة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إجراءات الصيانة
          </CardTitle>
          <CardDescription>
            أدوات للحفاظ على سلامة وكفاءة نظام العقود
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => checkHealth()}
              disabled={isLoadingHealth}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoadingHealth && "animate-spin")} />
              فحص الحالة الصحية
            </Button>

            <Button
              onClick={() => cleanup()}
              disabled={isCleaningUp}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Zap className={cn("h-4 w-4", isCleaningUp && "animate-pulse")} />
              تنظيف البيانات
            </Button>

            <Button
              onClick={() => processPending()}
              disabled={isProcessingPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TrendingUp className={cn("h-4 w-4", isProcessingPending && "animate-pulse")} />
              معالجة العقود المعلقة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* متطلبات إنشاء العقود */}
      {creationRequirements && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              متطلبات إنشاء العقود
            </CardTitle>
            <CardDescription>
              التحقق من توفر جميع المتطلبات اللازمة لإنشاء العقود
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {creationRequirements.valid ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <span className={cn(
                  "font-medium",
                  creationRequirements.valid ? "text-success" : "text-destructive"
                )}>
                  {creationRequirements.valid ? 'جميع المتطلبات متوفرة' : 'يوجد متطلبات مفقودة'}
                </span>
              </div>

              {!creationRequirements.valid && (
                <div className="space-y-2">
                  <h4 className="font-medium text-destructive">المتطلبات المفقودة:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {creationRequirements.missing_requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>

                  <h4 className="font-medium text-primary">التوصيات:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {creationRequirements.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button
                onClick={() => checkRequirements()}
                disabled={isLoadingRequirements}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingRequirements && "animate-spin")} />
                إعادة فحص المتطلبات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* قائمة المشاكل المكتشفة */}
      {healthIssues && healthIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              المشاكل المكتشفة ({healthIssues.length})
            </CardTitle>
            <CardDescription>
              قائمة بجميع المشاكل التي تم اكتشافها في النظام
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthIssues.map((issue, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                      {issue.severity === 'critical' ? 'حرج' :
                       issue.severity === 'high' ? 'عالي' :
                       issue.severity === 'medium' ? 'متوسط' : 'منخفض'}
                    </Badge>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {issue.contract_id.slice(0, 8)}...
                    </code>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{issue.issue_description}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      <strong>نوع المشكلة:</strong> {issue.issue_type}
                    </p>
                    <p className="text-sm text-primary mt-1">
                      <strong>الحل المقترح:</strong> {issue.recommended_action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* حالة عدم وجود مشاكل */}
      {healthIssues && healthIssues.length === 0 && !isLoadingHealth && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h3 className="text-lg font-medium">النظام يعمل بكفاءة</h3>
              <p className="text-muted-foreground">
                لا توجد مشاكل في نظام العقود حالياً
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}