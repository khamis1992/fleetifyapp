import { useState, useEffect } from "react"
import { PageCustomizer } from "@/components/PageCustomizer"
import { Plus, Car, AlertTriangle, TrendingUp, Wrench, FileText, Layers3, Calculator, Upload, BookOpen } from "lucide-react"
import { Link } from "react-router-dom"
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
            id: 'reservations',
            label: 'نظام الحجوزات',
            icon: <BookOpen className="h-4 w-4 mr-2" />,
            onClick: () => window.location.href = '/fleet/reservation-system',
            type: 'outline'
          },
          {
            id: 'financial-analysis',
            label: 'التحليل المالي',
            icon: <Calculator className="h-4 w-4 mr-2" />,
            onClick: () => window.location.href = '/fleet/financial-analysis',
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

      {/* Fleet Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المركبات المتاحة</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{fleetStatus?.available || 0}</div>
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
            <div className="text-2xl font-bold text-blue-600">{fleetStatus?.rented || 0}</div>
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
            <div className="text-2xl font-bold text-yellow-600">{fleetStatus?.maintenance || 0}</div>
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
            <div className="text-2xl font-bold text-red-600">{fleetStatus?.outOfService || 0}</div>
            <p className="text-xs text-muted-foreground">
              تحتاج لإنتباه
            </p>
          </CardContent>
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