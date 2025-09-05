import { useState, useEffect } from "react"
import { Plus, Users, Building, Phone, Mail, MapPin, UserX, Search, Filter, Edit, Eye, ShieldX, Trash2, Trash, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Import responsive components
import { ResponsiveGrid } from "@/components/responsive/ResponsiveGrid"
import { AdaptiveCard } from "@/components/responsive/AdaptiveCard"
import { ResponsiveButton } from "@/components/ui/responsive-button"
import { ResponsiveDialog } from "@/components/ui/responsive-dialog"
import { useResponsiveBreakpoint } from "@/hooks/use-mobile"
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout"
import { cn } from "@/lib/utils"
import { useCustomers, useToggleCustomerBlacklist } from "@/hooks/useEnhancedCustomers"
import { useOptimizedDeleteCustomer } from "@/hooks/useOptimizedDeleteCustomer"
import { useDebounce } from "@/hooks/useDebounce"
import { EnhancedCustomerDialog } from "@/components/customers/EnhancedCustomerForm"
import { CustomerDetailsDialog } from "@/components/customers/CustomerDetailsDialog"
import { InvoiceForm } from "@/components/finance/InvoiceForm"
import { CustomerCSVUpload } from "@/components/customers/CustomerCSVUpload"
import { CustomerDisplayName } from "@/components/customers/CustomerDisplayName"
import { BulkDeleteCustomersDialog } from "@/components/customers/BulkDeleteCustomersDialog"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useCompanyContext } from "@/contexts/CompanyContext"
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess"
import { LogIn } from "lucide-react"
import { useCustomersRealtime } from "@/hooks/useEnhancedCustomersRealtime"


import { useQueryClient } from "@tanstack/react-query"
import { CustomerViewProvider } from "@/contexts/CustomerViewContext"

