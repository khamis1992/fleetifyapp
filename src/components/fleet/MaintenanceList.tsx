import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MoreVertical, Wrench, Clock, CheckCircle, XCircle, AlertTriangle, Plus } from "lucide-react"
import { useVehicleMaintenance } from "@/hooks/useVehicles"
import { MaintenanceForm } from "./MaintenanceForm"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
}

const statusLabels = {
  pending: "Pending",
  in_progress: "In Progress", 
  completed: "Completed",
  cancelled: "Cancelled"
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
}

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High", 
  urgent: "Urgent"
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

export function MaintenanceList() {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const { data: maintenanceRecords, isLoading } = useVehicleMaintenance()
  const { formatCurrency } = useCurrencyFormatter()

  const pendingMaintenance = maintenanceRecords?.filter(m => m.status === 'pending') || []
  const inProgressMaintenance = maintenanceRecords?.filter(m => m.status === 'in_progress') || []
  const completedMaintenance = maintenanceRecords?.filter(m => m.status === 'completed') || []
  const cancelledMaintenance = maintenanceRecords?.filter(m => m.status === 'cancelled') || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const MaintenanceTable = ({ records }: { records: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Maintenance #</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Scheduled</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Status</TableHead>
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
              {maintenance.maintenance_type}
            </TableCell>
            <TableCell>
              <Badge className={priorityColors[maintenance.priority as keyof typeof priorityColors]}>
                {priorityLabels[maintenance.priority as keyof typeof priorityLabels]}
              </Badge>
            </TableCell>
            <TableCell>
              {maintenance.scheduled_date 
                ? new Date(maintenance.scheduled_date).toLocaleDateString()
                : 'Not scheduled'}
            </TableCell>
            <TableCell>
              <div>
                {maintenance.actual_cost > 0 && (
                  <div className="font-medium">{formatCurrency(maintenance.actual_cost)}</div>
                )}
                {maintenance.estimated_cost > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Est: {formatCurrency(maintenance.estimated_cost)}
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
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  <DropdownMenuItem>Edit</DropdownMenuItem>
                  {maintenance.status === 'pending' && (
                    <DropdownMenuItem>Start Maintenance</DropdownMenuItem>
                  )}
                  {maintenance.status === 'in_progress' && (
                    <DropdownMenuItem>Complete</DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="text-destructive">
                    Cancel
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Maintenance Management</h2>
          <p className="text-muted-foreground">
            Schedule and track vehicle maintenance
          </p>
        </div>
        <Button onClick={() => setShowMaintenanceForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Maintenance
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
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
            <CardTitle className="text-sm font-medium">This Month Cost</CardTitle>
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
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgressMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedMaintenance.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({maintenanceRecords?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Maintenance</CardTitle>
              <CardDescription>Maintenance requests awaiting action</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingMaintenance.length > 0 ? (
                <MaintenanceTable records={pendingMaintenance} />
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending maintenance requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>In Progress Maintenance</CardTitle>
              <CardDescription>Currently active maintenance work</CardDescription>
            </CardHeader>
            <CardContent>
              {inProgressMaintenance.length > 0 ? (
                <MaintenanceTable records={inProgressMaintenance} />
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No maintenance work in progress</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Maintenance</CardTitle>
              <CardDescription>Recently completed maintenance work</CardDescription>
            </CardHeader>
            <CardContent>
              {completedMaintenance.length > 0 ? (
                <MaintenanceTable records={completedMaintenance} />
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No completed maintenance records</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Maintenance Records</CardTitle>
              <CardDescription>Complete maintenance history</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceRecords && maintenanceRecords.length > 0 ? (
                <MaintenanceTable records={maintenanceRecords} />
              ) : (
                <div className="text-center py-8">
                  <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No maintenance records found</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowMaintenanceForm(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule First Maintenance
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