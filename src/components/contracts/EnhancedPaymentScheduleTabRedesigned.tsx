/**
 * مكون جدول الدفعات المحسّن - تصميم محسّن V2
 * Professional SaaS design with improved visual hierarchy
 * Timeline view, progress tracking, and modern card-based layout
 *
 * @component EnhancedPaymentScheduleTabRedesigned
 */

import { useState, useMemo } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Search,
  Filter,
  Eye,
  RefreshCw,
  Bell,
  Timer,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ContractFinancialSnapshot } from './contract-details-v3/tokens';
import { contractBusinessDate, type ScheduleSettlement } from '@/utils/contractScheduleSettlement';

// ===== Animation Variants =====
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// ===== Types =====
type PaymentStatus = 'all' | 'paid' | 'pending' | 'overdue' | 'upcoming' | 'partially_paid' | 'review';
type ScheduleStats = {
  totalAmount: number; schedulesTotal: number; totalPaid: number; balanceDue: number;
  paidCount: number; pendingCount: number; overdueCount: number; overdueAmount: number;
  totalPayments: number; progressPercentage: number; partialCount: number; reviewCount: number;
};
const daysFromBusinessDate = (day: string) => differenceInDays(new Date(`${day}T00:00:00Z`), new Date(`${contractBusinessDate()}T00:00:00Z`));

interface EnhancedPaymentScheduleTabRedesignedProps {
  formatCurrency: (amount: number) => string;
  onGenerateSchedules?: () => void;
  hasInvoices?: boolean;
  snapshot: ContractFinancialSnapshot;
}

