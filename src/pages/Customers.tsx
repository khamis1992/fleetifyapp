import { useState, useEffect } from "react"
import { Plus, Users, Building, Phone, Mail, MapPin, UserX, Search, Filter, Edit, Eye, ShieldX, Trash2, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useCustomers, useToggleCustomerBlacklist } from "@/hooks/useEnhancedCustomers"
import { useOptimizedDeleteCustomer } from "@/hooks/useOptimizedDeleteCustomer"
import { useDebounce } from "@/hooks/useDebounce"
import { EnhancedCustomerDialog } from "@/components/customers/EnhancedCustomerForm"
import { CustomerDetailsDialog } from "@/components/customers/CustomerDetailsDialog"
import { InvoiceForm } from "@/components/finance/InvoiceForm"
import { CustomerCSVUpload } from "@/components/customers/CustomerCSVUpload"
import { CustomerDisplayName } from "@/components/customers/CustomerDisplayName"
import { BulkDeleteCustomersDialog } from "@/components/customers/BulkDeleteCustomersDialog"
import { MobileCustomerCard } from "@/components/customers/MobileCustomerCard"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useCompanyContext } from "@/contexts/CompanyContext"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { LogIn } from "lucide-react"
import { useCustomersRealtime } from "@/hooks/useEnhancedCustomersRealtime"
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple'
import { useAdaptiveLayout } from '@/hooks/useAdaptiveLayout'
import { ResponsiveContainer } from '@/components/ui/responsive-container'
import { ResponsiveCard, ResponsiveCardHeader, ResponsiveCardTitle, ResponsiveCardContent } from '@/components/ui/responsive-card'
import { DataGrid, DashboardGrid } from '@/components/ui/responsive-grid'

import { useQueryClient } from "@tanstack/react-query"
import { CustomerViewProvider } from "@/contexts/CustomerViewContext"

