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
import { createAuditLog } from '@/hooks/useAuditLog';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useRolePermissions } from '@/hooks/useRolePermissions';
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
  LayoutGrid,
  List,
  Columns,
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
  CustomerSplitView,
} from '@/components/customers';
import { Customer, CustomerFilters } from '@/types/customer';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { MobileCustomerCard } from '@/components/customers';
import { TypeAheadSearch } from '@/components/ui/type-ahead-search';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { exportTableToCSV } from '@/utils/exports/csvExport';
import { PageHelp } from '@/components/help';
import { CustomersPageHelpContent } from '@/components/help/content/CustomersPageHelp';

const Customers = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { isMobile } = useSimpleBreakpoint();
  const { hasFullCompanyControl, companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasPermission } = useRolePermissions();
  
  const canEdit = hasPermission('edit_customers');
  const canDelete = hasPermission('delete_customers');
  const parentRef = useRef<HTMLDivElement>(null);
  
  // Show loading state while authentication or company data is loading
  const isInitialLoading = authLoading || isAuthenticating || !companyId;
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'individual' | 'corporate'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50); // Reduced to 50 for faster initial load
  const [viewMode, setViewMode] = useState<'table' | 'split'>('table'); // View mode toggle

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
  
  // Virtual scrolling implementation for mobile only
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    enabled: isMobile, // Only enable for mobile
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Event handlers
  const handleCreateCustomer = () => {
    // فتح نموذج إضافة العميل الكامل مباشرة
    setShowCreateDialog(true);
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

  const handleExport = async () => {
    try {
      // Show loading toast
      toast.info('جاري جلب جميع العملاء للتصدير...');
      
      // Fetch ALL customers for export (without pagination)
      // Build query with same filters as current page
      let query = supabase
        .from('customers')
        .select('*');

      // Apply company filter
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Apply filters (same as current page filters)
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      if (customerType !== 'all') {
        query = query.eq('customer_type', customerType);
      }

      if (searchTerm?.trim()) {
        const searchText = searchTerm.trim();
        query = query.or(
          `first_name.ilike.%${searchText}%,` +
          `last_name.ilike.%${searchText}%,` +
          `first_name_ar.ilike.%${searchText}%,` +
          `last_name_ar.ilike.%${searchText}%,` +
          `company_name.ilike.%${searchText}%,` +
          `company_name_ar.ilike.%${searchText}%,` +
          `phone.ilike.%${searchText}%,` +
          `email.ilike.%${searchText}%,` +
          `customer_code.ilike.%${searchText}%`
        );
      }

      // Order by created_at
      query = query.order('created_at', { ascending: false });

      // Fetch all customers in batches (Supabase has a limit per request)
      const allCustomers: any[] = [];
      const batchSize = 1000; // Supabase default limit
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batchQuery = query.range(offset, offset + batchSize - 1);
        const { data: batch, error: fetchError } = await batchQuery;

        if (fetchError) {
          console.error('Export error - failed to fetch customers:', fetchError);
          toast.error('حدث خطأ أثناء جلب بيانات العملاء');
          return;
        }

        if (batch && batch.length > 0) {
          allCustomers.push(...batch);
          offset += batchSize;
          hasMore = batch.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      if (!allCustomers || allCustomers.length === 0) {
        toast.error('لا توجد بيانات للتصدير');
        return;
      }

      // Fetch contract counts for all customers
      const customerIds = allCustomers.map(c => c.id);
      const { data: contractCountsData } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId || '')
        .in('customer_id', customerIds);

      const contractCounts: Record<string, number> = {};
      customerIds.forEach(id => {
        contractCounts[id] = 0;
      });
      contractCountsData?.forEach(contract => {
        if (contract.customer_id) {
          contractCounts[contract.customer_id] = (contractCounts[contract.customer_id] || 0) + 1;
        }
      });

      // Define columns for export
      const columns = [
        { header: 'رقم العميل', key: 'customer_code' },
        { header: 'نوع العميل', key: 'customer_type' },
        { header: 'الاسم الأول', key: 'first_name' },
        { header: 'اسم العائلة', key: 'last_name' },
        { header: 'الاسم الأول (عربي)', key: 'first_name_ar' },
        { header: 'اسم العائلة (عربي)', key: 'last_name_ar' },
        { header: 'اسم الشركة', key: 'company_name' },
        { header: 'اسم الشركة (عربي)', key: 'company_name_ar' },
        { header: 'البريد الإلكتروني', key: 'email' },
        { header: 'رقم الهاتف', key: 'phone' },
        { header: 'هاتف بديل', key: 'alternative_phone' },
        { header: 'رقم الهوية', key: 'national_id' },
        { header: 'رقم جواز السفر', key: 'passport_number' },
        { header: 'رقم الرخصة', key: 'license_number' },
        { header: 'العنوان', key: 'address' },
        { header: 'العنوان (عربي)', key: 'address_ar' },
        { header: 'المدينة', key: 'city' },
        { header: 'الدولة', key: 'country' },
        { header: 'تاريخ الميلاد', key: 'date_of_birth' },
        { header: 'انتهاء الرخصة', key: 'license_expiry' },
        { header: 'الحد الائتماني', key: 'credit_limit' },
        { header: 'جهة الاتصال الطارئة', key: 'emergency_contact_name' },
        { header: 'هاتف الطوارئ', key: 'emergency_contact_phone' },
        { header: 'عدد العقود', key: 'contracts_count' },
        { header: 'الحالة', key: 'is_active' },
        { header: 'ملاحظات', key: 'notes' },
      ];

      // Format customer data for export
      const exportData = allCustomers.map(customer => ({
        customer_code: customer.customer_code || '',
        customer_type: customer.customer_type === 'individual' ? 'فرد' : 'شركة',
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        first_name_ar: customer.first_name_ar || '',
        last_name_ar: customer.last_name_ar || '',
        company_name: customer.company_name || '',
        company_name_ar: customer.company_name_ar || '',
        email: customer.email || '',
        phone: customer.phone || '',
        alternative_phone: customer.alternative_phone || '',
        national_id: customer.national_id || '',
        passport_number: customer.passport_number || '',
        license_number: customer.license_number || '',
        address: customer.address || '',
        address_ar: customer.address_ar || '',
        city: customer.city || '',
        country: customer.country || '',
        date_of_birth: customer.date_of_birth 
          ? new Date(customer.date_of_birth).toLocaleDateString('ar-SA')
          : '',
        license_expiry: customer.license_expiry
          ? new Date(customer.license_expiry).toLocaleDateString('ar-SA')
          : '',
        credit_limit: customer.credit_limit || 0,
        emergency_contact_name: customer.emergency_contact_name || '',
        emergency_contact_phone: customer.emergency_contact_phone || '',
        contracts_count: contractCounts[customer.id] || 0,
        is_active: customer.is_active ? 'نشط' : 'غير نشط',
        notes: customer.notes || '',
      }));

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const filename = `عملاء_${timestamp}`;

      // Export to CSV
      exportTableToCSV(exportData, columns, filename, {
        includeHeaders: true,
        includeBOM: true,
      });

      toast.success(`تم تصدير ${allCustomers.length} عميل بنجاح`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('حدث خطأ أثناء التصدير');
    }
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
      // Get customer details before deletion for audit log
      const { data: customerData } = await supabase
        .from('customers')
        .select('customer_number, first_name, last_name, company_name, customer_type, email')
        .eq('id', customerId)
        .single();
      
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

      return { customerId, customerData };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      
      // Log audit trail
      const customerName = result.customerData?.customer_type === 'individual'
        ? `${result.customerData.first_name} ${result.customerData.last_name}`
        : result.customerData?.company_name || 'Unknown';
      
      await createAuditLog(
        'DELETE',
        'customer',
        result.customerId,
        customerName,
        {
          old_values: {
            customer_number: result.customerData?.customer_number,
            customer_type: result.customerData?.customer_type,
            email: result.customerData?.email,
          },
          changes_summary: `Deleted customer ${customerName}`,
          severity: 'high',
        }
      );
      
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
      // Get customer details before update
      const { data: customerData } = await supabase
        .from('customers')
        .select('customer_number, first_name, last_name, company_name, customer_type')
        .eq('id', customerId)
        .single();
      
      const { error } = await supabase
        .from('customers')
        .update({ is_blacklisted: !isBlacklisted })
        .eq('id', customerId);

      if (error) throw error;

      return { customerId, newStatus: !isBlacklisted, customerData };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers', companyId] });
      
      // Log audit trail
      const customerName = data.customerData?.customer_type === 'individual'
        ? `${data.customerData.first_name} ${data.customerData.last_name}`
        : data.customerData?.company_name || 'Unknown';
      
      await createAuditLog(
        'UPDATE',
        'customer',
        data.customerId,
        customerName,
        {
          old_values: { is_blacklisted: !data.newStatus },
          new_values: { is_blacklisted: data.newStatus },
          changes_summary: data.newStatus 
            ? `Added customer ${customerName} to blacklist`
            : `Removed customer ${customerName} from blacklist`,
          metadata: {
            customer_number: data.customerData?.customer_number,
            action: data.newStatus ? 'blacklist' : 'whitelist',
          },
          severity: 'high',
        }
      );
      
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
      'rgb(22, 163, 74)', // green-600
      'rgb(234, 88, 12)', // orange-600
      'rgb(59, 130, 246)', // blue-500
    ];
    return colors[index % colors.length];
  };

  // Show loading screen while company data is being loaded
  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات العملاء...</p>
        </div>
      </div>
    );
  }

  // Mobile view
  if (isMobile) {
    return (
      <>
        <PageCustomizer
          pageId="customers-page"
        >
          <div className="space-y-6 p-4" data-page="customers">
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
                type="search"
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
                      canEdit={canEdit}
                      canDelete={canDelete}
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
          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-border">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "rounded-lg px-3",
                  viewMode === 'table' && "bg-coral-500 text-white hover:bg-coral-600"
                )}
              >
                <List className="w-4 h-4 ml-1" />
                جدول
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('split')}
                className={cn(
                  "rounded-lg px-3",
                  viewMode === 'split' && "bg-coral-500 text-white hover:bg-coral-600"
                )}
              >
                <Columns className="w-4 h-4 ml-1" />
                مقسم
              </Button>
            </div>
            
            <Button 
              onClick={handleCreateCustomer}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              <UserPlus className="w-5 h-5" />
              <span>إضافة عميل جديد</span>
            </Button>
          </div>
        </div>

        {/* Search and Filters Section */}
        <Card className="p-4 rounded-2xl border border-border shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            {/* Search Input - أكبر حجم */}
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="text"
                placeholder="بحث عن عميل... (الاسم، رقم الهاتف، رقم العميل، البريد الإلكتروني)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full pr-12 pl-4 py-3 h-12 text-base rounded-xl border border-input bg-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            
            {/* Customer Type Filter */}
            <Select value={customerType} onValueChange={(value: any) => {
              setCustomerType(value);
              setCurrentPage(1); // Reset to first page when filtering
            }}>
              <SelectTrigger className="px-4 py-3 h-12 rounded-xl border border-input bg-input w-full md:w-[180px]">
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="individual">فرد</SelectItem>
                <SelectItem value="corporate">شركة</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={includeInactive ? "all" : "active"} onValueChange={(value) => {
              setIncludeInactive(value === "all");
              setCurrentPage(1); // Reset to first page when filtering
            }}>
              <SelectTrigger className="px-4 py-3 h-12 rounded-xl border border-input bg-input w-full md:w-[180px]">
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
              className="px-4 py-3 h-12 rounded-xl border border-input bg-input hover:bg-accent transition-all w-full md:w-[140px] flex-shrink-0"
              onClick={handleExport}
              disabled={isLoading || customers.length === 0}
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
                <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
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
                <h3 className="text-4xl font-bold mb-2 text-green-600">
                  {totalCustomers > 0 ? (totalCustomers - blacklistedCustomers).toLocaleString('ar-SA') : 0}
                </h3>
                <p className="text-sm text-green-600 flex items-center gap-1 mt-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {totalCustomers > 0 
                      ? `${Math.round(((totalCustomers - blacklistedCustomers) / totalCustomers) * 100)}% نسبة النشاط` 
                      : '0%'}
                  </span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/20">
                <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
          
          {/* Suspended/Blacklisted Customers */}
          <Card className="p-6 rounded-2xl border border-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] bg-gradient-to-br from-card to-background">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-muted-foreground text-sm mb-1">العملاء المعلقون</p>
                <h3 className="text-4xl font-bold mb-2 text-amber-600">{blacklistedCustomers.toLocaleString('ar-SA')}</h3>
                <p className="text-sm text-amber-600 flex items-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>يحتاج متابعة</span>
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/20">
                <UserX className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Customer View - Table or Split */}
        {viewMode === 'split' ? (
          <CustomerSplitView
            customers={customers}
            isLoading={isLoading}
            companyId={companyId}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ) : (
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
                {/* Customer Table */}
                <div className="overflow-auto max-h-[calc(100vh-450px)] min-h-[400px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-accent/50 border-b border-border z-10">
                      <TableRow>
                        <TableHead className="text-right w-[50px]">
                          <input type="checkbox" className="w-4 h-4 rounded border-border" />
                        </TableHead>
                        <TableHead className="text-right">العميل</TableHead>
                        <TableHead className="text-right">رقم الهاتف</TableHead>
                        <TableHead className="text-right">البريد الإلكتروني</TableHead>
                        <TableHead className="text-right">نوع العميل</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">العقود</TableHead>
                        <TableHead className="text-right">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer, index) => (
                        <TableRow
                          key={customer.id}
                          className="hover:bg-accent/30 transition-all duration-200"
                        >
                          <TableCell className="w-[50px]">
                            <input type="checkbox" className="w-4 h-4 rounded border-border" />
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                style={{ background: getAvatarColor(index) }}
                              >
                                {getCustomerInitials(customer)}
                              </div>
                              <div className="min-w-0">
                                <p 
                                  className="font-semibold cursor-pointer hover:text-primary transition-colors truncate"
                                  onClick={() => handleViewCustomer(customer)}
                                >
                                  {getCustomerName(customer)}
                                </p>
                                <p className="text-sm text-muted-foreground truncate">{customer.phone || '-'}</p>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell className="text-muted-foreground">{customer.phone || '-'}</TableCell>
                          
                          <TableCell className="text-muted-foreground">{customer.email || '-'}</TableCell>
                          
                          <TableCell>
                            <Badge 
                              variant={customer.customer_type === 'individual' ? 'destructive' : 'secondary'}
                              className={cn(
                                "px-3 py-1 rounded-full text-sm",
                                customer.customer_type === 'individual' 
                                  ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400' 
                                  : ''
                              )}
                            >
                              {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            {customer.is_blacklisted ? (
                              <Badge variant="destructive" className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                <span className="w-2 h-2 rounded-full bg-white"></span>
                                محظور
                              </Badge>
                            ) : customer.is_active ? (
                              <Badge className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                                <span className="w-2 h-2 rounded-full bg-green-600"></span>
                                نشط
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 w-fit">
                                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                معلق
                              </Badge>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <span className="font-semibold text-primary">
                              {finalContractCounts[customer.id] || 0} {finalContractCounts[customer.id] === 1 ? 'عقد' : 'عقود'}
                            </span>
                          </TableCell>
                          
                          <TableCell>
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
        )}
        </div>
      </PageCustomizer>
      
      {/* Shared Dialogs for Desktop */}
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

      {/* Help System */}
      <PageHelp
        title="دليل استخدام صفحة العملاء"
        description="تعرف على كيفية إدارة العملاء بكفاءة"
      >
        <CustomersPageHelpContent />
      </PageHelp>
    </>
  );
};

export default Customers;
