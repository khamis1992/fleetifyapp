import { useState } from "react"
import { Plus, Users, Building, Phone, Mail, MapPin, UserX, Search, Filter, Edit, Eye, ShieldX, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useCustomers, useToggleCustomerBlacklist } from "@/hooks/useEnhancedCustomers"
import { useDebounce } from "@/hooks/useDebounce"
import { CustomerForm } from "@/components/customers/CustomerForm"
import { CustomerDetailsDialog } from "@/components/customers/CustomerDetailsDialog"
import { CustomerDiagnostics } from "@/components/customers/CustomerDiagnostics"
import { InvoiceForm } from "@/components/finance/InvoiceForm"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"

export default function Customers() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceCustomerId, setInvoiceCustomerId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    customer_type: undefined as 'individual' | 'corporate' | undefined,
    is_blacklisted: undefined as boolean | undefined,
    search: ''
  })

  const debouncedSearch = useDebounce(filters.search, 300)
  const debouncedFilters = { ...filters, search: debouncedSearch }
  
  const { data: customers, isLoading, isFetching, error } = useCustomers(debouncedFilters)
  const toggleBlacklistMutation = useToggleCustomerBlacklist()

  // إحصائيات العملاء
  const allCustomers = customers || []
  const individualCustomers = allCustomers.filter(c => c.customer_type === 'individual')
  const companyCustomers = allCustomers.filter(c => c.customer_type === 'corporate')
  const blacklistedCustomers = allCustomers.filter(c => c.is_blacklisted)
  const activeCustomers = allCustomers.filter(c => c.is_active)

  const handleViewCustomer = (customerId: string) => {
    console.log('👁️ View customer clicked:', customerId)
    setSelectedCustomerId(customerId)
    console.log('📝 Selected customer ID set to:', customerId)
  }

  const handleEditCustomer = (customer: any) => {
    setEditingCustomer(customer)
    setShowCustomerForm(true)
  }

  const handleCreateContract = () => {
    navigate('/contracts', { state: { selectedCustomerId } })
  }

  const handleCreateInvoice = (customerId: string) => {
    setInvoiceCustomerId(customerId)
    setShowInvoiceForm(true)
    setSelectedCustomerId(null)
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

  const CustomerSkeleton = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  // التحقق من صلاحية المستخدم
  const canAddCustomers = user?.roles?.includes('super_admin') || 
    user?.roles?.includes('company_admin') || 
    user?.roles?.includes('manager') || 
    user?.roles?.includes('sales_agent')

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">العملاء</h1>
          <p className="text-muted-foreground mt-1">
            إدارة وتتبع معلومات العملاء
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowDiagnostics(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            تشخيص المشاكل
          </Button>
          <Button 
            onClick={() => setShowCustomerForm(true)}
            disabled={!canAddCustomers}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            إضافة عميل جديد
          </Button>
        </div>
      </div>

      {/* رسالة عدم وجود صلاحيات */}
      {!canAddCustomers && (
        <Alert>
          <AlertDescription>
            ليس لديك صلاحية لإضافة عملاء جدد. يرجى التواصل مع الإدارة للحصول على الصلاحيات المناسبة.
          </AlertDescription>
        </Alert>
      )}

      {/* رسالة خطأ */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            حدث خطأ أثناء تحميل بيانات العملاء. يرجى المحاولة مرة أخرى.
          </AlertDescription>
        </Alert>
      )}

      {/* مرشحات البحث */}
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
                {isFetching && filters.search && (
                  <LoadingSpinner size="sm" className="absolute right-3 top-3" />
                )}
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

      {/* بطاقات الإحصائيات */}
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

      {/* قائمة العملاء */}
      <div className="grid gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <CustomerSkeleton key={index} />
          ))
        ) : (
          customers?.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {customer.customer_type === 'corporate' ? (
                          <Building className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        ) : (
                          <Users className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-lg truncate">
                          {customer.customer_type === 'corporate' 
                            ? customer.company_name 
                            : `${customer.first_name} ${customer.last_name}`}
                        </h3>
                        {customer.is_blacklisted && (
                          <Badge variant="destructive" className="flex-shrink-0">
                            <UserX className="h-3 w-3 mr-1" />
                            محظور
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0">
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
                        disabled={!canAddCustomers}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        تعديل
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleToggleBlacklist(customer.id, !customer.is_blacklisted)}
                        disabled={!canAddCustomers}
                      >
                        <ShieldX className="h-4 w-4 mr-1" />
                        {customer.is_blacklisted ? 'إلغاء الحظر' : 'حظر'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{customer.phone}</span>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{customer.email}</span>
                      </div>
                    )}
                    
                    {customer.city && (
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{customer.city}</span>
                      </div>
                    )}
                  </div>
                  
                  {customer.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{customer.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        
        {!isLoading && customers?.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عملاء</h3>
              <p className="text-muted-foreground text-center mb-4">
                {Object.values(debouncedFilters).some(v => v) 
                  ? 'لا توجد نتائج تطابق معايير البحث المحددة'
                  : 'ابدأ في إضافة أول عميل إلى قاعدة البيانات'
                }
              </p>
              {!Object.values(debouncedFilters).some(v => v) && canAddCustomers && (
                <Button onClick={() => setShowCustomerForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل جديد
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* نماذج الحوار */}
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

      <CustomerDiagnostics
        open={showDiagnostics}
        onOpenChange={setShowDiagnostics}
      />

      {(() => {
        console.log('🔍 Checking selectedCustomerId:', selectedCustomerId)
        console.log('🔍 Boolean check:', !!selectedCustomerId)
        return selectedCustomerId && (
          <CustomerDetailsDialog
            open={!!selectedCustomerId}
            onOpenChange={(open) => {
              console.log('📝 Dialog onOpenChange called with:', open)
              if (!open) setSelectedCustomerId(null)
            }}
            customerId={selectedCustomerId}
            onEdit={() => {
              const customer = customers?.find(c => c.id === selectedCustomerId)
              if (customer) {
                handleEditCustomer(customer)
                setSelectedCustomerId(null)
              }
            }}
            onCreateContract={handleCreateContract}
            onCreateInvoice={() => {
              if (selectedCustomerId) {
                handleCreateInvoice(selectedCustomerId)
              }
            }}
          />
        )
      })()}

      <InvoiceForm
        open={showInvoiceForm}
        onOpenChange={(open) => {
          setShowInvoiceForm(open)
          if (!open) {
            setInvoiceCustomerId(null)
          }
        }}
        customerId={invoiceCustomerId}
        type="sales"
      />
    </div>
  )
}
