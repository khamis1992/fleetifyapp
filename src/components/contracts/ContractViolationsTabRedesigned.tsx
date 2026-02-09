/**
 * Contract Violations Tab - Redesigned
 * Professional SaaS design matching ContractInvoicesTabRedesigned style
 *
 * @component ContractViolationsTabRedesigned
 */

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  MapPin,
  FileText,
  Image,
  Receipt,
  CreditCard,
  TrendingUp,
  Filter,
  Search,
  Plus,
  Eye,
  Download,
  MoreVertical,
  XCircle,
  Ban,
  Gavel,
  X,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
interface TrafficViolation {
  id: string;
  violation_date: string | null;
  violation_type: string | null;
  violation_number?: string;
  fine_amount: number | null;
  status: 'pending' | 'paid' | 'appealed' | 'cancelled';
  location?: string;
  description?: string;
  evidence_urls?: string[];
  payment_date?: string;
  created_at: string;
}

interface ContractViolationsTabRedesignedProps {
  violations: TrafficViolation[];
  formatCurrency: (amount: number) => string;
  contractNumber?: string;
  onAddViolation?: (violation: Partial<TrafficViolation>) => Promise<void>;
}

// ===== Helper Functions =====
const getViolationStatusInfo = (status: string) => {
  switch (status) {
    case 'paid':
      return {
        label: 'مسدد',
        variant: 'default' as const,
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200',
        iconBg: 'bg-green-500',
        icon: CheckCircle,
      };
    case 'appealed':
      return {
        label: 'معترض عليه',
        variant: 'secondary' as const,
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
        iconBg: 'bg-purple-500',
        icon: Gavel,
      };
    case 'cancelled':
      return {
        label: 'ملغي',
        variant: 'outline' as const,
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-500',
        borderColor: 'border-slate-200',
        iconBg: 'bg-slate-400',
        icon: Ban,
      };
    case 'pending':
    default:
      return {
        label: 'معلق',
        variant: 'destructive' as const,
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        iconBg: 'bg-red-500',
        icon: AlertCircle,
      };
  }
};

const getViolationTypeLabel = (type: string | null) => {
  if (!type) return 'غير محدد';
  const typeMap: Record<string, string> = {
    'speeding': 'تجاوز السرعة',
    'parking': 'مخالفة وقوف',
    'red_light': 'تجاوز إشارة',
    'seatbelt': 'عدم ربط حزام الأمان',
    'phone': 'استخدام الهاتف',
    'documents': 'مخالفة مستندات',
    'insurance': 'تأمين منتهي',
    'other': 'أخرى',
  };
  return typeMap[type] || type;
};

