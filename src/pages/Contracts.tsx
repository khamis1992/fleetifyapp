import { useState } from "react"
import { Plus, Calendar, FileText, DollarSign, Users, AlertCircle, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { ContractForm } from "@/components/finance/ContractForm"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"

export default function Contracts() {
  const [showContractForm, setShowContractForm] = useState(false)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const { user } = useAuth()

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
  const totalRevenue = activeContracts.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'draft': return <Clock className="h-4 w-4" />
      case 'expired': return <AlertCircle className="h-4 w-4" />
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
        <Button onClick={() => setShowContractForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          عقد جديد
        </Button>
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
            <CardTitle className="text-sm font-medium">العقود المنتهية</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredContracts.length}</div>
            <p className="text-xs text-muted-foreground">انتهت الصلاحية</p>
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

      {/* Contracts List */}
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
                         contract.status === 'expired' ? 'منتهي' : 'ملغي'}
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
                  <Button variant="outline" size="sm">
                    عرض
                  </Button>
                  <Button variant="outline" size="sm">
                    تعديل
                  </Button>
                  <Button variant="outline" size="sm">
                    طباعة
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

      {/* Contract Form Dialog */}
      <ContractForm 
        open={showContractForm} 
        onOpenChange={setShowContractForm}
        onSubmit={handleContractSubmit}
      />
    </div>
  )
}