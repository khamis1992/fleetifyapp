import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePayments } from "@/hooks/useFinance";
import { UnifiedPaymentForm } from "@/components/finance/UnifiedPaymentForm";
import { FinanceErrorBoundary } from "@/components/finance/FinanceErrorBoundary";
import { PaymentPreviewDialog } from "@/components/finance/PaymentPreviewDialog";

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
import { Plus, Search, Filter, BarChart3, CreditCard, Eye, Brain, TrendingUp, TrendingDown, Banknote, CheckCircle2, Clock, XCircle, ArrowLeftRight, ChevronLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { UnifiedPaymentUpload } from "@/components/finance/payment-upload/UnifiedPaymentUpload";
import { BulkDeletePaymentsDialog } from "@/components/finance/payments/BulkDeletePaymentsDialog";
import { ProfessionalPaymentSystem } from "@/components/finance/ProfessionalPaymentSystem";
import { useSimpleBreakpoint } from "@/hooks/use-mobile-simple";
import { HelpIcon } from '@/components/help/HelpIcon';
import { cn } from "@/lib/utils";

// ===== Stat Card Component =====
interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconBg,
  trend = 'neutral',
}) => {
  return (
    <motion.div 
      className="bg-white rounded-[1.25rem] p-4 shadow-sm hover:shadow-lg transition-all h-full flex flex-col"
      whileHover={{ y: -2, scale: 1.01 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <motion.div 
          className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}
          whileHover={{ rotate: 10, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>
        {change && (
          <motion.span 
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
              trend === 'up' ? 'bg-green-100 text-green-600' : 
              trend === 'down' ? 'bg-red-100 text-red-600' : 
              'bg-neutral-100 text-neutral-600'
            )}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            {trend === 'up' ? <TrendingUp className="w-2.5 h-2.5" /> : 
             trend === 'down' ? <TrendingDown className="w-2.5 h-2.5" /> : null}
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
    </motion.div>
  );
};

const Payments = () => {
  const navigate = useNavigate();
  // حالة البحث والتصفية
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  
  // حالة النماذج والنوافذ
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isUnifiedUploadOpen, setIsUnifiedUploadOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isProfessionalSystemOpen, setIsProfessionalSystemOpen] = useState(false);
  
  // حالة نطاق التاريخ
  const [dateRange, setDateRange] = useState({
    start: "",
    end: ""
  });

  const { data: payments, isLoading, error, refetch } = usePayments();
  const { formatCurrency } = useCurrencyFormatter();
  const { isMobile } = useSimpleBreakpoint();

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = payment.payment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ((payment as any).contracts?.contract_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || filterStatus === "all" || payment.payment_status === filterStatus;
    const matchesMethod = !filterMethod || filterMethod === "all" || payment.payment_method === filterMethod;
    
    return matchesSearch && matchesStatus && matchesMethod;
  }) || [];

  // Calculate stats
  const totalAmount = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const completedPayments = filteredPayments.filter(p => p.payment_status === 'completed').length;
  const pendingPayments = filteredPayments.filter(p => p.payment_status === 'pending').length;
  const receiptsCount = filteredPayments.filter(p => (p as any).transaction_type === 'receipt').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      case 'cleared': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'bounced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتملة';
      case 'cleared': return 'مقاصة';
      case 'pending': return 'معلقة';
      case 'cancelled': return 'ملغاة';
      case 'bounced': return 'مرتدة';
      default: return status;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'نقدي';
      case 'check': return 'شيك';
      case 'bank_transfer': return 'حوالة بنكية';
      case 'credit_card': return 'بطاقة ائتمان';
      case 'debit_card': return 'بطاقة خصم';
      default: return method;
    }
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
      onRetry={() => refetch()}
      title="خطأ في المدفوعات"
      context="صفحة المدفوعات"
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
            {/* Breadcrumb & Title */}
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
                    <HelpIcon topic="debitCredit" />
                  </div>
                  <p className="text-xs text-neutral-500">إدارة المدفوعات والمقبوضات</p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-coral-500 text-white rounded-full font-semibold text-sm hover:bg-coral-600 transition-colors shadow-lg shadow-coral-500/30"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="w-4 h-4" />
                <span>سند جديد</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي المدفوعات"
              value={filteredPayments.length}
              icon={CreditCard}
              iconBg="bg-coral-100 text-coral-600"
            />
            <StatCard
              title="المبلغ الإجمالي"
              value={formatCurrency(totalAmount)}
              icon={Banknote}
              iconBg="bg-green-100 text-green-600"
              change="+12%"
              trend="up"
            />
            <StatCard
              title="مكتملة"
              value={completedPayments}
              icon={CheckCircle2}
              iconBg="bg-blue-100 text-blue-600"
            />
            <StatCard
              title="سندات القبض"
              value={receiptsCount}
              icon={ArrowLeftRight}
              iconBg="bg-amber-100 text-amber-600"
            />
          </div>
            
          {/* Tabs */}
          <Tabs defaultValue="list" className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TabsList className="bg-white rounded-xl p-1 shadow-sm">
                <TabsTrigger 
                  value="list" 
                  className="flex items-center gap-2 rounded-lg data-[state=active]:bg-coral-500 data-[state=active]:text-white"
                >
                  <CreditCard className="h-4 w-4" />
                  قائمة المدفوعات
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex items-center gap-2 rounded-lg data-[state=active]:bg-coral-500 data-[state=active]:text-white"
                >
                  <BarChart3 className="h-4 w-4" />
                  التحليلات والتقارير
                </TabsTrigger>
              </TabsList>
            </motion.div>

            <TabsContent value="analytics" className="mt-5">
              <motion.div 
                className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="font-bold text-neutral-900 text-sm mb-4">فلترة التقارير</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-neutral-500 mb-2 block">من تاريخ</label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="rounded-xl border-neutral-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-500 mb-2 block">إلى تاريخ</label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="rounded-xl border-neutral-200"
                    />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="list" className="mt-5 space-y-4">
              {/* Search & Filters */}
              <motion.div 
                className="bg-white rounded-[1.25rem] p-5 shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
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
                      className="pr-10 rounded-xl border-neutral-200 focus:ring-2 focus:ring-coral-500/20"
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
                    </SelectContent>
                  </Select>

                  <Select value={filterMethod} onValueChange={setFilterMethod}>
                    <SelectTrigger className="rounded-xl border-neutral-200">
                      <SelectValue placeholder="طريقة الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الطرق</SelectItem>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="bank_transfer">حوالة بنكية</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="debit_card">بطاقة خصم</SelectItem>
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
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className="p-5 border-b border-neutral-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-900 text-sm">قائمة المدفوعات</h3>
                    <span className="text-xs text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
                      {filteredPayments.length} سجل
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-12 space-y-4">
                      <div className="w-12 h-12 border-4 border-coral-500 border-t-transparent rounded-full animate-spin" />
                      <div className="text-center">
                        <p className="text-neutral-600 mb-1 font-medium">جارى تحميل المدفوعات...</p>
                        <p className="text-xs text-neutral-400">يتم البحث في قاعدة البيانات</p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-red-700 font-medium mb-2">حدث خطأ في تحميل المدفوعات</p>
                        <p className="text-sm text-neutral-500 mb-4">{error.message}</p>
                        <div className="flex justify-center gap-2">
                          <motion.button 
                            onClick={() => refetch()}
                            className="px-4 py-2 bg-coral-500 text-white rounded-lg text-sm font-medium"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            إعادة المحاولة
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-12">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring" }}
                      >
                        <div className="w-16 h-16 bg-coral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <CreditCard className="w-8 h-8 text-coral-500" />
                        </div>
                        <p className="text-neutral-600 font-medium mb-2">لا توجد مدفوعات</p>
                        <p className="text-xs text-neutral-400 mb-4">ابدأ بإنشاء أول سند قبض أو صرف</p>
                        <motion.button 
                          onClick={() => setIsCreateDialogOpen(true)}
                          className="px-5 py-2.5 bg-coral-500 text-white rounded-full text-sm font-semibold inline-flex items-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Plus className="h-4 w-4" />
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
                            <TableHead className="text-right font-semibold text-neutral-700">التاريخ</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">المبلغ</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">طريقة الدفع</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">الحالة</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">رقم المرجع</TableHead>
                            <TableHead className="text-right font-semibold text-neutral-700">رقم العقد</TableHead>
                            <TableHead className="text-center font-semibold text-neutral-700">عرض</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {filteredPayments.map((payment, index) => (
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
                                    getTypeColor((payment as any).transaction_type)
                                  )}>
                                    {getTypeLabel((payment as any).transaction_type)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-neutral-600">
                                  {new Date(payment.payment_date).toLocaleDateString('en-GB')}
                                </TableCell>
                                <TableCell className="font-mono font-semibold text-neutral-900">
                                  {formatCurrency(payment.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell>
                                  <span className="inline-flex items-center px-2.5 py-1 bg-neutral-100 rounded-lg text-xs font-medium text-neutral-700">
                                    {getMethodLabel(payment.payment_type || payment.payment_method)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className={cn(
                                    "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border",
                                    getStatusColor(payment.payment_status)
                                  )}>
                                    {getStatusLabel(payment.payment_status)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-neutral-500 text-sm">
                                  {payment.reference_number || '-'}
                                </TableCell>
                                <TableCell>
                                  {(payment as any).contracts ? (
                                    <div className="flex flex-col gap-1">
                                      <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium w-fit">
                                        {(payment as any).contracts.contract_number}
                                      </span>
                                      <span className="text-[10px] text-neutral-400">
                                        {(payment as any).contracts.status === 'active' ? 'نشط' : 
                                         (payment as any).contracts.status === 'completed' ? 'مكتمل' :
                                         (payment as any).contracts.status === 'cancelled' ? 'ملغي' : 
                                         (payment as any).contracts.status || '-'}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-neutral-400">-</span>
                                  )}
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
          </Tabs>

          {/* نموذج إنشاء دفعة جديدة - الموحد */}
          <UnifiedPaymentForm
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            type="customer_payment"
          />

          {/* نظام رفع المدفوعات الموحد */}
          <UnifiedPaymentUpload 
            open={isUnifiedUploadOpen}
            onOpenChange={setIsUnifiedUploadOpen}
            onUploadComplete={() => {
              setIsUnifiedUploadOpen(false);
            }}
          />
          
          <BulkDeletePaymentsDialog
            isOpen={isBulkDeleteOpen}
            onClose={() => setIsBulkDeleteOpen(false)}
            totalPayments={payments?.length || 0}
          />

          {/* مكون معاينة تفاصيل الدفعة */}
          <PaymentPreviewDialog 
            payment={selectedPayment} 
            open={isPreviewDialogOpen} 
            onOpenChange={setIsPreviewDialogOpen} 
          />

          {/* نافذة النظام الاحترافي */}
          <Dialog open={isProfessionalSystemOpen} onOpenChange={setIsProfessionalSystemOpen}>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-coral-500" />
                  النظام الاحترافي للمدفوعات
                </DialogTitle>
              </DialogHeader>
              <ProfessionalPaymentSystem />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </FinanceErrorBoundary>
  );
};

export default Payments;
