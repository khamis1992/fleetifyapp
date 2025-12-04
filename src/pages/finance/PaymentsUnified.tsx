import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePayments } from "@/hooks/useFinance";
import { usePaymentsSummary } from "@/hooks/usePaymentsSummary";
import { UnifiedPaymentForm } from "@/components/finance/UnifiedPaymentForm";
import { FinanceErrorBoundary } from "@/components/finance/FinanceErrorBoundary";
import { PaymentPreviewDialog } from "@/components/finance/PaymentPreviewDialog";
import { PaymentTracking } from "@/components/finance/PaymentTracking";
import { PaymentAssistantPanel } from "@/components/finance/PaymentAssistantPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  CreditCard, 
  Eye, 
  FileText, 
  List,
  GitBranch,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  ChevronLeft,
  ArrowLeftRight,
  XCircle,
  Calendar,
  ChevronRight,
  User,
  FileSignature,
  Download,
  MessageCircle,
  Loader2,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
import { HelpIcon } from '@/components/help/HelpIcon';
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { numberToArabicWords } from '@/utils/receiptGenerator';

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconBg,
  trend = 'neutral',
  onClick,
}) => {
  return (
    <motion.div 
      className={cn(
        "bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-lg transition-all h-full flex flex-col",
        onClick && "cursor-pointer"
      )}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className={cn('w-11 h-11 rounded-xl flex items-center justify-center', iconBg)}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        {change && (
          <motion.span 
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
              trend === 'up' ? 'bg-green-100 text-green-600' : 
              trend === 'down' ? 'bg-red-100 text-red-600' : 
              'bg-neutral-100 text-neutral-600'
            )}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : 
             trend === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
            {change}
          </motion.span>
        )}
      </div>
      <p className="text-xs text-neutral-500 font-medium mb-1">{title}</p>
      <motion.p 
        className="text-2xl font-bold text-neutral-900 leading-none"
        key={String(value)}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {value}
      </motion.p>
      {subtitle && (
        <p className="text-[11px] text-neutral-400 mt-1">{subtitle}</p>
      )}
    </motion.div>
  );
};

// ===== Quick Action Button Component =====
interface QuickActionProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  onClick: () => void;
  iconBg: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ icon: Icon, title, subtitle, onClick, iconBg }) => (
  <motion.button
    onClick={onClick}
    className="bg-white rounded-[1.25rem] p-5 shadow-sm hover:shadow-lg transition-all text-right w-full flex items-center gap-4 group"
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
  >
    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="flex-1">
      <p className="font-semibold text-neutral-900">{title}</p>
      <p className="text-xs text-neutral-500">{subtitle}</p>
    </div>
    <ChevronLeft className="w-5 h-5 text-neutral-300 group-hover:text-coral-500 transition-colors" />
  </motion.button>
);

/**
 * PaymentsUnified - صفحة المدفوعات الشاملة الموحدة - التصميم الجديد
 */
