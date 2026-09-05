/**
 * Contract Violations Tab - Redesigned
 * Professional SaaS design matching the Fleetify light design language
 *
 * @component ContractViolationsTabRedesigned
 */

import { useMemo, useRef, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  FileText,
  Image,
  CreditCard,
  Search,
  Plus,
  Eye,
  Download,
  MoreVertical,
  XCircle,
  Ban,
  Gavel,
  Loader2,
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
import { useCreateTrafficViolationPayment } from '@/hooks/useTrafficViolationPayments';

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
export interface TrafficViolation {
  id: string;
  violation_date: string | null;
  violation_type: string | null;
  violation_number?: string | null;
  fine_amount: number | null;
  status: string;
  location?: string | null;
  description?: string | null;
  notes?: string | null;
  evidence_urls?: string[];
  payment_date?: string | null;
  responsibility_party?: 'customer' | 'company' | 'under_review' | 'cancelled' | string;
  responsibility_reason?: string | null;
  original_contract_number?: string | null;
  liability_amount?: number | null;
  liability_journal_entry_id?: string | null;
  manual_request_id?: string | null;
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
        chipBg: 'bg-[#22C7A1]/10',
        chipText: 'text-[#0E9E7E]',
        chipBorder: 'border-[#22C7A1]/30',
        iconBg: 'bg-[#ECFDF9] text-[#0E9E7E] border border-[#22C7A1]/30',
        icon: CheckCircle,
      };
    case 'appealed':
      return {
        label: 'معترض عليه',
        chipBg: 'bg-[#7C83F6]/10',
        chipText: 'text-[#4F46E5]',
        chipBorder: 'border-[#7C83F6]/30',
        iconBg: 'bg-[#EEF2FF] text-[#4F46E5] border border-[#7C83F6]/30',
        icon: Gavel,
      };
    case 'cancelled':
      return {
        label: 'ملغي',
        chipBg: 'bg-slate-100',
        chipText: 'text-slate-500',
        chipBorder: 'border-slate-200',
        iconBg: 'bg-slate-100 text-slate-500 border border-slate-200',
        icon: Ban,
      };
    case 'pending':
    default:
      return {
        label: 'معلق',
        chipBg: 'bg-[#F59E0B]/10',
        chipText: 'text-[#B45309]',
        chipBorder: 'border-[#F59E0B]/30',
        iconBg: 'bg-[#FFFBEB] text-[#B45309] border border-[#F59E0B]/30',
        icon: Clock,
      };
  }
};

