import { useState, useMemo, lazy, Suspense, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Eye, 
  Edit, 
  Trash2, 
  Car, 
  Wrench, 
  AlertTriangle,
  ShieldCheck,
  RotateCcw
} from "lucide-react"
import { useVehicleMaintenance } from "@/hooks/useVehicles"
import { useMaintenanceVehicles } from "@/hooks/useMaintenanceVehicles"
import { useVehicleStatusUpdate, useCompleteMaintenanceStatus, useScheduleMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useDeleteVehicleMaintenance, useUpdateVehicleMaintenance } from "@/hooks/useVehicles"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"
import { PageHelp } from "@/components/help";
import { MaintenancePageHelpContent } from "@/components/help/content";
import { FloatingAssistant } from "@/components/employee-assistant";

// Import new components
import { MaintenanceSmartDashboard } from "@/components/fleet/MaintenanceSmartDashboard"
import { MaintenanceAlertsPanel } from "@/components/fleet/MaintenanceAlertsPanel"
import { MaintenanceSidePanel } from "@/components/fleet/MaintenanceSidePanel"

// Lazy load heavy components
const MaintenanceForm = lazy(() => 
  import("@/components/fleet/MaintenanceForm").then(m => ({ default: m.MaintenanceForm }))
);

// Status mapping for the new design
const statusColors = {
  pending: "bg-green-100 text-green-700 border-green-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200", 
  completed: "bg-neutral-100 text-neutral-700 border-neutral-200",
  cancelled: "bg-coral-100 text-coral-700 border-coral-200"
}

const statusLabels = {
  pending: "نشط",
  in_progress: "قيد المعالجة", 
  completed: "مكتمل",
  cancelled: "ملغي"
}

const statusDotColors = {
  pending: "bg-green-500",
  in_progress: "bg-amber-500",
  completed: "bg-neutral-500",
  cancelled: "bg-coral-500"
}

const priorityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-coral-100 text-coral-700",
  urgent: "bg-red-100 text-red-700"
}

const priorityLabels = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية", 
  urgent: "عاجلة"
}

const maintenanceTypeIcons = {
  routine: RefreshCw,
  repair: Wrench,
  emergency: AlertTriangle,
  preventive: ShieldCheck
}

const maintenanceTypeLabels = {
  routine: "صيانة دورية",
  repair: "إصلاح",
  emergency: "صيانة طارئة",
  preventive: "صيانة وقائية",
  maintenance: "صيانة"
}

