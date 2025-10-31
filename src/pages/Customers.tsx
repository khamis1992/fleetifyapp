import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageCustomizer } from '@/components/PageCustomizer';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCustomers, useCustomerCount } from '@/hooks/useEnhancedCustomers';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import {
  Plus,
  Search,
  Filter,
  Users,
  Building2,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Upload,
  Car,
  FileText,
  Zap,
  UserPlus,
  UserCheck,
  UserX,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Calendar,
  Download,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  EnhancedCustomerDialog, 
  CustomerDetailsDialog, 
  BulkDeleteCustomersDialog, 
  CustomerCSVUpload, 
  CustomerImportWizard, 
  CustomerCreationOptionsDialog 
} from '@/components/customers';
import { QuickCustomerForm } from '@/components/customers/QuickCustomerForm';
import { Customer, CustomerFilters } from '@/types/customer';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { MobileCustomerCard } from '@/components/customers';
import { TypeAheadSearch } from '@/components/ui/type-ahead-search';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Customers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useSimpleBreakpoint();
  const { hasFullCompanyControl, companyId } = useUnifiedCompanyAccess();
  const parentRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'individual' | 'corporate'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showCreationOptionsDialog, setShowCreationOptionsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuickCreateDialog, setShowQuickCreateDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100); // Increased from 50 to 100

  // Build filters for the query
  const filters: CustomerFilters = {
    search: searchTerm || undefined,
    customer_type: customerType === 'all' ? undefined : customerType,
    includeInactive,
    page: currentPage,
    pageSize: pageSize,
  };

  const { data: customersResult, isLoading, error, refetch } = useCustomers(filters);
  
  // Log errors for debugging
  React.useEffect(() => {
    if (error) {
      console.error('❌ [Customers] Error fetching customers:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        filters,
        timestamp: new Date().toISOString()
      });
      toast.error(`خطأ في تحميل بيانات العملاء: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
    }
  }, [error, filters]);
  
  // Fetch counts for all customer types using optimized count-only queries
  const { data: individualCount = 0 } = useCustomerCount({
    customer_type: 'individual',
    includeInactive: false,
  });
  
  const { data: corporateCount = 0 } = useCustomerCount({
    customer_type: 'corporate',
    includeInactive: false,
  });
  
  const { data: blacklistedCount = 0 } = useCustomerCount({
    is_blacklisted: true,
    includeInactive: true, // Include both active and inactive blacklisted customers
  });
  
  // Extract pagination data and customers array
  const customers = React.useMemo(() => {
    // Handle new pagination structure from useEnhancedCustomers
    if (customersResult && typeof customersResult === 'object' && 'data' in customersResult) {
      return Array.isArray(customersResult.data) ? customersResult.data : [];
    }
    // Handle legacy structure (array returned directly)
    if (Array.isArray(customersResult)) {
      return customersResult;
    }
    return [];
  }, [customersResult]);

  const totalCustomersInDB = React.useMemo(() => {
    // Use 'total' property from useEnhancedCustomers hook
    if (customersResult && typeof customersResult === 'object' && 'total' in customersResult) {
      return customersResult.total || 0;
    }
    return customers.length;
  }, [customersResult, customers.length]);

  const totalPages = Math.ceil(totalCustomersInDB / pageSize);
  
  // Virtual scrolling implementation for desktop
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 120 : 60,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Event handlers
  const handleCreateCustomer = () => {
    setShowCreationOptionsDialog(true);
  };

  const handleSelectFullForm = () => {
    setShowCreateDialog(true);
  };

  const handleSelectQuickAdd = () => {
    setShowQuickCreateDialog(true);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const handleCSVUpload = () => {
    setShowCSVUpload(true);
  };

  const handleImportWizard = () => {
    setShowImportWizard(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    // Navigate to the new customer details page
    navigate(`/customers/${customer.id}`);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  };

  const handleQuickRent = (customer: Customer) => {
    // Navigate to contracts page with customer pre-selected
    navigate('/contracts', {
      state: {
        selectedCustomerId: customer.id,
        autoOpen: true
      }
    });
    toast.success(`جاري إنشاء عقد للعميل: ${customer.customer_type === 'individual'
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : customer.company_name || ''}`);
  };

  const handleTypeAheadSelect = (result: { id: string; name: string }) => {
    // Find the customer and open details
    const customer = customers.find(c => c.id === result.id);
    if (customer) {
      handleViewCustomer(customer);
    } else {
      // If not in current page, refetch with the customer
      setSearchTerm(result.name);
      toast.info(`جاري البحث عن: ${result.name}`);
    }
  };

  // Delete & Blacklist state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const queryClient = useQueryClient();

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      // Check for dependencies - contracts
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);

      if (contracts && contracts.length > 0) {
        throw new Error('لا يمكن حذف العميل لأنه مرتبط بعقود. يرجى حذف العقود أولاً.');
      }

      // Check for dependencies - payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);

      if (payments && payments.length > 0) {
        throw new Error('لا يمكن حذف العميل لأنه مرتبط بدفعات. يرجى حذف الدفعات أولاً.');
      }

      // Delete customer_accounts links first
      const { error: accountsError } = await supabase
        .from('customer_accounts')
        .delete()
        .eq('customer_id', customerId);

      if (accountsError) throw accountsError;

      // Delete customer
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) throw error;

      return customerId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      toast.success('تم حذف العميل بنجاح');
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل حذف العميل');
    }
  });

  // Toggle blacklist mutation
  const toggleBlacklistMutation = useMutation({
    mutationFn: async ({ customerId, isBlacklisted }: { customerId: string; isBlacklisted: boolean }) => {
      const { error } = await supabase
        .from('customers')
        .update({ is_blacklisted: !isBlacklisted })
        .eq('id', customerId);

      if (error) throw error;

      return { customerId, newStatus: !isBlacklisted };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      toast.success(data.newStatus ? 'تم إضافة العميل للقائمة السوداء' : 'تم إزالة العميل من القائمة السوداء');
    },
    onError: (error: any) => {
      toast.error(error.message || 'فشل تحديث حالة القائمة السوداء');
    }
  });

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  const handleToggleBlacklist = (customer: Customer) => {
    toggleBlacklistMutation.mutate({
      customerId: customer.id,
      isBlacklisted: customer.is_blacklisted || false
    });
  };

  // Calculate stats with comprehensive safety checks
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const totalCustomers = totalCustomersInDB; // Use total from database
  const individualCustomers = individualCount; // Use optimized count query
  const corporateCustomers = corporateCount; // Use optimized count query
  const blacklistedCustomers = blacklistedCount; // Use optimized count query
  
  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Get customer display name
  const getCustomerName = (customer: Customer) => {
    if (customer.customer_type === 'individual') {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
             `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() ||
             'غير محدد';
    }
    return customer.company_name || customer.company_name_ar || 'غير محدد';
  };

  // Get customer initials for avatar
  const getCustomerInitials = (customer: Customer) => {
    if (customer.customer_type === 'individual') {
      const firstName = customer.first_name || customer.first_name_ar || '';
      const lastName = customer.last_name || customer.last_name_ar || '';
      return (firstName[0] || '') + (lastName[0] || '');
    }
    const companyName = customer.company_name || customer.company_name_ar || '';
    return companyName.substring(0, 2);
  };

  // Get avatar color based on customer type
  const getAvatarColor = (index: number) => {
    const colors = [
      'hsl(var(--primary))',
      'hsl(var(--success))',
      'hsl(var(--warning))',
      'hsl(210 100% 50%)',
    ];
    return colors[index % colors.length];
  };

  // Mobile view
  if (isMobile) {
    return (
      <PageCustomizer
        pageId="customers-page"
        title="Customers"
        titleAr="العملاء"
      >
        <div className="space-y-6 p-4">
          {/* Mobile Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">العملاء</h1>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCSVUpload}
              >
                <Upload className="h-4 w-4 ml-2" />
                استيراد CSV
              </Button>
              <Button onClick={handleCreateCustomer}>
                <Plus className="h-4 w-4 ml-2" />
                عميل جديد
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث عن العملاء..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="نوع العميل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الأنواع</SelectItem>
                  <SelectItem value="individual">أفراد</SelectItem>
                  <SelectItem value="corporate">شركات</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant={includeInactive ? "default" : "outline"}
                size="sm"
                onClick={() => setIncludeInactive(!includeInactive)}
              >
                <Filter className="h-4 w-4 ml-2" />
                شامل غير النشطين
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">القائمة السوداء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{blacklistedCustomers}</div>
              </CardContent>
            </Card>
          </div>

          {/* Customer List with Virtual Scrolling */}
          <div ref={parentRef} className="h-[calc(100vh-250px)] overflow-auto">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {virtualItems.map((virtualItem) => {
                const customer = customers[virtualItem.index];
                return (
                  <div
                    key={customer.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <MobileCustomerCard
                      customer={customer}
                      onView={() => handleViewCustomer(customer)}
                      onEdit={() => handleEditCustomer(customer)}
                      onDelete={() => handleDeleteCustomer(customer)}
                      onToggleBlacklist={() => handleToggleBlacklist(customer)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                الصفحة {currentPage} من {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            </div>
          )}

          {/* Dialogs */}
          <CustomerCreationOptionsDialog
            open={showCreationOptionsDialog}
            onOpenChange={setShowCreationOptionsDialog}
            onSelectFullForm={handleSelectFullForm}
            onSelectQuickAdd={handleSelectQuickAdd}
            onSelectImport={handleImportWizard}
          />
          
          <EnhancedCustomerDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
          />
          
          <CustomerDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            customerId={selectedCustomer?.id || ''}
            onEdit={() => {
              setShowDetailsDialog(false);
              setShowEditDialog(true);
            }}
            onCreateContract={() => {
              // Navigate to create contract page with selected customer
              toast.info('انتقل إلى صفحة العقود لإنشاء عقد جديد');
            }}
          />
          
          <EnhancedCustomerDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            editingCustomer={selectedCustomer}
          />
          
          <BulkDeleteCustomersDialog
            open={showBulkDeleteDialog}
            onOpenChange={setShowBulkDeleteDialog}
          />
          
          <CustomerCSVUpload
            open={showCSVUpload}
            onOpenChange={setShowCSVUpload}
            onUploadComplete={() => {
              refetch();
              toast.success('تم رفع ملف العملاء بنجاح');
            }}
          />

          <CustomerImportWizard
            open={showImportWizard}
            onOpenChange={setShowImportWizard}
            onComplete={() => {
              refetch();
              toast.success('تم استيراد العملاء بنجاح');
            }}
          />
          
          <QuickCustomerForm
            open={showQuickCreateDialog}
            onOpenChange={setShowQuickCreateDialog}
            onSuccess={(customerId, customerData) => {
              refetch();
              toast.success('تم إنشاء العميل السريع بنجاح');
            }}
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف العميل{' '}
                  <strong>
                    {customerToDelete?.customer_type === 'individual'
                      ? `${customerToDelete?.first_name} ${customerToDelete?.last_name}`
                      : customerToDelete?.company_name}
                  </strong>
                  ؟
                  <br />
                  <br />
                  <span className="text-destructive font-medium">
                    هذا الإجراء لا يمكن التراجع عنه. سيتم حذف العميل وجميع بياناته المرتبطة نهائياً.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={deleteCustomerMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleteCustomerMutation.isPending ? 'جاري الحذف...' : 'حذف العميل'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageCustomizer>
    );
  }

  // Desktop view with virtual scrolling
  return (
    <PageCustomizer
      pageId="customers-page"
      title="Customers"
      titleAr="العملاء"
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">إدارة العملاء</h1>
            <p className="text-muted-foreground">إدارة شاملة لجميع عملاء النظام</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCSVUpload}
            >
              <Upload className="h-4 w-4 ml-2" />
              استيراد CSV
            </Button>
            <Button onClick={handleCreateCustomer}>
              <Plus className="h-4 w-4 ml-2" />
              عميل جديد
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 max-w-md">
            <TypeAheadSearch
              placeholder="ابحث عن عميل... (اكتب اسم، رقم هاتف، أو بريد إلكتروني)"
              onSelect={handleTypeAheadSelect}
            />
          </div>
          
          <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="نوع العميل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="individual">أفراد</SelectItem>
              <SelectItem value="corporate">شركات</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant={includeInactive ? "default" : "outline"}
            onClick={() => setIncludeInactive(!includeInactive)}
          >
            <Filter className="h-4 w-4 ml-2" />
            شامل غير النشطين
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                أفراد: {individualCustomers} | شركات: {corporateCustomers}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">القائمة السوداء</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{blacklistedCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                عملاء محظورين
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">العملاء النشطون</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalCustomers - blacklistedCustomers}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalCustomers > 0 
                  ? `${Math.round(((totalCustomers - blacklistedCustomers) / totalCustomers) * 100)}% من الإجمالي` 
                  : '0%'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">الصفحات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPages}</div>
              <p className="text-xs text-muted-foreground mt-1">
                صفحة {currentPage} من {totalPages}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Customer Table with Virtual Scrolling */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة العملاء</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-destructive mb-4">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-lg font-semibold text-destructive">حدث خطأ في تحميل البيانات</p>
                  <p className="text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : 'خطأ غير معروف'}
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="mt-4"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-lg">لا توجد عملاء</p>
                <p className="text-sm mt-2">ابدأ بإضافة عميل جديد</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Virtualized Table */}
                <div
                  ref={parentRef}
                  className="overflow-auto"
                  style={{ height: 'calc(100vh - 450px)', minHeight: '400px' }}
                >
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/50 border-b z-10">
                      <tr>
                        <th className="w-[50px] text-right px-4 py-3 text-sm font-medium">#</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">الاسم</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">النوع</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">الهاتف</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">البريد الإلكتروني</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">الحالة</th>
                        <th className="text-left px-4 py-3 text-sm font-medium w-[150px]">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {virtualItems.map((virtualItem) => {
                        const customer = customers[virtualItem.index];
                        const rowNumber = (currentPage - 1) * pageSize + virtualItem.index + 1;
                        
                        return (
                          <tr
                            key={customer.id}
                            className="border-b hover:bg-muted/50 transition-colors"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                            }}
                          >
                            <td className="w-[50px] px-4 py-3 font-medium text-sm">
                              {rowNumber}
                            </td>
                            
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                                  style={{ background: getAvatarColor(virtualItem.index) }}
                                >
                                  {getCustomerInitials(customer)}
                                </div>
                                {getCustomerName(customer)}
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              <Badge variant={customer.customer_type === 'individual' ? 'default' : 'secondary'}>
                                {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                              </Badge>
                            </td>
                            
                            <td className="px-4 py-3 font-mono text-sm">
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.phone || '-'}</span>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{customer.email || '-'}</span>
                              </div>
                            </td>
                            
                            <td className="px-4 py-3">
                              {customer.is_blacklisted ? (
                                <Badge variant="destructive">محظور</Badge>
                              ) : customer.is_active ? (
                                <Badge variant="default">نشط</Badge>
                              ) : (
                                <Badge variant="secondary">غير نشط</Badge>
                              )}
                            </td>
                            
                            <td className="px-4 py-3 text-left">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickRent(customer)}
                                  title="إنشاء عقد إيجار"
                                  className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewCustomer(customer)}
                                  title="عرض التفاصيل"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditCustomer(customer)}
                                  title="تعديل"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCustomer(customer)}
                                  title="حذف"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer - Statistics */}
                <div className="bg-muted/30 border-t px-4 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>
                      عرض <strong>{customers.length}</strong> من <strong>{totalCustomersInDB}</strong> عميل
                    </span>
                    <span className="text-xs">
                      الصفحة {currentPage} من {totalPages}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                إظهار {Math.min(pageSize, totalCustomers - (currentPage - 1) * pageSize)} من {totalCustomers} عملاء
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">عدد العملاء:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">الصفحات:</span>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-sm text-muted-foreground">...</span>
                    <Button
                      variant={currentPage === totalPages ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(totalPages)}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  التالي
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dialogs */}
        <CustomerCreationOptionsDialog
          open={showCreationOptionsDialog}
          onOpenChange={setShowCreationOptionsDialog}
          onSelectFullForm={handleSelectFullForm}
          onSelectQuickAdd={handleSelectQuickAdd}
          onSelectImport={handleImportWizard}
        />
        
        <EnhancedCustomerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
        />
        
        <CustomerDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          customerId={selectedCustomer?.id || ''}
          onEdit={() => {
            setShowDetailsDialog(false);
            setShowEditDialog(true);
          }}
          onCreateContract={() => {
            // Navigate to create contract page with selected customer
            toast.info('انتقل إلى صفحة العقود لإنشاء عقد جديد');
          }}
        />
        
        <EnhancedCustomerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          editingCustomer={selectedCustomer}
        />
        
        <BulkDeleteCustomersDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        />
        
        <CustomerCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            refetch();
            toast.success('تم رفع ملف العملاء بنجاح');
          }}
        />

        <CustomerImportWizard
          open={showImportWizard}
          onOpenChange={setShowImportWizard}
          onComplete={() => {
            refetch();
            toast.success('تم استيراد العملاء بنجاح');
          }}
        />

        {/* Quick Customer Form */}
        <QuickCustomerForm
          open={showQuickCreateDialog}
          onOpenChange={setShowQuickCreateDialog}
          onSuccess={(customerId, customerData) => {
            refetch();
            toast.success('تم إنشاء العميل السريع بنجاح');
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف العميل{' '}
                <strong>
                  {customerToDelete?.customer_type === 'individual'
                    ? `${customerToDelete?.first_name} ${customerToDelete?.last_name}`
                    : customerToDelete?.company_name}
                </strong>
                ؟
                <br />
                <br />
                <span className="text-destructive font-medium">
                  هذا الإجراء لا يمكن التراجع عنه. سيتم حذف العميل وجميع بياناته المرتبطة نهائياً.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteCustomerMutation.isPending}
                className="bg-destructive hover:bg-destructive/90"
              >
                {deleteCustomerMutation.isPending ? 'جاري الحذف...' : 'حذف العميل'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageCustomizer>
  );
};

export default Customers;