export default function Customers() {
  const { user, loading } = useAuth()
  const { browsedCompany, isBrowsingMode, exitBrowseMode } = useCompanyContext()
  const { companyId, isSystemLevel, hasFullCompanyControl } = useUnifiedCompanyAccess()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
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
      <div className={cn("space-y-6", spacing)}>
        {/* رأس الصفحة - متجاوب */}
        <div className={cn(
          "flex justify-between items-start gap-4",
          isMobile && "flex-col space-y-4"
        )}>
          <div className="flex-1">
            <h1 className={cn(
              "font-bold",
              isMobile ? "text-2xl" : "text-3xl"
            )}>
              العملاء
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة وتتبع معلومات العملاء
            </p>
          </div>
          
          {/* أزرار الإجراءات - متجاوبة */}
          <div className={cn(
            "flex gap-2",
            isMobile && "w-full"
          )}>
            {/* Mobile: Dropdown menu for secondary actions */}
            {isMobile ? (
              <>
                <ResponsiveButton 
                  onClick={() => setShowCustomerForm(true)}
                  disabled={!canAddCustomers}
                  className="flex-1"
                  size="default"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة عميل
                </ResponsiveButton>
                
                {(canDeleteCustomers || isSuperAdmin) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ResponsiveButton 
                        variant="outline" 
                        size="default"
                        className={cn(
                          touchOptimized && "min-h-[44px] min-w-[44px]"
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </ResponsiveButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isSuperAdmin && (
                        <DropdownMenuItem onClick={() => setShowCSVUpload(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          رفع من CSV
                        </DropdownMenuItem>
                      )}
                      {canDeleteCustomers && allCustomers.length > 0 && (
                        <>
                          {isSuperAdmin && <DropdownMenuSeparator />}
                          <DropdownMenuItem 
                            onClick={() => setShowBulkDeleteDialog(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            حذف جميع العملاء
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            ) : (
              /* Desktop: All buttons visible */
              <>
                {canDeleteCustomers && allCustomers.length > 0 && (
                  <Button 
                    onClick={() => setShowBulkDeleteDialog(true)}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <Trash className="h-4 w-4" />
                    حذف جميع العملاء
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button 
                    onClick={() => setShowCSVUpload(true)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    رفع من CSV
                  </Button>
                )}
                <Button 
                  onClick={() => setShowCustomerForm(true)}
                  disabled={!canAddCustomers}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  إضافة عميل جديد
                </Button>
              </>
            )}
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

      {/* مرشحات البحث - متجاوبة */}
      <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
        <CardHeader className={cn(
          isMobile ? "pb-4" : "pb-6"
        )}>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-base" : "text-lg"
          )}>
            <Filter className="h-4 w-4" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(
          isMobile ? "space-y-3" : "space-y-4"
        )}>
          <ResponsiveGrid
            columns={isMobile ? 1 : isTablet ? 2 : 5}
            gap={isMobile ? 3 : 4}
          >
            {/* البحث */}
            <div className="space-y-2">
              <label className="text-sm font-medium">البحث</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={isMobile ? "البحث..." : "البحث بالاسم، الهاتف، البريد..."}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className={cn(
                    "pl-10",
                    touchOptimized && "min-h-[44px]"
                  )}
                />
                {isFetching && filters.search && (
                  <LoadingSpinner size="sm" className="absolute right-3 top-3" />
                )}
              </div>
            </div>

            {/* كود العميل */}
            <div className="space-y-2">
              <label className="text-sm font-medium">كود العميل</label>
              <Input
                placeholder={isMobile ? "CUST-001" : "CUST-24-IND-001"}
                value={filters.customer_code}
                onChange={(e) => setFilters({ ...filters, customer_code: e.target.value })}
                className={cn(
                  "font-mono",
                  touchOptimized && "min-h-[44px]"
                )}
              />
            </div>
            
            {/* نوع العميل */}
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع العميل</label>
              <Select 
                value={filters.customer_type || 'all'} 
                onValueChange={(value) => setFilters({ 
                  ...filters, 
                  customer_type: value === 'all' ? undefined : value as 'individual' | 'corporate'
                })}
              >
                <SelectTrigger className={cn(
                  touchOptimized && "min-h-[44px]"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع العملاء</SelectItem>
                  <SelectItem value="individual">أفراد</SelectItem>
                  <SelectItem value="corporate">شركات</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* الحالة */}
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
                <SelectTrigger className={cn(
                  touchOptimized && "min-h-[44px]"
                )}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="blacklisted">محظور</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* زر إعادة التعيين */}
            <div className={cn(
              "flex items-end",
              isMobile && "col-span-1"
            )}>
              <ResponsiveButton 
                variant="outline" 
                onClick={resetFilters} 
                className="w-full"
                size="default"
              >
                إعادة تعيين
              </ResponsiveButton>
            </div>
          </ResponsiveGrid>
        </CardContent>
      </AdaptiveCard>


      {/* بطاقات الإحصائيات - متجاوبة */}
      <ResponsiveGrid
        columns={columns.stats}
        gap={isMobile ? 3 : 4}
      >
        <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
          <CardHeader className={cn(
            "flex flex-row items-center justify-between space-y-0",
            isMobile ? "pb-2" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-sm"
            )}>
              إجمالي العملاء
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className={cn(
            isMobile ? "pt-2" : "pt-0"
          )}>
            <div className={cn(
              "font-bold text-blue-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              {activeCustomers.length}
            </div>
            <p className="text-xs text-muted-foreground">عميل نشط</p>
          </CardContent>
        </AdaptiveCard>
        
        <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
          <CardHeader className={cn(
            "flex flex-row items-center justify-between space-y-0",
            isMobile ? "pb-2" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-sm"
            )}>
              العملاء الأفراد
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className={cn(
            isMobile ? "pt-2" : "pt-0"
          )}>
            <div className={cn(
              "font-bold text-green-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              {individualCustomers.length}
            </div>
            <p className="text-xs text-muted-foreground">عميل فردي</p>
          </CardContent>
        </AdaptiveCard>
        
        <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
          <CardHeader className={cn(
            "flex flex-row items-center justify-between space-y-0",
            isMobile ? "pb-2" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-sm"
            )}>
              العملاء الشركات
            </CardTitle>
            <Building className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent className={cn(
            isMobile ? "pt-2" : "pt-0"
          )}>
            <div className={cn(
              "font-bold text-purple-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              {companyCustomers.length}
            </div>
            <p className="text-xs text-muted-foreground">شركة</p>
          </CardContent>
        </AdaptiveCard>
        
        <AdaptiveCard variant={isMobile ? 'compact' : 'default'}>
          <CardHeader className={cn(
            "flex flex-row items-center justify-between space-y-0",
            isMobile ? "pb-2" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-sm"
            )}>
              القائمة السوداء
            </CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className={cn(
            isMobile ? "pt-2" : "pt-0"
          )}>
            <div className={cn(
              "font-bold text-red-600",
              isMobile ? "text-xl" : "text-2xl"
            )}>
              {blacklistedCustomers.length}
            </div>
            <p className="text-xs text-muted-foreground">عميل محظور</p>
          </CardContent>
        </AdaptiveCard>
      </ResponsiveGrid>

      {/* قائمة العملاء - متجاوبة */}
      <div className={cn(
        "grid gap-4",
        isMobile ? "gap-3" : "gap-4"
      )}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <CustomerSkeleton key={index} />
          ))
        ) : (
          customers?.map((customer) => (
            <AdaptiveCard 
              key={customer.id} 
              variant={isMobile ? 'compact' : 'default'}
              interactive={true}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className={cn(
                isMobile ? "pt-4" : "pt-6"
              )}>
                <div className={cn(
                  isMobile ? "space-y-3" : "space-y-4"
                )}>
                  {/* معلومات العميل الأساسية */}
                  <div className={cn(
                    "flex items-start justify-between gap-4",
                    isMobile && "flex-col space-y-3"
                  )}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {customer.customer_type === 'corporate' ? (
                          <Building className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        ) : (
                          <Users className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <CustomerDisplayName 
                            customer={customer} 
                            showBadges={false}
                            className={cn(
                              "font-semibold",
                              isMobile ? "text-base" : "text-lg"
                            )}
                          />
                          {customer.customer_code && (
                            <div className="flex items-center gap-1">
                              <span className={cn(
                                "text-muted-foreground font-mono bg-muted px-2 py-1 rounded",
                                isMobile ? "text-xs" : "text-xs"
                              )}>
                                {customer.customer_code}
                              </span>
                            </div>
                          )}
                        </div>
                        {customer.is_blacklisted && (
                          <Badge variant="destructive" className="flex-shrink-0">
                            <UserX className="h-3 w-3 mr-1" />
                            محظور
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* أزرار الإجراءات */}
                    <div className={cn(
                      "flex gap-2 flex-shrink-0",
                      isMobile && "w-full"
                    )}>
                      {isMobile ? (
                        /* Mobile: Compact buttons with dropdown for secondary actions */
                        <>
                          <ResponsiveButton 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewCustomer(customer.id)}
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            عرض
                          </ResponsiveButton>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <ResponsiveButton 
                                variant="outline" 
                                size="sm"
                                className={cn(
                                  touchOptimized && "min-h-[36px] min-w-[36px]"
                                )}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </ResponsiveButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => navigate(`/edit-customer/${customer.id}`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                تعديل
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleToggleBlacklist(customer.id, !customer.is_blacklisted)}
                                disabled={!canAddCustomers}
                              >
                                <ShieldX className="h-4 w-4 mr-2" />
                                {customer.is_blacklisted ? 'إلغاء الحظر' : 'حظر'}
                              </DropdownMenuItem>
                              
                              {canDeleteCustomers && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteCustomer(customer)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    حذف
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      ) : (
                        /* Desktop: All buttons visible */
                        <>
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
                            onClick={() => navigate(`/edit-customer/${customer.id}`)}
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
                          {canDeleteCustomers && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteCustomer(customer)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              حذف
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* معلومات الاتصال */}
                  <ResponsiveGrid
                    columns={isMobile ? 1 : isTablet ? 2 : 3}
                    gap={isMobile ? 2 : 4}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate" dir="ltr">{customer.phone}</span>
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
                  </ResponsiveGrid>
                  
                  {/* الملاحظات */}
                  {customer.notes && (
                    <p className={cn(
                      "text-muted-foreground line-clamp-2",
                      isMobile ? "text-sm" : "text-sm"
                    )}>
                      {customer.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </AdaptiveCard>
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
      </div>
    </CustomerViewProvider>
  )
}
