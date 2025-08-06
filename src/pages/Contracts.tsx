import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Component imports
import { ContractsHeader } from "@/components/contracts/ContractsHeader"
import { ContractsStatistics } from "@/components/contracts/ContractsStatistics"
import { ContractsList } from "@/components/contracts/ContractsList"
import { ContractsTabsContent } from "@/components/contracts/ContractsTabsContent"
import { ContractWizard } from "@/components/contracts/ContractWizard"
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager"
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog"
import { ContractStatusManagement } from "@/components/contracts/ContractStatusManagement"
import { ContractDetailsDialog } from "@/components/contracts/ContractDetailsDialog"
import { ContractSearchFilters } from "@/components/contracts/ContractSearchFilters"
import { ContractInvoiceDialog } from "@/components/contracts/ContractInvoiceDialog"
import { ContractExportDialog } from "@/components/contracts/ContractExportDialog"
import { ContractCreationProgress } from "@/components/contracts/ContractCreationProgress"
import { ContractCancellationDialog } from "@/components/contracts/ContractCancellationDialog"
import { ContractCSVUpload } from "@/components/contracts/ContractCSVUpload"

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
  const [showCSVUpload, setShowCSVUpload] = useState(false)
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
    <div className="space-y-6">
      {/* Header */}
      <ContractsHeader
        onCreateContract={handleCreateContract}
        onShowTemplates={handleShowTemplates}
        onShowExport={handleShowExport}
        onShowCSVUpload={handleShowCSVUpload}
      />

      {/* Statistics Cards */}
      <ContractsStatistics
        activeCount={statistics.activeContracts.length}
        draftCount={statistics.draftContracts.length}
        cancelledCount={statistics.cancelledContracts.length}
        totalRevenue={statistics.totalRevenue}
      />

      {/* Search and Filters */}
      <ContractSearchFilters 
        onFiltersChange={setFilters}
        activeFilters={filters}
      />

      {/* Contract Management Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expired">المنتهية</TabsTrigger>
          <TabsTrigger value="suspended">المعلقة</TabsTrigger>
          <TabsTrigger value="active">النشطة</TabsTrigger>
          <TabsTrigger value="alerts">تنبيهات الانتهاء</TabsTrigger>
          <TabsTrigger value="all">جميع العقود</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <ContractsList
            contracts={filteredContracts}
            onRenewContract={handleRenewContract}
            onManageStatus={handleManageStatus}
            onViewDetails={handleViewDetails}
            onCancelContract={handleCancelContract}
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
        />
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
      
      {/* Contract Creation Progress Dialog */}
      <Dialog open={showCreationProgress} onOpenChange={(open) => {
        if (!open && !creationState.isProcessing) {
          setShowCreationProgress(false)
          resetCreationState()
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <ContractCreationProgress
            creationState={creationState}
            onRetry={handleCreationRetry}
            onClose={handleCreationComplete}
          />
        </DialogContent>
      </Dialog>

      <ContractCancellationDialog
        open={showCancellationDialog}
        onOpenChange={setShowCancellationDialog}
        contract={selectedContract}
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
    </div>
  )
}