// ===== Metrics Cards Component =====
const ViolationsMetrics = ({
  violations,
  formatCurrency,
}: {
  violations: TrafficViolation[];
  formatCurrency: (amount: number) => string;
}) => {
  const metrics = useMemo(() => {
    const totalViolations = violations.length;
    const totalFines = violations.reduce((sum, v) => sum + (v.fine_amount || 0), 0);
    const paidFines = violations
      .filter(v => v.status === 'paid')
      .reduce((sum, v) => sum + (v.fine_amount || 0), 0);
    const pendingFines = totalFines - paidFines;

    const pendingCount = violations.filter(v => v.status === 'pending').length;
    const paidCount = violations.filter(v => v.status === 'paid').length;
    const appealedCount = violations.filter(v => v.status === 'appealed').length;

    return {
      totalViolations,
      totalFines,
      paidFines,
      pendingFines,
      pendingCount,
      paidCount,
      appealedCount,
      paymentPercentage: totalFines > 0 ? Math.round((paidFines / totalFines) * 100) : 0,
    };
  }, [violations]);

  const metricCards = [
    {
      title: 'إجمالي المخالفات',
      value: metrics.totalViolations.toString(),
      subtext: `${metrics.totalViolations} مخالفة`,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200/50',
    },
    {
      title: 'إجمالي الغرامات',
      value: formatCurrency(metrics.totalFines),
      subtext: `تم دفع ${metrics.paymentPercentage}%`,
      icon: DollarSign,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200/50',
    },
    {
      title: 'المعلقة',
      value: formatCurrency(metrics.pendingFines),
      subtext: `${metrics.pendingCount} مخالفة معلقة`,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200/50',
    },
    {
      title: 'المسددة',
      value: formatCurrency(metrics.paidFines),
      subtext: `${metrics.paidCount} مخالفة مسددة`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200/50',
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
            <div className={cn("px-2 py-1 rounded-lg text-xs font-medium", metric.bgColor, metric.textColor)}>
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

// ===== Violation Card Component =====
const ViolationCard = ({
  violation,
  formatCurrency,
  onView,
  onPay,
  onDownload,
  onCancel,
}: {
  violation: TrafficViolation;
  formatCurrency: (amount: number) => string;
  onView: () => void;
  onPay?: () => void;
  onDownload?: () => void;
  onCancel?: () => void;
}) => {
  const statusInfo = getViolationStatusInfo(violation.status);
  const StatusIcon = statusInfo.icon;

  const daysSince = violation.violation_date
    ? differenceInDays(new Date(), new Date(violation.violation_date))
    : null;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className={cn(
        "bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200",
        statusInfo.borderColor
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", statusInfo.iconBg)}>
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-neutral-900 text-lg">
                {violation.violation_number || `#${violation.id.slice(0, 8)}`}
              </h3>
              <Badge className={cn("text-xs", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
                <StatusIcon className="w-3 h-3 ml-1" />
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500">{getViolationTypeLabel(violation.violation_type)}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onView} className="gap-2">
              <Eye className="w-4 h-4" />
              <span>عرض التفاصيل</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تحميل PDF</span>
            </DropdownMenuItem>
            {violation.status === 'pending' && onPay && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onPay} className="gap-2 text-teal-600 focus:text-teal-600">
                  <CreditCard className="w-4 h-4" />
                  <span>دفع الغرامة</span>
                </DropdownMenuItem>
              </>
            )}
            {violation.status === 'pending' && onCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCancel} className="gap-2 text-red-600 focus:text-red-600">
                  <XCircle className="w-4 h-4" />
                  <span>إلغاء المخالفة</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Fine Amount */}
        <div className={cn("p-3 rounded-xl", statusInfo.bgColor)}>
          <p className="text-xs text-neutral-500 mb-1">قيمة الغرامة</p>
          <p className="text-xl font-bold text-neutral-900">{formatCurrency(violation.fine_amount || 0)}</p>
        </div>

        {/* Date */}
        <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
          <p className="text-xs text-neutral-500 mb-1">تاريخ المخالفة</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-neutral-900" dir="ltr">
              {violation.violation_date ? format(new Date(violation.violation_date), 'dd MMM yyyy', { locale: ar }) : '-'}
            </p>
            {daysSince !== null && daysSince > 30 && violation.status === 'pending' && (
              <Badge variant="outline" className="text-xs border-red-200 text-red-600">
                منذ {daysSince} يوم
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2 mb-4">
        {violation.location && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <MapPin className="w-4 h-4" />
            <span>{violation.location}</span>
          </div>
        )}
        {violation.description && (
          <div className="flex items-start gap-2 text-sm text-neutral-600">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{violation.description}</span>
          </div>
        )}
      </div>

      {/* Evidence */}
      {violation.evidence_urls && violation.evidence_urls.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4">
          <Image className="w-4 h-4 text-slate-500" />
          <span className="text-sm text-neutral-600">{violation.evidence_urls.length} مستند داعم</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 gap-2 rounded-xl"
        >
          <Eye className="w-4 h-4" />
          <span>التفاصيل</span>
        </Button>
        {violation.status === 'pending' && onPay && (
          <Button
            size="sm"
            onClick={onPay}
            className="flex-1 gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg rounded-xl"
          >
            <CreditCard className="w-4 h-4" />
            <span>دفع</span>
          </Button>
        )}
      </div>
    </motion.div>
  );
};

// ===== Violation Table Row Component =====
const ViolationTableRow = ({
  violation,
  formatCurrency,
  onView,
  onPay,
  onCancel,
}: {
  violation: TrafficViolation;
  formatCurrency: (amount: number) => string;
  onView: () => void;
  onPay?: () => void;
  onCancel?: () => void;
}) => {
  const statusInfo = getViolationStatusInfo(violation.status);
  const StatusIcon = statusInfo.icon;

  return (
    <tr className="hover:bg-neutral-50 transition-colors border-b border-neutral-100">
      {/* Violation Number */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusInfo.iconBg)}>
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-neutral-900">
              {violation.violation_number || `#${violation.id.slice(0, 8)}`}
            </p>
            <p className="text-xs text-neutral-500">{getViolationTypeLabel(violation.violation_type)}</p>
          </div>
        </div>
      </td>

      {/* Date */}
      <td className="py-4 px-4">
        <p className="text-sm text-neutral-900" dir="ltr">
          {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
        </p>
      </td>

      {/* Location */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          {violation.location ? (
            <>
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{violation.location}</span>
            </>
          ) : (
            '-'
          )}
        </div>
      </td>

      {/* Amount */}
      <td className="py-4 px-4">
        <p className="font-semibold text-neutral-900">{formatCurrency(violation.fine_amount || 0)}</p>
        {violation.status === 'paid' && violation.payment_date && (
          <p className="text-xs text-green-600" dir="ltr">
            دفع: {format(new Date(violation.payment_date), 'dd/MM/yyyy')}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="py-4 px-4">
        <Badge className={cn("gap-1.5", statusInfo.bgColor, statusInfo.textColor, "border-0")}>
          <StatusIcon className="w-3 h-3" />
          {statusInfo.label}
        </Badge>
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onView}
            className="h-8 px-3 rounded-lg"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {violation.status === 'pending' && onPay && (
            <Button
              size="sm"
              onClick={onPay}
              className="h-8 px-3 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-md rounded-lg"
            >
              <CreditCard className="w-4 h-4 ml-1" />
              دفع
            </Button>
          )}
          {violation.status === 'pending' && onCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="h-8 px-3 rounded-lg border-red-200 text-red-600 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
};

// ===== Filter Bar Component =====
const ViolationsFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
}) => (
  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white rounded-xl p-4 border border-neutral-200">
    <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          placeholder="بحث برقم المخالفة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 rounded-xl border-neutral-200"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 w-full sm:w-auto">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px] rounded-xl border-neutral-200">
          <SelectValue placeholder="الحالة" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="pending">معلق</SelectItem>
          <SelectItem value="paid">مسدد</SelectItem>
          <SelectItem value="appealed">معترض عليه</SelectItem>
          <SelectItem value="cancelled">ملغي</SelectItem>
        </SelectContent>
      </Select>

      <Select value={sortOption} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-[160px] rounded-xl border-neutral-200">
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
const ViolationsEmptyState = () => (
  <div className="text-center py-16">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mx-auto mb-6"
    >
      <CheckCircle className="w-12 h-12 text-green-500" />
    </motion.div>
    <h3 className="text-xl font-bold text-neutral-900 mb-2">لا توجد مخالفات</h3>
    <p className="text-neutral-500 max-w-md mx-auto">
      هذا العقد خالٍ من المخالفات المرورية. سجل مخالفة جديدة عند الحاجة.
    </p>
  </div>
);

// ===== Violation Details Dialog Component =====
interface ViolationDetailsDialogProps {
  violation: TrafficViolation | null;
  open: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  onPay?: () => void;
}

const ViolationDetailsDialog = ({
  violation,
  open,
  onClose,
  formatCurrency,
  onPay,
}: ViolationDetailsDialogProps) => {
  if (!violation) return null;

  const statusInfo = getViolationStatusInfo(violation.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5" />
            تفاصيل المخالفة المرورية
          </DialogTitle>
          <DialogDescription>
            معلومات تفصيلية عن المخالفة والإجراءات المتاحة
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-180px)]">
          <div className="space-y-4 pr-4">
            {/* Status Banner */}
            <div className={cn("p-4 rounded-xl border", statusInfo.bgColor, statusInfo.borderColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusInfo.iconBg)}>
                    <StatusIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900">{statusInfo.label}</p>
                    <p className="text-sm text-neutral-600">حالة المخالفة</p>
                  </div>
                </div>
                {violation.status === 'pending' && onPay && (
                  <Button onClick={onPay} className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600">
                    <CreditCard className="w-4 h-4" />
                    دفع الغرامة
                  </Button>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  المعلومات الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">رقم المخالفة</p>
                    <p className="font-semibold text-neutral-900">
                      {violation.violation_number || `#${violation.id.slice(0, 8)}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">نوع المخالفة</p>
                    <p className="font-semibold text-neutral-900">
                      {getViolationTypeLabel(violation.violation_type)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">تاريخ المخالفة</p>
                    <p className="font-semibold text-neutral-900" dir="ltr">
                      {violation.violation_date
                        ? format(new Date(violation.violation_date), 'dd MMM yyyy', { locale: ar })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">قيمة الغرامة</p>
                    <p className="font-bold text-xl text-teal-600">
                      {formatCurrency(violation.fine_amount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  التفاصيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {violation.location && (
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">الموقع</p>
                    <p className="text-sm text-neutral-900">{violation.location}</p>
                  </div>
                )}
                {violation.description && (
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">الوصف</p>
                    <p className="text-sm text-neutral-900 bg-neutral-50 p-3 rounded-lg">
                      {violation.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence */}
            {violation.evidence_urls && violation.evidence_urls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    المستندات الداعمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {violation.evidence_urls.map((url, index) => (
                      <Badge key={index} variant="outline" className="gap-1">
                        <Image className="w-3 h-3" />
                        مستند {index + 1}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Information */}
            {violation.status === 'paid' && violation.payment_date && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    معلومات الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">تاريخ الدفع</p>
                      <p className="font-semibold text-neutral-900" dir="ltr">
                        {format(new Date(violation.payment_date), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    </div>
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      تم الدفع
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
          {violation.status === 'pending' && onPay && (
            <Button onClick={onPay} className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600">
              <CreditCard className="w-4 h-4" />
              دفع الغرامة
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== Violation Payment Dialog Component =====
interface ViolationPaymentDialogProps {
  violation: TrafficViolation | null;
  open: boolean;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  onPaymentComplete: (violationId: string) => void;
}

const ViolationPaymentDialog = ({
  violation,
  open,
  onClose,
  formatCurrency,
  onPaymentComplete,
}: ViolationPaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  if (!violation) return null;

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Show success message
      toast({
        title: 'تم الدفع بنجاح',
        description: `تم دفع غرامة المخالفة ${violation.violation_number || `#${violation.id.slice(0, 8)}`} بنجاح`,
      });

      // Call payment complete callback
      onPaymentComplete(violation.id);
      onClose();
    } catch (error) {
      toast({
        title: 'خطأ في الدفع',
        description: 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-5 w-5 text-teal-600" />
            دفع الغرامة المرورية
          </DialogTitle>
          <DialogDescription>
            تأكيد دفع غرامة المخالفة المرورية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Violation Summary */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-neutral-900">
                  {violation.violation_number || `#${violation.id.slice(0, 8)}`}
                </p>
                <p className="text-sm text-neutral-600">
                  {getViolationTypeLabel(violation.violation_type)}
                </p>
                <p className="text-xs text-neutral-500 mt-1" dir="ltr">
                  {violation.violation_date
                    ? format(new Date(violation.violation_date), 'dd MMM yyyy', { locale: ar })
                    : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="text-center py-4">
            <p className="text-sm text-neutral-500 mb-1">المبلغ المطلوب</p>
            <p className="text-3xl font-bold text-teal-600">
              {formatCurrency(violation.fine_amount || 0)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-base">طريقة الدفع</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="اختر طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="card">بطاقة ائتمان</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Note */}
          {paymentMethod === 'bank_transfer' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              يرجى تحويل المبلغ إلى الحساب البنكي التالي وإرفاق إيصال التحويل
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            إلغاء
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                تأكيد الدفع
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== Add Violation Dialog Component =====
interface AddViolationDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (violation: Partial<TrafficViolation>) => void;
}

const AddViolationDialog = ({ open, onClose, onAdd }: AddViolationDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    violation_number: '',
    violation_type: 'speeding',
    violation_date: new Date().toISOString().split('T')[0],
    fine_amount: '',
    location: '',
    description: '',
  });

  const handleSubmit = async () => {
    if (!formData.fine_amount || parseFloat(formData.fine_amount) <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        violation_number: formData.violation_number || undefined,
        violation_type: formData.violation_type,
        violation_date: formData.violation_date,
        fine_amount: parseFloat(formData.fine_amount),
        location: formData.location || undefined,
        description: formData.description || undefined,
        status: 'pending',
      });
      
      // Reset form
      setFormData({
        violation_number: '',
        violation_type: 'speeding',
        violation_date: new Date().toISOString().split('T')[0],
        fine_amount: '',
        location: '',
        description: '',
      });
      
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-teal-600" />
            إضافة مخالفة مرورية
          </DialogTitle>
          <DialogDescription>
            إضافة مخالفة مرورية جديدة للعقد
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Violation Number */}
          <div className="space-y-2">
            <Label>رقم المخالفة (اختياري)</Label>
            <Input
              placeholder="مثال: TR-2024-12345"
              value={formData.violation_number}
              onChange={(e) => setFormData({ ...formData, violation_number: e.target.value })}
              className="rounded-xl"
            />
          </div>

          {/* Violation Type */}
          <div className="space-y-2">
            <Label>نوع المخالفة</Label>
            <Select value={formData.violation_type} onValueChange={(value) => setFormData({ ...formData, violation_type: value })}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="speeding">تجاوز السرعة</SelectItem>
                <SelectItem value="parking">مخالفة وقوف</SelectItem>
                <SelectItem value="red_light">تجاوز إشارة</SelectItem>
                <SelectItem value="seatbelt">عدم ربط حزام الأمان</SelectItem>
                <SelectItem value="phone">استخدام الهاتف</SelectItem>
                <SelectItem value="documents">مخالفة مستندات</SelectItem>
                <SelectItem value="insurance">تأمين منتهي</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تاريخ المخالفة</Label>
              <Input
                type="date"
                value={formData.violation_date}
                onChange={(e) => setFormData({ ...formData, violation_date: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>قيمة الغرامة (ر.ق) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.fine_amount}
                onChange={(e) => setFormData({ ...formData, fine_amount: e.target.value })}
                className="rounded-xl"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>الموقع (اختياري)</Label>
            <Input
              placeholder="مثال: شارع الكورنيش، الدوحة"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="rounded-xl"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Input
              placeholder="أي ملاحظات إضافية..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.fine_amount || parseFloat(formData.fine_amount) <= 0}
            className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الإضافة...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                إضافة المخالفة
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== Main Component =====
export const ContractViolationsTabRedesigned = ({
  violations,
  formatCurrency,
  contractNumber,
  onAddViolation,
}: ContractViolationsTabRedesignedProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Dialog states
  const [selectedViolation, setSelectedViolation] = useState<TrafficViolation | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAddViolationDialogOpen, setIsAddViolationDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter and sort violations
  const filteredAndSortedViolations = useMemo(() => {
    let filtered = [...violations];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(v =>
        v.violation_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.violation_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => v.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.violation_date || 0).getTime() - new Date(a.violation_date || 0).getTime();
        case 'date-asc':
          return new Date(a.violation_date || 0).getTime() - new Date(b.violation_date || 0).getTime();
        case 'amount-desc':
          return (b.fine_amount || 0) - (a.fine_amount || 0);
        case 'amount-asc':
          return (a.fine_amount || 0) - (b.fine_amount || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [violations, searchQuery, statusFilter, sortOption]);

  const handleViewViolation = (violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsViewDialogOpen(true);
  };

  const handlePayViolation = (violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsPaymentDialogOpen(true);
  };

  const handleDownloadPDF = () => {
    toast({
      title: 'قريباً',
      description: 'سيتم إضافة ميزة تحميل PDF قريباً',
    });
  };

  const handlePaymentComplete = (violationId: string) => {
    // In a real implementation, this would update the violation in the database
    // For now, we'll just show a success message and close the dialog
    toast({
      title: 'تم التحديث',
      description: 'تم تحديث حالة المخالفة بنجاح',
    });
    setIsPaymentDialogOpen(false);
    setSelectedViolation(null);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedViolation(null);
  };

  const handleClosePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setSelectedViolation(null);
  };

  const handlePayFromViewDialog = () => {
    setIsViewDialogOpen(false);
    setIsPaymentDialogOpen(true);
  };

  const handleAddViolation = async (violation: Partial<TrafficViolation>) => {
    if (!onAddViolation) {
      toast({
        title: 'خطأ',
        description: 'وظيفة إضافة المخالفة غير متاحة',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onAddViolation(violation);
      toast({
        title: 'تمت الإضافة بنجاح',
        description: 'تم إضافة المخالفة المرورية بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ في الإضافة',
        description: 'حدث خطأ أثناء إضافة المخالفة. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCancelViolation = (violation: TrafficViolation) => {
    setSelectedViolation(violation);
    setIsCancelDialogOpen(true);
  };

  const confirmCancelViolation = async () => {
    if (!selectedViolation) return;

    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('traffic_violations')
        .update({ 
          status: 'cancelled',
          notes: selectedViolation.notes 
            ? `${selectedViolation.notes}\n\n[ملغاة بتاريخ ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}]`
            : `[ملغاة بتاريخ ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}]`
        })
        .eq('id', selectedViolation.id);

      if (error) throw error;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contract-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });

      toast({
        title: 'تم الإلغاء',
        description: 'تم إلغاء المخالفة بنجاح',
      });

      setIsCancelDialogOpen(false);
      setSelectedViolation(null);
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل إلغاء المخالفة',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <ViolationsMetrics violations={violations} formatCurrency={formatCurrency} />

      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 mb-1">المخالفات المرورية</h2>
          <p className="text-neutral-500 text-sm">
            {contractNumber ? `العقد #${contractNumber} • ` : ''}
            {violations.length} مخالفة
          </p>
        </div>
        <Button
          onClick={() => setIsAddViolationDialogOpen(true)}
          className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          إضافة مخالفة
        </Button>
      </div>

      {/* Empty State */}
      {violations.length === 0 ? (
        <Card className="border-neutral-200">
          <CardContent className="p-6">
            <ViolationsEmptyState />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <ViolationsFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortOption={sortOption}
            onSortChange={setSortOption}
          />

          {/* View Mode Toggle & Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-500">
              عرض {filteredAndSortedViolations.length} من {violations.length} مخالفة
            </p>
            <div className="flex items-center gap-2 bg-neutral-100 p-1 rounded-xl">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'grid' ? "bg-white shadow-sm" : ""
                )}
              >
                <AlertTriangle className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'table' ? "bg-white shadow-sm" : ""
                )}
              >
                <FileText className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Violations Display */}
          {filteredAndSortedViolations.length === 0 ? (
            <Card className="border-neutral-200">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">لا توجد نتائج</h3>
                <p className="text-neutral-500">جرب تغيير filters البحث</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredAndSortedViolations.map((violation) => (
                <ViolationCard
                  key={violation.id}
                  violation={violation}
                  formatCurrency={formatCurrency}
                  onView={() => handleViewViolation(violation)}
                  onPay={() => handlePayViolation(violation)}
                  onDownload={handleDownloadPDF}
                  onCancel={() => handleCancelViolation(violation)}
                />
              ))}
            </motion.div>
          ) : (
            <Card className="border-neutral-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">رقم المخالفة</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">التاريخ</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الموقع</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الغرامة</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الحالة</th>
                      <th className="py-3 px-4 text-right text-sm font-semibold text-neutral-700">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedViolations.map((violation) => (
                      <ViolationTableRow
                        key={violation.id}
                        violation={violation}
                        formatCurrency={formatCurrency}
                        onView={() => handleViewViolation(violation)}
                        onPay={() => handlePayViolation(violation)}
                        onCancel={() => handleCancelViolation(violation)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Dialogs */}
      <ViolationDetailsDialog
        violation={selectedViolation}
        open={isViewDialogOpen}
        onClose={handleCloseViewDialog}
        formatCurrency={formatCurrency}
        onPay={selectedViolation?.status === 'pending' ? handlePayFromViewDialog : undefined}
      />

      <ViolationPaymentDialog
        violation={selectedViolation}
        open={isPaymentDialogOpen}
        onClose={handleClosePaymentDialog}
        formatCurrency={formatCurrency}
        onPaymentComplete={handlePaymentComplete}
      />

      <AddViolationDialog
        open={isAddViolationDialogOpen}
        onClose={() => setIsAddViolationDialogOpen(false)}
        onAdd={handleAddViolation}
      />

      {/* Cancel Violation Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              إلغاء المخالفة
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء هذه المخالفة؟
            </DialogDescription>
          </DialogHeader>

          {selectedViolation && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-600">رقم المخالفة</span>
                <span className="font-semibold">{selectedViolation.violation_number || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-600">المبلغ</span>
                <span className="font-semibold text-red-600">{formatCurrency(selectedViolation.fine_amount || 0)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg">
                <span className="text-sm text-neutral-600">النوع</span>
                <span className="font-medium">{getViolationTypeLabel(selectedViolation.violation_type || '')}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCancelDialogOpen(false);
                setSelectedViolation(null);
              }}
              disabled={isCancelling}
            >
              رجوع
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmCancelViolation}
              disabled={isCancelling}
              className="gap-2"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  تأكيد الإلغاء
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
