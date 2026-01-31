/**
 * صفحة العملاء - التصميم الجديد الشامل
 * ======================================
 * تصميم عصري SaaS يجمع جميع الميزات:
 * - إدارة العملاء (إضافة، تعديل، حذف)
 * - عرض Grid و List
 * - فلاتر متقدمة
 * - إحصائيات شاملة
 * - ميزات CRM (الاتصال، المتابعة)
 * - استيراد/تصدير
 * - دعم كامل للعربية (RTL)
 *
 * @component CustomersPageNew
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCustomers, useCustomerCount, useDeleteCustomer } from '@/hooks/useEnhancedCustomers';
import { useCRMCustomersOptimized, getPaymentStatusOptimized, getLastContactDaysOptimized, isNewCustomerOptimized, CRMCustomerData } from '@/hooks/useCRMCustomersOptimized';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { Permission } from '@/lib/permissions/roles';
import { Customer, CustomerFilters } from '@/types/customer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Icons
import {
  Search,
  Plus,
  Users,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  FileText,
  Upload,
  UserPlus,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List,
  Columns,
  Crown,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  Download,
  IdCard,
  MessageCircle,
  Clock,
  TrendingUp,
  PhoneCall,
  MoreHorizontal,
  SearchX,
  Loader2,
  Sparkles,
  CreditCard,
  User,
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Customer Components
import {
  EnhancedCustomerDialog,
  CustomerCSVUpload,
  CustomerSplitView,
} from '@/components/customers';
import CustomerExportDialog from '@/components/customers/CustomerExportDialog';
import CustomerDocumentDistributionDialog from '@/components/customers/CustomerDocumentDistributionDialog';
import { CallDialog } from '@/components/customers/CallDialog';

// ============================================
// Types
// ============================================
type ViewMode = 'grid' | 'list' | 'split';
type FilterTab = 'all' | 'individuals' | 'corporate' | 'vip' | 'late' | 'needs_contact' | 'new';

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string; positive?: boolean };
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  onClick?: () => void;
  delay?: number;
}

// ============================================
// Animation Variants
// ============================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 15,
    },
  },
};

// ============================================
// Helper Functions
// ============================================
const getInitials = (name: string): string => {
  if (!name || name === 'غير محدد') return '؟';
  const parts = name.split(' ').filter(n => n.length > 0);
  return parts.slice(0, 2).map(n => n[0]).join('');
};

const getAvatarGradient = (index: number): string => {
  const gradients = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-orange-500 to-amber-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-teal-500 to-emerald-600',
    'from-amber-500 to-orange-600',
  ];
  return gradients[index % gradients.length];
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'مسدد' };
    case 'due': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'مستحق' };
    case 'late': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'متأخر' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', label: 'لا فواتير' };
  }
};

const getContactStatus = (days: number | null) => {
  if (days === null) return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'لم يتم' };
  if (days > 7) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: `${days} يوم` };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: `${days} يوم` };
};

// ============================================
// Stat Card Component
// ============================================
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color,
  onClick,
  delay = 0,
}) => {
  const colorStyles = {
    primary: { bg: 'bg-gradient-to-br from-teal-500 to-teal-600', shadow: 'shadow-teal-500/20', border: 'border-teal-200' },
    success: { bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', border: 'border-emerald-200' },
    warning: { bg: 'bg-gradient-to-br from-amber-500 to-amber-600', shadow: 'shadow-amber-500/20', border: 'border-amber-200' },
    danger: { bg: 'bg-gradient-to-br from-rose-500 to-rose-600', shadow: 'shadow-rose-500/20', border: 'border-rose-200' },
    info: { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', border: 'border-blue-200' },
    purple: { bg: 'bg-gradient-to-br from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', border: 'border-violet-200' },
  };

  const style = colorStyles[color];

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-lg hover:scale-[1.02]",
        style.border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {description && (
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn(
                "flex items-center text-xs font-medium",
                trend.positive ? "text-emerald-600" : "text-rose-600"
              )}>
                {trend.positive ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingUp className="mr-0.5 h-3 w-3 rotate-180" />}
                {trend.value}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl shadow-lg", style.bg, style.shadow)}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <div className={cn("absolute -bottom-4 -right-4 h-24 w-24 rounded-full opacity-10", style.bg)} />
    </motion.div>
  );
};

// ============================================
// Customer Grid Card
// ============================================
interface CustomerGridCardProps {
  customer: Customer;
  crmData?: CRMCustomerData;
  contractCount: number;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onQuickRent: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

const CustomerGridCard: React.FC<CustomerGridCardProps> = ({
  customer,
  crmData,
  contractCount,
  index,
  onView,
  onEdit,
  onDelete,
  onQuickRent,
  onCall,
  onWhatsApp,
  canEdit,
  canDelete,
}) => {
  const getCustomerName = () => {
    if (customer.customer_type === 'individual') {
      const primaryName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      const arName = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
      return primaryName || arName || 'غير محدد';
    }
    return customer.company_name || customer.company_name_ar || 'غير محدد';
  };

  const name = getCustomerName();
  const initials = getInitials(name);
  const gradient = getAvatarGradient(index);
  const paymentStatus = crmData ? getPaymentStatusOptimized(crmData) : 'none';
  const paymentStyle = getPaymentStatusColor(paymentStatus);
  const contactStatus = crmData ? getContactStatus(getLastContactDaysOptimized(crmData)) : getContactStatus(null);
  const isNew = crmData ? isNewCustomerOptimized(crmData) : false;
  const isVIP = customer.is_vip;

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-500/5"
    >
      {/* VIP Badge */}
      {isVIP && (
        <div className="absolute right-3 top-3 z-10">
          <Badge className="border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 gap-1 shadow-sm">
            <Crown className="h-3 w-3" />
            VIP
          </Badge>
        </div>
      )}

      {/* New Badge */}
      {isNew && !isVIP && (
        <div className="absolute right-3 top-3 z-10">
          <Badge className="border-teal-200 bg-gradient-to-r from-teal-50 to-teal-100 text-teal-700 gap-1 shadow-sm">
            <Sparkles className="h-3 w-3" />
            جديد
          </Badge>
        </div>
      )}

      <div className="p-5" onClick={onView}>
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-lg", gradient)}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{name}</h3>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                {customer.customer_type === 'individual' ? (
                  <><User className="ml-1 h-3 w-3" /> فرد</>
                ) : (
                  <><Building2 className="ml-1 h-3 w-3" /> شركة</>
                )}
              </Badge>
              {customer.is_active && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate font-mono" dir="ltr">{customer.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">{customer.email || '-'}</span>
          </div>
        </div>

        {/* Status Row */}
        <div className="mb-4 flex items-center gap-2">
          <Badge variant="outline" className={cn("flex-1 justify-center gap-1 text-xs", paymentStyle.bg, paymentStyle.text, paymentStyle.border)}>
            <CreditCard className="h-3 w-3" />
            {paymentStyle.label}
          </Badge>
          <Badge variant="outline" className={cn("flex-1 justify-center gap-1 text-xs", contactStatus.bg, contactStatus.text, contactStatus.border)}>
            <Clock className="h-3 w-3" />
            {contactStatus.label}
          </Badge>
        </div>

        {/* Contracts */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1.5 text-sm">
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-900">{contractCount}</span>
            <span className="text-slate-500">عقود</span>
          </div>

          {contractCount === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onQuickRent(); }}
              className="h-7 gap-1 text-xs text-teal-600 hover:bg-teal-50 hover:text-teal-700"
            >
              <Plus className="h-3 w-3" />
              عقد جديد
            </Button>
          )}
        </div>
      </div>

      {/* Actions Overlay */}
      <div className="absolute left-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-white/80 backdrop-blur shadow-sm hover:bg-white">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }} className="gap-2">
              <Eye className="h-4 w-4" />
              عرض التفاصيل
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="gap-2">
                <Edit3 className="h-4 w-4" />
                تعديل
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCall(); }} className="gap-2 text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50">
              <Phone className="h-4 w-4" />
              اتصال
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onWhatsApp(); }} className="gap-2 text-teal-600 focus:text-teal-600 focus:bg-teal-50">
              <MessageCircle className="h-4 w-4" />
              واتساب
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="gap-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                  حذف
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

