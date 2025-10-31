import { useState, useEffect } from "react"
import { PageCustomizer } from "@/components/PageCustomizer"
import { Plus, Car, AlertTriangle, TrendingUp, Wrench, FileText, Layers3, Calculator, Upload } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { VehicleForm } from "@/components/fleet/VehicleForm"
import { VehicleFilters } from "@/components/fleet/VehicleFilters"
import { VehicleGrid } from "@/components/fleet/VehicleGrid"
import { VehicleGroupManagement } from "@/components/fleet/VehicleGroupManagement"
import { VehicleCSVUpload } from "@/components/fleet/VehicleCSVUpload"
import { useVehiclesPaginated, VehicleFilters as IVehicleFilters } from "@/hooks/useVehiclesPaginated"
import { useFleetStatus } from "@/hooks/useFleetStatus"
import { useAuth } from "@/contexts/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout'
import { ResponsiveContainer } from '@/components/ui/responsive-container'
import { ResponsivePageActions } from '@/components/ui/responsive-page-actions'

export default function Fleet() {
  // Responsive hooks
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint()
  const { 
    containerPadding, 
    itemSpacing, 
    gridCols,
    modalSize,
    isCardLayout 
  } = useAdaptiveLayout({
    mobileViewMode: 'stack',
    tabletColumns: 2,
    desktopColumns: 3,
    cardLayout: true,
    fullscreenModals: true
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showGroupManagement, setShowGroupManagement] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState<IVehicleFilters>({
    // Exclude vehicles in maintenance status from Fleet view by default
    excludeMaintenanceStatus: true
  })
  
  const { user } = useAuth()
  const { data: fleetStatus, isLoading: statusLoading } = useFleetStatus()
  const { data: vehiclesData, isLoading: vehiclesLoading, error } = useVehiclesPaginated(
    currentPage,
    pageSize,
    filters
  )

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(value => 
    value !== undefined && value !== '' && value !== 'all' && value !== false
  ).length

  const handleFiltersChange = (newFilters: IVehicleFilters) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setCurrentPage(1) // Reset to first page when page size changes
  }

  const handleVehicleFormClose = (open: boolean) => {
    setShowVehicleForm(open)
    // If the form is being closed (not opened), invalidate the vehicles query to refresh the list
    if (!open) {
      queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] })
    }
  }

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
      title="Fleet Management"
      titleAr="إدارة الأسطول"
    >
    <ResponsiveContainer className="space-y-4 md:space-y-6">
      {/* Header */}
      <ResponsivePageActions
        title="إدارة الأسطول"
        subtitle="إدارة أسطول المركبات والصيانة والعمليات"
        primaryAction={{
          id: 'add-vehicle',
          label: 'إضافة مركبة',
          icon: <Plus className="h-4 w-4 mr-2" />,
          onClick: () => setShowVehicleForm(true)
        }}
        secondaryActions={[
          {
            id: 'financial-analysis',
            label: 'التحليل المالي',
            icon: <Calculator className="h-4 w-4 mr-2" />,
            onClick: () => navigate('/fleet/financial-analysis'),
            type: 'outline'
          },
          {
            id: 'vehicle-groups',
            label: 'مجموعات المركبات',
            icon: <Layers3 className="h-4 w-4 mr-2" />,
            onClick: () => setShowGroupManagement(true),
            type: 'outline'
          },
          ...(user?.roles?.includes('super_admin') ? [{
            id: 'csv-upload',
            label: 'رفع CSV',
            icon: <Upload className="h-4 w-4 mr-2" />,
            onClick: () => setShowCSVUpload(true),
            type: 'outline' as const
          }] : [])
        ]}
      />

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

      {/* Fleet Overview Cards - System Aligned Design */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Available Vehicles */}
        <Card 
          className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group"
          onClick={() => handleFiltersChange({ ...filters, status: 'available', excludeMaintenanceStatus: false })}
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
          className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group"
          onClick={() => handleFiltersChange({ ...filters, status: 'rented', excludeMaintenanceStatus: false })}
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
          className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group"
          onClick={() => handleFiltersChange({ ...filters, status: 'maintenance', excludeMaintenanceStatus: false })}
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
          className="relative overflow-hidden cursor-pointer transition-all hover:border-primary/40 hover:shadow-card hover:-translate-y-0.5 group"
          onClick={() => handleFiltersChange({ ...filters, status: 'out_of_service', excludeMaintenanceStatus: false })}
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

      {/* Vehicle Filters */}
      <VehicleFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        activeFiltersCount={activeFiltersCount}
      />

      {/* Vehicle Grid with Pagination */}
      <VehicleGrid
        data={vehiclesData || { data: [], count: 0, totalPages: 0, currentPage: 1 }}
        isLoading={vehiclesLoading}
        error={error}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Empty State */}
      {!vehiclesLoading && (!vehiclesData?.data.length && !activeFiltersCount) && (
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

      {/* Vehicle Form Dialog */}
      {showVehicleForm && (
        <VehicleForm 
          open={showVehicleForm} 
          onOpenChange={handleVehicleFormClose}
        />
      )}

      {/* Vehicle CSV Upload Dialog */}
      <VehicleCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false)
          // Refresh vehicle list
          queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] })
        }}
      />
    </ResponsiveContainer>
    </PageCustomizer>
  )
}