const maintenanceTypeColors = {
  routine: "text-blue-600",
  repair: "text-purple-600",
  emergency: "text-coral-600",
  preventive: "text-green-600"
}

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined)
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [selectedMaintenanceId, setSelectedMaintenanceId] = useState<string | undefined>(undefined)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Read vehicle parameter from URL
  useEffect(() => {
    const vehicleParam = searchParams.get('vehicle')
    if (vehicleParam) {
      setSelectedVehicleId(vehicleParam)
      setShowMaintenanceForm(true)
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev)
        newParams.delete('vehicle')
        return newParams
      }, { replace: true })
    }
  }, [searchParams, setSearchParams])
  
  // Fetch data
  const { data: maintenanceRecords, isLoading: maintenanceLoading } = useVehicleMaintenance(undefined, {
    limit: 100
  })
  
  const { data: maintenanceVehicles, isLoading: maintenanceVehiclesLoading } = useMaintenanceVehicles({
    limit: 50,
    enabled: true
  })
  
  const { formatCurrency } = useCurrencyFormatter()
  const completeMaintenanceStatus = useCompleteMaintenanceStatus()
  const vehicleStatusUpdate = useVehicleStatusUpdate()
  const scheduleMaintenanceStatus = useScheduleMaintenanceStatus()
  const deleteMaintenance = useDeleteVehicleMaintenance()
  const updateMaintenance = useUpdateVehicleMaintenance()

  // Filter records and combine with vehicles in maintenance
  const filteredRecords = useMemo(() => {
    const records: any[] = []
    
    // Get vehicle IDs that already have maintenance records
    const vehiclesWithMaintenance = new Set(
      maintenanceRecords?.map(r => r.vehicle_id).filter(Boolean) || []
    )
    
    // Add maintenance records
    if (maintenanceRecords) {
      records.push(...maintenanceRecords.filter(record => {
        const matchesSearch = !searchQuery || 
          record.maintenance_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.vehicles?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.maintenance_type?.toLowerCase().includes(searchQuery.toLowerCase())
        
        const matchesStatus = statusFilter === "all" || record.status === statusFilter
        const matchesType = typeFilter === "all" || record.maintenance_type === typeFilter
        const matchesPriority = priorityFilter === "all" || record.priority === priorityFilter
        
        return matchesSearch && matchesStatus && matchesType && matchesPriority
      }))
    }
    
    // Add vehicles in maintenance status ONLY if they don't have a maintenance record
    if (maintenanceVehicles && statusFilter !== "completed" && statusFilter !== "cancelled") {
      maintenanceVehicles.forEach(vehicle => {
        if (vehiclesWithMaintenance.has(vehicle.id)) {
          return
        }
        
        const matchesSearch = !searchQuery || 
          vehicle.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase())
        
        if (matchesSearch && (statusFilter === "all" || statusFilter === "in_progress")) {
          records.push({
            id: `vehicle-${vehicle.id}`,
            maintenance_number: `VEH-${vehicle.plate_number}`,
            maintenance_type: 'maintenance',
            status: 'in_progress',
            priority: 'medium',
            vehicle_id: vehicle.id,
            vehicles: {
              plate_number: vehicle.plate_number,
              make: vehicle.make,
              model: vehicle.model
            },
            scheduled_date: vehicle.last_maintenance_date,
            description: 'مركبة في حالة صيانة',
            isVehicleInMaintenance: true,
            vehicle: vehicle
          })
        }
      })
    }
    
    return records
  }, [maintenanceRecords, maintenanceVehicles, searchQuery, statusFilter, typeFilter, priorityFilter])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const openSidePanel = (maintenance: any) => {
    if (maintenance.isVehicleInMaintenance && maintenance.vehicle_id) {
      const existingRecord = maintenanceRecords?.find(
        r => r.vehicle_id === maintenance.vehicle_id && r.status === 'in_progress'
      )
      
      if (existingRecord) {
        setSelectedMaintenanceId(existingRecord.id)
        setSidePanelOpen(true)
      } else {
        setSelectedVehicleId(maintenance.vehicle_id)
        setShowMaintenanceForm(true)
      }
      return
    }
    setSelectedMaintenanceId(maintenance.id)
    setSidePanelOpen(true)
  }

  const closeSidePanel = () => {
    setSidePanelOpen(false)
    setTimeout(() => setSelectedMaintenanceId(undefined), 300)
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setTypeFilter("all")
    setPriorityFilter("all")
    setCurrentPage(1)
  }

  const handleFilterChange = (filter: string) => {
    if (filter === 'pending' || filter === 'in_progress' || filter === 'completed' || filter === 'cancelled') {
      setStatusFilter(filter)
    } else if (filter === 'urgent') {
      setPriorityFilter('urgent')
    } else if (filter === 'overdue' || filter === 'scheduled') {
      setStatusFilter('pending')
    } else {
      setStatusFilter("all")
    }
    setCurrentPage(1)
  }

  const handleDelete = async (maintenanceId: string, vehicleId?: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطلب؟')) return
    
    try {
      await deleteMaintenance.mutateAsync({ 
        maintenanceId, 
        vehicleId 
      })
      closeSidePanel()
    } catch (error) {
      console.error('Failed to delete maintenance:', error)
    }
  }

  const handleStatusChange = async (maintenanceId: string, vehicleId: string, currentStatus: string) => {
    if (currentStatus === 'completed') {
      alert('هذا الطلب مكتمل بالفعل')
      return
    }
    
    if (currentStatus === 'cancelled') {
      alert('لا يمكن تغيير حالة الطلب الملغي')
      return
    }

    try {
      if (currentStatus === 'pending') {
        await updateMaintenance.mutateAsync({
          id: maintenanceId,
          status: 'in_progress'
        })
        
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('status')
          .eq('id', vehicleId)
          .single()
          
        if (vehicle?.status !== 'maintenance') {
          await scheduleMaintenanceStatus.mutateAsync({ 
            vehicleId, 
            maintenanceId 
          })
        }
      } else if (currentStatus === 'in_progress') {
        await completeMaintenanceStatus.mutateAsync({ vehicleId, maintenanceId })
      }
      
      closeSidePanel()
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }

  const handleEdit = (maintenance: any) => {
    setSelectedMaintenance(maintenance)
    setShowMaintenanceForm(true)
    closeSidePanel()
  }

  // Keyboard events
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidePanel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  if (maintenanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-1">إدارة الصيانة</h1>
            <p className="text-neutral-500 text-sm">إدارة ومتابعة طلبات الصيانة للأسطول</p>
          </div>
          <Button
            onClick={() => setShowMaintenanceForm(true)}
            className="bg-coral-500 hover:bg-coral-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>طلب صيانة جديد</span>
          </Button>
        </div>

        {/* Smart Dashboard */}
        <MaintenanceSmartDashboard onFilterChange={handleFilterChange} />

        {/* Alerts Panel */}
        <MaintenanceAlertsPanel 
          onMaintenanceClick={(id) => {
            setSelectedMaintenanceId(id)
            setSidePanelOpen(true)
          }}
          maxItems={4}
        />

        {/* Filters Section */}
        <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="البحث برقم الطلب، المركبة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-11 pl-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:border-coral-500 text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:border-coral-500 bg-white text-sm">
                <SelectValue placeholder="كل الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">نشط</SelectItem>
                <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:border-coral-500 bg-white text-sm">
                <SelectValue placeholder="كل الأنواع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="routine">صيانة دورية</SelectItem>
                <SelectItem value="emergency">صيانة طارئة</SelectItem>
                <SelectItem value="preventive">صيانة وقائية</SelectItem>
                <SelectItem value="repair">إصلاح</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:border-coral-500 bg-white text-sm">
                <SelectValue placeholder="كل الأولويات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأولويات</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="urgent">عاجلة</SelectItem>
              </SelectContent>
            </Select>

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة تعيين</span>
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-[1.25rem] shadow-sm border border-neutral-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">رقم الطلب</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">نوع الصيانة</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">المركبة</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">التاريخ</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">الحالة</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">الأولوية</th>
                  <th className="px-5 py-4 text-right text-xs font-semibold text-neutral-600">التكلفة</th>
                  <th className="px-5 py-4 text-center text-xs font-semibold text-neutral-600">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((maintenance, index) => {
                    const TypeIcon = maintenanceTypeIcons[maintenance.maintenance_type as keyof typeof maintenanceTypeIcons] || Wrench
                    const typeColor = maintenanceTypeColors[maintenance.maintenance_type as keyof typeof maintenanceTypeColors] || "text-neutral-600"
                    
                    return (
                      <tr
                        key={maintenance.id}
                        onClick={() => openSidePanel(maintenance)}
                        className="hover:bg-neutral-50 cursor-pointer transition-colors"
                      >
                        <td className="px-5 py-4">
                          {maintenance.isVehicleInMaintenance ? (
                            <span className="font-mono font-semibold text-purple-600 text-sm">
                              {maintenance.vehicle?.plate_number || maintenance.vehicles?.plate_number}
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-coral-600 text-sm">
                              #{maintenance.maintenance_number || maintenance.id?.slice(0, 6)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {maintenance.isVehicleInMaintenance ? (
                              <>
                                <Car className="w-4 h-4 text-purple-600" />
                                <span className="text-purple-600 font-medium text-sm">مركبة في الصيانة</span>
                              </>
                            ) : (
                              <>
                                <TypeIcon className={cn("w-4 h-4", typeColor)} />
                                <span className="text-sm">{maintenanceTypeLabels[maintenance.maintenance_type as keyof typeof maintenanceTypeLabels] || maintenance.maintenance_type}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-neutral-400" />
                            <span className="font-medium text-sm">{maintenance.vehicles?.plate_number || maintenance.vehicle?.plate_number || 'غير محدد'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-neutral-600 text-sm">
                          {maintenance.isVehicleInMaintenance 
                            ? (maintenance.vehicle?.last_maintenance_date
                                ? new Date(maintenance.vehicle.last_maintenance_date).toLocaleDateString('en-US')
                                : '-')
                            : (maintenance.scheduled_date 
                                ? new Date(maintenance.scheduled_date).toLocaleDateString('en-US')
                                : '-')}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 border",
                            statusColors[maintenance.status as keyof typeof statusColors]
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              statusDotColors[maintenance.status as keyof typeof statusDotColors]
                            )} />
                            {statusLabels[maintenance.status as keyof typeof statusLabels]}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium",
                            priorityColors[maintenance.priority as keyof typeof priorityColors]
                          )}>
                            {priorityLabels[maintenance.priority as keyof typeof priorityLabels]}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-neutral-900 text-sm">
                            {maintenance.isVehicleInMaintenance 
                              ? '-' 
                              : formatCurrency(maintenance.actual_cost || maintenance.estimated_cost || 0)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openSidePanel(maintenance)
                              }}
                              className="p-2 hover:bg-coral-50 rounded-lg transition-colors"
                              title="عرض"
                            >
                              <Eye className="w-4 h-4 text-coral-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMaintenance(maintenance)
                                setShowMaintenanceForm(true)
                              }}
                              className="p-2 hover:bg-green-50 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(maintenance.id, maintenance.vehicle_id)
                              }}
                              className="p-2 hover:bg-coral-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4 text-coral-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Wrench className="w-12 h-12 text-neutral-300" />
                        <p className="text-neutral-500">لا توجد طلبات صيانة</p>
                        <Button
                          onClick={() => setShowMaintenanceForm(true)}
                          className="bg-coral-500 hover:bg-coral-600 text-white"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          إضافة طلب صيانة
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredRecords.length > 0 && (
            <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between">
              <div className="text-sm text-neutral-500">
                عرض <span className="font-semibold text-neutral-700">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> من{' '}
                <span className="font-semibold text-neutral-700">{filteredRecords.length}</span> طلب
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm rounded-lg"
                >
                  السابق
                </Button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = i + 1
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "px-3 py-2 text-sm rounded-lg",
                        currentPage === pageNum && "bg-coral-500 text-white hover:bg-coral-600"
                      )}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2 text-neutral-400">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 text-sm rounded-lg"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm rounded-lg"
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <MaintenanceSidePanel
        maintenanceId={selectedMaintenanceId}
        isOpen={sidePanelOpen}
        onClose={closeSidePanel}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
      />

      {/* Maintenance Form */}
      <Suspense fallback={<div>Loading...</div>}>
        <MaintenanceForm 
          maintenance={selectedMaintenance}
          vehicleId={selectedVehicleId}
          open={showMaintenanceForm}
          onOpenChange={(open) => {
            setShowMaintenanceForm(open);
            if (!open) {
              setSelectedVehicleId(undefined);
              setSelectedMaintenance(null);
            }
          }}
        />
      </Suspense>
      
      <PageHelp content={<MaintenancePageHelpContent />} />

      {/* مساعد الموظف للصيانة */}
      <FloatingAssistant 
        workflowType="maintenance" 
        data={{
          vehicle_id: selectedVehicleId,
          vehicle: selectedMaintenance?.vehicles,
          maintenance_type: selectedMaintenance?.maintenance_type,
          problem_description: selectedMaintenance?.description,
          parts_cost: selectedMaintenance?.estimated_cost,
          status: selectedMaintenance?.status,
        }}
      />
    </div>
  )
}
