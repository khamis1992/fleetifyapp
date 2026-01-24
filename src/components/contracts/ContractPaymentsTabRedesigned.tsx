/**
 * تبويب الدفعات - تصميم محسّن V2
 * Professional SaaS design with improved visual hierarchy
 * Better payment cards, metrics overview, and modern layout
 *
 * @component ContractPaymentsTabRedesigned
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  CreditCard,
  XCircle,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  Wallet,
  DollarSign,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Search,
  Filter,
  Building2,
  Landmark,
  Smartphone,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { calculateInvoiceTotalsAfterPaymentReversal } from '@/utils/invoiceHelpers';
import { cn } from '@/lib/utils';

// ===== Animation Variants =====
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// ===== Types =====
interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_status: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  invoice_id: string;
  contract_id?: string;
  invoice?: {
    invoice_number: string;
  };
}

interface CustomerInfo {
  name: string;
  phone?: string;
  nationalId?: string;
}

interface ContractPaymentsTabRedesignedProps {
  contractId: string;
  companyId: string;
  invoiceIds: string[];
  formatCurrency: (amount: number) => string;
  contractNumber?: string;
  customerInfo?: CustomerInfo;
}

// ===== Helper Functions =====
const getPaymentStatusInfo = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        label: 'مكتمل',
        variant: 'default' as const,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-500',
        icon: CheckCircle,
      };
    case 'pending':
      return {
        label: 'معلق',
        variant: 'secondary' as const,
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
        iconBg: 'bg-yellow-500',
        icon: Clock,
      };
    case 'cancelled':
      return {
        label: 'ملغي',
        variant: 'outline' as const,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        iconBg: 'bg-red-500',
        icon: Ban,
      };
    case 'failed':
      return {
        label: 'فشل',
        variant: 'destructive' as const,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        iconBg: 'bg-red-500',
        icon: XCircle,
      };
    default:
      return {
        label: status,
        variant: 'secondary' as const,
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        iconBg: 'bg-slate-400',
        icon: Clock,
      };
  }
};

const getPaymentMethodInfo = (method: string) => {
  const methods: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    cash: { label: 'نقدي', icon: Smartphone, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
    bank_transfer: { label: 'تحويل بنكي', icon: Landmark, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    credit_card: { label: 'بطاقة ائتمان', icon: CreditCard, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
    cheque: { label: 'شيك', icon: DollarSign, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
    received: { label: 'مستلم', icon: Wallet, color: 'from-teal-500 to-teal-600', bg: 'bg-teal-50' },
    other: { label: 'أخرى', icon: CreditCard, color: 'from-slate-500 to-slate-600', bg: 'bg-slate-50' },
  };
  return methods[method] || methods.other;
};

// ===== Metrics Cards Component =====
const PaymentMetrics = ({
  payments,
  formatCurrency,
}: {
  payments: Payment[];
  formatCurrency: (amount: number) => string;
}) => {
  const metrics = useMemo(() => {
    const totalPayments = payments.length;
    const completedPayments = payments.filter(p => p.payment_status === 'completed');
    const pendingPayments = payments.filter(p => p.payment_status === 'pending');
    const cancelledPayments = payments.filter(p => p.payment_status === 'cancelled');

    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const completedAmount = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const cancelledAmount = cancelledPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalPayments,
      completedCount: completedPayments.length,
      pendingCount: pendingPayments.length,
      cancelledCount: cancelledPayments.length,
      totalAmount,
      completedAmount,
      pendingAmount,
      cancelledAmount,
      completionRate: totalPayments > 0 ? Math.round((completedPayments.length / totalPayments) * 100) : 0,
    };
  }, [payments]);

  const metricCards = [
    {
      title: 'إجمالي الدفعات',
      value: formatCurrency(metrics.totalAmount),
      subtext: `${metrics.totalPayments} دفعة`,
      icon: Wallet,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200/50',
    },
    {
      title: 'المدفوع',
      value: formatCurrency(metrics.completedAmount),
      subtext: `${metrics.completedCount} دفعة • ${metrics.completionRate}%`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200/50',
    },
    {
      title: 'المعلقة',
      value: formatCurrency(metrics.pendingAmount),
      subtext: `${metrics.pendingCount} دفعة معلقة`,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/50',
    },
    {
      title: 'الملغية',
      value: formatCurrency(metrics.cancelledAmount),
      subtext: `${metrics.cancelledCount} دفعة ملغاة`,
      icon: Ban,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200/50',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {metricCards.map((metric, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm hover:shadow-lg transition-all duration-200"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn("w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md", metric.color)}>
              <metric.icon className="w-5 h-5 text-white" />
            </div>
            <div className={cn("px-2 py-1 rounded-lg text-xs font-medium", metric.bgColor, "text-slate-700")}>
              {metric.subtext.split(' • ')[0]}
            </div>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{metric.value}</p>
          <p className="text-xs text-neutral-500">{metric.title}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};

// ===== Payment Card Component =====
const PaymentCard = ({
  payment,
  formatCurrency,
  onCancel,
}: {
  payment: Payment;
  formatCurrency: (amount: number) => string;
  onCancel: () => void;
}) => {
  const statusInfo = getPaymentStatusInfo(payment.payment_status);
  const StatusIcon = statusInfo.icon;
  const methodInfo = getPaymentMethodInfo(payment.payment_method);
  const MethodIcon = methodInfo.icon;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className={cn(
        "bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200",
        statusInfo.borderColor,
        payment.payment_status === 'cancelled' && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br", methodInfo.color)}>
            <MethodIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-neutral-900 text-lg">
                {payment.invoice?.invoice_number || 'دفعة مباشرة'}
              </h3>
              <Badge className={cn("text-xs", statusInfo.bgColor, statusInfo.textColor, "border-0 gap-1.5")}>
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500">{methodInfo.label}</p>
          </div>
        </div>
      </div>

      {/* Amount Display */}
      <div className={cn("p-4 rounded-xl mb-4", methodInfo.bg, "border", statusInfo.borderColor)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-neutral-600 mb-1">المبلغ المدفوع</p>
            <p className="text-2xl font-bold text-neutral-900">{formatCurrency(payment.amount || 0)}</p>
          </div>
          {payment.reference_number && (
            <div className="text-left">
              <p className="text-xs text-neutral-600 mb-1">رقم المرجع</p>
              <p className="text-sm font-medium text-neutral-900 font-mono">{payment.reference_number}</p>
            </div>
          )}
        </div>
      </div>

      {/* Date & Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-neutral-600">
            <Calendar className="w-4 h-4" />
            <span>تاريخ الدفع</span>
          </div>
          <span className="font-medium text-neutral-900" dir="ltr">
            {payment.payment_date
              ? format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: ar })
              : '-'}
          </span>
        </div>

        {payment.notes && (
          <div className="flex items-start gap-2 text-sm p-3 bg-slate-50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
            <p className="text-neutral-600 line-clamp-2">{payment.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {payment.payment_status === 'completed' && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="w-full gap-2 rounded-xl border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <XCircle className="w-4 h-4" />
          إلغاء الدفعة
        </Button>
      )}
    </motion.div>
  );
};

// ===== Payment Table Row Component =====
const PaymentTableRow = ({
  payment,
  formatCurrency,
  onCancel,
}: {
  payment: Payment;
  formatCurrency: (amount: number) => string;
  onCancel: () => void;
}) => {
  const statusInfo = getPaymentStatusInfo(payment.payment_status);
  const StatusIcon = statusInfo.icon;
  const methodInfo = getPaymentMethodInfo(payment.payment_method);
  const MethodIcon = methodInfo.icon;

  return (
    <tr className={cn(
      "hover:bg-neutral-50 transition-colors border-b border-neutral-100",
      payment.payment_status === 'cancelled' && 'opacity-50'
    )}>
      {/* Invoice Number */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", methodInfo.color)}>
            <MethodIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">{payment.invoice?.invoice_number || '-'}</p>
            <p className="text-xs text-neutral-500">{methodInfo.label}</p>
          </div>
        </div>
      </td>

      {/* Date */}
      <td className="py-4 px-4">
        <p className="text-sm text-neutral-900" dir="ltr">
          {payment.payment_date
            ? format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })
            : '-'}
        </p>
        {payment.reference_number && (
          <p className="text-xs text-neutral-500 font-mono">{payment.reference_number}</p>
        )}
      </td>

      {/* Amount */}
      <td className="py-4 px-4">
        <p className="font-bold text-neutral-900 text-lg">{formatCurrency(payment.amount || 0)}</p>
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <Badge className={cn("gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </Badge>
      </td>

      {/* Notes */}
      <td className="py-4 px-4">
        {payment.notes ? (
          <div className="max-w-[200px]">
            <p className="text-sm text-neutral-600 truncate" title={payment.notes}>
              {payment.notes}
            </p>
          </div>
        ) : (
          <span className="text-neutral-400">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        {payment.payment_status === 'completed' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="h-8 px-3 rounded-lg border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 ml-1" />
            إلغاء
          </Button>
        ) : payment.payment_status === 'cancelled' ? (
          <span className="text-sm text-slate-400">ملغي</span>
        ) : null}
      </td>
    </tr>
  );
};

// ===== Filter Bar Component =====
const PaymentFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  methodFilter,
  onMethodFilterChange,
  sortOption,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  methodFilter: string;
  onMethodFilterChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
}) => (
  <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-white rounded-xl p-4 border border-neutral-200">
    <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="بحث في الدفعات..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 rounded-xl border-neutral-200"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full lg:w-[140px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="completed">مكتمل</SelectItem>
          <SelectItem value="pending">معلق</SelectItem>
          <SelectItem value="cancelled">ملغي</SelectItem>
          <SelectItem value="failed">فشل</SelectItem>
        </SelectContent>
      </Select>

      <Select value={methodFilter} onValueChange={onMethodFilterChange}>
        <SelectTrigger className="w-full lg:w-[140px] rounded-xl border-neutral-200">
          <SelectValue placeholder="طريقة الدفع" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الطرق</SelectItem>
          <SelectItem value="cash">نقدي</SelectItem>
          <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
          <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
          <SelectItem value="cheque">شيك</SelectItem>
          <SelectItem value="received">مستلم</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-full lg:w-[140px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الترتيب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-desc">الأحدث أولاً</SelectItem>
          <SelectItem value="date-asc">الأقدم أولاً</SelectItem>
          <SelectItem value="amount-desc">الأعلى سعراً</SelectItem>
          <SelectItem value="amount-asc">الأقل سعراً</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

// ===== Empty State Component =====
const PaymentsEmptyState = () => (
  <div className="text-center py-16">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-6"
    >
      <Wallet className="w-12 h-12 text-teal-500" />
    </motion.div>
    <h3 className="text-xl font-bold text-neutral-900 mb-2">لا توجد دفعات</h3>
    <p className="text-neutral-500 max-w-md mx-auto">
      لم يتم تسجيل أي دفعات لهذا العقد بعد. ستظهر الدفعات هنا بمجرد إضافتها.
    </p>
  </div>
);

// ===== Main Component =====
export const ContractPaymentsTabRedesigned = ({
  contractId,
  companyId,
  invoiceIds,
  formatCurrency,
  contractNumber,
  customerInfo,
}: ContractPaymentsTabRedesignedProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Fetch payments with caching for better performance
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['contract-payments', contractId, showAllPayments, invoiceIds.join(',')],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_status,
          payment_method,
          reference_number,
          notes,
          created_at,
          invoice_id,
          contract_id,
          invoice:invoices!invoice_id(invoice_number)
        `)
        .eq('company_id', companyId);

      if (showAllPayments) {
        query = query.eq('contract_id', contractId);
      } else {
        if (!invoiceIds.length) return [];
        query = query.in('invoice_id', invoiceIds);
      }

      query = query.order('payment_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Payment[];
    },
    enabled: showAllPayments || invoiceIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Filter and sort payments
  const filteredAndSortedPayments = useMemo(() => {
    let filtered = [...payments];

    // Apply search filter
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.invoice?.invoice_number?.toLowerCase().includes(search) ||
        p.reference_number?.toLowerCase().includes(search) ||
        p.notes?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_status === statusFilter);
    }

    // Apply method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(p => p.payment_method === methodFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime();
        case 'date-asc':
          return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
        case 'amount-desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount-asc':
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [payments, searchQuery, statusFilter, methodFilter, sortOption]);

  // Mutation to cancel payment
  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!selectedPayment) {
        throw new Error('لم يتم تحديد الدفعة');
      }

      if (selectedPayment.invoice_id) {
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .select('id, total_amount, paid_amount')
          .eq('id', selectedPayment.invoice_id)
          .eq('company_id', companyId)
          .single();

        if (invoiceError || !invoice) {
          throw new Error('تعذر جلب بيانات الفاتورة لتحديثها');
        }

        const { paidAmount, balanceDue, paymentStatus } = calculateInvoiceTotalsAfterPaymentReversal({
          totalAmount: Number(invoice.total_amount) || 0,
          currentPaidAmount: Number(invoice.paid_amount) || 0,
          reversedAmount: Number(selectedPayment.amount) || 0,
        });

        const { error: updateInvoiceError } = await supabase
          .from('invoices')
          .update({
            paid_amount: paidAmount,
            balance_due: balanceDue,
            payment_status: paymentStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoice.id)
          .eq('company_id', companyId);

        if (updateInvoiceError) {
          throw new Error('فشل تحديث الفاتورة بعد إلغاء الدفعة');
        }
      }

      const { error } = await supabase
        .from('payments')
        .update({
          payment_status: 'cancelled',
          notes: (selectedPayment?.notes ? selectedPayment.notes + ' | ' : '') +
                 `تم الإلغاء في ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}`
        })
        .eq('id', paymentId)
        .eq('company_id', companyId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'تم إلغاء الدفعة',
        description: 'تم إلغاء الدفعة بنجاح وسيتم تحديث الفاتورة تلقائياً',
      });
      queryClient.invalidateQueries({ queryKey: ['contract-payments'] });
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      setIsCancelDialogOpen(false);
      setSelectedPayment(null);
    },
    onError: (error) => {
      toast({
        title: 'خطأ في إلغاء الدفعة',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCancelClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedPayment) {
      cancelPaymentMutation.mutate(selectedPayment.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-slate-500">
            <Loader2 className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-spin" />
            <p>جاري تحميل الدفعات...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Metrics Overview */}
        <PaymentMetrics payments={payments} formatCurrency={formatCurrency} />

        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 mb-1">سجل الدفعات</h2>
            <p className="text-neutral-500 text-sm">{payments.length} دفعة مسجلة</p>
          </div>

          <div className="flex items-center gap-3">
            {payments.filter(p => !p.invoice_id).length > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                {payments.filter(p => !p.invoice_id).length} غير مرتبطة
              </Badge>
            )}
            <Button
              variant="outline"
              onClick={() => {
                const completedPayments = payments.filter(p => p.payment_status === 'completed');
                if (completedPayments.length === 0) {
                  alert('لا توجد دفعات مكتملة للطباعة');
                  return;
                }

                const statementNumber = `PAY-${Date.now().toString().slice(-8)}`;
                const today = new Date();
                const currentDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

                const COMPANY_INFO = {
                  name_ar: 'شركة العراف لتأجير السيارات',
                  name_en: 'AL-ARAF CAR RENTAL L.L.C',
                  logo: '/receipts/logo.png',
                  address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
                  phone: '31411919',
                  email: 'info@alaraf.qa',
                  cr: '146832',
                };

                const totalPaid = completedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

                const printContent = `
                  <!DOCTYPE html>
                  <html dir="rtl" lang="ar">
                  <head>
                    <meta charset="UTF-8">
                    <title>كشف الدفعات - ${contractNumber || ''}</title>
                    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
                    <style>
                      @page {
                        size: A4;
                        margin: 15mm 20mm 20mm 20mm;
                      }
                      
                      @media print {
                        * {
                          -webkit-print-color-adjust: exact !important;
                          print-color-adjust: exact !important;
                          color-adjust: exact !important;
                        }
                        body { margin: 0; padding: 0; }
                        .statement-container {
                          width: 100% !important;
                          max-width: none !important;
                          margin: 0 !important;
                          padding: 15px 25px !important;
                          border: none !important;
                        }
                        .info-box, .grand-total, .signature-section {
                          page-break-inside: avoid !important;
                          break-inside: avoid !important;
                        }
                        .section-title {
                          page-break-after: avoid !important;
                          break-after: avoid !important;
                        }
                        table { page-break-inside: auto !important; }
                        tr { page-break-inside: avoid !important; break-inside: avoid !important; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                      }
                      
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      
                      body {
                        font-family: 'Traditional Arabic', 'Times New Roman', 'Arial', serif;
                        font-size: 14px;
                        line-height: 1.8;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 20px;
                        direction: rtl;
                      }
                      
                      .statement-container {
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 20px 30px;
                        background: #fff;
                      }
                      
                      .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        border-bottom: 3px double #1e3a5f;
                        padding-bottom: 15px;
                        margin-bottom: 15px;
                      }
                      
                      .company-ar {
                        flex: 1;
                        text-align: right;
                      }
                      
                      .company-ar h1 {
                        color: #1e3a5f;
                        margin: 0;
                        font-size: 20px;
                        font-weight: bold;
                      }
                      
                      .company-ar p {
                        color: #000;
                        margin: 2px 0;
                        font-size: 11px;
                      }
                      
                      .logo-container {
                        flex: 0 0 130px;
                        text-align: center;
                        padding: 0 15px;
                      }
                      
                      .logo-container img {
                        max-height: 70px;
                        max-width: 120px;
                      }
                      
                      .company-en {
                        flex: 1;
                        text-align: left;
                      }
                      
                      .company-en h1 {
                        color: #1e3a5f;
                        margin: 0;
                        font-size: 14px;
                        font-weight: bold;
                      }
                      
                      .company-en p {
                        color: #000;
                        margin: 2px 0;
                        font-size: 10px;
                      }
                      
                      .address-bar {
                        text-align: center;
                        color: #000;
                        font-size: 10px;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid #ccc;
                      }
                      
                      .ref-date {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                        font-size: 13px;
                        color: #000;
                      }
                      
                      .subject-box {
                        background: #1e3a5f;
                        color: #fff;
                        padding: 15px 20px;
                        margin-bottom: 20px;
                        font-size: 18px;
                        text-align: center;
                        font-weight: bold;
                        border: 2px solid #1e3a5f;
                      }
                      
                      .info-box {
                        background: #f5f5f5;
                        padding: 15px;
                        margin-bottom: 20px;
                        border-radius: 5px;
                        border-right: 4px solid #1e3a5f;
                      }
                      
                      .info-row {
                        display: flex;
                        justify-content: flex-start;
                        gap: 15px;
                        padding: 5px 0;
                        border-bottom: 1px dotted #ddd;
                      }
                      
                      .info-row:last-child { border-bottom: none; }
                      
                      .info-label {
                        font-weight: bold;
                        color: #1e3a5f;
                        min-width: 100px;
                      }
                      
                      .section-title {
                        font-size: 16px;
                        font-weight: bold;
                        color: #1e3a5f;
                        border-bottom: 2px solid #1e3a5f;
                        padding-bottom: 6px;
                        margin: 15px 0 10px 0;
                      }
                      
                      table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                        border: 1px solid #1e3a5f;
                      }
                      
                      th {
                        background: #1e3a5f;
                        color: white;
                        padding: 10px 8px;
                        text-align: right;
                        font-size: 12px;
                        font-weight: bold;
                        border: 1px solid #1e3a5f;
                      }
                      
                      td {
                        padding: 8px;
                        border: 1px solid #ccc;
                        font-size: 12px;
                      }
                      
                      tr:nth-child(even) { background: #f9f9f9; }
                      
                      .amount-cell {
                        font-weight: bold;
                        color: #1e3a5f;
                      }
                      
                      .method-cash { background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 3px; font-size: 10px; }
                      .method-bank { background: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 3px; font-size: 10px; }
                      .method-card { background: #f3e8ff; color: #7c3aed; padding: 3px 8px; border-radius: 3px; font-size: 10px; }
                      .method-cheque { background: #fef3c7; color: #d97706; padding: 3px 8px; border-radius: 3px; font-size: 10px; }
                      
                      .grand-total {
                        border: 3px double #1e3a5f;
                        padding: 15px;
                        margin: 15px 0;
                        text-align: center;
                      }
                      
                      .grand-total .label {
                        font-size: 14px;
                        margin-bottom: 8px;
                        color: #1e3a5f;
                        font-weight: bold;
                      }
                      
                      .grand-total .amount {
                        font-size: 26px;
                        font-weight: bold;
                        color: #1e3a5f;
                      }
                      
                      .signature-section {
                        margin-top: 25px;
                        padding-top: 15px;
                        border-top: 2px solid #1e3a5f;
                      }
                      
                      .signatures {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 30px;
                      }
                      
                      .signature-box {
                        text-align: center;
                        width: 180px;
                      }
                      
                      .sign-line {
                        border-top: 1px solid #000;
                        margin-top: 50px;
                        padding-top: 5px;
                        font-size: 12px;
                        color: #666;
                      }
                      
                      .stamp-area { text-align: center; }
                      
                      .stamp-placeholder {
                        display: inline-block;
                        width: 80px;
                        height: 80px;
                        border: 2px dashed #ccc;
                        border-radius: 50%;
                        line-height: 80px;
                        color: #999;
                        font-size: 11px;
                      }
                      
                      .footer {
                        text-align: center;
                        color: #000;
                        font-size: 10px;
                        margin-top: 30px;
                        padding-top: 15px;
                        border-top: 1px solid #ccc;
                      }
                    </style>
                  </head>
                  <body>
                    <div class="statement-container">
                      
                      <!-- رأسية الشركة -->
                      <div class="header">
                        <div class="company-ar">
                          <h1>${COMPANY_INFO.name_ar}</h1>
                          <p>ذ.م.م</p>
                          <p>س.ت: ${COMPANY_INFO.cr}</p>
                        </div>
                        
                        <div class="logo-container">
                          <img src="${COMPANY_INFO.logo}" alt="شعار الشركة" onerror="this.style.display='none'" />
                        </div>
                        
                        <div class="company-en" dir="ltr">
                          <h1>${COMPANY_INFO.name_en}</h1>
                          <p>C.R: ${COMPANY_INFO.cr}</p>
                        </div>
                      </div>
                      
                      <!-- العنوان -->
                      <div class="address-bar">
                        ${COMPANY_INFO.address}<br/>
                        هاتف: ${COMPANY_INFO.phone} | البريد الإلكتروني: ${COMPANY_INFO.email}
                      </div>
                      
                      <!-- التاريخ والرقم المرجعي -->
                      <div class="ref-date">
                        <div><strong>رقم الكشف:</strong> ${statementNumber}</div>
                        <div><strong>رقم العقد:</strong> ${contractNumber || '-'}</div>
                        <div><strong>التاريخ:</strong> ${currentDate}</div>
                      </div>
                      
                      <!-- الموضوع -->
                      <div class="subject-box">
                        كشف الدفعات المسجلة
                      </div>
                      
                      <!-- بيانات العميل -->
                      <div class="info-box">
                        <div class="info-row">
                          <span class="info-label">اسم العميل:</span>
                          <span>${customerInfo?.name || 'غير محدد'}</span>
                        </div>
                        ${customerInfo?.nationalId ? '<div class="info-row"><span class="info-label">رقم الهوية:</span><span>' + customerInfo.nationalId + '</span></div>' : ''}
                        ${customerInfo?.phone ? '<div class="info-row"><span class="info-label">رقم الهاتف:</span><span dir="ltr">' + customerInfo.phone + '</span></div>' : ''}
                      </div>
                      
                      <!-- الدفعات -->
                      <div class="section-title">الدفعات المسجلة (${completedPayments.length})</div>
                      <table>
                        <thead>
                          <tr>
                            <th style="width: 35px;">م</th>
                            <th>رقم الفاتورة</th>
                            <th>تاريخ الدفع</th>
                            <th>طريقة الدفع</th>
                            <th>رقم المرجع</th>
                            <th>المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${completedPayments.map((payment, idx) => {
                            const methodLabels: Record<string, { label: string; cssClass: string }> = {
                              cash: { label: 'نقدي', cssClass: 'method-cash' },
                              bank_transfer: { label: 'تحويل بنكي', cssClass: 'method-bank' },
                              credit_card: { label: 'بطاقة ائتمان', cssClass: 'method-card' },
                              cheque: { label: 'شيك', cssClass: 'method-cheque' },
                            };
                            const method = methodLabels[payment.payment_method] || { label: payment.payment_method || '-', cssClass: '' };
                            const paymentDate = payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : '-';
                            return '<tr>' +
                              '<td style="text-align: center;">' + (idx + 1) + '</td>' +
                              '<td>' + (payment.invoice?.invoice_number || '-') + '</td>' +
                              '<td>' + paymentDate + '</td>' +
                              '<td style="text-align: center;"><span class="' + method.cssClass + '">' + method.label + '</span></td>' +
                              '<td>' + (payment.reference_number || '-') + '</td>' +
                              '<td class="amount-cell">' + formatCurrency(payment.amount || 0) + '</td>' +
                            '</tr>';
                          }).join('')}
                        </tbody>
                        <tfoot>
                          <tr style="background: #1e3a5f; color: white;">
                            <td colspan="5" style="text-align: left; font-weight: bold; border-color: #1e3a5f;">الإجمالي</td>
                            <td style="font-weight: bold; border-color: #1e3a5f;">${formatCurrency(totalPaid)}</td>
                          </tr>
                        </tfoot>
                      </table>
                      
                      <!-- الإجمالي الكلي -->
                      <div class="grand-total">
                        <div class="label">إجمالي المبالغ المدفوعة</div>
                        <div class="amount">${formatCurrency(totalPaid)}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 10px;">
                          (${completedPayments.length} دفعة مسجلة)
                        </div>
                      </div>
                      
                      <!-- التوقيعات -->
                      <div class="signature-section">
                        <div class="signatures">
                          <div class="signature-box">
                            <div class="sign-line">توقيع العميل</div>
                          </div>
                          
                          <div class="stamp-area">
                            <div class="stamp-placeholder">الختم</div>
                          </div>
                          
                          <div class="signature-box">
                            <p style="font-weight: bold; color: #1e3a5f;">${COMPANY_INFO.name_ar}</p>
                            <div class="sign-line">التوقيع</div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- الذيل -->
                      <div class="footer">
                        ${COMPANY_INFO.address}<br/>
                        هاتف: ${COMPANY_INFO.phone} | البريد: ${COMPANY_INFO.email}
                      </div>
                      
                    </div>
                    
                    <script>
                      window.onload = function() { window.print(); }
                    </script>
                  </body>
                  </html>
                `;
                
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                  printWindow.document.write(printContent);
                  printWindow.document.close();
                }
              }}
              className="gap-2 rounded-xl"
            >
              <Printer className="w-4 h-4" />
              طباعة الدفعات
            </Button>
            <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2">
              <Label htmlFor="show-all-payments" className="text-sm cursor-pointer whitespace-nowrap">
                عرض الكل
              </Label>
              <Switch
                id="show-all-payments"
                checked={showAllPayments}
                onCheckedChange={setShowAllPayments}
              />
            </div>
          </div>
        </div>

        {/* Empty State */}
        {payments.length === 0 ? (
          <Card className="border-neutral-200">
            <CardContent className="p-6">
              <PaymentsEmptyState />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filters */}
            <PaymentFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              methodFilter={methodFilter}
              onMethodFilterChange={setMethodFilter}
              sortOption={sortOption}
              onSortChange={setSortOption}
            />

            {/* View Mode Toggle & Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-500">
                عرض {filteredAndSortedPayments.length} من {payments.length} دفعة
              </p>
            </div>

            {/* Payments Display */}
            {filteredAndSortedPayments.length === 0 ? (
              <Card className="border-neutral-200">
                <CardContent className="p-12 text-center">
                  <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">لا توجد نتائج</h3>
                  <p className="text-neutral-500">جرب تغيير معايير البحث</p>
                </CardContent>
              </Card>
            ) : viewMode === 'grid' ? (
              <motion.div
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {filteredAndSortedPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    formatCurrency={formatCurrency}
                    onCancel={() => handleCancelClick(payment)}
                  />
                ))}
              </motion.div>
            ) : (
              <Card className="border-neutral-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200">
                        <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الفاتورة / الطريقة</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">التاريخ</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">المبلغ</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الحالة</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">ملاحظات</th>
                        <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedPayments.map((payment) => (
                        <PaymentTableRow
                          key={payment.id}
                          payment={payment}
                          formatCurrency={formatCurrency}
                          onCancel={() => handleCancelClick(payment)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              تأكيد إلغاء الدفعة
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right space-y-2">
              <p>هل أنت متأكد من إلغاء هذه الدفعة؟</p>
              {selectedPayment && (
                <div className="bg-slate-50 rounded-lg p-3 mt-3 space-y-1 text-sm">
                  <p><strong>الفاتورة:</strong> {selectedPayment.invoice?.invoice_number || 'غير مرتبطة'}</p>
                  <p><strong>المبلغ:</strong> {formatCurrency(selectedPayment.amount)}</p>
                  <p><strong>التاريخ:</strong> {selectedPayment.payment_date ? format(new Date(selectedPayment.payment_date), 'dd/MM/yyyy') : '-'}</p>
                </div>
              )}
              <p className="text-amber-600 mt-3">
                ⚠️ سيتم تحديث الفاتورة المرتبطة تلقائياً
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={cancelPaymentMutation.isPending} className="rounded-xl">
              تراجع
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              disabled={cancelPaymentMutation.isPending}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
            >
              {cancelPaymentMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 ml-2" />
                  تأكيد الإلغاء
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
