import { useState } from "react"
import { Plus, Car, AlertTriangle, TrendingUp, Wrench, FileText, Layers3, Calculator, Upload, Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { VehicleForm } from "@/components/fleet/VehicleForm"
import { VehicleFilters } from "@/components/fleet/VehicleFilters"
import { VehicleGrid } from "@/components/fleet/VehicleGrid"
import { VehicleGroupManagement } from "@/components/fleet/VehicleGroupManagement"
import { VehicleCSVUpload } from "@/components/fleet/VehicleCSVUpload"
import { useVehiclesPaginated, VehicleFilters as IVehicleFilters } from "@/hooks/useVehiclesPaginated"
import { useFleetStatus } from "@/hooks/useFleetStatus"
import { useAuth } from "@/contexts/AuthContext"
import { useQueryClient } from "@tanstack/react-query"
import { ResponsiveButton } from "@/components/ui/responsive-button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { ResponsiveGrid } from "@/components/responsive/ResponsiveGrid"
import { AdaptiveCard } from "@/components/responsive/AdaptiveCard"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function Fleet() {
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
  const { isMobile, isTablet } = useResponsiveBreakpoint()
  const { 
    containerPadding, 
    cardSpacing, 
    buttonSize, 
    gridColumns,
    contentDensity 
  } = useAdaptiveLayout()
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
    <div className={cn("space-y-6", containerPadding)}>
      {/* Header - Responsive */}
      <div className={cn(
        "flex items-center justify-between",
        isMobile && "flex-col space-y-4 items-start"
      )}>
        <div className={cn(isMobile && "w-full")}>
          <h1 className={cn(
            "font-bold tracking-tight",
            isMobile ? "text-2xl" : "text-3xl"
          )}>إدارة الأسطول</h1>
          <p className="text-muted-foreground">
            إدارة أسطول المركبات والصيانة والعمليات
          </p>
        </div>
        
        {/* Action Buttons - Responsive */}
        <div className={cn(
          "flex items-center gap-2",
          isMobile && "w-full flex-wrap"
        )}>
          {isMobile ? (
            // Mobile: Dropdown Menu
            <div className="flex items-center gap-2 w-full">
              <ResponsiveButton 
                onClick={() => setShowVehicleForm(true)}
                className="flex-1"
                size={buttonSize}
              >
                <Plus className="h-4 w-4 mr-2" />
                إضافة مركبة
              </ResponsiveButton>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ResponsiveButton variant="outline" size={buttonSize}>
                    <Menu className="h-4 w-4" />
                  </ResponsiveButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/fleet/financial-analysis" className="flex items-center">
                      <Calculator className="h-4 w-4 mr-2" />
                      التحليل المالي
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGroupManagement(true)}>
                    <Layers3 className="h-4 w-4 mr-2" />
                    مجموعات المركبات
                  </DropdownMenuItem>
                  {user?.roles?.includes('super_admin') && (
                    <DropdownMenuItem onClick={() => setShowCSVUpload(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      رفع CSV
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Desktop: Individual Buttons
            <>
              <Link to="/fleet/financial-analysis">
                <ResponsiveButton variant="outline" size={buttonSize}>
                  <Calculator className="h-4 w-4 mr-2" />
                  التحليل المالي
                </ResponsiveButton>
              </Link>
              <ResponsiveButton 
                variant="outline" 
                size={buttonSize}
                onClick={() => setShowGroupManagement(true)}
              >
                <Layers3 className="h-4 w-4 mr-2" />
                مجموعات المركبات
              </ResponsiveButton>
              {user?.roles?.includes('super_admin') && (
                <ResponsiveButton 
                  variant="outline" 
                  size={buttonSize} 
                  onClick={() => setShowCSVUpload(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  رفع CSV
                </ResponsiveButton>
              )}
              <ResponsiveButton onClick={() => setShowVehicleForm(true)} size={buttonSize}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة مركبة
              </ResponsiveButton>
            </>
          )}
        </div>
      </div>

      {/* Fleet Overview Cards - Responsive */}
      <ResponsiveGrid
        columns={gridColumns.stats}
        gap={cardSpacing}
        className="w-full"
      >
        <AdaptiveCard density={contentDensity}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-xs" : "text-sm"
            )}>المركبات المتاحة</CardTitle>
            <Car className={cn(
              "text-muted-foreground",
              isMobile ? "h-3 w-3" : "h-4 w-4"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "font-bold text-green-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>{fleetStatus?.available || 0}</div>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs" : "text-xs"
            )}>
              جاهزة للإيجار
            </p>
          </CardContent>
        </AdaptiveCard>
        
        <AdaptiveCard density={contentDensity}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-xs" : "text-sm"
            )}>المركبات المؤجرة</CardTitle>
            <TrendingUp className={cn(
              "text-muted-foreground",
              isMobile ? "h-3 w-3" : "h-4 w-4"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "font-bold text-blue-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>{fleetStatus?.rented || 0}</div>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs" : "text-xs"
            )}>
              حالياً تحت العقد
            </p>
          </CardContent>
        </AdaptiveCard>
        
        <AdaptiveCard density={contentDensity}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-xs" : "text-sm"
            )}>قيد الصيانة</CardTitle>
            <Wrench className={cn(
              "text-muted-foreground",
              isMobile ? "h-3 w-3" : "h-4 w-4"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "font-bold text-yellow-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>{fleetStatus?.maintenance || 0}</div>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs" : "text-xs"
            )}>
              يتم صيانتها
            </p>
          </CardContent>
        </AdaptiveCard>
        
        <AdaptiveCard density={contentDensity}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-xs" : "text-sm"
            )}>خارج الخدمة</CardTitle>
            <AlertTriangle className={cn(
              "text-muted-foreground",
              isMobile ? "h-3 w-3" : "h-4 w-4"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "font-bold text-red-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>{fleetStatus?.outOfService || 0}</div>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs" : "text-xs"
            )}>
              تحتاج لإنتباه
            </p>
          </CardContent>
        </AdaptiveCard>
      </ResponsiveGrid>

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

      {/* Empty State - Responsive */}
      {!vehiclesLoading && (!vehiclesData?.data.length && !activeFiltersCount) && (
        <AdaptiveCard density={contentDensity}>
          <CardContent className={cn(
            "flex flex-col items-center justify-center text-center",
            isMobile ? "py-8 px-4" : "py-12"
          )}>
            <Car className={cn(
              "text-muted-foreground mb-4",
              isMobile ? "h-8 w-8" : "h-12 w-12"
            )} />
            <h3 className={cn(
              "font-semibold mb-2",
              isMobile ? "text-base" : "text-lg"
            )}>لا توجد مركبات بعد</h3>
            <p className={cn(
              "text-muted-foreground text-center mb-4",
              isMobile ? "text-sm" : "text-base"
            )}>
              ابدأ في بناء أسطولك عن طريق إضافة أول مركبة
            </p>
            <ResponsiveButton 
              onClick={() => setShowVehicleForm(true)}
              size={buttonSize}
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة مركبة
            </ResponsiveButton>
          </CardContent>
        </AdaptiveCard>
      )}

      {/* Vehicle Form Dialog - Responsive */}
      <ResponsiveDialog
        open={showVehicleForm}
        onOpenChange={handleVehicleFormClose}
        title="إضافة مركبة جديدة"
        fullScreenOnMobile={true}
      >
        <VehicleForm 
          open={showVehicleForm} 
          onOpenChange={handleVehicleFormClose}
        />
      </ResponsiveDialog>

      {/* Vehicle Group Management Dialog - Responsive */}
      <ResponsiveDialog
        open={showGroupManagement}
        onOpenChange={setShowGroupManagement}
        title="إدارة مجموعات المركبات"
        fullScreenOnMobile={true}
      >
        <div className={cn(
          "w-full",
          isMobile ? "p-2" : "p-4"
        )}>
          {user?.profile?.company_id && (
            <VehicleGroupManagement companyId={user.profile.company_id} />
          )}
        </div>
      </ResponsiveDialog>

      {/* Vehicle CSV Upload Dialog - Responsive */}
      <ResponsiveDialog
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        title="رفع المركبات من ملف CSV"
        fullScreenOnMobile={true}
      >
        <VehicleCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            setShowCSVUpload(false)
            // Refresh vehicle list
            queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] })
          }}
        />
      </ResponsiveDialog>
    </div>
  )
}