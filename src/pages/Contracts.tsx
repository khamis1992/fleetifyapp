import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { ResponsiveGrid, DashboardGrid } from "@/components/ui/responsive-grid"
import { ResponsiveCard, ResponsiveCardContent, ResponsiveCardHeader, ResponsiveCardTitle } from "@/components/ui/responsive-card"
import { ResponsiveTable } from "@/components/ui/responsive-table"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { cn } from "@/lib/utils"

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
    isCardLayout 
  } = useAdaptiveLayout({
    mobileViewMode: 'stack',
    tabletColumns: 2,
    desktopColumns: 3,
    cardLayout: true,
    fullscreenModals: true
  })

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

  // Hooks
  const location = useLocation()
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const autoRenewContracts = useAutoRenewContracts()
  const { createContract, creationState, isCreating, retryCreation, resetCreationState } = useContractCreation()
  
  // Data fetching
  const { contracts, filteredContracts, isLoading, refetch, statistics } = useContractsData(filters)

  // Handle pre-selected customer from navigation
  useEffect(() => {
    if (location.state?.selectedCustomerId) {
      setPreselectedCustomerId(location.state.selectedCustomerId)
      setShowContractWizard(true)
    }
  }, [location.state])

  // Event handlers
  const handleContractSubmit = async (contractData: any) => {
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
  }

  const handleCreationComplete = () => {
    setShowCreationProgress(false)
    setShowContractWizard(false)
    setPreselectedCustomerId(null)
    refetch()
  }

  const handleCreationRetry = () => {
    retryCreation()
  }

  const handleRenewContract = (contract: any) => {
    setSelectedContract(contract)
    setShowRenewalDialog(true)
  }

  const handleManageStatus = (contract: any) => {
    setSelectedContract(contract)
    setShowStatusDialog(true)
  }

  const handleViewDetails = (contract: any) => {
    setSelectedContract(contract)
    setShowDetailsDialog(true)
  }

  const handleCancelContract = (contract: any) => {
    setSelectedContract(contract)
    setShowCancellationDialog(true)
  }

  const handleDeleteContract = (contract: any) => {
    setSelectedContract(contract)
    setShowDeleteDialog(true)
  }

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
    <ResponsiveContainer className="space-y-4 md:space-y-6">
      {/* Header */}
      <ContractsHeader
        onCreateContract={handleCreateContract}
        onShowTemplates={handleShowTemplates}
        onShowExport={handleShowExport}
        onShowCSVUpload={handleShowCSVUpload}
        onShowBulkDelete={handleShowBulkDelete}
      />

      {/* Journal Entry Status Alert */}
      <ContractJournalEntryStatus />

      {/* Statistics Cards - Responsive Grid */}
      <DashboardGrid variant="stats" gap={isMobile ? "sm" : "default"}>
        <ResponsiveCard variant="elevated" density={isMobile ? "compact" : "comfortable"}>
          <ResponsiveCardContent>
            <ContractsStatistics
              activeCount={statistics.activeContracts.length}
              draftCount={statistics.draftContracts.length}
              cancelledCount={statistics.cancelledContracts.length}
              totalRevenue={statistics.totalRevenue}
            />
          </ResponsiveCardContent>
        </ResponsiveCard>
      </DashboardGrid>

      {/* Search and Filters - Responsive */}
      <ResponsiveCard variant="outlined" density={isMobile ? "compact" : "comfortable"}>
        <ResponsiveCardContent>
          <ContractSearchFilters 
            onFiltersChange={setFilters}
            activeFilters={filters}
          />
        </ResponsiveCardContent>
      </ResponsiveCard>

      {/* Contract Management Tabs - Mobile-friendly */}
      <Tabs defaultValue="all" className="space-y-3 md:space-y-4">
        <div className={cn(
          "overflow-x-auto",
          isMobile && "pb-2"
        )}>
          <TabsList className={cn(
            "grid w-full",
            isMobile ? "grid-cols-3 min-w-max" : "grid-cols-6 lg:w-auto lg:inline-flex"
          )}>
            <TabsTrigger value="all" className={isMobile ? "text-xs px-3" : ""}>
              {isMobile ? "الكل" : "جميع العقود"}
            </TabsTrigger>
            <TabsTrigger value="active" className={isMobile ? "text-xs px-3" : ""}>
              النشطة
            </TabsTrigger>
            <TabsTrigger value="suspended" className={isMobile ? "text-xs px-3" : ""}>
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
        </div>

        <TabsContent value="all">
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

        <TabsContent value="late-fines">
          <LateFinesSettings />
        </TabsContent>
      </Tabs>

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
  )
}