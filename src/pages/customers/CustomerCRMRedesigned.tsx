/**
 * صفحة إدارة علاقات العملاء - CRM Redesigned
 * تصميم SaaS احترافي مع جميع الميزات الحالية
 *
 * @component CustomerCRMRedesigned
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/components/ui/use-toast';
import { differenceInDays, format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Phone,
  MessageCircle,
  Plus,
  ChevronDown,
  RefreshCw,
  Clock,
  MoreHorizontal,
  X,
  Save,
  ArrowLeft,
  ArrowRight,
  Filter,
  Hash,
  Printer,
  Download,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Calendar,
  Activity,
  Bell,
  PhoneCall,
  FileText,
  ChevronDown as ChevronDownIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CallDialog } from '@/components/customers/CallDialog';
import { ScheduledFollowupsPanel } from '@/components/crm/ScheduledFollowupsPanel';
import { CRMActivityPanel } from '@/components/customers/CRMActivityPanel';
import { CRMErrorBoundary } from '@/components/CRMErrorBoundary';
import { useCRMCustomersOptimized, getPaymentStatusOptimized, getLastContactDaysOptimized, isNewCustomerOptimized } from '@/hooks/useCRMCustomersOptimized';
import { cn } from '@/lib/utils';

// --- الثوابت ---
const ITEMS_PER_PAGE = 15;

// --- الأنواع ---
interface Customer {
  id: string;
  customer_code: string;
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  phone: string;
  email?: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
}

interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  status: string;
  start_date: string;
  end_date: string;
  monthly_amount: number;
}

// --- المكونات الفرعية ---

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    paid: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'مسدد' },
    due: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'مستحق' },
    late: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'متأخر' },
    none: { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', label: 'لا فواتير' },
  };

  const style = styles[status] || styles.none;

  return (
    <span className={cn('px-2.5 py-1 rounded-lg text-xs font-semibold border', style.bg, style.text, style.border)}>
      {style.label}
    </span>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  trend,
  onClick,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: 'coral' | 'green' | 'blue' | 'amber' | 'purple' | 'slate';
  trend?: string;
  onClick?: () => void;
}) => {
  const colorStyles = {
    coral: { bg: 'bg-rose-50', text: 'text-rose-600', iconBg: 'bg-rose-500' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-500' },
    blue: { bg: 'bg-sky-50', text: 'text-sky-600', iconBg: 'bg-sky-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-500' },
    purple: { bg: 'bg-violet-50', text: 'text-violet-600', iconBg: 'bg-violet-500' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', iconBg: 'bg-slate-500' },
  };

  const style = colorStyles[color];

  return (
    <motion.button
      onClick={onClick}
      className={cn('bg-white rounded-2xl p-5 text-right hover:shadow-lg transition-all duration-300 border border-slate-100', onClick && 'cursor-pointer group')}
      whileHover={{ y: -2 }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', style.iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-slate-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </motion.button>
  );
};

// Customer Table Row Component (New Modern Design)
const CustomerTableRow = ({
  customer,
  contract,
  lastContact,
  paymentStatus,
  index,
  onCall,
  onNote,
  onWhatsApp,
  onViewDetails,
}: {
  customer: Customer;
  contract?: Contract;
  lastContact: number | null;
  paymentStatus: string;
  index: number;
  onCall: () => void;
  onNote: () => void;
  onWhatsApp: () => void;
  onViewDetails: () => void;
}) => {
  const getNameAr = () => {
    if (customer.first_name_ar || customer.last_name_ar) {
      return `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
    }
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.customer_code || 'عميل غير معرف';
  };

  const nameAr = getNameAr();
  const isNew = lastContact === null;
  const daysSinceContact = lastContact ?? 0;
  const initials = customer.first_name_ar?.substring(0, 2) || customer.first_name?.substring(0, 2).toUpperCase() || 'ع';

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      className="group hover:bg-gradient-to-l hover:from-teal-50/50 hover:to-transparent transition-all duration-300 border-b border-slate-100 last:border-0"
    >
      {/* Customer Info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "relative w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ring-2 ring-offset-2 transition-all duration-300",
            isNew
              ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white ring-amber-200 group-hover:ring-amber-400 group-hover:scale-110'
              : 'bg-gradient-to-br from-teal-400 to-teal-600 text-white ring-teal-200 group-hover:ring-teal-400 group-hover:scale-110'
          )}>
            {initials}
            {isNew && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                <span className="text-white text-[8px]">!</span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-slate-900 text-sm truncate">{nameAr}</h3>
              {isNew && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-[10px] rounded-full font-medium border border-amber-200 whitespace-nowrap">
                  جديد
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                {customer.customer_code}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Phone */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Phone size={14} className="text-slate-400" />
          <span dir="ltr">{customer.phone}</span>
        </div>
      </td>

      {/* Contract */}
      <td className="py-4 px-4">
        {contract ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <FileText size={12} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{contract.contract_number}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>

      {/* Payment Status */}
      <td className="py-4 px-4">
        <StatusBadge status={paymentStatus} />
      </td>

      {/* Last Contact */}
      <td className="py-4 px-4">
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300",
          isNew
            ? 'bg-gradient-to-r from-rose-50 to-rose-100/50 text-rose-700 border-rose-200'
            : daysSinceContact > 7
              ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 text-amber-700 border-amber-200'
              : 'bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-700 border-emerald-200'
        )}>
          <Clock size={12} />
          {isNew ? 'لم يتم' : `${daysSinceContact} يوم`}
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            onClick={onCall}
            className="h-8 w-8 p-0 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300 transition-all duration-300 hover:scale-105"
          >
            <Phone size={14} />
          </Button>
          <Button
            size="sm"
            onClick={onWhatsApp}
            className="h-8 w-8 p-0 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md shadow-teal-200 hover:shadow-lg hover:shadow-teal-300 transition-all duration-300 hover:scale-105"
          >
            <MessageCircle size={14} />
          </Button>
          <Button
            size="sm"
            onClick={onNote}
            className="h-8 w-8 p-0 rounded-lg bg-white border-2 border-slate-200 hover:border-teal-300 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition-all duration-300 hover:scale-105"
          >
            <Plus size={14} />
          </Button>
          <Button
            size="sm"
            onClick={onViewDetails}
            className="h-8 w-8 p-0 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-md shadow-rose-200 hover:shadow-lg hover:shadow-rose-300 transition-all duration-300 hover:scale-105"
          >
            <ChevronDown size={14} className="transform -rotate-90" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
};