export default function Customers() {
  // Responsive hooks
  const { isMobile, isTablet, isDesktop } = useSimpleBreakpoint()
  const { 
    containerPadding, 
    itemSpacing, 
    gridCols,
    isCardLayout 
  } = useAdaptiveLayout({
    mobileViewMode: 'stack',
    tabletColumns: 2,
    desktopColumns: 3,
    cardLayout: true
  })
  const { user, loading } = useAuth()
  const { browsedCompany, isBrowsingMode, exitBrowseMode } = useCompanyContext()
  const { companyId, isSystemLevel, hasFullCompanyControl } = useUnifiedCompanyAccess()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [invoiceCustomerId, setInvoiceCustomerId] = useState<string | null>(null)
  const [showCSVUpload, setShowCSVUpload] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState<any>(null)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [filters, setFilters] = useState({
    customer_type: undefined as 'individual' | 'corporate' | undefined,
    is_blacklisted: undefined as boolean | undefined,
    search: '',
    customer_code: ''
  })

  const debouncedSearch = useDebounce(filters.search, 300)
  const debouncedFilters = { ...filters, search: debouncedSearch }
  
  const { data: customers, isLoading, isFetching, error } = useCustomers(debouncedFilters)
  const toggleBlacklistMutation = useToggleCustomerBlacklist()
  const deleteCustomerMutation = useOptimizedDeleteCustomer()
  
  // إعداد Real-time updates
  useCustomersRealtime()

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

  const handleDeleteCustomer = (customer: any) => {
    setCustomerToDelete(customer)
  }

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete, {
        onSuccess: () => {
          setCustomerToDelete(null)
        },
        onError: () => {
          setCustomerToDelete(null)
        }
      })
    }
  }

  const resetFilters = () => {
    setFilters({
      customer_type: undefined,
      is_blacklisted: undefined,
      search: '',
      customer_code: ''
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
  
  const canDeleteCustomers = user?.roles?.includes('super_admin') || 
    user?.roles?.includes('company_admin') || 
    user?.roles?.includes('manager')
  
  const isSuperAdmin = user?.roles?.includes('super_admin')

  // إذا كان التحميل جاري
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // إذا لم يكن المستخدم مسجل دخول
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <LogIn className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">يتطلب تسجيل الدخول</h2>
          <p className="text-muted-foreground mb-6">
            يجب تسجيل الدخول لعرض وإدارة العملاء
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/auth')} className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <CustomerViewProvider>
    <ResponsiveContainer className="space-y-4 md:space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">العملاء</h1>
          <p className="text-muted-foreground mt-1">
            إدارة وتتبع معلومات العملاء
          </p>
        </div>
        
        {/* Desktop Actions */}
        {!isMobile && (
          <div className="flex gap-2">
            {canDeleteCustomers && allCustomers.length > 0 && (
              <Button 
                onClick={() => setShowBulkDeleteDialog(true)}
                variant="destructive"
                size="lg"
                className="flex items-center gap-2 h-11 px-6 rounded-xl shadow-sm font-medium"
              >
                <Trash className="h-4 w-4" />
                حذف جميع العملاء
              </Button>
            )}
            {isSuperAdmin && (
              <Button 
                onClick={() => setShowCSVUpload(true)}
                variant="outline"
                size="lg"
                className="flex items-center gap-2 h-11 px-6 rounded-xl shadow-sm font-medium border-2"
              >
                <Plus className="h-4 w-4" />
                رفع من CSV
              </Button>
            )}
            <Button 
              onClick={() => setShowCustomerForm(true)}
              disabled={!canAddCustomers}
              size="lg"
              className="flex items-center gap-2 h-11 px-6 rounded-xl shadow-lg font-medium"
            >
              <Plus className="h-4 w-4" />
              إضافة عميل جديد
            </Button>
          </div>
        )}
        
        {/* Mobile Actions */}
        {isMobile && (
          <div className="w-full space-y-3">
            {/* Primary Action */}
            <Button 
              onClick={() => setShowCustomerForm(true)}
              disabled={!canAddCustomers}
              size="lg"
              className="w-full h-12 gap-3 rounded-xl shadow-lg font-medium text-base"
            >
              <Plus className="h-5 w-5" />
              إضافة عميل جديد
            </Button>
            
            {/* Secondary Actions */}
            <div className="flex gap-2">
              {isSuperAdmin && (
                <Button 
                  onClick={() => setShowCSVUpload(true)}
                  variant="outline"
                  size="lg"
                  className="flex-1 h-11 gap-2 rounded-xl shadow-sm font-medium border-2"
                >
                  <Plus className="h-4 w-4" />
                  رفع CSV
                </Button>
              )}
              {canDeleteCustomers && allCustomers.length > 0 && (
                <Button 
                  onClick={() => setShowBulkDeleteDialog(true)}
                  variant="destructive"
                  size="lg"
                  className="flex-1 h-11 gap-2 rounded-xl shadow-sm font-medium"
                >
                  <Trash className="h-4 w-4" />
                  حذف الكل
                </Button>
              )}
            </div>
          </div>
        )}
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
            حدث خطأ أثناء تحميل بيانات العملاء: {error.message || 'يرجى المحاولة مرة أخرى.'}
            {!user && (
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => navigate('/auth')}
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-3 w-3" />
                  تسجيل الدخول
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* رسالة عدم وجود عملاء */}
      {!error && allCustomers.length === 0 && !isLoading && (
        <Alert>
          <AlertDescription>
            لا توجد عملاء في الشركة الحالية.
          </AlertDescription>
        </Alert>
      )}

      {/* مرشحات البحث */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium">كود العميل</label>
              <Input
                placeholder="CUST-24-IND-001"
                value={filters.customer_code}
                onChange={(e) => setFilters({ ...filters, customer_code: e.target.value })}
                className="font-mono"
              />
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
              <Button 
                variant="outline" 
                onClick={resetFilters} 
                className={`w-full ${isMobile ? 'h-11 rounded-xl font-medium' : ''}`}
              >
                إعادة تعيين
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* بطاقات الإحصائيات */}
      <DashboardGrid variant="stats" gap={isMobile ? "sm" : "default"}>
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
      </DashboardGrid>

      {/* قائمة العملاء - Mobile Responsive */}
      <ResponsiveCard className="border-border/50">
        <ResponsiveCardHeader className="pb-3">
          <ResponsiveCardTitle className="flex items-center justify-between text-lg">
            قائمة العملاء
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              {customers?.length || 0}
            </Badge>
          </ResponsiveCardTitle>
        </ResponsiveCardHeader>
        <ResponsiveCardContent>
          {isMobile || isCardLayout ? (
            // Mobile/Card View
            <DataGrid density={isMobile ? "compact" : "comfortable"} gap="sm">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <CustomerSkeleton key={index} />
          ))
        ) : (
          customers?.map((customer) => (
            <MobileCustomerCard
              key={customer.id}
              customer={customer}
              onView={handleViewCustomer}
              onEdit={(customer) => {
                setEditingCustomer(customer)
                setShowCustomerForm(true)
              }}
              onToggleBlacklist={handleToggleBlacklist}
              onDelete={handleDeleteCustomer}
              canEdit={canAddCustomers}
              canDelete={canDeleteCustomers}
            />
          ))
        )}
        
        {!isLoading && customers?.length === 0 && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا توجد عملاء</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                {Object.values(debouncedFilters).some(v => v) 
                  ? 'لا توجد نتائج تطابق معايير البحث المحددة'
                  : 'ابدأ في إضافة أول عميل إلى قاعدة البيانات'
                }
              </p>
              {!Object.values(debouncedFilters).some(v => v) && canAddCustomers && (
                <Button 
                  onClick={() => setShowCustomerForm(true)} 
                  size={isMobile ? "lg" : "default"}
                  className={`mt-2 ${isMobile ? 'h-12 gap-3 rounded-xl shadow-lg font-medium text-base' : ''}`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل جديد
                </Button>
              )}
              {Object.values(debouncedFilters).some(v => v) && (
                <Button 
                  variant="outline" 
                  onClick={resetFilters} 
                  size={isMobile ? "lg" : "default"}
                  className={`mt-2 ${isMobile ? 'h-11 rounded-xl font-medium border-2' : ''}`}
                >
                  إعادة تعيين المرشحات
                </Button>
              )}
            </CardContent>
          </Card>
        )}
            </DataGrid>
          ) : (
            // Desktop Table View - placeholder for now
            <div className="text-center py-8 text-muted-foreground">
              عرض الجدول سيتم تحديثه قريباً
            </div>
          )}
        </ResponsiveCardContent>
      </ResponsiveCard>

      {/* نماذج الحوار */}
      <EnhancedCustomerDialog
        open={showCustomerForm}
        onOpenChange={(open) => {
          setShowCustomerForm(open)
          if (!open) {
            setEditingCustomer(null)
          }
        }}
        editingCustomer={editingCustomer}
        onSuccess={(customer) => {
          console.log('✅ Customer saved successfully:', customer)
          setShowCustomerForm(false)
          setEditingCustomer(null)
          // Refresh the customer list to show the newly created customer
          queryClient.invalidateQueries({ queryKey: ['customers'] })
        }}
        onCancel={() => {
          setShowCustomerForm(false)
          setEditingCustomer(null)
        }}
        context="standalone"
      />
      
      {/* Customer Details Dialog */}
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

      <CustomerCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          setShowCSVUpload(false)
          // Refresh customer list - the query will automatically refetch
        }}
      />

      {/* Delete Customer Confirmation Dialog */}
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف العميل "{customerToDelete?.customer_type === 'individual' 
                ? `${customerToDelete?.first_name} ${customerToDelete?.last_name}` 
                : customerToDelete?.company_name}"؟
              <br />
              <strong className="text-red-600">هذا الإجراء لا يمكن التراجع عنه.</strong>
              <br />
              <span className="text-sm text-muted-foreground">
                سيتم حذف جميع الملاحظات المرتبطة بالعميل أيضاً.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteCustomer}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteCustomerMutation.isPending}
            >
              {deleteCustomerMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  جاري الحذف السريع...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" />
                  حذف نهائياً
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog حذف جميع العملاء */}
      <BulkDeleteCustomersDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      />
    </ResponsiveContainer>
    </CustomerViewProvider>
  )
}
