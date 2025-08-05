import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MoreVertical, Wrench, Clock, CheckCircle, XCircle, AlertTriangle, Plus } from "lucide-react"
import { SmartAlertsPanel } from "@/components/dashboard/SmartAlertsPanel"
import { useVehicleMaintenanceOptimized, useMaintenanceStats } from "@/hooks/useVehicleMaintenanceOptimized"
import { useSmartAlerts } from "@/hooks/useSmartAlerts"
import { MaintenanceForm } from "@/components/fleet/MaintenanceForm"
import { Skeleton } from "@/components/ui/skeleton"

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

// Skeleton component for loading state
function MaintenanceTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MaintenanceTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No maintenance records</h3>
          <p className="text-muted-foreground text-center">
            There are no maintenance records to display.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Type & Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Scheduled Date</TableHead>
            <TableHead className="text-right">Estimated Cost</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((maintenance) => (
            <TableRow key={maintenance.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <StatusIcon status={maintenance.status} />
                  <span>{maintenance.vehicle?.plate_number || 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{maintenance.vehicle?.make} {maintenance.vehicle?.model}</p>
                  <p className="text-sm text-muted-foreground">{maintenance.maintenance_type}</p>
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[maintenance.status as keyof typeof statusColors]}`}>
                  {statusLabels[maintenance.status as keyof typeof statusLabels]}
                </span>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[maintenance.priority as keyof typeof priorityColors]}`}>
                  {priorityLabels[maintenance.priority as keyof typeof priorityLabels]}
                </span>
              </TableCell>
              <TableCell>
                {maintenance.scheduled_date ? new Date(maintenance.scheduled_date).toLocaleDateString() : 'Not scheduled'}
              </TableCell>
              <TableCell className="text-right">
                {maintenance.estimated_cost ? 
                  maintenance.estimated_cost.toLocaleString('en-US', { style: 'currency', currency: 'KWD' }) : 
                  'N/A'
                }
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    {maintenance.status === 'pending' && (
                      <DropdownMenuItem>Start Maintenance</DropdownMenuItem>
                    )}
                    {maintenance.status === 'in_progress' && (
                      <DropdownMenuItem>Complete</DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="text-red-600">Cancel</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

export default function MaintenanceOptimized() {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  
  // Use optimized hooks
  const { data: maintenanceStats, isLoading: statsLoading } = useMaintenanceStats()
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts()
  
  // Only load data for the active tab to improve performance
  const { data: maintenanceData, isLoading: maintenanceLoading } = useVehicleMaintenanceOptimized(
    undefined, // vehicleId
    activeTab === 'all' ? undefined : activeTab, // status filter
    50, // limit
    0 // offset
  )

  // Memoize filtered data to prevent unnecessary recalculations
  const { pendingMaintenance, inProgressMaintenance, completedMaintenance, cancelledMaintenance } = useMemo(() => {
    const records = maintenanceData?.data || []
    return {
      pendingMaintenance: activeTab === 'pending' || activeTab === 'all' ? records.filter(m => m.status === 'pending') : [],
      inProgressMaintenance: activeTab === 'in_progress' || activeTab === 'all' ? records.filter(m => m.status === 'in_progress') : [],
      completedMaintenance: activeTab === 'completed' || activeTab === 'all' ? records.filter(m => m.status === 'completed') : [],
      cancelledMaintenance: activeTab === 'cancelled' || activeTab === 'all' ? records.filter(m => m.status === 'cancelled') : []
    }
  }, [maintenanceData?.data, activeTab])

  // Show skeleton loading for better UX
  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Vehicle Maintenance</h1>
        <Button onClick={() => setShowMaintenanceForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Maintenance
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(maintenanceStats?.pending || 0) === 1 ? "vehicle" : "vehicles"} need maintenance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceStats?.in_progress || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(maintenanceStats?.in_progress || 0) === 1 ? "vehicle" : "vehicles"} under maintenance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceStats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">
              {(maintenanceStats?.completed || 0) === 1 ? "vehicle" : "vehicles"} serviced this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(maintenanceStats?.total_cost_month || 0).toLocaleString('en-US', { style: 'currency', currency: 'KWD' })}
            </div>
            <p className="text-xs text-muted-foreground">total maintenance cost</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({maintenanceStats?.pending || 0})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({maintenanceStats?.in_progress || 0})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({maintenanceStats?.completed || 0})</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {maintenanceLoading ? (
            <MaintenanceTableSkeleton />
          ) : (
            <MaintenanceTable data={pendingMaintenance} />
          )}
        </TabsContent>
        <TabsContent value="in_progress">
          {maintenanceLoading ? (
            <MaintenanceTableSkeleton />
          ) : (
            <MaintenanceTable data={inProgressMaintenance} />
          )}
        </TabsContent>
        <TabsContent value="completed">
          {maintenanceLoading ? (
            <MaintenanceTableSkeleton />
          ) : (
            <MaintenanceTable data={completedMaintenance} />
          )}
        </TabsContent>
        <TabsContent value="all">
          {maintenanceLoading ? (
            <MaintenanceTableSkeleton />
          ) : (
            <MaintenanceTable data={maintenanceData?.data || []} />
          )}
        </TabsContent>
      </Tabs>

      {!alertsLoading && smartAlerts && smartAlerts.length > 0 && (
        <SmartAlertsPanel alerts={smartAlerts} />
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