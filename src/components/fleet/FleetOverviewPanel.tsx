import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Car, 
  TrendingUp, 
  Wrench, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Calendar,
  Shield,
  Fuel,
  Clock
} from "lucide-react"
import { useVehicles } from "@/hooks/useVehicles"
import { useFleetStatus } from "@/hooks/useFleetStatus"
import { useFleetAnalytics } from "@/hooks/useFleetAnalytics"

export function FleetOverviewPanel() {
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles()
  const { data: fleetStatus } = useFleetStatus()
  const { data: fleetAnalytics } = useFleetAnalytics()

  const availableVehicles = vehicles?.filter(v => v.status === 'available') || []
  const rentedVehicles = vehicles?.filter(v => v.status === 'rented') || []
  const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance') || []
  const outOfServiceVehicles = vehicles?.filter(v => v.status === 'out_of_service') || []

  // Calculate utilization rate
  const utilizationRate = vehicles && vehicles.length > 0 
    ? ((rentedVehicles.length / vehicles.length) * 100) 
    : 0

  // Calculate maintenance rate
  const maintenanceRate = vehicles && vehicles.length > 0 
    ? ((maintenanceVehicles.length / vehicles.length) * 100) 
    : 0

  // Calculate upcoming expirations
  const upcomingInsuranceExpirations = vehicles?.filter(v => {
    if (!v.insurance_end_date) return false
    const expiry = new Date(v.insurance_end_date)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow
  }).length || 0

  const upcomingRegistrationExpirations = vehicles?.filter(v => {
    if (!v.registration_expiry) return false
    const expiry = new Date(v.registration_expiry)
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow
  }).length || 0

  if (vehiclesLoading) {
    return <div>جاري التحميل...</div>
  }

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المركبات</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vehicles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              في الأسطول
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الاستخدام</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{utilizationRate.toFixed(1)}%</div>
            <Progress value={utilizationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الشهرية</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fleetAnalytics?.monthlyRevenue?.toFixed(3) || '0.000'} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              من العقود النشطة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تكاليف الصيانة</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {fleetAnalytics?.monthlyMaintenanceCost?.toFixed(3) || '0.000'} د.ك
            </div>
            <p className="text-xs text-muted-foreground">
              هذا الشهر
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات المتاحة</CardTitle>
            <Car className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              جاهزة للإيجار
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات المؤجرة</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{rentedVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              حالياً تحت العقد
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الصيانة</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{maintenanceVehicles.length}</div>
            <Progress value={maintenanceRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">خارج الخدمة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfServiceVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج لإنتباه
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              انتهاء صلاحيات التأمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingInsuranceExpirations > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>المركبات المتأثرة</span>
                  <Badge variant="destructive">{upcomingInsuranceExpirations}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  تنتهي خلال 30 يوم القادمة
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                جميع التأمينات سارية المفعول
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              انتهاء صلاحيات التسجيل
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingRegistrationExpirations > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>المركبات المتأثرة</span>
                  <Badge variant="destructive">{upcomingRegistrationExpirations}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  تنتهي خلال 30 يوم القادمة
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                جميع التسجيلات سارية المفعول
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>الإجراءات السريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <Car className="h-4 w-4" />
              <span className="text-sm">إضافة مركبة جديدة</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <Wrench className="h-4 w-4" />
              <span className="text-sm">جدولة صيانة</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">تقرير الأداء</span>
            </div>
            <div className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">التحليل المالي</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}