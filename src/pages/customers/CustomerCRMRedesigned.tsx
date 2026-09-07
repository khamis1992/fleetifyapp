import { OperationsWorkspace, OperationsMetric, OperationsPanel } from '@/components/operations/OperationsWorkspace';
import { pageNumbers } from '@/components/operations/operationsPresentation';
/**
 * صفحة إدارة علاقات العملاء - CRM Redesigned
 * تصميم SaaS احترافي مع جميع الميزات الحالية
 *
 * @component CustomerCRMRedesigned
 */

/**
 * صفحة إدارة علاقات العملاء - CRM Redesigned
 * تصميم SaaS احترافي مع جميع الميزات الحالية
 *
 * @component CustomerCRMRedesigned
 */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/components/ui/use-toast';
import { differenceInDays, format } from 'date-fns';
import { motion } from 'framer-motion';
import { Search, Phone, MessageCircle, Plus, ChevronDown, RefreshCw, Clock, X, Save, ArrowLeft, ArrowRight, Hash, Printer, Download, Users, AlertCircle, PhoneCall, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
    if (customer.first_name_ar || customer.last_name_ar) return [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ');
    if (customer.first_name || customer.last_name) return [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    return customer.customer_code || 'عميل غير معرف';
  };

  const nameAr = getNameAr();
  const isNew = lastContact === null;
  const daysSinceContact = lastContact ?? 0;
  const initials = customer.first_name?.substring(0, 2) || customer.first_name_ar?.substring(0, 2) || 'ع';

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.4 }}
      className="group border-b border-[#E7EDF4] transition-all duration-300 last:border-0 hover:bg-[#F8FAFC]"
    >
      {/* Customer Info */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="opw-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm truncate"><button onClick={onViewDetails} className="text-start hover:underline">{nameAr}</button></h3>
              {isNew && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 whitespace-nowrap">
                  بلا تواصل
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="rounded-md border border-[#DDE5EF] bg-[#F8FAFC] px-2 py-0.5 font-mono">
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
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] px-3 py-1.5">
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
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-300",
          isNew
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : daysSinceContact > 7
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
            aria-label={'اتصال بالعميل ' + nameAr} onClick={onCall}
            className="h-8 w-8 rounded-lg bg-emerald-600 p-0 text-white transition-all duration-300 hover:scale-105 hover:bg-emerald-700"
          >
            <Phone size={14} />
          </Button>
          <Button
            size="sm"
            aria-label={'واتساب ' + nameAr} onClick={onWhatsApp}
            className="h-8 w-8 rounded-lg bg-[#173A63] p-0 text-white transition-all duration-300 hover:scale-105 hover:bg-[#142033]"
          >
            <MessageCircle size={14} />
          </Button>
          <Button
            size="sm"
            aria-label={'إضافة ملاحظة للعميل ' + nameAr} onClick={onNote}
            className="h-8 w-8 rounded-lg border border-[#DDE5EF] bg-white p-0 text-[#536173] transition-all duration-300 hover:scale-105 hover:border-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
          >
            <Plus size={14} />
          </Button>
          <Button
            size="sm"
            aria-label={'فتح متابعة العميل ' + nameAr} onClick={onViewDetails}
            className="h-8 w-8 rounded-lg bg-[#173A63] p-0 text-white transition-colors"
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
    if (customer.first_name_ar || customer.last_name_ar) return [customer.first_name_ar, customer.last_name_ar].filter(Boolean).join(' ');
    if (customer.first_name || customer.last_name) return [customer.first_name, customer.last_name].filter(Boolean).join(' ');
    return customer.customer_code || 'عميل غير معرف';
  };

  const nameAr = getNameAr();
  const isNew = lastContact === null;
  const daysSinceContact = lastContact ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="opw-customer-card"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0",
          isNew ? 'bg-amber-50 text-amber-700' : 'bg-[#EEF5FB] text-[#173A63]'
        )}>
          {customer.first_name?.substring(0, 2) || customer.first_name_ar?.substring(0, 2) || 'ع'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{nameAr}</h3>
            {isNew && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 flex-shrink-0">
                جديد
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1 rounded border border-[#DDE5EF] bg-[#F8FAFC] px-2 py-0.5 font-mono">
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
        <div className="w-px h-8 bg-[#E7EDF4]" />
        <div className="flex-1">
          <p className="text-[10px] text-slate-400 font-medium mb-1">آخر تواصل</p>
          <div className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border",
            isNew ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-[#F8FAFC] text-[#536173] border-[#DDE5EF]'
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
          aria-label={'اتصال بالعميل ' + nameAr} onClick={onCall}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Phone size={14} className="ml-1" />
          اتصال
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={'واتساب ' + nameAr} onClick={onWhatsApp}
          className="flex-1 border-[#DDE5EF] text-[#173A63] hover:bg-[#EEF5FB]"
        >
          <MessageCircle size={14} className="ml-1" />
          واتساب
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label={'إضافة ملاحظة للعميل ' + nameAr} onClick={onNote}
          className="border-[#DDE5EF] px-3 text-[#536173] hover:bg-[#F8FAFC]"
        >
          <Plus size={14} />
        </Button>
        <Button
          size="sm"
          aria-label={'فتح متابعة العميل ' + nameAr} onClick={onViewDetails}
          className="px-3 bg-[#173A63] hover:bg-[#142033] text-white"
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
  const [lateReportDialogOpen, setLateReportDialogOpen] = useState(false);
  const [selectedLateReportCustomerIds, setSelectedLateReportCustomerIds] = useState<string[]>([]);

  // Use optimized CRM hook
  const { data: crmCustomers = [], isLoading, error: crmError, refetch } = useCRMCustomersOptimized(companyId ?? null);

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
        status: c.contract_status || '',
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

  // Open the customer side panel when the CRM page is opened with ?customer=...
  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (!customerId || !companyId) return;

    const existsInList = customers.some(c => c.id === customerId);
    if (existsInList || customers.length > 0) {
      setSelectedCustomerForPanel(customerId);
      setSidePanelOpen(true);
    }
  }, [searchParams, companyId, customers]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editing = target?.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]');
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !editing) {
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

  const lateReportCustomers = useMemo(() => {
    return Array.from(new Map(customers.filter(customer => {
      const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);
      return crmCustomer && getPaymentStatusOptimized(crmCustomer) === 'late';
    }).map(customer => [customer.id, customer])).values());
  }, [customers, crmCustomers]);

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
  const handlePrintLateReport = useCallback(async (reportCustomerIds?: string[]) => {
    if (!companyId) return;

    const selectedCustomerIdFromUrl = searchParams.get('customer');
    const selectedIds = Array.isArray(reportCustomerIds) ? reportCustomerIds : undefined;
    const todayIso = format(new Date(), 'yyyy-MM-dd');

    const lateCustomers = Array.from(new Map(lateReportCustomers.filter(c => {
      if (selectedIds && selectedIds.length > 0 && !selectedIds.includes(c.id)) return false;
      if (!selectedIds && selectedCustomerIdFromUrl && c.id !== selectedCustomerIdFromUrl) return false;

      const crmCustomer = crmCustomers.find(cc => cc.customer_id === c.id);
      return crmCustomer && getPaymentStatusOptimized(crmCustomer) === 'late';
    }).map(customer => [customer.id, customer])).values());

    if ((selectedCustomerIdFromUrl || selectedIds) && lateCustomers.length === 0) {
      toast({
        title: 'لا توجد متأخرات',
        description: 'لا يوجد عميل محدد يظهر كعميل متأخر حسب الفواتير الحالية.',
      });
      return;
    }

    if (lateCustomers.length === 0) {
      toast({
        title: 'لا توجد بيانات',
        description: 'لا يوجد عملاء متأخرون لإصدار التقرير.',
      });
      return;
    }

    // Get customer IDs for fetching related data
    const customerIds = lateCustomers.map(c => c.id);

    // Fetch only genuinely overdue invoices for these customers
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, customer_id, invoice_date, due_date, payment_status, balance_due, total_amount, paid_amount')
      .in('customer_id', customerIds)
      .eq('company_id', companyId)
      .neq('payment_status', 'paid')
      .lt('due_date', todayIso);

    const collectibleOverdueInvoices = (overdueInvoices || []).filter(inv => {
      const balance = Number(inv.balance_due ?? ((inv.total_amount || 0) - (inv.paid_amount || 0)));
      return balance > 0;
    });

    // Fetch contracts for matching penalties that are linked by contract only
    const { data: customerContracts } = await supabase
      .from('contracts')
      .select('id, customer_id')
      .in('customer_id', customerIds)
      .eq('company_id', companyId);

    const contractIds = customerContracts?.map(c => c.id) || [];

    const [penaltiesByCustomerResult, penaltiesByContractResult] = await Promise.all([
      supabase
        .from('penalties')
        .select('id, customer_id, contract_id, amount, payment_status, status')
        .in('customer_id', customerIds)
        .eq('company_id', companyId)
        .neq('payment_status', 'paid')
        .neq('status', 'cancelled'),
      contractIds.length > 0
        ? supabase
            .from('penalties')
            .select('id, customer_id, contract_id, amount, payment_status, status')
            .in('contract_id', contractIds)
            .eq('company_id', companyId)
            .neq('payment_status', 'paid')
            .neq('status', 'cancelled')
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (penaltiesByCustomerResult.error || penaltiesByContractResult.error) {
      console.error('Error fetching customer penalties:', penaltiesByCustomerResult.error || penaltiesByContractResult.error);
      toast({
        title: 'تعذر جلب المخالفات',
        description: 'حدث خطأ أثناء قراءة مخالفات العملاء من النظام.',
        variant: 'destructive',
      });
      return;
    }

    const penaltyMap = new Map<string, any>();
    [...(penaltiesByCustomerResult.data || []), ...(penaltiesByContractResult.data || [])].forEach(penalty => {
      penaltyMap.set(penalty.id, penalty);
    });
    const penalties = Array.from(penaltyMap.values());

    // Group violations by customer
    const violationsByCustomer = new Map<string, { count: number; totalAmount: number }>();
    penalties.forEach(penalty => {
      const contract = customerContracts?.find(c => c.id === penalty.contract_id);
      const customerId = penalty.customer_id || contract?.customer_id;
      if (!customerId) return;

      const current = violationsByCustomer.get(customerId) || { count: 0, totalAmount: 0 };
      violationsByCustomer.set(customerId, {
        count: current.count + 1,
        totalAmount: current.totalAmount + Number(penalty.amount || 0),
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
      const customerInvoices = collectibleOverdueInvoices.filter(inv => inv.customer_id === customer.id);
      const invoiceRows = customerInvoices.map(inv => {
        const invoiceDateValue = inv.invoice_date || inv.due_date;
        const invoiceDate = invoiceDateValue ? new Date(invoiceDateValue) : null;
        const dueDate = inv.due_date ? format(new Date(inv.due_date), 'dd/MM/yyyy') : '-';
        const monthIndex = invoiceDate?.getMonth();
        const year = invoiceDate?.getFullYear();
        const balance = Number(inv.balance_due ?? ((inv.total_amount || 0) - (inv.paid_amount || 0)));
        return {
          label: monthIndex === undefined || year === undefined
            ? 'فاتورة بدون تاريخ'
            : `فاتورة شهر ${arabicMonths[monthIndex]} ${year}`,
          dueDate,
          amount: balance,
        };
      });
      const overdueAmount = customerInvoices.reduce((sum, inv) => {
        return sum + Number(inv.balance_due ?? ((inv.total_amount || 0) - (inv.paid_amount || 0)));
      }, 0);

      return {
        nameAr: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'غير معرف',
        phone: customer.phone || '-',
        invoiceRows,
        overdueAmount,
        violationsCount: violations.count,
        violationsAmount: violations.totalAmount,
        lastContactDays: lastContact === null ? 'لم يتم' : `${lastContact} يوم`,
      };
    });

    const totalDelinquentCustomers = reportData.length;
    const totalOverdueAmount = reportData.reduce((sum, c) => sum + c.overdueAmount, 0);
    const totalViolationsAmount = reportData.reduce((sum, c) => sum + c.violationsAmount, 0);
    const today = format(new Date(), 'dd/MM/yyyy');
    const reportTitle = selectedCustomerIdFromUrl ? 'تقرير العميل المتأخر' : 'تقرير العملاء المتأخرين';
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    const formatReportAmount = (value: number) =>
      value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const renderInvoiceRows = (rows: Array<{ label: string; dueDate: string; amount: number }>) => {
      if (rows.length === 0) return '<span class="muted">لا توجد</span>';

      return `
        <div class="invoice-list">
          ${rows.map((row, index) => `
            <div class="invoice-row">
              <span class="invoice-index">${index + 1}</span>
              <span class="invoice-label">${escapeHtml(row.label)}</span>
              <span class="invoice-date">${escapeHtml(row.dueDate)}</span>
              <span class="invoice-amount">${formatReportAmount(row.amount)} ر.ق</span>
            </div>
          `).join('')}
        </div>
      `;
    };

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
        <title>${reportTitle} - ${today}</title>
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
          table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
          th { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 10px 6px; text-align: right; font-weight: bold; border: 1px solid #1e3a8a; }
          td { padding: 8px 6px; border: 1px solid #e5e7eb; text-align: right; vertical-align: top; }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #fef2f2; }
          .amount { font-weight: bold; color: #dc2626; }
          .phone-cell { direction: ltr; text-align: left; font-family: monospace; }
          .invoices-cell { color: #374151; padding: 6px; }
          .invoice-list { display: grid; gap: 4px; }
          .invoice-row { display: grid; grid-template-columns: 22px minmax(150px, 1fr) 70px 92px; align-items: center; gap: 6px; border: 1px solid #e5e7eb; border-radius: 5px; background: #fff; padding: 5px 6px; page-break-inside: avoid; }
          .invoice-index { display: inline-flex; align-items: center; justify-content: center; height: 18px; min-width: 18px; border-radius: 999px; background: #eef2ff; color: #1e40af; font-weight: bold; }
          .invoice-label { font-weight: bold; color: #1f2937; white-space: normal; line-height: 1.5; }
          .invoice-date { direction: ltr; text-align: center; color: #64748b; font-family: monospace; }
          .invoice-amount { direction: ltr; text-align: left; color: #dc2626; font-weight: bold; white-space: nowrap; }
          .violations-cell { text-align: center; }
          .muted { color: #94a3b8; }
          .contact-needed { background: #fef3c7 !important; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="title">${reportTitle}</div>
            <div style="font-size: 14px; color: #64748b;">تاريخ التقرير: ${today}</div>
          </div>
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${totalDelinquentCustomers}</div>
              <div class="summary-label">عدد العملاء المتأخرين</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalOverdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="summary-label">إجمالي المتأخرات (ر.ق)</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalViolationsAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="summary-label">إجمالي المخالفات (ر.ق)</div>
            </div>
          </div>
          <table>
            <colgroup>
              <col style="width: 4%;">
              <col style="width: 13%;">
              <col style="width: 11%;">
              <col style="width: 42%;">
              <col style="width: 10%;">
              <col style="width: 12%;">
              <col style="width: 8%;">
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم العميل</th>
                <th>الهاتف</th>
                <th>الفواتير المستحقة</th>
                <th>مبلغ المتأخرات</th>
                <th>المخالفات المرورية</th>
                <th>آخر تواصل</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map((c, i) => `
                <tr class="${c.lastContactDays === 'لم يتم' ? 'contact-needed' : ''}">
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${escapeHtml(c.nameAr)}</td>
                  <td class="phone-cell">${escapeHtml(c.phone)}</td>
                  <td class="invoices-cell">${renderInvoiceRows(c.invoiceRows)}</td>
                  <td class="amount">${formatReportAmount(c.overdueAmount)} ر.ق</td>
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
  }, [crmCustomers, companyId, lateReportCustomers, searchParams, toast]);

  const handleOpenLateReportDialog = useCallback(() => {
    if (lateReportCustomers.length === 0) {
      toast({
        title: 'لا توجد بيانات',
        description: 'لا يوجد عملاء متأخرون لإصدار التقرير.',
      });
      return;
    }

    const customerIdFromUrl = searchParams.get('customer');
    const defaultSelection = customerIdFromUrl && lateReportCustomers.some(c => c.id === customerIdFromUrl)
      ? [customerIdFromUrl]
      : lateReportCustomers.map(c => c.id);

    setSelectedLateReportCustomerIds(defaultSelection);
    setLateReportDialogOpen(true);
  }, [lateReportCustomers, searchParams, toast]);

  const toggleLateReportCustomer = useCallback((customerId: string) => {
    setSelectedLateReportCustomerIds(current =>
      current.includes(customerId)
        ? current.filter(id => id !== customerId)
        : [...current, customerId]
    );
  }, []);

  const toggleAllLateReportCustomers = useCallback(() => {
    setSelectedLateReportCustomerIds(current =>
      current.length === lateReportCustomers.length ? [] : lateReportCustomers.map(c => c.id)
    );
  }, [lateReportCustomers]);

  // Export professional Excel report
  const handleExportExcel = useCallback(async () => {
    if (filteredData.length === 0) {
      toast({ title: 'لا توجد بيانات', description: 'لا توجد نتائج لتصديرها في التقرير.' });
      return;
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Fleetify';
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.subject = 'Customer CRM Report';
    workbook.title = 'تقرير علاقات العملاء';

    const worksheet = workbook.addWorksheet('تقرير العملاء', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 6 }],
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        horizontalCentered: true,
      },
    });

    worksheet.properties.defaultRowHeight = 22;
    worksheet.pageSetup.margins = {
      left: 0.25,
      right: 0.25,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    };

    const reportRows = filteredData.map(customer => {
      const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);
      const contract = getCustomerContract(customer.id);
      const lastContact = crmCustomer ? getLastContactDaysOptimized(crmCustomer) : null;
      const paymentStatus = crmCustomer ? getPaymentStatusOptimized(crmCustomer) : 'none';

      return {
        code: customer.customer_code || '-',
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || 'عميل غير معرف',
        phone: customer.phone || '-',
        contractNumber: contract?.contract_number || '-',
        paymentStatus,
        paymentStatusLabel: paymentStatus === 'paid' ? 'مسدد' : paymentStatus === 'late' ? 'متأخر' : paymentStatus === 'due' ? 'مستحق' : 'لا فواتير',
        totalInvoices: Number(crmCustomer?.total_invoices || 0),
        overdueInvoices: Number(crmCustomer?.overdue_invoices || 0),
        outstandingAmount: Number(crmCustomer?.outstanding_amount || 0),
        overdueAmount: Number(crmCustomer?.overdue_amount || 0),
        lastContactLabel: lastContact === null ? 'لم يتم' : `${lastContact} يوم`,
        lastContactDays: lastContact,
        createdAt: customer.created_at ? format(new Date(customer.created_at), 'dd/MM/yyyy') : '-',
      };
    });

    const statusCounts = reportRows.reduce((acc, row) => {
      acc[row.paymentStatus] = (acc[row.paymentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const totalOutstanding = reportRows.reduce((sum, row) => sum + row.outstandingAmount, 0);
    const totalOverdue = reportRows.reduce((sum, row) => sum + row.overdueAmount, 0);

    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = 'تقرير علاقات العملاء';
    worksheet.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173A63' } };
    worksheet.getRow(1).height = 34;

    worksheet.mergeCells('A2:K2');
    worksheet.getCell('A2').value = `تاريخ الإصدار: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | عدد العملاء في التقرير: ${reportRows.length.toLocaleString('en-US')}`;
    worksheet.getCell('A2').font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF536173' } };
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 24;

    const summary = [
      ['إجمالي العملاء', reportRows.length, 'متأخر بالدفع', statusCounts.late || 0],
      ['إجمالي المستحقات', totalOutstanding, 'إجمالي المتأخرات', totalOverdue],
      ['مسدد', statusCounts.paid || 0, 'يحتاج متابعة', (statusCounts.late || 0) + (statusCounts.due || 0)],
    ];

    summary.forEach((row, index) => {
      const excelRow = worksheet.getRow(index + 3);
      excelRow.values = row;
      excelRow.height = 24;
      [1, 3].forEach(col => {
        excelRow.getCell(col).font = { name: 'Arial', bold: true, color: { argb: 'FF173A63' } };
        excelRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF5FB' } };
      });
      [2, 4].forEach(col => {
        excelRow.getCell(col).font = { name: 'Arial', bold: true, color: { argb: index === 1 && col === 4 ? 'FFDC2626' : 'FF142033' } };
        if (index === 1) excelRow.getCell(col).numFmt = '#,##0.00 "ر.ق"';
      });
    });

    const headerRow = worksheet.getRow(6);
    headerRow.values = [
      '#',
      'كود العميل',
      'اسم العميل',
      'الهاتف',
      'رقم العقد',
      'حالة الدفع',
      'عدد الفواتير',
      'فواتير متأخرة',
      'إجمالي المستحق',
      'المبلغ المتأخر',
      'آخر تواصل',
      'تاريخ الإضافة',
    ];
    headerRow.height = 28;
    headerRow.eachCell(cell => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173A63' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDE5EF' } },
        left: { style: 'thin', color: { argb: 'FFDDE5EF' } },
        bottom: { style: 'thin', color: { argb: 'FFDDE5EF' } },
        right: { style: 'thin', color: { argb: 'FFDDE5EF' } },
      };
    });

    worksheet.columns = [
      { key: 'index', width: 7 },
      { key: 'code', width: 15 },
      { key: 'name', width: 28 },
      { key: 'phone', width: 17 },
      { key: 'contractNumber', width: 18 },
      { key: 'paymentStatusLabel', width: 14 },
      { key: 'totalInvoices', width: 14 },
      { key: 'overdueInvoices', width: 14 },
      { key: 'outstandingAmount', width: 18 },
      { key: 'overdueAmount', width: 18 },
      { key: 'lastContactLabel', width: 16 },
      { key: 'createdAt', width: 16 },
    ];

    reportRows.forEach((row, index) => {
      const excelRow = worksheet.addRow({
        index: index + 1,
        code: row.code,
        name: row.name,
        phone: row.phone,
        contractNumber: row.contractNumber,
        paymentStatusLabel: row.paymentStatusLabel,
        totalInvoices: row.totalInvoices,
        overdueInvoices: row.overdueInvoices,
        outstandingAmount: row.outstandingAmount,
        overdueAmount: row.overdueAmount,
        lastContactLabel: row.lastContactLabel,
        createdAt: row.createdAt,
      });

      excelRow.height = 24;
      excelRow.eachCell(cell => {
        cell.font = { name: 'Arial', size: 11, color: { argb: 'FF142033' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE7EDF4' } },
          left: { style: 'thin', color: { argb: 'FFE7EDF4' } },
          bottom: { style: 'thin', color: { argb: 'FFE7EDF4' } },
          right: { style: 'thin', color: { argb: 'FFE7EDF4' } },
        };
        if (index % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        }
      });

      const statusCell = excelRow.getCell('paymentStatusLabel');
      const statusColor =
        row.paymentStatus === 'late' ? 'FFFFE4E6' :
        row.paymentStatus === 'due' ? 'FFFFF7ED' :
        row.paymentStatus === 'paid' ? 'FFECFDF5' :
        'FFF8FAFC';
      const statusTextColor =
        row.paymentStatus === 'late' ? 'FFBE123C' :
        row.paymentStatus === 'due' ? 'FFC2410C' :
        row.paymentStatus === 'paid' ? 'FF047857' :
        'FF64748B';
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
      statusCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: statusTextColor } };

      excelRow.getCell('outstandingAmount').numFmt = '#,##0.00 "ر.ق"';
      excelRow.getCell('overdueAmount').numFmt = '#,##0.00 "ر.ق"';
      excelRow.getCell('phone').alignment = { horizontal: 'center', vertical: 'middle' };
    });

    worksheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6, column: 12 },
    };

    const finalRow = worksheet.addRow([]);
    finalRow.height = 8;
    const totalsRow = worksheet.addRow({
      name: 'الإجمالي',
      totalInvoices: reportRows.reduce((sum, row) => sum + row.totalInvoices, 0),
      overdueInvoices: reportRows.reduce((sum, row) => sum + row.overdueInvoices, 0),
      outstandingAmount: totalOutstanding,
      overdueAmount: totalOverdue,
    });
    totalsRow.height = 26;
    totalsRow.eachCell(cell => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173A63' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF173A63' } },
        left: { style: 'thin', color: { argb: 'FF173A63' } },
        bottom: { style: 'thin', color: { argb: 'FF173A63' } },
        right: { style: 'thin', color: { argb: 'FF173A63' } },
      };
    });
    totalsRow.getCell('outstandingAmount').numFmt = '#,##0.00 "ر.ق"';
    totalsRow.getCell('overdueAmount').numFmt = '#,##0.00 "ر.ق"';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `crm-customers-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);

    toast({ title: '✅ تم إنشاء تقرير Excel', description: 'تم تصدير تقرير العملاء بتنسيق احترافي.' });
  }, [filteredData, crmCustomers, getCustomerContract, toast]);

  // --- Render ---
  return (
    <CRMErrorBoundary>
      <OperationsWorkspace section="crm" actions={<>
        <Button className="opw-primary" onClick={() => { setActiveFilter('needs_contact'); setCurrentPage(1); }} disabled={isLoading || !!crmError}><PhoneCall size={17}/>ابدأ قائمة التواصل</Button>
        <Button className="opw-secondary" variant="outline" onClick={handleExportExcel} disabled={isLoading || !!crmError}><Download size={16}/>تصدير Excel</Button>
        <Button className="opw-secondary" variant="outline" onClick={handleOpenLateReportDialog} disabled={isLoading || !!crmError}><Printer size={16}/>تقرير المتأخرين</Button>
        <Button className="opw-secondary" variant="outline" onClick={() => { void refetch(); }} disabled={isLoading} aria-label="تحديث علاقات العملاء"><RefreshCw size={16}/></Button>
      </>}>
        <div className="opw-metrics">
          <OperationsMetric label="عملاء قائمة المتابعة" value={isLoading || crmError ? '—' : stats.total} hint="بحسب بيانات قائمة CRM المحمّلة" icon={Users} onClick={() => {setActiveFilter('all');setCurrentPage(1);}}/>
          <OperationsMetric label="آخر تواصل هاتفي اليوم" value={isLoading || crmError ? '—' : stats.callsToday} hint="عملاء آخر نشاط لهم مكالمة اليوم" icon={PhoneCall}/>
          <OperationsMetric label="متأخرون بالدفع" value={isLoading || crmError ? '—' : stats.late} hint="بحسب حالة الدفع في سجل المتابعة" icon={AlertCircle} tone="danger" onClick={() => {setActiveFilter('late');setCurrentPage(1);}}/>
          <OperationsMetric label="بحاجة إلى تواصل" value={isLoading || crmError ? '—' : stats.needsContact} hint="بلا تواصل مسجل أو مضى أكثر من 7 أيام" icon={Phone} tone="warning" onClick={() => {setActiveFilter('needs_contact');setCurrentPage(1);}}/>
        </div>
        <div className="opw-toolbar"><div><h2>قائمة المتابعة</h2><p>اختر العميل لفتح سجل التواصل، أو أضف ملاحظة من صفه.</p></div><div className="opw-view-toggle" role="group" aria-label="طريقة عرض المتابعة">
          <button aria-pressed={viewMode === 'list'} onClick={() => setViewMode('list')}><FileText size={15}/>جدول</button><button aria-pressed={viewMode === 'grid'} onClick={() => setViewMode('grid')}><Users size={15}/>بطاقات</button>
        </div></div>
        <div className="opw-searchbar"><div className="opw-search"><Search size={18}/><Input ref={searchInputRef} aria-label="البحث في علاقات العملاء" placeholder="اسم العميل، رقم الهاتف، أو رمز العميل…" value={searchTerm} onChange={e => {setSearchTerm(e.target.value);setCurrentPage(1);}}/>{searchTerm && <button aria-label="مسح البحث" onClick={() => {setSearchTerm('');setCurrentPage(1);}}><X size={15}/></button>}</div><span className="opw-page-note">{isLoading ? 'جارٍ التحميل…' : crmError ? 'البيانات غير متاحة' : filteredData.length + ' عميل ضمن النتائج'}</span></div>
        {isLoading || crmError ? <div className="opw-panel opw-empty" role={crmError ? 'alert' : 'status'}><RefreshCw className={isLoading ? 'animate-spin' : ''}/><h3>{crmError ? 'تعذّر تحميل قائمة المتابعة' : 'جارٍ تحميل بيانات العملاء…'}</h3><p>{crmError ? 'أعد المحاولة للتحقق من البيانات؛ تعذّر القراءة لا يعني عدم وجود مستحقات.' : 'تظهر الإجراءات بعد اكتمال القراءة.'}</p>{crmError && <Button variant="outline" onClick={() => {void refetch();}}>إعادة المحاولة</Button>}</div> : <div className="opw-crm-layout">
          <div className="opw-crm-register">
            {/* Filter Tabs */}
            <div>
              <div className="opw-crm-filters" role="group" aria-label="تصنيف قائمة المتابعة">
                {[
                  { id: 'all', label: 'جميع العملاء', count: stats.total },
                  { id: 'late', label: 'متأخر بالدفع', count: stats.late },
                  { id: 'needs_contact', label: 'يحتاج تواصل' , count: stats.needsContact },
                  { id: 'new', label: 'عملاء جدد', count: stats.newCustomers },
                  { id: 'expiring', label: 'عقود قريبة الانتهاء', count: stats.expiring },
                ].map(filter => (
                  <button
                    key={filter.id}
                    aria-pressed={activeFilter === filter.id}
                    onClick={() => { setActiveFilter(filter.id); setCurrentPage(1); }}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all whitespace-nowrap",
                      activeFilter === filter.id
                        ? "bg-[#173A63] text-white shadow-sm"
                        : "bg-white text-[#536173] hover:bg-[#EEF5FB] hover:text-[#173A63]"
                    )}
                  >
                    {filter.label}
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs",
                      activeFilter === filter.id ? "bg-white/20 text-white" : "bg-[#E7EDF4] text-[#536173]"
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
                  <thead className="border-b border-[#DDE5EF] bg-[#F8FAFC]">
                    <tr>
                      <th className="py-3.5 px-4 text-right text-xs font-black text-[#142033] uppercase tracking-wider">
                        العميل
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-black text-[#142033] uppercase tracking-wider">
                        الهاتف
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-black text-[#142033] uppercase tracking-wider">
                        العقد
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-black text-[#142033] uppercase tracking-wider">
                        حالة الدفع
                      </th>
                      <th className="py-3.5 px-4 text-right text-xs font-black text-[#142033] uppercase tracking-wider">
                        آخر تواصل
                      </th>
                      <th className="py-3.5 px-4 text-center text-xs font-black text-[#142033] uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-[#E7EDF4] bg-white">
                    {paginatedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-20">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#F8FAFC]">
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
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#F8FAFC]">
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
              <div className="opw-pagination">
                <span className="text-sm text-slate-500">
                  عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} من أصل {filteredData.length} عميل
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    aria-label="الصفحة السابقة" onClick={() => setCurrentPage(p => p - 1)}
                    className="rounded-lg"
                  >
                    <ArrowRight size={16} />
                  </Button>
                  {pageNumbers(currentPage, totalPages).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={cn("w-9 h-9 rounded-lg", currentPage === page && "bg-[#173A63] hover:bg-[#142033]")}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    aria-label="الصفحة التالية" onClick={() => setCurrentPage(p => p + 1)}
                    className="rounded-lg"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <aside className="opw-crm-followups"><ScheduledFollowupsPanel showEmpty/><OperationsPanel title="خطوة متابعة واضحة" description="احفظ نتيجة التواصل لتظهر للفريق."><ol className="opw-followup-guide"><li>افتح سجل العميل وراجع آخر تواصل.</li><li>سجّل نتيجة المكالمة أو الملاحظة.</li><li>حدد المتابعة القادمة عند الحاجة.</li></ol></OperationsPanel></aside>
        </div>}

        <Dialog open={lateReportDialogOpen} onOpenChange={setLateReportDialogOpen}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-[#142033]">اختيار العملاء لتقرير المتأخرين</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#142033]">
                    المحدد: {selectedLateReportCustomerIds.length.toLocaleString('en-US')} من {lateReportCustomers.length.toLocaleString('en-US')}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#6A7688]">يمكن اختيار عميل واحد أو عدة عملاء قبل طباعة التقرير.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleAllLateReportCustomers}
                  className="rounded-lg border-[#DDE5EF] font-bold"
                >
                  {selectedLateReportCustomerIds.length === lateReportCustomers.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </Button>
              </div>

              <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-lg border border-[#DDE5EF] bg-white p-2">
                {lateReportCustomers.map(customer => {
                  const crmCustomer = crmCustomers.find(cc => cc.customer_id === customer.id);
                  const name = `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
                    || `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim()
                    || customer.customer_code
                    || 'عميل غير معرف';
                  const overdueAmount = Number(crmCustomer?.overdue_amount || 0);
                  const isSelected = selectedLateReportCustomerIds.includes(customer.id);

                  return (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => toggleLateReportCustomer(customer.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-3 text-right transition',
                        isSelected ? 'border-[#173A63] bg-[#EEF5FB]' : 'border-[#E7EDF4] bg-white hover:bg-[#F8FAFC]'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() => toggleLateReportCustomer(customer.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#142033]">{name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-[#6A7688]">
                          <span dir="ltr">{customer.phone || '-'}</span>
                          <span>•</span>
                          <span>{crmCustomer?.overdue_invoices || 0} فاتورة متأخرة</span>
                          <span>•</span>
                          <span className="text-rose-600">{overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.ق</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 border-t border-[#E7EDF4] pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLateReportDialogOpen(false)}
                  className="rounded-lg"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  disabled={selectedLateReportCustomerIds.length === 0}
                  onClick={() => {
                    setLateReportDialogOpen(false);
                    void handlePrintLateReport(selectedLateReportCustomerIds);
                  }}
                  className="rounded-lg bg-[#173A63] hover:bg-[#142033]"
                >
                  طباعة التقرير
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!dialogOpen} onOpenChange={open => {if(!open)setDialogOpen(null);}}>
          <DialogContent className="opw-note-dialog max-w-lg" dir="rtl"><DialogHeader><DialogTitle>{dialogOpen === 'call' ? 'تسجيل مكالمة' : 'إضافة ملاحظة متابعة'}</DialogTitle><DialogDescription>سجّل التفاصيل التي يحتاجها الفريق في المتابعة القادمة.</DialogDescription></DialogHeader>
            <div className="space-y-5 py-4">{dialogOpen === 'call' && <div><label>نتيجة المكالمة</label><div className="opw-view-toggle">{[{id:'answered',label:'تم الرد'},{id:'busy',label:'مشغول'},{id:'no_answer',label:'لم يرد'}].map(option => <button key={option.id} aria-pressed={dialogData.outcome === option.id} onClick={() => setDialogData({...dialogData,outcome:option.id})}>{option.label}</button>)}</div></div>}
              <div><label htmlFor="crm-interaction-content">التفاصيل</label><Textarea id="crm-interaction-content" value={dialogData.content} onChange={e => setDialogData({...dialogData,content:e.target.value})} className="min-h-[150px]" placeholder="اكتب ملخص التواصل أو الخطوة القادمة…"/></div>
            </div><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setDialogOpen(null)}>إلغاء</Button><Button onClick={handleSaveInteraction}><Save size={16}/>حفظ الملاحظة</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Call Dialog */}
        {callingCustomer && (
          <CallDialog
            open={callDialogOpen}
            onOpenChange={setCallDialogOpen}
            customerName={
              (callingCustomer.first_name || callingCustomer.last_name)
                ? `${callingCustomer.first_name || ''} ${callingCustomer.last_name || ''}`.trim()
                : (callingCustomer.first_name_ar || callingCustomer.last_name_ar)
                  ? `${callingCustomer.first_name_ar || ''} ${callingCustomer.last_name_ar || ''}`.trim()
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
            const primaryName = `${c.first_name || ''} ${c.last_name || ''}`.trim();
            const arName = `${c.first_name_ar || ''} ${c.last_name_ar || ''}`.trim();
            return primaryName || arName || c.customer_code;
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

      </OperationsWorkspace>
    </CRMErrorBoundary>
  );
}
