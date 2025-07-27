import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Car,
  Clock,
  Target,
  AlertCircle
} from "lucide-react"
import { useFleetAnalytics } from "@/hooks/useFleetAnalytics"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

export function FleetAnalyticsDashboard() {
  const { data: analytics, isLoading } = useFleetAnalytics()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Financial Performance */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalRevenue?.toFixed(3) || '0.000'} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              من جميع العقود
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics?.monthlyRevenue?.toFixed(3) || '0.000'} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              هذا الشهر
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تكاليف الصيانة</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analytics?.totalMaintenanceCost?.toFixed(3) || '0.000'} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              إجمالي التكاليف
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الاستخدام</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.averageUtilization?.toFixed(1) || '0.0'}%
            </div>
            <Progress value={analytics?.averageUtilization || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              مؤشرات الأداء
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">متوسط السعر اليومي</span>
              <Badge variant="secondary">
                {analytics?.averageDailyRate?.toFixed(3) || '0.000'} د.ك
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">عدد العقود النشطة</span>
              <Badge variant="secondary">
                {analytics?.activeContracts || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">متوسط عمر الأسطول</span>
              <Badge variant="secondary">
                {analytics?.averageAge?.toFixed(1) || '0.0'} سنة
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">تغطية التأمين</span>
              <Badge 
                variant={analytics && analytics.insuranceCoverage > 90 ? "default" : "destructive"}
              >
                {analytics?.insuranceCoverage?.toFixed(1) || '0.0'}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              حالة الصيانة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">صيانة مجدولة</span>
              <Badge variant="secondary">
                {analytics?.maintenanceScheduled || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">صيانة متأخرة</span>
              <Badge variant={analytics && analytics.maintenanceOverdue > 0 ? "destructive" : "secondary"}>
                {analytics?.maintenanceOverdue || 0}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">تكلفة الصيانة الشهرية</span>
              <Badge variant="outline">
                {analytics?.monthlyMaintenanceCost?.toFixed(3) || '0.000'} د.ك
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              التنبيهات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics?.maintenanceOverdue && analytics.maintenanceOverdue > 0 && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-800">
                  {analytics.maintenanceOverdue} مركبة تحتاج صيانة عاجلة
                </span>
              </div>
            )}
            {analytics?.insuranceCoverage && analytics.insuranceCoverage < 90 && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  تغطية التأمين أقل من 90%
                </span>
              </div>
            )}
            {(!analytics?.maintenanceOverdue || analytics.maintenanceOverdue === 0) && 
             (!analytics?.insuranceCoverage || analytics.insuranceCoverage >= 90) && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-800">
                  جميع المؤشرات ضمن المعدل الطبيعي
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>اتجاهات الإيرادات (آخر 12 شهر)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.revenueByMonth?.slice(-6).map((month, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">{month.month}</div>
                  <Badge variant="outline">{month.contracts} عقد</Badge>
                </div>
                <div className="text-sm font-bold">
                  {month.revenue.toFixed(3)} د.ك
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Utilization */}
      <Card>
        <CardHeader>
          <CardTitle>أداء المركبات الفردية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics?.utilizationByVehicle?.slice(0, 10).map((vehicle, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span className="text-sm font-medium">{vehicle.plateNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{vehicle.utilization.toFixed(1)}%</span>
                    <Badge variant="outline">
                      {vehicle.revenue.toFixed(3)} د.ك
                    </Badge>
                  </div>
                </div>
                <Progress value={vehicle.utilization} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}