import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MoreVertical, Wrench, Clock, CheckCircle, XCircle, AlertTriangle, Plus, Car, Settings } from "lucide-react"
import { SmartAlertsPanel } from "@/components/dashboard/SmartAlertsPanel"
import { useSmartAlerts } from "@/hooks/useSmartAlerts"
import { MaintenanceForm } from "@/components/fleet/MaintenanceForm"
import { useVehicleMaintenance } from "@/hooks/useVehicles"
import { useMaintenanceVehicles } from "@/hooks/useMaintenanceVehicles"
import { useVehicleStatusUpdate, useCompleteMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { ResponsivePageActions } from "@/components/ui/responsive-page-actions"

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

const statusLabels = {
  pending: "معلقة",
  in_progress: "قيد التنفيذ", 
  completed: "مكتملة",
  cancelled: "ملغية"
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
}

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية", 
  urgent: "عاجلة"
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />
    case 'in_progress':
      return <Wrench className="h-4 w-4" />
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'cancelled':
      return <XCircle className="h-4 w-4" />
    default:
      return <AlertTriangle className="h-4 w-4" />
  }
}

export default function Maintenance() {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  
  const { data: maintenanceRecords, isLoading: maintenanceLoading } = useVehicleMaintenance()
  const { data: maintenanceVehicles, isLoading: maintenanceVehiclesLoading } = useMaintenanceVehicles()
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts()
  const { formatCurrency } = useCurrencyFormatter()
  const completeMaintenanceStatus = useCompleteMaintenanceStatus()
  const vehicleStatusUpdate = useVehicleStatusUpdate()

  const pendingMaintenance = maintenanceRecords?.filter(m => m.status === 'pending') || []
  const inProgressMaintenance = maintenanceRecords?.filter(m => m.status === 'in_progress') || []
  const completedMaintenance = maintenanceRecords?.filter(m => m.status === 'completed') || []
  const cancelledMaintenance = maintenanceRecords?.filter(m => m.status === 'cancelled') || []

  const isLoading = maintenanceLoading || alertsLoading || maintenanceVehiclesLoading

  // Handler to complete maintenance and return vehicle to fleet
  const handleCompleteMaintenance = async (maintenanceId: string, vehicleId: string) => {
    try {
      await completeMaintenanceStatus.mutateAsync({ vehicleId, maintenanceId });
    } catch (error) {
      console.error('Failed to complete maintenance:', error);
    }
  };

  // Handler to return vehicle to available status without completing maintenance record
  const handleReturnVehicleToFleet = async (vehicleId: string) => {
    try {
      await vehicleStatusUpdate.mutateAsync({ 
        vehicleId, 
        newStatus: 'available',
        reason: 'Returned to fleet from maintenance'
      });
    } catch (error) {
      console.error('Failed to return vehicle to fleet:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const allRecords = maintenanceRecords || []

  const MaintenanceTable = ({ records }: { records: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>رقم الصيانة</TableHead>
          <TableHead>المركبة</TableHead>
          <TableHead>النوع</TableHead>
          <TableHead>الأولوية</TableHead>
          <TableHead>المجدولة</TableHead>
          <TableHead>التكلفة</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((maintenance) => (
          <TableRow key={maintenance.id}>
            <TableCell className="font-medium">
              {maintenance.maintenance_number}
            </TableCell>
            <TableCell>
              <div>
                <div className="font-medium">
                  {maintenance.vehicles?.plate_number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {maintenance.vehicles?.make} {maintenance.vehicles?.model}
                </div>
              </div>
            </TableCell>
            <TableCell className="capitalize">
              {maintenance.maintenance_type === 'routine' ? 'دورية' :
               maintenance.maintenance_type === 'repair' ? 'إصلاح' :
               maintenance.maintenance_type === 'emergency' ? 'طارئة' :
               maintenance.maintenance_type}
            </TableCell>
            <TableCell>
              <Badge className={priorityColors[maintenance.priority as keyof typeof priorityColors]}>
                {priorityLabels[maintenance.priority as keyof typeof priorityLabels]}
              </Badge>
            </TableCell>
            <TableCell>
              {maintenance.scheduled_date 
                ? new Date(maintenance.scheduled_date).toLocaleDateString('en-GB')
                : 'غير محدد'}
            </TableCell>
            <TableCell>
              <div>
                {maintenance.actual_cost > 0 && (
                  <div className="font-medium">{formatCurrency(maintenance.actual_cost)}</div>
                )}
                {maintenance.estimated_cost > 0 && (
                  <div className="text-sm text-muted-foreground">
                    المقدرة: {formatCurrency(maintenance.estimated_cost)}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge className={statusColors[maintenance.status as keyof typeof statusColors]}>
                <StatusIcon status={maintenance.status} />
                <span className="ml-1">{statusLabels[maintenance.status as keyof typeof statusLabels]}</span>
              </Badge>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>عرض التفاصيل</DropdownMenuItem>
                  <DropdownMenuItem>تعديل</DropdownMenuItem>
                  {maintenance.status === 'pending' && (
                    <DropdownMenuItem>بدء الصيانة</DropdownMenuItem>
                  )}
                  {maintenance.status === 'in_progress' && (
                    <DropdownMenuItem>إكمال</DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive">
                    إلغاء
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div className="space-y-6">
      <ResponsivePageActions
        title="إدارة الصيانة"
        subtitle="جدولة ومتابعة صيانة المركبات"
        primaryAction={{
          id: 'schedule-maintenance',
          label: 'جدولة صيانة',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setShowMaintenanceForm(true)
        }}
      />

      {/* Smart Alerts Panel */}
      {smartAlerts && smartAlerts.length > 0 && (
        <SmartAlertsPanel 
          alerts={smartAlerts} 
          loading={alertsLoading}
        />
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد الصيانة</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{maintenanceVehicles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              مركبات في الصيانة
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معلقة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingMaintenance.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressMaintenance.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedMaintenance.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">تكلفة هذا الشهر</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                completedMaintenance.reduce((sum, m) => sum + (m.actual_cost || 0), 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Records */}
      <Tabs defaultValue="vehicles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vehicles">
            مركبات قيد الصيانة ({maintenanceVehicles?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="pending">
            معلقة ({pendingMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            قيد التنفيذ ({inProgressMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            مكتملة ({completedMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            الكل ({allRecords?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Vehicles Currently in Maintenance */}
        <TabsContent value="vehicles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                المركبات قيد الصيانة
              </CardTitle>
              <CardDescription>
                المركبات التي تم نقلها إلى قسم الصيانة ولا تظهر في قائمة الأسطول
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceVehicles && maintenanceVehicles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم اللوحة</TableHead>
                      <TableHead>المركبة</TableHead>
                      <TableHead>المسافة</TableHead>
                      <TableHead>آخر صيانة</TableHead>
                      <TableHead className="w-[100px]">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">
                          {vehicle.plate_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {vehicle.make} {vehicle.model}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              سنة: {vehicle.year}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle.current_mileage 
                            ? `${vehicle.current_mileage.toLocaleString()} كم`
                            : 'غير مسجلة'
                          }
                        </TableCell>
                        <TableCell>
                          {vehicle.last_maintenance_date 
                            ? new Date(vehicle.last_maintenance_date).toLocaleDateString('en-GB')
                            : 'لا يوجد سجل'
                          }
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setShowMaintenanceForm(true)}>
                                <Settings className="h-4 w-4 mr-2" />
                                جدولة صيانة
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleReturnVehicleToFleet(vehicle.id)}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                إرجاع للأسطول
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد مركبات قيد الصيانة حالياً</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    عندما يتم تغيير حالة مركبة إلى "قيد الصيانة" ستظهر هنا
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الصيانة المعلقة</CardTitle>
              <CardDescription>طلبات الصيانة في انتظار التنفيذ</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingMaintenance.length > 0 ? (
                <MaintenanceTable records={pendingMaintenance} />
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات صيانة معلقة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الصيانة قيد التنفيذ</CardTitle>
              <CardDescription>أعمال الصيانة النشطة حالياً</CardDescription>
            </CardHeader>
            <CardContent>
              {inProgressMaintenance.length > 0 ? (
                <MaintenanceTable records={inProgressMaintenance} />
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أعمال صيانة قيد التنفيذ</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الصيانة المكتملة</CardTitle>
              <CardDescription>أعمال الصيانة المكتملة مؤخراً</CardDescription>
            </CardHeader>
            <CardContent>
              {completedMaintenance.length > 0 ? (
                <MaintenanceTable records={completedMaintenance} />
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد سجلات صيانة مكتملة</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جميع سجلات الصيانة</CardTitle>
              <CardDescription>تاريخ الصيانة الكامل</CardDescription>
            </CardHeader>
            <CardContent>
              {allRecords && allRecords.length > 0 ? (
                <MaintenanceTable records={allRecords} />
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لم يتم العثور على سجلات صيانة</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowMaintenanceForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    جدولة أول صيانة
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MaintenanceForm 
        open={showMaintenanceForm}
        onOpenChange={setShowMaintenanceForm}
      />
    </div>
  )
}