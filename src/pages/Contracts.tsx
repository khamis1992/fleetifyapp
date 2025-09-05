import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout"
import { useSwipeGesture } from "@/hooks/useSwipeGestures"
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { ResponsiveGrid, DashboardGrid } from "@/components/ui/responsive-grid"
import { ResponsiveCard, ResponsiveCardContent, ResponsiveCardHeader, ResponsiveCardTitle } from "@/components/ui/responsive-card"
import { ResponsiveTable } from "@/components/ui/responsive-table"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { SwipeableCard, PullToRefresh } from "@/components/ui/swipeable-components"
import { cn } from "@/lib/utils"
import { RefreshCw, Filter, Search, Plus } from "lucide-react"

// Component imports
import { ContractsHeader } from "@/components/contracts/ContractsHeader"
import { ContractsStatistics } from "@/components/contracts/ContractsStatistics"
import { ContractsList } from "@/components/contracts/ContractsList"
import { ContractsTabsContent } from "@/components/contracts/ContractsTabsContent"
import { ContractWizard } from "@/components/contracts/ContractWizard"
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager"
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog"
import { ContractJournalEntryStatus } from "@/components/contracts/ContractJournalEntryStatus"
import { ContractStatusManagement } from "@/components/contracts/ContractStatusManagement"
import { ContractDetailsDialog } from "@/components/contracts/ContractDetailsDialog"
import { ContractSearchFilters } from "@/components/contracts/ContractSearchFilters"
import { ContractInvoiceDialog } from "@/components/contracts/ContractInvoiceDialog"
import { ContractExportDialog } from "@/components/contracts/ContractExportDialog"
import { ContractCreationProgress } from "@/components/contracts/ContractCreationProgress"
import { ContractCancellationDialog } from "@/components/contracts/ContractCancellationDialog"
import { ContractDeleteDialog } from "@/components/contracts/ContractDeleteDialog"
import { ContractCSVUpload } from "@/components/contracts/ContractCSVUpload"
import { LateFinesSettings } from "@/components/contracts/LateFinesSettings"
import { BulkDeleteContractsDialog } from "@/components/contracts/BulkDeleteContractsDialog"

// Hook imports
import { useContractsData } from "@/hooks/useContractsData"
import { useAuth } from "@/contexts/AuthContext"
import { useAutoRenewContracts } from "@/hooks/useContractRenewal"
import { useContractCreation } from "@/hooks/useContractCreation"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"

