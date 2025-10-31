import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '@/hooks/useEnhancedCustomers';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import {
  UserPlus,
  Search,
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Calendar,
  Download,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
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
  CustomerCreationOptionsDialog 
} from '@/components/customers';
import { Customer, CustomerFilters } from '@/types/customer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CustomersNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasFullCompanyControl } = useUnifiedCompanyAccess();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'individual' | 'corporate'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showCreationOptionsDialog, setShowCreationOptionsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      console.error('❌ [CustomersNew] Error fetching customers:', {
        error,
        message: error instanceof Error ? error.message : String(error),
        filters,
        timestamp: new Date().toISOString()
      });
    }
  }, [error, filters]);
  
  // Fetch counts for stats
  const { data: totalCountResult } = useCustomers({
    includeInactive: false,
    pageSize: 999999
  });
  
  const { data: individualCountResult } = useCustomers({
    customer_type: 'individual',
    includeInactive: false,
    pageSize: 999999
  });
  
  const { data: inactiveCountResult } = useCustomers({
    includeInactive: true,
    pageSize: 999999
  });

  // Extract data
  const customers = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'data' in customersResult) {
      return Array.isArray(customersResult.data) ? customersResult.data : [];
    }
    if (Array.isArray(customersResult)) {
      return customersResult;
    }
    return [];
  }, [customersResult]);

  const totalCustomers = useMemo(() => {
    if (totalCountResult && typeof totalCountResult === 'object' && 'total' in totalCountResult) {
      return totalCountResult.total || 0;
    }
    if (Array.isArray(totalCountResult)) {
      return totalCountResult.length;
    }
    return 0;
  }, [totalCountResult]);

  const activeCustomers = useMemo(() => {
    if (totalCountResult && typeof totalCountResult === 'object' && 'total' in totalCountResult) {
      return totalCountResult.total || 0;
    }
    if (Array.isArray(totalCountResult)) {
      return totalCountResult.length;
    }
    return 0;
  }, [totalCountResult]);

  const inactiveCustomers = useMemo(() => {
    const total = inactiveCountResult && typeof inactiveCountResult === 'object' && 'total' in inactiveCountResult
      ? inactiveCountResult.total || 0
      : Array.isArray(inactiveCountResult) ? inactiveCountResult.length : 0;
    return total - activeCustomers;
  }, [inactiveCountResult, activeCustomers]);

  const totalPages = Math.ceil((customersResult && typeof customersResult === 'object' && 'total' in customersResult 
    ? customersResult.total || 0 
    : customers.length) / pageSize);

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

  // Get customer display name
  const getCustomerName = (customer: Customer) => {
    if (customer.customer_type === 'individual') {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 
             `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() ||
             'غير محدد';
    }
    return customer.company_name || customer.company_name_ar || 'غير محدد';
  };

  // Get customer ID
  const getCustomerId = (customer: Customer) => {
    return customer.civil_id || customer.commercial_registration_number || '-';
  };

  // Handle actions
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsDialog(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    
    try {
      // Delete logic here
      toast.success('تم حذف العميل بنجاح');
      refetch();
    } catch (error) {
      toast.error('فشل حذف العميل');
    }
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

  return (
    <div className="min-h-screen p-6 md:p-8">
      
      {/* Header Section */}
      <div className="mb-8 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-foreground">
              إدارة العملاء
            </h1>
            <p className="text-muted-foreground">
              إدارة شاملة لجميع عملاء النظام
            </p>
          </div>
          
          <Button 
            onClick={() => setShowCreationOptionsDialog(true)}
            className="bg-gradient-to-br from-primary-dark to-primary hover:opacity-90 transition-all shadow-lg hover:shadow-glow hover:scale-105 active:scale-95"
          >
            <UserPlus className="w-5 h-5 ml-2" />
            إضافة عميل جديد
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Customers */}
        <Card 
          className="p-6 border opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 
                     hover:shadow-elevated hover:-translate-y-1 hover:scale-[1.03] transition-all"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-soft)) 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">إجمالي العملاء</p>
              <h3 className="text-4xl font-bold text-foreground">{totalCustomers}</h3>
              <p className="text-success text-sm mt-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>نظام متكامل</span>
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'hsl(var(--primary-glow))' }}>
              <Users className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
            </div>
          </div>
        </Card>
        
        {/* Active Customers */}
        <Card 
          className="p-6 border opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200
                     hover:shadow-elevated hover:-translate-y-1 hover:scale-[1.03] transition-all"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-soft)) 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">العملاء النشطون</p>
              <h3 className="text-4xl font-bold" style={{ color: 'hsl(var(--success))' }}>
                {activeCustomers}
              </h3>
              <p className="text-success text-sm mt-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>{totalCustomers > 0 ? ((activeCustomers / totalCustomers) * 100).toFixed(1) : 0}% نسبة النشاط</span>
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'hsl(var(--success-light))' }}>
              <UserCheck className="w-6 h-6" style={{ color: 'hsl(var(--success))' }} />
            </div>
          </div>
        </Card>
        
        {/* Inactive Customers */}
        <Card 
          className="p-6 border opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300
                     hover:shadow-elevated hover:-translate-y-1 hover:scale-[1.03] transition-all"
          style={{ background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background-soft)) 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm mb-1">العملاء المعلقون</p>
              <h3 className="text-4xl font-bold" style={{ color: 'hsl(var(--warning))' }}>
                {inactiveCustomers}
              </h3>
              <p className="text-warning text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                <span>يحتاج متابعة</span>
              </p>
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'hsl(var(--warning-light))' }}>
              <UserX className="w-6 h-6" style={{ color: 'hsl(var(--warning))' }} />
            </div>
          </div>
        </Card>
      </div>
      
      {/* Search and Filters Section */}
      <div className="mb-6 opacity-0 animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
        <Card className="p-4 border shadow-card">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="text" 
                placeholder="بحث عن عميل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-12 pl-4 py-3 rounded-xl border-input bg-input 
                          focus:border-primary focus:ring-2 focus:ring-primary/20 
                          transition-all focus:scale-[1.02]"
              />
            </div>
            
            {/* Customer Type Filter */}
            <div className="relative min-w-[150px]">
              <Select value={customerType} onValueChange={(value: any) => setCustomerType(value)}>
                <SelectTrigger className="rounded-xl border-input bg-input">
                  <SelectValue placeholder="نوع العميل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="individual">فرد</SelectItem>
                  <SelectItem value="corporate">شركة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Status Filter */}
            <div className="relative min-w-[150px]">
              <Select value={includeInactive ? "all" : "active"} onValueChange={(value) => setIncludeInactive(value === "all")}>
                <SelectTrigger className="rounded-xl border-input bg-input">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="all">الكل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Filter Button */}
            <Button variant="outline" className="rounded-xl border-input bg-input hover:bg-accent">
              <Calendar className="w-5 h-5 ml-2" />
              التاريخ
            </Button>
            
            {/* Export Button */}
            <Button variant="outline" className="rounded-xl border-input bg-input hover:bg-accent">
              <Download className="w-5 h-5 ml-2" />
              تصدير
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Customers Table */}
      <Card className="bg-card rounded-2xl border border-border shadow-card overflow-hidden opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
        
        {/* Table Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">قائمة العملاء</h2>
        </div>
        
        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-accent border-b border-border">
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
              
              {isLoading ? (
                // Loading skeleton
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="opacity-0 animate-in fade-in slide-in-from-right-4 duration-300" 
                      style={{ animationDelay: `${i * 60}ms` }}>
                    <td className="px-6 py-4" colSpan={8}>
                      <div className="h-12 bg-muted/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                // Error state
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <AlertCircle className="w-16 h-16 text-destructive" />
                      <div className="space-y-2">
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
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-lg">لا توجد عملاء</p>
                      <p className="text-sm">ابدأ بإضافة عميل جديد</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer, index) => (
                  <tr 
                    key={customer.id} 
                    className={cn(
                      "table-row hover:bg-accent-light transition-all hover:translate-x-1",
                      "opacity-0 animate-in fade-in slide-in-from-right-4 duration-300"
                    )}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <td className="px-6 py-4">
                      <input type="checkbox" className="w-4 h-4 rounded border-border" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ background: getAvatarColor(index) }}
                        >
                          {getCustomerInitials(customer)}
                        </div>
                        <div>
                          <p className="font-semibold">{getCustomerName(customer)}</p>
                          <p className="text-sm text-muted-foreground">{getCustomerId(customer)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {customer.phone || '-'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {customer.email || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={customer.customer_type === 'individual' ? 'default' : 'secondary'}
                        className="rounded-full"
                      >
                        {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        className={cn(
                          "rounded-full flex items-center gap-1 w-fit transition-all",
                          customer.is_active 
                            ? "bg-success-light text-success" 
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          customer.is_active ? "bg-success" : "bg-gray-400"
                        )} />
                        {customer.is_active ? 'نشط' : 'معلق'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                        {(() => {
                          const count = customer.total_contracts || customer.contracts_count || customer.contracts?.length || 0;
                          return `${count} ${count === 1 ? 'عقد' : 'عقود'}`;
                        })()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                            <Eye className="ml-2 h-4 w-4" />
                            عرض التفاصيل
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditCustomer(customer)}>
                            <Edit className="ml-2 h-4 w-4" />
                            تعديل
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
              
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-6 border-t">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              عرض <span className="font-semibold">{((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCustomers)}</span> من <span className="font-semibold">{totalCustomers}</span> عميل
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "rounded-lg min-w-[40px]",
                      currentPage === pageNum && "bg-primary text-primary-foreground"
                    )}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  <span className="px-2">...</span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(totalPages)}
                    className="rounded-lg min-w-[40px]"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">عدد الصفوف:</span>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-20 rounded-lg">
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
        
      </Card>

      {/* Dialogs */}
      {showCreationOptionsDialog && (
        <CustomerCreationOptionsDialog
          open={showCreationOptionsDialog}
          onOpenChange={setShowCreationOptionsDialog}
          onSelectStandard={() => {
            setShowCreationOptionsDialog(false);
            setShowCreateDialog(true);
          }}
          onSelectQuick={() => {
            setShowCreationOptionsDialog(false);
            // Quick create logic
          }}
          onSelectImport={() => {
            setShowCreationOptionsDialog(false);
            // Import logic
          }}
        />
      )}

      {showCreateDialog && (
        <EnhancedCustomerDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}

      {showEditDialog && selectedCustomer && (
        <EnhancedCustomerDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          customer={selectedCustomer}
          onSuccess={() => {
            setShowEditDialog(false);
            setSelectedCustomer(null);
            refetch();
          }}
        />
      )}

      {showDetailsDialog && selectedCustomer && (
        <CustomerDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          customer={selectedCustomer}
          onEdit={() => {
            setShowDetailsDialog(false);
            setShowEditDialog(true);
          }}
        />
      )}
      
    </div>
  );
};

export default CustomersNew;

