import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { Plus, Calendar, FileText, DollarSign, Users, AlertCircle, CheckCircle, Clock, RefreshCw, Settings, Pause, XCircle, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ContractForm } from "@/components/finance/ContractForm"
import { ContractExpirationAlerts } from "@/components/contracts/ContractExpirationAlerts"
import { ContractRenewalDialog } from "@/components/contracts/ContractRenewalDialog"
import { ContractStatusManagement } from "@/components/contracts/ContractStatusManagement"
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
  const [showContractForm, setShowContractForm] = useState(false)
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
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Handle pre-selected customer from navigation
  useEffect(() => {
    if (location.state?.selectedCustomerId) {
      setPreselectedCustomerId(location.state.selectedCustomerId)
      setShowContractForm(true)
    }
  }, [location.state])

  // Fetch contracts
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            company_name,
            phone,
            email
          ),
          vehicles (
            plate_number,
            make,
            model,
            year
          ),
          chart_of_accounts (
            account_code,
            account_name,
            account_name_ar
          )
        `)
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
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
      setShowContractForm(false)
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

  const handleFixDraftContracts = async () => {
    try {
      // أولاً، نزيل معرف القيد المحاسبي من العقود المسودة لتجنب مشاكل النظام المحاسبي
      const { error: updateJournalError } = await supabase
        .from('contracts')
        .update({ journal_entry_id: null })
        .eq('company_id', user?.profile?.company_id)
        .eq('status', 'draft')

      if (updateJournalError) {
        console.error('❌ Error removing journal entries:', updateJournalError)
        throw updateJournalError
      }

      // ثم نحدث العقود المسودة ذات البيانات الصحيحة إلى حالة نشطة
      const { data, error } = await supabase
        .from('contracts')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('company_id', user?.profile?.company_id)
        .eq('status', 'draft')
        .gt('contract_amount', 0)
        .neq('customer_id', null)
        .neq('start_date', null)
        .neq('end_date', null)
        .select()

      if (error) throw error

      // عرض رسالة نجاح مع عدد العقود المفعلة
      const activatedCount = data?.length || 0
      
      toast({
        title: "تم تفعيل العقود بنجاح",
        description: `تم تفعيل ${activatedCount} عقد من المسودات`,
      })

      // إعادة تحميل البيانات
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      refetch()
      
      console.log('✅ تم تفعيل العقود المسودة بنجاح')
    } catch (error) {
      console.error('❌ خطأ في تفعيل العقود المسودة:', error)
      
      toast({
        title: "خطأ في تفعيل العقود",
        description: "حدث خطأ أثناء تفعيل العقود المسودة",
        variant: "destructive",
      })
    }
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
          <Button variant="outline" onClick={() => setShowExportDialog(true)}>
            <FileText className="h-4 w-4 mr-2" />
            تصدير التقرير
          </Button>
          {draftContracts.length > 0 && (
            <Button variant="outline" onClick={handleFixDraftContracts}>
              <CheckCircle className="h-4 w-4 mr-2" />
              تفعيل المسودات ({draftContracts.length})
            </Button>
          )}
          <Button variant="outline" onClick={handleAutoRenew} disabled={autoRenewContracts.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {autoRenewContracts.isPending ? 'جاري التجديد...' : 'تجديد تلقائي'}
          </Button>
          <Button onClick={() => {
            setPreselectedCustomerId(null)
            setShowContractForm(true)
          }}>
            <Plus className="h-4 w-4 mr-2" />
            عقد جديد
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => {
              setPreselectedCustomerId(null)
              setShowContractForm(true)
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            تجربة النظام
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
            {contracts?.map((contract) => (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">عقد رقم {contract.contract_number}</h3>
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
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {(() => {
                          const customer = Array.isArray(contract.customers) ? contract.customers[0] : contract.customers;
                          return customer?.company_name || 
                                 `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim() || 
                                 'غير محدد';
                        })()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                         {getContractTypeLabel(contract.contract_type)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(contract.start_date).toLocaleDateString('ar-SA')} - {new Date(contract.end_date).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {contract.contract_amount?.toFixed(3)} د.ك
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {contract.chart_of_accounts?.account_code} - {contract.chart_of_accounts?.account_name || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                  
                  {contract.description && (
                    <p className="text-sm text-muted-foreground">{contract.description}</p>
                  )}
                </div>
                
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
              </div>
              </CardContent>
            </Card>
          ))}
          
          {contracts?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عقود بعد</h3>
              <p className="text-muted-foreground text-center mb-4">
                ابدأ في إنشاء أول عقد لعملائك
              </p>
              <Button onClick={() => setShowContractForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إنشاء عقد جديد
              </Button>
            </CardContent>
          </Card>
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
                            {new Date(contract.start_date).toLocaleDateString('ar-SA')} - {new Date(contract.end_date).toLocaleDateString('ar-SA')}
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
                            {new Date(contract.start_date).toLocaleDateString('ar-SA')} - {new Date(contract.end_date).toLocaleDateString('ar-SA')}
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
                            انتهى في {new Date(contract.end_date).toLocaleDateString('ar-SA')}
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
      <ContractForm 
        open={showContractForm} 
        onOpenChange={setShowContractForm}
        onSubmit={handleContractSubmit}
        preselectedCustomerId={preselectedCustomerId}
      />
      
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
    </div>
  )
}