/**
 * صفحة العملاء - التصميم الجديد (Bento Card Grid)
 * مستوحى من تصميم بطاقات العملاء المميز
 * متوافق مع ألوان الداشبورد
 * 
 * @component CustomersPageNew
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCustomers, useCustomerCount } from '@/hooks/useEnhancedCustomers';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Customer, CustomerFilters } from '@/types/customer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Search,
  Plus,
  Filter,
  Users,
  Building2,
  Phone,
  Mail,
  Eye,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Star,
  FileText,
  Upload,
  Download,
  MoreVertical,
  UserPlus,
  UserCheck,
  UserX,
  TrendingUp,
  MessageSquare,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Car,
  CreditCard,
  Calendar,
  MapPin,
  Activity,
  BarChart3,
  LayoutGrid,
  Columns,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { 
  EnhancedCustomerDialog, 
  CustomerCSVUpload,
  CustomerSplitView,
} from '@/components/customers';
import { exportTableToCSV } from '@/utils/exports/csvExport';

// ===== بطاقة العميل =====
interface CustomerCardProps {
  customer: Customer;
  contractCount: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickRent: () => void;
  canEdit: boolean;
  canDelete: boolean;
  index: number;
}

const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  contractCount,
  onView,
  onEdit,
  onDelete,
  onQuickRent,
  canEdit,
  canDelete,
  index,
}) => {
  const getCustomerName = () => {
    if (customer.customer_type === 'individual') {
      const arName = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
      const enName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      return arName || enName || 'غير محدد';
    }
    return customer.company_name_ar || customer.company_name || 'غير محدد';
  };

  const getCustomerInitials = () => {
    const name = getCustomerName();
    if (name === 'غير محدد') return '؟';
    const parts = name.split(' ').filter(n => n.length > 0);
    return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColors = () => {
    const colors = [
      { bg: 'bg-coral-100', text: 'text-coral-600' },
      { bg: 'bg-blue-100', text: 'text-blue-600' },
      { bg: 'bg-green-100', text: 'text-green-600' },
      { bg: 'bg-purple-100', text: 'text-purple-600' },
      { bg: 'bg-amber-100', text: 'text-amber-600' },
      { bg: 'bg-pink-100', text: 'text-pink-600' },
    ];
    return colors[index % colors.length];
  };

  const avatarColors = getAvatarColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-neutral-200 p-5 hover:shadow-lg hover:border-coral-200 transition-all duration-300 group cursor-pointer"
      onClick={onView}
    >
      {/* Header - Avatar and Info */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className={cn("w-12 h-12 rounded-full", avatarColors.bg)}>
              <AvatarFallback className={cn("font-bold text-sm", avatarColors.bg, avatarColors.text)}>
                {getCustomerInitials()}
              </AvatarFallback>
            </Avatar>
            {customer.is_active && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-neutral-900 text-sm truncate group-hover:text-coral-600 transition-colors">
              {getCustomerName()}
            </h3>
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              {customer.customer_type === 'individual' ? (
                <>
                  <Users className="w-3 h-3" />
                  فرد
                </>
              ) : (
                <>
                  <Building2 className="w-3 h-3" />
                  شركة
                </>
              )}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        {customer.is_vip && (
          <Badge className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5">
            <Star className="w-3 h-3 ml-1" />
            VIP
          </Badge>
        )}
      </div>

      {/* Contact Info */}
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center gap-2 text-sm text-neutral-600 hover:text-coral-600 transition-colors">
          <Mail className="w-4 h-4 text-neutral-400" />
          <span className="truncate text-xs">{customer.email || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-neutral-600 hover:text-coral-600 transition-colors">
          <Phone className="w-4 h-4 text-neutral-400" />
          <span className="font-mono text-xs" dir="ltr">{customer.phone || '-'}</span>
        </div>
      </div>

      {/* Contract Count & Arrow */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-coral-50 rounded-lg">
            <FileText className="w-3.5 h-3.5 text-coral-600" />
            <span className="text-xs font-bold text-coral-600">{contractCount}</span>
            <span className="text-xs text-coral-500">عقد</span>
          </div>
          {contractCount === 0 && (
            <button 
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-coral-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onQuickRent();
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              إنشاء عقد
            </button>
          )}
        </div>

        <ChevronLeft className="w-4 h-4 text-neutral-300 group-hover:text-coral-500 group-hover:translate-x-[-4px] transition-all" />
      </div>
    </motion.div>
  );
};

// ===== بطاقة الإحصائيات =====
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'coral' | 'blue' | 'green' | 'amber' | 'purple';
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorStyles = {
    coral: { bg: 'bg-coral-50', text: 'text-coral-600', border: 'border-coral-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={cn(
        "bg-white rounded-2xl p-5 border shadow-sm hover:shadow-lg transition-all",
        style.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", style.bg)}>
          <Icon className={cn("w-6 h-6", style.text)} />
        </div>
      </div>
      <div className="mt-4">
        <p className={cn("text-3xl font-black", style.text)}>{value}</p>
        <p className="text-sm text-neutral-500 font-medium mt-1">{title}</p>
        {subtitle && (
          <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
};

// ===== الصفحة الرئيسية =====
const CustomersPageNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasPermission } = useRolePermissions();
  
  const canEdit = hasPermission('edit_customers');
  const canDelete = hasPermission('delete_customers');

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'individual' | 'corporate'>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid'); // View mode toggle

  // Filters
  const filters: CustomerFilters = {
    search: searchTerm || undefined,
    customer_type: customerType === 'all' ? undefined : customerType,
    includeInactive,
    page: currentPage,
    pageSize,
  };

  // Queries
  const { data: customersResult, isLoading, error, refetch } = useCustomers(filters);

  const customers = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'data' in customersResult) {
      return Array.isArray(customersResult.data) ? customersResult.data : [];
    }
    if (Array.isArray(customersResult)) {
      return customersResult;
    }
    return [];
  }, [customersResult]);

  const totalCustomersInDB = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'total' in customersResult) {
      return customersResult.total || 0;
    }
    return customers.length;
  }, [customersResult, customers.length]);

  // Contract counts
  const { data: contractCountsData } = useQuery({
    queryKey: ['customer-contract-counts-new', customers.map(c => c.id).join(','), companyId],
    queryFn: async () => {
      if (!customers.length || !companyId) return {};
      const customerIds = customers.map(c => c.id);
      const { data, error } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .in('customer_id', customerIds);
      if (error) return {};
      const counts: Record<string, number> = {};
      customerIds.forEach(id => counts[id] = 0);
      data?.forEach(c => {
        if (c.customer_id) counts[c.customer_id] = (counts[c.customer_id] || 0) + 1;
      });
      return counts;
    },
    enabled: customers.length > 0 && !!companyId,
    staleTime: 60 * 1000,
  });

  // Counts
  const { data: individualCount = 0 } = useCustomerCount({ customer_type: 'individual', includeInactive: false });
  const { data: corporateCount = 0 } = useCustomerCount({ customer_type: 'corporate', includeInactive: false });
  const { data: blacklistedCount = 0 } = useCustomerCount({ is_blacklisted: true, includeInactive: true });

  const totalPages = Math.ceil(totalCustomersInDB / pageSize);

  // Handlers
  const handleViewCustomer = useCallback((customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  }, []);

  const handleQuickRent = useCallback((customer: Customer) => {
    navigate('/contracts', {
      state: { selectedCustomerId: customer.id, autoOpen: true }
    });
  }, [navigate]);

  const handleDeleteCustomer = useCallback((customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  }, []);

  // Delete mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('customer_id', customerId)
        .limit(1);
      if (contracts && contracts.length > 0) {
        throw new Error('لا يمكن حذف العميل لأنه مرتبط بعقود');
      }
      const { error } = await supabase.from('customers').delete().eq('id', customerId);
      if (error) throw error;
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

  const confirmDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(customerToDelete.id);
    }
  };

  // Loading
  if (isAuthenticating || !companyId) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <div className="max-w-[1600px] mx-auto p-5">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-coral-500 to-coral-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">إدارة العملاء</h1>
              <p className="text-sm text-neutral-500">عرض وإدارة جميع العملاء في النظام</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle */}
            <div className="flex items-center bg-white rounded-xl p-1 shadow-sm border border-neutral-200">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg px-3",
                  viewMode === 'grid' && "bg-coral-500 text-white hover:bg-coral-600"
                )}
              >
                <LayoutGrid className="w-4 h-4 ml-1" />
                شبكة
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
              variant="outline"
              className="bg-white gap-2"
              onClick={() => setShowCSVUpload(true)}
            >
              <Upload className="w-4 h-4" />
              استيراد
            </Button>
            <Button
              className="bg-coral-500 hover:bg-coral-600 text-white gap-2 shadow-lg"
              onClick={() => setShowCreateDialog(true)}
            >
              <UserPlus className="w-4 h-4" />
              إضافة عميل
            </Button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="إجمالي العملاء"
            value={totalCustomersInDB.toLocaleString()}
            icon={Users}
            color="coral"
            subtitle={`${individualCount} فرد | ${corporateCount} شركة`}
          />
          <StatCard
            title="العملاء الأفراد"
            value={individualCount}
            icon={UserCheck}
            color="blue"
          />
          <StatCard
            title="الشركات"
            value={corporateCount}
            icon={Building2}
            color="green"
          />
          <StatCard
            title="القائمة السوداء"
            value={blacklistedCount}
            icon={UserX}
            color="amber"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-neutral-200 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <Input
                placeholder="البحث عن عميل... (الاسم، الهاتف، البريد الإلكتروني)"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-12 h-12 rounded-xl border-neutral-200 focus:border-coral-500"
              />
            </div>

            {/* Type Filter */}
            <Select value={customerType} onValueChange={(v: any) => { setCustomerType(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="individual">أفراد</SelectItem>
                <SelectItem value="corporate">شركات</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={includeInactive ? "all" : "active"} onValueChange={(v) => { setIncludeInactive(v === "all"); setCurrentPage(1); }}>
              <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">نشط فقط</SelectItem>
                <SelectItem value="all">جميع الحالات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Customer View - Grid or Split */}
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
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-neutral-200 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-neutral-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-neutral-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-neutral-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-200 rounded w-full" />
                  <div className="h-3 bg-neutral-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900 mb-2">خطأ في تحميل البيانات</h3>
            <p className="text-neutral-500 mb-4">{error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}</p>
            <Button onClick={() => refetch()} className="bg-coral-500 hover:bg-coral-600">
              إعادة المحاولة
            </Button>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-neutral-200">
            <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900 mb-2">لا توجد عملاء</h3>
            <p className="text-neutral-500 mb-4">ابدأ بإضافة عملاء جدد للنظام</p>
            <Button onClick={() => setShowCreateDialog(true)} className="bg-coral-500 hover:bg-coral-600">
              <UserPlus className="w-4 h-4 ml-2" />
              إضافة عميل
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {customers.map((customer, index) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  contractCount={contractCountsData?.[customer.id] || 0}
                  onView={() => handleViewCustomer(customer)}
                  onEdit={() => handleEditCustomer(customer)}
                  onDelete={() => handleDeleteCustomer(customer)}
                  onQuickRent={() => handleQuickRent(customer)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  index={index}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between bg-white rounded-2xl p-4 border border-neutral-200">
                <p className="text-sm text-neutral-500">
                  عرض <span className="font-bold">{customers.length}</span> من <span className="font-bold">{totalCustomersInDB}</span> عميل
                </p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "rounded-lg w-9 h-9",
                          currentPage === page && "bg-coral-500 hover:bg-coral-600"
                        )}
                      >
                        {page}
                      </Button>
                    ))}
                    {totalPages > 5 && (
                      <>
                        <span className="px-2 text-neutral-400">...</span>
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(totalPages)}
                          className="rounded-lg w-9 h-9"
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ))}
      </div>

      {/* Dialogs */}
      <EnhancedCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <EnhancedCustomerDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingCustomer={selectedCustomer}
      />

      <CustomerCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => {
          refetch();
          toast.success('تم رفع الملف بنجاح');
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف العميل</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العميل؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCustomerMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCustomerMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomersPageNew;