const getResponsibilityInfo = (party?: string | null) => {
  switch (party) {
    case 'customer':
      return {
        label: 'محولة للعميل',
        chipBg: 'bg-[#7C83F6]/10',
        chipText: 'text-[#4F46E5]',
        chipBorder: 'border-[#7C83F6]/30',
      };
    case 'company':
      return {
        label: 'على الشركة',
        chipBg: 'bg-[#22C7A1]/10',
        chipText: 'text-[#0E9E7E]',
        chipBorder: 'border-[#22C7A1]/30',
      };
    case 'under_review':
      return {
        label: 'قيد المراجعة',
        chipBg: 'bg-[#F59E0B]/10',
        chipText: 'text-[#B45309]',
        chipBorder: 'border-[#F59E0B]/30',
      };
    default:
      return null;
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

// ===== Summary Strip Component =====
const ViolationsSummary = ({
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
    const unpaidFines = totalFines - paidFines;
    const unpaidCount = violations.filter(v => v.status !== 'paid' && v.status !== 'cancelled').length;

    return { totalViolations, totalFines, paidFines, unpaidFines, unpaidCount };
  }, [violations]);

  const tiles = [
    {
      label: 'عدد المخالفات',
      value: metrics.totalViolations.toString(),
      icon: AlertTriangle,
      tint: 'bg-[#7C83F6]/10',
      iconColor: 'text-[#4F46E5]',
      border: 'border-[#7C83F6]/20',
    },
    {
      label: 'إجمالي الغرامات',
      value: formatCurrency(metrics.totalFines),
      icon: DollarSign,
      tint: 'bg-[#38BDF8]/10',
      iconColor: 'text-[#0369A1]',
      border: 'border-[#38BDF8]/20',
    },
    {
      label: 'غير المسدد',
      value: formatCurrency(metrics.unpaidFines),
      icon: AlertCircle,
      tint: 'bg-[#FB6B7A]/10',
      iconColor: 'text-[#BE123C]',
      border: 'border-[#FB6B7A]/20',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-1 gap-3 sm:grid-cols-3"
    >
      {tiles.map((tile, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          whileHover={{ y: -2 }}
          className={cn(
            "flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]",
            tile.border
          )}
        >
          <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg", tile.tint)}>
            <tile.icon className={cn("h-5 w-5", tile.iconColor)} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500">{tile.label}</p>
            <p className="truncate text-base font-black text-[#0F172A]">{tile.value}</p>
          </div>
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
  const responsibility = getResponsibilityInfo(violation.responsibility_party);

  const daysSince = violation.violation_date
    ? differenceInDays(new Date(), new Date(violation.violation_date))
    : null;

  return (
    <motion.div
      variants={scaleIn}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-[#E5EAF1] bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)] transition-colors hover:border-[#22C7A1]/40"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", statusInfo.iconBg)}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-[#0F172A]">
                {violation.violation_number || `#${violation.id.slice(0, 8)}`}
              </h3>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black", statusInfo.chipBg, statusInfo.chipText, statusInfo.chipBorder)}>
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
              {responsibility && (
                <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-black", responsibility.chipBg, responsibility.chipText, responsibility.chipBorder)}>
                  {responsibility.label}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{getViolationTypeLabel(violation.violation_type)}</p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onView} className="gap-2">
              <Eye className="h-4 w-4" />
              <span>عرض التفاصيل</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.();
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span>تحميل PDF</span>
            </DropdownMenuItem>
            {violation.status === 'pending' && onPay && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onPay} className="gap-2 text-[#0E9E7E] focus:text-[#0E9E7E]">
                  <CreditCard className="h-4 w-4" />
                  <span>دفع الغرامة</span>
                </DropdownMenuItem>
              </>
            )}
            {violation.status === 'pending' && onCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCancel} className="gap-2 text-[#BE123C] focus:text-[#BE123C]">
                  <XCircle className="h-4 w-4" />
                  <span>إلغاء المخالفة</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Details Grid */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={cn("rounded-xl border p-3", statusInfo.chipBorder, statusInfo.chipBg)}>
          <p className="mb-1 text-[11px] font-bold text-slate-500">قيمة الغرامة</p>
          <p className="text-lg font-black text-[#0F172A]">{formatCurrency(violation.fine_amount || 0)}</p>
        </div>

        <div className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FB] p-3">
          <p className="mb-1 text-[11px] font-bold text-slate-500">تاريخ المخالفة</p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[#0F172A]" dir="ltr">
              {violation.violation_date ? format(new Date(violation.violation_date), 'dd MMM yyyy', { locale: ar }) : '-'}
            </p>
            {daysSince !== null && daysSince > 30 && violation.status === 'pending' && (
              <span className="rounded-full border border-[#FB6B7A]/30 bg-[#FB6B7A]/10 px-2 py-0.5 text-[10px] font-black text-[#BE123C]">
                منذ {daysSince} يوم
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mb-4 space-y-2">
        {violation.location && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            <span>{violation.location}</span>
          </div>
        )}
        {violation.description && (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
            <span className="line-clamp-2">{violation.description}</span>
          </div>
        )}
      </div>

      {/* Evidence */}
      {violation.evidence_urls && violation.evidence_urls.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-3">
          <Image className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-600">{violation.evidence_urls.length} مستند داعم</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-t border-[#E5EAF1] pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 gap-2 rounded-xl"
        >
          <Eye className="h-4 w-4" />
          <span>التفاصيل</span>
        </Button>
        {violation.status === 'pending' && onPay && (
          <Button
            size="sm"
            onClick={onPay}
            className="flex-1 gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]"
          >
            <CreditCard className="h-4 w-4" />
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
  const responsibility = getResponsibilityInfo(violation.responsibility_party);

  return (
    <tr className="border-b border-[#E5EAF1] transition-colors hover:bg-[#F6F8FB]">
      {/* Violation Number */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", statusInfo.iconBg)}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-[#0F172A]">
              {violation.violation_number || `#${violation.id.slice(0, 8)}`}
            </p>
            <p className="text-xs text-slate-500">{getViolationTypeLabel(violation.violation_type)}</p>
          </div>
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-4">
        <p className="text-sm text-[#0F172A]" dir="ltr">
          {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
        </p>
      </td>

      {/* Location */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          {violation.location ? (
            <>
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="line-clamp-1">{violation.location}</span>
            </>
          ) : (
            '-'
          )}
        </div>
      </td>

      {/* Amount */}
      <td className="px-4 py-4">
        <p className="font-bold text-[#0F172A]">{formatCurrency(violation.fine_amount || 0)}</p>
        {violation.status === 'paid' && violation.payment_date && (
          <p className="text-xs text-[#0E9E7E]" dir="ltr">
            دفع: {format(new Date(violation.payment_date), 'dd/MM/yyyy')}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-4">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black", statusInfo.chipBg, statusInfo.chipText, statusInfo.chipBorder)}>
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </span>
        {responsibility && (
          <span className={cn("mt-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-black", responsibility.chipBg, responsibility.chipText, responsibility.chipBorder)}>
            {responsibility.label}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onView}
            className="h-8 rounded-lg px-3"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {violation.status === 'pending' && onPay && (
            <Button
              size="sm"
              onClick={onPay}
              className="h-8 rounded-lg bg-[#22C7A1] px-3 hover:bg-[#1fb391]"
            >
              <CreditCard className="ml-1 h-4 w-4" />
              دفع
            </Button>
          )}
          {violation.status === 'pending' && onCancel && (
            <Button
              size="sm"
              variant="outline"
              onClick={onCancel}
              className="h-8 rounded-lg border-[#FB6B7A]/30 px-3 text-[#BE123C] hover:bg-[#FB6B7A]/10"
            >
              <XCircle className="h-4 w-4" />
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
  <div className="flex flex-col gap-3 rounded-2xl border border-[#E5EAF1] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex w-full flex-1 items-center gap-3 sm:w-auto">
      <div className="relative max-w-md flex-1">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="بحث برقم المخالفة..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="rounded-xl border-[#E5EAF1] bg-white pr-10"
        />
      </div>
    </div>

    <div className="flex w-full items-center gap-3 sm:w-auto">
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full rounded-xl border-[#E5EAF1] bg-white sm:w-[160px]">
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
        <SelectTrigger className="w-full rounded-xl border-[#E5EAF1] bg-white sm:w-[160px]">
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
  <div className="py-16 text-center">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#22C7A1]/10"
    >
      <CheckCircle className="h-12 w-12 text-[#22C7A1]" />
    </motion.div>
    <h3 className="mb-2 text-xl font-black text-[#0F172A]">لا توجد مخالفات</h3>
    <p className="mx-auto max-w-md text-slate-500">
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
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5" />
            تفاصيل المخالفة المرورية
          </DialogTitle>
          <DialogDescription>
            معلومات تفصيلية عن المخالفة والإجراءات المتاحة
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] flex-1">
          <div className="space-y-4 pr-4">
            {/* Status Banner */}
            <div className={cn("rounded-2xl border p-4", statusInfo.chipBorder, statusInfo.chipBg)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", statusInfo.iconBg)}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-[#0F172A]">{statusInfo.label}</p>
                    <p className="text-sm text-slate-600">حالة المخالفة</p>
                  </div>
                </div>
                {violation.status === 'pending' && onPay && (
                  <Button onClick={onPay} className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]">
                    <CreditCard className="h-4 w-4" />
                    دفع الغرامة
                  </Button>
                )}
              </div>
            </div>

            {/* Basic Information */}
            <Card className="rounded-2xl border-[#E5EAF1]">
              <CardHeader className="border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-black">
                  <FileText className="h-4 w-4" />
                  المعلومات الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-sm text-slate-500">رقم المخالفة</p>
                    <p className="font-bold text-[#0F172A]">
                      {violation.violation_number || `#${violation.id.slice(0, 8)}`}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-slate-500">نوع المخالفة</p>
                    <p className="font-bold text-[#0F172A]">
                      {getViolationTypeLabel(violation.violation_type)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-1 text-sm text-slate-500">تاريخ المخالفة</p>
                    <p className="font-bold text-[#0F172A]" dir="ltr">
                      {violation.violation_date
                        ? format(new Date(violation.violation_date), 'dd MMM yyyy', { locale: ar })
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-slate-500">قيمة الغرامة</p>
                    <p className="text-xl font-black text-[#0E9E7E]">
                      {formatCurrency(violation.fine_amount || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location & Description */}
            <Card className="rounded-2xl border-[#E5EAF1]">
              <CardHeader className="border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-black">
                  <MapPin className="h-4 w-4" />
                  التفاصيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {violation.location && (
                  <div>
                    <p className="mb-1 text-sm text-slate-500">الموقع</p>
                    <p className="text-sm text-[#0F172A]">{violation.location}</p>
                  </div>
                )}
                {violation.description && (
                  <div>
                    <p className="mb-1 text-sm text-slate-500">الوصف</p>
                    <p className="rounded-lg bg-[#F6F8FB] p-3 text-sm text-[#0F172A]">
                      {violation.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence */}
            {violation.evidence_urls && violation.evidence_urls.length > 0 && (
              <Card className="rounded-2xl border-[#E5EAF1]">
                <CardHeader className="border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-black">
                    <Image className="h-4 w-4" />
                    المستندات الداعمة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {violation.evidence_urls.map((url, index) => (
                      <Badge key={index} variant="outline" className="gap-1">
                        <Image className="h-3 w-3" />
                        مستند {index + 1}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Information */}
            {violation.status === 'paid' && violation.payment_date && (
              <Card className="rounded-2xl border-[#E5EAF1]">
                <CardHeader className="border-b border-[#E5EAF1] bg-[#F6F8FB] px-4 py-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-black text-[#0E9E7E]">
                    <CheckCircle className="h-4 w-4" />
                    معلومات الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm text-slate-500">تاريخ الدفع</p>
                      <p className="font-bold text-[#0F172A]" dir="ltr">
                        {format(new Date(violation.payment_date), 'dd MMM yyyy', { locale: ar })}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#22C7A1]/30 bg-[#22C7A1]/10 px-3 py-1 text-xs font-black text-[#0E9E7E]">
                      تم الدفع
                    </span>
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
            <Button onClick={onPay} className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]">
              <CreditCard className="h-4 w-4" />
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

type ViolationPaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'credit_card';

const ViolationPaymentDialog = ({
  violation,
  open,
  onClose,
  formatCurrency,
  onPaymentComplete,
}: ViolationPaymentDialogProps) => {
  const [paymentMethod, setPaymentMethod] = useState<ViolationPaymentMethod>('cash');
  const { toast } = useToast();
  const createPaymentMutation = useCreateTrafficViolationPayment();

  if (!violation) return null;

  const handlePayment = async () => {
    try {
      const amount = Number(violation.fine_amount || 0);
      if (amount <= 0) throw new Error('مبلغ المخالفة غير صالح للدفع');

      await createPaymentMutation.mutateAsync({
        traffic_violation_id: violation.id,
        amount,
        payment_method: paymentMethod,
        payment_type: 'full',
        payment_date: new Date().toISOString().split('T')[0],
        notes: `دفع المخالفة ${violation.violation_number || violation.id}`,
      });

      onPaymentComplete(violation.id);
      onClose();
    } catch (error: unknown) {
      toast({
        title: 'خطأ في الدفع',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء معالجة الدفع. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-5 w-5 text-[#22C7A1]" />
            دفع الغرامة المرورية
          </DialogTitle>
          <DialogDescription>
            تأكيد دفع غرامة المخالفة المرورية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Violation Summary */}
          <div className="rounded-2xl border border-[#22C7A1]/30 bg-[#22C7A1]/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#22C7A1]">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-[#0F172A]">
                  {violation.violation_number || `#${violation.id.slice(0, 8)}`}
                </p>
                <p className="text-sm text-slate-600">
                  {getViolationTypeLabel(violation.violation_type)}
                </p>
                <p className="mt-1 text-xs text-slate-500" dir="ltr">
                  {violation.violation_date
                    ? format(new Date(violation.violation_date), 'dd MMM yyyy', { locale: ar })
                    : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="py-4 text-center">
            <p className="mb-1 text-sm text-slate-500">المبلغ المطلوب</p>
            <p className="text-3xl font-black text-[#0E9E7E]">
              {formatCurrency(violation.fine_amount || 0)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-base">طريقة الدفع</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as ViolationPaymentMethod)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="اختر طريقة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقداً</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                <SelectItem value="check">شيك</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Note */}
          {paymentMethod === 'bank_transfer' && (
            <div className="rounded-lg border border-[#38BDF8]/30 bg-[#38BDF8]/10 p-3 text-sm text-[#0369A1]">
              يرجى تحويل المبلغ إلى الحساب البنكي التالي وإرفاق إيصال التحويل
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={createPaymentMutation.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={handlePayment}
            disabled={createPaymentMutation.isPending || Number(violation.fine_amount || 0) <= 0}
            className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]"
          >
            {createPaymentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري المعالجة...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestIdRef = useRef(crypto.randomUUID());
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
        manual_request_id: requestIdRef.current,
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
      requestIdRef.current = crypto.randomUUID();

      onClose();
    } catch (error) {
      console.error('Error adding traffic violation:', error);
      toast({
        title: 'خطأ في الإضافة',
        description: error instanceof Error ? error.message : 'تعذر إضافة المخالفة المرورية',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-[#22C7A1]" />
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
            className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الإضافة...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
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
    window.print();
  };

  const handlePaymentComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['contract-violations'] });
    queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });
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
      const { data, error } = await supabase.rpc('cancel_traffic_violation_atomic_v1', {
        p_violation_id: selectedViolation.id,
        p_reason: 'تم الإلغاء من صفحة تفاصيل العقد',
      });

      if (error) throw error;
      const result = data as { ok?: boolean; status?: string } | null;
      if (!result?.ok || !['cancelled', 'canceled', 'void', 'voided', 'deleted'].includes(String(result.status || '').toLowerCase())) {
        throw new Error('لم يكتمل إلغاء المخالفة');
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['contract-violations'] });
      queryClient.invalidateQueries({ queryKey: ['traffic-violations'] });

      toast({
        title: 'تم الإلغاء',
        description: 'تم إلغاء المخالفة بنجاح',
      });

      setIsCancelDialogOpen(false);
      setSelectedViolation(null);
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message || '')
          : '';
      toast({
        title: 'خطأ',
        description: message.includes('TRAFFIC_VIOLATION_HAS_ACTIVE_PAYMENTS')
          ? 'لا يمكن إلغاء مخالفة مرتبطة بدفعة نشطة. يجب عكس الدفعة أو إلغاؤها أولاً.'
          : message || 'فشل إلغاء المخالفة',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <ViolationsSummary violations={violations} formatCurrency={formatCurrency} />

      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-2xl font-black text-[#0F172A]">المخالفات المرورية</h2>
          <p className="text-sm text-slate-500">
            {contractNumber ? `العقد #${contractNumber} • ` : ''}
            {violations.length} مخالفة
          </p>
        </div>
        <Button
          onClick={() => setIsAddViolationDialogOpen(true)}
          className="gap-2 rounded-xl bg-[#22C7A1] hover:bg-[#1fb391]"
        >
          <Plus className="h-4 w-4" />
          إضافة مخالفة
        </Button>
      </div>

      {/* Empty State */}
      {violations.length === 0 ? (
        <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
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
            <p className="text-sm text-slate-500">
              عرض {filteredAndSortedViolations.length} من {violations.length} مخالفة
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-[#E5EAF1] bg-white p-1">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={cn(
                  "rounded-lg",
                  viewMode === 'grid' ? "bg-white shadow-sm" : ""
                )}
              >
                <AlertTriangle className="h-4 w-4" />
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
                <FileText className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Violations Display */}
          {filteredAndSortedViolations.length === 0 ? (
            <Card className="rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
              <CardContent className="p-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h3 className="mb-2 text-lg font-bold text-[#0F172A]">لا توجد نتائج</h3>
                <p className="text-slate-500">جرب تغيير filters البحث</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
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
            <Card className="overflow-hidden rounded-2xl border-[#E5EAF1] shadow-[0_10px_30px_-22px_rgba(15,23,42,0.25)]">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#E5EAF1] bg-[#F6F8FB]">
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-500">رقم المخالفة</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-500">التاريخ</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-500">الموقع</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-500">الغرامة</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-500">الحالة</th>
                      <th className="px-4 py-3 text-right text-sm font-bold text-slate-500">الإجراءات</th>
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
            <DialogTitle className="flex items-center gap-2 text-[#BE123C]">
              <XCircle className="h-5 w-5" />
              إلغاء المخالفة
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء هذه المخالفة؟
            </DialogDescription>
          </DialogHeader>

          {selectedViolation && (
            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between rounded-lg bg-[#F6F8FB] p-3">
                <span className="text-sm text-slate-600">رقم المخالفة</span>
                <span className="font-bold">{selectedViolation.violation_number || '-'}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F6F8FB] p-3">
                <span className="text-sm text-slate-600">المبلغ</span>
                <span className="font-bold text-[#BE123C]">{formatCurrency(selectedViolation.fine_amount || 0)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#F6F8FB] p-3">
                <span className="text-sm text-slate-600">النوع</span>
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
