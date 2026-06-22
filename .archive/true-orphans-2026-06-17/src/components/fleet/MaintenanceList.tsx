import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/integrations/supabase/client"
import { useQueryClient } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { MoreVertical, Wrench, Clock, CheckCircle, XCircle, AlertTriangle, Plus, Eye, Edit, Trash2 } from "lucide-react"
import { useVehicleMaintenance } from "@/hooks/useVehicles"
import { MaintenanceForm } from "./MaintenanceForm"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useRolePermissions } from "@/hooks/useRolePermissions"
import { useToast } from "@/components/ui/use-toast"

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
  low: "bg-slate-100 text-slate-800",
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const { data: maintenanceRecords, isLoading } = useVehicleMaintenance()
  const { formatCurrency } = useCurrencyFormatter()
  const { hasPermission } = useRolePermissions()
  
  const canCreate = hasPermission('create_maintenance')
  const canEdit = hasPermission('edit_maintenance')
  const canDelete = hasPermission('delete_maintenance')

  const handleViewDetails = (maintenance: any) => {
    setSelectedMaintenance(maintenance)
    setShowViewDialog(true)
  }

  const handleEdit = (maintenance: any) => {
    setSelectedMaintenance(maintenance)
    setShowEditDialog(true)
  }

  const handleStartMaintenance = async (maintenance: any) => {
    try {
      const { error } = await supabase
        .from('vehicle_maintenance')
        .update({ status: 'in_progress' })
        .eq('id', maintenance.id)
      
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance'] })
      toast({ title: 'تم بدء الصيانة', description: 'تم تحديث حالة الصيانة إلى قيد التنفيذ' })
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' })
    }
  }

  const handleComplete = async (maintenance: any) => {
    try {
      const { error } = await supabase
        .from('vehicle_maintenance')
        .update({ status: 'completed' })
        .eq('id', maintenance.id)
      
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance'] })
      toast({ title: 'تم إكمال الصيانة', description: 'تم تحديث حالة الصيانة إلى مكتملة' })
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث الحالة', variant: 'destructive' })
    }
  }

  const handleCancel = async () => {
    if (!selectedMaintenance) return
    setCancelLoading(true)
    try {
      const { error } = await supabase
        .from('vehicle_maintenance')
        .update({ status: 'cancelled' })
        .eq('id', selectedMaintenance.id)
      
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance'] })
      toast({ title: 'تم الإلغاء', description: 'تم إلغاء طلب الصيانة' })
      setShowCancelDialog(false)
      setSelectedMaintenance(null)
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في إلغاء طلب الصيانة', variant: 'destructive' })
    } finally {
      setCancelLoading(false)
    }
  }

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
                  <DropdownMenuItem onClick={() => handleViewDetails(maintenance)} className="gap-2">
                    <Eye className="h-4 w-4" />
                    عرض التفاصيل
                  </DropdownMenuItem>
                  {canEdit && (
                    <DropdownMenuItem onClick={() => handleEdit(maintenance)} className="gap-2">
                      <Edit className="h-4 w-4" />
                      تعديل
                    </DropdownMenuItem>
                  )}
                  {maintenance.status === 'pending' && canEdit && (
                    <DropdownMenuItem onClick={() => handleStartMaintenance(maintenance)} className="gap-2">
                      <Wrench className="h-4 w-4" />
                      بدء الصيانة
                    </DropdownMenuItem>
                  )}
                  {maintenance.status === 'in_progress' && canEdit && (
                    <DropdownMenuItem onClick={() => handleComplete(maintenance)} className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      إكمال
                    </DropdownMenuItem>
                  )}
                  {canDelete && maintenance.status !== 'cancelled' && (
                    <DropdownMenuItem 
                      className="text-destructive gap-2"
                      onClick={() => { setSelectedMaintenance(maintenance); setShowCancelDialog(true); }}
                    >
                      <XCircle className="h-4 w-4" />
                      إلغاء
                    </DropdownMenuItem>
                  )}
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
        {canCreate && (
          <Button onClick={() => setShowMaintenanceForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
        )}
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
                  {canCreate && (
                    <Button 
                      className="mt-4" 
                      onClick={() => setShowMaintenanceForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule First Maintenance
                    </Button>
                  )}
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

      {/* View Details Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تفاصيل الصيانة</DialogTitle>
          </DialogHeader>
          {selectedMaintenance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">رقم الصيانة</p>
                  <p className="font-medium">{selectedMaintenance.maintenance_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className={statusColors[selectedMaintenance.status as keyof typeof statusColors]}>
                    {statusLabels[selectedMaintenance.status as keyof typeof statusLabels]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المركبة</p>
                  <p className="font-medium">{selectedMaintenance.vehicles?.plate_number}</p>
                  <p className="text-xs text-muted-foreground">{selectedMaintenance.vehicles?.make} {selectedMaintenance.vehicles?.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نوع الصيانة</p>
                  <p className="font-medium">{selectedMaintenance.maintenance_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الأولوية</p>
                  <Badge className={priorityColors[selectedMaintenance.priority as keyof typeof priorityColors]}>
                    {priorityLabels[selectedMaintenance.priority as keyof typeof priorityLabels]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">التكلفة المقدرة</p>
                  <p className="font-medium">{formatCurrency(selectedMaintenance.estimated_cost || 0)}</p>
                </div>
                {selectedMaintenance.actual_cost > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">التكلفة الفعلية</p>
                    <p className="font-medium">{formatCurrency(selectedMaintenance.actual_cost)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ المجدول</p>
                  <p className="font-medium">
                    {selectedMaintenance.scheduled_date 
                      ? new Date(selectedMaintenance.scheduled_date).toLocaleDateString('ar-QA')
                      : 'غير محدد'}
                  </p>
                </div>
              </div>
              {selectedMaintenance.description && (
                <div>
                  <p className="text-sm text-muted-foreground">الوصف</p>
                  <p className="text-sm">{selectedMaintenance.description}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء طلب الصيانة</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إلغاء طلب الصيانة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} disabled={cancelLoading} className="bg-red-600 hover:bg-red-700">
              {cancelLoading ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}