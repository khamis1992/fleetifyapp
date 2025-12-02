import { useState } from "react";
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
  XCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
import { HelpIcon } from '@/components/help/HelpIcon';
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const { data: payments, isLoading: paymentsLoading, error, refetch } = usePayments();
  const { data: summary, isLoading: summaryLoading } = usePaymentsSummary();
  const { formatCurrency } = useCurrencyFormatter();
  const { isMobile } = useSimpleBreakpoint();

  const isLoading = paymentsLoading || summaryLoading;

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === "all" || payment.payment_status === filterStatus;
    const matchesMethod = !filterMethod || filterMethod === "all" || payment.payment_method === filterMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  }) || [];

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
                  value={formatCurrency(summary?.total_payments || 0)}
                  subtitle={`${summary?.payments_count || payments?.length || 0} دفعة`}
                  icon={Banknote}
                  iconBg="bg-coral-100 text-coral-600"
                />
                <StatCard
                  title="مدفوعات معلقة"
                  value={formatCurrency(summary?.pending_amount || 0)}
                  subtitle={`${summary?.pending_count || 0} معلقة`}
                  icon={Clock}
                  iconBg="bg-amber-100 text-amber-600"
                  trend={summary?.pending_count > 0 ? 'down' : 'neutral'}
                />
                <StatCard
                  title="مدفوعات متأخرة"
                  value={formatCurrency(summary?.overdue_amount || 0)}
                  subtitle={`${summary?.overdue_count || 0} متأخرة`}
                  icon={AlertCircle}
                  iconBg="bg-red-100 text-red-600"
                  trend={summary?.overdue_count > 0 ? 'down' : 'neutral'}
                />
                <StatCard
                  title="مدفوعات اليوم"
                  value={formatCurrency(summary?.today_payments || 0)}
                  subtitle={`${summary?.today_count || 0} دفعة`}
                  icon={CheckCircle}
                  iconBg="bg-green-100 text-green-600"
                  change={summary?.today_count > 0 ? `+${summary?.today_count}` : undefined}
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
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-4 h-4 text-coral-500" />
                  <h3 className="font-bold text-neutral-900 text-sm">البحث والفلتر</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
                    <Input
                      placeholder="ابحث برقم الدفع أو المرجع..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 rounded-xl border-neutral-200"
                    />
                  </div>
                  
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
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

                  <Select value={filterMethod} onValueChange={setFilterMethod}>
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

                  <motion.button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("");
                      setFilterMethod("");
                    }}
                    className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-200 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    مسح الفلاتر
                  </motion.button>
                </div>
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
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
                      {filteredPayments.length} سجل
                    </span>
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
                        <p className="text-xs text-neutral-400 mb-4">ابدأ بإنشاء أول سند</p>
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
                    <div className="rounded-xl border border-neutral-200 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-neutral-50 hover:bg-neutral-50">
                            <TableHead className="text-right font-semibold text-neutral-700">رقم السند</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">النوع</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">المبلغ</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">الطريقة</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">التاريخ</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">الحالة</TableHead>
                            <TableHead className="text-center font-semibold text-neutral-700">عرض</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filteredPayments.slice(0, 50).map((payment: any, index: number) => (
                              <motion.tr
                                key={payment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ delay: index * 0.02 }}
                                className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors"
                              >
                                <TableCell className="font-semibold text-neutral-900">
                                  {payment.payment_number}
                                </TableCell>
                                <TableCell>
                                  <span className={cn(
                                    "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold",
                                    getTypeColor(payment.transaction_type)
                                  )}>
                                    {getTypeLabel(payment.transaction_type)}
                                  </span>
                                </TableCell>
                                <TableCell className="font-mono font-semibold text-neutral-900">
                                  {formatCurrency(payment.amount)}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2.5 py-1 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700">
                                    {getMethodLabel(payment.payment_method)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-neutral-600 text-sm">
                                  {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: ar })}
                                </TableCell>
                                <TableCell>
                                  <span className={cn(
                                    "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border",
                                    getStatusColor(payment.payment_status)
                                  )}>
                                    {getStatusLabel(payment.payment_status)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <motion.button 
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setIsPreviewDialogOpen(true);
                                    }}
                                    className="w-8 h-8 bg-coral-50 text-coral-600 rounded-lg flex items-center justify-center hover:bg-coral-100 transition-colors mx-auto"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </motion.button>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.div 
                  className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h3 className="font-bold text-neutral-900 mb-4">توزيع المدفوعات حسب الطريقة</h3>
                  <div className="text-center py-12 text-neutral-400">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">رسم بياني قيد التطوير</p>
                  </div>
                </motion.div>

                <motion.div 
                  className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="font-bold text-neutral-900 mb-4">المدفوعات الشهرية</h3>
                  <div className="text-center py-12 text-neutral-400">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm">رسم بياني قيد التطوير</p>
                  </div>
                </motion.div>
              </div>
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
            position="left"
          />
        </div>
      </div>
    </FinanceErrorBoundary>
  );
};

export default PaymentsUnified;
