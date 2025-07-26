import { useState } from "react"
import { Plus, Calendar, FileText, DollarSign, Users, AlertCircle, CheckCircle, Clock, RefreshCw, Settings, Pause, XCircle } from "lucide-react"
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
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { useAutoRenewContracts } from "@/hooks/useContractRenewal"

export default function Contracts() {
  const [showContractForm, setShowContractForm] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [showRenewalDialog, setShowRenewalDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [filters, setFilters] = useState<any>({})
  const { user } = useAuth()
  const autoRenewContracts = useAutoRenewContracts()

  // Fetch contracts
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
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

  const handleContractSubmit = async (contractData: any) => {
    try {
      const { error } = await supabase
        .from('contracts')
        .insert([{
          ...contractData,
          company_id: user?.profile?.company_id || user?.company?.id,
          created_by: user?.id
        }])

      if (error) throw error
      
      refetch()
      setShowContractForm(false)
    } catch (error) {
      console.error('Error creating contract:', error)
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
          <Button variant="outline" onClick={handleAutoRenew} disabled={autoRenewContracts.isPending}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {autoRenewContracts.isPending ? 'جاري التجديد...' : 'تجديد تلقائي'}
          </Button>
          <Button onClick={() => setShowContractForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            عقد جديد
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

      {/* Contract Management Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">جميع العقود</TabsTrigger>
          <TabsTrigger value="alerts">تنبيهات الانتهاء</TabsTrigger>
          <TabsTrigger value="active">النشطة</TabsTrigger>
          <TabsTrigger value="suspended">المعلقة</TabsTrigger>
          <TabsTrigger value="expired">المنتهية</TabsTrigger>
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
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        عقد رقم {contract.contract_number}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {contract.contract_type === 'rental' ? 'عقد إيجار' : 'عقد خدمات'}
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
                            {contract.contract_type === 'rental' ? 'عقد إيجار' : 'عقد خدمات'}
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
                            {contract.contract_type === 'rental' ? 'عقد إيجار' : 'عقد خدمات'}
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
                            {contract.contract_type === 'rental' ? 'عقد إيجار' : 'عقد خدمات'}
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
    </div>
  )
}