// ============================================
// Customer List Row
// ============================================
interface CustomerListRowProps extends CustomerGridCardProps {}

const CustomerListRow: React.FC<CustomerListRowProps> = ({
  customer,
  crmData,
  contractCount,
  index,
  onView,
  onEdit,
  onDelete,
  onQuickRent,
  onCall,
  onWhatsApp,
  canEdit,
  canDelete,
}) => {
  const getCustomerName = () => {
    if (customer.customer_type === 'individual') {
      const primaryName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
      const arName = `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
      return primaryName || arName || 'غير محدد';
    }
    return customer.company_name || customer.company_name_ar || 'غير محدد';
  };

  const name = getCustomerName();
  const initials = getInitials(name);
  const gradient = getAvatarGradient(index);
  const paymentStatus = crmData ? getPaymentStatusOptimized(crmData) : 'none';
  const paymentStyle = getPaymentStatusColor(paymentStatus);
  const contactStatus = crmData ? getContactStatus(getLastContactDaysOptimized(crmData)) : getContactStatus(null);
  const isNew = crmData ? isNewCustomerOptimized(crmData) : false;
  const isVIP = customer.is_vip;

  return (
    <motion.tr
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.03 }}
      className="group cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80"
      onClick={onView}
    >
      {/* Customer */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={cn("relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white shadow-md", gradient)}>
            {initials}
            {isVIP && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[8px]">
                <Crown className="h-2.5 w-2.5" />
              </span>
            )}
            {isNew && !isVIP && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-teal-400 text-[8px]">
                <Sparkles className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h4 className="truncate font-medium text-slate-900 group-hover:text-teal-600 transition-colors">{name}</h4>
            <p className="text-xs text-slate-500">{customer.customer_code}</p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs">
          {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
        </Badge>
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-600" dir="ltr">
          <Phone className="h-3.5 w-3.5 text-slate-400" />
          {customer.phone || '-'}
        </div>
      </td>

      {/* Payment Status */}
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn("text-xs", paymentStyle.bg, paymentStyle.text, paymentStyle.border)}>
          {paymentStyle.label}
        </Badge>
      </td>

      {/* Last Contact */}
      <td className="px-4 py-3">
        <Badge variant="outline" className={cn("text-xs", contactStatus.bg, contactStatus.text, contactStatus.border)}>
          {contactStatus.label}
        </Badge>
      </td>

      {/* Contracts */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-slate-700">{contractCount}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={(e) => { e.stopPropagation(); onCall(); }}>
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>اتصال</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-teal-600 hover:bg-teal-50 hover:text-teal-700" onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}>
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>واتساب</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {canEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-600 hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>تعديل</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }} className="gap-2">
                <Eye className="h-4 w-4" />
                عرض
              </DropdownMenuItem>
              {contractCount === 0 && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onQuickRent(); }} className="gap-2">
                  <Plus className="h-4 w-4" />
                  إنشاء عقد
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="gap-2 text-rose-600">
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// Main Component
// ============================================
const CustomersPageNew: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, isAuthenticating } = useUnifiedCompanyAccess();
  const { hasPermission } = useRolePermissions();

  const canEdit = hasPermission(Permission.EDIT_CUSTOMER);
  const canDelete = hasPermission(Permission.DELETE_CUSTOMER);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const includeInactive = false;

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDocumentDistribution, setShowDocumentDistribution] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);

  // Filters
  const filters: CustomerFilters = useMemo(() => ({
    search: searchTerm || undefined,
    customer_type: activeFilter === 'individuals' ? 'individual' : activeFilter === 'corporate' ? 'corporate' : undefined,
    includeInactive,
    page: currentPage,
    pageSize,
  }), [searchTerm, activeFilter, includeInactive, currentPage, pageSize]);

  // Queries
  const { data: customersResult, isLoading, error, refetch } = useCustomers(filters);
  const { data: crmData = [] } = useCRMCustomersOptimized(companyId);

  const customers = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'data' in customersResult) {
      return Array.isArray(customersResult.data) ? customersResult.data : [];
    }
    return Array.isArray(customersResult) ? customersResult : [];
  }, [customersResult]);

  const totalCount = useMemo(() => {
    if (customersResult && typeof customersResult === 'object' && 'total' in customersResult) {
      return customersResult.total || 0;
    }
    return customers.length;
  }, [customersResult, customers.length]);

  // Contract counts
  const { data: contractCounts = {} } = useQuery({
    queryKey: ['customer-contract-counts', customers.map(c => c.id).join(','), companyId],
    queryFn: async () => {
      if (!customers.length || !companyId) return {};
      const customerIds = customers.map(c => c.id);
      const { data } = await supabase
        .from('contracts')
        .select('customer_id')
        .eq('company_id', companyId)
        .in('customer_id', customerIds);
      const counts: Record<string, number> = {};
      customerIds.forEach(id => counts[id] = 0);
      data?.forEach(c => { if (c.customer_id) counts[c.customer_id] = (counts[c.customer_id] || 0) + 1; });
      return counts;
    },
    enabled: customers.length > 0 && !!companyId,
    staleTime: 60 * 1000,
  });

  // Stats
  const { data: individualCount = 0 } = useCustomerCount({ customer_type: 'individual', includeInactive: false });
  const { data: corporateCount = 0 } = useCustomerCount({ customer_type: 'corporate', includeInactive: false });

  const stats = useMemo(() => {
    const total = totalCount;
    const vip = customers.filter(c => c.is_vip).length;
    const late = crmData.filter(c => getPaymentStatusOptimized(c) === 'late').length;
    const needsContact = crmData.filter(c => {
      const days = getLastContactDaysOptimized(c);
      return days === null || days > 7;
    }).length;
    const newCustomers = crmData.filter(c => isNewCustomerOptimized(c)).length;

    return { total, individuals: individualCount, corporate: corporateCount, vip, late, needsContact, new: newCustomers };
  }, [totalCount, customers, crmData, individualCount, corporateCount]);

  // Filter customers by advanced filters
  const filteredCustomers = useMemo(() => {
    let result = customers;

    switch (activeFilter) {
      case 'vip':
        result = result.filter(c => c.is_vip);
        break;
      case 'late':
        result = result.filter(c => {
          const crm = crmData.find(cd => cd.customer_id === c.id);
          return crm && getPaymentStatusOptimized(crm) === 'late';
        });
        break;
      case 'needs_contact':
        result = result.filter(c => {
          const crm = crmData.find(cd => cd.customer_id === c.id);
          if (!crm) return true;
          const days = getLastContactDaysOptimized(crm);
          return days === null || days > 7;
        });
        break;
      case 'new':
        result = result.filter(c => {
          const crm = crmData.find(cd => cd.customer_id === c.id);
          return crm && isNewCustomerOptimized(crm);
        });
        break;
    }

    return result;
  }, [customers, activeFilter, crmData]);

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);

  // Handlers
  const handleView = useCallback((customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditDialog(true);
  }, []);

  const handleDelete = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteDialog(true);
  }, []);

  const handleQuickRent = useCallback((customer: Customer) => {
    navigate('/contracts', { state: { selectedCustomerId: customer.id, autoOpen: true } });
  }, [navigate]);

  const handleCall = useCallback((customer: Customer) => {
    setCallingCustomer(customer);
    setShowCallDialog(true);
  }, []);

  const handleWhatsApp = useCallback((phone: string) => {
    if (!phone) {
      toast.error('لا يوجد رقم هاتف');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  }, []);

  const deleteMutation = useDeleteCustomer();

  const confirmDelete = () => {
    if (selectedCustomer) {
      deleteMutation.mutate(selectedCustomer.id, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setSelectedCustomer(null);
        },
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('customer-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthenticating || !companyId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-600" />
          <p className="mt-3 text-sm text-slate-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/20">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">العملاء</h1>
                <p className="text-sm text-slate-500">إدارة بيانات العملاء والمتابعة</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/50 p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 gap-1.5 text-xs"
                >
                  <LayoutGrid className="h-4 w-4" />
                  شبكة
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 gap-1.5 text-xs"
                >
                  <List className="h-4 w-4" />
                  قائمة
                </Button>
                <Button
                  variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('split')}
                  className="h-8 gap-1.5 text-xs"
                >
                  <Columns className="h-4 w-4" />
                  مقسم
                </Button>
              </div>

              <Separator orientation="vertical" className="h-6 hidden sm:block" />

              <Button variant="outline" size="sm" onClick={() => setShowCSVUpload(true)} className="h-9 gap-1.5 text-xs">
                <Upload className="h-4 w-4" />
                استيراد
              </Button>

              <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)} className="h-9 gap-1.5 text-xs">
                <Download className="h-4 w-4" />
                تصدير
              </Button>

              <Button variant="outline" size="sm" onClick={() => setShowDocumentDistribution(true)} className="h-9 gap-1.5 text-xs">
                <IdCard className="h-4 w-4" />
                توزيع البطاقات
              </Button>

              <Button size="sm" onClick={() => setShowCreateDialog(true)} className="h-9 gap-1.5 bg-teal-600 text-xs hover:bg-teal-700">
                <UserPlus className="h-4 w-4" />
                إضافة عميل
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {/* Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        >
          <StatCard
            title="إجمالي العملاء"
            value={stats.total}
            icon={Users}
            color="primary"
            onClick={() => setActiveFilter('all')}
            delay={0}
          />
          <StatCard
            title="الأفراد"
            value={stats.individuals}
            icon={User}
            color="info"
            onClick={() => setActiveFilter('individuals')}
            delay={0.05}
          />
          <StatCard
            title="الشركات"
            value={stats.corporate}
            icon={Building2}
            color="purple"
            onClick={() => setActiveFilter('corporate')}
            delay={0.1}
          />
          <StatCard
            title="VIP"
            value={stats.vip}
            icon={Crown}
            color="warning"
            onClick={() => setActiveFilter('vip')}
            delay={0.15}
          />
          <StatCard
            title="متأخرين"
            value={stats.late}
            icon={AlertCircle}
            color="danger"
            onClick={() => setActiveFilter('late')}
            delay={0.2}
          />
          <StatCard
            title="يحتاجون اتصال"
            value={stats.needsContact}
            icon={PhoneCall}
            color="warning"
            onClick={() => setActiveFilter('needs_contact')}
            delay={0.25}
          />
          <StatCard
            title="جدد"
            value={stats.new}
            icon={Sparkles}
            color="success"
            onClick={() => setActiveFilter('new')}
            delay={0.3}
          />
        </motion.div>

        {/* Filters Bar */}
        <Card className="mb-6 border-slate-200">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="customer-search"
                  placeholder="بحث بالاسم، الهاتف، البريد، أو الكود..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="h-10 pr-10 text-sm"
                />
                <kbd className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 lg:block">
                  /
                </kbd>
              </div>

              {/* Filter Tabs */}
              <ScrollArea className="w-full whitespace-nowrap lg:w-auto">
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'الكل', icon: Users },
                    { id: 'individuals', label: 'أفراد', icon: User },
                    { id: 'corporate', label: 'شركات', icon: Building2 },
                    { id: 'vip', label: 'VIP', icon: Crown },
                    { id: 'late', label: 'متأخرين', icon: AlertCircle },
                    { id: 'needs_contact', label: 'يحتاجون اتصال', icon: PhoneCall },
                    { id: 'new', label: 'جدد', icon: Sparkles },
                  ].map((filter) => (
                    <Button
                      key={filter.id}
                      variant={activeFilter === filter.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setActiveFilter(filter.id as FilterTab); setCurrentPage(1); }}
                      className={cn(
                        "h-9 gap-1.5 text-xs transition-all",
                        activeFilter === filter.id && "bg-teal-600 hover:bg-teal-700"
                      )}
                    >
                      <filter.icon className="h-3.5 w-3.5" />
                      {filter.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Content Area */}
        {viewMode === 'split' ? (
          <CustomerSplitView
            customers={filteredCustomers}
            isLoading={isLoading}
            companyId={companyId}
            onEditCustomer={handleEdit}
            onDeleteCustomer={handleDelete}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-rose-500" />
              <h3 className="text-lg font-semibold text-rose-900">خطأ في التحميل</h3>
              <p className="mt-1 text-sm text-rose-600">{error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}</p>
              <Button onClick={() => refetch()} variant="outline" className="mt-4 gap-2">
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
            </CardContent>
          </Card>
        ) : filteredCustomers.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <SearchX className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">لا توجد نتائج</h3>
              <p className="mt-1 text-sm text-slate-500">لا يوجد عملاء يطابقون معايير البحث</p>
              <Button onClick={() => { setSearchTerm(''); setActiveFilter('all'); }} variant="outline" className="mt-4">
                إعادة ضبط الفلاتر
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                عرض <span className="font-medium text-slate-900">{filteredCustomers.length}</span> من{' '}
                <span className="font-medium text-slate-900">{totalCount}</span> عميل
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredCustomers.map((customer, index) => (
                <CustomerGridCard
                  key={customer.id}
                  customer={customer}
                  crmData={crmData.find(c => c.customer_id === customer.id)}
                  contractCount={contractCounts[customer.id] || 0}
                  index={index}
                  onView={() => handleView(customer)}
                  onEdit={() => handleEdit(customer)}
                  onDelete={() => handleDelete(customer)}
                  onQuickRent={() => handleQuickRent(customer)}
                  onCall={() => handleCall(customer)}
                  onWhatsApp={() => handleWhatsApp(customer.phone)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">
                  صفحة <span className="font-medium text-slate-900">{currentPage}</span> من{' '}
                  <span className="font-medium text-slate-900">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-9 w-9",
                        currentPage === page && "bg-teal-600 hover:bg-teal-700"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                  {totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                عرض <span className="font-medium text-slate-900">{filteredCustomers.length}</span> من{' '}
                <span className="font-medium text-slate-900">{totalCount}</span> عميل
              </p>
            </div>

            <Card className="overflow-hidden border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50/50">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">العميل</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">النوع</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">الهاتف</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">حالة الدفع</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">آخر تواصل</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">العقود</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredCustomers.map((customer, index) => (
                        <CustomerListRow
                          key={customer.id}
                          customer={customer}
                          crmData={crmData.find(c => c.customer_id === customer.id)}
                          contractCount={contractCounts[customer.id] || 0}
                          index={index}
                          onView={() => handleView(customer)}
                          onEdit={() => handleEdit(customer)}
                          onDelete={() => handleDelete(customer)}
                          onQuickRent={() => handleQuickRent(customer)}
                          onCall={() => handleCall(customer)}
                          onWhatsApp={() => handleWhatsApp(customer.phone)}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">
                  صفحة <span className="font-medium text-slate-900">{currentPage}</span> من{' '}
                  <span className="font-medium text-slate-900">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "h-9 w-9",
                        currentPage === page && "bg-teal-600 hover:bg-teal-700"
                      )}
                    >
                      {page}
                    </Button>
                  ))}
                  {totalPages > 5 && <span className="px-2 text-slate-400">...</span>}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      <EnhancedCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <EnhancedCustomerDialog
        open={showEditDialog}
        onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedCustomer(null); }}
        editingCustomer={selectedCustomer}
      />

      <CustomerCSVUpload
        open={showCSVUpload}
        onOpenChange={setShowCSVUpload}
        onUploadComplete={() => { refetch(); toast.success('تم رفع الملف بنجاح'); }}
      />

      <CustomerExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        companyId={companyId}
        filters={filters}
      />

      <CustomerDocumentDistributionDialog
        open={showDocumentDistribution}
        onOpenChange={setShowDocumentDistribution}
      />

      <CallDialog
        open={showCallDialog}
        onOpenChange={(open) => { setShowCallDialog(open); if (!open) setCallingCustomer(null); }}
        customerName={callingCustomer ? `${callingCustomer.first_name || ''} ${callingCustomer.last_name || ''}`.trim() || callingCustomer.customer_code || 'عميل' : ''}
        customerPhone={callingCustomer?.phone || ''}
        onSaveCall={async (notes: string, status: 'answered' | 'no_answer' | 'busy') => {
          if (!companyId || !callingCustomer) return;
          try {
            const { error } = await supabase.from('customer_notes').insert({
              customer_id: callingCustomer.id,
              company_id: companyId,
              note_type: 'phone',
              title: status === 'answered' ? 'مكالمة هاتفية' : 'محاولة اتصال',
              content: `${status === 'answered' ? '✅ تم الرد' : status === 'busy' ? '📵 مشغول' : '❌ لم يرد'} - ${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n${notes || 'لا توجد ملاحظات'}`,
              is_important: status !== 'answered',
            });
            if (error) throw error;
            toast.success('تم حفظ المكالمة بنجاح');
            queryClient.invalidateQueries({ queryKey: ['crm-customers-optimized', companyId] });
          } catch (error) {
            toast.error('حدث خطأ أثناء حفظ المكالمة');
          }
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCustomer(null)}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CustomersPageNew;
