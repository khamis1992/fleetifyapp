import { useState, useEffect, useMemo } from "react"
import { useLocation } from "react-router-dom"
import { Plus, Calendar, FileText, DollarSign, Users, AlertCircle, CheckCircle, Clock, RefreshCw, Settings, Pause, XCircle, Building2, X, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContractWizard } from "@/components/contracts/ContractWizard"
import { ContractTemplateManager } from "@/components/contracts/ContractTemplateManager"
import { ContractExpirationAlerts } from "@/components/contracts/ContractExpirationAlerts"
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog"
import { ContractStatusManagement } from "@/components/contracts/ContractStatusManagement"
import { useManualContractStatusUpdate } from "@/hooks/useContractStatusChecker"
import { ContractDetailsDialog } from "@/components/contracts/ContractDetailsDialog"
import { ContractSearchFilters } from "@/components/contracts/ContractSearchFilters"
import { ContractInvoiceDialog } from "@/components/contracts/ContractInvoiceDialog"
import { ContractExportDialog } from "@/components/contracts/ContractExportDialog"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useAutoRenewContracts } from "@/hooks/useContractRenewal"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"

export default function Contracts() {
  const [showContractWizard, setShowContractWizard] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | null>(null)
  const location = useLocation()
  const [showRenewalDialog, setShowRenewalDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [filters, setFilters] = useState<any>({})
  const { user } = useAuth()
  const autoRenewContracts = useAutoRenewContracts()
  const manualStatusUpdate = useManualContractStatusUpdate()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Handle pre-selected customer from navigation
  useEffect(() => {
    if (location.state?.selectedCustomerId) {
      setPreselectedCustomerId(location.state.selectedCustomerId)
      setShowContractWizard(true)
    }
  }, [location.state])

  // Fetch contracts
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      console.log('🔍 [CONTRACTS_QUERY] Fetching contracts for company:', user.profile.company_id)
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [CONTRACTS_QUERY] Error fetching contracts:', error)
        throw error
      }
      
      console.log('✅ [CONTRACTS_QUERY] Successfully fetched contracts:', data?.length || 0)
      return data || []
    },
    enabled: !!user?.profile?.company_id
  })

  // Contract statistics
  const activeContracts = contracts?.filter(c => c.status === 'active') || []
  const draftContracts = contracts?.filter(c => c.status === 'draft') || []
  const expiredContracts = contracts?.filter(c => c.status === 'expired') || []
  const suspendedContracts = contracts?.filter(c => c.status === 'suspended') || []
  const cancelledContracts = contracts?.filter(c => c.status === 'cancelled') || []
  const totalRevenue = activeContracts.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'suspended': return 'bg-orange-100 text-orange-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'renewed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'draft': return <Clock className="h-4 w-4" />
      case 'expired': return <AlertCircle className="h-4 w-4" />
      case 'suspended': return <Pause className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      case 'renewed': return <RefreshCw className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'rent_to_own': return 'إيجار حتى التملك'
      case 'rental': return 'إيجار'
      case 'daily_rental': return 'إيجار يومي'
      case 'weekly_rental': return 'إيجار أسبوعي'
      case 'monthly_rental': return 'إيجار شهري'
      case 'yearly_rental': return 'إيجار سنوي'
      default: return 'إيجار'
    }
  }

  // Apply filters to contracts
  const filteredContracts = useMemo(() => {
    console.log('🔍 [CONTRACTS_FILTER] Applying filters', { 
      filtersApplied: Object.keys(filters).length > 0,
      filters, 
      contractsLength: contracts?.length 
    })
    
    if (!contracts || contracts.length === 0) {
      console.log('🔍 [CONTRACTS_FILTER] No contracts data available')
      return []
    }
    
    // If no filters are applied, return all contracts
    if (!filters || Object.keys(filters).length === 0) {
      console.log('🔍 [CONTRACTS_FILTER] No filters applied, returning all contracts:', contracts.length)
      return contracts
    }
    
    const result = contracts.filter(contract => {
      // Search filter - check contract number, description
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim()
        
        const searchableText = [
          contract.contract_number || '',
          contract.description || '',
          contract.terms || ''
        ].join(' ').toLowerCase()
        
        if (!searchableText.includes(searchTerm)) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by search:', contract.contract_number)
          return false
        }
      }

      // Status filter
      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        if (contract.status !== filters.status) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by status:', contract.contract_number, contract.status, 'vs', filters.status)
          return false
        }
      }

      // Contract type filter
      if (filters.contract_type && filters.contract_type !== 'all' && filters.contract_type !== '') {
        if (contract.contract_type !== filters.contract_type) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by type:', contract.contract_number)
          return false
        }
      }

      // Customer filter
      if (filters.customer_id && filters.customer_id !== 'all' && filters.customer_id !== '') {
        if (contract.customer_id !== filters.customer_id) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by customer:', contract.contract_number)
          return false
        }
      }

      // Cost center filter
      if (filters.cost_center_id && filters.cost_center_id !== 'all' && filters.cost_center_id !== '') {
        if (contract.cost_center_id !== filters.cost_center_id) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by cost center:', contract.contract_number)
          return false
        }
      }

      // Date range filters
      if (filters.start_date && filters.start_date !== '') {
        const contractStartDate = new Date(contract.start_date)
        const filterStartDate = new Date(filters.start_date)
        if (contractStartDate < filterStartDate) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by start date:', contract.contract_number)
          return false
        }
      }

      if (filters.end_date && filters.end_date !== '') {
        const contractEndDate = new Date(contract.end_date)
        const filterEndDate = new Date(filters.end_date)
        if (contractEndDate > filterEndDate) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by end date:', contract.contract_number)
          return false
        }
      }

      // Amount range filters
      if (filters.min_amount && filters.min_amount !== '') {
        const minAmount = parseFloat(filters.min_amount)
        if (!isNaN(minAmount) && contract.contract_amount < minAmount) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by min amount:', contract.contract_number)
          return false
        }
      }

      if (filters.max_amount && filters.max_amount !== '') {
        const maxAmount = parseFloat(filters.max_amount)
        if (!isNaN(maxAmount) && contract.contract_amount > maxAmount) {
          console.log('🔍 [CONTRACTS_FILTER] Contract filtered out by max amount:', contract.contract_number)
          return false
        }
      }

      console.log('✅ [CONTRACTS_FILTER] Contract passed all filters:', contract.contract_number, contract.status)
      return true
    })
    
    console.log('🔍 [CONTRACTS_FILTER] Final filtered results:', result.length, 'out of', contracts.length)
    return result
  }, [contracts, filters])

  const handleContractSubmit = async (contractData: any) => {
    try {
      console.log('📋 [CONTRACT_SUBMIT] Raw form data:', contractData)
      
      // Remove fields that don't exist in the contracts table
      const { rental_days, ...contractInsertData } = contractData
      
      // Prepare the final data for database insertion
      const finalData = {
        ...contractInsertData,
        company_id: user?.profile?.company_id || user?.company?.id,
        created_by: user?.id
      }
      
      console.log('💾 [CONTRACT_SUBMIT] Data being sent to database:', finalData)
      
      const { error } = await supabase
        .from('contracts')
        .insert([finalData])

      if (error) {
        console.error('❌ [CONTRACT_SUBMIT] Database error:', error)
        throw error
      }
      
      console.log('✅ [CONTRACT_SUBMIT] Contract created successfully')
      refetch()
      setShowContractWizard(false)
      // Clear preselected customer after successful creation
      setPreselectedCustomerId(null)
    } catch (error) {
      console.error('❌ [CONTRACT_SUBMIT] Error creating contract:', error)
      // You could add a toast notification here to inform the user
    }
  }

  const handleRenewContract = (contract: any) => {
    setSelectedContract(contract)
    setShowRenewalDialog(true)
  }

  const handleManageStatus = (contract: any) => {
    setSelectedContract(contract)
    setShowStatusDialog(true)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة العقود</h1>
          <p className="text-muted-foreground">
            إدارة عقود الإيجار والخدمات مع العملاء
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateManager(true)}>
            <Settings className="h-4 w-4 mr-2" />
            القوالب
          </Button>
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            تصدير التقرير
          </Button>
          <Button onClick={() => {
            setPreselectedCustomerId(null)
            setShowContractWizard(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            إنشاء عقد جديد
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقود النشطة</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeContracts.length}</div>
            <p className="text-xs text-muted-foreground">قيد التنفيذ</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مسودات العقود</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftContracts.length}</div>
            <p className="text-xs text-muted-foreground">تحتاج مراجعة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العقود المعلقة</CardTitle>
            <Pause className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{suspendedContracts.length}</div>
            <p className="text-xs text-muted-foreground">معلقة مؤقتاً</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalRevenue.toFixed(3)} د.ك</div>
            <p className="text-xs text-muted-foreground">من العقود النشطة</p>
          </CardContent>
        </Card>
      </div>

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
          {/* All Contracts List */}
          <div className="grid gap-4">
            {(() => {
              console.log('📋 [ALL_CONTRACTS_TAB] Rendering', { 
                filteredContractsLength: filteredContracts?.length, 
                rawContractsLength: contracts?.length,
                filtersApplied: Object.keys(filters).length > 0,
                activeFilters: filters
              });
              return null;
            })()}
            
            {/* Render filtered contracts or all contracts */}
            {filteredContracts && filteredContracts.length > 0 ? (
              filteredContracts.map((contract) => (
                <Card key={contract.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between flex-row-reverse">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setSelectedContract(contract); setShowDetailsDialog(true); }}>
                          عرض
                        </Button>
                        {contract.status === 'active' && (
                          <Button variant="outline" size="sm" onClick={() => handleRenewContract(contract)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            تجديد
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleManageStatus(contract)}>
                          <Settings className="h-4 w-4 mr-2" />
                          إدارة
                        </Button>
                      </div>
                      
                      <div className="flex-1 space-y-2 ml-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Badge className={getStatusColor(contract.status)}>
                            {getStatusIcon(contract.status)}
                            <span className="mr-1">
                              {contract.status === 'active' ? 'نشط' :
                               contract.status === 'draft' ? 'مسودة' :
                               contract.status === 'expired' ? 'منتهي' :
                               contract.status === 'suspended' ? 'معلق' :
                               contract.status === 'cancelled' ? 'ملغي' :
                               contract.status === 'renewed' ? 'مجدد' : contract.status}
                            </span>
                          </Badge>
                          <h3 className="font-semibold text-lg">عقد رقم {contract.contract_number}</h3>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm">
                               {getContractTypeLabel(contract.contract_type)}
                            </span>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm">
                              {new Date(contract.start_date).toLocaleDateString('en-GB')} - {new Date(contract.end_date).toLocaleDateString('en-GB')}
                            </span>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm font-medium">
                              {contract.contract_amount?.toFixed(3)} د.ك
                            </span>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-sm">عميل رقم: {contract.customer_id}</span>
                            <Users className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        
                        {contract.description && (
                          <p className="text-sm text-muted-foreground text-right">{contract.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              /* Empty state handling */
              <>
                {/* Show no results when filters are applied but no matches */}
                {contracts && contracts.length > 0 && Object.keys(filters).length > 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        لم يتم العثور على عقود تطابق معايير البحث المحددة
                      </p>
                      <Button variant="outline" onClick={() => setFilters({})}>
                        <X className="h-4 w-4 mr-2" />
                        مسح جميع الفلاتر
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  /* Show empty state when no contracts exist at all */
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">لا توجد عقود بعد</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        ابدأ في إنشاء أول عقد لعملائك
                      </p>
                      <Button onClick={() => setShowContractWizard(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        إنشاء عقد جديد
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <ContractExpirationAlerts 
            onRenewContract={handleRenewContract}
            onViewContract={(contract) => console.log('View contract:', contract)}
            daysAhead={30}
          />
        </TabsContent>

        <TabsContent value="active">
          <div className="grid gap-4">
            {activeContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">عقد رقم {contract.contract_number}</h3>
                        <Badge className={getStatusColor(contract.status)}>
                          {getStatusIcon(contract.status)}
                          <span className="mr-1">نشط</span>
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(contract.start_date).toLocaleDateString('en-GB')} - {new Date(contract.end_date).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {contract.contract_amount?.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                             {getContractTypeLabel(contract.contract_type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRenewContract(contract)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        تجديد
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="suspended">
          <div className="grid gap-4">
            {suspendedContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">عقد رقم {contract.contract_number}</h3>
                        <Badge className={getStatusColor(contract.status)}>
                          {getStatusIcon(contract.status)}
                          <span className="mr-1">معلق</span>
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(contract.start_date).toLocaleDateString('en-GB')} - {new Date(contract.end_date).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {contract.contract_amount?.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                             {getContractTypeLabel(contract.contract_type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleManageStatus(contract)}>
                        <Settings className="h-4 w-4 mr-2" />
                        إدارة
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {suspendedContracts.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Pause className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد عقود معلقة</h3>
                  <p className="text-muted-foreground text-center">
                    جميع العقود في حالة نشطة أو منتهية
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="expired">
          <div className="grid gap-4">
            {expiredContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow border-red-200">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">عقد رقم {contract.contract_number}</h3>
                        <Badge className={getStatusColor(contract.status)}>
                          {getStatusIcon(contract.status)}
                          <span className="mr-1">منتهي</span>
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            انتهى في {new Date(contract.end_date).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {contract.contract_amount?.toFixed(3)} د.ك
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {getContractTypeLabel(contract.contract_type)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRenewContract(contract)}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        تجديد
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {expiredContracts.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد عقود منتهية</h3>
                  <p className="text-muted-foreground text-center">
                    جميع العقود في حالة نشطة أو معلقة
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
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
      
      {showTemplateManager && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold">قوالب العقود</h2>
              <Button variant="outline" onClick={() => setShowTemplateManager(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <ContractTemplateManager />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
