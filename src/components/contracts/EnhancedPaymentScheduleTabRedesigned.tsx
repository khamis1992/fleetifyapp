/**
 * مكون جدول الدفعات المحسّن - تصميم محسّن V2
 * Professional SaaS design with improved visual hierarchy
 * Timeline view, progress tracking, and modern card-based layout
 *
 * @component EnhancedPaymentScheduleTabRedesigned
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { calculateContractTotalAmount } from '@/utils/contractCalculations';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Bell,
  Timer,
} from 'lucide-react';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Contract } from '@/types/contracts';

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
type PaymentStatus = 'all' | 'paid' | 'pending' | 'overdue' | 'upcoming';

interface Invoice {
  id: string;
  total_amount?: number;
  paid_amount?: number;
  balance_due?: number;
  payment_status?: string;
}

interface EnhancedPaymentScheduleTabRedesignedProps {
  contract: Contract;
  formatCurrency: (amount: number) => string;
  payments?: any[];
  onGenerateSchedules?: () => void;
  hasInvoices?: boolean;
  invoices?: Invoice[];
}

// ===== Helper Functions =====
const getPaymentStatusInfo = (status: string) => {
  switch (status) {
    case 'paid':
      return {
        label: 'مدفوع',
        variant: 'default' as const,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-500',
        icon: CheckCircle,
      };
    case 'overdue':
      return {
        label: 'متأخر',
        variant: 'destructive' as const,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        iconBg: 'bg-red-500',
        icon: AlertTriangle,
      };
    case 'pending':
      return {
        label: 'معلق',
        variant: 'secondary' as const,
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        iconBg: 'bg-amber-500',
        icon: Clock,
      };
    case 'partially_paid':
      return {
        label: 'جزئي',
        variant: 'secondary' as const,
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        iconBg: 'bg-blue-500',
        icon: Timer,
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

// ===== Metrics Cards Component =====
const ScheduleMetrics = ({
  stats,
  formatCurrency,
}: {
  stats: any;
  formatCurrency: (amount: number) => string;
}) => {
  const metricCards = [
    {
      title: 'إجمالي القيمة',
      value: formatCurrency(stats.totalAmount),
      subtext: `${stats.totalPayments || 0} قسط`,
      icon: Wallet,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200/50',
    },
    {
      title: 'المدفوع',
      value: formatCurrency(stats.totalPaid),
      subtext: `${stats.paidCount || 0} قسط • ${stats.progressPercentage || 0}%`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200/50',
      progress: stats.progressPercentage || 0,
    },
    {
      title: 'المتبقي',
      value: formatCurrency(stats.balanceDue),
      subtext: `${stats.pendingCount || 0} قسط معلق`,
      icon: Clock,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200/50',
    },
    {
      title: 'المتأخر',
      value: formatCurrency(stats.overdueAmount || 0),
      subtext: `${stats.overdueCount || 0} قسط متأخر`,
      icon: AlertTriangle,
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
          {metric.progress !== undefined && (
            <div className="mt-3">
              <Progress value={metric.progress} className="h-2" />
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

// ===== Schedule Card Component =====
const ScheduleCard = ({
  payment,
  index,
  formatCurrency,
  onView,
}: {
  payment: any;
  index: number;
  formatCurrency: (amount: number) => string;
  onView: () => void;
}) => {
  const statusInfo = getPaymentStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  const isOverdue = payment.due_date && isPast(new Date(payment.due_date)) && payment.status !== 'paid';
  const daysUntilDue = payment.due_date ? differenceInDays(new Date(payment.due_date), new Date()) : null;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className={cn(
        "bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200",
        statusInfo.borderColor,
        isOverdue && "border-red-300 bg-red-50/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
            isOverdue ? "bg-gradient-to-br from-red-500 to-red-600" : "bg-gradient-to-br from-teal-500 to-teal-600"
          )}>
            <span className="text-white font-bold text-lg">{index + 1}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-neutral-900">القسط {payment.installment_number || index + 1}</h3>
              <Badge className={cn("text-xs gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </Badge>
            </div>
            {payment.payment_number && (
              <p className="text-sm text-neutral-500">{payment.payment_number}</p>
            )}
          </div>
        </div>

        {isOverdue && (
          <Badge className="bg-red-100 text-red-700 border-0 gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            متأخر {Math.abs(daysUntilDue || 0)} يوم
          </Badge>
        )}
      </div>

      {/* Amount Display */}
      <div className={cn(
        "p-4 rounded-xl mb-4",
        payment.status === 'paid' ? "bg-green-50 border border-green-200" :
        isOverdue ? "bg-red-50 border border-red-200" :
        "bg-teal-50 border border-teal-200"
      )}>
        <p className="text-xs text-neutral-600 mb-1">المبلغ المستحق</p>
        <p className="text-2xl font-bold text-neutral-900">{formatCurrency(payment.amount || payment.total_amount || 0)}</p>
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-neutral-600">
            <Calendar className="w-4 h-4" />
            <span>تاريخ الاستحقاق</span>
          </div>
          <span className={cn(
            "font-medium",
            isOverdue ? "text-red-600" : "text-neutral-900"
          )} dir="ltr">
            {payment.due_date ? format(new Date(payment.due_date), 'dd MMM yyyy', { locale: ar }) : '-'}
          </span>
        </div>

        {payment.payment_date && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-neutral-600">
              <CheckCircle className="w-4 h-4" />
              <span>تاريخ الدفع</span>
            </div>
            <span className="font-medium text-green-600" dir="ltr">
              {format(new Date(payment.payment_date), 'dd MMM yyyy', { locale: ar })}
            </span>
          </div>
        )}

        {daysUntilDue !== null && !isOverdue && payment.status !== 'paid' && (
          <div className={cn(
            "flex items-center justify-between text-sm p-2 rounded-lg",
            daysUntilDue <= 3 ? "bg-amber-50" : "bg-slate-50"
          )}>
            <div className="flex items-center gap-2 text-neutral-600">
              <Clock className="w-4 h-4" />
              <span>متبقي</span>
            </div>
            <span className={cn(
              "font-medium",
              daysUntilDue <= 3 ? "text-amber-600" : "text-neutral-900"
            )}>
              {daysUntilDue} يوم
            </span>
          </div>
        )}
      </div>

      {/* Action */}
      <Button
        variant="outline"
        size="sm"
        onClick={onView}
        className="w-full gap-2 rounded-xl"
      >
        <Eye className="w-4 h-4" />
        عرض التفاصيل
      </Button>
    </motion.div>
  );
};

