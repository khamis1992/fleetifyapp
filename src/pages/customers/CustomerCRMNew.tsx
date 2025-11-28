/**
 * صفحة إدارة علاقات العملاء - CRM Modern
 * متابعة العملاء والاتصالات مع الحفاظ على التصميم الحديث
 * 
 * @component CustomerCRMNew
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/components/ui/use-toast';
import { differenceInDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  PhoneCall,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  Bell,
  TrendingUp,
  CheckCircle,
  Search,
  X,
  UserPlus,
  Filter,
  Eye,
  PlusCircle,
  MoreHorizontal,
  Smartphone,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Banknote,
  PhoneOff,
  PhoneMissed,
  CheckSquare,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CallDialog } from '@/components/customers/CallDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
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
  note_type: 'phone' | 'message' | 'meeting' | 'general';
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

// Smart Filter Options
const SMART_FILTERS = [
  { id: 'all', label: 'جميع العملاء', icon: Users, color: 'text-gray-600' },
  { id: 'urgent', label: '🔥 عاجل - متأخر بالدفع', icon: AlertTriangle, color: 'text-red-600' },
  { id: 'needs_call', label: '📞 لم يتم الاتصال (7 أيام)', icon: PhoneOff, color: 'text-orange-600' },
  { id: 'never_contacted', label: '🆕 لم يتصل به أبداً', icon: PhoneMissed, color: 'text-purple-600' },
  { id: 'expiring', label: '⏰ عقد قريب الانتهاء', icon: Clock, color: 'text-amber-600' },
];

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor,
  subtitle,
  onClick,
  isActive 
}: { 
  title: string; 
  value: number | string; 
  icon: any; 
  color: string; 
  bgColor: string;
  subtitle?: string;
  onClick?: () => void;
  isActive?: boolean;
}) => (
  <motion.div 
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={cn(
      "bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer",
      isActive ? "border-blue-500 shadow-lg" : "border-gray-100 hover:border-gray-200 hover:shadow-md"
    )}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className={cn("text-xs mt-1 flex items-center gap-1", color)}>
            {subtitle}
          </p>
        )}
      </div>
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", bgColor)}>
        <Icon className={cn("w-6 h-6", color)} />
      </div>
    </div>
  </motion.div>
);

// Customer Row Component
const CustomerRow = ({ 
  customer, 
  contract,
  lastContact,
  followUpCount,
  paymentStatus,
  isExpanded,
  onToggle,
  onCall,
  onWhatsApp,
  onAddNote,
  customerFollowUps,
  onQuickUpdate,
}: {
  customer: Customer;
  contract?: Contract;
  lastContact: number | null;
  followUpCount: number;
  paymentStatus: any;
  isExpanded: boolean;
  onToggle: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
  onAddNote: () => void;
  customerFollowUps: FollowUp[];
  onQuickUpdate: (id: string, action: 'complete' | 'postpone') => void;
}) => {
  // Get customer name with fallback: Arabic name -> English name -> customer code
  const getCustomerName = () => {
    // Try Arabic name first
    if (customer.first_name_ar || customer.last_name_ar) {
      return `${customer.first_name_ar || ''} ${customer.last_name_ar || ''}`.trim();
    }
    // Fallback to English name
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    }
    // Fallback to customer code
    return customer.customer_code || 'عميل';
  };
  
  const customerName = getCustomerName();

  const getInitials = () => {
    // Try Arabic first
    const firstAr = customer.first_name_ar?.[0] || '';
    const lastAr = customer.last_name_ar?.[0] || '';
    if (firstAr || lastAr) return `${firstAr}${lastAr}`;
    
    // Fallback to English
    const firstEn = customer.first_name?.[0] || '';
    const lastEn = customer.last_name?.[0] || '';
    if (firstEn || lastEn) return `${firstEn}${lastEn}`.toUpperCase();
    
    return 'ع';
  };

  const daysToExpiry = contract ? differenceInDays(new Date(contract.end_date), new Date()) : null;
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0;
  const needsUrgentCall = lastContact !== null && lastContact > 7;
  const neverContacted = lastContact === null;

  const getContactStatus = () => {
    if (neverContacted) return { text: 'لم يتم الاتصال', color: 'text-purple-600 bg-purple-50', icon: PhoneMissed };
    if (needsUrgentCall) return { text: `منذ ${lastContact} يوم`, color: 'text-red-600 bg-red-50', icon: AlertTriangle };
    if (lastContact && lastContact > 3) return { text: `منذ ${lastContact} أيام`, color: 'text-orange-600 bg-orange-50', icon: Clock };
    return { text: lastContact === 0 ? 'اليوم' : `منذ ${lastContact} يوم`, color: 'text-green-600 bg-green-50', icon: CheckCircle };
  };

  const contactStatus = getContactStatus();
  const ContactIcon = contactStatus.icon;
  const pendingFollowUps = customerFollowUps.filter(f => f.is_important);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white rounded-2xl border-2 overflow-hidden transition-all",
        isExpanded ? "border-blue-200 shadow-lg" : "border-gray-100 hover:border-gray-200"
      )}
    >
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Avatar className="w-12 h-12 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Customer Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900">{customerName}</h3>
              {neverContacted && (
                <Badge className="bg-purple-100 text-purple-700 text-xs">جديد</Badge>
              )}
              {needsUrgentCall && (
                <Badge className="bg-red-100 text-red-700 text-xs">يحتاج اتصال</Badge>
              )}
              {isExpiringSoon && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">عقد قريب الانتهاء</Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                <span dir="ltr">{customer.phone}</span>
              </span>
              {contract && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  {contract.contract_number}
                </span>
              )}
            </div>
          </div>

          {/* Contact Status */}
          <div className={cn("px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0", contactStatus.color)}>
            <ContactIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{contactStatus.text}</span>
          </div>

          {/* Payment Status */}
          <div className={cn("px-3 py-1.5 rounded-lg shrink-0", paymentStatus.bgColor)}>
            <span className={cn("text-sm font-medium flex items-center gap-1", paymentStatus.textColor)}>
              {paymentStatus.icon} {paymentStatus.label}
            </span>
          </div>

          {/* Follow-up Count */}
          <div className="text-center shrink-0 w-16">
            <p className="text-xl font-bold text-gray-900">{followUpCount}</p>
            <p className="text-xs text-gray-500">متابعة</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 h-9 w-9 p-0"
                    onClick={(e) => { e.stopPropagation(); onCall(); }}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>اتصال الآن</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 h-9 w-9 p-0"
                    onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>واتساب</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-9 w-9 p-0"
                    onClick={(e) => { e.stopPropagation(); onAddNote(); }}
                  >
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>إضافة ملاحظة</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button 
              size="sm" 
              variant="ghost"
              className="h-9 w-9 p-0"
              onClick={onToggle}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Pending Follow-ups Alert */}
        {pendingFollowUps.length > 0 && !isExpanded && (
          <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">
                {pendingFollowUps.length} متابعة تحتاج تحديث
              </span>
              <div className="flex gap-1 mr-auto">
                {pendingFollowUps.slice(0, 1).map(f => (
                  <div key={f.id} className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-green-600 hover:bg-green-100"
                      onClick={(e) => { e.stopPropagation(); onQuickUpdate(f.id, 'complete'); }}
                    >
                      <CheckCircle className="w-3.5 h-3.5 ml-1" />
                      تم
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-blue-600 hover:bg-blue-100"
                      onClick={(e) => { e.stopPropagation(); onQuickUpdate(f.id, 'postpone'); }}
                    >
                      <Clock className="w-3.5 h-3.5 ml-1" />
                      تأجيل
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expanded Content - Call History */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100"
          >
            <div className="p-4 bg-gray-50">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                سجل الاتصالات والمتابعات
              </h4>

              {customerFollowUps.length > 0 ? (
                <div className="space-y-3">
                  {customerFollowUps.map((followUp) => (
                    <div 
                      key={followUp.id} 
                      className={cn(
                        "bg-white rounded-xl p-3 border flex items-start gap-3",
                        followUp.is_important ? "border-orange-200" : "border-gray-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                        followUp.note_type === 'phone' ? "bg-green-100 text-green-600" :
                        followUp.note_type === 'message' ? "bg-blue-100 text-blue-600" :
                        followUp.note_type === 'meeting' ? "bg-purple-100 text-purple-600" :
                        "bg-gray-100 text-gray-600"
                      )}>
                        {followUp.note_type === 'phone' ? <Phone className="w-4 h-4" /> :
                         followUp.note_type === 'message' ? <MessageSquare className="w-4 h-4" /> :
                         followUp.note_type === 'meeting' ? <Users className="w-4 h-4" /> :
                         <FileText className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {followUp.note_type === 'phone' ? 'مكالمة هاتفية' :
                             followUp.note_type === 'message' ? 'رسالة' :
                             followUp.note_type === 'meeting' ? 'اجتماع' : 'ملاحظة'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(followUp.created_at), 'dd/MM/yyyy - HH:mm')}
                          </span>
                          {followUp.is_important && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">يحتاج متابعة</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{followUp.content}</p>
                      </div>
                      {followUp.is_important && (
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                            onClick={() => onQuickUpdate(followUp.id, 'complete')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100"
                            onClick={() => onQuickUpdate(followUp.id, 'postpone')}
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <PhoneOff className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>لا توجد اتصالات مسجلة بعد</p>
                  <Button 
                    size="sm" 
                    className="mt-3 bg-green-600 hover:bg-green-700"
                    onClick={onCall}
                  >
                    <Phone className="w-4 h-4 ml-2" />
                    ابدأ أول اتصال
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Main Component
export default function CustomerCRMNew() {
  const companyId = useCurrentCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [smartFilter, setSmartFilter] = useState('all');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callingCustomer, setCallingCustomer] = useState<Customer | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Form state
  const [followUpForm, setFollowUpForm] = useState({
    type: 'phone' as 'phone' | 'message' | 'meeting' | 'general',
    notes: '',
  });

  // Fetch customers
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['crm-customers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select(`
          id, customer_code, first_name, last_name, first_name_ar, last_name_ar, phone, email,
          company_id, is_active, created_at,
          contracts!inner (id, status)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .eq('contracts.status', 'active')
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
        .eq('company_id', companyId);
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!companyId,
  });

  // Fetch follow-ups
  const { data: followUps = [] } = useQuery({
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

  // Helper functions
  const getCustomerFollowUps = useCallback((customerId: string) => {
    return followUps.filter(f => f.customer_id === customerId);
  }, [followUps]);

  const getLastContactDays = useCallback((customerId: string) => {
    const customerFollowUps = getCustomerFollowUps(customerId);
    if (customerFollowUps.length === 0) return null;
    const lastContact = new Date(customerFollowUps[0].created_at);
    return differenceInDays(new Date(), lastContact);
  }, [getCustomerFollowUps]);

  const getPaymentStatus = useCallback((customerId: string) => {
    const customerInvoices = invoices.filter(inv => inv.customer_id === customerId);
    
    if (customerInvoices.length === 0) {
      return { label: 'لا توجد فواتير', bgColor: 'bg-gray-100', textColor: 'text-gray-700', icon: '📝' };
    }

    const totalAmount = customerInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const totalPaid = customerInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalRemaining = totalAmount - totalPaid;

    const overdueInvoices = customerInvoices.filter(inv => {
      if (inv.payment_status === 'paid') return false;
      if (!inv.due_date) return false;
      return new Date(inv.due_date) < new Date();
    });

    if (totalRemaining === 0) {
      return { label: 'مسدد', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: '✅' };
    }

    if (overdueInvoices.length > 0) {
      return { 
        label: `متأخر (${overdueInvoices.length})`, 
        bgColor: 'bg-red-100', 
        textColor: 'text-red-700', 
        icon: '⚠️',
      };
    }

    return { label: 'مستحق', bgColor: 'bg-orange-100', textColor: 'text-orange-700', icon: '💰' };
  }, [invoices]);

  const getCustomerContract = useCallback((customerId: string) => {
    return contracts.find(c => c.customer_id === customerId && c.status === 'active');
  }, [contracts]);

  // Stats calculations
  const stats = useMemo(() => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayCalls = followUps.filter(f => 
      f.note_type === 'phone' && 
      new Date(f.created_at) >= todayStart
    ).length;

    const pendingFollowUps = followUps.filter(f => f.is_important).length;

    const neverContacted = customers.filter(c => {
      const customerFollowUps = followUps.filter(f => f.customer_id === c.id);
      return customerFollowUps.length === 0;
    }).length;

    const needsCall = customers.filter(c => {
      const lastContact = getLastContactDays(c.id);
      return lastContact !== null && lastContact > 7;
    }).length;

    const overduePayments = customers.filter(c => {
      const status = getPaymentStatus(c.id);
      return status.label.includes('متأخر');
    }).length;

    const expiringContracts = customers.filter(c => {
      const contract = getCustomerContract(c.id);
      if (!contract) return false;
      const daysToExpiry = differenceInDays(new Date(contract.end_date), new Date());
      return daysToExpiry > 0 && daysToExpiry <= 30;
    }).length;

    return {
      total: customers.length,
      todayCalls,
      pendingFollowUps,
      neverContacted,
      needsCall,
      overduePayments,
      expiringContracts,
    };
  }, [customers, followUps, getLastContactDays, getPaymentStatus, getCustomerContract]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(c =>
        `${c.first_name_ar} ${c.last_name_ar}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.customer_code?.includes(searchTerm)
      );
    }

    // Smart filter
    if (smartFilter !== 'all') {
      if (smartFilter === 'urgent') {
        filtered = filtered.filter(c => {
          const status = getPaymentStatus(c.id);
          return status.label.includes('متأخر');
        });
      } else if (smartFilter === 'needs_call') {
        filtered = filtered.filter(c => {
          const lastContact = getLastContactDays(c.id);
          return lastContact !== null && lastContact > 7;
        });
      } else if (smartFilter === 'never_contacted') {
        filtered = filtered.filter(c => {
          const customerFollowUps = followUps.filter(f => f.customer_id === c.id);
          return customerFollowUps.length === 0;
        });
      } else if (smartFilter === 'expiring') {
        filtered = filtered.filter(c => {
          const contract = getCustomerContract(c.id);
          if (!contract) return false;
          const daysToExpiry = differenceInDays(new Date(contract.end_date), new Date());
          return daysToExpiry > 0 && daysToExpiry <= 30;
        });
      }
    }

    return filtered;
  }, [customers, searchTerm, smartFilter, followUps, getLastContactDays, getPaymentStatus, getCustomerContract]);

  // Pagination
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleCall = useCallback((customer: Customer) => {
    setCallingCustomer(customer);
    setCallDialogOpen(true);
  }, []);

  const handleWhatsApp = useCallback((customer: Customer) => {
    if (!customer.phone) {
      toast({ title: 'خطأ', description: 'لا يوجد رقم هاتف', variant: 'destructive' });
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  }, [toast]);

  const handleAddNote = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsAddNoteOpen(true);
  }, []);

  const handleQuickUpdate = async (followUpId: string, action: 'complete' | 'postpone') => {
    try {
      const followUp = followUps.find(f => f.id === followUpId);
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

  const handleSaveFollowUp = async () => {
    if (!selectedCustomer || !companyId) return;
    if (!followUpForm.notes.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال الملاحظات', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('customer_notes').insert({
        customer_id: selectedCustomer.id,
        company_id: companyId,
        note_type: followUpForm.type,
        title: `متابعة ${followUpForm.type === 'phone' ? 'مكالمة' : followUpForm.type === 'message' ? 'رسالة' : followUpForm.type === 'meeting' ? 'اجتماع' : 'ملاحظة'}`,
        content: followUpForm.notes,
        is_important: false,
      });

      if (error) throw error;

      toast({ title: '✅ تم الحفظ', description: 'تم حفظ المتابعة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups', companyId] });
      setIsAddNoteOpen(false);
      setFollowUpForm({ type: 'phone', notes: '' });
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء الحفظ', variant: 'destructive' });
    }
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-2xl" />)}
          </div>
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">متابعة العملاء والاتصالات</h1>
              <p className="text-sm text-gray-500">نظام إدارة علاقات العملاء (CRM)</p>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="hidden lg:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
              <kbd className="px-1.5 py-0.5 bg-white border rounded shadow-sm font-mono">/</kbd>
              <span className="text-gray-500">بحث</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="بحث عن عميل... (اضغط /)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 bg-gray-50 border-0 focus-visible:ring-1"
                />
              </div>
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            title="إجمالي العملاء"
            value={stats.total}
            icon={Users}
            color="text-blue-600"
            bgColor="bg-blue-100"
            onClick={() => setSmartFilter('all')}
            isActive={smartFilter === 'all'}
          />
          <StatCard
            title="مكالمات اليوم"
            value={stats.todayCalls}
            icon={PhoneCall}
            color="text-green-600"
            bgColor="bg-green-100"
            subtitle={`الهدف: 15 مكالمة`}
          />
          <StatCard
            title="متأخر بالدفع"
            value={stats.overduePayments}
            icon={AlertTriangle}
            color="text-red-600"
            bgColor="bg-red-100"
            onClick={() => setSmartFilter('urgent')}
            isActive={smartFilter === 'urgent'}
          />
          <StatCard
            title="يحتاج اتصال"
            value={stats.needsCall}
            icon={PhoneOff}
            color="text-orange-600"
            bgColor="bg-orange-100"
            subtitle="أكثر من 7 أيام"
            onClick={() => setSmartFilter('needs_call')}
            isActive={smartFilter === 'needs_call'}
          />
          <StatCard
            title="لم يتصل به"
            value={stats.neverContacted}
            icon={PhoneMissed}
            color="text-purple-600"
            bgColor="bg-purple-100"
            onClick={() => setSmartFilter('never_contacted')}
            isActive={smartFilter === 'never_contacted'}
          />
          <StatCard
            title="عقد قريب الانتهاء"
            value={stats.expiringContracts}
            icon={Clock}
            color="text-amber-600"
            bgColor="bg-amber-100"
            onClick={() => setSmartFilter('expiring')}
            isActive={smartFilter === 'expiring'}
          />
        </div>

        {/* Smart Filters */}
        <div className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Filter className="w-4 h-4" />
              فلتر:
            </span>
            {SMART_FILTERS.map(filter => {
              const Icon = filter.icon;
              const count = filter.id === 'urgent' ? stats.overduePayments :
                           filter.id === 'needs_call' ? stats.needsCall :
                           filter.id === 'never_contacted' ? stats.neverContacted :
                           filter.id === 'expiring' ? stats.expiringContracts :
                           stats.total;
              
              return (
                <Button
                  key={filter.id}
                  variant={smartFilter === filter.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSmartFilter(filter.id)}
                  className={cn(
                    "gap-2",
                    smartFilter === filter.id ? "bg-blue-600" : ""
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {filter.label}
                  <Badge variant="secondary" className={cn(
                    "text-xs",
                    smartFilter === filter.id ? "bg-blue-500 text-white" : "bg-gray-100"
                  )}>
                    {count}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Customer List */}
        <div className="space-y-3">
          {paginatedCustomers.length > 0 ? (
            paginatedCustomers.map((customer) => (
              <CustomerRow
                key={customer.id}
                customer={customer}
                contract={getCustomerContract(customer.id)}
                lastContact={getLastContactDays(customer.id)}
                followUpCount={getCustomerFollowUps(customer.id).length}
                paymentStatus={getPaymentStatus(customer.id)}
                isExpanded={expandedCustomer === customer.id}
                onToggle={() => setExpandedCustomer(expandedCustomer === customer.id ? null : customer.id)}
                onCall={() => handleCall(customer)}
                onWhatsApp={() => handleWhatsApp(customer)}
                onAddNote={() => handleAddNote(customer)}
                customerFollowUps={getCustomerFollowUps(customer.id)}
                onQuickUpdate={handleQuickUpdate}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد عملاء</h3>
              <p className="text-gray-500">جرب تغيير الفلتر أو البحث بكلمات مختلفة</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              السابق
            </Button>
            <span className="text-sm text-gray-600">
              صفحة {currentPage} من {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              التالي
            </Button>
          </div>
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={isAddNoteOpen} onOpenChange={setIsAddNoteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              إضافة متابعة جديدة
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer && `للعميل: ${
                (selectedCustomer.first_name_ar || selectedCustomer.last_name_ar)
                  ? `${selectedCustomer.first_name_ar || ''} ${selectedCustomer.last_name_ar || ''}`.trim()
                  : (selectedCustomer.first_name || selectedCustomer.last_name)
                    ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim()
                    : selectedCustomer.customer_code || 'عميل'
              }`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">نوع المتابعة</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'phone', icon: Phone, label: 'مكالمة' },
                  { value: 'message', icon: MessageSquare, label: 'رسالة' },
                  { value: 'meeting', icon: Users, label: 'اجتماع' },
                  { value: 'general', icon: FileText, label: 'ملاحظة' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setFollowUpForm(f => ({ ...f, type: value as any }))}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                      followUpForm.type === value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    )}
                  >
                    <Icon className="w-5 h-5 text-gray-600" />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">الملاحظات</label>
              <Textarea
                rows={4}
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="اكتب تفاصيل المتابعة..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddNoteOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveFollowUp} className="bg-blue-600 hover:bg-blue-700">
              حفظ المتابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Call Dialog */}
      {callingCustomer && (
        <CallDialog
          open={callDialogOpen}
          onOpenChange={setCallDialogOpen}
          customerName={
            // Arabic name first
            (callingCustomer.first_name_ar || callingCustomer.last_name_ar)
              ? `${callingCustomer.first_name_ar || ''} ${callingCustomer.last_name_ar || ''}`.trim()
              // English name fallback
              : (callingCustomer.first_name || callingCustomer.last_name)
                ? `${callingCustomer.first_name || ''} ${callingCustomer.last_name || ''}`.trim()
                // Customer code fallback
                : callingCustomer.customer_code || 'عميل'
          }
          customerPhone={callingCustomer.phone || ''}
          onSaveCall={handleSaveCall}
        />
      )}
    </div>
  );
}
