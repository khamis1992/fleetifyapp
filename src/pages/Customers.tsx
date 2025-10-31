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
import { useQuery } from '@tanstack/react-query';
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
  const [pageSize, setPageSize] = useState(50); // Reduced to 50 for faster initial load

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
  
  // Fetch contract counts for visible customers
  const { data: contractCountsData } = useQuery({
    queryKey: ['customer-contract-counts', customers.map(c => c.id).join(','), companyId],
    queryFn: async () => {
      if (!customers.length || !companyId) return {};
      
      const customerIds = customers.map(c => c.id);
      const { data, error } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .in('customer_id', customerIds);
      
      if (error) {
        console.error('Error fetching contract counts:', error);
        return {};
      }
      
      const counts: Record<string, number> = {};
      customerIds.forEach(id => {
        counts[id] = 0;
      });
      
      data?.forEach(contract => {
        if (contract.customer_id) {
          counts[contract.customer_id] = (counts[contract.customer_id] || 0) + 1;
        }
      });
      
      return counts;
    },
    enabled: customers.length > 0 && !!companyId,
    staleTime: 60 * 1000, // Cache for 1 minute
  });
  
  const finalContractCounts = contractCountsData || {};

  const totalCustomersInDB = React.useMemo(() => {
    // Use 'total' property from useEnhancedCustomers hook
    if (customersResult && typeof customersResult === 'object' && 'total' in customersResult) {
      return customersResult.total || 0;
    }
    return customers.length;
  }, [customersResult, customers.length]);

  // Calculate approximate counts from loaded data for instant display
  // This provides immediate feedback while accurate counts load in background
  const approximateIndividualCount = React.useMemo(() => {
    if (customerType === 'all') {
      return customers.filter(c => c.customer_type === 'individual').length;
    }
    return customerType === 'individual' ? customers.length : 0;
  }, [customers, customerType]);

  const approximateCorporateCount = React.useMemo(() => {
    if (customerType === 'all') {
      return customers.filter(c => c.customer_type === 'corporate').length;
    }
    return customerType === 'corporate' ? customers.length : 0;
  }, [customers, customerType]);

  const approximateBlacklistedCount = React.useMemo(() => {
    return customers.filter(c => c.is_blacklisted).length;
  }, [customers]);

  // Fetch accurate counts in background (these load after initial render for better performance)
  // Delay count queries to improve initial page load speed
  const [shouldFetchCounts, setShouldFetchCounts] = React.useState(false);
  
  React.useEffect(() => {
    if (!isLoading && customersResult && totalCustomersInDB > 0) {
      // Delay count queries by 500ms to let main data render first
      const timer = setTimeout(() => {
        setShouldFetchCounts(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShouldFetchCounts(false);
    }
  }, [isLoading, customersResult, totalCustomersInDB]);
  
  const { data: individualCount } = useCustomerCount({
    customer_type: 'individual',
    includeInactive: false,
  }, {
    enabled: shouldFetchCounts,
  });
  
  const { data: corporateCount } = useCustomerCount({
    customer_type: 'corporate',
    includeInactive: false,
  }, {
    enabled: shouldFetchCounts,
  });
  
  const { data: blacklistedCount } = useCustomerCount({
    is_blacklisted: true,
    includeInactive: true,
  }, {
    enabled: shouldFetchCounts,
  });

  // Use accurate counts if available and data is loaded, otherwise use approximate counts
  const finalIndividualCount = shouldFetchCounts && individualCount !== undefined ? individualCount : approximateIndividualCount;
  const finalCorporateCount = shouldFetchCounts && corporateCount !== undefined ? corporateCount : approximateCorporateCount;
  const finalBlacklistedCount = shouldFetchCounts && blacklistedCount !== undefined ? blacklistedCount : approximateBlacklistedCount;

  const totalPages = Math.ceil(totalCustomersInDB / pageSize);
  
  // Virtual scrolling implementation for desktop
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 120 : 60,
    overscan: 5, // Reduced from 10 to 5 for better performance
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
  const individualCustomers = finalIndividualCount; // Use final count (accurate or approximate)
  const corporateCustomers = finalCorporateCount; // Use final count (accurate or approximate)
  const blacklistedCustomers = finalBlacklistedCount; // Use final count (accurate or approximate)
  
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
      <>
        <PageCustomizer
          pageId="customers-page"
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
          </div>
        </PageCustomizer>
        
        {/* Shared Dialogs for Mobile */}
        <CustomerCreationOptionsDialog
          open={showCreationOptionsDialog}
          onOpenChange={setShowCreationOptionsDialog}
          onSelectFullForm={handleSelectFullForm}
          onSelectQuickAdd={handleSelectQuickAdd}
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
      </>
    );
  }

  // Desktop view with virtual scrolling
  return (
    <>
      <PageCustomizer
        pageId="customers-page"
      >
        <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">إدارة العملاء</h1>
            <p className="text-muted-foreground">إدارة شاملة لجميع عملاء النظام</p>
          </div>
          <Button 
            onClick={handleCreateCustomer}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
          >
            <UserPlus className="w-5 h-5" />
            <span>إضافة عميل جديد</span>
          </Button>
        </div>

        {/* Search and Filters Section */}
        <Card className="p-4 rounded-2xl border border-border shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="بحث عن عميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-12 pl-4 py-3 rounded-xl border border-input bg-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            {/* Customer Type Filter */}
            <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
              <SelectTrigger className="px-4 py-3 rounded-xl border border-input bg-input min-w-[150px]">
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="individual">فرد</SelectItem>
                <SelectItem value="corporate">شركة</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={includeInactive ? "all" : "active"} onValueChange={(value) => setIncludeInactive(value === "all")}>
              <SelectTrigger className="px-4 py-3 rounded-xl border border-input bg-input min-w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="all">جميع الحالات</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Export Button */}
            <Button
              variant="outline"
              className="px-4 py-3 rounded-xl border border-input bg-input hover:bg-accent transition-all"
              onClick={() => toast.info('ميزة التصدير قريباً')}
            >
              <Download className="h-5 w-5 ml-2" />
              <span>تصدير</span>
            </Button>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Customers */}
          <Card className="p-6 rounded-2xl border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-br from-card to-background">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-sm mb-1">إجمالي العملاء</p>
                <h3 className="text-4xl font-bold mb-2">{totalCustomers.toLocaleString('ar-SA')}</h3>
                <p className="text-sm text-success flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>أفراد: {individualCustomers} | شركات: {corporateCustomers}</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>
          
          {/* Active Customers */}
          <Card className="p-6 rounded-2xl border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-br from-card to-background">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-sm mb-1">العملاء النشطون</p>
                <h3 className="text-4xl font-bold mb-2 text-success">
                  {totalCustomers > 0 ? (totalCustomers - blacklistedCustomers).toLocaleString('ar-SA') : 0}
                </h3>
                <p className="text-sm text-success flex items-center gap-1 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {totalCustomers > 0 
                      ? `${Math.round(((totalCustomers - blacklistedCustomers) / totalCustomers) * 100)}% نسبة النشاط` 
                      : '0%'}
                  </span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <UserCheck className="w-6 h-6 text-success" />
              </div>
            </div>
          </Card>
          
          {/* Suspended/Blacklisted Customers */}
          <Card className="p-6 rounded-2xl border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-br from-card to-background">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-sm mb-1">العملاء المعلقون</p>
                <h3 className="text-4xl font-bold mb-2 text-warning">{blacklistedCustomers.toLocaleString('ar-SA')}</h3>
                <p className="text-sm text-warning flex items-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>يحتاج متابعة</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <UserX className="w-6 h-6 text-warning" />
              </div>
            </div>
          </Card>
        </div>

        {/* Customer Table with Virtual Scrolling */}
        <Card className="rounded-2xl border border-border shadow-sm overflow-hidden">
          <CardContent className="p-0">
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
              <div className="overflow-hidden">
                {/* Virtualized Table */}
                <div
                  ref={parentRef}
                  className="overflow-auto"
                  style={{ height: 'calc(100vh - 450px)', minHeight: '400px' }}
                >
                  <table className="w-full" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '50px' }} />
                      <col style={{ width: '200px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '200px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '120px' }} />
                      <col style={{ width: '100px' }} />
                      <col style={{ width: '100px' }} />
                    </colgroup>
                    <thead className="sticky top-0 bg-accent/50 border-b border-border z-10">
                      <tr>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" className="w-4 h-4 rounded border-border" />
                          </div>
                        </th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">العميل</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">رقم الهاتف</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">البريد الإلكتروني</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">نوع العميل</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">الحالة</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">العقود</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-accent-foreground">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {virtualItems.map((virtualItem) => {
                        const customer = customers[virtualItem.index];
                        
                        return (
                          <tr
                            key={customer.id}
                            className="border-b hover:bg-accent/30 transition-all duration-200"
                          >
                            <td className="px-6 py-4" style={{ minWidth: '50px', width: '50px' }}>
                              <input type="checkbox" className="w-4 h-4 rounded border-border" />
                            </td>
                            
                            <td className="px-6 py-4" style={{ minWidth: '200px', width: '200px' }}>
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                  style={{ background: getAvatarColor(virtualItem.index) }}
                                >
                                  {getCustomerInitials(customer)}
                                </div>
                                <div>
                                  <p className="font-semibold">{getCustomerName(customer)}</p>
                                  <p className="text-sm text-muted-foreground">{customer.id?.substring(0, 10)}...</p>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 text-muted-foreground" style={{ minWidth: '150px', width: '150px' }}>{customer.phone || '-'}</td>
                            
                            <td className="px-6 py-4 text-muted-foreground" style={{ minWidth: '200px', width: '200px' }}>{customer.email || '-'}</td>
                            
                            <td className="px-6 py-4" style={{ minWidth: '120px', width: '120px' }}>
                              <Badge 
                                variant={customer.customer_type === 'individual' ? 'default' : 'secondary'}
                                className="px-3 py-1 rounded-full text-sm"
                              >
                                {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                              </Badge>
                            </td>
                            
                            <td className="px-6 py-4" style={{ minWidth: '120px', width: '120px' }}>
                              {customer.is_blacklisted ? (
                                <Badge variant="destructive" className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                  <span className="w-2 h-2 rounded-full bg-destructive"></span>
                                  محظور
                                </Badge>
                              ) : customer.is_active ? (
                                <Badge variant="default" className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit bg-success/10 text-success border-success/20">
                                  <span className="w-2 h-2 rounded-full bg-success"></span>
                                  نشط
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                  معلق
                                </Badge>
                              )}
                            </td>
                            
                            <td className="px-6 py-4" style={{ minWidth: '100px', width: '100px' }}>
                              <span className="font-semibold text-primary">
                                {finalContractCounts[customer.id] || 0} {finalContractCounts[customer.id] === 1 ? 'عقد' : 'عقود'}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4" style={{ minWidth: '100px', width: '100px' }}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleQuickRent(customer)}>
                                    <FileText className="h-4 w-4 ml-2" />
                                    إنشاء عقد
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                    <Eye className="h-4 w-4 ml-2" />
                                    عرض التفاصيل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                                    <Edit className="h-4 w-4 ml-2" />
                                    تعديل
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteCustomer(customer)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 ml-2" />
                                    حذف
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer - Statistics */}
                <div className="p-6 border-t border-border bg-muted/30">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      عرض <span className="font-semibold">{Math.min(pageSize, customers.length)}</span> من <span className="font-semibold">{totalCustomersInDB.toLocaleString('ar-SA')}</span> عميل
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 rounded-lg"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="px-4 py-2 rounded-lg"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      
                      {totalPages > 5 && (
                        <>
                          <span className="px-2">...</span>
                          <Button
                            variant={currentPage === totalPages ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(totalPages)}
                            className="px-4 py-2 rounded-lg"
                          >
                            {totalPages}
                          </Button>
                        </>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 rounded-lg"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">عدد الصفوف:</span>
                      <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="px-3 py-2 rounded-lg border border-border bg-input w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </PageCustomizer>
      
      {/* Shared Dialogs for Desktop */}
      <CustomerCreationOptionsDialog
        open={showCreationOptionsDialog}
        onOpenChange={setShowCreationOptionsDialog}
        onSelectFullForm={handleSelectFullForm}
        onSelectQuickAdd={handleSelectQuickAdd}
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
    </>
  );
};

export default Customers;