// ===== Timeline Component =====
const PaymentTimeline = ({
  payments,
  formatCurrency,
}: {
  payments: any[];
  formatCurrency: (amount: number) => string;
}) => {
  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute right-[19px] top-0 bottom-0 w-0.5 bg-neutral-200" />

      <div className="space-y-4">
        {payments.map((payment, index) => {
          const statusInfo = getPaymentStatusInfo(payment.status);
          const StatusIcon = statusInfo.icon;
          const isPaid = payment.status === 'paid';
          const isOverdue = payment.due_date && isPast(new Date(payment.due_date)) && payment.status !== 'paid';

          return (
            <motion.div
              key={payment.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex gap-4"
            >
              {/* Timeline Dot */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center z-10 flex-shrink-0",
                isPaid ? "bg-green-500" : isOverdue ? "bg-red-500" : "bg-neutral-300"
              )}>
                <StatusIcon className="w-5 h-5 text-white" />
              </div>

              {/* Content */}
              <div className={cn(
                "flex-1 p-4 rounded-xl border",
                isPaid ? "bg-green-50 border-green-200" :
                isOverdue ? "bg-red-50 border-red-200" :
                "bg-white border-neutral-200"
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-neutral-900">القسط {payment.installment_number || index + 1}</h4>
                    <p className="text-sm text-neutral-500" dir="ltr">
                      {payment.due_date ? format(new Date(payment.due_date), 'dd MMM yyyy', { locale: ar }) : '-'}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-neutral-900">
                    {formatCurrency(payment.amount || payment.total_amount || 0)}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={cn("gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>

                  {payment.payment_date && isPaid && (
                    <span className="text-xs text-green-600" dir="ltr">
                      تم الدفع في {format(new Date(payment.payment_date), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ===== Filter Bar Component =====
const ScheduleFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: PaymentStatus;
  onStatusFilterChange: (value: PaymentStatus) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
}) => (
  <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-white rounded-xl p-4 border border-neutral-200">
    <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="بحث في الأقساط..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 rounded-xl border-neutral-200"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 w-full lg:w-auto">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full lg:w-[140px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="paid">مدفوع</SelectItem>
          <SelectItem value="pending">معلق</SelectItem>
          <SelectItem value="overdue">متأخر</SelectItem>
          <SelectItem value="upcoming">قادم</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-full lg:w-[140px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الترتيب" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date-asc">الأقرب أولاً</SelectItem>
          <SelectItem value="date-desc">الأبعد أولاً</SelectItem>
          <SelectItem value="amount-desc">الأعلى سعراً</SelectItem>
          <SelectItem value="amount-asc">الأقل سعراً</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
);

// ===== Empty State Component =====
const ScheduleEmptyState = ({
  hasInvoices,
  onGenerate,
}: {
  hasInvoices?: boolean;
  onGenerate?: () => void;
}) => (
  <div className="text-center py-16">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center mx-auto mb-6"
    >
      <Calendar className="w-12 h-12 text-teal-500" />
    </motion.div>
    <h3 className="text-xl font-bold text-neutral-900 mb-2">لا يوجد جدول دفعات</h3>
    <p className="text-neutral-500 mb-6 max-w-md mx-auto">
      {hasInvoices
        ? 'يمكنك إنشاء جدول الدفعات تلقائياً من الفواتير المرتبطة بالعقد.'
        : 'لم يتم إعداد جدول دفعات لهذا العقد بعد.'}
    </p>
    {hasInvoices && onGenerate && (
      <Button
        onClick={onGenerate}
        className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl"
      >
        <RefreshCw className="w-4 h-4" />
        إنشاء جدول الدفعات
      </Button>
    )}
  </div>
);

// ===== Main Component =====
export const EnhancedPaymentScheduleTabRedesigned = ({
  contract,
  formatCurrency,
  payments = [],
  onGenerateSchedules,
  hasInvoices,
  invoices = [],
}: EnhancedPaymentScheduleTabRedesignedProps) => {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [searchText, setSearchText] = useState('');
  const [sortOption, setSortOption] = useState('date-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');

  // Calculate stats - using invoices for consistency with other tabs
  const stats = useMemo(() => {
    const totalAmount = calculateContractTotalAmount(contract);
    // حساب المدفوع من الفواتير (نفس مصدر البيانات المستخدم في التبويبات الأخرى)
    const totalPaidFromInvoices = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const totalPaid = invoices.length > 0 ? totalPaidFromInvoices : (contract.total_paid || 0);
    const balanceDue = Math.max(0, totalAmount - totalPaid);
    const paidCount = payments.filter((p) => p.status === 'paid').length;
    const pendingCount = payments.filter((p) => p.status === 'pending').length;
    const overdueCount = payments.filter((p) => p.status === 'overdue').length;
    const overdueAmount = payments
      .filter((p) => p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount || p.total_amount || 0), 0);

    return {
      totalAmount,
      totalPaid,
      balanceDue,
      paidCount,
      pendingCount,
      overdueCount,
      overdueAmount,
      totalPayments: payments.length,
      progressPercentage: totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0,
    };
  }, [contract, payments, invoices]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = [...payments];

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((p) => {
        if (selectedStatus === 'paid') return p.status === 'paid';
        if (selectedStatus === 'pending') return p.status === 'pending';
        if (selectedStatus === 'overdue') return p.status === 'overdue';
        if (selectedStatus === 'upcoming') {
          const dueDate = p.due_date ? new Date(p.due_date) : null;
          return dueDate && isFuture(dueDate) && p.status !== 'paid';
        }
        return true;
      });
    }

    // Search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((p) => {
        return (
          p.payment_number?.toLowerCase().includes(search) ||
          p.reference_number?.toLowerCase().includes(search) ||
          (p.installment_number && p.installment_number.toString().includes(search))
        );
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime();
        case 'date-desc':
          return new Date(b.due_date || 0).getTime() - new Date(a.due_date || 0).getTime();
        case 'amount-desc':
          return (b.amount || b.total_amount || 0) - (a.amount || a.total_amount || 0);
        case 'amount-asc':
          return (a.amount || a.total_amount || 0) - (b.amount || b.total_amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [payments, selectedStatus, searchText, sortOption]);

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <ScheduleMetrics stats={stats} formatCurrency={formatCurrency} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">جدول الدفعات</h2>
          <p className="text-neutral-500 text-sm">{payments.length} قسط مسجل</p>
        </div>

        {hasInvoices && onGenerateSchedules && payments.length === 0 && (
          <Button
            onClick={onGenerateSchedules}
            className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
            إنشاء جدول الدفعات
          </Button>
        )}
      </div>

      {/* Empty State */}
      {payments.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <ScheduleEmptyState
              hasInvoices={hasInvoices}
              onGenerate={onGenerateSchedules}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <ScheduleFilters
            searchQuery={searchText}
            onSearchChange={setSearchText}
            statusFilter={selectedStatus}
            onStatusFilterChange={setSelectedStatus}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              عرض {filteredPayments.length} من {payments.length} قسط
            </p>
            <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
              <Button
                size="sm"
                variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'timeline' ? "bg-white shadow-sm" : ""
                )}
              >
                <Calendar className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'grid' ? "bg-white shadow-sm" : ""
                )}
              >
                <Wallet className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* No Results */}
          {filteredPayments.length === 0 ? (
            <Card className="border-neutral-200">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">لا توجد نتائج</h3>
                <p className="text-neutral-500">جرب تغيير معايير البحث</p>
              </CardContent>
            </Card>
          ) : viewMode === 'timeline' ? (
            /* Timeline View */
            <Card className="border-neutral-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  الجدول الزمني للدفعات
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <PaymentTimeline payments={filteredPayments} formatCurrency={formatCurrency} />
              </CardContent>
            </Card>
          ) : (
            /* Grid View */
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredPayments.map((payment, index) => (
                <ScheduleCard
                  key={payment.id || index}
                  payment={payment}
                  index={index}
                  formatCurrency={formatCurrency}
                  onView={() => console.log('View payment:', payment)}
                />
              ))}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
