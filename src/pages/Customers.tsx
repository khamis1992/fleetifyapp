import React, { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCustomers } from '@/hooks/useEnhancedCustomers';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Upload
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
import { EnhancedCustomerDialog, CustomerDetailsDialog, BulkDeleteCustomersDialog, CustomerCSVUpload } from '@/components/customers';
import { Customer, CustomerFilters } from '@/types/customer';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { MobileCustomerCard } from '@/components/customers';
import { toast } from 'sonner';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

const Customers = () => {
  const { user } = useAuth();
  const { isMobile } = useSimpleBreakpoint();
  const { hasFullCompanyControl } = useUnifiedCompanyAccess();
  const parentRef = useRef<HTMLDivElement>(null);
  
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Build filters for the query
  const filters: CustomerFilters = {
    search: searchTerm || undefined,
    customer_type: customerType === 'all' ? undefined : customerType,
    includeInactive,
    page: currentPage,
    pageSize: pageSize,
  };

  const { data: customersResult, isLoading, error, refetch } = useCustomers(filters);
  
  // Fetch counts for all customer types (without pagination filters)
  const { data: individualCountResult } = useCustomers({
    customer_type: 'individual',
    includeInactive: false
  });
  
  const { data: corporateCountResult } = useCustomers({
    customer_type: 'corporate',
    includeInactive: false
  });
  
  const { data: blacklistedCountResult } = useCustomers({
    is_blacklisted: true,
    includeInactive: true // Include both active and inactive blacklisted customers
  });
  
  // Extract pagination data
  const totalCustomersInDB = customersResult?.total || 0;
  const totalPages = Math.ceil(totalCustomersInDB / pageSize);
  
  // Extract customers array and handle potential null/undefined with comprehensive fallbacks
  const customers = React.useMemo(() => {
    // Handle different possible return structures
    if (Array.isArray(customersResult)) {
      return customersResult;
    }
    if (customersResult && typeof customersResult === 'object' && Array.isArray(customersResult.data)) {
      return customersResult.data;
    }
    // Always return an empty array as fallback
    return [];
  }, [customersResult]);
  
  // Virtual scrolling implementation
  const virtualizer = useVirtualizer({
    count: customers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 120 : 60,
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Debug log to understand the data structure (remove in production)
  React.useEffect(() => {
    console.log('🔍 [Customers] Data structure check:', {
      customersResult,
      customers,
      isArray: Array.isArray(customers),
      length: customers.length,
      type: typeof customersResult
    });
  }, [customersResult, customers]);

  // Event handlers
  const handleCreateCustomer = () => {
    setShowCreateDialog(true);
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteDialog(true);
  };

  const handleCSVUpload = () => {
    setShowCSVUpload(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    // TODO: Implement delete functionality
    toast.info('سيتم تنفيذ ميزة الحذف قريباً');
  };

  const handleToggleBlacklist = (customer: Customer) => {
    // TODO: Implement blacklist toggle
    toast.info('سيتم تنفيذ ميزة القائمة السوداء قريباً');
  };

  // Calculate stats with comprehensive safety checks
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const totalCustomers = totalCustomersInDB; // Use total from database
  const individualCustomers = individualCountResult?.total || 0; // Use total count from separate query
  const corporateCustomers = corporateCountResult?.total || 0; // Use total count from separate query
  const blacklistedCustomers = blacklistedCountResult?.total || 0; // Use total count from separate query
  
  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize));
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-6 p-4">
        {/* Header */}
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
            {hasFullCompanyControl && totalCustomers > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف الكل
              </Button>
            )}
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
        <EnhancedCustomerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          mode="create"
        />
        
        <CustomerDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          customer={selectedCustomer}
        />
        
        <EnhancedCustomerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          customer={selectedCustomer}
          mode="edit"
        />
        
        <BulkDeleteCustomersDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        />
        
        <CustomerCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
        />
      </div>
    );
  }

  // Desktop view with virtual scrolling
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة العملاء</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleCSVUpload}
          >
            <Upload className="h-4 w-4 ml-2" />
            استيراد CSV
          </Button>
          {hasFullCompanyControl && totalCustomers > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف الكل
            </Button>
          )}
          <Button onClick={handleCreateCustomer}>
            <Plus className="h-4 w-4 ml-2" />
            عميل جديد
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن العملاء..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
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
          <div ref={parentRef} className="h-[calc(100vh-350px)] overflow-auto">
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {virtualItems.map((virtualItem) => {
                    const customer = customers[virtualItem.index];
                    return (
                      <TableRow
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
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {customer.customer_type === 'individual' 
                                ? `${customer.first_name} ${customer.last_name}` 
                                : customer.company_name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.customer_type === 'individual' ? 'default' : 'secondary'}>
                            {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.phone || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{customer.email || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.is_active ? 'default' : 'destructive'}>
                            {customer.is_active ? 'نشط' : 'غير نشط'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            إظهار {Math.min(pageSize, totalCustomers - (currentPage - 1) * pageSize)} من {totalCustomers} عملاء
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
      <EnhancedCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="create"
      />
      
      <CustomerDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        customer={selectedCustomer}
      />
      
      <EnhancedCustomerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        customer={selectedCustomer}
        mode="edit"
      />
      
      <BulkDeleteCustomersDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      />
      
      <CustomerCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
      />
    </div>
  );
};

export default Customers;