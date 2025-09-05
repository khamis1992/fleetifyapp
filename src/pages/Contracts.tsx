import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Import responsive components
import { ResponsiveGrid } from "@/components/responsive/ResponsiveGrid"
import { AdaptiveCard } from "@/components/responsive/AdaptiveCard"
import { ResponsiveButton } from "@/components/ui/responsive-button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout"
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
  
  // Responsive hooks
  const { isMobile, isTablet, touchDevice } = useResponsiveBreakpoint()
  const { 
    columns, 
    spacing, 
    contentDensity,
    touchOptimized 
  } = useAdaptiveLayout({
    contentDensity: 'comfortable'
  })
  
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
    <div className={cn("space-y-6", spacing)}>
      {/* Header - Responsive */}
      <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
        <ContractsHeader
          onCreateContract={handleCreateContract}
          onShowTemplates={handleShowTemplates}
          onShowExport={handleShowExport}
          onShowCSVUpload={handleShowCSVUpload}
          onShowBulkDelete={handleShowBulkDelete}
        />
      </AdaptiveCard>

      {/* Journal Entry Status Alert - Responsive */}
      <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
        <ContractJournalEntryStatus />
      </AdaptiveCard>

      {/* Statistics Cards - Responsive Grid */}
      <ResponsiveGrid
        columns={columns.stats}
        gap={isMobile ? 3 : 4}
      >
        <AdaptiveCard 
          variant={isMobile ? 'compact' : 'default'}
          className="col-span-full"
        >
          <ContractsStatistics
            activeCount={statistics.activeContracts.length}
            draftCount={statistics.draftContracts.length}
            cancelledCount={statistics.cancelledContracts.length}
            totalRevenue={statistics.totalRevenue}
          />
        </AdaptiveCard>
      </ResponsiveGrid>

      {/* Search and Filters - Responsive */}
      <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
        <ContractSearchFilters 
          onFiltersChange={setFilters}
          activeFilters={filters}
        />
      </AdaptiveCard>

      {/* Contract Management Tabs - Responsive */}
      <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
        <Tabs defaultValue="all" className={cn(
          isMobile ? "space-y-3" : "space-y-4"
        )}>
          <TabsList className={cn(
            "grid w-full",
            isMobile ? "grid-cols-2 gap-1" : "grid-cols-6 gap-2"
          )}>
            <TabsTrigger 
              value="all"
              className={cn(
                touchOptimized && "min-h-[44px]",
                isMobile && "text-xs"
              )}
            >
              {isMobile ? "الكل" : "جميع العقود"}
            </TabsTrigger>
            <TabsTrigger 
              value="active"
              className={cn(
                touchOptimized && "min-h-[44px]",
                isMobile && "text-xs"
              )}
            >
              النشطة
            </TabsTrigger>
            <TabsTrigger 
              value="suspended"
              className={cn(
                touchOptimized && "min-h-[44px]",
                isMobile && "text-xs"
              )}
            >
              المعلقة
            </TabsTrigger>
            <TabsTrigger 
              value="expired"
              className={cn(
                touchOptimized && "min-h-[44px]",
                isMobile && "text-xs"
              )}
            >
              المنتهية
            </TabsTrigger>
            <TabsTrigger 
              value="alerts"
              className={cn(
                touchOptimized && "min-h-[44px]",
                isMobile && "text-xs"
              )}
            >
              {isMobile ? "تنبيهات" : "تنبيهات الانتهاء"}
            </TabsTrigger>
            <TabsTrigger 
              value="late-fines"
              className={cn(
                touchOptimized && "min-h-[44px]",
                isMobile && "text-xs"
              )}
            >
              {isMobile ? "غرامات" : "إعدادات الغرامات"}
            </TabsTrigger>
          </TabsList>

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
      </AdaptiveCard>

      {/* Dialogs - Responsive */}
      <ResponsiveDialog
        open={showRenewalDialog}
        onOpenChange={setShowRenewalDialog}
        title="تجديد العقد"
        fullScreenOnMobile={true}
      >
        <ContractRenewalDialog
          open={showRenewalDialog}
          onOpenChange={setShowRenewalDialog}
          contract={selectedContract}
        />
      </ResponsiveDialog>
      
      <ResponsiveDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title="إدارة حالة العقد"
        fullScreenOnMobile={true}
      >
        <ContractStatusManagement
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          contract={selectedContract}
        />
      </ResponsiveDialog>
      
      <ResponsiveDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        title="تفاصيل العقد"
        fullScreenOnMobile={true}
      >
        <ContractDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          contract={selectedContract}
          onEdit={(contract) => { setSelectedContract(contract); refetch(); }}
          onCreateInvoice={(contract) => { setSelectedContract(contract); setShowInvoiceDialog(true); }}
        />
      </ResponsiveDialog>
      
      <ResponsiveDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        title="إنشاء فاتورة"
        fullScreenOnMobile={true}
      >
        <ContractInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          contract={selectedContract}
          onSuccess={() => { refetch(); setShowInvoiceDialog(false); }}
        />
      </ResponsiveDialog>
      
      <ResponsiveDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        title="تصدير العقود"
        fullScreenOnMobile={false}
      >
        <ContractExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
        />
      </ResponsiveDialog>
      
      <ResponsiveDialog
        open={showContractWizard}
        onOpenChange={setShowContractWizard}
        title="إنشاء عقد جديد"
        fullScreenOnMobile={true}
      >
        <ContractWizard
          open={showContractWizard}
          onOpenChange={setShowContractWizard}
          onSubmit={handleContractSubmit}
          preselectedCustomerId={preselectedCustomerId}
        />
      </ResponsiveDialog>
      
      {/* Contract Creation Progress Dialog - Responsive */}
      <ResponsiveDialog 
        open={showCreationProgress} 
        onOpenChange={(open) => {
          if (!open && !creationState.isProcessing) {
            setShowCreationProgress(false)
            resetCreationState()
          }
        }}
        title="إنشاء العقد"
        fullScreenOnMobile={false}
      >
        <div className={cn(
          isMobile ? "p-4" : "p-6"
        )}>
          <ContractCreationProgress
            creationState={creationState}
            onRetry={handleCreationRetry}
            onClose={handleCreationComplete}
          />
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={showCancellationDialog}
        onOpenChange={setShowCancellationDialog}
        title="إلغاء العقد"
        fullScreenOnMobile={false}
      >
        <ContractCancellationDialog
          open={showCancellationDialog}
          onOpenChange={setShowCancellationDialog}
          contract={selectedContract}
        />
      </ResponsiveDialog>

      <ResponsiveDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="حذف العقد"
        fullScreenOnMobile={false}
      >
        <ContractDeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          contract={selectedContract}
          onSuccess={() => refetch()}
        />
      </ResponsiveDialog>

      {/* Contract CSV Upload Dialog - Responsive */}
      <ResponsiveDialog
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        title="رفع العقود من ملف CSV"
        fullScreenOnMobile={true}
      >
        <ContractCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            setShowCSVUpload(false)
            refetch()
          }}
        />
      </ResponsiveDialog>

      {/* Bulk Delete Contracts Dialog - Responsive */}
      <ResponsiveDialog
        open={showBulkDelete}
        onOpenChange={setShowBulkDelete}
        title="حذف جميع العقود"
        fullScreenOnMobile={false}
      >
        <BulkDeleteContractsDialog
          open={showBulkDelete}
          onOpenChange={setShowBulkDelete}
        />
      </ResponsiveDialog>

      {/* Template Manager - Responsive */}
      <ResponsiveDialog
        open={showTemplateManager}
        onOpenChange={setShowTemplateManager}
        title="إدارة قوالب العقود"
        fullScreenOnMobile={true}
      >
        <div className={cn(
          "w-full",
          isMobile ? "p-2" : "p-4"
        )}>
          <ContractTemplateManager />
        </div>
      </ResponsiveDialog>
    </div>
  )
}