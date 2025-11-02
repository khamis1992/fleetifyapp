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
  X, 
  Car, 
  Wrench, 
  FileText, 
  User,
  ClipboardList,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  RotateCcw
} from "lucide-react"
import { useVehicleMaintenance } from "@/hooks/useVehicles"
import { useMaintenanceVehicles } from "@/hooks/useMaintenanceVehicles"
import { useSmartAlerts } from "@/hooks/useSmartAlerts"
import { useVehicleStatusUpdate, useCompleteMaintenanceStatus, useScheduleMaintenanceStatus } from "@/hooks/useVehicleStatusIntegration"
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter"
import { useDeleteVehicleMaintenance, useUpdateVehicleMaintenance } from "@/hooks/useVehicles"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

// Lazy load heavy components
const SmartAlertsPanel = lazy(() => 
  import("@/components/dashboard/SmartAlertsPanel").then(m => ({ default: m.SmartAlertsPanel }))
);
const MaintenanceForm = lazy(() => 
  import("@/components/fleet/MaintenanceForm").then(m => ({ default: m.MaintenanceForm }))
);

// Status mapping for the new design
const statusColors = {
  pending: "status-active",
  in_progress: "status-pending", 
  completed: "status-completed",
  cancelled: "status-cancelled"
}

const statusLabels = {
  pending: "نشط",
  in_progress: "قيد المعالجة", 
  completed: "مكتمل",
  cancelled: "ملغي"
}

const statusDotColors = {
  pending: "bg-green-500",
  in_progress: "bg-orange-500",
  completed: "bg-gray-500",
  cancelled: "bg-gray-400"
}