// ===== Helper Functions =====
const getPaymentStatusInfo = (status: string) => {
  switch (status) {
    case 'paid':
      return {
        label: 'مدفوع',
        variant: 'default' as const,
        bgColor: 'bg-[#ECFDF9]',
        textColor: 'text-[#0E9E7E]',
        borderColor: 'border-[#22C7A1]/30',
        iconBg: 'bg-[#22C7A1]',
        icon: CheckCircle,
      };
    case 'overdue':
      return {
        label: 'متأخر',
        variant: 'destructive' as const,
        bgColor: 'bg-[#FFF5F6]',
        textColor: 'text-[#BE123C]',
        borderColor: 'border-[#FB6B7A]/30',
        iconBg: 'bg-[#FB6B7A]',
        icon: AlertTriangle,
      };
    case 'pending':
      return {
        label: 'معلق',
        variant: 'secondary' as const,
        bgColor: 'bg-[#FFFBEB]',
        textColor: 'text-[#B45309]',
        borderColor: 'border-[#F59E0B]/30',
        iconBg: 'bg-[#F59E0B]',
        icon: Clock,
      };
    case 'partially_paid':
      return {
        label: 'جزئي',
        variant: 'secondary' as const,
        bgColor: 'bg-[#F0F9FF]',
        textColor: 'text-[#0369A1]',
        borderColor: 'border-[#38BDF8]/30',
        iconBg: 'bg-[#38BDF8]',
        icon: Timer,
      };
    case 'review':
      return { label: 'يحتاج مطابقة', variant: 'secondary' as const, bgColor: 'bg-[#FFFBEB]', textColor: 'text-[#B45309]',
        borderColor: 'border-[#F59E0B]/30', iconBg: 'bg-[#F59E0B]', icon: AlertTriangle };
    default:
      return {
        label: status,
        variant: 'secondary' as const,
        bgColor: 'bg-[#F6F8FB]',
        textColor: 'text-slate-500',
        borderColor: 'border-[#E5EAF1]',
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
  stats: ScheduleStats;
  formatCurrency: (amount: number) => string;
}) => {
  const metricCards = [
    {
      title: 'قيمة العقد',
      value: formatCurrency(stats.totalAmount),
      subtext: `جدول الأقساط: ${formatCurrency(stats.schedulesTotal || 0)}`,
      icon: Wallet,
      tintBg: 'bg-[#EEF2FF]',
      iconColor: 'text-[#4F46E5]',
      badgeBg: 'bg-[#EEF2FF]',
      badgeText: 'text-[#4F46E5]',
    },
    {
      title: 'المدفوع',
      value: formatCurrency(stats.totalPaid),
      subtext: `${stats.paidCount || 0} قسط • ${stats.progressPercentage || 0}%`,
      badge: `${stats.progressPercentage || 0}%`,
      icon: CheckCircle,
      tintBg: 'bg-[#ECFDF9]',
      iconColor: 'text-[#0E9E7E]',
      badgeBg: 'bg-[#ECFDF9]',
      badgeText: 'text-[#0E9E7E]',
      progress: stats.progressPercentage || 0,
    },
    {
      title: 'المتبقي',
      value: formatCurrency(stats.balanceDue),
      subtext: `${stats.pendingCount || 0} قسط معلق`,
      icon: Clock,
      tintBg: 'bg-[#FFFBEB]',
      iconColor: 'text-[#B45309]',
      badgeBg: 'bg-[#FFFBEB]',
      badgeText: 'text-[#B45309]',
    },
    {
      title: 'المتأخر',
      value: formatCurrency(stats.overdueAmount || 0),
      subtext: `${stats.overdueCount || 0} قسط متأخر`,
      icon: AlertTriangle,
      tintBg: 'bg-[#FFF5F6]',
      iconColor: 'text-[#BE123C]',
      badgeBg: 'bg-[#FFF5F6]',
      badgeText: 'text-[#BE123C]',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {metricCards.map((metric, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          className="rounded-2xl border border-[#E5EAF1] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", metric.tintBg, metric.iconColor)}>
              <metric.icon className="h-4 w-4" />
            </div>
            <div className={cn("px-2 py-1 rounded-lg text-[11px] font-bold", metric.badgeBg, metric.badgeText)}>
              {metric.badge ?? metric.subtext.split(' • ')[0]}
            </div>
          </div>
          <p className="text-base font-black text-[#0F172A] mb-1">{metric.value}</p>
          <p className="text-[11px] font-bold text-slate-500">
            {metric.title}
            {metric.subtext.includes(' • ') ? ` — ${metric.subtext.split(' • ')[1]}` : ''}
          </p>
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

const ScheduleFocusPanel = ({
  stats,
  payments,
  selectedStatus,
  onStatusChange,
  formatCurrency,
}: {
  stats: ScheduleStats;
  payments: ScheduleSettlement[];
  selectedStatus: PaymentStatus;
  onStatusChange: (value: PaymentStatus) => void;
  formatCurrency: (amount: number) => string;
}) => {
  const nextPayment = useMemo(() => {
    return [...payments]
      .filter((payment) => payment.remaining_amount !== null && payment.remaining_amount > 0 && payment.due_date)
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))[0];
  }, [payments]);

  const nextDueDays = nextPayment?.due_date
    ? daysFromBusinessDate(nextPayment.due_date)
    : null;

  const statusItems: Array<{
    value: PaymentStatus;
    label: string;
    count: number;
    icon: typeof CheckCircle;
  }> = [
    { value: 'all', label: 'الكل', count: payments.length, icon: Filter },
    { value: 'paid', label: 'مدفوع', count: stats.paidCount || 0, icon: CheckCircle },
    { value: 'pending', label: 'معلق', count: stats.pendingCount || 0, icon: Clock },
    { value: 'overdue', label: 'متأخر', count: stats.overdueCount || 0, icon: AlertTriangle },
    { value: 'partially_paid', label: 'جزئي', count: stats.partialCount, icon: Timer },
    { value: 'review', label: 'يحتاج مطابقة', count: stats.reviewCount, icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-2xl border border-[#E5EAF1] bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-500">نسبة تحصيل قيمة العقد</p>
            <div className="mt-2 flex items-end gap-3">
              <span className="text-4xl font-black text-[#0F172A]">
                {stats.progressPercentage || 0}%
              </span>
              <span className="pb-1 text-sm text-slate-500">
                {stats.paidCount || 0} من {stats.totalPayments || 0} قسط
              </span>
            </div>
          </div>

          <div className="min-w-[240px] rounded-xl border border-[#E5EAF1] bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-[#0F172A]">المتبقي للتحصيل</span>
              <span className="font-black text-[#4F46E5]">{formatCurrency(stats.balanceDue || 0)}</span>
            </div>
            <Progress value={stats.progressPercentage || 0} className="mt-3 h-2" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {statusItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedStatus === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onStatusChange(item.value)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-3 text-right transition-colors",
                  isActive
                    ? "border-[#7C83F6] bg-[#EEF2FF] text-[#4F46E5]"
                    : "border-[#E5EAF1] bg-white text-slate-500 hover:border-[#7C83F6]"
                )}
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </span>
                <span className="rounded-lg bg-white px-2 py-1 text-xs font-black">{item.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E5EAF1] bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-500">
              {nextDueDays !== null && nextDueDays < 0 ? 'أقدم قسط غير مسدد' : 'القسط القادم'}
            </p>
            {nextPayment ? (
              <>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xl font-black text-[#0F172A]">
                    {formatCurrency(nextPayment.remaining_amount || 0)}
                  </p>
                  <Badge className={cn(
                    "border-0",
                    nextDueDays !== null && nextDueDays < 0
                      ? "bg-[#FFF5F6] text-[#BE123C]"
                      : nextDueDays !== null && nextDueDays <= 3
                        ? "bg-[#FFFBEB] text-[#B45309]"
                        : "bg-[#EEF2FF] text-[#4F46E5]"
                  )}>
                    {nextDueDays !== null && nextDueDays < 0
                      ? `متأخر ${Math.abs(nextDueDays)} يوم`
                      : nextDueDays === 0
                        ? 'مستحق اليوم'
                        : `بعد ${nextDueDays} يوم`}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500" dir="ltr">
                  {nextPayment.due_date ? format(new Date(nextPayment.due_date), 'dd MMM yyyy', { locale: ar }) : '-'}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">{stats.reviewCount > 0 ? 'توجد أقساط تحتاج مطابقة قبل تحديد القسط المستحق.' : 'لا توجد أقساط مفتوحة حالياً.'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Schedule Card Component =====
const ScheduleCard = ({
  payment,
  index,
  formatCurrency,
  onView,
}: {
  payment: ScheduleSettlement;
  index: number;
  formatCurrency: (amount: number) => string;
  onView: () => void;
}) => {
  const statusInfo = getPaymentStatusInfo(payment.status);
  const StatusIcon = statusInfo.icon;

  const isOverdue = payment.is_overdue;
  const daysUntilDue = payment.due_date ? daysFromBusinessDate(payment.due_date) : null;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] transition-colors",
        statusInfo.borderColor,
        isOverdue && "border-[#FB6B7A]/40 bg-[#FFF5F6]/40"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-md",
            isOverdue ? "bg-[#FB6B7A]" : "bg-[#7C83F6]"
          )}>
            <span className="text-white font-bold text-lg">{index + 1}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-black text-[#0F172A]">القسط {payment.installment_number || index + 1}</h3>
              <Badge className={cn("text-xs gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
                <StatusIcon className="w-3 h-3" />
                {statusInfo.label}
              </Badge>
            </div>
            {payment.payment_number && (
              <p className="text-sm text-slate-500">{payment.payment_number}</p>
            )}
          </div>
        </div>

        {isOverdue && (
          <Badge className="bg-[#FFF5F6] text-[#BE123C] border-0 gap-1.5">
            <AlertTriangle className="w-3 h-3" />
            متأخر {Math.abs(daysUntilDue || 0)} يوم
          </Badge>
        )}
      </div>

      {/* Amount Display */}
      <div className={cn(
        "p-4 rounded-xl mb-4",
        payment.status === 'paid' ? "bg-[#ECFDF9] border border-[#22C7A1]/30" :
        isOverdue ? "bg-[#FFF5F6] border border-[#FB6B7A]/30" :
        "border border-[#E5EAF1] bg-[#F6F8FB]"
      )}>
        <p className="text-xs text-slate-500 mb-1">المتبقي من القسط</p>
        <p className="text-2xl font-black text-[#0F172A]">{payment.remaining_amount === null ? 'بانتظار المطابقة' : formatCurrency(payment.remaining_amount)}</p>
        <p className="mt-1 text-sm">قيمة القسط: {Number.isFinite(payment.amount) ? formatCurrency(Number(payment.amount)) : 'غير محددة'} • المسدد: {payment.paid_amount === null ? 'غير محدد' : formatCurrency(payment.paid_amount)}</p>
        {payment.settlement_review_reason && <p className="mt-2 text-sm text-amber-800">{payment.settlement_review_reason}</p>}
      </div>

      {/* Dates */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar className="w-4 h-4" />
            <span>تاريخ الاستحقاق</span>
          </div>
          <span className={cn(
            "font-medium",
            isOverdue ? "text-[#BE123C]" : "text-[#0F172A]"
          )} dir="ltr">
            {payment.due_date ? format(new Date(payment.due_date), 'dd MMM yyyy', { locale: ar }) : '-'}
          </span>
        </div>

        {daysUntilDue !== null && !isOverdue && payment.remaining_amount !== null && payment.remaining_amount > 0 && (
          <div className={cn(
            "flex items-center justify-between text-sm p-2 rounded-lg",
            daysUntilDue <= 3 ? "bg-[#FFFBEB]" : "bg-[#F6F8FB]"
          )}>
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-4 h-4" />
              <span>متبقي</span>
            </div>
            <span className={cn(
              "font-medium",
              daysUntilDue <= 3 ? "text-[#B45309]" : "text-[#0F172A]"
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
  payments: ScheduleSettlement[];
  formatCurrency: (amount: number) => string;
}) => {
  return (
    <div className="space-y-3">
      <div className="hidden rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3 text-sm font-bold text-slate-500 md:grid md:grid-cols-[92px_1.1fr_1fr_1fr] md:items-center md:gap-4">
        <span>القسط</span>
        <span>تاريخ الاستحقاق</span>
        <span>المبلغ</span>
        <span>حالة التحصيل</span>
      </div>

      <div className="space-y-2">
        {payments.map((payment, index) => {
          const statusInfo = getPaymentStatusInfo(payment.status);
          const StatusIcon = statusInfo.icon;
          const isPaid = payment.status === 'paid';
          const isOverdue = payment.is_overdue;

          return (
            <motion.div
              key={payment.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "grid grid-cols-1 gap-4 rounded-2xl border bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] transition-colors md:grid-cols-[92px_1.1fr_1fr_1fr] md:items-center",
                isPaid ? "border-[#22C7A1]/30" : isOverdue ? "border-[#FB6B7A]/40 bg-[#FFF5F6]/40" : "border-[#E5EAF1]"
              )}
            >
              {/* Timeline Dot */}
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                isPaid ? "bg-[#22C7A1]" : isOverdue ? "bg-[#FB6B7A]" : "bg-[#7C83F6]"
              )}>
                <StatusIcon className="w-5 h-5 text-white" />
              </div>

              {/* Content */}
              <div className={cn(
                "grid gap-4 md:col-span-3 md:grid-cols-[1.1fr_1fr_1fr] md:items-center"
              )}>
                <div className="min-w-0">
                  <div>
                    <h4 className="font-bold text-[#0F172A]">القسط {payment.installment_number || index + 1}</h4>
                    <p className="text-sm text-slate-500" dir="ltr">
                      {payment.due_date ? format(new Date(payment.due_date), 'dd MMM yyyy', { locale: ar }) : '-'}
                    </p>
                  </div>
                  <p className="text-lg font-black text-[#0F172A]">
                    المتبقي: {payment.remaining_amount === null ? 'بانتظار المطابقة' : formatCurrency(payment.remaining_amount)}
                  </p>
                  <p className="text-sm text-slate-500">قيمة القسط: {Number.isFinite(payment.amount) ? formatCurrency(Number(payment.amount)) : 'غير محددة'} • المسدد: {payment.paid_amount === null ? 'غير محدد' : formatCurrency(payment.paid_amount)}</p>
                  {payment.settlement_review_reason && <p className="mt-2 text-sm text-amber-800">{payment.settlement_review_reason}</p>}
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={cn("gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
                    <StatusIcon className="w-3 h-3" />
                    {statusInfo.label}
                  </Badge>

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
  <div className="flex flex-col gap-3 rounded-2xl border border-[#E5EAF1] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="بحث في الأقساط..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="rounded-xl border-[#E5EAF1] bg-white pr-10"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 w-full lg:w-auto">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full rounded-xl border-[#E5EAF1] bg-white lg:w-[140px]">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="paid">مدفوع</SelectItem>
          <SelectItem value="pending">معلق</SelectItem>
          <SelectItem value="overdue">متأخر</SelectItem>
          <SelectItem value="upcoming">قادم</SelectItem>
          <SelectItem value="partially_paid">جزئي</SelectItem>
          <SelectItem value="review">يحتاج مطابقة</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-full rounded-xl border-[#E5EAF1] bg-white lg:w-[140px]">
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
      className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF2FF]"
    >
      <Calendar className="h-8 w-8 text-[#4F46E5]" />
    </motion.div>
    <h3 className="text-xl font-black text-[#0F172A] mb-2">لا يوجد جدول دفعات</h3>
    <p className="text-slate-500 mb-6 max-w-md mx-auto">
      {hasInvoices
        ? 'يمكنك إنشاء جدول الدفعات تلقائياً من الفواتير المرتبطة بالعقد.'
        : 'لم يتم إعداد جدول دفعات لهذا العقد بعد.'}
    </p>
    {hasInvoices && onGenerate && (
      <Button
        onClick={onGenerate}
        className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#0E9E7E]"
      >
        <RefreshCw className="w-4 h-4" />
        إنشاء جدول الدفعات
      </Button>
    )}
  </div>
);

// ===== Main Component =====
export const EnhancedPaymentScheduleTabRedesigned = ({
  formatCurrency,
  onGenerateSchedules,
  hasInvoices,
  snapshot,
}: EnhancedPaymentScheduleTabRedesignedProps) => {
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus>('all');
  const [searchText, setSearchText] = useState('');
  const [sortOption, setSortOption] = useState('date-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('timeline');
  const [selectedScheduleReference, setSelectedSchedule] = useState<ScheduleSettlement | null>(null);
  const visiblePayments = snapshot.activeSchedules;
  const selectedSchedule = visiblePayments.find((row) => selectedScheduleReference?.id
    ? row.id === selectedScheduleReference.id
    : row === selectedScheduleReference) || null;

  // الإحصاءات تعتمد اللقطة المالية المركزية نفسها المستخدمة في رأس الصفحة.
  const stats = useMemo((): ScheduleStats => {
    const totalAmount = snapshot.contractTotal;
    const totalPaid = snapshot.paidTotal;
    const balanceDue = snapshot.remainingTotal;
    const paidCount = snapshot.paidSchedulesCount;
    const pendingCount = snapshot.activeSchedules.filter((p) => p.status === 'pending').length;
    const overdueCount = snapshot.activeSchedules.filter((p) => p.is_overdue).length;
    const overdueAmount = snapshot.activeSchedules
      .filter((p) => p.is_overdue)
      .reduce((sum, p) => sum + Number(p.remaining_amount || 0), 0);

    return {
      totalAmount,
      schedulesTotal: snapshot.schedulesTotal,
      totalPaid,
      balanceDue,
      paidCount,
      pendingCount,
      overdueCount,
      overdueAmount: Math.round(overdueAmount * 100) / 100,
      totalPayments: snapshot.totalSchedulesCount,
      partialCount: visiblePayments.filter((p) => p.status === 'partially_paid').length,
      reviewCount: visiblePayments.filter((p) => p.status === 'review').length,
      progressPercentage: totalAmount > 0 ? Math.min(balanceDue > 0 ? 99 : 100, Math.floor((totalPaid / totalAmount) * 100)) : 0,
    };
  }, [snapshot, visiblePayments]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    let filtered = [...visiblePayments];

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((p) => {
        if (selectedStatus === 'paid') return p.status === 'paid';
        if (selectedStatus === 'pending') return p.status === 'pending';
        if (selectedStatus === 'overdue') return p.is_overdue;
        if (selectedStatus === 'partially_paid') return p.status === 'partially_paid';
        if (selectedStatus === 'review') return p.status === 'review';
        if (selectedStatus === 'upcoming') {
          return p.due_date && p.due_date > contractBusinessDate() && p.remaining_amount !== null && p.remaining_amount > 0;
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

    // Sort — rows without a valid due date (always status 'review') sort last
    // in both date orders instead of jumping to the top of the default view.
    filtered.sort((a, b) => {
      const timeA = a.due_date ? new Date(a.due_date).getTime() : Number.POSITIVE_INFINITY;
      const timeB = b.due_date ? new Date(b.due_date).getTime() : Number.POSITIVE_INFINITY;
      switch (sortOption) {
        case 'date-asc':
          return timeA - timeB;
        case 'date-desc':
          return timeB - timeA;
        case 'amount-desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount-asc':
          return (a.amount || 0) - (b.amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [visiblePayments, selectedStatus, searchText, sortOption]);

  return (
    <div className="space-y-5">
      {(stats.reviewCount > 0 || snapshot.financialReviewRequired) && (
        <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          حالات التحصيل محسوبة من الدفعات المثبتة. توجد أرصدة أو روابط تحتاج مطابقة؛ الأقساط غير محددة السداد لا تدخل في إجمالي المتأخر المثبت، ولا يعني ذلك أنها مسددة.
        </div>
      )}
      {/* Metrics Overview */}
      <ScheduleMetrics stats={stats} formatCurrency={formatCurrency} />

      <ScheduleFocusPanel
        stats={stats}
        payments={visiblePayments}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        formatCurrency={formatCurrency}
      />

      {(snapshot.outOfPeriodSchedulesCount > 0 || snapshot.outOfPeriodInvoicesCount > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-[#FB6B7A]/35 bg-[#FFF5F6] p-4 text-sm text-[#9F1239]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            تم استبعاد {snapshot.outOfPeriodSchedulesCount + snapshot.outOfPeriodInvoicesCount} سجل مالي خارج مدة العقد من الملخص والجدول. راجعه قبل إنشاء الفواتير.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#E5EAF1] bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mb-1 text-xl font-black text-[#0F172A]">جدول الدفعات</h2>
          <p className="text-slate-500 text-sm">{visiblePayments.length} قسط للمتابعة والمطابقة</p>
        </div>

        {hasInvoices && onGenerateSchedules && visiblePayments.length === 0 && (
          <Button
            onClick={onGenerateSchedules}
            className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#0E9E7E]"
          >
            <RefreshCw className="w-4 h-4" />
            إنشاء جدول الدفعات
          </Button>
        )}
      </div>

      {/* Empty State */}
      {visiblePayments.length === 0 ? (
        <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
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
            <p className="text-sm text-slate-500">
              عرض {filteredPayments.length} من {visiblePayments.length} قسط
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[#E5EAF1] bg-white p-1">
              <Button
                size="sm"
                aria-label="عرض زمني للأقساط"
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
                aria-label="عرض بطاقات الأقساط"
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
            <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-[#0F172A] mb-2">لا توجد نتائج</h3>
                <p className="text-slate-500">جرب تغيير معايير البحث</p>
              </CardContent>
            </Card>
          ) : viewMode === 'timeline' ? (
            /* Timeline View */
            <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0E9E7E]" />
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
                  onView={() => setSelectedSchedule(payment)}
                />
              ))}
            </motion.div>
          )}
        </>
      )}
      <Dialog open={Boolean(selectedSchedule)} onOpenChange={(open) => { if (!open) setSelectedSchedule(null); }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل القسط {selectedSchedule?.installment_number || ''}</DialogTitle>
            <DialogDescription>حساب للعرض من الفاتورة ودفعاتها المثبتة، دون تعديل بيانات العقد الأصلية.</DialogDescription>
          </DialogHeader>
          {selectedSchedule && <div className="space-y-3 text-sm">
            <p>الحالة: {getPaymentStatusInfo(selectedSchedule.status).label}</p>
            <p>المسدد: {selectedSchedule.paid_amount === null ? 'غير محدد' : formatCurrency(selectedSchedule.paid_amount)}</p>
            <p>المتبقي: {selectedSchedule.remaining_amount === null ? 'غير محدد' : formatCurrency(selectedSchedule.remaining_amount)}</p>
            <p>مرجع الفاتورة: {selectedSchedule.invoice_id || 'غير مرتبط'}</p>
            {selectedSchedule.settlement_review_reason && <p role="alert">{selectedSchedule.settlement_review_reason}</p>}
          </div>}
        </DialogContent>
      </Dialog>
    </div>
  );
};