// Customer Card Component (for Grid View)
const CustomerCard = ({
  customer,
  contract,
  lastContact,
  paymentStatus,
  onCall,
  onNote,
  onWhatsApp,
  onViewDetails,
}: {
  customer: Customer;
  contract?: Contract;
  lastContact: number | null;
  paymentStatus: string;
  onCall: () => void;
  onNote: () => void;
  onWhatsApp: () => void;
  onViewDetails: () => void;
}) => {
  const getNameAr = () => {
    if (customer.first_name_ar || customer.last_name_ar) {
      return `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
    }
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return customer.customer_code || 'عميل غير معرف';
  };

  const nameAr = getNameAr();
  const isNew = lastContact === null;
  const daysSinceContact = lastContact ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-slate-200 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0",
          isNew ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-600'
        )}>
          {customer.first_name_ar?.substring(0, 2) || customer.first_name?.substring(0, 2).toUpperCase() || 'ع'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{nameAr}</h3>
            {isNew && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] rounded-full font-medium border border-amber-200 flex-shrink-0">
                جديد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-mono bg-slate-50 px-2 py-0.5 rounded border">
              <Hash size={10} />
              {contract?.contract_number || customer.customer_code}
            </span>
            <span className="flex items-center gap-1">
              <Phone size={12} />
              {customer.phone}
            </span>
          </div>
        </div>
      </div>

      {/* Status Row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-medium mb-1">حالة الدفع</p>
          <StatusBadge status={paymentStatus} />
        </div>
        <div className="w-px h-8 bg-slate-100" />
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-medium mb-1">آخر تواصل</p>
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border",
            isNew ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-200'
          )}>
            <Clock size={12} />
            {isNew ? 'لم يتم الاتصال' : `منذ ${daysSinceContact} يوم`}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onCall}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Phone size={14} className="ml-1" />
          اتصال
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onWhatsApp}
          className="flex-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        >
          <MessageCircle size={14} className="ml-1" />
          واتساب
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onNote}
          className="px-3"
        >
          <Plus size={14} />
        </Button>
        <Button
          size="sm"
          onClick={onViewDetails}
          className="px-3 bg-rose-500 hover:bg-rose-600 text-white"
        >
          <ChevronDown size={14} className="transform -rotate-90" />
        </Button>
      </div>
    </motion.div>
  );
};

// --- المكون الرئيسي ---
export default function CustomerCRMRedesigned() {
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState<'note' | 'call' | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState({ content: '', outcome: 'answered' });
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Call Dialog State
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
  const [autoCallHandled, setAutoCallHandled] = useState(false);

  // Side Panel State
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedCustomerForPanel, setSelectedCustomerForPanel] = useState<string | null>(null);

  // Use optimized CRM hook
  const { data: crmCustomers = [], isLoading, refetch } = useCRMCustomersOptimized(companyId);

  // Transform CRM data
  const customers = useMemo(() => {
    if (!crmCustomers || crmCustomers.length === 0) return [];
    return crmCustomers.map(c => ({
      id: c.customer_id,
      customer_code: c.customer_code,
      first_name: c.first_name,
      last_name: c.last_name,
      first_name_ar: c.first_name_ar,
      last_name_ar: c.last_name_ar,
      phone: c.phone,
      email: c.email,
      company_id: companyId || '',
      is_active: c.is_active,
      created_at: c.created_at,
    }));
  }, [crmCustomers, companyId]);

  const contracts = useMemo(() => {
    if (!crmCustomers || crmCustomers.length === 0) return [];
    return crmCustomers
      .filter(c => c.contract_id)
      .map(c => ({
        id: c.contract_id!,
        contract_number: c.contract_number!,
        customer_id: c.customer_id,
        status: c.contract_status,
        start_date: c.contract_start_date || '',
        end_date: c.contract_end_date || '',
        monthly_amount: c.total_invoiced_amount || 0,
      }));
  }, [crmCustomers]);

  // Handle auto-call from URL parameter
  useEffect(() => {
    const callCustomerId = searchParams.get('call');
    if (callCustomerId && !autoCallHandled && companyId) {
      setAutoCallHandled(true);

      let customerToCall = customers.find(c => c.id === callCustomerId);

      if (customerToCall) {
        setCallingCustomer(customerToCall);
        setCallDialogOpen(true);
        setSearchParams({});
        toast({
          title: '📞 بدء الاتصال',
          description: `جاري الاتصال بـ ${customerToCall.first_name_ar || customerToCall.first_name || ''} ${customerToCall.last_name_ar || customerToCall.last_name || ''}`,
        });
      } else {
        supabase
          .from('customers')
          .select('id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone, email, company_id, is_active, created_at')
          .eq('id', callCustomerId)
          .eq('company_id', companyId)
          .single()
          .then(({ data, error }) => {
            if (data && !error) {
              setCallingCustomer(data as Customer);
              setCallDialogOpen(true);
              setSearchParams({});
            } else {
              toast({
                title: '⚠️ خطأ',
                description: 'لم يتم العثور على العميل',
                variant: 'destructive',
              });
              setSearchParams({});
            }
          });
      }
    }
  }, [searchParams, autoCallHandled, companyId, customers, setSearchParams, toast]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getCustomerContract = useCallback((customerId: string) => {
    return contracts.find(c => c.customer_id === customerId && c.status === 'active');
  }, [contracts]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const late = crmCustomers.filter(c => getPaymentStatusOptimized(c) === 'late').length;

    const needsContact = crmCustomers.filter(c => {
      const lastContact = getLastContactDaysOptimized(c);
      if (lastContact === null) return true;
      return lastContact > 7;
    }).length;

    const expiring = crmCustomers.filter(c => {
      if (!c.days_until_expiry) return false;
      const days = c.days_until_expiry;
      return days < 30 && days > 0;
    }).length;

    const callsToday = crmCustomers.filter(c => {
      if (!c.last_interaction_date) return false;
      const iDate = new Date(c.last_interaction_date);
      return c.last_interaction_type === 'phone' && iDate >= todayStart;
    }).length;

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const callsThisMonth = crmCustomers.filter(c => {
      if (!c.last_interaction_date) return false;
      const iDate = new Date(c.last_interaction_date);
      return c.last_interaction_type === 'phone' && iDate >= monthStart;
    }).length;

    const newCustomers = crmCustomers.filter(c => isNewCustomerOptimized(c)).length;

    const activeContracts = contracts.length;

    return {
      total: customers.length,
      late,
      needsContact,
      expiring,
      callsToday,
      callsThisMonth,
      newCustomers,
      activeContracts,
    };
  }, [crmCustomers, contracts, customers]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = customers;
    const today = new Date();

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(c =>
        (c.first_name_ar || '').includes(searchTerm) ||
        (c.last_name_ar || '').includes(searchTerm) ||
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(lower) ||
        (c.phone || '').includes(searchTerm) ||
        (c.customer_code || '').toLowerCase().includes(lower)
      );
    }

    switch (activeFilter) {
      case 'late':
        result = result.filter(c => {
          const crmCustomer = crmCustomers.find(cc => cc.customer_id === c.id);
          return crmCustomer && getPaymentStatusOptimized(crmCustomer) === 'late';
        });
        break;
      case 'needs_contact':
        result = result.filter(c => {
          const crmCustomer = crmCustomers.find(cc => cc.customer_id === c.id);
          if (!crmCustomer) return true;
          const lastContact = getLastContactDaysOptimized(crmCustomer);
          if (lastContact === null) return true;
          return lastContact > 7;
        });
        break;
      case 'expiring':
        result = result.filter(c => {
          const contract = getCustomerContract(c.id);
          if (!contract) return false;
          const diff = differenceInDays(new Date(contract.end_date), today);
          return diff < 30 && diff > 0;
        });
        break;
      case 'new':
        result = result.filter(c => {
          const crmCustomer = crmCustomers.find(cc => cc.customer_id === c.id);
          return c.is_active && crmCustomer && isNewCustomerOptimized(crmCustomer);
        });
        break;
    }
    return result;
  }, [customers, searchTerm, activeFilter, crmCustomers, getCustomerContract]);

  // Pagination
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  // Handlers
  const handleSaveInteraction = async () => {
    if (!companyId || !selectedCustomerId) return;
    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: selectedCustomerId,
        company_id: companyId,
        note_type: dialogOpen === 'call' ? 'phone' : 'general',
        title: dialogOpen === 'call' ? 'مكالمة هاتفية' : 'ملاحظة',
        content: dialogData.content,
        is_important: dialogOpen === 'call' && dialogData.outcome !== 'answered',
      });

      if (error) throw error;

      toast({ title: '✅ تم الحفظ', description: 'تم حفظ السجل بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
      setDialogOpen(null);
      setDialogData({ content: '', outcome: 'answered' });
      setSelectedCustomerId(null);
    } catch (error) {
      console.error("Error saving interaction", error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  const openDialog = (type: 'note' | 'call', customerId: string) => {
    setSelectedCustomerId(customerId);
    setDialogOpen(type);
  };

  const handleWhatsApp = (phone: string) => {
    if (!phone) {
      toast({ title: 'خطأ', description: 'لا يوجد رقم هاتف', variant: 'destructive' });
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleCall = (customer: Customer) => {
    setCallingCustomer(customer);
    setCallDialogOpen(true);
  };

  const handleOpenCustomerPanel = (customerId: string) => {
    setSelectedCustomerForPanel(customerId);
    setSidePanelOpen(true);
  };

  const handleSaveCall = async (notes: string, status: 'answered' | 'no_answer' | 'busy') => {
    if (!companyId || !callingCustomer) return;

    try {
      const statusTexts = {
        answered: '✅ تم الرد - ',
        no_answer: '❌ لم يرد - ',
        busy: '📵 مشغول - '
      };

      const { error } = await supabase.from('customer_notes').insert({
        customer_id: callingCustomer.id,
        company_id: companyId,
        note_type: 'phone',
        title: status === 'answered' ? 'مكالمة هاتفية' : 'محاولة اتصال',
        content: `${statusTexts[status]}${format(new Date(), 'dd/MM/yyyy HH:mm')}\n\n${notes || 'لا توجد ملاحظات'}`,
        is_important: status !== 'answered',
      });

      if (error) throw error;

      toast({
        title: status === 'answered' ? '✅ تم حفظ المكالمة' : '⚠️ تم تسجيل المحاولة',
      });
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
    } catch (error) {
      console.error('Error saving call:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
  };

  // Print late payments report
  const handlePrintLateReport = useCallback(async () => {
    if (!companyId) return;

    const lateCustomers = customers.filter(c => {
      const crmCustomer = crmCustomers.find(cc => cc.customer_id === c.id);
      return crmCustomer && getPaymentStatusOptimized(crmCustomer) === 'late';
    });

    // Get customer IDs for fetching related data
    const customerIds = lateCustomers.map(c => c.id);

    // Fetch unpaid invoices for these customers
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, customer_id, invoice_date, due_date, payment_status, balance_due')
      .in('customer_id', customerIds)
      .eq('company_id', companyId)
      .neq('payment_status', 'paid');

    // Fetch traffic violations for these customers via contracts
    const { data: customerContracts } = await supabase
      .from('contracts')
      .select('id, customer_id')
      .in('customer_id', customerIds)
      .eq('company_id', companyId);

    const contractIds = customerContracts?.map(c => c.id) || [];

    const { data: trafficViolations } = await supabase
      .from('traffic_violations')
      .select('contract_id, fine_amount, status')
      .in('contract_id', contractIds)
      .neq('status', 'paid');

    // Group violations by customer
    const violationsByCustomer = new Map<string, { count: number; totalAmount: number }>();
    trafficViolations?.forEach(violation => {
      const contract = customerContracts?.find(c => c.id === violation.contract_id);
      if (!contract) return;

      const customerId = contract.customer_id;
      const current = violationsByCustomer.get(customerId) || { count: 0, totalAmount: 0 };
      violationsByCustomer.set(customerId, {
        count: current.count + 1,
        totalAmount: current.totalAmount + (violation.fine_amount || 0),
      });
    });

    // Arabic month names
    const arabicMonths = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const reportData = lateCustomers.map(customer => {
      const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);
      const lastContact = crmCustomer ? getLastContactDaysOptimized(crmCustomer) : null;
      const violations = violationsByCustomer.get(customer.id) || { count: 0, totalAmount: 0 };

      // Get overdue invoices for this customer and format as month names with year
      const customerInvoices = overdueInvoices?.filter(inv => inv.customer_id === customer.id) || [];
      const invoiceMonths = customerInvoices.map(inv => {
        const invoiceDate = new Date(inv.invoice_date || inv.due_date);
        const monthIndex = invoiceDate.getMonth();
        const year = invoiceDate.getFullYear();
        return `فاتورة شهر ${arabicMonths[monthIndex]} ${year}`;
      });
      const dueInvoicesText = invoiceMonths.length > 0 ? invoiceMonths.join(' و') : 'لا توجد';

      return {
        nameAr: `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معرف',
        phone: customer.phone || '-',
        dueInvoices: dueInvoicesText,
        violationsCount: violations.count,
        violationsAmount: violations.totalAmount,
        lastContactDays: lastContact === null ? 'لم يتم' : `${lastContact} يوم`,
      };
    });

    const totalOutstanding = reportData.length;
    const totalViolationsAmount = reportData.reduce((sum, c) => sum + c.violationsAmount, 0);
    const today = format(new Date(), 'dd/MM/yyyy');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'خطأ', description: 'تعذر فتح نافذة الطباعة', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العملاء المتأخرين - ${today}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Tahoma, sans-serif; background: #fff; color: #1f2937; }
          .container { max-width: 100%; border: 3px double #1f2937; border-radius: 8px; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: bold; color: #1f2937; margin-bottom: 8px; }
          .summary { display: flex; justify-content: center; gap: 40px; margin: 20px 0; padding: 16px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-radius: 8px; border: 1px solid #fecaca; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 28px; font-weight: bold; color: #dc2626; }
          .summary-label { font-size: 12px; color: #991b1b; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
          th { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 10px 6px; text-align: right; font-weight: bold; border: 1px solid #1e3a8a; }
          td { padding: 8px 6px; border: 1px solid #e5e7eb; text-align: right; }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #fef2f2; }
          .amount { font-weight: bold; color: #dc2626; }
          .phone-cell { direction: ltr; text-align: left; font-family: monospace; }
          .invoices-cell { font-size: 10px; color: #374151; max-width: 200px; }
          .violations-cell { text-align: center; }
          .contact-needed { background: #fef3c7 !important; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">تقرير العملاء المتأخرين</div>
            <div style="font-size: 14px; color: #64748b;">تاريخ التقرير: ${today}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${totalOutstanding}</div>
              <div class="summary-label">عدد العملاء المتأخرين</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalViolationsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="summary-label">إجمالي المخالفات (ر.ق)</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم العميل</th>
                <th>الهاتف</th>
                <th>الفواتير المستحقة</th>
                <th>المخالفات المرورية</th>
                <th>آخر تواصل</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map((c, i) => `
                <tr class="${c.lastContactDays === 'لم يتم' ? 'contact-needed' : ''}">
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${c.nameAr}</td>
                  <td class="phone-cell">${c.phone}</td>
                  <td class="invoices-cell">${c.dueInvoices}</td>
                  <td class="violations-cell">${c.violationsCount > 0 ? `${c.violationsCount} مخالفة (${c.violationsAmount.toLocaleString('en-US')} ر.ق)` : 'لا توجد'}</td>
                  <td>${c.lastContactDays}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }, [customers, crmCustomers, companyId, toast]);

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const data = filteredData.map(customer => {
      const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);
      const contract = getCustomerContract(customer.id);
      const lastContact = crmCustomer ? getLastContactDaysOptimized(crmCustomer) : null;
      const paymentStatus = crmCustomer ? getPaymentStatusOptimized(crmCustomer) : 'none';

      return {
        'كود العميل': customer.customer_code,
        'اسم العميل': `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        'الهاتف': customer.phone,
        'رقم العقد': contract?.contract_number || '-',
        'حالة الدفع': paymentStatus === 'paid' ? 'مسدد' : paymentStatus === 'late' ? 'متأخر' : paymentStatus === 'due' ? 'مستحق' : 'لا فواتير',
        'آخر تواصل': lastContact === null ? 'لم يتم' : `${lastContact} يوم`,
      };
    });

    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(',')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm-customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({ title: '✅ تم التصدير', description: 'تم تصدير البيانات بنجاح' });
  }, [filteredData, crmCustomers, getCustomerContract, toast]);

  // --- Render ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <RefreshCw className="animate-spin" size={24} />
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <CRMErrorBoundary>
      <div className="min-h-screen bg-slate-50" dir="rtl">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Title & Description */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[rgba(0,168,150,1)] rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">إدارة علاقات العملاء</h1>
                  <p className="text-sm text-slate-500">متابعة العملاء والاتصالات</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1 lg:w-80">
                  <Input
                    ref={searchInputRef}
                    type="text"
                    placeholder="بحث باسم العميل، الهاتف، أو الرمز..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all text-sm"
                  />
                  <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                  <kbd className="absolute left-3 top-2.5 text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 hidden lg:block">/</kbd>
                </div>

                {/* View Toggle */}
                <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    قائمة
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    )}
                  >
                    شبكة
                  </button>
                </div>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  className="rounded-xl"
                >
                  <RefreshCw size={18} />
                </Button>

                {/* Export */}
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  className="rounded-xl gap-2"
                >
                  <Download size={18} />
                  <span className="hidden sm:inline">تصدير</span>
                </Button>

                {/* Print Report */}
                <Button
                  onClick={handlePrintLateReport}
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 gap-2"
                >
                  <Printer size={18} />
                  <span className="hidden sm:inline">تقرير المتأخرين</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي العملاء"
              value={stats.total}
              icon={Users}
              color="slate"
              onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
            />
            <StatCard
              title="مكالمات اليوم"
              value={stats.callsToday}
              icon={PhoneCall}
              color="green"
              trend={stats.callsToday > 10 ? 'نشط' : undefined}
              onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
            />
            <StatCard
              title="متأخر بالدفع"
              value={stats.late}
              icon={AlertCircle}
              color="coral"
              onClick={() => { setActiveFilter('late'); setCurrentPage(1); }}
            />
            <StatCard
              title="يحتاج اتصال"
              value={stats.needsContact}
              icon={Phone}
              color="amber"
              onClick={() => { setActiveFilter('needs_contact'); setCurrentPage(1); }}
            />
          </div>

          {/* Scheduled Follow-ups */}
          <ScheduledFollowupsPanel />

          {/* Filters & Content */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            {/* Filter Tabs */}
            <div className="border-b border-slate-200 px-6 py-4 overflow-x-auto">
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'جميع العملاء', count: stats.total },
                  { id: 'late', label: 'متأخر بالدفع', count: stats.late },
                  { id: 'needs_contact', label: 'لم يتم الاتصال (7 أيام)', count: stats.needsContact },
                  { id: 'new', label: 'عملاء جدد', count: stats.newCustomers },
                  { id: 'expiring', label: 'عقود قريبة الانتهاء', count: stats.expiring },
                ].map(filter => (
                  <button
                    key={filter.id}
                    onClick={() => { setActiveFilter(filter.id); setCurrentPage(1); }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                      activeFilter === filter.id
                        ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {filter.label}
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs",
                      activeFilter === filter.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    )}>
                      {filter.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Customer List/Grid */}
            {viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {/* Table Header */}
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        العميل
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        الهاتف
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        العقد
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        حالة الدفع
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        آخر تواصل
                      </th>
                      <th className="py-3.5 px-4 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20">
                          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Search className="text-slate-400" size={24} />
                          </div>
                          <h3 className="text-lg font-semibold text-slate-900">لا توجد نتائج</h3>
                          <p className="text-slate-500">لا يوجد عملاء يطابقون معايير البحث أو الفلتر الحالي.</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedCustomers.map((customer, index) => {
                        const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);

                        return (
                          <CustomerTableRow
                            key={customer.id}
                            index={index}
                            customer={customer}
                            contract={getCustomerContract(customer.id)}
                            lastContact={crmCustomer ? getLastContactDaysOptimized(crmCustomer) : null}
                            paymentStatus={crmCustomer ? getPaymentStatusOptimized(crmCustomer) : 'none'}
                            onCall={() => handleCall(customer)}
                            onNote={() => openDialog('note', customer.id)}
                            onWhatsApp={() => handleWhatsApp(customer.phone)}
                            onViewDetails={() => handleOpenCustomerPanel(customer.id)}
                          />
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedCustomers.length === 0 ? (
                  <div className="col-span-full text-center py-20">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Search className="text-slate-400" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">لا توجد نتائج</h3>
                    <p className="text-slate-500">لا يوجد عملاء يطابقون معايير البحث أو الفلتر الحالي.</p>
                  </div>
                ) : (
                  paginatedCustomers.map(customer => {
                    const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);

                    return (
                      <CustomerCard
                        key={customer.id}
                        customer={customer}
                        contract={getCustomerContract(customer.id)}
                        lastContact={crmCustomer ? getLastContactDaysOptimized(crmCustomer) : null}
                        paymentStatus={crmCustomer ? getPaymentStatusOptimized(crmCustomer) : 'none'}
                        onCall={() => handleCall(customer)}
                        onNote={() => openDialog('note', customer.id)}
                        onWhatsApp={() => handleWhatsApp(customer.phone)}
                        onViewDetails={() => handleOpenCustomerPanel(customer.id)}
                      />
                    );
                  })
                )}
              </div>
            )}

            {/* Pagination */}
            {filteredData.length > 0 && (
              <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} من أصل {filteredData.length} عميل
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="rounded-lg"
                  >
                    <ArrowRight size={16} />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => (
                    <Button
                      key={idx + 1}
                      variant={currentPage === idx + 1 ? "default" : "outline"}
                      onClick={() => setCurrentPage(idx + 1)}
                      className={cn("w-9 h-9 rounded-lg", currentPage === idx + 1 && "bg-rose-500 hover:bg-rose-600")}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="rounded-lg"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Interaction Dialog */}
        <AnimatePresence>
          {dialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
              >
                <div className="flex justify-between items-center p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl", dialogOpen === 'call' ? 'bg-sky-50 text-sky-600' : 'bg-violet-50 text-violet-600')}>
                      {dialogOpen === 'call' ? <Phone size={20} /> : <FileText size={20} />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {dialogOpen === 'call' ? 'تسجيل مكالمة جديدة' : 'إضافة ملاحظة'}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {dialogOpen === 'call' ? 'تسجيل تفاصيل المكالمة' : 'إضافة ملاحظة متابعة'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setDialogOpen(null)} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  {dialogOpen === 'call' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-3">حالة المكالمة</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'answered', label: 'تم الرد', color: 'emerald' },
                          { id: 'busy', label: 'مشغول', color: 'amber' },
                          { id: 'no_answer', label: 'لم يرد', color: 'rose' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setDialogData({ ...dialogData, outcome: opt.id })}
                            className={cn(
                              "py-3 text-sm rounded-xl border-2 transition-all font-medium",
                              dialogData.outcome === opt.id
                                ? `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-700`
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">التفاصيل</label>
                    <Textarea
                      value={dialogData.content}
                      onChange={(e) => setDialogData({ ...dialogData, content: e.target.value })}
                      className="w-full p-4 border-slate-200 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none min-h-[120px] text-sm resize-none bg-slate-50 focus:bg-white transition-all"
                      placeholder="اكتب التفاصيل هنا..."
                    />
                  </div>

                  <Button
                    onClick={handleSaveInteraction}
                    className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-medium gap-2"
                  >
                    <Save size={18} />
                    حفظ السجل
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Call Dialog */}
        {callingCustomer && (
          <CallDialog
            open={callDialogOpen}
            onOpenChange={setCallDialogOpen}
            customerName={
              (callingCustomer.first_name_ar || callingCustomer.last_name_ar)
                ? `${callingCustomer.first_name_ar || ''} ${callingCustomer.last_name_ar || ''}`.trim()
                : (callingCustomer.first_name || callingCustomer.last_name)
                  ? `${callingCustomer.first_name || ''} ${callingCustomer.last_name || ''}`.trim()
                  : callingCustomer.customer_code || 'عميل'
            }
            customerPhone={callingCustomer.phone || ''}
            onSaveCall={handleSaveCall}
          />
        )}

        {/* Activity Panel */}
        <CRMActivityPanel
          customerId={selectedCustomerForPanel}
          customerName={(() => {
            const c = customers.find(cust => cust.id === selectedCustomerForPanel);
            if (!c) return undefined;
            const arName = `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.trim();
            const enName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
            return arName || enName || c.customer_code;
          })()}
          customerPhone={customers.find(c => c.id === selectedCustomerForPanel)?.phone}
          customerCode={customers.find(c => c.id === selectedCustomerForPanel)?.customer_code}
          contractNumber={getCustomerContract(selectedCustomerForPanel || '')?.contract_number}
          paymentStatus={(() => {
            const crmCustomer = crmCustomers.find(cc => cc.customer_id === selectedCustomerForPanel);
            return crmCustomer ? getPaymentStatusOptimized(crmCustomer) : 'none';
          })()}
          lastContact={(() => {
            const crmCustomer = crmCustomers.find(cc => cc.customer_id === selectedCustomerForPanel);
            return crmCustomer ? getLastContactDaysOptimized(crmCustomer) : null;
          })()}
          isOpen={sidePanelOpen}
          onClose={() => {
            setSidePanelOpen(false);
            setSelectedCustomerForPanel(null);
          }}
          onCall={(phone) => {
            const customer = customers.find(c => c.phone === phone);
            if (customer) handleCall(customer);
          }}
          onWhatsApp={handleWhatsApp}
        />

      </div>
    </CRMErrorBoundary>
  );
}