const priorityColors = {
  low: "priority-low",
  medium: "priority-medium",
  high: "priority-high",
  urgent: "priority-high"
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
  routine: "text-red-600",
  repair: "text-purple-600",
  emergency: "text-red-600",
  preventive: "text-green-600"
}

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | undefined>(undefined)
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
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
  
  const { data: smartAlerts, isLoading: alertsLoading } = useSmartAlerts({
    priority: true,
    limit: 5
  })
  
  const { formatCurrency } = useCurrencyFormatter()
  const completeMaintenanceStatus = useCompleteMaintenanceStatus()
  const vehicleStatusUpdate = useVehicleStatusUpdate()
  const scheduleMaintenanceStatus = useScheduleMaintenanceStatus()
  const deleteMaintenance = useDeleteVehicleMaintenance()
  const updateMaintenance = useUpdateVehicleMaintenance()

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!maintenanceRecords || maintenanceRecords.length === 0) {
      console.log('🔍 [Maintenance Stats] No records found:', maintenanceRecords)
      return { total: 0, pending: 0, inProgress: 0, completed: 0, cancelled: 0 }
    }
    
    const stats = {
      total: maintenanceRecords.length,
      pending: maintenanceRecords.filter(m => m.status === 'pending').length,
      inProgress: maintenanceRecords.filter(m => m.status === 'in_progress').length,
      completed: maintenanceRecords.filter(m => m.status === 'completed').length,
      cancelled: maintenanceRecords.filter(m => m.status === 'cancelled').length
    }
    
    console.log('📊 [Maintenance Stats] Calculated:', stats)
    console.log('📋 [Maintenance Records] Sample:', maintenanceRecords.slice(0, 3).map(r => ({ 
      id: r.id, 
      status: r.status, 
      maintenance_number: r.maintenance_number 
    })))
    console.log('🚗 [Maintenance Vehicles] Count:', maintenanceVehicles?.length || 0)
    if (maintenanceVehicles && maintenanceVehicles.length > 0) {
      console.log('🚗 [Maintenance Vehicles] Sample:', maintenanceVehicles.slice(0, 3).map(v => ({
        id: v.id,
        plate_number: v.plate_number,
        status: v.status
      })))
    }
    
    return stats
  }, [maintenanceRecords, maintenanceVehicles])

  // Filter records and combine with vehicles in maintenance - FIXED
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
        
        return matchesSearch && matchesStatus && matchesType
      }))
    }
    
    // Add vehicles in maintenance status ONLY if they don't have a maintenance record
    if (maintenanceVehicles) {
      maintenanceVehicles.forEach(vehicle => {
        // Skip if this vehicle already has a maintenance record
        if (vehiclesWithMaintenance.has(vehicle.id)) {
          return
        }
        
        const matchesSearch = !searchQuery || 
          vehicle.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          `${vehicle.make} ${vehicle.model}`.toLowerCase().includes(searchQuery.toLowerCase())
        
        // Only show if matches search or if status filter is "all" or matches "in_progress"
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
            isVehicleInMaintenance: true, // Flag to identify this is a vehicle in maintenance status
            vehicle: vehicle
          })
        }
      })
    }
    
    return records
  }, [maintenanceRecords, maintenanceVehicles, searchQuery, statusFilter, typeFilter])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage)
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const openSidePanel = (maintenance: any) => {
    // If it's a vehicle in maintenance status, find its maintenance record first
    if (maintenance.isVehicleInMaintenance && maintenance.vehicle_id) {
      // Try to find existing maintenance record for this vehicle
      const existingRecord = maintenanceRecords?.find(
        r => r.vehicle_id === maintenance.vehicle_id && r.status === 'in_progress'
      )
      
      if (existingRecord) {
        // If found, show the actual record
        setSelectedMaintenance(existingRecord)
        setSidePanelOpen(true)
      } else {
        // If not found, open form to create new maintenance record
        setSelectedVehicleId(maintenance.vehicle_id)
        setShowMaintenanceForm(true)
      }
      return
    }
    setSelectedMaintenance(maintenance)
    setSidePanelOpen(true)
  }

  const closeSidePanel = () => {
    setSidePanelOpen(false)
    setTimeout(() => setSelectedMaintenance(null), 300)
  }

  const handleResetFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setTypeFilter("all")
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
    // Validate status transition
    if (currentStatus === 'completed') {
      alert('هذا الطلب مكتمل بالفعل')
      return
    }
    
    if (currentStatus === 'cancelled') {
      alert('لا يمكن تغيير حالة الطلب الملغي')
      return
    }

    try {
      // If status is pending, first move to in_progress
      if (currentStatus === 'pending') {
        await updateMaintenance.mutateAsync({
          id: maintenanceId,
          status: 'in_progress'
        })
        
        // Also update vehicle status if not already in maintenance
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
        // Complete maintenance
        await completeMaintenanceStatus.mutateAsync({ vehicleId, maintenanceId })
      }
      
      closeSidePanel()
    } catch (error) {
      console.error('Failed to change status:', error)
    }
  }

  // Keyboard events
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidePanel()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  // Prevent body scroll when panel is open
  useEffect(() => {
    document.body.style.overflow = sidePanelOpen ? 'hidden' : 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [sidePanelOpen])

  if (maintenanceLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Smart Alerts Panel */}
        {smartAlerts && smartAlerts.length > 0 && (
          <div className="mb-8">
            <Suspense fallback={<LoadingSpinner size="sm" />}>
              <SmartAlertsPanel 
                alerts={smartAlerts} 
                loading={alertsLoading}
              />
            </Suspense>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-8 animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">إدارة الصيانة</h1>
              <p className="text-gray-600">إدارة ومتابعة طلبات الصيانة للأسطول</p>
            </div>
            <Button
              onClick={() => setShowMaintenanceForm(true)}
              className="btn-hover bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 justify-center shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>طلب صيانة جديد</span>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Total */}
          <div className="stats-card bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">إجمالي الطلبات</p>
                <h3 className="text-3xl font-bold text-gray-900">{statistics.total}</h3>
              </div>
              <div className="bg-red-100 p-4 rounded-xl">
                <ClipboardList className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-gray-500">إجمالي طلبات الصيانة</span>
            </div>
          </div>

          {/* Vehicles in Maintenance */}
          <div className="stats-card bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">المركبات في الصيانة</p>
                <h3 className="text-3xl font-bold text-purple-600">{maintenanceVehicles?.length || 0}</h3>
              </div>
              <div className="bg-purple-100 p-4 rounded-xl">
                <Car className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-purple-600 font-semibold">
                {maintenanceVehicles?.length || 0} مركبة
              </span>
              <span className="text-gray-500">قيد الصيانة</span>
            </div>
          </div>

          {/* Pending */}
          <div className="stats-card bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">معلقة</p>
                <h3 className="text-3xl font-bold text-yellow-600">{statistics.pending}</h3>
              </div>
              <div className="bg-yellow-100 p-4 rounded-xl">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-yellow-600 font-semibold">
                {statistics.total > 0 ? Math.round((statistics.pending / statistics.total) * 100) : 0}%
              </span>
              <span className="text-gray-500">من الإجمالي</span>
            </div>
          </div>

          {/* In Progress */}
          <div className="stats-card bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">قيد المعالجة</p>
                <h3 className="text-3xl font-bold text-orange-600">{statistics.inProgress}</h3>
              </div>
              <div className="bg-orange-100 p-4 rounded-xl">
                <Wrench className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-orange-600 font-semibold">
                {statistics.total > 0 ? Math.round((statistics.inProgress / statistics.total) * 100) : 0}%
              </span>
              <span className="text-gray-500">من الإجمالي</span>
            </div>
          </div>

          {/* Completed */}
          <div className="stats-card bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-2">مكتملة</p>
                <h3 className="text-3xl font-bold text-green-600">{statistics.completed}</h3>
              </div>
              <div className="bg-green-100 p-4 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-green-600 font-semibold">
                {statistics.total > 0 ? Math.round((statistics.completed / statistics.total) * 100) : 0}%
              </span>
              <span className="text-gray-500">معدل الإنجاز</span>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-8 animate-slide-up">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="البحث برقم الطلب، المركبة، أو النوع..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-focus w-full pr-12 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 bg-white">
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
              <SelectTrigger className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 bg-white">
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

            {/* Reset Button */}
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>إعادة تعيين</span>
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">رقم الطلب</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">نوع الصيانة</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">المركبة</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التاريخ</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الحالة</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">الأولوية</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">التكلفة</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((maintenance, index) => {
                    const TypeIcon = maintenanceTypeIcons[maintenance.maintenance_type as keyof typeof maintenanceTypeIcons] || Wrench
                    const typeColor = maintenanceTypeColors[maintenance.maintenance_type as keyof typeof maintenanceTypeColors] || "text-gray-600"
                    
                    return (
                      <tr
                        key={maintenance.id}
                        onClick={() => openSidePanel(maintenance)}
                        className="table-row row-hover cursor-pointer"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          {maintenance.isVehicleInMaintenance ? (
                            <span className="font-mono font-semibold text-purple-600">
                              {maintenance.vehicle?.plate_number || maintenance.vehicles?.plate_number}
                            </span>
                          ) : (
                            <span className="font-mono font-semibold text-red-600">
                              #{maintenance.maintenance_number || maintenance.id?.slice(0, 3).toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {maintenance.isVehicleInMaintenance ? (
                              <>
                                <Car className="w-4 h-4 text-purple-600" />
                                <span className="text-purple-600 font-semibold">مركبة في الصيانة</span>
                                <Badge className="bg-purple-100 text-purple-700 text-xs">صيانة</Badge>
                              </>
                            ) : (
                              <>
                                <TypeIcon className={cn("w-4 h-4", typeColor)} />
                                <span>{maintenanceTypeLabels[maintenance.maintenance_type as keyof typeof maintenanceTypeLabels] || maintenance.maintenance_type}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{maintenance.vehicles?.plate_number || maintenance.vehicle?.plate_number || 'غير محدد'}</span>
                            {maintenance.vehicle && (
                              <span className="text-xs text-gray-500">
                                ({maintenance.vehicle.make} {maintenance.vehicle.model})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {maintenance.isVehicleInMaintenance 
                            ? (maintenance.vehicle?.last_maintenance_date
                                ? new Date(maintenance.vehicle.last_maintenance_date).toLocaleDateString('ar-SA')
                                : 'غير محدد')
                            : (maintenance.scheduled_date 
                                ? new Date(maintenance.scheduled_date).toLocaleDateString('ar-SA')
                                : 'غير محدد')}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cn(
                            "badge px-3 py-1 rounded-full text-sm font-medium inline-flex items-center gap-1",
                            statusColors[maintenance.status as keyof typeof statusColors]
                          )}>
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              statusDotColors[maintenance.status as keyof typeof statusDotColors]
                            )} />
                            {statusLabels[maintenance.status as keyof typeof statusLabels]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cn(
                            "badge px-3 py-1 rounded-full text-sm font-medium",
                            priorityColors[maintenance.priority as keyof typeof priorityColors]
                          )}>
                            {priorityLabels[maintenance.priority as keyof typeof priorityLabels]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            {maintenance.isVehicleInMaintenance 
                              ? '-' 
                              : formatCurrency(maintenance.actual_cost || maintenance.estimated_cost || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openSidePanel(maintenance)
                              }}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="عرض"
                            >
                              <Eye className="w-4 h-4 text-red-600" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedMaintenance(maintenance) // Set the maintenance record
                                setShowMaintenanceForm(true) // Open form in edit mode
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
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Wrench className="w-12 h-12 text-gray-400" />
                        <p className="text-gray-500">لا توجد طلبات صيانة</p>
                        <Button
                          onClick={() => setShowMaintenanceForm(true)}
                          className="bg-red-600 hover:bg-red-700 text-white"
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
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                عرض <span className="font-semibold">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> من{' '}
                <span className="font-semibold">{filteredRecords.length}</span> طلب
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2"
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
                        "px-4 py-2",
                        currentPage === pageNum && "bg-red-600 text-white hover:bg-red-700"
                      )}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-4 py-2"
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
                  className="px-4 py-2"
                >
                  التالي
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black transition-opacity duration-300 z-40",
          sidePanelOpen ? "opacity-50 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidePanel}
      />

      {/* Side Panel */}
      {sidePanelOpen && selectedMaintenance && (
        <div
          className={cn(
            "fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-50 overflow-y-auto",
            "transition-transform duration-300 ease-in-out"
          )}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                تفاصيل طلب الصيانة{' '}
                <span className="text-red-600">
                  #{selectedMaintenance.maintenance_number || selectedMaintenance.id?.slice(0, 3).toUpperCase()}
                </span>
              </h2>
              <button
                onClick={closeSidePanel}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
              <Badge className={cn(
                "badge px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-2",
                statusColors[selectedMaintenance.status as keyof typeof statusColors]
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  statusDotColors[selectedMaintenance.status as keyof typeof statusDotColors]
                )} />
                {statusLabels[selectedMaintenance.status as keyof typeof statusLabels]}
              </Badge>
            </div>

            {/* Vehicle Information */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-3 rounded-lg">
                  <Car className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">معلومات المركبة</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">رقم اللوحة</span>
                  <span className="font-semibold text-gray-900">
                    {selectedMaintenance.vehicles?.plate_number || 'غير محدد'}
                  </span>
                </div>
                {selectedMaintenance.vehicles?.vehicle_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">النوع</span>
                    <span className="font-semibold text-gray-900">
                      {selectedMaintenance.vehicles.vehicle_type}
                    </span>
                  </div>
                )}
                {selectedMaintenance.vehicles?.year && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الموديل</span>
                    <span className="font-semibold text-gray-900">
                      {selectedMaintenance.vehicles.year}
                    </span>
                  </div>
                )}
                {(selectedMaintenance.vehicles?.make || selectedMaintenance.vehicles?.model) && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">الماركة</span>
                    <span className="font-semibold text-gray-900">
                      {selectedMaintenance.vehicles?.make || ''} {selectedMaintenance.vehicles?.model || ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance Details */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">تفاصيل الصيانة</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">النوع</span>
                  <span className="font-semibold text-gray-900">
                    {maintenanceTypeLabels[selectedMaintenance.maintenance_type as keyof typeof maintenanceTypeLabels] || selectedMaintenance.maintenance_type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">الأولوية</span>
                  <Badge className={cn(
                    "badge px-3 py-1 rounded-full text-sm font-medium",
                    priorityColors[selectedMaintenance.priority as keyof typeof priorityColors]
                  )}>
                    {priorityLabels[selectedMaintenance.priority as keyof typeof priorityLabels]}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">تاريخ البدء</span>
                  <span className="font-semibold text-gray-900">
                    {selectedMaintenance.scheduled_date 
                      ? new Date(selectedMaintenance.scheduled_date).toLocaleDateString('ar-SA')
                      : 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">التاريخ المتوقع للإنتهاء</span>
                  <span className="font-semibold text-gray-900">
                    {selectedMaintenance.completion_date 
                      ? new Date(selectedMaintenance.completion_date).toLocaleDateString('ar-SA')
                      : 'غير محدد'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">التكلفة المقدرة</span>
                  <span className="font-bold text-red-600 text-lg">
                    {formatCurrency(selectedMaintenance.actual_cost || selectedMaintenance.estimated_cost || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedMaintenance.description && (
              <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">الوصف</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {selectedMaintenance.description}
                </p>
              </div>
            )}

            {/* Technician */}
            {selectedMaintenance.technician_name && (
              <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">الفني المسؤول</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {selectedMaintenance.technician_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedMaintenance.technician_name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setSelectedMaintenance(selectedMaintenance) // Keep the maintenance data
                  setShowMaintenanceForm(true)
                  closeSidePanel()
                }}
                className="btn-hover flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md"
              >
                <Edit className="w-5 h-5" />
                <span>تعديل</span>
              </Button>
              <Button
                onClick={() => handleStatusChange(
                  selectedMaintenance.id, 
                  selectedMaintenance.vehicle_id,
                  selectedMaintenance.status
                )}
                className="btn-hover flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md"
              >
                <CheckCircle className="w-5 h-5" />
                <span>
                  {selectedMaintenance.status === 'pending' ? 'بدء الصيانة' : 
                   selectedMaintenance.status === 'in_progress' ? 'إكمال الصيانة' : 
                   'تغيير الحالة'}
                </span>
              </Button>
              <Button
                onClick={() => handleDelete(selectedMaintenance.id, selectedMaintenance.vehicle_id)}
                variant="outline"
                className="btn-hover bg-red-50 hover:bg-red-100 text-red-600 px-4 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Form */}
      <Suspense fallback={<div>Loading...</div>}>
        <MaintenanceForm 
          maintenance={selectedMaintenance} // Pass maintenance record for editing
          vehicleId={selectedVehicleId}
          open={showMaintenanceForm}
          onOpenChange={(open) => {
            setShowMaintenanceForm(open);
            if (!open) {
              setSelectedVehicleId(undefined);
              setSelectedMaintenance(null); // Clear selected maintenance when closing
            }
          }}
        />
      </Suspense>
    </div>
  )
}

