/**
 * صفحة إدارة علاقات العملاء - CRM Modern
 * متابعة العملاء والاتصالات مع التصميم الجديد المحسّن
 * 
 * @component CustomerCRMNew
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
  AlertCircle,
  Clock,
  UserCheck,
  PhoneMissed,
  PhoneIncoming,
  Calendar,
  CheckCircle,
  MoreHorizontal,
  X,
  Save,
  ArrowLeft,
  ArrowRight,
  Filter,
  Hash,
  Users,
  FileText,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CallDialog } from '@/components/customers/CallDialog';
import { ScheduledFollowupsPanel } from '@/components/crm/ScheduledFollowupsPanel';

// --- الثوابت ---
const ITEMS_PER_PAGE = 15;
// اللون الأساسي للنظام (الأحمر المرجاني)
const BRAND_COLOR = "text-[#F15555]";
const BRAND_BG = "bg-[#F15555]";
const BRAND_BORDER = "border-[#F15555]";
const BRAND_RING = "focus:ring-[#F15555]";

// --- الأنواع ---
type InteractionType = 'phone' | 'message' | 'meeting' | 'general';

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

interface FollowUp {
  id: string;
  customer_id: string;
  note_type: InteractionType;
  content: string;
  created_at: string;
  created_by: string;
  is_important: boolean;
  title?: string;
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

interface Invoice {
  id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  due_date: string;
}

// --- المكونات الفرعية ---

const StatusBadge = ({ status, type }: { status: string; type: 'payment' | 'contact' }) => {
  if (type === 'payment') {
    const styles: Record<string, string> = {
      paid: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100',
      due: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100',
      late: 'bg-red-50 text-red-700 border-red-200 ring-red-100',
      none: 'bg-gray-50 text-gray-700 border-gray-200 ring-gray-100',
    };
    const labels: Record<string, string> = { paid: 'مسدد ✅', due: 'مستحق 💰', late: 'متأخر ⚠️', none: 'لا فواتير 📝' };
    const style = styles[status] || styles.none;

    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ring-1 ring-inset ${style} shadow-sm`}>
        {labels[status] || status}
      </span>
    );
  }
  return null;
};

const InteractionIcon = ({ type }: { type: InteractionType }) => {
  const styles: Record<InteractionType, string> = {
    phone: 'bg-blue-50 text-blue-600',
    message: 'bg-emerald-50 text-emerald-600',
    meeting: 'bg-purple-50 text-purple-600',
    general: 'bg-gray-100 text-gray-600',
  };

  const Icons: Record<InteractionType, React.ElementType> = {
    phone: Phone,
    message: MessageCircle,
    meeting: UserCheck,
    general: MoreHorizontal,
  };

  const Icon = Icons[type];

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${styles[type]} shadow-sm`}>
      <Icon size={14} />
    </div>
  );
};

function StatCard({ title, value, icon, color, isUrgent }: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'yellow';
  isUrgent?: boolean;
}) {
  const colorStyles = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    red: { bg: 'bg-[#FEF2F2]', text: 'text-[#F15555]', border: 'border-red-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' },
  };

  const style = colorStyles[color];

  return (
    <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col items-start gap-4 transition-all hover:shadow-md ${isUrgent ? 'ring-1 ring-red-100' : ''}`}>
      <div className="flex justify-between w-full">
        <div className={`p-2.5 rounded-lg ${style.bg} ${style.text}`}>
          {icon}
        </div>
        {isUrgent && <span className="flex h-2 w-2 rounded-full bg-[#F15555]"></span>}
      </div>
      <div>
        <span className="text-2xl font-black text-gray-800 tracking-tight">{value}</span>
        <span className="text-xs text-gray-500 font-medium block mt-1">{title}</span>
      </div>
    </div>
  );
}

function CustomerRow({
  customer,
  contract,
  lastContact,
  paymentStatus,
  isExpanded,
  onToggle,
  onCall,
  onNote,
  onWhatsApp,
  interactions,
  onQuickUpdate,
}: {
  customer: Customer;
  contract?: Contract;
  lastContact: number | null;
  paymentStatus: string;
  isExpanded: boolean;
  onToggle: () => void;
  onCall: () => void;
  onNote: () => void;
  onWhatsApp: () => void;
  interactions: FollowUp[];
  onQuickUpdate: (id: string, action: 'complete' | 'postpone') => void;
}) {
  // Get customer names - prioritize Arabic, then English, then code
  const getNameAr = () => {
    // أولاً: الاسم العربي
    if (customer.first_name_ar || customer.last_name_ar) {
      return `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
    }
    // ثانياً: الاسم الإنجليزي
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    // ثالثاً: كود العميل
    return customer.customer_code || 'عميل غير معرف';
  };

  const getNameEn = () => {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    return '';
  };

  const nameAr = getNameAr();
  const nameEn = getNameEn();

  const getInitials = () => {
    if (customer.first_name) {
      return customer.first_name.substring(0, 2).toUpperCase();
    }
    if (customer.first_name_ar) {
      return customer.first_name_ar.substring(0, 2);
    }
    return 'ع';
  };

  const isNew = lastContact === null;
  const daysSinceContact = lastContact ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`group transition-all duration-200 ${isExpanded ? 'bg-red-50/20' : 'bg-white hover:bg-gray-50'}`}
    >
      <div className="px-6 py-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer" onClick={onToggle}>

        {/* Section 1: Avatar & Info */}
        <div className="flex items-center gap-4 w-full md:w-5/12">
          <div className="relative">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 
              ${isNew ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {getInitials()}
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="font-bold text-gray-900 text-base">{nameAr}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              {isNew ? (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] rounded-full font-medium border border-orange-200">
                  لم يتم الاتصال
                </span>
              ) : (
                <>
                  {nameEn && <span className="font-medium">{nameEn}</span>}
                  {nameEn && <span className="w-1 h-1 bg-gray-300 rounded-full"></span>}
                </>
              )}
              <span className="font-mono bg-gray-100 px-1 rounded text-gray-600 border flex items-center gap-1">
                <Hash size={10} /> {contract?.contract_number || customer.customer_code}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Metrics & Status */}
        <div className="flex flex-wrap items-center justify-start md:justify-center gap-4 w-full md:w-4/12">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-[10px] text-gray-400 font-medium">حالة الدفع</span>
            <StatusBadge status={paymentStatus} type="payment" />
          </div>

          <div className="w-px h-8 bg-gray-200 hidden md:block"></div>

          <div className="flex flex-col items-center gap-1 min-w-[100px]">
            <span className="text-[10px] text-gray-400 font-medium">آخر تواصل</span>
            <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${isNew ? `bg-red-50 ${BRAND_COLOR} border-red-100` : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              <Clock size={12} />
              {isNew ? 'لم يتم الاتصال' : `منذ ${daysSinceContact} يوم`}
            </div>
          </div>
        </div>

        {/* Section 3: Quick Actions */}
        <div className="flex items-center justify-end gap-2 w-full md:w-3/12 opacity-80 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onCall(); }} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition shadow-sm" title="اتصال">
            <Phone size={18} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onWhatsApp(); }} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition shadow-sm" title="واتساب">
            <MessageCircle size={18} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onNote(); }} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-800 transition shadow-sm" title="ملاحظة">
            <Plus size={18} />
          </button>
          <div className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${isExpanded ? `bg-red-50 ${BRAND_COLOR} rotate-180` : 'text-gray-400 hover:bg-gray-100'}`}>
            <ChevronDown size={20} />
          </div>
        </div>
      </div>

      {/* Expanded Content Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-red-100 bg-red-50/10"
          >
            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">

              {/* Timeline Column */}
              <div className="md:col-span-8">
                <h4 className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">
                  <Clock size={14} /> سجل النشاطات والمتابعات
                </h4>

                <div className="space-y-0 relative pl-4 md:pl-0">
                  {/* Vertical Line */}
                  <div className="absolute top-2 bottom-6 right-[19px] w-0.5 bg-gray-200 hidden md:block"></div>

                  {interactions.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-white/50">
                      <p className="text-sm text-gray-400">لا يوجد سجل متابعات لهذا العميل حتى الآن.</p>
                      <button onClick={(e) => { e.stopPropagation(); onCall(); }} className={`mt-2 ${BRAND_COLOR} text-xs font-bold hover:underline`}>ابدأ أول اتصال</button>
                    </div>
                  ) : (
                    interactions.map((interaction) => (
                      <div key={interaction.id} className="group relative flex gap-6 pb-8 last:pb-0">
                        {/* Icon */}
                        <div className="hidden md:block relative z-10 bg-white p-1 rounded-full">
                          <InteractionIcon type={interaction.note_type} />
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 bg-white p-4 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md group-hover:border-red-100 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">
                                {interaction.note_type === 'phone' ? '📞 مكالمة صادرة' : interaction.note_type === 'general' ? '📝 ملاحظة داخلية' : '💬 رسالة واتساب'}
                              </span>
                              {interaction.is_important && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-100">
                                  يحتاج متابعة
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono dir-ltr">
                              {format(new Date(interaction.created_at), 'dd/MM/yyyy - HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{interaction.content}</p>

                          {interaction.is_important && (
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-green-600 hover:bg-green-100"
                                onClick={(e) => { e.stopPropagation(); onQuickUpdate(interaction.id, 'complete'); }}
                              >
                                <CheckCircle className="w-3.5 h-3.5 ml-1" />
                                تم
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-blue-600 hover:bg-blue-100"
                                onClick={(e) => { e.stopPropagation(); onQuickUpdate(interaction.id, 'postpone'); }}
                              >
                                <Clock className="w-3.5 h-3.5 ml-1" />
                                تأجيل
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions Sidebar */}
              <div className="md:col-span-4 flex flex-col gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-full">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">بيانات العقد</h4>
                  {contract ? (
                    <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="bg-white p-2 rounded text-purple-600 shadow-sm">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] text-purple-600 font-bold uppercase">تاريخ انتهاء العقد</p>
                        <p className="text-sm font-bold text-gray-800 font-mono">
                          {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-500">
                      لا يوجد عقد نشط
                    </div>
                  )}

                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 mt-6">تحديث سريع</h4>
                  <div className="space-y-2">
                    <button className="w-full py-2.5 px-3 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 flex items-center justify-center gap-2 transition group">
                      <CheckCircle size={16} className="text-gray-400 group-hover:text-emerald-600" />
                      تمت المتابعة بنجاح
                    </button>
                    <button className="w-full py-2.5 px-3 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200 flex items-center justify-center gap-2 transition group">
                      <Clock size={16} className="text-gray-400 group-hover:text-yellow-600" />
                      تأجيل الموعد ليومين
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- المكون الرئيسي ---
export default function CustomerCRMNew() {
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState<'note' | 'call' | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState({ content: '', outcome: 'answered' });
  const [currentPage, setCurrentPage] = useState(1);

  // Call Dialog State
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
  const [autoCallHandled, setAutoCallHandled] = useState(false);

  // Fetch customers
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone, email,
          company_id, is_active, created_at
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!companyId,
  });

  // Fetch contracts
  const { data: contracts = [] } = useQuery({
    queryKey: ['crm-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id, status, start_date, end_date, monthly_amount')
        .eq('company_id', companyId)
        .eq('status', 'active');
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!companyId,
  });

  // Fetch follow-ups (interactions)
  const { data: interactions = [] } = useQuery({
    queryKey: ['customer-follow-ups', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FollowUp[];
    },
    enabled: !!companyId,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['crm-invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('invoices')
        .select('id, customer_id, total_amount, paid_amount, payment_status, due_date')
        .eq('company_id', companyId);
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!companyId,
  });

  // Handle auto-call from URL parameter (e.g., /customers/crm?call=CUSTOMER_ID)
  useEffect(() => {
    const callCustomerId = searchParams.get('call');
    if (callCustomerId && !autoCallHandled && companyId) {
      setAutoCallHandled(true);
      
      // First try to find in loaded customers
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
        // If not found in list, fetch directly from database
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
              toast({
                title: '📞 بدء الاتصال',
                description: `جاري الاتصال بـ ${data.first_name_ar || data.first_name || ''} ${data.last_name_ar || data.last_name || ''}`,
              });
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

  // Helper functions
  const getCustomerInteractions = useCallback((customerId: string) => {
    return interactions.filter(i => i.customer_id === customerId);
  }, [interactions]);

  const getLastContactDays = useCallback((customerId: string) => {
    const customerInteractions = getCustomerInteractions(customerId);
    if (customerInteractions.length === 0) return null;
    const lastContact = new Date(customerInteractions[0].created_at);
    return differenceInDays(new Date(), lastContact);
  }, [getCustomerInteractions]);

  const getPaymentStatus = useCallback((customerId: string): string => {
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId);

    if (customerInvoices.length === 0) return 'none';

    const totalAmount = customerInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalRemaining = totalAmount - totalPaid;

    const overdueInvoices = customerInvoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < new Date();
    });

    if (totalRemaining === 0) return 'paid';
    if (overdueInvoices.length > 0) return 'late';
    return 'due';
  }, [invoices]);

  const getCustomerContract = useCallback((customerId: string) => {
    return contracts.find(c => c.customer_id === customerId && c.status === 'active');
  }, [contracts]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const late = customers.filter(c => getPaymentStatus(c.id) === 'late').length;

    const needsContact = customers.filter(c => {
      const lastContact = getLastContactDays(c.id);
      if (lastContact === null) return true;
      return lastContact > 7;
    }).length;

    const expiring = customers.filter(c => {
      const contract = getCustomerContract(c.id);
      if (!contract) return false;
      const diff = differenceInDays(new Date(contract.end_date), today);
      return diff < 30 && diff > 0;
    }).length;

    const callsToday = interactions.filter(i => {
      if (!i.created_at) return false;
      const iDate = new Date(i.created_at);
      return i.note_type === 'phone' && iDate >= todayStart;
    }).length;

    // الاتصالات هذا الشهر
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const callsThisMonth = interactions.filter(i => {
      if (!i.created_at) return false;
      const iDate = new Date(i.created_at);
      return i.note_type === 'phone' && iDate >= monthStart;
    }).length;

    const newCustomers = customers.filter(c => {
      const customerInteractions = interactions.filter(i => i.customer_id === c.id);
      return customerInteractions.length === 0;
    }).length;

    const activeContracts = contracts.length;

    return { total: customers.length, late, needsContact, expiring, callsToday, callsThisMonth, newCustomers, activeContracts };
  }, [customers, interactions, contracts, getLastContactDays, getPaymentStatus, getCustomerContract]);

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
        result = result.filter(c => getPaymentStatus(c.id) === 'late');
        break;
      case 'needs_contact':
        result = result.filter(c => {
          const lastContact = getLastContactDays(c.id);
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
          const customerInteractions = interactions.filter(i => i.customer_id === c.id);
          return customerInteractions.length === 0;
        });
        break;
    }
    return result;
  }, [customers, searchTerm, activeFilter, interactions, getLastContactDays, getPaymentStatus, getCustomerContract]);

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

  const handleQuickUpdate = async (followUpId: string, action: 'complete' | 'postpone') => {
    try {
      const followUp = interactions.find(f => f.id === followUpId);
      if (!followUp) return;

      const updateContent = action === 'complete'
        ? `${followUp.content}\n\n✅ تم التحديث في ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
        : `${followUp.content}\n\n⏰ تم التأجيل في ${format(new Date(), 'dd/MM/yyyy HH:mm')}`;

      const { error } = await supabase
        .from('customer_notes')
        .update({
          is_important: action !== 'complete',
          content: updateContent
        })
        .eq('id', followUpId);

      if (error) throw error;

      toast({
        title: action === 'complete' ? '✅ تم التحديث' : '⏰ تم التأجيل',
        description: action === 'complete' ? 'تم وضع علامة مكتمل' : 'سيتم تذكيرك لاحقاً',
      });

      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
    } catch (error) {
      console.error('Error updating follow-up:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء التحديث', variant: 'destructive' });
    }
  };

  // طباعة تقرير العملاء المتأخرين
  const handlePrintLateReport = useCallback(() => {
    // جمع بيانات العملاء المتأخرين
    const lateCustomers = customers.filter(c => getPaymentStatus(c.id) === 'late');
    
    // حساب إجمالي المستحقات لكل عميل
    const reportData = lateCustomers.map(customer => {
      const customerInvoices = invoices.filter(inv => inv.customer_id === customer.id);
      const contract = getCustomerContract(customer.id);
      const lastContact = getLastContactDays(customer.id);
      
      const totalAmount = customerInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
      const totalRemaining = totalAmount - totalPaid;
      
      const overdueInvoices = customerInvoices.filter(inv => {
        if (inv.payment_status === 'paid') return false;
        if (!inv.due_date) return false;
        return new Date(inv.due_date) < new Date();
      });
      
      return {
        customerCode: customer.customer_code || '-',
        nameAr: `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim() || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'غير معرف',
        phone: customer.phone || '-',
        contractNumber: contract?.contract_number || '-',
        overdueCount: overdueInvoices.length,
        totalRemaining,
        lastContactDays: lastContact === null ? 'لم يتم' : `${lastContact} يوم`,
      };
    }).sort((a, b) => b.totalRemaining - a.totalRemaining);

    // إنشاء نافذة الطباعة
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'خطأ', description: 'تعذر فتح نافذة الطباعة', variant: 'destructive' });
      return;
    }

    const totalOutstanding = reportData.reduce((sum, c) => sum + c.totalRemaining, 0);
    const today = format(new Date(), 'dd/MM/yyyy');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير العملاء المتأخرين - ${today}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, Tahoma, sans-serif;
            background: #fff;
            color: #1f2937;
          }
          .container {
            max-width: 100%;
            border: 3px double #1f2937;
            border-radius: 8px;
            padding: 24px;
          }
          /* Header with Logo */
          .header {
            display: flex;
            flex-direction: column;
            align-items: center;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            margin-bottom: 16px;
          }
          .header-right {
            text-align: right;
          }
          .header-left {
            text-align: left;
          }
          .company-name-ar {
            font-size: 22px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 4px;
          }
          .company-name-en {
            font-size: 13px;
            color: #64748b;
          }
          .company-info {
            font-size: 10px;
            color: #64748b;
            margin-top: 4px;
          }
          .logo {
            width: 120px;
            height: auto;
          }
          .header-center {
            text-align: center;
          }
          .title-box {
            display: inline-block;
            padding: 12px 40px;
            border: 2px solid #1e3a8a;
            border-radius: 8px;
            background-color: #eff6ff;
          }
          .title-ar {
            font-size: 20px;
            font-weight: bold;
            color: #1e3a8a;
          }
          .title-en {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
          }
          .report-date {
            font-size: 12px;
            color: #64748b;
            margin-top: 10px;
          }
          /* Summary */
          .summary {
            display: flex;
            justify-content: center;
            gap: 40px;
            margin: 20px 0;
            padding: 16px;
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            border-radius: 8px;
            border: 1px solid #fecaca;
          }
          .summary-item {
            text-align: center;
          }
          .summary-value {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
          }
          .summary-label {
            font-size: 12px;
            color: #991b1b;
            margin-top: 4px;
          }
          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            font-size: 11px;
          }
          th {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            color: white;
            padding: 10px 6px;
            font-weight: bold;
            text-align: right;
            border: 1px solid #1e3a8a;
          }
          td {
            padding: 8px 6px;
            border: 1px solid #e5e7eb;
            text-align: right;
          }
          tr:nth-child(even) {
            background: #f9fafb;
          }
          tr:hover {
            background: #fef2f2;
          }
          .amount {
            font-weight: bold;
            color: #dc2626;
            font-size: 12px;
          }
          .contact-needed {
            background: #fef3c7 !important;
          }
          .checkbox-col {
            width: 25px;
            text-align: center;
          }
          .checkbox {
            width: 14px;
            height: 14px;
            border: 2px solid #6b7280;
            border-radius: 2px;
            display: inline-block;
          }
          .phone-cell {
            direction: ltr;
            text-align: left;
            font-family: monospace;
          }
          /* Notes Section */
          .notes-section {
            margin-top: 16px;
            padding: 12px;
            border: 1px dashed #9ca3af;
            border-radius: 6px;
            min-height: 50px;
          }
          .notes-title {
            font-size: 12px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 4px;
          }
          /* Footer */
          .footer {
            margin-top: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
          }
          .footer-item {
            text-align: center;
          }
          .footer-label {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 20px;
          }
          .footer-line {
            width: 100px;
            border-top: 1px solid #9ca3af;
            margin: 0 auto;
          }
          .footer-text {
            font-size: 9px;
            color: #9ca3af;
            margin-top: 3px;
          }
          .stamp-area {
            width: 60px;
            height: 60px;
            border: 1px dashed #9ca3af;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            color: #9ca3af;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
            .container { border: none; }
            .notes-section { page-break-inside: avoid; }
            .footer { page-break-inside: avoid; page-break-before: avoid; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header with Logo -->
          <div class="header">
            <!-- Top: Logo + Company Info -->
            <div class="header-top">
              <div class="header-right">
                <div class="company-name-ar">شركة العراف لتأجير السيارات</div>
                <div class="company-name-en">AL-ARAF CAR RENTAL</div>
                <div class="company-info">C.R: 12345 | Doha, Qatar</div>
              </div>
              <div class="header-left">
                <img src="/receipts/logo.png" alt="Logo" class="logo" onerror="this.style.display='none'" />
              </div>
            </div>
            <!-- Center: Title -->
            <div class="header-center">
              <div class="title-box">
                <div class="title-ar">تقرير المتابعات المالية</div>
                <div class="title-en">OVERDUE PAYMENTS REPORT</div>
              </div>
              <div class="report-date">تاريخ التقرير: ${today}</div>
            </div>
          </div>

          <!-- Summary -->
          <div class="summary">
            <div class="summary-item">
              <div class="summary-value">${reportData.length.toLocaleString('en-US')}</div>
              <div class="summary-label">عدد العملاء المتأخرين</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div class="summary-label">إجمالي المستحقات (QAR)</div>
            </div>
          </div>

          <!-- Table -->
          <table>
            <thead>
              <tr>
                <th class="checkbox-col">✓</th>
                <th>#</th>
                <th>كود العميل</th>
                <th>اسم العميل</th>
                <th>الهاتف</th>
                <th>رقم العقد</th>
                <th>فواتير</th>
                <th>المستحق (ر.ق)</th>
                <th>آخر تواصل</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map((c, i) => `
                <tr class="${c.lastContactDays === 'لم يتم' ? 'contact-needed' : ''}">
                  <td class="checkbox-col"><div class="checkbox"></div></td>
                  <td style="text-align: center;">${(i + 1).toLocaleString('en-US')}</td>
                  <td>${c.customerCode}</td>
                  <td>${c.nameAr}</td>
                  <td class="phone-cell">${c.phone}</td>
                  <td>${c.contractNumber}</td>
                  <td style="text-align: center;">${c.overdueCount.toLocaleString('en-US')}</td>
                  <td class="amount">${c.totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>${c.lastContactDays === 'لم يتم' ? 'لم يتم' : c.lastContactDays.replace(/\d+/, (match: string) => parseInt(match).toLocaleString('en-US'))}</td>
                  <td style="min-width: 80px;"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Notes & Footer Section (keep together) -->
          <div style="page-break-inside: avoid;">
            <!-- Notes Section -->
            <div class="notes-section">
              <div class="notes-title">📝 ملاحظات عامة:</div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-item">
                <div class="footer-label">المدير المسؤول</div>
                <div class="footer-line"></div>
                <div class="footer-text">الاسم والتوقيع</div>
              </div>
              <div class="footer-item">
                <div class="stamp-area">الختم</div>
              </div>
              <div class="footer-item">
                <div class="footer-label">موظف التحصيل</div>
                <div class="footer-line"></div>
                <div class="footer-text">الاسم والتوقيع</div>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  }, [customers, invoices, getPaymentStatus, getCustomerContract, getLastContactDays, toast]);

  // --- Render ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] p-6">
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <RefreshCw className="animate-spin" size={24} />
          <p>جاري تحميل سجلات العملاء...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-gray-800 font-sans" dir="rtl">

      {/* Top Navigation Bar */}
      <div className="bg-white border-b sticky top-0 z-30 px-6 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`${BRAND_BG} p-2 rounded-lg text-white shadow-md shadow-red-200`}>
            <Filter size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">متابعة العملاء والاتصالات</h1>
            <p className="text-xs text-gray-500">نظام إدارة علاقات العملاء الذكي</p>
          </div>
        </div>

        <div className="flex w-full md:w-auto gap-3 items-center">
          <div className="relative flex-1 md:w-80 group">
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="بحث باسم العميل، الهاتف، أو الرمز..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className={`w-full pl-12 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 ${BRAND_RING} ${BRAND_BORDER} outline-none transition-all text-sm`}
            />
            <Search className="absolute right-3 top-2.5 text-gray-400 group-focus-within:text-[#F15555] transition-colors" size={18} />
            <kbd className="absolute left-3 top-2.5 text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-white hidden md:block font-sans">/</kbd>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition hover:shadow-sm"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handlePrintLateReport}
            className="p-2.5 bg-[#F15555] text-white rounded-lg hover:bg-[#d64545] transition hover:shadow-md flex items-center gap-2"
            title="طباعة تقرير المتأخرين"
          >
            <Printer size={18} />
            <span className="hidden md:inline text-sm font-medium">طباعة التقرير</span>
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto space-y-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard title="الاتصالات هذا الشهر" value={stats.callsThisMonth} icon={<Phone size={20} />} color="green" />
          <StatCard title="مكالمات اليوم" value={stats.callsToday} icon={<PhoneIncoming size={20} />} color="blue" />
          <StatCard title="متأخر بالدفع" value={stats.late} icon={<AlertCircle size={20} />} color="red" isUrgent />
          <StatCard title="يحتاج اتصال" value={stats.needsContact} icon={<PhoneMissed size={20} />} color="orange" />
          <StatCard title="عقود نشطة" value={stats.activeContracts} icon={<CheckCircle size={20} />} color="blue" />
          <StatCard title="عقد قريب الانتهاء" value={stats.expiring} icon={<Clock size={20} />} color="yellow" />
        </div>

        {/* Scheduled Follow-ups Panel */}
        <ScheduledFollowupsPanel />

        {/* Filters & Content Wrapper */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Smart Filters Header */}
          <div className="border-b bg-gray-50/50 px-6 py-3 flex overflow-x-auto gap-2 scrollbar-hide">
            {[
              { id: 'all', label: 'جميع العملاء', count: stats.total },
              { id: 'late', label: '🔥 عاجل - متأخر', count: stats.late },
              { id: 'needs_contact', label: '📞 لم يتم الاتصال (7 أيام)', count: stats.needsContact },
              { id: 'new', label: '🆕 عملاء جدد', count: stats.newCustomers },
              { id: 'expiring', label: '⏰ عقود قريبة الانتهاء', count: stats.expiring },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => { setActiveFilter(filter.id); setCurrentPage(1); }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                  ${activeFilter === filter.id
                    ? `${BRAND_BG} text-white shadow-md shadow-red-200`
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'}
                `}
              >
                {filter.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {filter.count}
                </span>
              </button>
            ))}
          </div>

          {/* Customer List */}
          <div className="divide-y divide-gray-100 min-h-[400px]">
            {paginatedCustomers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-gray-400" size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">لا توجد نتائج</h3>
                <p className="text-gray-500">لا يوجد عملاء يطابقون معايير البحث أو الفلتر الحالي.</p>
              </div>
            ) : (
              paginatedCustomers.map(customer => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  contract={getCustomerContract(customer.id)}
                  lastContact={getLastContactDays(customer.id)}
                  paymentStatus={getPaymentStatus(customer.id)}
                  isExpanded={expandedId === customer.id}
                  onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                  onCall={() => handleCall(customer)}
                  onNote={() => openDialog('note', customer.id)}
                  onWhatsApp={() => handleWhatsApp(customer.phone)}
                  interactions={getCustomerInteractions(customer.id)}
                  onQuickUpdate={handleQuickUpdate}
                />
              ))
            )}
          </div>

          {/* Pagination Footer */}
          {filteredData.length > 0 && (
            <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} من أصل {filteredData.length} عميل
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowRight size={16} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => (
                  <button
                    key={idx + 1}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-8 h-8 rounded text-sm font-medium transition ${currentPage === idx + 1
                      ? `${BRAND_BG} text-white`
                      : 'bg-white border text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="p-2 bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Note Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border"
            >
              <div className="flex justify-between items-center p-5 border-b bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${dialogOpen === 'call' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {dialogOpen === 'call' ? <Phone size={20} /> : <MoreHorizontal size={20} />}
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    {dialogOpen === 'call' ? 'تسجيل مكالمة جديدة' : 'إضافة ملاحظة متابعة'}
                  </h3>
                </div>
                <button onClick={() => setDialogOpen(null)} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-500">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {dialogOpen === 'call' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">حالة المكالمة</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'answered', label: 'تم الرد ✅', color: 'emerald' },
                        { id: 'busy', label: 'مشغول ⏳', color: 'orange' },
                        { id: 'no_answer', label: 'لم يرد 📵', color: 'red' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setDialogData({ ...dialogData, outcome: opt.id })}
                          className={`py-3 text-sm rounded-xl border transition-all ${dialogData.outcome === opt.id
                            ? `bg-${opt.color}-50 border-${opt.color}-500 text-${opt.color}-700 font-bold ring-1 ring-${opt.color}-500`
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">التفاصيل / الملاحظات</label>
                  <Textarea
                    value={dialogData.content}
                    onChange={(e) => setDialogData({ ...dialogData, content: e.target.value })}
                    className={`w-full p-4 border border-gray-300 rounded-xl focus:ring-2 ${BRAND_RING} outline-none min-h-[120px] text-sm resize-none bg-gray-50 focus:bg-white transition-colors`}
                    placeholder="اكتب ملخص المكالمة أو الملاحظة هنا..."
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveInteraction}
                    className={`w-full py-3.5 ${BRAND_BG} hover:bg-opacity-90 active:scale-[0.98] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-100`}
                  >
                    <Save size={18} />
                    حفظ السجل
                  </button>
                </div>
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

    </div>
  );
}

