import { useState } from "react"
import { Plus, Car, Wrench, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { VehicleForm } from "@/components/fleet/VehicleForm"
import { VehicleCard } from "@/components/fleet/VehicleCard"
import { MaintenanceList } from "@/components/fleet/MaintenanceList"
import { MaintenanceForm } from "@/components/fleet/MaintenanceForm"
import { FleetAnalytics } from "@/components/fleet/FleetAnalytics"
import { useVehicles, useVehicleMaintenance } from "@/hooks/useVehicles"

export default function Fleet() {
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles()
  const { data: maintenance, isLoading: maintenanceLoading } = useVehicleMaintenance()

  const availableVehicles = vehicles?.filter(v => v.status === 'available') || []
  const rentedVehicles = vehicles?.filter(v => v.status === 'rented') || []
  const maintenanceVehicles = vehicles?.filter(v => v.status === 'maintenance') || []
  const outOfServiceVehicles = vehicles?.filter(v => v.status === 'out_of_service') || []

  const pendingMaintenance = maintenance?.filter(m => m.status === 'pending') || []
  const inProgressMaintenance = maintenance?.filter(m => m.status === 'in_progress') || []

  if (vehiclesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة الأسطول</h1>
          <p className="text-muted-foreground">
            إدارة أسطول المركبات والصيانة والعمليات
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowMaintenanceForm(true)}
          >
            <Wrench className="h-4 w-4 mr-2" />
            جدولة الصيانة
          </Button>
          <Button onClick={() => setShowVehicleForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة مركبة
          </Button>
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات المتاحة</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
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
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{maintenanceVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              يتم صيانتها
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">خارج الخدمة</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outOfServiceVehicles.length}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج لإنتباه
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vehicles">المركبات</TabsTrigger>
          <TabsTrigger value="maintenance">
            الصيانة
            {(pendingMaintenance.length + inProgressMaintenance.length) > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingMaintenance.length + inProgressMaintenance.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="reports">التقارير</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-4">
          {/* Vehicle Status Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedVehicle === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVehicle(null)}
            >
              الكل ({vehicles?.length || 0})
            </Button>
            <Button
              variant={selectedVehicle === "available" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVehicle("available")}
            >
              متاحة ({availableVehicles.length})
            </Button>
            <Button
              variant={selectedVehicle === "rented" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVehicle("rented")}
            >
              مؤجرة ({rentedVehicles.length})
            </Button>
            <Button
              variant={selectedVehicle === "maintenance" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedVehicle("maintenance")}
            >
              قيد الصيانة ({maintenanceVehicles.length})
            </Button>
          </div>

          {/* Vehicle Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles
              ?.filter(vehicle => !selectedVehicle || vehicle.status === selectedVehicle)
              ?.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
          </div>

          {vehicles?.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Car className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد مركبات بعد</h3>
                <p className="text-muted-foreground text-center mb-4">
                  ابدأ في بناء أسطولك عن طريق إضافة أول مركبة
                </p>
                <Button onClick={() => setShowVehicleForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة مركبة
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceList />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <FleetAnalytics />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>تقارير وتحليلات الأسطول</span>
              </CardTitle>
              <CardDescription>
                تقارير شاملة عن أداء الأسطول والتقارير المالية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">تقرير استخدام المركبات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      تتبع استخدام المركبات وكفاءة الإيجار
                    </p>
                    <Button variant="outline" className="mt-3 w-full">
                      إنشاء التقرير
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">تحليل تكاليف الصيانة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      تحليل تكاليف الصيانة والأنماط
                    </p>
                    <Button variant="outline" className="mt-3 w-full">
                      إنشاء التقرير
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">الأداء المالي</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      تحليل الإيرادات والإهلاك والعائد على الاستثمار
                    </p>
                    <Button variant="outline" className="mt-3 w-full">
                      إنشاء التقرير
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showVehicleForm && (
        <VehicleForm 
          open={showVehicleForm} 
          onOpenChange={setShowVehicleForm}
        />
      )}
      
      {showMaintenanceForm && (
        <MaintenanceForm 
          open={showMaintenanceForm} 
          onOpenChange={setShowMaintenanceForm}
        />
      )}
    </div>
  )
}