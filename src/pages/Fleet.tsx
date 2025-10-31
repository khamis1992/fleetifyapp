import { useState } from "react"
import { PageCustomizer } from "@/components/PageCustomizer"
import { Plus, Car, AlertTriangle, TrendingUp, Wrench, Calculator, Layers3, Upload, Search, ChevronDown, RotateCcw, Eye, Edit, MoreVertical, ChevronLeft, ChevronRight, Trash2, Copy, Download, FileText, Camera } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { VehicleForm } from "@/components/fleet/VehicleForm"
import { VehicleGroupManagement } from "@/components/fleet/VehicleGroupManagement"
import { VehicleCSVUpload } from "@/components/fleet/VehicleCSVUpload"
import { useVehiclesPaginated, VehicleFilters as IVehicleFilters } from "@/hooks/useVehiclesPaginated"
import { useFleetStatus } from "@/hooks/useFleetStatus"
import { useAuth } from "@/contexts/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useDeleteVehicle } from "@/hooks/useVehicles"
import { useToast } from "@/hooks/use-toast"
import type { Vehicle } from "@/hooks/useVehicles"

export default function Fleet() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  // State Management
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [showGroupManagement, setShowGroupManagement] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<IVehicleFilters>({
    excludeMaintenanceStatus: false
  })
  
  // Hooks
  const { toast } = useToast()
  const deleteVehicle = useDeleteVehicle()
  
  // Data Hooks
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus()
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehiclesPaginated(
    currentPage,
    pageSize,
    filters
  )

  // Handlers
  const handleFilterChange = (key: keyof IVehicleFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleStatCardClick = (status: string) => {
    setFilters({ status, excludeMaintenanceStatus: false })
    setCurrentPage(1)
  }

  const handleResetFilters = () => {
    setFilters({ excludeMaintenanceStatus: false })
    setSearchQuery("")
    setCurrentPage(1)
  }

  const handleVehicleFormClose = (open: boolean) => {
    setShowVehicleForm(open)
    if (!open) {
      setEditingVehicle(null)
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] })
    }
  }

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle)
    setShowVehicleForm(true)
  }

  const handleDeleteVehicle = async () => {
    if (!vehicleToDelete) return
    
    try {
      await deleteVehicle.mutateAsync(vehicleToDelete.id)
      setVehicleToDelete(null)
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] })
      queryClient.invalidateQueries({ queryKey: ['fleet-status'] })
    } catch (error) {
      console.error('Error deleting vehicle:', error)
    }
  }

  const handleCopyVehicle = (vehicle: Vehicle) => {
    // Create a copy without ID and timestamps - VehicleForm will treat this as new vehicle
    const vehicleData = {
      ...vehicle,
      plate_number: `${vehicle.plate_number} (نسخة)`,
    }
    
    // Remove id and timestamps to make it a new vehicle
    delete (vehicleData as any).id
    delete (vehicleData as any).created_at
    delete (vehicleData as any).updated_at
    
    // Open form with copied data (without id, so it's treated as new)
    setEditingVehicle(vehicleData as Vehicle)
    setShowVehicleForm(true)
    
    toast({
      title: "تم نسخ المركبة",
      description: "يمكنك الآن تعديل البيانات وإضافة المركبة",
    })
  }

  const handleExportVehicle = (vehicle: Vehicle) => {
    const vehicleJson = JSON.stringify(vehicle, null, 2)
    const blob = new Blob([vehicleJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vehicle_${vehicle.plate_number}_${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: "تم تصدير البيانات",
      description: `تم تصدير بيانات المركبة ${vehicle.plate_number}`,
    })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && value !== 'all' && value !== false
  ).length

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <PageCustomizer
      pageId="fleet-page"
    >
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="bg-gradient-to-br from-white to-gray-50 border-b border-border rounded-xl p-6 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground font-cairo">إدارة الأسطول</h1>
              <p className="text-base text-muted-foreground mt-2 font-tajawal">إدارة أسطول المركبات والصيانة والعمليات</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setShowVehicleForm(true)}
                className="bg-gradient-to-r from-primary-dark to-primary hover:shadow-glow transition-all"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة مركبة
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/fleet/financial-analysis')}
              >
                <Calculator className="h-4 w-4 ml-2" />
                التحليل المالي
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowGroupManagement(true)}
              >
                <Layers3 className="h-4 w-4 ml-2" />
                مجموعات المركبات
              </Button>
              {user?.roles?.includes('super_admin') && (
                <Button 
                  variant="outline"
                  onClick={() => setShowCSVUpload(true)}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  رفع CSV
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Available Vehicles */}
          <Card 
            className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group animate-scale-in"
            style={{ animationDelay: '0.1s' }}
            onClick={() => handleStatCardClick('available')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Car className="h-5 w-5 text-success" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">المركبات المتاحة</span>
              </div>
              <div className="mb-2">
                <h3 className="text-3xl font-bold text-foreground mb-1 group-hover:text-primary group-hover:scale-105 transition-all">
                  {fleetStatus?.available || 0}
                </h3>
                <p className="text-xs text-muted-foreground">جاهزة للإيجار</p>
              </div>
              <div className="h-0.5 w-full bg-gradient-to-r from-success/30 to-transparent rounded-full mt-3"></div>
            </CardContent>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 origin-right group-hover:origin-left transition-transform duration-300"></div>
          </Card>

          {/* Rented Vehicles */}
          <Card 
            className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group animate-scale-in"
            style={{ animationDelay: '0.2s' }}
            onClick={() => handleStatCardClick('rented')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform" style={{ backgroundColor: 'hsl(0 70% 45% / 0.1)' }}>
                  <TrendingUp className="h-5 w-5" style={{ color: 'hsl(0 70% 45%)' }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">المركبات المؤجرة</span>
              </div>
              <div className="mb-2">
                <h3 className="text-3xl font-bold text-foreground mb-1 group-hover:text-primary group-hover:scale-105 transition-all">
                  {fleetStatus?.rented || 0}
                </h3>
                <p className="text-xs text-muted-foreground">حالياً تحت العقد</p>
              </div>
              <div className="h-0.5 w-full rounded-full mt-3" style={{ background: 'linear-gradient(90deg, hsl(0 70% 45% / 0.3), transparent)' }}></div>
            </CardContent>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 origin-right group-hover:origin-left transition-transform duration-300"></div>
          </Card>

          {/* Maintenance */}
          <Card 
            className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group animate-scale-in"
            style={{ animationDelay: '0.3s' }}
            onClick={() => handleStatCardClick('maintenance')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform" style={{ backgroundColor: 'hsl(25 85% 55% / 0.1)' }}>
                  <Wrench className="h-5 w-5" style={{ color: 'hsl(25 85% 55%)' }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">قيد الصيانة</span>
              </div>
              <div className="mb-2">
                <h3 className="text-3xl font-bold text-foreground mb-1 group-hover:text-primary group-hover:scale-105 transition-all">
                  {fleetStatus?.maintenance || 0}
                </h3>
                <p className="text-xs text-muted-foreground">يتم صيانتها</p>
              </div>
              <div className="h-0.5 w-full rounded-full mt-3" style={{ background: 'linear-gradient(90deg, hsl(25 85% 55% / 0.3), transparent)' }}></div>
            </CardContent>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 origin-right group-hover:origin-left transition-transform duration-300"></div>
          </Card>

          {/* Out of Service */}
          <Card 
            className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group animate-scale-in"
            style={{ animationDelay: '0.4s' }}
            onClick={() => handleStatCardClick('out_of_service')}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">خارج الخدمة</span>
              </div>
              <div className="mb-2">
                <h3 className="text-3xl font-bold text-foreground mb-1 group-hover:text-primary group-hover:scale-105 transition-all">
                  {fleetStatus?.outOfService || 0}
                </h3>
                <p className="text-xs text-muted-foreground">تحتاج لانتباه</p>
              </div>
              <div className="h-0.5 w-full bg-gradient-to-r from-destructive/30 to-transparent rounded-full mt-3"></div>
            </CardContent>
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-accent scale-x-0 group-hover:scale-x-100 origin-right group-hover:origin-left transition-transform duration-300"></div>
          </Card>
        </div>

        {/* Filters Section */}
        <Card className="animate-fade-in-up">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="بحث عن مركبة..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleFilterChange('search', e.target.value)
                  }}
                  className="w-full bg-input border border-input-border rounded-lg px-10 py-2.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filters.status || ""}
                  onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                  className="w-full bg-input border border-input-border rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="">جميع الحالات</option>
                  <option value="available">متاحة</option>
                  <option value="rented">مؤجرة</option>
                  <option value="maintenance">صيانة</option>
                  <option value="out_of_service">خارج الخدمة</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <select
                  value={filters.type || ""}
                  onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                  className="w-full bg-input border border-input-border rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="">جميع الأنواع</option>
                  <option value="sedan">سيدان</option>
                  <option value="suv">SUV</option>
                  <option value="truck">شاحنة</option>
                  <option value="van">فان</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Group Filter */}
              <div className="relative">
                <select
                  value={filters.groupId || ""}
                  onChange={(e) => handleFilterChange('groupId', e.target.value || undefined)}
                  className="w-full bg-input border border-input-border rounded-lg px-4 py-2.5 text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                >
                  <option value="">جميع المجموعات</option>
                  <option value="vip">VIP</option>
                  <option value="economy">اقتصادية</option>
                  <option value="luxury">فاخرة</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Active Filters & Reset */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
                  {filters.status && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-primary/10 text-primary border border-primary/20">
                      {filters.status === 'available' ? 'متاحة' : filters.status === 'rented' ? 'مؤجرة' : filters.status === 'maintenance' ? 'صيانة' : 'خارج الخدمة'}
                    </span>
                  )}
                  {filters.type && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-accent/50 text-foreground border border-border">
                      {filters.type === 'sedan' ? 'سيدان' : filters.type === 'suv' ? 'SUV' : filters.type === 'truck' ? 'شاحنة' : 'فان'}
                    </span>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  إعادة تعيين
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicles Grid */}
        {vehiclesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : vehiclesData?.data && vehiclesData.data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {vehiclesData.data.map((vehicle, index) => (
                <Card 
                  key={vehicle.id}
                  className="overflow-hidden hover:shadow-elevated hover:-translate-y-1 transition-all animate-fade-in-up cursor-pointer"
                  style={{ animationDelay: `${(index % 8) * 0.1}s` }}
                  onClick={() => navigate(`/fleet/vehicle/${vehicle.id}`)}
                >
                  <div className="h-48 bg-muted relative overflow-hidden">
                    {vehicle.images && vehicle.images[0] ? (
                      <img
                        src={vehicle.images[0]}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&h=300&fit=crop'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <Car className="w-16 h-16 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {vehicle.make} {vehicle.model} {vehicle.year}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {vehicle.plate_number} | {vehicle.type || 'سيدان'}
                    </p>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className={cn(
                        "px-2 py-1 text-xs font-semibold rounded border uppercase tracking-wide",
                        vehicle.status === 'available' && "bg-success/10 text-success border-success/30",
                        vehicle.status === 'rented' && "bg-blue-50 text-blue-600 border-blue-200",
                        vehicle.status === 'maintenance' && "bg-warning/10 text-warning border-warning/30",
                        vehicle.status === 'out_of_service' && "bg-destructive/10 text-destructive border-destructive/30"
                      )}>
                        {vehicle.status === 'available' ? 'متاحة' : vehicle.status === 'rented' ? 'مؤجرة' : vehicle.status === 'maintenance' ? 'صيانة' : 'خارج الخدمة'}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          className="p-2 hover:bg-accent rounded-lg transition-colors" 
                          title="عرض التفاصيل"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/fleet/vehicle/${vehicle.id}`)
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-2 hover:bg-accent rounded-lg transition-colors" 
                          title="تعديل"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditVehicle(vehicle)
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="p-2 hover:bg-accent rounded-lg transition-colors" 
                              title="المزيد"
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => navigate(`/fleet/vehicle/${vehicle.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              عرض التفاصيل
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditVehicle(vehicle)}>
                              <Edit className="mr-2 h-4 w-4" />
                              تعديل المركبة
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleCopyVehicle(vehicle)}>
                              <Copy className="mr-2 h-4 w-4" />
                              نسخ المركبة
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportVehicle(vehicle)}>
                              <Download className="mr-2 h-4 w-4" />
                              تصدير البيانات
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/fleet/vehicle/${vehicle.id}?tab=documents`)}>
                              <Camera className="mr-2 h-4 w-4" />
                              إدارة الصور
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/fleet/vehicle/${vehicle.id}?tab=documents`)}>
                              <FileText className="mr-2 h-4 w-4" />
                              الوثائق
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setVehicleToDelete(vehicle)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              حذف المركبة
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {vehicle.current_mileage && (
                      <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground space-y-2">
                        <div className="flex justify-between">
                          <span>الكيلومترات:</span>
                          <span className="font-semibold">{vehicle.current_mileage.toLocaleString('ar-KW')} كم</span>
                        </div>
                        {vehicle.daily_rate && (
                          <div className="flex justify-between">
                            <span>الإيجار اليومي:</span>
                            <span className="font-semibold text-success">{vehicle.daily_rate} د.ك</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {vehiclesData.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 animate-fade-in-up">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  {Array.from({ length: Math.min(5, vehiclesData.totalPages) }, (_, i) => {
                    let pageNum;
                    if (vehiclesData.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= vehiclesData.totalPages - 2) {
                      pageNum = vehiclesData.totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className={currentPage === pageNum ? "bg-gradient-to-r from-primary-dark to-primary" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {vehiclesData.totalPages > 5 && currentPage < vehiclesData.totalPages - 2 && (
                    <>
                      <span className="px-2 text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(vehiclesData.totalPages)}
                      >
                        {vehiclesData.totalPages}
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === vehiclesData.totalPages}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>

                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">عدد العناصر:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="bg-input border border-input-border rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="text-center text-sm text-muted-foreground py-6">
              عرض <span className="font-semibold">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, vehiclesData.count)}</span> من <span className="font-semibold">{vehiclesData.count}</span> مركبة
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد مركبات</h3>
              <p className="text-muted-foreground text-center mb-4">
                {activeFiltersCount > 0 ? 'لم يتم العثور على مركبات تطابق الفلاتر المحددة' : 'ابدأ في بناء أسطولك عن طريق إضافة أول مركبة'}
              </p>
              {activeFiltersCount === 0 && (
                <Button onClick={() => setShowVehicleForm(true)}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة مركبة
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={showVehicleForm} onOpenChange={handleVehicleFormClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingVehicle ? "تعديل المركبة" : "إضافة مركبة جديدة"}
              </DialogTitle>
            </DialogHeader>
            <VehicleForm 
              vehicle={editingVehicle || undefined}
              open={showVehicleForm} 
              onOpenChange={handleVehicleFormClose}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!vehicleToDelete} onOpenChange={(open) => !open && setVehicleToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
              <AlertDialogDescription>
                {vehicleToDelete && (
                  <>
                    سيتم حذف المركبة <strong>{vehicleToDelete.plate_number}</strong> ({vehicleToDelete.make} {vehicleToDelete.model}).
                    <br />
                    هذا الإجراء لا يمكن التراجع عنه. سيتم تعطيل المركبة بدلاً من حذفها نهائياً.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteVehicle}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteVehicle.isPending}
              >
                {deleteVehicle.isPending ? "جاري الحذف..." : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showGroupManagement} onOpenChange={setShowGroupManagement}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>إدارة مجموعات المركبات</DialogTitle>
            </DialogHeader>
            {user?.profile?.company_id && (
              <VehicleGroupManagement companyId={user.profile.company_id} />
            )}
          </DialogContent>
        </Dialog>

        <VehicleCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            setShowCSVUpload(false)
            queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] })
          }}
        />
      </div>
    </PageCustomizer>
  )
}