const PaymentsUnified = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // WhatsApp sending state
  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);
  
  // Delete payment state
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: payments, isLoading: paymentsLoading, error, refetch } = usePayments();
  const { data: summary, isLoading: summaryLoading } = usePaymentsSummary();
  const { formatCurrency } = useCurrencyFormatter();
  const { isMobile } = useSimpleBreakpoint();

  const isLoading = paymentsLoading || summaryLoading;

  // Helper function to get customer name from payment
  const getCustomerName = (payment: any): string => {
    if (payment.customer_name) return payment.customer_name;
    if (payment.customers) {
      if (payment.customers.company_name) return payment.customers.company_name;
      if (payment.customers.first_name || payment.customers.last_name) {
        return `${payment.customers.first_name || ''} ${payment.customers.last_name || ''}`.trim();
      }
    }
    return '-';
  };

  // Helper function to get contract number from payment
  const getContractNumber = (payment: any): string => {
    return payment.contract_number || payment.contracts?.contract_number || '-';
  };

  // Helper function to get invoice month from payment
  const getInvoiceMonth = (payment: any): string => {
    if (payment.invoices?.due_date) {
      return format(new Date(payment.invoices.due_date), 'MMMM yyyy', { locale: ar });
    }
    if (payment.invoices?.invoice_date) {
      return format(new Date(payment.invoices.invoice_date), 'MMMM yyyy', { locale: ar });
    }
    return '';
  };

  // Navigate to contract details payments tab
  const navigateToContractPayments = (payment: any) => {
    const contractNumber = payment.contracts?.contract_number || payment.contract_number;
    if (contractNumber) {
      navigate(`/contracts/${contractNumber}?tab=payments`);
    }
  };

  // Date range filter logic
  const getDateRange = (range: string): { start: Date; end: Date } | null => {
    const now = new Date();
    switch (range) {
      case 'today':
        return { start: new Date(now.setHours(0,0,0,0)), end: new Date() };
      case 'week':
        return { start: startOfWeek(now, { locale: ar }), end: endOfWeek(now, { locale: ar }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return null;
    }
  };

  // Filter payments with improved search
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter(payment => {
      // Enhanced search - includes customer name, contract number
      const customerName = getCustomerName(payment).toLowerCase();
      const contractNumber = getContractNumber(payment).toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      const matchesSearch = !searchTerm || 
        payment.payment_number?.toLowerCase().includes(searchLower) ||
        payment.reference_number?.toLowerCase().includes(searchLower) ||
        payment.notes?.toLowerCase().includes(searchLower) ||
        customerName.includes(searchLower) ||
        contractNumber.includes(searchLower);
      
      const matchesStatus = !filterStatus || filterStatus === "all" || payment.payment_status === filterStatus;
      const matchesMethod = !filterMethod || filterMethod === "all" || payment.payment_method === filterMethod;
      
      // Date range filter
      let matchesDate = true;
      if (filterDateRange && filterDateRange !== "all") {
        const dateRange = getDateRange(filterDateRange);
        if (dateRange && payment.payment_date) {
          const paymentDate = parseISO(payment.payment_date);
          matchesDate = isWithinInterval(paymentDate, dateRange);
        }
      }
      
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [payments, searchTerm, filterStatus, filterMethod, filterDateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPayments, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Analytics data for charts
  const paymentMethodData = useMemo(() => {
    if (!payments) return [];
    const methodCounts: Record<string, number> = {};
    payments.forEach(p => {
      const method = p.payment_method || 'other';
      methodCounts[method] = (methodCounts[method] || 0) + (p.amount || 0);
    });
    return Object.entries(methodCounts).map(([name, value]) => ({
      name: { cash: 'نقدي', check: 'شيك', bank_transfer: 'حوالة', credit_card: 'بطاقة' }[name] || name,
      value: Math.round(value)
    }));
  }, [payments]);

  const monthlyPaymentsData = useMemo(() => {
    if (!payments) return [];
    const monthlyData: Record<string, { receipts: number; payments: number }> = {};
    
    payments.forEach(p => {
      if (p.payment_date) {
        const monthKey = format(parseISO(p.payment_date), 'yyyy-MM');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { receipts: 0, payments: 0 };
        }
        if (p.transaction_type === 'receipt') {
          monthlyData[monthKey].receipts += p.amount || 0;
        } else {
          monthlyData[monthKey].payments += p.amount || 0;
        }
      }
    });
    
    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, data]) => ({
        month: format(parseISO(month + '-01'), 'MMM', { locale: ar }),
        قبض: Math.round(data.receipts),
        صرف: Math.round(data.payments)
      }));
  }, [payments]);

  const CHART_COLORS = ['#e85a4f', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  // Computed stats from payments data
  const computedStats = useMemo(() => {
    if (!payments || payments.length === 0) {
      return {
        total_payments: 0,
        payments_count: 0,
        pending_amount: 0,
        pending_count: 0,
        today_payments: 0,
        today_count: 0,
        completed_amount: 0,
        completed_count: 0
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let total_payments = 0;
    let pending_amount = 0;
    let pending_count = 0;
    let today_payments = 0;
    let today_count = 0;
    let completed_amount = 0;
    let completed_count = 0;

    payments.forEach(payment => {
      const amount = payment.amount || 0;
      total_payments += amount;

      // Pending payments
      if (payment.payment_status === 'pending') {
        pending_amount += amount;
        pending_count++;
      }

      // Completed payments
      if (payment.payment_status === 'completed' || payment.payment_status === 'cleared') {
        completed_amount += amount;
        completed_count++;
      }

      // Today's payments
      if (payment.payment_date) {
        const paymentDate = new Date(payment.payment_date);
        if (paymentDate >= today && paymentDate <= todayEnd) {
          today_payments += amount;
          today_count++;
        }
      }
    });

    return {
      total_payments,
      payments_count: payments.length,
      pending_amount,
      pending_count,
      today_payments,
      today_count,
      completed_amount,
      completed_count
    };
  }, [payments]);

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'cleared': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled':
      case 'bounced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'مكتملة',
      cleared: 'مقاصة',
      pending: 'معلقة',
      cancelled: 'ملغاة',
      bounced: 'مرتدة'
    };
    return labels[status] || status;
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'نقدي',
      check: 'شيك',
      bank_transfer: 'حوالة بنكية',
      credit_card: 'بطاقة ائتمان',
      debit_card: 'بطاقة خصم'
    };
    return labels[method] || method;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'receipt': return 'قبض';
      case 'payment': return 'صرف';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'receipt': return 'bg-green-100 text-green-700';
      case 'payment': return 'bg-coral-100 text-coral-700';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  // Delete payment
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentToDelete.id);

      if (error) throw error;

      toast.success('تم حذف الدفعة بنجاح', {
        description: `تم حذف السند رقم ${paymentToDelete.payment_number}`
      });
      
      // Refresh the payments list
      refetch();
      setPaymentToDelete(null);
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error('خطأ في حذف الدفعة', {
        description: error.message || 'حدث خطأ أثناء حذف الدفعة'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Send receipt via WhatsApp
  const sendReceiptViaWhatsApp = async (payment: any) => {
    // Get customer phone
    const customerPhone = payment.customer_phone || payment.customers?.phone;
    const customerName = getCustomerName(payment);
    const contractNumber = getContractNumber(payment);
    
    if (!customerPhone) {
      toast.error('لا يوجد رقم هاتف', {
        description: 'لا يمكن إرسال السند لعدم وجود رقم هاتف للعميل'
      });
      return;
    }

    setSendingWhatsApp(payment.id);

    try {
      const paymentMethodLabel = 
        payment.payment_method === 'cash' ? 'نقدي' : 
        payment.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 
        payment.payment_method === 'check' ? 'شيك' : 
        payment.payment_method === 'credit_card' ? 'بطاقة ائتمان' : 'أخرى';

      const paymentDate = payment.payment_date 
        ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })
        : format(new Date(), 'dd/MM/yyyy', { locale: ar });

      // رسالة واتساب
      const message = `سند قبض رقم: ${payment.payment_number}

عزيزي/عزيزتي ${customerName}،

تم استلام دفعتكم بنجاح ✅

تفاصيل الدفعة:
━━━━━━━━━━━━━━━
• رقم السند: ${payment.payment_number}
• رقم العقد: ${contractNumber}
• المبلغ المدفوع: ${formatCurrency(payment.amount)}
• المبلغ كتابة: ${numberToArabicWords(payment.amount)}
• تاريخ الدفع: ${paymentDate}
• طريقة الدفع: ${paymentMethodLabel}
━━━━━━━━━━━━━━━

شكرا لتعاملكم معنا 🙏

شركة العراف لتأجير السيارات
📞 للاستفسارات: +974 XXXXXXXX`;

      // Format phone number for Qatar
      let phone = customerPhone.replace(/\s+/g, '').replace(/-/g, '');
      if (phone.startsWith('0')) {
        phone = '974' + phone.substring(1);
      } else if (!phone.startsWith('+') && !phone.startsWith('974')) {
        phone = '974' + phone;
      }
      phone = phone.replace('+', '');

      // Open WhatsApp Web
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');

      toast.success('تم فتح واتساب ويب', {
        description: `جارٍ إرسال سند القبض للعميل ${customerName}`
      });
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast.error('خطأ', {
        description: 'حدث خطأ أثناء فتح واتساب'
      });
    } finally {
      setSendingWhatsApp(null);
    }
  };

  return (
    <FinanceErrorBoundary
      error={error ? new Error(error.message || 'خطأ في تحميل المدفوعات') : null}
      isLoading={isLoading}
      onRetry={refetch}
      title="خطأ في المدفوعات"
      context="صفحة المدفوعات الموحدة"
    >
      <div className="min-h-screen bg-[#f0efed]" dir="rtl">
        <div className="p-5 space-y-5">
          
          {/* Header */}
          <motion.div 
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <motion.button
                onClick={() => navigate('/finance/hub')}
                className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm hover:shadow-md transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-5 h-5 text-neutral-600" />
              </motion.button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-coral-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-coral-500/30">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-neutral-900">المدفوعات وسندات القبض</h1>
                    <HelpIcon topic="payments" />
                  </div>
                  <p className="text-xs text-neutral-500">إدارة شاملة للمدفوعات والمقبوضات</p>
                </div>
              </div>
            </div>
            
            {/* Action Button */}
            <motion.button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-coral-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors shadow-lg shadow-coral-500/30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="w-4 h-4" />
              <span>سند جديد</span>
            </motion.button>
          </motion.div>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <TabsList className="bg-white rounded-xl p-1.5 shadow-sm h-auto">
                <TabsTrigger 
                  value="dashboard" 
                  className="flex items-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-coral-500 data-[state=active]:text-white transition-all"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">لوحة التحكم</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="list" 
                  className="flex items-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-coral-500 data-[state=active]:text-white transition-all"
                >
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">قائمة المدفوعات</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="tracking" 
                  className="flex items-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-coral-500 data-[state=active]:text-white transition-all"
                >
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">التتبع والتسوية</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 py-2.5 px-4 rounded-lg data-[state=active]:bg-coral-500 data-[state=active]:text-white transition-all"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">التحليلات</span>
                </TabsTrigger>
              </TabsList>
            </motion.div>

            {/* Tab 1: Dashboard */}
            <TabsContent value="dashboard" className="space-y-5 mt-5">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="إجمالي المدفوعات"
                  value={formatCurrency(computedStats.total_payments)}
                  subtitle={`${computedStats.payments_count} دفعة`}
                  icon={Banknote}
                  iconBg="bg-coral-100 text-coral-600"
                />
                <StatCard
                  title="مدفوعات معلقة"
                  value={formatCurrency(computedStats.pending_amount)}
                  subtitle={`${computedStats.pending_count} معلقة`}
                  icon={Clock}
                  iconBg="bg-amber-100 text-amber-600"
                  trend={computedStats.pending_count > 0 ? 'down' : 'neutral'}
                />
                <StatCard
                  title="عقود متأخرة"
                  value={formatCurrency(summary?.overdue_amount || 0)}
                  subtitle={`${summary?.overdue_count || 0} عقد`}
                  icon={AlertCircle}
                  iconBg="bg-red-100 text-red-600"
                  trend={(summary?.overdue_count || 0) > 0 ? 'down' : 'neutral'}
                />
                <StatCard
                  title="مدفوعات اليوم"
                  value={formatCurrency(computedStats.today_payments)}
                  subtitle={`${computedStats.today_count} دفعة`}
                  icon={CheckCircle}
                  iconBg="bg-green-100 text-green-600"
                  change={computedStats.today_count > 0 ? `+${computedStats.today_count}` : undefined}
                  trend="up"
                />
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAction
                  icon={List}
                  title="عرض جميع المدفوعات"
                  subtitle="الجدول الكامل مع البحث والتصفية"
                  onClick={() => setActiveTab('list')}
                  iconBg="bg-blue-100 text-blue-600"
                />
                <QuickAction
                  icon={Plus}
                  title="تسجيل سند جديد"
                  subtitle="إضافة سند قبض أو صرف"
                  onClick={() => setIsCreateDialogOpen(true)}
                  iconBg="bg-green-100 text-green-600"
                />
                <QuickAction
                  icon={GitBranch}
                  title="التتبع والتسوية"
                  subtitle="تسوية المدفوعات البنكية"
                  onClick={() => setActiveTab('tracking')}
                  iconBg="bg-purple-100 text-purple-600"
                />
              </div>

              {/* Overdue Payments Alert */}
              {summary?.overdue_payments && summary.overdue_payments.length > 0 && (
                <motion.div 
                  className="bg-white rounded-[1.25rem] p-5 shadow-sm border-r-4 border-red-500"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-neutral-900">مدفوعات متأخرة تحتاج متابعة</h3>
                      <p className="text-xs text-neutral-500">{summary.overdue_payments.length} دفعة متأخرة</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {summary.overdue_payments.slice(0, 3).map((payment: any) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                        <div>
                          <p className="font-semibold text-neutral-900">{payment.contract_number}</p>
                          <p className="text-xs text-neutral-500">{payment.customer_name}</p>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-red-600">{formatCurrency(payment.amount)}</p>
                          <span className="text-xs text-red-500 bg-red-100 px-2 py-0.5 rounded-full">{payment.days_overdue} يوم</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {summary.overdue_payments.length > 3 && (
                    <button 
                      onClick={() => setActiveTab('list')} 
                      className="w-full mt-3 py-2 text-sm text-coral-600 font-medium hover:text-coral-700"
                    >
                      عرض جميع المدفوعات المتأخرة ({summary.overdue_payments.length})
                    </button>
                  )}
                </motion.div>
              )}
            </TabsContent>

            {/* Tab 2: Payments List */}
            <TabsContent value="list" className="space-y-4 mt-5">
              {/* Filters */}
              <motion.div 
                className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-coral-500" />
                    <h3 className="font-bold text-neutral-900 text-sm">البحث والفلتر</h3>
                  </div>
                  <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                    {filteredPayments.length} نتيجة
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="relative md:col-span-2">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <Input
                      placeholder="ابحث باسم العميل، رقم السند، رقم العقد..."
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="pr-10 rounded-xl border-neutral-200"
                    />
                  </div>
                  
                  <Select value={filterDateRange} onValueChange={handleFilterChange(setFilterDateRange)}>
                    <SelectTrigger className="rounded-xl border-neutral-200">
                      <Calendar className="w-4 h-4 ml-2 text-neutral-400" />
                      <SelectValue placeholder="الفترة الزمنية" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفترات</SelectItem>
                      <SelectItem value="today">اليوم</SelectItem>
                      <SelectItem value="week">هذا الأسبوع</SelectItem>
                      <SelectItem value="month">هذا الشهر</SelectItem>
                      <SelectItem value="last_month">الشهر الماضي</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterStatus} onValueChange={handleFilterChange(setFilterStatus)}>
                    <SelectTrigger className="rounded-xl border-neutral-200">
                      <SelectValue placeholder="حالة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="completed">مكتملة</SelectItem>
                      <SelectItem value="pending">معلقة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                      <SelectItem value="bounced">مرتدة</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterMethod} onValueChange={handleFilterChange(setFilterMethod)}>
                    <SelectTrigger className="rounded-xl border-neutral-200">
                      <SelectValue placeholder="طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الطرق</SelectItem>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Active filters and clear button */}
                {(searchTerm || filterStatus !== "" || filterMethod !== "" || filterDateRange !== "all") && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-100">
                    <span className="text-xs text-neutral-500">الفلاتر النشطة:</span>
                    <div className="flex flex-wrap gap-2">
                      {searchTerm && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-coral-50 text-coral-600 rounded-lg text-xs">
                          بحث: {searchTerm.substring(0, 15)}...
                          <button onClick={() => setSearchTerm("")} className="hover:bg-coral-100 rounded p-0.5">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {filterDateRange && filterDateRange !== "all" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs">
                          {filterDateRange === 'today' ? 'اليوم' : filterDateRange === 'week' ? 'هذا الأسبوع' : filterDateRange === 'month' ? 'هذا الشهر' : 'الشهر الماضي'}
                          <button onClick={() => setFilterDateRange("all")} className="hover:bg-blue-100 rounded p-0.5">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {filterStatus && filterStatus !== "all" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-xs">
                          {getStatusLabel(filterStatus)}
                          <button onClick={() => setFilterStatus("")} className="hover:bg-green-100 rounded p-0.5">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                      {filterMethod && filterMethod !== "all" && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs">
                          {getMethodLabel(filterMethod)}
                          <button onClick={() => setFilterMethod("")} className="hover:bg-purple-100 rounded p-0.5">
                            <XCircle className="w-3 h-3" />
                          </button>
                        </span>
                      )}
                    </div>
                    <motion.button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("");
                        setFilterMethod("");
                        setFilterDateRange("all");
                        setCurrentPage(1);
                      }}
                      className="mr-auto px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-200 transition-colors"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      مسح الكل
                    </motion.button>
                  </div>
                )}
              </motion.div>

              {/* Payments Table */}
              <motion.div 
                className="bg-white rounded-[1.25rem] shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="p-5 border-b border-neutral-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <List className="w-5 h-5 text-coral-500" />
                      <h3 className="font-bold text-neutral-900">قائمة المدفوعات</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        onClick={() => {
                          toast.info('جارٍ تصدير البيانات...');
                          // TODO: Implement export
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-lg text-xs font-medium hover:bg-neutral-200 transition-colors"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        تصدير
                      </motion.button>
                      <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
                        صفحة {currentPage} من {totalPages || 1}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-neutral-600 font-medium">جارى تحميل المدفوعات...</p>
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                      >
                        <div className="w-16 h-16 bg-coral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <CreditCard className="w-8 h-8 text-coral-500" />
                        </div>
                        <p className="text-neutral-600 font-medium mb-2">لا توجد مدفوعات</p>
                        <p className="text-xs text-neutral-400 mb-4">
                          {searchTerm || filterStatus || filterMethod || filterDateRange !== 'all' 
                            ? 'جرب تغيير معايير البحث' 
                            : 'ابدأ بإنشاء أول سند'}
                        </p>
                        <motion.button 
                          onClick={() => setIsCreateDialogOpen(true)}
                          className="px-5 py-2.5 bg-coral-500 text-white rounded-full text-sm font-semibold"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Plus className="h-4 w-4 inline mr-2" />
                          إنشاء سند جديد
                        </motion.button>
                      </motion.div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-neutral-200 overflow-hidden overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">رقم السند</TableHead>
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  العميل
                                </div>
                              </TableHead>
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <FileSignature className="w-3.5 h-3.5" />
                                  العقد
                                </div>
                              </TableHead>
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">المبلغ</TableHead>
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">الطريقة</TableHead>
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">التاريخ</TableHead>
                              <TableHead className="text-right font-semibold text-neutral-700 whitespace-nowrap">الحالة</TableHead>
                              <TableHead className="text-center font-semibold text-neutral-700 whitespace-nowrap">الإجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence>
                              {paginatedPayments.map((payment: any, index: number) => (
                                <motion.tr
                                  key={payment.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ delay: index * 0.02 }}
                                  className="border-b border-neutral-100 hover:bg-coral-50/30 transition-colors group cursor-pointer"
                                  onClick={() => navigateToContractPayments(payment)}
                                >
                                  <TableCell className="whitespace-nowrap">
                                    <div className="flex flex-col">
                                      <span className="font-mono text-sm font-semibold text-neutral-900">{payment.payment_number}</span>
                                      {getInvoiceMonth(payment) && (
                                        <span className="text-[10px] text-coral-600 font-medium mt-0.5">
                                          فاتورة {getInvoiceMonth(payment)}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <User className="w-3.5 h-3.5 text-neutral-500" />
                                      </div>
                                      <span className="text-sm text-neutral-800 max-w-[150px] truncate">
                                        {getCustomerName(payment)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <span className="text-sm text-neutral-600 font-mono">
                                      {getContractNumber(payment)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-mono font-semibold text-neutral-900 whitespace-nowrap">
                                    {formatCurrency(payment.amount)}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-1 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700">
                                      {getMethodLabel(payment.payment_method)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-neutral-600 text-sm whitespace-nowrap">
                                    {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: ar })}
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <span className={cn(
                                      "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border",
                                      getStatusColor(payment.payment_status)
                                    )}>
                                      {getStatusLabel(payment.payment_status)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                      <motion.button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPayment(payment);
                                          setIsPreviewDialogOpen(true);
                                        }}
                                        className="w-8 h-8 bg-coral-50 text-coral-600 rounded-lg flex items-center justify-center hover:bg-coral-100 transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="معاينة"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </motion.button>
                                      <motion.button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          sendReceiptViaWhatsApp(payment);
                                        }}
                                        disabled={sendingWhatsApp === payment.id}
                                        className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors disabled:opacity-50"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="إرسال عبر واتساب"
                                      >
                                        {sendingWhatsApp === payment.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <MessageCircle className="h-4 w-4" />
                                        )}
                                      </motion.button>
                                      {/* Delete Payment Button */}
                                      <motion.button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPaymentToDelete(payment);
                                        }}
                                        className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        title="حذف الدفعة"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </motion.button>
                                    </div>
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
                          <p className="text-xs text-neutral-500">
                            عرض {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredPayments.length)} من {filteredPayments.length}
                          </p>
                          <div className="flex items-center gap-2">
                            <motion.button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                currentPage === 1 
                                  ? "bg-neutral-50 text-neutral-300 cursor-not-allowed" 
                                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                              )}
                              whileHover={currentPage !== 1 ? { scale: 1.05 } : undefined}
                              whileTap={currentPage !== 1 ? { scale: 0.95 } : undefined}
                            >
                              <ChevronRight className="w-4 h-4" />
                            </motion.button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                                return (
                                  <motion.button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors",
                                      currentPage === pageNum 
                                        ? "bg-coral-500 text-white" 
                                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    )}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {pageNum}
                                  </motion.button>
                                );
                              })}
                            </div>
                            
                            <motion.button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                currentPage === totalPages 
                                  ? "bg-neutral-50 text-neutral-300 cursor-not-allowed" 
                                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                              )}
                              whileHover={currentPage !== totalPages ? { scale: 1.05 } : undefined}
                              whileTap={currentPage !== totalPages ? { scale: 0.95 } : undefined}
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </TabsContent>

            {/* Tab 3: Tracking */}
            <TabsContent value="tracking" className="space-y-5 mt-5">
              <motion.div 
                className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900">التتبع والتسوية البنكية</h3>
                    <p className="text-xs text-neutral-500">تسوية المدفوعات مع كشوف الحساب البنكية</p>
                  </div>
                </div>
                <PaymentTracking />
              </motion.div>
            </TabsContent>

            {/* Tab 4: Analytics */}
            <TabsContent value="analytics" className="space-y-5 mt-5">
              {/* Analytics Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="إجمالي المقبوضات"
                  value={formatCurrency(payments?.filter(p => p.transaction_type === 'receipt').reduce((sum, p) => sum + (p.amount || 0), 0) || 0)}
                  icon={TrendingUp}
                  iconBg="bg-green-100 text-green-600"
                  trend="up"
                />
                <StatCard
                  title="إجمالي المصروفات"
                  value={formatCurrency(payments?.filter(p => p.transaction_type === 'payment').reduce((sum, p) => sum + (p.amount || 0), 0) || 0)}
                  icon={TrendingDown}
                  iconBg="bg-red-100 text-red-600"
                  trend="down"
                />
                <StatCard
                  title="متوسط قيمة السند"
                  value={formatCurrency(payments?.length ? (payments.reduce((sum, p) => sum + (p.amount || 0), 0) / payments.length) : 0)}
                  icon={BarChart3}
                  iconBg="bg-blue-100 text-blue-600"
                />
                <StatCard
                  title="عدد العملاء"
                  value={new Set(payments?.map(p => p.customer_id).filter(Boolean)).size}
                  subtitle="عميل نشط"
                  icon={User}
                  iconBg="bg-purple-100 text-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Payment Methods Pie Chart */}
                <motion.div 
                  className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="font-bold text-neutral-900 mb-4">توزيع المدفوعات حسب الطريقة</h3>
                  {paymentMethodData.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {paymentMethodData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              borderRadius: '12px',
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-400">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">لا توجد بيانات كافية</p>
                    </div>
                  )}
                </motion.div>

                {/* Monthly Payments Bar Chart */}
                <motion.div 
                  className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="font-bold text-neutral-900 mb-4">المدفوعات الشهرية (آخر 6 أشهر)</h3>
                  {monthlyPaymentsData.length > 0 ? (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyPaymentsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis 
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value)}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              borderRadius: '12px',
                              border: '1px solid #e5e7eb',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="قبض" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="صرف" fill="#e85a4f" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-neutral-400">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">لا توجد بيانات كافية</p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Recent Activity */}
              <motion.div 
                className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="font-bold text-neutral-900 mb-4">آخر 5 مدفوعات</h3>
                <div className="space-y-3">
                  {payments?.slice(0, 5).map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          payment.transaction_type === 'receipt' ? 'bg-green-100' : 'bg-red-100'
                        )}>
                          {payment.transaction_type === 'receipt' 
                            ? <TrendingUp className="w-5 h-5 text-green-600" />
                            : <TrendingDown className="w-5 h-5 text-red-600" />
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 text-sm">{getCustomerName(payment)}</p>
                          <p className="text-xs text-neutral-500">{payment.payment_number}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className={cn(
                          "font-bold",
                          payment.transaction_type === 'receipt' ? 'text-green-600' : 'text-red-600'
                        )}>
                          {payment.transaction_type === 'receipt' ? '+' : '-'}{formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Create Payment Dialog */}
          <UnifiedPaymentForm
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            type="customer_payment"
            onSuccess={() => {
              setIsCreateDialogOpen(false);
              refetch();
              toast.success('تم تسجيل الدفعة بنجاح');
            }}
            onCancel={() => setIsCreateDialogOpen(false)}
          />

          {/* Payment Preview Dialog */}
          <PaymentPreviewDialog
            payment={selectedPayment}
            open={isPreviewDialogOpen}
            onOpenChange={setIsPreviewDialogOpen}
          />

          {/* Payment Assistant Panel */}
          <PaymentAssistantPanel
            paymentData={{
              amount: 0,
              payment_method: 'cash',
            }}
            mode="floating"
          />

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <AlertDialogTitle className="text-xl">
                    هل أنت متأكد من حذف هذه الدفعة؟
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-right space-y-2">
                  <p>سيتم حذف الدفعة التالية نهائياً:</p>
                  {paymentToDelete && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                      <p><strong>رقم السند:</strong> {paymentToDelete.payment_number}</p>
                      <p><strong>المبلغ:</strong> {formatCurrency(paymentToDelete.amount)}</p>
                      <p><strong>العميل:</strong> {getCustomerName(paymentToDelete)}</p>
                      <p><strong>التاريخ:</strong> {format(new Date(paymentToDelete.payment_date), 'dd/MM/yyyy', { locale: ar })}</p>
                    </div>
                  )}
                  <p className="text-red-600 font-medium">
                    ⚠️ لا يمكن التراجع عن هذا الإجراء!
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 flex-row-reverse">
                <AlertDialogCancel disabled={isDeleting}>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePayment}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جارٍ الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 ml-2" />
                      نعم، احذف الدفعة
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </FinanceErrorBoundary>
  );
};

export default PaymentsUnified;
