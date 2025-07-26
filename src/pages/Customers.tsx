import { useState } from "react"
import { Plus, Users, Building, Phone, Mail, MapPin, UserX, FileText, Search, Filter, Edit, Eye, FileBarChart, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCustomers, useToggleCustomerBlacklist } from "@/hooks/useCustomers"
import { CustomerForm } from "@/components/customers/CustomerForm"
import { CustomerDetailsDialog } from "@/components/customers/CustomerDetailsDialog"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"

export default function Customers() {
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [filters, setFilters] = useState({
    customer_type: undefined as 'individual' | 'corporate' | undefined,
    is_blacklisted: undefined as boolean | undefined,
    search: ''
  })

  const navigate = useNavigate()
  const { data: customers, isLoading } = useCustomers(filters)
  const toggleBlacklistMutation = useToggleCustomerBlacklist()

  // Customer statistics
  const allCustomers = customers || []
  const individualCustomers = allCustomers.filter(c => c.customer_type === 'individual')
  const companyCustomers = allCustomers.filter(c => c.customer_type === 'corporate')
  const blacklistedCustomers = allCustomers.filter(c => c.is_blacklisted)
  const activeCustomers = allCustomers.filter(c => c.is_active)

  const handleViewCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId)
  }

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer)
    setShowCustomerForm(true)
  }

  const handleCreateContract = () => {
    // Navigate to contracts page with customer pre-selected
    navigate('/contracts', { state: { selectedCustomerId } })
  }

  const handleToggleBlacklist = (customerId: string, isBlacklisted: boolean) => {
    const reason = isBlacklisted ? prompt('سبب الحظر:') : undefined
    if (isBlacklisted && !reason) return

    toggleBlacklistMutation.mutate({
      customerId,
      isBlacklisted,
      reason
    })
  }

  const resetFilters = () => {
    setFilters({
      customer_type: undefined,
      is_blacklisted: undefined,
      search: ''
    })
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
          <h1 className="text-3xl font-bold tracking-tight">إدارة العملاء</h1>
          <p className="text-muted-foreground">
            قاعدة بيانات شاملة لإدارة معلومات العملاء والحسابات المالية
          </p>
        </div>
        <Button onClick={() => setShowCustomerForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          عميل جديد
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">البحث</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم، الهاتف، البريد..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع العميل</label>
              <Select 
                value={filters.customer_type || 'all'} 
                onValueChange={(value) => setFilters({ 
                  ...filters, 
                  customer_type: value === 'all' ? undefined : value as 'individual' | 'corporate'
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العملاء</SelectItem>
                  <SelectItem value="individual">أفراد</SelectItem>
                  <SelectItem value="corporate">شركات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">الحالة</label>
              <Select 
                value={
                  filters.is_blacklisted === true ? 'blacklisted' : 
                  filters.is_blacklisted === false ? 'active' : 'all'
                } 
                onValueChange={(value) => setFilters({ 
                  ...filters, 
                  is_blacklisted: value === 'all' ? undefined : value === 'blacklisted'
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="blacklisted">محظور</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={resetFilters} className="w-full">
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeCustomers.length}</div>
            <p className="text-xs text-muted-foreground">عميل نشط</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء الأفراد</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{individualCustomers.length}</div>
            <p className="text-xs text-muted-foreground">عميل فردي</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء الشركات</CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{companyCustomers.length}</div>
            <p className="text-xs text-muted-foreground">شركة</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القائمة السوداء</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{blacklistedCustomers.length}</div>
            <p className="text-xs text-muted-foreground">عميل محظور</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <div className="grid gap-4">
        {customers?.map((customer) => {
          const customerBalance = (customer.customer_accounts as any)?.[0]?.account?.current_balance || 0
          const contractsCount = (customer.contracts as any)?.[0]?.count || 0
          
          return (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {customer.customer_type === 'corporate' ? (
                        <Building className="h-5 w-5 text-purple-600" />
                      ) : (
                        <Users className="h-5 w-5 text-green-600" />
                      )}
                      <h3 className="font-semibold text-lg">
                        {customer.customer_type === 'corporate' 
                          ? customer.company_name 
                          : `${customer.first_name} ${customer.last_name}`}
                      </h3>
                      {customer.is_blacklisted && (
                        <Badge variant="destructive">
                          <UserX className="h-3 w-3 mr-1" />
                          محظور
                        </Badge>
                      )}
                      {contractsCount > 0 && (
                        <Badge variant="outline">
                          {contractsCount} عقد
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{customer.phone}</span>
                      </div>
                      
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{customer.email}</span>
                        </div>
                      )}
                      
                      {customer.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{customer.city}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <FileBarChart className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          الرصيد: {customerBalance.toFixed(3)} د.ك
                        </span>
                      </div>
                    </div>
                    
                    {customer.notes && (
                      <p className="text-sm text-muted-foreground">{customer.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewCustomer(customer.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      عرض
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditCustomer(customer)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      تعديل
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleBlacklist(customer.id, !customer.is_blacklisted)}
                    >
                      <ShieldX className="h-4 w-4 mr-1" />
                      {customer.is_blacklisted ? 'إلغاء الحظر' : 'حظر'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {customers?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عملاء</h3>
              <p className="text-muted-foreground text-center mb-4">
                {Object.values(filters).some(v => v) 
                  ? 'لا توجد نتائج تطابق معايير البحث المحددة'
                  : 'ابدأ في إضافة أول عميل إلى قاعدة البيانات'
                }
              </p>
              {!Object.values(filters).some(v => v) && (
                <Button onClick={() => setShowCustomerForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل جديد
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Customer Form Dialog */}
      <CustomerForm
        open={showCustomerForm}
        onOpenChange={(open) => {
          setShowCustomerForm(open)
          if (!open) {
            setEditingCustomer(null)
          }
        }}
        customer={editingCustomer}
        mode={editingCustomer ? 'edit' : 'create'}
      />

      {/* Customer Details Dialog */}
      {selectedCustomerId && (
        <CustomerDetailsDialog
          open={!!selectedCustomerId}
          onOpenChange={(open) => !open && setSelectedCustomerId(null)}
          customerId={selectedCustomerId}
          onEdit={() => {
            const customer = customers?.find(c => c.id === selectedCustomerId)
            if (customer) {
              handleEditCustomer(customer)
              setSelectedCustomerId(null)
            }
          }}
          onCreateContract={handleCreateContract}
        />
      )}
    </div>
  )
}