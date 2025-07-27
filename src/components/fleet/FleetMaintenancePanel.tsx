import { useState } from "react"
import { Plus, Calendar, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MaintenanceForm } from "@/components/fleet/MaintenanceForm"
import { useVehicleMaintenance } from "@/hooks/useVehicles"

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800", 
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
}

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة", 
  high: "عالية",
  urgent: "عاجلة"
}

const statusColors = {
  pending: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

const statusLabels = {
  pending: "معلقة",
  in_progress: "قيد التنفيذ", 
  completed: "مكتملة",
  cancelled: "ملغية"
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />
    case 'in_progress':
      return <Wrench className="h-4 w-4" />
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'cancelled':
      return <AlertTriangle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

export function FleetMaintenancePanel() {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const { data: maintenance, isLoading } = useVehicleMaintenance()

  const pendingMaintenance = maintenance?.filter(m => m.status === 'pending') || []
  const inProgressMaintenance = maintenance?.filter(m => m.status === 'in_progress') || []
  const completedMaintenance = maintenance?.filter(m => m.status === 'completed') || []
  
  // Calculate overdue maintenance
  const today = new Date()
  const overdueMaintenance = pendingMaintenance.filter(m => 
    m.scheduled_date && new Date(m.scheduled_date) < today
  )

  // Calculate monthly maintenance cost
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const monthlyMaintenanceCost = completedMaintenance
    .filter(m => {
      const completedDate = new Date(m.completed_date || '')
      return completedDate.getMonth() === currentMonth && 
             completedDate.getFullYear() === currentYear
    })
    .reduce((total, m) => total + (m.actual_cost || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Maintenance Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">إدارة الصيانة</h2>
          <p className="text-muted-foreground">
            جدولة ومتابعة صيانة المركبات
          </p>
        </div>
        <Button onClick={() => setShowMaintenanceForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          جدولة صيانة
        </Button>
      </div>

      {/* Maintenance Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الصيانة المعلقة</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingMaintenance.length}</div>
            <p className="text-xs text-muted-foreground">
              في انتظار التنفيذ
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressMaintenance.length}</div>
            <p className="text-xs text-muted-foreground">
              يتم العمل عليها
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedMaintenance.length}</div>
            <p className="text-xs text-muted-foreground">
              تم إنجازها
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التكلفة الشهرية</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyMaintenanceCost.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">
              هذا الشهر
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {overdueMaintenance.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              تنبيه: صيانة متأخرة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              يوجد {overdueMaintenance.length} مركبة تحتاج لصيانة عاجلة
            </p>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">
            المعلقة ({pendingMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            قيد التنفيذ ({inProgressMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            المكتملة ({completedMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            الكل ({maintenance?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <MaintenanceTable maintenance={pendingMaintenance} />
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          <MaintenanceTable maintenance={inProgressMaintenance} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <MaintenanceTable maintenance={completedMaintenance} />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <MaintenanceTable maintenance={maintenance || []} />
        </TabsContent>
      </Tabs>

      {/* Maintenance Form */}
      {showMaintenanceForm && (
        <MaintenanceForm 
          open={showMaintenanceForm}
          onOpenChange={setShowMaintenanceForm}
        />
      )}
    </div>
  )
}

function MaintenanceTable({ maintenance }: { maintenance: any[] }) {
  if (maintenance.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">لا توجد عمليات صيانة</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {maintenance.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status={item.status} />
                  <span className="font-medium">{item.maintenance_number}</span>
                  <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                    {priorityLabels[item.priority as keyof typeof priorityLabels]}
                  </Badge>
                  <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                    {statusLabels[item.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {item.scheduled_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.scheduled_date).toLocaleDateString()}
                    </span>
                  )}
                  {item.estimated_cost && (
                    <span>التكلفة المقدرة: {item.estimated_cost.toFixed(3)} د.ك</span>
                  )}
                  {item.actual_cost && (
                    <span>التكلفة الفعلية: {item.actual_cost.toFixed(3)} د.ك</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}