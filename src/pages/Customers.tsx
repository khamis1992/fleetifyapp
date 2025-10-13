import React, { useState } from 'react';
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
  const individualCustomers = safeCustomers.filter(c => c && c.customer_type === 'individual').length;
  const corporateCustomers = safeCustomers.filter(c => c && c.customer_type === 'corporate').length;
  const blacklistedCustomers = safeCustomers.filter(c => c && c.is_blacklisted).length;
  
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
              إضافة عميل
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="البحث في العملاء..."
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
                <SelectItem value="all">جميع العملاء</SelectItem>
                <SelectItem value="individual">أفراد</SelectItem>
                <SelectItem value="corporate">شركات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                  <p className="text-2xl font-bold">{totalCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Building2 className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">الشركات</p>
                  <p className="text-2xl font-bold">{corporateCustomers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <p>جارٍ تحميل العملاء...</p>
            </div>
          ) : safeCustomers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا يوجد عملاء</p>
            </div>
          ) : (
            safeCustomers.map((customer) => (
              <MobileCustomerCard
                key={customer.id}
                customer={customer}
                onView={() => handleViewCustomer(customer)}
                onEdit={() => handleEditCustomer(customer)}
                onToggleBlacklist={() => handleToggleBlacklist(customer)}
                onDelete={() => handleDeleteCustomer(customer)}
                canEdit={true}
                canDelete={true}
              />
            ))
          )}
        </div>

        {/* Dialogs */}
        <EnhancedCustomerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            refetch();
            setShowCreateDialog(false);
          }}
        />

        {selectedCustomer && (
          <>
            <CustomerDetailsDialog
              customerId={selectedCustomer.id}
              open={showDetailsDialog}
              onOpenChange={setShowDetailsDialog}
              onEdit={() => handleEditCustomer(selectedCustomer)}
              onCreateContract={() => toast.info('سيتم تنفيذ ميزة إنشاء العقد قريباً')}
              onCreateInvoice={() => toast.info('سيتم تنفيذ ميزة إنشاء الفاتورة قريباً')}
            />
            <EnhancedCustomerDialog
              open={showEditDialog}
              onOpenChange={setShowEditDialog}
              editingCustomer={selectedCustomer}
              onSuccess={() => {
                refetch();
                setShowEditDialog(false);
                setSelectedCustomer(null);
              }}
            />
          </>
        )}

        {/* Bulk Delete Dialog */}
        <BulkDeleteCustomersDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
        />

        {/* CSV Upload Dialog */}
        <CustomerCSVUpload
          open={showCSVUpload}
          onOpenChange={setShowCSVUpload}
          onUploadComplete={() => {
            refetch();
            setShowCSVUpload(false);
          }}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة العملاء</h1>
          <p className="text-muted-foreground">عرض وإدارة بيانات العملاء</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="lg"
            onClick={handleCSVUpload}
          >
            <Upload className="h-4 w-4 ml-2" />
            استيراد CSV
          </Button>
          {hasFullCompanyControl && totalCustomers > 0 && (
            <Button 
              variant="destructive" 
              size="lg"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف جميع العملاء
            </Button>
          )}
          <Button onClick={handleCreateCustomer} size="lg">
            <Plus className="h-4 w-4 ml-2" />
            إضافة عميل جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأفراد</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{individualCustomers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الشركات</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{corporateCustomers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القائمة السوداء</CardTitle>
            <Users className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{blacklistedCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            البحث والتصفية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث بالاسم، الهاتف، أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع العملاء</SelectItem>
                <SelectItem value="individual">أفراد</SelectItem>
                <SelectItem value="corporate">شركات</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <input
                type="checkbox"
                id="includeInactive"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="includeInactive" className="text-sm">
                تضمين العملاء غير النشطين
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة العملاء</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p>جارٍ تحميل العملاء...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              <p>حدث خطأ في تحميل البيانات</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                إعادة المحاولة
              </Button>
            </div>
          ) : safeCustomers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا يوجد عملاء مطابقون للمعايير المحددة</p>
              <Button variant="outline" onClick={handleCreateCustomer} className="mt-4">
                <Plus className="h-4 w-4 ml-2" />
                إضافة أول عميل
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>الاسم / الشركة</TableHead>
                  <TableHead>رمز العميل</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {customer.customer_type === 'individual' ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                        <span className="text-xs">
                          {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {customer.customer_type === 'individual'
                            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                            : customer.company_name}
                        </p>
                        {customer.customer_type === 'individual' && customer.company_name && (
                          <p className="text-xs text-muted-foreground">{customer.company_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {customer.customer_code || 'غير محدد'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono">{customer.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{customer.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">غير محدد</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {customer.is_blacklisted && (
                          <Badge variant="destructive" className="text-xs">
                            قائمة سوداء
                          </Badge>
                        )}
                        {!customer.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            غير نشط
                          </Badge>
                        )}
                        {customer.is_active && !customer.is_blacklisted && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            نشط
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                            <Eye className="mr-2 h-4 w-4" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                            <Edit className="mr-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleBlacklist(customer)}>
                            {customer.is_blacklisted ? 'إلغاء' : 'إضافة إلى'} القائمة السوداء
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination Controls */}
          {!isLoading && !error && safeCustomers.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCustomersInDB)} من أصل {totalCustomersInDB}
                </span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">لكل صفحة</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  الأولى
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  السابقة
                </Button>
                <span className="text-sm">
                  صفحة {currentPage} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  التالية
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                >
                  الأخيرة
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EnhancedCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
      />

      {selectedCustomer && (
        <>
          <CustomerDetailsDialog
            customerId={selectedCustomer.id}
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            onEdit={() => handleEditCustomer(selectedCustomer)}
            onCreateContract={() => toast.info('سيتم تنفيذ ميزة إنشاء العقد قريباً')}
            onCreateInvoice={() => toast.info('سيتم تنفيذ ميزة إنشاء الفاتورة قريباً')}
          />
          <EnhancedCustomerDialog
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            editingCustomer={selectedCustomer}
            onSuccess={() => {
              refetch();
              setShowEditDialog(false);
              setSelectedCustomer(null);
            }}
          />
        </>
      )}

      {/* Bulk Delete Dialog */}
      <BulkDeleteCustomersDialog
        open={showBulkDeleteDialog}
        onOpenChange={(open) => {
          setShowBulkDeleteDialog(open);
          if (!open) {
            // Refresh data after bulk delete
            refetch();
          }
        }}
      />

      {/* CSV Upload Dialog */}
      <CustomerCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          refetch();
          setShowCSVUpload(false);
        }}
      />
    </div>
  );
};

export default Customers;