export default function Contracts() {
  // Responsive hooks
  const { isMobile, isTablet, isDesktop } = useResponsiveBreakpoint()
  const { 
    containerPadding, 
    itemSpacing, 
    gridCols,
    modalSize,
    isCardLayout,
    enableSwipe,
    animationStyle
  } = useAdaptiveLayout({
    mobileViewMode: 'stack',
    tabletColumns: 2,
    desktopColumns: 3,
    cardLayout: true,
    fullscreenModals: true,
    enableSwipeGestures: true,
    touchTargetSize: 'large'
  })

  // Performance optimization hooks
  const { measureRenderTime, getOptimizedImageSrc } = usePerformanceOptimization()

  // State management
  const [showContractWizard, setShowContractWizard] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null)
  const [showRenewalDialog, setShowRenewalDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showCreationProgress, setShowCreationProgress] = useState(false)
  const [showCancellationDialog, setShowCancellationDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [filters, setFilters] = useState<any>({})
  const [activeTab, setActiveTab] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  // Hooks
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const autoRenewContracts = useAutoRenewContracts()
  const { createContract, creationState, isCreating, retryCreation, resetCreationState } = useContractCreation()
  
  // Data fetching
  const { contracts, filteredContracts, isLoading, refetch, statistics } = useContractsData(filters)

  // Swipe gestures for mobile
  const handleSwipe = useCallback((result: any) => {
    if (result.direction === 'left' && isMobile && activeTab === "all") {
      setActiveTab("active")
    } else if (result.direction === 'left' && isMobile && activeTab === "active") {
      setActiveTab("suspended")
    } else if (result.direction === 'right' && isMobile && activeTab === "suspended") {
      setActiveTab("active")
    } else if (result.direction === 'right' && isMobile && activeTab === "active") {
      setActiveTab("all")
    }
  }, [isMobile, activeTab])

  const swipeHandlers = useSwipeGesture(handleSwipe)

  // Handle pre-selected customer from navigation
  useEffect(() => {
    if (location.state?.selectedCustomerId) {
      setPreselectedCustomerId(location.state.selectedCustomerId)
      setShowContractWizard(true)
    }
  }, [location.state])

  // Optimized handlers with useCallback
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      if (isMobile) {
        // Haptic feedback for mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50)
        }
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [refetch, isMobile])

  // Event handlers
  const handleContractSubmit = useCallback(async (contractData: any) => {
    try {
      console.log('📋 [CONTRACT_SUBMIT] Starting new contract creation process with progress tracking')
      
      setShowCreationProgress(true)
      resetCreationState()
      
      const finalData = {
        ...contractData,
        created_by: user?.id,
        contract_date: contractData.contract_date || new Date().toISOString().split('T')[0],
        contract_number: contractData.contract_number || `CON-${Date.now()}`
      }
      
      createContract(finalData)
      return null
    } catch (error) {
      console.error('❌ [CONTRACT_SUBMIT] Error in contract creation:', error)
      setShowCreationProgress(false)
      throw error
    }
  }, [user?.id, createContract, resetCreationState])

  const handleCreationComplete = useCallback(() => {
    setShowCreationProgress(false)
    setShowContractWizard(false)
    setPreselectedCustomerId(null)
    refetch()
  }, [refetch])

  const handleCreationRetry = useCallback(() => {
    retryCreation()
  }, [retryCreation])

  const handleRenewContract = useCallback((contract: any) => {
    setSelectedContract(contract)
    setShowRenewalDialog(true)
  }, [])

  const handleManageStatus = useCallback((contract: any) => {
    setSelectedContract(contract)
    setShowStatusDialog(true)
  }, [])

  const handleViewDetails = useCallback((contract: any) => {
    setSelectedContract(contract)
    setShowDetailsDialog(true)
  }, [])

  const handleCancelContract = useCallback((contract: any) => {
    setSelectedContract(contract)
    setShowCancellationDialog(true)
  }, [])

  const handleDeleteContract = useCallback((contract: any) => {
    setSelectedContract(contract)
    setShowDeleteDialog(true)
  }, [])

  const handleManagePayments = (contract: any) => {
    setSelectedContract(contract)
    setShowDetailsDialog(true)
    // Set a flag to auto-open payment schedules tab when dialog opens
    setTimeout(() => {
      const paymentTab = document.querySelector('[value="schedules"]')
      if (paymentTab) {
        (paymentTab as HTMLElement).click()
      }
    }, 100)
  }

  const handleCreateContract = () => {
    setPreselectedCustomerId(null)
    setShowContractWizard(true)
  }

  const handleShowTemplates = () => {
    setShowTemplateManager(true)
  }

  const handleShowExport = () => {
    setShowExportDialog(true)
  }

  const handleShowCSVUpload = () => {
    setShowCSVUpload(true)
  }

  const handleShowBulkDelete = () => {
    setShowBulkDelete(true)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handleAutoRenew = async () => {
    await autoRenewContracts.mutateAsync()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} isRefreshing={isRefreshing}>
      <ResponsiveContainer className={cn("space-y-4 md:space-y-6", animationStyle)}>
        {/* Enhanced Header with Quick Actions */}
        <div className="flex flex-col space-y-4">
          <ContractsHeader
            onCreateContract={handleCreateContract}
            onShowTemplates={handleShowTemplates}
            onShowExport={handleShowExport}
            onShowCSVUpload={handleShowCSVUpload}
            onShowBulkDelete={handleShowBulkDelete}
          />
          
          {/* Mobile Quick Actions Bar */}
          {isMobile && (
            <div className="flex items-center justify-between gap-2 p-3 bg-background/50 backdrop-blur-sm rounded-lg border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                فلترة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                تحديث
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleCreateContract}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                عقد جديد
              </Button>
            </div>
          )}
        </div>

        {/* Journal Entry Status Alert */}
        <ContractJournalEntryStatus />

        {/* Statistics Cards */}
        <div className="w-full">
          <ContractsStatistics
            activeCount={statistics.activeContracts.length}
            draftCount={statistics.draftContracts.length}
            cancelledCount={statistics.cancelledContracts.length}
            totalRevenue={statistics.totalRevenue}
          />
        </div>

        {/* Search and Filters - Collapsible on Mobile */}
        <ResponsiveCard 
          variant="outlined" 
          density={isMobile ? "compact" : "comfortable"}
          className={cn(
            "transition-all duration-300",
            isMobile && !showMobileFilters && "hidden"
          )}
        >
          <ResponsiveCardContent>
            <ContractSearchFilters 
              onFiltersChange={setFilters}
              activeFilters={filters}
            />
          </ResponsiveCardContent>
        </ResponsiveCard>

        {/* Contract Management Tabs - Enhanced with Swipe Support */}
        <div className="space-y-3 md:space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-4">
            <div className={cn(
              "overflow-x-auto",
              isMobile && "pb-2 scrollbar-hide"
            )}>
              <TabsList className={cn(
                "grid w-full transition-all duration-200",
                isMobile ? "grid-cols-3 min-w-max gap-1" : "grid-cols-6 lg:w-auto lg:inline-flex"
              )}>
                <TabsTrigger 
                  value="all" 
                  className={cn(
                    "transition-all duration-200",
                    isMobile ? "text-xs px-3 py-2" : ""
                  )}
                >
                  {isMobile ? "الكل" : "جميع العقود"}
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className={cn(
                    "transition-all duration-200",
                    isMobile ? "text-xs px-3 py-2" : ""
                  )}
                >
                  النشطة
                </TabsTrigger>
                <TabsTrigger 
                  value="suspended" 
                  className={cn(
                    "transition-all duration-200",
                    isMobile ? "text-xs px-3 py-2" : ""
                  )}
                >
                  المعلقة
                </TabsTrigger>
                {!isMobile && (
                  <>
                    <TabsTrigger value="expired">المنتهية</TabsTrigger>
                    <TabsTrigger value="alerts">تنبيهات الانتهاء</TabsTrigger>
                    <TabsTrigger value="late-fines">إعدادات الغرامات</TabsTrigger>
                  </>
                )}
              </TabsList>
              
              {/* Swipe Indicator for Mobile */}
              {isMobile && enableSwipe && (
                <div className="flex justify-center mt-2">
                  <div className="text-xs text-muted-foreground opacity-60">
                    اسحب يميناً أو يساراً للتنقل
                  </div>
                </div>
              )}
            </div>

            <TabsContent value="all" className="animate-fade-in">
              <div className="min-h-[400px]">
                <ContractsList
                  contracts={filteredContracts}
                  onRenewContract={handleRenewContract}
                  onManageStatus={handleManageStatus}
                  onViewDetails={handleViewDetails}
                  onCancelContract={handleCancelContract}
                  onDeleteContract={handleDeleteContract}
                  onCreateContract={handleCreateContract}
                  onClearFilters={handleClearFilters}
                  hasFilters={Object.keys(filters).length > 0}
                  hasContracts={!!contracts && contracts.length > 0}
                />
              </div>
            </TabsContent>

            <ContractsTabsContent
              activeContracts={statistics.activeContracts}
              suspendedContracts={statistics.suspendedContracts}
              expiredContracts={statistics.expiredContracts}
              onRenewContract={handleRenewContract}
              onManageStatus={handleManageStatus}
              onViewContract={handleViewDetails}
              onCancelContract={handleCancelContract}
              onDeleteContract={handleDeleteContract}
            />

            <TabsContent value="late-fines" className="animate-fade-in">
              <LateFinesSettings />
            </TabsContent>
          </Tabs>
        </div>

        {/* Dialogs */}
        <ContractRenewalDialog
          open={showRenewalDialog}
          onOpenChange={setShowRenewalDialog}
          contract={selectedContract}
        />
        
        <ContractStatusManagement
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          contract={selectedContract}
        />
        
        <ContractDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          contract={selectedContract}
          onEdit={(contract) => { setSelectedContract(contract); refetch(); }}
          onCreateInvoice={(contract) => { setSelectedContract(contract); setShowInvoiceDialog(true); }}
        />
        
        <ContractInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          contract={selectedContract}
          onSuccess={() => { refetch(); setShowInvoiceDialog(false); }}
        />
        
        <ContractExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
        
        <ContractWizard
          open={showContractWizard}
          onOpenChange={setShowContractWizard}
          onSubmit={handleContractSubmit}
          preselectedCustomerId={preselectedCustomerId}
        />
        
        {/* Contract Creation Progress Dialog - Responsive */}
        <ResponsiveModal
          open={showCreationProgress}
          onOpenChange={(open) => {
            if (!open && !creationState.isProcessing) {
              setShowCreationProgress(false)
              resetCreationState()
            }
          }}
          title="إنشاء العقد"
          size="sm"
          mobileFullScreen={false}
          mobileFromBottom={true}
        >
          <ContractCreationProgress
            creationState={creationState}
            onRetry={handleCreationRetry}
            onClose={handleCreationComplete}
          />
        </ResponsiveModal>

        <ContractCancellationDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          contract={selectedContract}
        />

        <ContractDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          contract={selectedContract}
          onSuccess={() => refetch()}
        />

        {/* Contract CSV Upload Dialog */}
        <ContractCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            setShowCSVUpload(false)
            refetch()
          }}
        />

        {/* Bulk Delete Contracts Dialog */}
        <BulkDeleteContractsDialog
          open={showBulkDelete}
          onOpenChange={setShowBulkDelete}
        />

        {showTemplateManager && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>إدارة قوالب العقود</CardTitle>
                    <Button variant="outline" onClick={() => setShowTemplateManager(false)}>
                      إغلاق
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ContractTemplateManager />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </ResponsiveContainer>
    </PullToRefresh>
  )
}