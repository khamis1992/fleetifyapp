/**
 * صفحة تفاصيل العقد - UX Redesign V2
 * Professional SaaS design with improved information architecture
 * Better visual hierarchy, clearer actions, and enhanced mobile experience
 *
 * @component ContractDetailsPageRedesignedV2
 */

import { type CSSProperties, type ElementType, type ReactNode, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  FileText,
  User,
  Car,
  RefreshCw,
  FileEdit,
  XCircle,
  DollarSign,
  Calendar,
  CreditCard,
  Wallet,
  AlertTriangle,
  AlertCircle,
  Folder,
  GitBranch,
  Activity,
  CheckCircle,
  CheckCircle2,
  Trash2,
  Scale,
  Loader2,
  LayoutDashboard,
  FileCheck,
  Receipt,
  Phone,
  Mail,
  MapPin,
  Palette,
  Gauge,
  Fuel,
  ExternalLink,
  Hash,
  Printer,
  MessageSquare,
  ClipboardList,
  Target,
  ShieldCheck,
  MoreVertical,
  PlayCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContractStatusManagement } from './ContractStatusManagement';
import { ConvertToLegalDialog } from './ConvertToLegalDialog';

import { PayInvoiceDialog } from '@/components/finance/PayInvoiceDialog';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
import { ContractInvoiceDialog } from '@/components/contracts/ContractInvoiceDialog';
import { ContractRenewalDialog } from './ContractRenewalDialog';
import { SimpleContractWizard } from './SimpleContractWizard';
import { ContractPrintDialog } from './ContractPrintDialog';
import { FinancialDashboard } from './FinancialDashboard';
import { ContractAlerts } from './ContractAlerts';
import { TimelineView } from './TimelineView';

import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { useContractPaymentSchedules, useGeneratePaymentSchedulesFromInvoices } from '@/hooks/usePaymentSchedules';

import { ContractPaymentsTabRedesigned as ContractPaymentsTab } from './ContractPaymentsTabRedesigned';
import { ContractInvoicesTabRedesigned } from './ContractInvoicesTabRedesigned';
import { EnhancedPaymentScheduleTabRedesigned as EnhancedPaymentScheduleTab } from './EnhancedPaymentScheduleTabRedesigned';
import { VehiclePickupReturnTabRedesigned } from './VehiclePickupReturnTabRedesigned';
import { ContractViolationsTabRedesigned } from './ContractViolationsTabRedesigned';
import { ContractDocuments } from './ContractDocuments';
import { OfficialContractView } from './OfficialContractView';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';

import { useFleetifyTranslation } from "@/hooks/useTranslation";
import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useVehicleInspections, type VehicleInspection } from '@/hooks/useVehicleInspections';
import { useCustomerCRMActivity, type CustomerActivity } from '@/hooks/useCustomerCRMActivity';
import { systemColorPattern } from '@/lib/design-system/systemColorPattern';
import type { PaymentSchedule } from '@/types/payment-schedules';
import { useTourGuide } from '@/components/tour-guide';

const contractDetailsTheme = systemColorPattern.colors;
const contractDetailsSystemStyle = {
  '--contract-details-text': contractDetailsTheme.text,
  '--contract-details-surface': contractDetailsTheme.surface,
  '--contract-details-inner': contractDetailsTheme.innerSurface,
  '--contract-details-muted': contractDetailsTheme.secondaryText,
  '--contract-details-border': contractDetailsTheme.border,
  '--contract-details-info': contractDetailsTheme.info,
  '--contract-details-alert': contractDetailsTheme.alert,
  '--contract-details-focus': contractDetailsTheme.focus,
  '--contract-details-success': contractDetailsTheme.success,
} as CSSProperties;

type ContractAuditLog = {
  id: string;
  action: string;
  changes_summary: string | null;
  entity_name: string | null;
  created_at: string | null;
  severity: string | null;
  status: string | null;
  user_name: string | null;
};

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



// ===== Stats Cards Component =====
const ContractStatsGrid = ({
  contractStats,
  trafficViolationsCount,
  formatCurrency,
}: {
  contractStats: Record<string, unknown>;
  trafficViolationsCount: number;
  formatCurrency: (amount: number) => string;
}) => {
  const { t } = useFleetifyTranslation("ui");
  const stats = [
    {
      label: 'إجمالي القيمة',
      value: formatCurrency(contractStats?.totalAmount as number || 0),
      subtext: `${formatCurrency(contractStats?.monthlyAmount as number || 0)} شهرياً`,
      icon: DollarSign,
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      label: 'مدة العقد',
      value: `${contractStats?.totalMonths || 0} شهر`,
      subtext: `${(contractStats?.daysRemaining as number) > 0 ? `${contractStats.daysRemaining} يوم متبقي` : contractStats?.daysRemaining === 0 ? 'ينتهي اليوم' : 'منتهي'}`,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      progress: contractStats?.progressPercentage as number || 0,
    },
    {
      label: 'حالة السداد',
      value: `${contractStats?.paidPayments} / ${contractStats?.totalPayments}`,
      subtext: contractStats?.paymentStatus === 'completed' ? 'تم السداد' : 'قيد السداد',
      icon: CreditCard,
      color: contractStats?.paymentStatus === 'completed' ? 'from-green-500 to-green-600' : 'from-purple-500 to-purple-600',
      bgColor: contractStats?.paymentStatus === 'completed' ? 'bg-green-50' : 'bg-purple-50',
    },
    {
      label: 'المخالفات',
      value: trafficViolationsCount.toString(),
      subtext: trafficViolationsCount === 0 ? 'لا توجد مخالفات' : 'مخالفة مرورية',
      icon: AlertCircle,
      color: trafficViolationsCount > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600',
      bgColor: trafficViolationsCount > 0 ? 'bg-red-50' : 'bg-green-50',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          variants={fadeInUp}
          className="rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm transition-colors hover:border-[#B9C7D8]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg bg-[#EEF5FB]", stat.color)}>
              <stat.icon className="h-5 w-5 text-[#173A63]" />
            </div>
            <span className="text-xs font-medium text-[#6A7688]">{stat.label}</span>
          </div>
          <p className="mb-1 text-2xl font-black text-[#142033]">{stat.value}</p>
          <p className="text-sm text-[#6A7688]">{stat.subtext}</p>
          {stat.progress !== undefined && (
            <div className="mt-3">
              <Progress value={stat.progress} className="h-2" />
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
};

// ===== Customer & Vehicle Cards =====
const CustomerVehicleCards = ({
  customerName,
  vehicleName,
  plateNumber,
  contract,
  onCustomerClick,
  onVehicleClick,
}: {
  customerName: string;
  vehicleName: string;
  plateNumber?: string;
  contract: Contract;
  onCustomerClick: () => void;
  onVehicleClick: () => void;
}) => (
  <motion.div
    variants={fadeInUp}
    className="grid grid-cols-1 gap-4 md:grid-cols-2"
  >
    {/* Customer Card */}
    <Card className="cursor-pointer rounded-xl border-[#DDE5EF] bg-[#FAFBFC] shadow-sm transition-colors hover:border-[#173A63]" onClick={onCustomerClick}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#EEF5FB] text-[#173A63]">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 mb-1">العميل</p>
            <h3 className="font-bold text-neutral-900 text-lg mb-2 truncate">{customerName}</h3>
            <div className="space-y-1">
              {contract.customer?.phone && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="font-mono" dir="ltr">{contract.customer.phone}</span>
                </div>
              )}
              {contract.customer?.email && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{contract.customer.email}</span>
                </div>
              )}
              {contract.customer?.national_id && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{contract.customer.national_id}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Vehicle Card */}
    <Card className="cursor-pointer rounded-xl border-[#DDE5EF] bg-[#FAFBFC] shadow-sm transition-colors hover:border-[#173A63]" onClick={onVehicleClick}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Car className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-neutral-500 mb-1">المركبة</p>
            <h3 className="font-bold text-neutral-900 text-lg mb-2">{vehicleName}</h3>
            <div className="space-y-1">
              {plateNumber && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="font-mono font-bold">{plateNumber}</span>
                </div>
              )}
              {contract.vehicle?.year && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{contract.vehicle.year}</span>
                </div>
              )}
              {contract.vehicle?.color && (
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{contract.vehicle.color}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const getContractStatusMeta = (status?: string) => {
  const map: Record<string, { label: string; tone: string; dot: string }> = {
    active: {
      label: 'نشط',
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    },
    draft: {
      label: 'مسودة',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
      dot: 'bg-slate-400',
    },
    expired: {
      label: 'منتهي',
      tone: 'border-amber-200 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    },
    suspended: {
      label: 'معلق',
      tone: 'border-orange-200 bg-orange-50 text-orange-700',
      dot: 'bg-orange-500',
    },
    cancelled: {
      label: 'ملغي',
      tone: 'border-rose-200 bg-rose-50 text-rose-700',
      dot: 'bg-rose-500',
    },
    under_legal_procedure: {
      label: 'إجراء قانوني',
      tone: 'border-violet-200 bg-violet-50 text-violet-700',
      dot: 'bg-violet-500',
    },
  };

  return map[status || ''] || map.draft;
};

const ContractCommandHeader = ({
  contract,
  customerName,
  vehicleName,
  plateNumber,
  contractStats,
  invoicesCount,
  violationsCount,
  formatCurrency,
  onBack,
  onEdit,
  onPrint,
  onExport,
  onStatusClick,
  onCustomerClick,
  onVehicleClick,
}: {
  contract: Contract;
  customerName: string;
  vehicleName: string;
  plateNumber?: string;
  contractStats: Record<string, unknown> | null;
  invoicesCount: number;
  violationsCount: number;
  formatCurrency: (amount: number) => string;
  onBack: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onExport: () => void;
  onStatusClick: () => void;
  onCustomerClick: () => void;
  onVehicleClick: () => void;
}) => {
  const statusMeta = getContractStatusMeta(contract.status);
  const progress = Math.round((contractStats?.progressPercentage as number) || 0);
  const daysRemaining = contractStats?.daysRemaining as number | undefined;
  const totalAmount = (contractStats?.totalAmount as number) || contract.contract_amount || 0;
  const totalMonths = Number(contractStats?.totalMonths ?? 0);
  const monthlyAmount = Number(contractStats?.monthlyAmount ?? contract.monthly_amount ?? 0);
  const paidPayments = Number(contractStats?.paidPayments ?? 0);
  const totalPayments = Number(contractStats?.totalPayments ?? 0);
  const balanceDue = contract.balance_due || 0;
  const paidAmount = Math.max(0, totalAmount - balanceDue);
  const paymentProgress = totalAmount > 0 ? Math.min(100, Math.round((paidAmount / totalAmount) * 100)) : 0;

  const summaryItems = [
    {
      label: 'إجمالي القيمة',
      value: formatCurrency(totalAmount),
      icon: Wallet,
      tone: 'bg-[#EEF5FB] text-[#173A63]',
    },
    {
      label: 'الإيجار الشهري',
      value: formatCurrency(monthlyAmount),
      icon: DollarSign,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'حالة السداد',
      value: `${paidPayments} / ${totalPayments}`,
      icon: CreditCard,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'مدة العقد',
      value: `${totalMonths} شهر`,
      icon: Calendar,
      tone: 'bg-[#EEF5FB] text-[#173A63]',
    },
    {
      label: 'المتبقي',
      value: formatCurrency(balanceDue),
      icon: AlertTriangle,
      tone: balanceDue > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'الفواتير',
      value: String(invoicesCount),
      icon: Receipt,
      tone: 'bg-slate-100 text-slate-700',
    },
    {
      label: 'المخالفات',
      value: String(violationsCount),
      icon: AlertCircle,
      tone: violationsCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'التأمين',
      value: formatCurrency(contract.insurance_amount || 0),
      icon: ShieldCheck,
      tone: 'bg-slate-100 text-slate-700',
    },
  ];

  return (
    <motion.section
      variants={fadeInUp}
      className="contract-profile-card overflow-hidden rounded-2xl border border-[#DDE5EF] bg-white shadow-sm"
    >
      <div className="contract-profile-body grid gap-3 p-4">
        <div className="p-0">
          <div className="contract-profile-main grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.45fr)] xl:items-stretch">
            <div className="contract-profile-identity min-w-0 space-y-3 rounded-xl border border-[#E3EAF2] bg-[#FAFBFC] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onStatusClick}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black transition-colors',
                    statusMeta.tone,
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', statusMeta.dot)} />
                  {statusMeta.label}
                </button>
                <span className="contract-type-badge rounded-full border border-[#DDE5EF] bg-white px-3 py-1 text-xs font-bold text-black">
                  عقد تأجير مركبة
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-[#64748B]">رقم العقد</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-normal text-[#142033] sm:text-3xl" dir="ltr">
                  {contract.contract_number}
                </h1>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onCustomerClick}
                  className="group rounded-xl border border-[#E3EAF2] bg-white p-4 text-right transition-colors hover:border-[#173A63] hover:bg-[#EEF5FB]"
                >
                  <div className="flex items-center gap-3">
                    <div className="contract-action-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FB] text-black transition-colors group-hover:bg-white">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#6A7688]">العميل</p>
                      <p className="truncate text-base font-black text-[#142033] group-hover:text-[#173A63]">{customerName}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[#8290A4]">
                        {contract.customer?.phone && <span dir="ltr">{contract.customer.phone}</span>}
                        {contract.customer?.email && <span className="max-w-[160px] truncate">{contract.customer.email}</span>}
                        {contract.customer?.national_id && <span>{contract.customer.national_id}</span>}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onVehicleClick}
                  className="group rounded-xl border border-[#E3EAF2] bg-white p-4 text-right transition-colors hover:border-[#173A63] hover:bg-[#EEF5FB]"
                >
                  <div className="flex items-center gap-3">
                    <div className="contract-action-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-black transition-colors group-hover:bg-white">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[#6A7688]">المركبة</p>
                      <p className="truncate text-sm font-bold text-[#142033] group-hover:text-[#173A63]">{vehicleName}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[#8290A4]">
                        <span dir="ltr">{plateNumber || '-'}</span>
                        {contract.vehicle?.year && <span>{contract.vehicle.year}</span>}
                        {contract.vehicle?.color && <span>{contract.vehicle.color}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="contract-profile-progress grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#DDE5EF] bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#142033]">مدة العقد</span>
                  <span className="text-sm font-bold text-[#173A63]">{progress}%</span>
                </div>
                <Progress value={progress} className="mt-2 h-2" />
                <p className="mt-2 text-xs text-[#6A7688]">
                  {typeof daysRemaining === 'number'
                    ? daysRemaining > 0
                      ? `${daysRemaining} يوم متبقي`
                      : daysRemaining === 0
                        ? 'ينتهي اليوم'
                        : `منتهي منذ ${Math.abs(daysRemaining)} يوم`
                    : 'المدة غير محددة'}
                </p>
              </div>

              <div className="rounded-xl border border-[#DDE5EF] bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#142033]">تحصيل العقد</span>
                  <span className="text-sm font-bold text-emerald-700">{paymentProgress}%</span>
                </div>
                <Progress value={paymentProgress} className="mt-2 h-2" />
                <p className="mt-2 text-xs text-[#6A7688]">
                  محصل {formatCurrency(paidAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-0">
          <div className="contract-profile-summary grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
            {summaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[#E3EAF2] bg-white p-3">
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-xs text-[#6A7688]">{item.label}</p>
                    <p className="mt-1 break-words text-base font-black leading-tight text-[#142033]" dir="auto">{item.value}</p>
                  </div>
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', item.tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </motion.section>
  );
};

// ===== Quick Actions Bar - System Colors =====
const QuickActionsBar = ({
  contract,
  onRenew,
  onAmend,
  onTerminate,
  onReactivate,
  onDeletePermanent,
  onConvertToLegal,
  onRemoveLegal,
}: {
  contract: Contract;
  onRenew: () => void;
  onAmend: () => void;
  onTerminate: () => void;
  onReactivate: () => void;
  onDeletePermanent: () => void;
  onConvertToLegal: () => void;
  onRemoveLegal: () => void;
}) => {
  const primaryActions = [
    {
      label: 'تجديد العقد',
      icon: RefreshCw,
      onClick: onRenew,
      variant: 'default' as const,
      className: 'bg-[#00A896] hover:bg-[#007A6B] text-white border-0',
      show: contract.status === 'active',
    },
    {
      label: 'تعديل العقد',
      icon: FileEdit,
      onClick: onAmend,
      variant: 'outline' as const,
      className: 'border-[#00A896] text-[#00A896] hover:bg-[#E6F7F5]',
      show: contract.status === 'active',
    },
    {
      label: 'تحويل للشؤون القانونية',
      icon: Scale,
      onClick: onConvertToLegal,
      variant: 'outline' as const,
      className: 'border-violet-300 text-violet-700 hover:bg-violet-50',
      show: contract.status === 'active' || contract.status === 'cancelled',
    },
    {
      label: 'إزالة الإجراء القانوني',
      icon: CheckCircle2,
      onClick: onRemoveLegal,
      variant: 'outline' as const,
      className: 'border-emerald-300 text-emerald-700 hover:bg-emerald-50',
      show: contract.status === 'under_legal_procedure',
    },
    {
      label: 'إنهاء العقد',
      icon: XCircle,
      onClick: onTerminate,
      variant: 'outline' as const,
      className: 'border-rose-300 text-rose-700 hover:bg-rose-50',
      show: contract.status === 'active',
    },
    {
      label: 'إعادة تفعيل العقد',
      icon: RefreshCw,
      onClick: onReactivate,
      variant: 'default' as const,
      className: 'bg-emerald-500 hover:bg-emerald-600 text-white border-0',
      show: contract.status === 'cancelled',
    },
  ];

  const visiblePrimaryActions = primaryActions.filter(a => a.show);
  const sensitiveActions = [
    {
      label: 'حذف نهائي',
      icon: Trash2,
      onClick: onDeletePermanent,
      className: 'border-rose-200 text-rose-700 hover:bg-rose-50',
    },
  ];

  return (
    <motion.div
      variants={fadeInUp}
      className="contract-action-dock rounded-xl border border-[#DDE5EF] bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-black text-[#142033]">إجراءات العقد</p>
          <p className="mt-1 text-xs font-semibold text-[#6A7688]">الأفعال اليومية في اليمين، والإجراءات الحساسة منفصلة للمراجعة.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visiblePrimaryActions.map((action, idx) => (
            <motion.div key={idx} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant={action.variant}
                size="sm"
                onClick={action.onClick}
                className={cn("h-10 gap-2 whitespace-nowrap rounded-lg font-bold", action.className)}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#E6ECF3] pt-3 xl:border-r xl:border-t-0 xl:pr-4 xl:pt-0">
          <span className="text-xs font-black text-rose-700">إجراءات حساسة</span>
          {sensitiveActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={action.onClick}
              className={cn("h-10 gap-2 rounded-lg bg-white font-bold", action.className)}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const ContractTopbarActions = ({
  contract,
  onRenew,
  onTerminate,
  onReactivate,
  onDeletePermanent,
  onConvertToLegal,
  onRemoveLegal,
}: {
  contract: Contract;
  onRenew: () => void;
  onTerminate: () => void;
  onReactivate: () => void;
  onDeletePermanent: () => void;
  onConvertToLegal: () => void;
  onRemoveLegal: () => void;
}) => {
  const canRenew = contract.status === 'active';
  const canReactivate = contract.status === 'cancelled';
  const canConvertToLegal = contract.status === 'active' || contract.status === 'cancelled';
  const isLegal = contract.status === 'under_legal_procedure';

  return (
    <>
      {canRenew && (
        <Button type="button" onClick={onRenew} className="contract-topbar-renew">
          <RefreshCw className="h-4 w-4" />
          تجديد العقد
        </Button>
      )}

      {canReactivate && (
        <Button type="button" onClick={onReactivate} className="contract-topbar-renew">
          <RefreshCw className="h-4 w-4" />
          إعادة تفعيل
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="contract-topbar-more">
            <MoreVertical className="h-4 w-4" />
            إجراءات
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 text-right" dir="rtl">
          {canConvertToLegal && (
            <DropdownMenuItem onClick={onConvertToLegal} className="gap-2 font-bold text-violet-700 focus:text-violet-700">
              <Scale className="h-4 w-4" />
              تحويل للشؤون القانونية
            </DropdownMenuItem>
          )}
          {isLegal && (
            <DropdownMenuItem onClick={onRemoveLegal} className="gap-2 font-bold text-emerald-700 focus:text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              إزالة الإجراء القانوني
            </DropdownMenuItem>
          )}
          {contract.status === 'active' && (
            <DropdownMenuItem onClick={onTerminate} className="gap-2 font-bold text-rose-700 focus:text-rose-700">
              <XCircle className="h-4 w-4" />
              إنهاء العقد
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDeletePermanent} className="gap-2 font-bold text-rose-700 focus:text-rose-700">
            <Trash2 className="h-4 w-4" />
            حذف نهائي
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

const inactiveInvoiceStatuses = new Set(['cancelled', 'void', 'deleted']);
const paidInvoiceStatuses = new Set(['paid', 'completed', 'cleared']);
const inactiveScheduleStatuses = new Set(['cancelled', 'void', 'deleted']);
const paidScheduleStatuses = new Set(['paid', 'completed', 'cleared']);

const getInvoiceBalance = (invoice: Invoice) => {
  const total = Number(invoice.total_amount || 0);
  const paid = Number(invoice.paid_amount || 0);
  const storedBalance = Number(invoice.balance_due ?? total - paid);
  return Math.max(0, storedBalance);
};

const isActiveFinancialInvoice = (invoice: Invoice) => {
  const status = String(invoice.status || '').toLowerCase();
  const paymentStatus = String(invoice.payment_status || '').toLowerCase();
  return !inactiveInvoiceStatuses.has(status) && !inactiveInvoiceStatuses.has(paymentStatus);
};

const isPaidFinancialInvoice = (invoice: Invoice) => {
  const status = String(invoice.status || '').toLowerCase();
  const paymentStatus = String(invoice.payment_status || '').toLowerCase();
  return paidInvoiceStatuses.has(status) || paidInvoiceStatuses.has(paymentStatus) || getInvoiceBalance(invoice) <= 1;
};

const isActiveScheduleItem = (payment: { status: string }) => {
  const status = String(payment.status || '').toLowerCase();
  return !inactiveScheduleStatuses.has(status);
};

const isPaidScheduleItem = (payment: { status: string }) => {
  const status = String(payment.status || '').toLowerCase();
  return paidScheduleStatuses.has(status);
};

const ContractCommandCenter = ({
  contract,
  contractStats,
  invoices,
  paymentSchedules,
  crmActivities,
  auditLogs,
  violationsCount,
  formatCurrency,
  onPrimaryAction,
  onOpenFinancial,
  onOpenViolations,
  onOpenDocuments,
  activeTab,
  onTabChange,
  tabs,
  children,
}: {
  contract: Contract;
  contractStats: Record<string, unknown> | null;
  invoices: Invoice[];
  paymentSchedules: Array<{ status: string; due_date: string | null; amount: number | null }>;
  crmActivities: CustomerActivity[];
  auditLogs: ContractAuditLog[];
  violationsCount: number;
  formatCurrency: (amount: number) => string;
  onPrimaryAction: () => void;
  onOpenFinancial: () => void;
  onOpenViolations: () => void;
  onOpenDocuments: () => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  tabs: Array<{ value: string; label: string; icon: ElementType }>;
  children: ReactNode;
}) => {
  const daysRemaining = Number(contractStats?.daysRemaining ?? 0);
  const activeInvoices = invoices.filter(isActiveFinancialInvoice);
  const collectibleInvoices = activeInvoices.filter((invoice) => !isPaidFinancialInvoice(invoice) && getInvoiceBalance(invoice) > 1);
  const activeSchedules = paymentSchedules.filter(isActiveScheduleItem);
  const unpaidSchedules = activeSchedules.filter((payment) => !isPaidScheduleItem(payment));
  const totalOutstanding = collectibleInvoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0);
  const invoicesTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const schedulesTotal = activeSchedules.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const unpaidSchedulesTotal = unpaidSchedules.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const scheduleDifference = invoicesTotal - schedulesTotal;
  const scheduleMismatch = activeInvoices.length > 0 && activeSchedules.length > 0 && Math.abs(scheduleDifference) > 1;
  const scheduleReviewNeeded = unpaidSchedules.length > collectibleInvoices.length && unpaidSchedulesTotal > totalOutstanding + 1;
  const nextSchedule = [...paymentSchedules]
    .filter((payment) => isActiveScheduleItem(payment) && !isPaidScheduleItem(payment))
    .sort((a, b) => new Date(a.due_date || '2999-12-31').getTime() - new Date(b.due_date || '2999-12-31').getTime())[0];

  const nextAction =
    contract.status === 'under_legal_procedure'
      ? {
          title: 'متابعة الإجراء القانوني',
          note: 'العقد محوّل للشؤون القانونية. راجع المستندات والنشاط قبل أي تعديل مالي.',
          button: 'فتح المستندات',
          tone: 'legal',
          onClick: onOpenDocuments,
        }
      : totalOutstanding > 0
        ? {
            title: 'تحصيل المبلغ المستحق',
            note: `${formatCurrency(totalOutstanding)} متبقية على العقد. ابدأ من الملف المالي لتسجيل دفعة أو مراجعة الفواتير.`,
            button: 'فتح الملف المالي',
            tone: 'money',
            onClick: onOpenFinancial,
          }
        : violationsCount > 0
          ? {
              title: 'مراجعة المخالفات',
              note: 'يوجد مخالفات مرتبطة بالعقد. تحقق من التحميل أو التحويل قبل إغلاق الملف.',
              button: 'فتح المخالفات',
              tone: 'risk',
              onClick: onOpenViolations,
            }
          : daysRemaining <= 30 && contract.status === 'active'
            ? {
                title: 'الاستعداد للتجديد',
                note: daysRemaining > 0 ? `باقي ${daysRemaining} يوم على انتهاء العقد.` : 'العقد انتهى أو ينتهي اليوم.',
                button: 'تنفيذ الإجراء',
                tone: 'renew',
                onClick: onPrimaryAction,
              }
            : {
                title: 'العقد مستقر',
                note: 'لا يوجد إجراء عاجل. راقب الدفعات والمستندات من لوحة العقد.',
                button: 'تحديث البيانات',
                tone: 'stable',
                onClick: onPrimaryAction,
              };

  const riskItems = [
    {
      label: 'المستحق',
      value: formatCurrency(totalOutstanding),
      state: totalOutstanding > 0 ? 'danger' : 'ok',
      icon: Wallet,
      action: onOpenFinancial,
    },
    {
      label: 'فواتير تحتاج متابعة',
      value: String(collectibleInvoices.length),
      state: collectibleInvoices.length ? 'danger' : 'ok',
      icon: Receipt,
      action: onOpenFinancial,
    },
    {
      label: 'الأيام المتبقية',
      value: Number.isFinite(daysRemaining) ? String(daysRemaining) : '-',
      state: daysRemaining <= 30 ? 'warning' : 'ok',
      icon: Calendar,
      action: onPrimaryAction,
    },
    {
      label: 'المخالفات',
      value: String(violationsCount),
      state: violationsCount ? 'warning' : 'ok',
      icon: AlertCircle,
      action: onOpenViolations,
    },
  ];

  const activityItems = [
    {
      label: 'حالة العقد',
      value: getContractStatusMeta(contract.status).label,
      icon: FileCheck,
    },
    {
      label: 'أقرب استحقاق',
      value: nextSchedule?.due_date ? format(new Date(nextSchedule.due_date), 'dd MMM yyyy', { locale: ar }) : 'لا يوجد',
      icon: Calendar,
    },
    {
      label: 'آخر تحديث مالي',
      value: invoices[0]?.updated_at ? format(new Date(invoices[0].updated_at), 'dd MMM yyyy', { locale: ar }) : 'لا يوجد',
      icon: Activity,
    },
  ];
  const intelligenceItems = [
    {
      title: scheduleMismatch ? 'تعارض بين الفواتير وجدول الدفعات' : 'تطابق مالي مقبول',
      note: scheduleMismatch
        ? `إجمالي الفواتير الفعالة ${formatCurrency(invoicesTotal)} وجدول الدفعات ${formatCurrency(schedulesTotal)}. الفرق ${formatCurrency(Math.abs(scheduleDifference))}.`
        : 'لا يوجد فرق واضح بين الفواتير الفعالة وجدول الدفعات.',
      state: scheduleMismatch ? 'danger' : 'ok',
      action: onOpenFinancial,
    },
    {
      title: collectibleInvoices.length > 0 ? 'تحصيل مطلوب' : 'لا توجد فواتير مفتوحة',
      note: collectibleInvoices.length > 0
        ? `${collectibleInvoices.length} فاتورة فعالة لديها رصيد مستحق بقيمة ${formatCurrency(totalOutstanding)}.`
        : 'لا توجد فواتير فعالة لديها رصيد مستحق.',
      state: collectibleInvoices.length > 0 ? 'warning' : 'ok',
      action: onOpenFinancial,
    },
    {
      title: scheduleReviewNeeded ? 'جدول الدفعات يحتاج مراجعة' : 'جدول الدفعات تحت السيطرة',
      note: scheduleReviewNeeded
        ? `الدفعات غير المكتملة في الجدول ${formatCurrency(unpaidSchedulesTotal)} أكبر من الرصيد المستحق ${formatCurrency(totalOutstanding)}.`
        : `${unpaidSchedules.length} دفعة غير مكتملة في الجدول، بإجمالي ${formatCurrency(unpaidSchedulesTotal)}.`,
      state: scheduleReviewNeeded ? 'warning' : 'ok',
      action: onOpenFinancial,
    },
  ];
  const timelineEvents = [
    contract.created_at && {
      date: contract.created_at,
      title: 'إنشاء العقد',
      detail: contract.contract_number,
      tone: 'neutral',
      icon: FileText,
    },
    contract.start_date && {
      date: contract.start_date,
      title: 'بداية العقد',
      detail: contract.customer ? formatCustomerName(contract.customer) : 'عميل العقد',
      tone: 'success',
      icon: Calendar,
    },
    ...invoices.slice(0, 4).map((invoice) => ({
      date: invoice.updated_at || invoice.invoice_date,
      title: invoice.payment_status === 'paid' ? 'سداد فاتورة' : 'فاتورة مفتوحة',
      detail: `${invoice.invoice_number} - ${formatCurrency(invoice.balance_due || invoice.total_amount || 0)}`,
      tone: invoice.payment_status === 'paid' ? 'success' : 'warning',
      icon: Receipt,
    })),
    ...paymentSchedules.slice(0, 3).map((payment) => ({
      date: payment.due_date || contract.start_date,
      title: payment.status === 'paid' ? 'دفعة مكتملة' : 'دفعة مجدولة',
      detail: formatCurrency(Number(payment.amount || 0)),
      tone: payment.status === 'paid' ? 'success' : 'neutral',
      icon: CreditCard,
    })),
    ...crmActivities.slice(0, 4).map((activity) => ({
      date: activity.created_at,
      title: activity.title || (activity.note_type === 'phone' ? 'تواصل هاتفي' : 'تفاعل مع العميل'),
      detail: activity.content || 'تم تسجيل تفاعل بدون ملاحظات',
      tone: activity.is_important || activity.call_status === 'no_answer' ? 'warning' : 'neutral',
      icon: activity.note_type === 'phone' ? Phone : MessageSquare,
    })),
    ...auditLogs.slice(0, 4).map((log) => ({
      date: log.created_at || contract.updated_at || contract.created_at,
      title: log.changes_summary || log.action || 'تحديث على العقد',
      detail: [log.entity_name, log.user_name].filter(Boolean).join(' - ') || 'سجل تدقيق',
      tone: log.severity === 'high' || log.status === 'failed' ? 'warning' : 'neutral',
      icon: ShieldCheck,
    })),
    contract.end_date && {
      date: contract.end_date,
      title: 'نهاية العقد',
      detail: daysRemaining > 0 ? `متبقي ${daysRemaining} يوم` : 'انتهى العقد',
      tone: daysRemaining > 0 ? 'neutral' : 'warning',
      icon: Calendar,
    },
  ]
    .filter(Boolean)
    .sort((a, b) => new Date((b as { date: string }).date).getTime() - new Date((a as { date: string }).date).getTime())
    .slice(0, 6) as Array<{
      date: string;
      title: string;
      detail: string;
      tone: string;
      icon: ElementType;
    }>;

  return (
    <motion.section variants={fadeInUp} className="contract-command-center">
      <div className={`contract-next-action is-${nextAction.tone}`}>
        <div>
          <span>الإجراء التالي</span>
          <h2>{nextAction.title}</h2>
          <p>{nextAction.note}</p>
        </div>
        <Button onClick={nextAction.onClick} className="h-11 rounded-lg bg-[#173A63] px-5 font-black text-white hover:bg-[#102C4D]">
          {nextAction.button}
        </Button>
      </div>

      <div className="contract-risk-board">
        {riskItems.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={item.action} className={`contract-risk-tile is-${item.state}`}>
              <span><Icon className="h-4 w-4" /> {item.label}</span>
              <strong>{item.value}</strong>
            </button>
          );
        })}
      </div>

      <div className="contract-activity-strip">
        <header>
          <strong>ملخص النشاط</strong>
          <span>نظرة سريعة قبل الدخول للتفاصيل</span>
        </header>
        {activityItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="contract-activity-row">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              <b>{item.value}</b>
            </div>
          );
        })}
      </div>

      <div className="contract-intelligence-panel">
        <header>
          <strong>التدقيق الذكي</strong>
          <span>تنبيهات تشغيلية قبل حدوث التعارضات</span>
        </header>
        <div className="contract-intelligence-list">
          {intelligenceItems.map((item) => (
            <button key={item.title} type="button" onClick={item.action} className={`contract-intelligence-item is-${item.state}`}>
              <span>{item.title}</span>
              <p>{item.note}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="contract-unified-timeline">
        <header>
          <strong>سجل العقد الموحد</strong>
          <span>آخر الأحداث من العقد والفواتير وجدول الدفعات</span>
        </header>
        <div className="contract-timeline-list">
          {timelineEvents.map((event, index) => {
            const Icon = event.icon;
            return (
              <div key={`${event.title}-${event.date}-${index}`} className={`contract-timeline-event is-${event.tone}`}>
                <i><Icon className="h-4 w-4" /></i>
                <div>
                  <strong>{event.title}</strong>
                  <span>{event.detail}</span>
                </div>
                <time>{format(new Date(event.date), 'dd MMM yyyy', { locale: ar })}</time>
              </div>
            );
          })}
        </div>
      </div>

      <div className="contract-embedded-workbench">
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
          <div className="contract-workbench-nav">
            <div>
              <p className="text-sm font-bold text-[#142033]">ملف العقد</p>
              <p className="mt-1 text-xs text-[#6A7688]">البيانات والماليات والمستندات ضمن نفس تدفق العقد</p>
            </div>
            <TabsList className="contract-workbench-tabs">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="contract-workbench-tab">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <section className="contract-workbench-content">
            {children}
          </section>
        </Tabs>
      </div>
    </motion.section>
  );
};

const ContractOperationsWorkspace = ({
  contract,
  contractStats,
  invoices,
  paymentSchedules,
  crmActivities,
  crmStats,
  violationsCount,
  formatCurrency,
  crmNote,
  callStatus,
  isSavingCall,
  onCrmNoteChange,
  onCallStatusChange,
  onSaveCall,
  onOpenCrm,
  onWhatsApp,
  onOpenFinancial,
  onOpenViolations,
  onOpenDocuments,
}: {
  contract: Contract;
  contractStats: Record<string, unknown> | null;
  invoices: Invoice[];
  paymentSchedules: Array<{ status: string; due_date: string | null; amount: number | null }>;
  crmActivities: CustomerActivity[];
  crmStats: { total: number; calls: number; successfulCalls: number; missedCalls: number; messages: number; notes: number };
  violationsCount: number;
  formatCurrency: (amount: number) => string;
  crmNote: string;
  callStatus: 'answered' | 'no_answer' | 'busy';
  isSavingCall: boolean;
  onCrmNoteChange: (value: string) => void;
  onCallStatusChange: (value: 'answered' | 'no_answer' | 'busy') => void;
  onSaveCall: () => void;
  onOpenCrm: () => void;
  onWhatsApp: () => void;
  onOpenFinancial: () => void;
  onOpenViolations: () => void;
  onOpenDocuments: () => void;
}) => {
  const daysRemaining = Number(contractStats?.daysRemaining ?? 0);
  const activeInvoices = invoices.filter(isActiveFinancialInvoice);
  const collectibleInvoices = activeInvoices.filter((invoice) => !isPaidFinancialInvoice(invoice) && getInvoiceBalance(invoice) > 1);
  const activeSchedules = paymentSchedules.filter(isActiveScheduleItem);
  const totalOutstanding = collectibleInvoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0);
  const invoicesTotal = activeInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const schedulesTotal = activeSchedules.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const scheduleDifference = invoicesTotal - schedulesTotal;
  const scheduleMismatch = activeInvoices.length > 0 && activeSchedules.length > 0 && Math.abs(scheduleDifference) > 1;
  const lastCrmActivity = crmActivities[0];
  const lastContactDays = lastCrmActivity ? differenceInDays(new Date(), new Date(lastCrmActivity.created_at)) : null;
  const outstandingRatio = invoicesTotal > 0 ? Math.min(1, totalOutstanding / invoicesTotal) : 0;

  const healthScore = Math.max(0, Math.min(100,
    35 - Math.round(outstandingRatio * 35) +
    (daysRemaining > 30 ? 20 : daysRemaining >= 0 ? 12 : 4) +
    (violationsCount === 0 ? 15 : Math.max(0, 15 - violationsCount * 4)) +
    (scheduleMismatch ? 0 : 15) +
    (contract.status === 'active' ? 15 : contract.status === 'under_legal_procedure' ? 5 : 8)
  ));

  const scoreTone = healthScore >= 80 ? 'good' : healthScore >= 55 ? 'watch' : 'risk';
  const healthFactors = [
    { label: 'التحصيل', value: totalOutstanding > 0 ? `${formatCurrency(totalOutstanding)} متبقي` : 'مكتمل', state: totalOutstanding > 0 ? 'risk' : 'good' },
    { label: 'المدة', value: daysRemaining > 0 ? `${daysRemaining} يوم` : 'منتهي', state: daysRemaining <= 30 ? 'watch' : 'good' },
    { label: 'الجدول المالي', value: scheduleMismatch ? 'يحتاج مراجعة' : 'متطابق', state: scheduleMismatch ? 'risk' : 'good' },
    { label: 'التواصل', value: lastContactDays === null ? 'غير مسجل' : `${lastContactDays} يوم`, state: lastContactDays === null || lastContactDays > 7 ? 'watch' : 'good' },
  ];

  const smartTasks = [
    totalOutstanding > 0 && {
      title: 'تحصيل المستحقات المفتوحة',
      note: `${collectibleInvoices.length} فاتورة فعالة لديها رصيد مستحق بقيمة ${formatCurrency(totalOutstanding)}.`,
      priority: totalOutstanding > 5000 ? 'عالية' : 'متوسطة',
      icon: Wallet,
      action: onOpenFinancial,
    },
    scheduleMismatch && {
      title: 'مطابقة جدول الدفعات مع الفواتير',
      note: `يوجد فرق ${formatCurrency(Math.abs(scheduleDifference))} بين الفواتير الفعالة وجدول الدفعات.`,
      priority: 'عالية',
      icon: ClipboardList,
      action: onOpenFinancial,
    },
    (lastContactDays === null || lastContactDays > 7) && {
      title: 'تحديث سجل التواصل مع العميل',
      note: 'سجل مكالمة أو ملاحظة حتى تكون المتابعة قابلة للتدقيق.',
      priority: 'متوسطة',
      icon: Phone,
      action: onOpenCrm,
    },
    violationsCount > 0 && {
      title: 'مراجعة المخالفات المرتبطة',
      note: 'تحقق من حالة التحميل أو التحويل للعميل.',
      priority: 'متوسطة',
      icon: AlertCircle,
      action: onOpenViolations,
    },
    daysRemaining <= 30 && contract.status === 'active' && {
      title: 'قرار التجديد أو الإغلاق',
      note: 'العقد قريب من الانتهاء ويحتاج إجراء واضح.',
      priority: 'منخفضة',
      icon: Target,
      action: onOpenDocuments,
    },
  ].filter(Boolean) as Array<{ title: string; note: string; priority: string; icon: ElementType; action: () => void }>;

  return (
    <motion.section variants={fadeInUp} className="contract-operations-workspace">
      <div className={`contract-health-panel is-${scoreTone}`}>
        <header>
          <div>
            <span>Health Score</span>
            <h3>صحة العقد التشغيلية</h3>
          </div>
          <div className="contract-health-score">
            <strong>{healthScore}</strong>
            <small>/100</small>
          </div>
        </header>
        <div className="contract-health-meter">
          <i style={{ width: `${healthScore}%` }} />
        </div>
        <div className="contract-health-factors">
          {healthFactors.map((factor) => (
            <div key={factor.label} className={`is-${factor.state}`}>
              <span>{factor.label}</span>
              <strong>{factor.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="contract-smart-tasks-panel">
        <header>
          <div>
            <span>Smart Work Queue</span>
            <h3>مهام مقترحة حسب حالة العقد</h3>
          </div>
          <ClipboardList className="h-5 w-5" />
        </header>
        <div className="contract-smart-task-list">
          {smartTasks.length > 0 ? smartTasks.slice(0, 4).map((task) => {
            const Icon = task.icon;
            return (
              <button key={task.title} type="button" onClick={task.action} className="contract-smart-task">
                <i><Icon className="h-4 w-4" /></i>
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.note}</span>
                </div>
                <b>{task.priority}</b>
              </button>
            );
          }) : (
            <div className="contract-empty-state">
              <CheckCircle2 className="h-5 w-5" />
              <span>لا توجد مهام عاجلة على هذا العقد حاليا.</span>
            </div>
          )}
        </div>
      </div>

      <div className="contract-crm-panel">
        <header>
          <div>
            <span>Customer CRM</span>
            <h3>التواصل مع العميل</h3>
          </div>
          <button type="button" onClick={onOpenCrm}>فتح CRM</button>
        </header>
        <div className="contract-crm-stats">
          <div><strong>{crmStats.total}</strong><span>نشاط</span></div>
          <div><strong>{crmStats.calls}</strong><span>مكالمات</span></div>
          <div><strong>{crmStats.missedCalls}</strong><span>لم يرد</span></div>
        </div>
        <div className="contract-crm-last">
          <Phone className="h-4 w-4" />
          <div>
            <strong>{lastCrmActivity?.title || 'لا يوجد تواصل حديث'}</strong>
            <span>{lastCrmActivity?.content || 'سجل أول ملاحظة أو مكالمة من هنا.'}</span>
          </div>
        </div>
        <textarea
          value={crmNote}
          onChange={(event) => onCrmNoteChange(event.target.value)}
          placeholder="اكتب ملخص المكالمة أو الملاحظة..."
          className="contract-crm-note"
          rows={3}
        />
        <div className="contract-crm-actions">
          <select value={callStatus} onChange={(event) => onCallStatusChange(event.target.value as 'answered' | 'no_answer' | 'busy')}>
            <option value="answered">تم الرد</option>
            <option value="no_answer">لم يرد</option>
            <option value="busy">مشغول</option>
          </select>
          <Button type="button" onClick={onSaveCall} disabled={isSavingCall} className="bg-[#173A63] text-white hover:bg-[#102C4D]">
            {isSavingCall ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            حفظ تواصل
          </Button>
          <Button type="button" variant="outline" onClick={onWhatsApp}>
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </Button>
        </div>
      </div>
    </motion.section>
  );
};

// ===== Tab Components =====

// Overview Tab
const ContractOverviewTab = ({
  contract,
  customerName,
  vehicleName,
  plateNumber,
  contractStats,
  trafficViolationsCount,
  formatCurrency,
  onStatusClick,
  onCustomerClick,
  onVehicleClick,
}: {
  contract: Contract;
  customerName: string;
  vehicleName: string;
  plateNumber?: string;
  contractStats: Record<string, unknown>;
  trafficViolationsCount: number;
  formatCurrency: (amount: number) => string;
  onStatusClick: () => void;
  onCustomerClick: () => void;
  onVehicleClick: () => void;
}) => (
  <div className="space-y-6">
    <ContractStatsGrid
      contractStats={contractStats}
      trafficViolationsCount={trafficViolationsCount}
      formatCurrency={formatCurrency}
    />

    <CustomerVehicleCards
      customerName={customerName}
      vehicleName={vehicleName}
      plateNumber={plateNumber}
      contract={contract}
      onCustomerClick={onCustomerClick}
      onVehicleClick={onVehicleClick}
    />

    {/* Contract Terms */}
    <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
      <CardHeader className="border-b border-[#E6ECF3] bg-[#FCFDFE]">
        <CardTitle className="flex items-center gap-2 text-lg text-[#142033]">
          <FileCheck className="h-5 w-5 text-[#173A63]" />
          شروط العقد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 [&>div]:rounded-xl [&>div]:border [&>div]:border-[#E3EAF2] [&>div]:bg-[#FAFBFC] [&>div]:p-4 [&_p:first-child]:mb-2 [&_p:first-child]:text-sm [&_p:first-child]:text-[#6A7688] [&_p:last-child]:font-bold [&_p:last-child]:text-[#142033]">
          <div>
            <p className="text-sm text-neutral-500 mb-2">تاريخ البداية</p>
            <p className="font-semibold text-neutral-900">
              {contract.start_date ? format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-2">تاريخ الانتهاء</p>
            <p className="font-semibold text-neutral-900">
              {contract.end_date ? format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar }) : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-2">الإيجار الشهري</p>
            <p className="font-semibold text-teal-600">{formatCurrency(contract.monthly_amount || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-2">التأمين</p>
            <p className="font-semibold text-neutral-900">{formatCurrency(contract.insurance_amount || 0)}</p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-2">طريقة الدفع</p>
            <p className="font-semibold text-neutral-900">
              {contract.payment_method === 'cash' ? 'نقدي' : contract.payment_method === 'bank' ? 'تحويل بنكي' : contract.payment_method || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-neutral-500 mb-2">الحد المسموح بالكيلومترات</p>
            <p className="font-semibold text-neutral-900">{contract.allowed_km ? `${contract.allowed_km.toLocaleString()} كم` : 'غير محدود'}</p>
          </div>
        </div>
        {contract.notes && (
          <div className="mt-6 pt-6 border-t border-neutral-100">
            <p className="text-sm text-neutral-500 mb-2">ملاحظات</p>
            <p className="text-neutral-700">{contract.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

// Contract Tab Component
const ContractTab = ({
  contract,
  paymentSchedules,
  checkInInspection,
  checkOutInspection,
}: {
  contract: Contract;
  paymentSchedules: PaymentSchedule[];
  checkInInspection?: VehicleInspection | null;
  checkOutInspection?: VehicleInspection | null;
}) => (
  <div className="space-y-5">
    <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
      <h2 className="text-xl font-black text-[#142033]">نسخة العقد الرسمية</h2>
      <p className="mt-1 text-sm text-[#6A7688]" dir="ltr">{contract.contract_number}</p>
    </div>
    <div className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm">
      <OfficialContractView
        contract={contract}
        paymentSchedules={paymentSchedules}
        checkInInspection={checkInInspection}
        checkOutInspection={checkOutInspection}
      />
    </div>
  </div>
);

// Financial Tab Component
const FinancialTab = ({
  contract,
  invoices,
  paymentSchedules,
  isLoadingPaymentSchedules,
  contractId,
  companyId,
  formatCurrency,
  onPayInvoice,
  onPreviewInvoice,
  onCreateInvoice,
  onCancelInvoice,
  isCancellingInvoice,
  onGeneratePaymentSchedules,
  onGenerateMissingInvoices,
  isGeneratingMissingInvoices,
  customerName,
  trafficViolations,
}: {
  contract: Contract;
  invoices: Invoice[];
  paymentSchedules: Array<{
    id: string;
    installment_number: number | null;
    due_date: string | null;
    amount: number | null;
    status: string;
    payment_date: string | null;
  }>;
  isLoadingPaymentSchedules: boolean;
  contractId: string;
  companyId: string;
  formatCurrency: (amount: number) => string;
  onPayInvoice: (invoice: Invoice) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onCreateInvoice: () => void;
  onCancelInvoice: (invoice: Invoice) => void;
  isCancellingInvoice: boolean;
  onGeneratePaymentSchedules: () => void;
  onGenerateMissingInvoices?: () => void;
  isGeneratingMissingInvoices?: boolean;
  customerName: string;
  trafficViolations: Array<{
    id: string;
    violation_number: string;
    violation_date: string;
    violation_type: string;
    fine_amount: number;
    status: string;
    location?: string | null;
  }>;
}) => (
  <div className="space-y-5">
    <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
      <h2 className="text-xl font-black text-[#142033]">الملف المالي للعقد</h2>
      <p className="mt-1 text-sm text-[#6A7688]" dir="ltr">{contract.contract_number}</p>
    </div>
    <Tabs defaultValue="overview" className="w-full">
    <TabsList className="mb-5 flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-[#D8E1EC] bg-white p-1 shadow-sm">
      <TabsTrigger
        value="overview"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <LayoutDashboard className="w-4 h-4" />
        نظرة عامة
      </TabsTrigger>
      <TabsTrigger
        value="invoices"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <Receipt className="w-4 h-4" />
        الفواتير
      </TabsTrigger>
      <TabsTrigger
        value="payments"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <CreditCard className="w-4 h-4" />
        الدفعات
      </TabsTrigger>
      <TabsTrigger
        value="schedule"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <Wallet className="w-4 h-4" />
        جدول الدفعات
      </TabsTrigger>
    </TabsList>

    <TabsContent value="overview" className="mt-0">
      <FinancialDashboard contract={contract} formatCurrency={formatCurrency} invoices={invoices} />
    </TabsContent>

    <TabsContent value="invoices" className="mt-0">
      <ContractInvoicesTabRedesigned
        invoices={invoices}
        formatCurrency={formatCurrency}
        onPayInvoice={onPayInvoice}
        onPreviewInvoice={onPreviewInvoice}
        onCreateInvoice={onCreateInvoice}
        onCancelInvoice={onCancelInvoice}
        isCancellingInvoice={isCancellingInvoice}
        onGenerateMissingInvoices={onGenerateMissingInvoices}
        isGeneratingMissingInvoices={isGeneratingMissingInvoices}
        contractNumber={contract.contract_number}
        customerInfo={{
          name: customerName,
          phone: contract.customer?.phone,
          email: contract.customer?.email,
          nationalId: contract.customer?.national_id,
          customerType: contract.customer?.customer_type,
        }}
        trafficViolations={trafficViolations}
      />
    </TabsContent>

    <TabsContent value="payments" className="mt-0">
      <ContractPaymentsTab
        contractId={contractId}
        companyId={companyId}
        invoiceIds={invoices.map(inv => inv.id)}
        formatCurrency={formatCurrency}
        contractNumber={contract.contract_number}
        customerInfo={{
          name: customerName,
          phone: contract.customer?.phone,
          nationalId: contract.customer?.national_id,
        }}
      />
    </TabsContent>

    <TabsContent value="schedule" className="mt-0">
      <EnhancedPaymentScheduleTab
        contract={contract}
        formatCurrency={formatCurrency}
        payments={paymentSchedules}
        onGenerateSchedules={invoices.length > 0 && paymentSchedules.length < invoices.length ? onGeneratePaymentSchedules : undefined}
        hasInvoices={invoices.length > 0}
        invoices={invoices}
      />
    </TabsContent>
    </Tabs>
  </div>
);

// Vehicle Tab Component
const VehicleTab = ({
  contract,
  customerName,
  plateNumber,
  formatCurrency,
}: {
  contract: Contract;
  customerName: string;
  plateNumber?: string;
  formatCurrency: (amount: number) => string;
}) => {
  const navigate = useNavigate();
  const vehicle = contract.vehicle;
  const vehicleName = `${vehicle?.make || ''} ${vehicle?.model || ''}`.trim() || 'مركبة غير محددة';
  const fuelLabel =
    vehicle?.fuel_type === 'petrol' ? 'بنزين' :
    vehicle?.fuel_type === 'diesel' ? 'ديزل' :
    vehicle?.fuel_type === 'electric' ? 'كهربائي' :
    vehicle?.fuel_type === 'hybrid' ? 'هجين' : 'غير محدد';
  const vehicleDetails = [
    { label: 'اللون', value: vehicle?.color || 'غير محدد', icon: Palette, accent: 'bg-[#38BDF8]/10 text-[#38BDF8]' },
    { label: 'رقم الهيكل', value: vehicle?.vin ? `...${vehicle.vin.slice(-8)}` : 'غير محدد', icon: Hash, accent: 'bg-[#7C83F6]/10 text-[#7C83F6]', dir: 'ltr' as const },
    { label: 'قراءة العداد', value: `${vehicle?.current_mileage?.toLocaleString() || '0'} كم`, icon: Gauge, accent: 'bg-[#22C7A1]/10 text-[#22C7A1]' },
    { label: 'نوع الوقود', value: fuelLabel, icon: Fuel, accent: 'bg-[#FB6B7A]/10 text-[#FB6B7A]' },
  ];
  
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
        <h2 className="text-xl font-black text-[#142033]">مركبة العقد</h2>
        <p className="mt-1 text-sm text-[#6A7688]">{customerName}</p>
      </div>
      {/* Vehicle Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white shadow-sm"
      >
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#22C7A1]/10 text-[#22C7A1]">
                  <Car className="h-7 w-7" />
                </div>
                <div>
                  <p className="mb-1 text-sm font-semibold text-[#94A3B8]">المركبة المرتبطة بالعقد</p>
                  <h2 className="text-2xl font-bold text-[#020617]">{vehicleName}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#F6F8FB] px-3 py-1 text-sm font-semibold text-[#020617]">
                      {vehicle?.year || 'غير محدد'}
                    </span>
                    <span className="rounded-lg bg-[#F6F8FB] px-3 py-1 text-sm font-semibold text-[#020617]">
                      {vehicle?.color || 'غير محدد'}
                    </span>
                    <span className="rounded-lg bg-[#22C7A1]/10 px-3 py-1 text-sm font-bold text-[#22C7A1]" dir="ltr">
                      {plateNumber || 'غير محدد'}
                    </span>
                  </div>
                </div>
              </div>

              {vehicle?.id && (
              <Button
                variant="outline"
                onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
                  className="gap-2 border-[#E5EAF1] bg-white text-[#020617] hover:bg-[#F6F8FB]"
              >
                  <ExternalLink className="h-4 w-4" />
                  عرض ملف المركبة
              </Button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {vehicleDetails.map((item) => (
                <div key={item.label} className="rounded-lg border border-[#E5EAF1] bg-[#F6F8FB] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#94A3B8]">{item.label}</span>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.accent}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="truncate text-lg font-bold text-[#020617]" dir={item.dir}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#E5EAF1] bg-[#F6F8FB] p-6 lg:border-r lg:border-t-0">
            <div className="grid h-full gap-4">
              <div className="rounded-lg border border-[#E5EAF1] bg-white p-5">
                <p className="mb-2 text-sm font-semibold text-[#94A3B8]">رقم اللوحة</p>
                <p className="text-3xl font-black text-[#020617]" dir="ltr">{plateNumber || 'غير محدد'}</p>
              </div>
              <div className="rounded-lg border border-[#E5EAF1] bg-white p-5">
                <p className="mb-2 text-sm font-semibold text-[#94A3B8]">العقد</p>
                <p className="text-xl font-bold text-[#020617]" dir="ltr">{contract.contract_number}</p>
                <p className="mt-2 text-sm text-[#94A3B8]">{customerName}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Pickup/Return Section */}
      <VehiclePickupReturnTabRedesigned
        contract={{
          id: contract.id,
          contract_number: contract.contract_number,
          customer_name: customerName,
          customer_phone: contract.customer?.phone || '',
          vehicle_plate: plateNumber || '',
          vehicle_make: contract.vehicle?.make || '',
          vehicle_model: contract.vehicle?.model || '',
          vehicle_year: contract.vehicle?.year || new Date().getFullYear(),
          start_date: contract.start_date,
          end_date: contract.end_date,
        }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

// Violations Tab Component
const ViolationsTab = ({
  trafficViolations,
  formatCurrency,
  contractNumber,
  onAddViolation,
}: {
  trafficViolations: Array<{
    id: string;
    violation_date: string | null;
    violation_type: string | null;
    fine_amount: number | null;
    status: string;
  }>;
  formatCurrency: (amount: number) => string;
  contractNumber: string;
  onAddViolation?: (violation: Partial<any>) => Promise<void>;
}) => (
  <div className="space-y-5">
    <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
      <h2 className="text-xl font-black text-[#142033]">مخالفات العقد</h2>
      <p className="mt-1 text-sm text-[#6A7688]" dir="ltr">{contractNumber}</p>
    </div>
    <ContractViolationsTabRedesigned
      violations={trafficViolations}
      formatCurrency={formatCurrency}
      contractNumber={contractNumber}
      onAddViolation={onAddViolation}
    />
  </div>
);

// Documents Tab Component
const DocumentsTab = ({
  contract,
}: {
  contract: Contract;
}) => (
  <div className="space-y-5">
    <div className="rounded-xl border border-[#DDE5EF] bg-[#FCFDFE] p-4">
      <h2 className="text-xl font-black text-[#142033]">مستندات وسجل العقد</h2>
      <p className="mt-1 text-sm text-[#6A7688]" dir="ltr">{contract.contract_number}</p>
    </div>
    <Tabs defaultValue="documents" className="w-full">
    <TabsList className="mb-5 flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-[#D8E1EC] bg-white p-1 shadow-sm">
      <TabsTrigger
        value="documents"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <Folder className="w-4 h-4" />
        المستندات
      </TabsTrigger>
      <TabsTrigger
        value="timeline"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <GitBranch className="w-4 h-4" />
        الجدول الزمني
      </TabsTrigger>
      <TabsTrigger
        value="activity"
        className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#173A63] data-[state=active]:text-white"
      >
        <Activity className="w-4 h-4" />
        النشاط
      </TabsTrigger>
    </TabsList>

    <TabsContent value="documents" className="mt-0">
      <ContractDocuments contractId={contract.id} />
    </TabsContent>

    <TabsContent value="timeline" className="mt-0">
      <Card className="rounded-xl border-[#DDE5EF] shadow-sm">
        <CardHeader className="border-b border-[#E6ECF3] bg-[#FCFDFE]">
          <CardTitle className="text-lg text-[#142033]">الجدول الزمني للعقد</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineView contract={contract} trafficViolationsCount={0} formatCurrency={(amount: number) => `${amount.toLocaleString()} ر.ق`} />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="activity" className="mt-0">
      <Card className="rounded-xl border-[#DDE5EF] shadow-sm">
        <CardHeader className="border-b border-[#E6ECF3] bg-[#FCFDFE]">
          <CardTitle className="text-lg text-[#142033]">سجل النشاط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-16 text-center text-[#6A7688]">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-xl bg-[#EEF5FB]">
              <Activity className="h-10 w-10 text-[#173A63]" />
            </div>
            <p>سجل النشاط سيظهر هنا</p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
    </Tabs>
  </div>
);

// ===== Main Component =====
const ContractDetailsPageRedesigned = () => {
  const { t } = useFleetifyTranslation("ui");
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { startTour } = useTourGuide();
  const queryClient = useQueryClient();
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // State
  const [activeTab, setActiveTab] = useState('contract');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isEditWizardOpen, setIsEditWizardOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isOfficialExportOpen, setIsOfficialExportOpen] = useState(false);
  const [isStatusManagementOpen, setIsStatusManagementOpen] = useState(false);
  const [isConvertToLegalOpen, setIsConvertToLegalOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isDeletePermanentDialogOpen, setIsDeletePermanentDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemoveLegalDialogOpen, setIsRemoveLegalDialogOpen] = useState(false);
  const [isRemovingLegal, setIsRemovingLegal] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [relatedDataCounts, setRelatedDataCounts] = useState<{invoices: number; payments: number; violations: number} | null>(null);
  const [isCancellingInvoice, setIsCancellingInvoice] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [isCancelInvoiceDialogOpen, setIsCancelInvoiceDialogOpen] = useState(false);
  const [quickCrmNote, setQuickCrmNote] = useState('');
  const [quickCrmStatus, setQuickCrmStatus] = useState<'answered' | 'no_answer' | 'busy'>('answered');

  // Fetch contract data with caching
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract-details', contractNumber, companyId],
    queryFn: async () => {
      if (!contractNumber || !companyId) {
        throw new Error('رقم العقد أو الشركة مفقود');
      }

      let query = supabase
        .from('contracts')
        .select(`
          *,
          customer:customers!customer_id(
            id,
            customer_code,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type,
            phone,
            email,
            national_id
          ),
          vehicle:vehicles!vehicle_id(
            id,
            plate_number,
            make,
            model,
            year,
            color,
            status
          )
        `)
        .eq('company_id', companyId);

      // Check if input is UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(contractNumber);
      
      if (isUUID) {
        query = query.eq('id', contractNumber);
      } else {
        query = query.eq('contract_number', contractNumber);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as Contract;
    },
    enabled: !!contractNumber && !!companyId,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Fetch invoices with caching (including cancelled to show full history)
  const { data: invoices = [] } = useQuery({
    queryKey: ['contract-invoices', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('company_id', companyId)
        // Include all invoices including cancelled ones
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!contract?.id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Fetch traffic violations with caching
  const { data: trafficViolations = [] } = useQuery({
    queryKey: ['contract-violations', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];

      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('contract_id', contract.id)
        .order('violation_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contract?.id,
    staleTime: 30000, // Cache for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  // Vehicle inspections
  const { data: checkInInspections = [] } = useVehicleInspections({
    contractId: contract?.id,
    inspectionType: 'check_in',
    enabled: !!contract?.id,
  });
  const { data: checkOutInspections = [] } = useVehicleInspections({
    contractId: contract?.id,
    inspectionType: 'check_out',
    enabled: !!contract?.id,
  });
  const checkInInspection = checkInInspections[0] || null;
  const checkOutInspection = checkOutInspections[0] || null;

  // Fetch payment schedules
  const { data: paymentSchedules = [], isLoading: isLoadingPaymentSchedules } = useContractPaymentSchedules(contract?.id || '');

  const {
    activities: crmActivities = [],
    stats: crmStats,
    addActivity: addCrmActivity,
    isAdding: isAddingCrmActivity,
  } = useCustomerCRMActivity(contract?.customer_id || null);

  const { data: contractAuditLogs = [] } = useQuery({
    queryKey: ['contract-audit-logs', contract?.id],
    queryFn: async (): Promise<ContractAuditLog[]> => {
      if (!contract?.id) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, changes_summary, entity_name, created_at, severity, status, user_name')
        .eq('resource_type', 'contract')
        .eq('resource_id', contract.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.warn('Unable to load contract audit logs:', error);
        return [];
      }

      return (data || []) as ContractAuditLog[];
    },
    enabled: !!contract?.id,
    staleTime: 60000,
  });

  // Hook to generate payment schedules from invoices
  const generatePaymentSchedulesFromInvoices = useGeneratePaymentSchedulesFromInvoices();

  // Calculations
  const contractStats = useMemo(() => {
    if (!contract) return null;

    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    const today = new Date();

    const totalDays = differenceInDays(endDate, startDate);
    const daysElapsed = differenceInDays(today, startDate);
    const daysRemaining = differenceInDays(endDate, today);

    const totalMonths = Math.ceil(totalDays / 30);
    const monthsElapsed = Math.max(0, Math.floor(daysElapsed / 30));
    const monthsRemaining = Math.max(0, Math.ceil(daysRemaining / 30));

    const progressPercentage = Math.max(0, Math.min(100, (daysElapsed / totalDays) * 100));

    const totalAmount = (contract.monthly_amount || 0) * totalMonths;
    const paidAmount = contract.paid_amount || 0;

    return {
      totalAmount,
      monthlyAmount: contract.monthly_amount || 0,
      totalDays,
      daysElapsed,
      daysRemaining,
      totalMonths,
      monthsElapsed,
      monthsRemaining,
      progressPercentage,
      paidPayments: monthsElapsed,
      totalPayments: totalMonths,
      paymentStatus: paidAmount >= totalAmount ? 'completed' : 'pending',
      extraPayments: 0,
    };
  }, [contract]);

  const customerName = useMemo(() => {
    if (!contract?.customer) return 'غير محدد';
    return formatCustomerName(contract.customer);
  }, [contract?.customer]);

  const vehicleName = useMemo(() => {
    if (!contract?.vehicle) return 'غير محدد';
    const vehicle = contract.vehicle;
    const make = vehicle.make || '';
    const model = vehicle.model || '';
    const year = vehicle.year || '';
    return `${make} ${model} ${year}`.trim();
  }, [contract?.vehicle]);

  const plateNumber = contract?.vehicle?.plate_number;

  // Handlers
  const handleBack = useCallback(() => {
    navigate('/contracts');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contract-details'] });
  }, [queryClient]);

  const handlePrint = useCallback(() => {
    setIsPrintDialogOpen(true);
  }, []);

  const handleExport = useCallback(() => {
    setIsOfficialExportOpen(true);
  }, []);

  const handleCustomerClick = useCallback(() => {
    if (contract?.customer?.id) {
      navigate(`/customers/${contract.customer.id}`);
    }
  }, [contract, navigate]);

  const handleVehicleClick = useCallback(() => {
    if (contract?.vehicle?.id) {
      navigate(`/fleet/vehicles/${contract.vehicle.id}`);
    }
  }, [contract, navigate]);

  const handleOpenCustomerCrm = useCallback(() => {
    if (contract?.customer_id) {
      navigate(`/customers/crm?customer=${contract.customer_id}&contract=${contract.id}`);
    } else {
      navigate('/customers/crm');
    }
  }, [contract?.customer_id, contract?.id, navigate]);

  const handleWhatsAppCustomer = useCallback(() => {
    const phone = contract?.customer?.phone?.replace(/[^\d+]/g, '');
    if (!phone) {
      toast({
        title: 'لا يوجد رقم جوال',
        description: 'ملف العميل لا يحتوي على رقم يمكن استخدامه في WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    window.open(`https://wa.me/${phone.replace(/^\+/, '')}`, '_blank', 'noopener,noreferrer');
  }, [contract?.customer?.phone, toast]);

  const handleSaveQuickCrmActivity = useCallback(async () => {
    if (!contract?.customer_id) return;

    try {
      await addCrmActivity({
        note_type: 'phone',
        title: 'متابعة من صفحة العقد',
        content: quickCrmNote.trim() || 'تم تسجيل محاولة تواصل من صفحة تفاصيل العقد.',
        call_status: quickCrmStatus,
        is_important: quickCrmStatus !== 'answered',
      });

      setQuickCrmNote('');
      toast({
        title: 'تم حفظ التواصل',
        description: 'تم تحديث سجل CRM لهذا العميل.',
      });
    } catch (error) {
      console.error('Error saving contract CRM activity:', error);
      toast({
        title: 'تعذر حفظ التواصل',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث سجل CRM.',
        variant: 'destructive',
      });
    }
  }, [addCrmActivity, contract?.customer_id, quickCrmNote, quickCrmStatus, toast]);

  const handleInvoicePay = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPayDialogOpen(true);
  }, []);

  const handleInvoicePreview = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  }, []);

  const handleCancelInvoice = useCallback((invoice: Invoice) => {
    setInvoiceToCancel(invoice);
    setIsCancelInvoiceDialogOpen(true);
  }, []);

  const confirmCancelInvoice = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!invoiceToCancel) return;

    setIsCancellingInvoice(true);
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, company_id, status, payment_status, notes, invoice_number, invoice_date, due_date')
        .eq('id', invoiceToCancel.id)
        .eq('company_id', invoiceToCancel.company_id || companyId)
        .maybeSingle();

      if (invoiceError) throw invoiceError;
      if (!invoice) {
        throw new Error('لم يتم العثور على الفاتورة أو لا تملك صلاحية الوصول لها.');
      }

      if (invoice.status === 'cancelled' || invoice.payment_status === 'cancelled') {
        toast({
          title: 'الفاتورة ملغاة مسبقاً',
          description: `الفاتورة ${invoice.invoice_number} ملغاة بالفعل.`,
        });
        return;
      }

      const { data: completedPayments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, payment_status')
        .eq('invoice_id', invoice.id)
        .in('payment_status', ['completed', 'paid', 'confirmed', 'cleared'])
        .limit(1);

      if (paymentsError) throw paymentsError;
      if (completedPayments && completedPayments.length > 0) {
        throw new Error('لا يمكن إلغاء فاتورة لديها دفعات مكتملة. قم بإلغاء الدفعات المرتبطة أولاً.');
      }

      const previousNotes = invoice.notes ? `${invoice.notes}\n` : '';
      const cancellationNote = `تم إلغاء الفاتورة من صفحة تفاصيل العقد بتاريخ ${new Date().toISOString()}`;
      const contractStartDate = contract?.start_date;
      const dateCorrections =
        contractStartDate
          ? {
              ...(invoice.invoice_date && invoice.invoice_date < contractStartDate
                ? { invoice_date: contractStartDate }
                : {}),
              ...(invoice.due_date && invoice.due_date < contractStartDate
                ? { due_date: contractStartDate }
                : {}),
            }
          : {};

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          balance_due: 0,
          notes: `${previousNotes}${cancellationNote}`,
          updated_at: new Date().toISOString(),
          ...dateCorrections,
        })
        .eq('id', invoice.id)
        .eq('company_id', invoice.company_id);

      if (error) throw error;

      toast({
        title: 'تم إلغاء الفاتورة',
        description: `تم إلغاء الفاتورة ${invoice.invoice_number} بنجاح`,
      });

      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: 'خطأ في إلغاء الفاتورة',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء الفاتورة',
        variant: 'destructive',
      });
    } finally {
      setIsCancellingInvoice(false);
      setIsCancelInvoiceDialogOpen(false);
      setInvoiceToCancel(null);
    }
  }, [companyId, contract?.start_date, invoiceToCancel, queryClient, toast]);

  const handleRenew = useCallback(() => {
    setIsRenewalDialogOpen(true);
  }, []);

  const handleAmend = useCallback(() => {
    setIsEditWizardOpen(true);
  }, []);

  const handleTerminate = useCallback(() => {
    setIsTerminateDialogOpen(true);
  }, []);

  const handleReactivate = useCallback(() => {
    setIsReactivateDialogOpen(true);
  }, []);

  const handleGeneratePaymentSchedules = useCallback(() => {
    if (!contract?.id) return;
    generatePaymentSchedulesFromInvoices.mutate(contract.id);
  }, [contract?.id, generatePaymentSchedulesFromInvoices]);

  const [isGeneratingMissingInvoices, setIsGeneratingMissingInvoices] = useState(false);
  const handleGenerateMissingInvoices = useCallback(async () => {
    if (!contract?.id) return;
    setIsGeneratingMissingInvoices(true);
    try {
      console.log('Generating payment schedules for contract:', contract.id);
      const { data: scheduleData, error: scheduleError } = await supabase.rpc('generate_payment_schedules_for_contract', {
        p_contract_id: contract.id,
        p_dry_run: false,
      });
      
      if (scheduleError) {
        console.error('Schedule generation error:', scheduleError);
        throw new Error(`فشل إنشاء جدول الدفعات: ${scheduleError.message || scheduleError.code || 'خطأ غير معروف'}`);
      }
      
      console.log('Payment schedules created:', scheduleData);
      console.log('Generating invoices from payment schedule...');
      
      const { data: invoiceCount, error: invoiceError } = await supabase.rpc('generate_invoices_from_payment_schedule', {
        p_contract_id: contract.id,
      });
      
      if (invoiceError) {
        console.error('Invoice generation error:', invoiceError);
        throw new Error(`فشل إنشاء الفواتير: ${invoiceError.message || invoiceError.code || 'خطأ غير معروف'}`);
      }
      
      console.log('Invoices created:', invoiceCount);
      
      queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
      
      toast({
        title: 'تم إنشاء الفواتير بنجاح',
        description: invoiceCount ? `تم إنشاء ${invoiceCount} فاتورة` : 'تم إنشاء الفواتير',
      });
    } catch (error) {
      console.error('Error generating invoices:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as any).message)
        : 'حدث خطأ أثناء إنشاء الفواتير';
      
      toast({
        title: 'خطأ في إنشاء الفواتير',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingMissingInvoices(false);
    }
  }, [contract?.id, queryClient, toast]);

  // Handle add violation
  const handleAddViolation = useCallback(async (violation: Partial<any>) => {
    if (!contract?.id || !contract?.vehicle_id || !companyId) {
      throw new Error('بيانات العقد غير مكتملة');
    }

    const { error } = await supabase
      .from('traffic_violations')
      .insert({
        company_id: companyId,
        contract_id: contract.id,
        vehicle_id: contract.vehicle_id,
        violation_number: violation.violation_number || null,
        violation_type: violation.violation_type,
        violation_date: violation.violation_date,
        fine_amount: violation.fine_amount,
        location: violation.location || null,
        description: violation.description || null,
        status: 'pending',
      });

    if (error) throw error;

    // Send WhatsApp notification to customer
    try {
      const customerPhone = contract.customer?.phone;
      if (customerPhone) {
        const { generateViolationNotification } = await import('@/services/whatsapp/MessageTemplates');
        const { default: whatsAppService } = await import('@/services/whatsapp/WhatsAppService');
        
        const message = generateViolationNotification({
          customerName: formatCustomerName(contract.customer),
          contractNumber: contract.contract_number,
          vehiclePlate: contract.vehicle?.plate_number || contract.license_plate || 'غير محدد',
          violationType: violation.violation_type,
          violationNumber: violation.violation_number,
          violationDate: violation.violation_date,
          fineAmount: violation.fine_amount,
          location: violation.location,
        });

        // Try to send message (don't fail if WhatsApp is not configured)
        if (whatsAppService.isInitialized()) {
          await whatsAppService.sendTextMessage(customerPhone, message);
          toast({
            title: 'تم الإرسال',
            description: 'تم إرسال إشعار واتساب للعميل',
          });
        }
      }
    } catch (whatsappError) {
      console.warn('Failed to send WhatsApp notification:', whatsappError);
      // Don't fail the whole operation if WhatsApp fails
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['contract-violations', contract.id] });
    queryClient.invalidateQueries({ queryKey: ['contract-details', contractNumber, companyId] });
  }, [contract, companyId, contractNumber, queryClient, toast]);

  const handleOpenDeletePermanent = useCallback(async () => {
    if (!contract?.id) return;

    try {
      const [invoicesRes, paymentsRes, violationsRes] = await Promise.all([
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id),
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id),
        supabase.from('traffic_violations').select('id', { count: 'exact', head: true }).eq('contract_id', contract.id),
      ]);

      setRelatedDataCounts({
        invoices: invoicesRes.count || 0,
        payments: paymentsRes.count || 0,
        violations: violationsRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching related data counts:', error);
      setRelatedDataCounts({ invoices: 0, payments: 0, violations: 0 });
    }

    setIsDeletePermanentDialogOpen(true);
  }, [contract?.id]);

  const executeTerminateContract = useCallback(async () => {
    if (!contract?.id || !companyId) return;

    setIsTerminating(true);
    try {
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id)
        .eq('company_id', companyId);

      if (contractError) throw contractError;

      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      toast({
        title: 'تم إنهاء العقد',
        description: `تم إنهاء العقد #${contract.contract_number} بنجاح`,
      });

      setIsTerminateDialogOpen(false);
    } catch (error) {
      console.error('خطأ في إنهاء العقد:', error);
      toast({
        title: 'خطأ في إنهاء العقد',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsTerminating(false);
    }
  }, [contract, companyId, queryClient, toast]);

  const executeReactivateContract = useCallback(async () => {
    if (!contract?.id || !companyId) return;

    setIsReactivating(true);
    try {
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id)
        .eq('company_id', companyId);

      if (contractError) throw contractError;

      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      toast({
        title: 'تم إعادة تفعيل العقد',
        description: `تم إعادة تفعيل العقد #${contract.contract_number} بنجاح`,
      });

      setIsReactivateDialogOpen(false);
    } catch (error) {
      console.error('خطأ في إعادة تفعيل العقد:', error);
      toast({
        title: 'خطأ في إعادة تفعيل العقد',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsReactivating(false);
    }
  }, [contract, companyId, queryClient, toast]);

  const executeRemoveLegalProcedure = useCallback(async () => {
    if (!contract?.id || !companyId) return;

    setIsRemovingLegal(true);
    try {
      const { error: contractError } = await supabase
        .from('contracts')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id)
        .eq('company_id', companyId);

      if (contractError) throw contractError;

      await supabase
        .from('delinquent_customers')
        .delete()
        .eq('contract_id', contract.id);

      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });

      toast({
        title: 'تم إزالة الإجراء القانوني',
        description: `تم إعادة العقد #${contract.contract_number} للحالة النشطة`,
      });

      setIsRemoveLegalDialogOpen(false);
    } catch (error) {
      console.error('خطأ في إزالة الإجراء القانوني:', error);
      toast({
        title: 'خطأ في إزالة الإجراء القانوني',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingLegal(false);
    }
  }, [contract, companyId, queryClient, toast]);

  const executeDeletePermanent = useCallback(async () => {
    if (!contract?.id || !companyId) return;

    setIsDeleting(true);
    try {
      const { count: existingPaymentsCount, error: paymentsCountError } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('contract_id', contract.id);

      if (paymentsCountError) throw paymentsCountError;

      if ((existingPaymentsCount || 0) > 0) {
        throw new Error('لا يمكن حذف عقد لديه مدفوعات مسجلة. قم بإلغاء العقد أو أرشفته للحفاظ على السجل المالي.');
      }

      // 1. Unlink traffic violations (keep them in system, just remove contract link)
      await supabase
        .from('traffic_violations')
        .update({ contract_id: null })
        .eq('contract_id', contract.id);

      // 2. Delete other related records that are specific to this contract
      await supabase.from('delinquent_customers').delete().eq('contract_id', contract.id);
      await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          balance_due: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('contract_id', contract.id)
        .or('paid_amount.eq.0,paid_amount.is.null');
      await supabase.from('contract_payment_schedules').delete().eq('contract_id', contract.id);
      await supabase.from('lawsuit_preparations').delete().eq('contract_id', contract.id);

      if (contract.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', contract.vehicle_id);
      }

      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id)
        .eq('company_id', companyId);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      toast({
        title: 'تم الحذف النهائي',
        description: `تم حذف العقد #${contract.contract_number} وجميع البيانات المرتبطة به نهائياً`,
      });

      navigate('/contracts');
    } catch (error) {
      console.error('خطأ في الحذف النهائي:', error);
      toast({
        title: 'خطأ في الحذف',
        description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [contract, companyId, queryClient, toast, navigate]);

  // Loading state
  if (isLoading || isInitializing) {
    return <PageSkeletonFallback />;
  }

  if (error || !contract) {
    return (
      <div
        className="contract-details-system min-h-screen flex items-center justify-center bg-[#F6F8FB] p-6"
        style={contractDetailsSystemStyle}
      >
        <Card className="max-w-md w-full border-[#E5EAF1] shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-[#FB6B7A]/10">
              <AlertCircle className="h-8 w-8 text-[#FB6B7A]" />
            </div>
            <h2 className="text-lg font-bold text-neutral-900 mb-2">خطأ في تحميل العقد</h2>
            <p className="text-neutral-500 mb-4">لم يتم العثور على العقد المطلوب</p>
            <Button onClick={handleBack} className="bg-gradient-to-r from-teal-500 to-teal-600">
              العودة للقائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { value: 'contract', label: 'العقد', icon: FileCheck },
    { value: 'financial', label: 'المالي', icon: Receipt },
    { value: 'vehicle', label: 'المركبة', icon: Car },
    { value: 'violations', label: 'المخالفات', icon: AlertCircle },
    { value: 'documents', label: 'المستندات', icon: Folder },
  ];

  const contractWorkbenchContent = (
    <>
      <TabsContent value="contract" className="mt-0">
        <ContractTab
          contract={contract}
          paymentSchedules={paymentSchedules}
          checkInInspection={checkInInspection}
          checkOutInspection={checkOutInspection}
        />
      </TabsContent>

      <TabsContent value="financial" className="mt-0">
        <FinancialTab
          contract={contract}
          invoices={invoices}
          paymentSchedules={paymentSchedules}
          isLoadingPaymentSchedules={isLoadingPaymentSchedules}
          contractId={contract.id}
          companyId={companyId}
          formatCurrency={formatCurrency}
          onPayInvoice={handleInvoicePay}
          onPreviewInvoice={handleInvoicePreview}
          onCreateInvoice={() => setIsInvoiceDialogOpen(true)}
          onCancelInvoice={handleCancelInvoice}
          isCancellingInvoice={isCancellingInvoice}
          onGeneratePaymentSchedules={handleGeneratePaymentSchedules}
          onGenerateMissingInvoices={handleGenerateMissingInvoices}
          isGeneratingMissingInvoices={isGeneratingMissingInvoices}
          customerName={customerName}
          trafficViolations={trafficViolations}
        />
      </TabsContent>

      <TabsContent value="vehicle" className="mt-0">
        <VehicleTab
          contract={contract}
          customerName={customerName}
          plateNumber={plateNumber}
          formatCurrency={formatCurrency}
        />
      </TabsContent>

      <TabsContent value="violations" className="mt-0">
        <ViolationsTab
          trafficViolations={trafficViolations}
          formatCurrency={formatCurrency}
          contractNumber={contract.contract_number}
          onAddViolation={handleAddViolation}
        />
      </TabsContent>

      <TabsContent value="documents" className="mt-0">
        <DocumentsTab contract={contract} />
      </TabsContent>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="contract-details-system min-h-screen bg-[#F6F8FB]"
      style={contractDetailsSystemStyle}
      dir="rtl"
    >
      <div className="contract-page-shell mx-auto px-4 sm:px-6">
        <div className="contract-page-topbar">
          <Button variant="ghost" onClick={handleBack} className="contract-topbar-back">
            <ArrowRight className="h-4 w-4" />
            العودة للعقود
          </Button>
          <div className="contract-topbar-identity">
            <span>ملف عقد</span>
            <strong dir="ltr">{contract.contract_number}</strong>
          </div>
          <div className="contract-topbar-actions">
            <Button variant="outline" onClick={handleExport}>
              <Printer className="h-4 w-4" />
              طباعة العقد
            </Button>
            <ContractTopbarActions
              contract={contract}
              onRenew={handleRenew}
              onTerminate={handleTerminate}
              onReactivate={handleReactivate}
              onDeletePermanent={handleOpenDeletePermanent}
              onConvertToLegal={() => setIsConvertToLegalOpen(true)}
              onRemoveLegal={() => setIsRemoveLegalDialogOpen(true)}
            />
            <Button className="contract-primary-edit" onClick={() => setIsEditWizardOpen(true)}>
              <FileEdit className="h-4 w-4" />
              تعديل العقد
            </Button>
          </div>
        </div>

        <section className="contract-alerts-zone">
          <ContractAlerts
            contract={contract}
            trafficViolationsCount={trafficViolations.length}
            formatCurrency={formatCurrency}
          />
        </section>

        <div className="contract-redesigned-layout">
          <section className="contract-hero-zone">
            <ContractCommandHeader
              contract={contract}
              customerName={customerName}
              vehicleName={vehicleName}
              plateNumber={plateNumber}
              contractStats={contractStats}
              invoicesCount={invoices.length}
              violationsCount={trafficViolations.length}
              formatCurrency={formatCurrency}
              onBack={handleBack}
              onEdit={() => setIsEditWizardOpen(true)}
              onPrint={handlePrint}
              onExport={handleExport}
              onStatusClick={() => setIsStatusManagementOpen(true)}
              onCustomerClick={handleCustomerClick}
              onVehicleClick={handleVehicleClick}
            />
          </section>

          <section className="contract-decision-zone">
            <ContractCommandCenter
              contract={contract}
              contractStats={contractStats}
              invoices={invoices}
              paymentSchedules={paymentSchedules}
              crmActivities={crmActivities}
              auditLogs={contractAuditLogs}
              violationsCount={trafficViolations.length}
              formatCurrency={formatCurrency}
              onPrimaryAction={handleRefresh}
              onOpenFinancial={() => setActiveTab('financial')}
              onOpenViolations={() => setActiveTab('violations')}
              onOpenDocuments={() => setActiveTab('documents')}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={tabs}
            >
              {contractWorkbenchContent}
            </ContractCommandCenter>
          </section>

          <section className="contract-operations-zone">
            <ContractOperationsWorkspace
              contract={contract}
              contractStats={contractStats}
              invoices={invoices}
              paymentSchedules={paymentSchedules}
              crmActivities={crmActivities}
              crmStats={crmStats}
              violationsCount={trafficViolations.length}
              formatCurrency={formatCurrency}
              crmNote={quickCrmNote}
              callStatus={quickCrmStatus}
              isSavingCall={isAddingCrmActivity}
              onCrmNoteChange={setQuickCrmNote}
              onCallStatusChange={setQuickCrmStatus}
              onSaveCall={handleSaveQuickCrmActivity}
              onOpenCrm={handleOpenCustomerCrm}
              onWhatsApp={handleWhatsAppCustomer}
              onOpenFinancial={() => setActiveTab('financial')}
              onOpenViolations={() => setActiveTab('violations')}
              onOpenDocuments={() => setActiveTab('documents')}
            />
          </section>
        </div>

      </div>

      {/* Dialogs */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <PayInvoiceDialog
              open={isPayDialogOpen}
              onOpenChange={setIsPayDialogOpen}
              invoice={selectedInvoice}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
                setIsPayDialogOpen(false);
              }}
            />
            <InvoicePreviewDialog
              invoice={selectedInvoice}
              open={isPreviewDialogOpen}
              onOpenChange={setIsPreviewDialogOpen}
              customerName={customerName}
            />
          </>
        )}
      </AnimatePresence>

      <ContractInvoiceDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        contract={contract}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
          setIsInvoiceDialogOpen(false);
        }}
      />

      <ContractRenewalDialog open={isRenewalDialogOpen} onOpenChange={setIsRenewalDialogOpen} contract={contract} />

      {contract && (
        <SimpleContractWizard
          open={isEditWizardOpen}
          onOpenChange={(open) => {
            setIsEditWizardOpen(open);
            if (!open) {
              queryClient.invalidateQueries({ queryKey: ['contract-details'] });
            }
          }}
          editContract={contract}
          key={contract?.id || 'wizard-closed'}
        />
      )}

      <ContractPrintDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen} contract={contract} />

      <Dialog open={isOfficialExportOpen} onOpenChange={setIsOfficialExportOpen}>
        <DialogContent className="max-h-[95vh] max-w-[96vw] overflow-auto rounded-2xl bg-[#F6F8FB] p-4">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-black text-[#142033]">
              تصدير العقد الرسمي
            </DialogTitle>
          </DialogHeader>
          <OfficialContractView
            contract={contract}
            paymentSchedules={paymentSchedules}
            checkInInspection={checkInInspection}
            checkOutInspection={checkOutInspection}
          />
        </DialogContent>
      </Dialog>

      <ContractStatusManagement open={isStatusManagementOpen} onOpenChange={setIsStatusManagementOpen} contract={contract} />

      <ConvertToLegalDialog open={isConvertToLegalOpen} onOpenChange={setIsConvertToLegalOpen} contract={contract} />

      {/* Terminate Dialog */}
      <AlertDialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <AlertDialogContent className="rounded-2xl" data-tour="contract-terminate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>إنهاء العقد</AlertDialogTitle>
            <AlertDialogDescription data-tour="contract-terminate-warning">
              هل أنت متأكد من إنهاء العقد #{contract.contract_number}؟ سيتم تحديث حالة العقد إلى "ملغي" وتحرير المركبة.
            </AlertDialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => startTour('contract-terminate')}
              className="mt-2 h-9 w-fit gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
              data-tour="contract-terminate-tour-start"
            >
              <PlayCircle className="h-4 w-4" />
              ابدأ الجولة التعريفية
            </Button>
          </AlertDialogHeader>
          <AlertDialogFooter data-tour="contract-terminate-actions">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeTerminateContract}
              disabled={isTerminating}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
              data-tour="contract-terminate-submit"
            >
              {isTerminating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنهاء...
                </>
              ) : (
                'نعم، إنهاء العقد'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <AlertDialogContent className="rounded-2xl" data-tour="contract-reactivate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">إعادة تفعيل العقد</AlertDialogTitle>
            <AlertDialogDescription data-tour="contract-reactivate-warning">
              هل أنت متأكد من إعادة تفعيل العقد #{contract.contract_number}؟ سيتم تحديث حالة العقد إلى "نشط".
            </AlertDialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => startTour('contract-reactivate')}
              className="mt-2 h-9 w-fit gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
              data-tour="contract-reactivate-tour-start"
            >
              <PlayCircle className="h-4 w-4" />
              ابدأ الجولة التعريفية
            </Button>
          </AlertDialogHeader>
          <AlertDialogFooter data-tour="contract-reactivate-actions">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeReactivateContract}
              disabled={isReactivating}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              data-tour="contract-reactivate-submit"
            >
              {isReactivating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري التفعيل...
                </>
              ) : (
                'نعم، إعادة التفعيل'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Permanent Dialog */}
      <AlertDialog open={isDeletePermanentDialogOpen} onOpenChange={setIsDeletePermanentDialogOpen}>
        <AlertDialogContent className="rounded-2xl" data-tour="contract-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600">الحذف النهائي</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground" data-tour="contract-delete-warning">
                <p>هل أنت متأكد من حذف العقد #{contract.contract_number} نهائياً؟</p>
                {relatedDataCounts && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      سيتم حذف {relatedDataCounts.invoices} فاتورة و {relatedDataCounts.payments} دفعة نهائياً.
                      <br />
                      <strong>تنبيه:</strong> سيتم فك ارتباط {relatedDataCounts.violations} مخالفة مرورية عن هذا العقد والاحتفاظ بها في النظام.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => startTour('contract-delete-permanent')}
              className="mt-2 h-9 w-fit gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
              data-tour="contract-delete-tour-start"
            >
              <PlayCircle className="h-4 w-4" />
              ابدأ الجولة التعريفية
            </Button>
          </AlertDialogHeader>
          <AlertDialogFooter data-tour="contract-delete-actions">
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeletePermanent}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
              data-tour="contract-delete-submit"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الحذف...
                </>
              ) : (
                'نعم، حذف نهائياً'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Legal Procedure Dialog */}
      <AlertDialog open={isRemoveLegalDialogOpen} onOpenChange={setIsRemoveLegalDialogOpen}>
        <AlertDialogContent className="rounded-2xl" data-tour="contract-remove-legal-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">إزالة الإجراء القانوني</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground" data-tour="contract-remove-legal-warning">
                <p>هل أنت متأكد من إزالة الإجراء القانوني للعقد #{contract.contract_number}؟</p>
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800">
                    سيتم إعادة العقد للحالة النشطة وحذف سجل العميل المتعثر إن وجد.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => startTour('contract-remove-legal')}
              className="mt-2 h-9 w-fit gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
              data-tour="contract-remove-legal-tour-start"
            >
              <PlayCircle className="h-4 w-4" />
              ابدأ الجولة التعريفية
            </Button>
          </AlertDialogHeader>
          <AlertDialogFooter data-tour="contract-remove-legal-actions">
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRemoveLegalProcedure}
              disabled={isRemovingLegal}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              data-tour="contract-remove-legal-submit"
            >
              {isRemovingLegal ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإزالة...
                </>
              ) : (
                'نعم، إزالة الإجراء القانوني'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invoice Dialog */}
      <AlertDialog open={isCancelInvoiceDialogOpen} onOpenChange={setIsCancelInvoiceDialogOpen}>
        <AlertDialogContent className="rounded-2xl" data-tour="contract-cancel-invoice-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">إلغاء الفاتورة</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-muted-foreground" data-tour="contract-cancel-invoice-warning">
                <p>هل أنت متأكد من إلغاء الفاتورة <strong>{invoiceToCancel?.invoice_number}</strong>؟</p>
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    سيتم إلغاء الفاتورة ولن تظهر في التقارير المالية. هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => startTour('contract-cancel-invoice')}
              className="mt-2 h-9 w-fit gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100"
              data-tour="contract-cancel-invoice-tour-start"
            >
              <PlayCircle className="h-4 w-4" />
              ابدأ الجولة التعريفية
            </Button>
          </AlertDialogHeader>
          <AlertDialogFooter data-tour="contract-cancel-invoice-actions">
            <AlertDialogCancel className="rounded-xl">تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmCancelInvoice(e);
              }}
              disabled={isCancellingInvoice}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
              data-tour="contract-cancel-invoice-submit"
            >
              {isCancellingInvoice ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                'نعم، إلغاء الفاتورة'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        .contract-details-system {
          color: var(--contract-details-text);
          background:
            linear-gradient(180deg, #eef4f8 0%, #f7fafc 44%, #eef3f7 100%) !important;
        }

        .contract-page-shell {
          position: relative;
          width: min(100%, 1760px);
          max-width: 1760px;
          padding-bottom: 32px;
        }

        .contract-page-topbar {
          position: sticky;
          top: 0;
          z-index: 40;
          display: grid;
          grid-template-columns: minmax(160px, auto) minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          margin: 0 -24px 16px;
          border: 0;
          border-bottom: 1px solid var(--contract-details-border);
          border-radius: 0;
          background: color-mix(in srgb, var(--contract-details-surface) 94%, transparent);
          padding: 10px 24px;
          backdrop-filter: blur(14px);
          box-shadow: none;
        }

        .contract-topbar-back,
        .contract-topbar-actions button {
          height: 40px;
          gap: 7px;
          font-weight: 900;
        }

        .contract-topbar-identity {
          min-width: 0;
          border-inline-start: 1px solid var(--contract-details-border);
          padding-inline-start: 14px;
        }

        .contract-topbar-identity span,
        .contract-topbar-identity strong {
          display: block;
        }

        .contract-topbar-identity span {
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contract-topbar-identity strong {
          overflow: hidden;
          color: var(--contract-details-text);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 16px;
          font-weight: 950;
        }

        .contract-topbar-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }

        .contract-topbar-actions .contract-primary-edit {
          background: #173A63;
          color: white;
        }

        .contract-topbar-actions .contract-topbar-renew {
          background: var(--contract-details-success);
          color: white;
          border: 0;
        }

        .contract-topbar-actions .contract-topbar-renew:hover {
          background: #0f9f83;
        }

        .contract-topbar-actions .contract-topbar-more {
          background: #fff;
          color: var(--contract-details-text);
        }

        .contract-redesigned-layout {
          display: grid;
          grid-template-columns: minmax(360px, 420px) minmax(0, 1fr);
          grid-template-areas:
            "hero decision"
            "operations operations";
          gap: 16px;
          align-items: start;
        }

        .contract-alerts-zone {
          margin-bottom: 16px;
        }

        .contract-hero-zone {
          grid-area: hero;
          position: sticky;
          top: 76px;
        }

        .contract-side-rail {
          grid-area: side;
          display: grid;
          gap: 14px;
          position: static;
        }

        .contract-decision-zone {
          grid-area: decision;
        }

        .contract-operations-zone {
          grid-area: operations;
        }

        .contract-profile-card {
          border-radius: 8px !important;
        }

        .contract-profile-body {
          padding: 0 !important;
        }

        .contract-profile-main {
          display: block !important;
        }

        .contract-profile-identity {
          border: 0 !important;
          border-radius: 0 !important;
          background: #142033 !important;
          padding: 20px !important;
          color: white !important;
        }

        .contract-profile-identity button,
        .contract-profile-identity span {
          border-color: rgba(255, 255, 255, 0.18) !important;
        }

        .contract-profile-identity h1,
        .contract-profile-identity p,
        .contract-profile-identity span {
          color: white !important;
        }

        .contract-profile-identity .contract-type-badge {
          background: #ffffff !important;
          color: #000000 !important;
        }

        .contract-profile-identity h1 {
          white-space: normal !important;
          word-break: break-word;
          font-size: 24px !important;
          line-height: 1.2 !important;
        }

        .contract-profile-identity > .grid {
          grid-template-columns: 1fr !important;
        }

        .contract-profile-identity > .grid button {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.14) !important;
        }

        .contract-profile-identity > .grid button:hover {
          background: rgba(255, 255, 255, 0.14) !important;
        }

        .contract-profile-identity > .grid button p,
        .contract-profile-identity > .grid button div,
        .contract-profile-identity > .grid button span {
          color: white !important;
        }

        .contract-profile-identity > .grid button .contract-action-icon,
        .contract-profile-identity > .grid button .contract-action-icon svg {
          color: #000000 !important;
        }

        .contract-profile-progress {
          grid-template-columns: 1fr !important;
          padding: 16px !important;
        }

        .contract-profile-summary {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          padding: 0 16px 16px !important;
        }

        .contract-profile-summary > div {
          min-height: 88px;
          align-items: flex-start !important;
          flex-direction: column-reverse;
        }

        .contract-operations-zone .contract-operations-workspace {
          grid-template-columns: minmax(280px, 0.8fr) minmax(360px, 1fr) minmax(360px, 1fr) !important;
          align-items: stretch;
        }

        .contract-operations-zone .contract-crm-actions {
          grid-template-columns: minmax(96px, 0.75fr) minmax(130px, 1fr) minmax(112px, 0.8fr) !important;
        }

        .contract-hero-zone > section,
        .contract-side-rail > *,
        .contract-decision-zone > section,
        .contract-operations-zone > section,
        .contract-workbench-frame {
          border-color: var(--contract-details-border) !important;
          border-radius: 8px !important;
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.07) !important;
        }

        .contract-tabs-workbench,
        .contract-embedded-workbench {
          scroll-margin-top: 90px;
        }

        .contract-embedded-workbench {
          grid-column: 1 / -1;
          overflow: hidden;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: var(--contract-details-surface);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
        }

        .contract-workbench-frame {
          display: block !important;
          overflow: hidden;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: var(--contract-details-surface);
        }

        .contract-workbench-nav {
          position: relative !important;
          top: auto !important;
          border: 0 !important;
          border-bottom: 1px solid var(--contract-details-border) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background:
            linear-gradient(180deg, var(--contract-details-surface) 0%, var(--contract-details-inner) 100%) !important;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto;
          gap: 16px;
          align-items: center;
        }

        .contract-workbench-nav > div {
          padding: 0 !important;
        }

        .contract-workbench-tabs {
          margin-top: 0 !important;
          display: flex !important;
          flex-direction: row !important;
          justify-content: flex-end;
          overflow-x: auto !important;
          background: transparent !important;
          position: relative;
          z-index: 2;
          width: max-content;
          max-width: 100%;
          justify-self: end;
        }

        .contract-workbench-tab {
          width: auto !important;
          flex: 0 0 auto;
          min-height: 44px !important;
          border: 1px solid transparent !important;
          background: var(--contract-details-surface) !important;
          font-weight: 900;
          pointer-events: auto;
        }

        .contract-workbench-content {
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 22px;
          min-height: 560px;
        }

        .contract-details-system {
          color: var(--contract-details-text);
          font-size: 16px;
          background:
            linear-gradient(180deg, rgba(246, 248, 251, 0.72), var(--contract-details-inner) 260px),
            var(--contract-details-inner) !important;
        }

        .contract-details-system .text-\\[11px\\] {
          font-size: 13.5px !important;
          line-height: 1.6 !important;
        }

        .contract-details-system .text-xs {
          font-size: 14px !important;
          line-height: 1.65 !important;
        }

        .contract-details-system .text-sm {
          font-size: 15.5px !important;
          line-height: 1.7 !important;
        }

        .contract-details-system .bg-slate-50,
        .contract-details-system .bg-neutral-50,
        .contract-details-system .bg-neutral-100,
        .contract-details-system .bg-gray-50 {
          background-color: var(--contract-details-inner) !important;
        }

        .contract-details-system .bg-white,
        .contract-details-system [class*="bg-card"],
        .contract-details-system [data-radix-tabs-content],
        .contract-details-system table,
        .contract-details-system thead,
        .contract-details-system tbody {
          background-color: var(--contract-details-surface) !important;
        }

        .contract-details-system .rounded-3xl,
        .contract-details-system .rounded-2xl,
        .contract-details-system .rounded-xl,
        .contract-details-system .rounded-lg,
        .contract-details-system .rounded-md {
          border-radius: 8px !important;
        }

        .contract-details-system .shadow-lg,
        .contract-details-system .shadow-xl,
        .contract-details-system .shadow-2xl,
        .contract-details-system .shadow-md,
        .contract-details-system .shadow-sm {
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.07) !important;
        }

        .contract-details-system [role="tablist"] {
          border: 1px solid var(--contract-details-border) !important;
          border-radius: 8px !important;
          background: var(--contract-details-surface) !important;
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.06) !important;
        }

        .contract-details-system [role="tab"] {
          border-radius: 8px !important;
          color: var(--contract-details-muted) !important;
          font-weight: 900 !important;
        }

        .contract-details-system .border,
        .contract-details-system .border-slate-100,
        .contract-details-system .border-slate-200,
        .contract-details-system .border-neutral-100,
        .contract-details-system .border-neutral-200,
        .contract-details-system .border-gray-100,
        .contract-details-system .border-gray-200 {
          border-color: var(--contract-details-border) !important;
        }

        .contract-details-system .text-slate-900,
        .contract-details-system .text-neutral-900,
        .contract-details-system .text-gray-900,
        .contract-details-system .text-foreground {
          color: var(--contract-details-text) !important;
        }

        .contract-details-system .text-slate-600,
        .contract-details-system .text-slate-500,
        .contract-details-system .text-neutral-600,
        .contract-details-system .text-neutral-500,
        .contract-details-system .text-gray-600,
        .contract-details-system .text-gray-500,
        .contract-details-system .text-muted-foreground {
          color: var(--contract-details-muted) !important;
        }

        .contract-details-system .bg-gradient-to-br,
        .contract-details-system .bg-gradient-to-r,
        .contract-details-system .bg-gradient-to-l {
          background-image: none !important;
        }

        .contract-details-system .bg-\\[\\#00A896\\],
        .contract-details-system .bg-teal-500,
        .contract-details-system .bg-teal-600,
        .contract-details-system .bg-emerald-500,
        .contract-details-system .bg-emerald-600,
        .contract-details-system .from-teal-500,
        .contract-details-system .to-teal-600,
        .contract-details-system .from-emerald-500,
        .contract-details-system .to-emerald-600,
        .contract-details-system .from-\\[\\#00A896\\],
        .contract-details-system .via-\\[\\#008F7A\\],
        .contract-details-system .to-\\[\\#007A68\\] {
          background-color: var(--contract-details-success) !important;
          color: white !important;
        }

        .contract-details-system .bg-blue-50,
        .contract-details-system .bg-sky-50,
        .contract-details-system .bg-cyan-50 {
          background-color: color-mix(in srgb, var(--contract-details-info) 11%, white) !important;
        }

        .contract-details-system .text-blue-600,
        .contract-details-system .text-sky-600,
        .contract-details-system .text-cyan-600,
        .contract-details-system .text-blue-700,
        .contract-details-system .text-sky-700 {
          color: var(--contract-details-info) !important;
        }

        .contract-details-system .bg-purple-50,
        .contract-details-system .bg-indigo-50,
        .contract-details-system .bg-violet-50 {
          background-color: color-mix(in srgb, var(--contract-details-focus) 11%, white) !important;
        }

        .contract-details-system .text-purple-600,
        .contract-details-system .text-indigo-600,
        .contract-details-system .text-violet-600,
        .contract-details-system .text-purple-700,
        .contract-details-system .text-indigo-700 {
          color: var(--contract-details-focus) !important;
        }

        .contract-details-system .bg-red-50,
        .contract-details-system .bg-rose-50,
        .contract-details-system .bg-orange-50,
        .contract-details-system .bg-amber-50 {
          background-color: color-mix(in srgb, var(--contract-details-alert) 12%, white) !important;
        }

        .contract-details-system .text-red-600,
        .contract-details-system .text-rose-600,
        .contract-details-system .text-orange-600,
        .contract-details-system .text-amber-600,
        .contract-details-system .text-red-700,
        .contract-details-system .text-rose-700,
        .contract-details-system .text-amber-700 {
          color: var(--contract-details-alert) !important;
        }

        .contract-details-system .bg-green-50,
        .contract-details-system .bg-emerald-50,
        .contract-details-system .bg-teal-50 {
          background-color: color-mix(in srgb, var(--contract-details-success) 12%, white) !important;
        }

        .contract-details-system .text-green-600,
        .contract-details-system .text-emerald-600,
        .contract-details-system .text-teal-600,
        .contract-details-system .text-green-700,
        .contract-details-system .text-emerald-700,
        .contract-details-system .text-teal-700 {
          color: var(--contract-details-success) !important;
        }

        .contract-details-system button,
        .contract-details-system [role="tab"],
        .contract-details-system input,
        .contract-details-system textarea,
        .contract-details-system select {
          border-radius: 8px !important;
        }

        .contract-details-system input,
        .contract-details-system textarea,
        .contract-details-system select,
        .contract-details-system [role="combobox"] {
          background-color: var(--contract-details-inner) !important;
          border-color: var(--contract-details-border) !important;
          color: var(--contract-details-text) !important;
        }

        .contract-details-system [role="tablist"] {
          background: var(--contract-details-inner) !important;
          border-color: var(--contract-details-border) !important;
          gap: 0.25rem;
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .contract-details-system [role="tab"] {
          color: var(--contract-details-muted) !important;
          min-height: 42px;
        }

        .contract-command-center {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(260px, 0.75fr);
          gap: 14px;
          align-items: stretch;
        }

        .contract-next-action {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          overflow: hidden;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: white;
          padding: 18px;
        }

        .contract-next-action span {
          display: inline-block;
          color: var(--contract-details-muted);
          font-size: 12px;
          font-weight: 900;
        }

        .contract-next-action h2 {
          margin: 6px 0;
          color: var(--contract-details-text);
          font-size: 22px;
          font-weight: 950;
          line-height: 1.15;
        }

        .contract-next-action p {
          margin: 0;
          color: var(--contract-details-muted);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.8;
        }

        .contract-next-action.is-money {
          background: linear-gradient(90deg, color-mix(in srgb, var(--contract-details-alert) 10%, white), white);
        }

        .contract-next-action.is-legal {
          background: linear-gradient(90deg, color-mix(in srgb, var(--contract-details-focus) 10%, white), white);
        }

        .contract-next-action.is-stable {
          background: linear-gradient(90deg, color-mix(in srgb, var(--contract-details-success) 9%, white), white);
        }

        .contract-risk-board {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .contract-risk-tile {
          min-width: 0;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: white;
          padding: 13px;
          text-align: right;
          transition: border-color 0.18s ease, background-color 0.18s ease;
        }

        .contract-risk-tile:hover {
          border-color: var(--contract-details-info);
          background: var(--contract-details-inner);
        }

        .contract-risk-tile span {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contract-risk-tile strong {
          display: block;
          margin-top: 8px;
          color: var(--contract-details-text);
          font-size: 20px;
          font-weight: 950;
          line-height: 1;
        }

        .contract-risk-tile.is-danger {
          border-color: color-mix(in srgb, var(--contract-details-alert) 35%, white);
          background: color-mix(in srgb, var(--contract-details-alert) 8%, white);
        }

        .contract-risk-tile.is-danger strong,
        .contract-risk-tile.is-warning strong {
          color: var(--contract-details-alert);
        }

        .contract-risk-tile.is-warning {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .contract-risk-tile.is-ok strong {
          color: var(--contract-details-success);
        }

        .contract-activity-strip {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 220px repeat(3, minmax(0, 1fr));
          gap: 1px;
          overflow: hidden;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: var(--contract-details-border);
        }

        .contract-activity-strip header,
        .contract-activity-row {
          min-width: 0;
          background: white;
          padding: 13px 14px;
        }

        .contract-activity-strip header strong,
        .contract-activity-strip header span {
          display: block;
        }

        .contract-activity-strip header strong {
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 950;
        }

        .contract-activity-strip header span {
          margin-top: 3px;
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .contract-activity-row {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          color: var(--contract-details-muted);
          font-size: 12px;
          font-weight: 800;
        }

        .contract-activity-row b {
          overflow: hidden;
          color: var(--contract-details-text);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 950;
        }

        .contract-intelligence-panel,
        .contract-unified-timeline {
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: white;
          overflow: hidden;
        }

        .contract-intelligence-panel {
          grid-column: span 1;
        }

        .contract-unified-timeline {
          grid-column: span 1;
        }

        .contract-intelligence-panel > header,
        .contract-unified-timeline > header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--contract-details-border);
          background: var(--contract-details-inner);
          padding: 13px 14px;
        }

        .contract-intelligence-panel header strong,
        .contract-unified-timeline header strong,
        .contract-intelligence-panel header span,
        .contract-unified-timeline header span {
          display: block;
        }

        .contract-intelligence-panel header strong,
        .contract-unified-timeline header strong {
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 950;
        }

        .contract-intelligence-panel header span,
        .contract-unified-timeline header span {
          margin-top: 3px;
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .contract-intelligence-list {
          display: grid;
          gap: 0;
        }

        .contract-intelligence-item {
          border: 0;
          border-bottom: 1px solid var(--contract-details-border);
          background: white;
          padding: 13px 14px;
          text-align: right;
        }

        .contract-intelligence-item:last-child {
          border-bottom: 0;
        }

        .contract-intelligence-item span {
          display: block;
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 950;
        }

        .contract-intelligence-item p {
          margin: 4px 0 0;
          color: var(--contract-details-muted);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.65;
        }

        .contract-intelligence-item.is-danger {
          background: color-mix(in srgb, var(--contract-details-alert) 8%, white);
        }

        .contract-intelligence-item.is-danger span,
        .contract-intelligence-item.is-warning span {
          color: var(--contract-details-alert);
        }

        .contract-intelligence-item.is-warning {
          background: #fff7ed;
        }

        .contract-intelligence-item.is-ok span {
          color: var(--contract-details-success);
        }

        .contract-timeline-list {
          display: grid;
          max-height: 310px;
          overflow: auto;
        }

        .contract-timeline-event {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          border-bottom: 1px solid var(--contract-details-border);
          padding: 12px 14px;
        }

        .contract-timeline-event:last-child {
          border-bottom: 0;
        }

        .contract-timeline-event i {
          display: inline-flex;
          width: 32px;
          height: 32px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--contract-details-inner);
          color: var(--contract-details-info);
          font-style: normal;
        }

        .contract-timeline-event.is-success i {
          color: var(--contract-details-success);
          background: color-mix(in srgb, var(--contract-details-success) 11%, white);
        }

        .contract-timeline-event.is-warning i {
          color: var(--contract-details-alert);
          background: color-mix(in srgb, var(--contract-details-alert) 11%, white);
        }

        .contract-timeline-event strong,
        .contract-timeline-event span {
          display: block;
        }

        .contract-timeline-event strong {
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 950;
        }

        .contract-timeline-event span {
          margin-top: 3px;
          overflow: hidden;
          color: var(--contract-details-muted);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 750;
        }

        .contract-timeline-event time {
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .contract-operations-workspace {
          display: grid;
          grid-template-columns: minmax(240px, 0.85fr) minmax(320px, 1.15fr) minmax(300px, 1fr);
          gap: 14px;
          align-items: stretch;
        }

        .contract-health-panel,
        .contract-smart-tasks-panel,
        .contract-crm-panel {
          overflow: hidden;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: white;
          box-shadow: 0 10px 28px rgba(2, 6, 23, 0.06);
        }

        .contract-health-panel > header,
        .contract-smart-tasks-panel > header,
        .contract-crm-panel > header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--contract-details-border);
          background: var(--contract-details-inner);
          padding: 14px;
        }

        .contract-health-panel header span,
        .contract-smart-tasks-panel header span,
        .contract-crm-panel header span {
          display: block;
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contract-health-panel h3,
        .contract-smart-tasks-panel h3,
        .contract-crm-panel h3 {
          margin: 4px 0 0;
          color: var(--contract-details-text);
          font-size: 15px;
          font-weight: 950;
        }

        .contract-health-score {
          display: flex;
          min-width: 76px;
          align-items: baseline;
          justify-content: center;
          gap: 2px;
          border-radius: 8px;
          background: white;
          padding: 8px 10px;
          color: var(--contract-details-text);
        }

        .contract-health-score strong {
          font-size: 28px;
          font-weight: 950;
          line-height: 1;
        }

        .contract-health-score small {
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contract-health-meter {
          margin: 16px 14px 10px;
          height: 9px;
          overflow: hidden;
          border-radius: 999px;
          background: var(--contract-details-inner);
        }

        .contract-health-meter i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--contract-details-success);
        }

        .contract-health-panel.is-watch .contract-health-meter i {
          background: #f59e0b;
        }

        .contract-health-panel.is-risk .contract-health-meter i {
          background: var(--contract-details-alert);
        }

        .contract-health-factors {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 0 14px 14px;
        }

        .contract-health-factors div {
          min-width: 0;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: var(--contract-details-inner);
          padding: 10px;
        }

        .contract-health-factors span,
        .contract-health-factors strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .contract-health-factors span {
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contract-health-factors strong {
          margin-top: 4px;
          color: var(--contract-details-text);
          font-size: 12px;
          font-weight: 950;
        }

        .contract-health-factors .is-risk strong {
          color: var(--contract-details-alert);
        }

        .contract-health-factors .is-watch strong {
          color: #b45309;
        }

        .contract-health-factors .is-good strong {
          color: var(--contract-details-success);
        }

        .contract-smart-task-list {
          display: grid;
        }

        .contract-smart-task {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 0;
          border-bottom: 1px solid var(--contract-details-border);
          background: white;
          padding: 13px 14px;
          text-align: right;
        }

        .contract-smart-task:hover {
          background: var(--contract-details-inner);
        }

        .contract-smart-task i {
          display: inline-flex;
          width: 34px;
          height: 34px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: color-mix(in srgb, var(--contract-details-info) 10%, white);
          color: var(--contract-details-info);
          font-style: normal;
        }

        .contract-smart-task strong,
        .contract-smart-task span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .contract-smart-task strong {
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 950;
        }

        .contract-smart-task span {
          margin-top: 3px;
          color: var(--contract-details-muted);
          font-size: 12px;
          font-weight: 750;
        }

        .contract-smart-task b {
          border-radius: 999px;
          background: color-mix(in srgb, var(--contract-details-focus) 11%, white);
          color: var(--contract-details-focus);
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .contract-empty-state {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 18px 14px;
          color: var(--contract-details-success);
          font-size: 13px;
          font-weight: 900;
        }

        .contract-crm-panel header button {
          border: 1px solid var(--contract-details-border);
          background: white;
          color: var(--contract-details-info);
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 950;
        }

        .contract-crm-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          padding: 14px 14px 0;
        }

        .contract-crm-stats div {
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: var(--contract-details-inner);
          padding: 10px;
          text-align: center;
        }

        .contract-crm-stats strong,
        .contract-crm-stats span {
          display: block;
        }

        .contract-crm-stats strong {
          color: var(--contract-details-text);
          font-size: 17px;
          font-weight: 950;
        }

        .contract-crm-stats span {
          margin-top: 3px;
          color: var(--contract-details-muted);
          font-size: 11px;
          font-weight: 900;
        }

        .contract-crm-last {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          margin: 12px 14px;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: white;
          padding: 11px;
        }

        .contract-crm-last svg {
          color: var(--contract-details-success);
        }

        .contract-crm-last strong,
        .contract-crm-last span {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .contract-crm-last strong {
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 950;
        }

        .contract-crm-last span {
          margin-top: 3px;
          color: var(--contract-details-muted);
          font-size: 12px;
          font-weight: 750;
        }

        .contract-crm-note {
          display: block;
          width: calc(100% - 28px);
          margin: 0 14px 12px;
          resize: vertical;
          border: 1px solid var(--contract-details-border);
          border-radius: 8px;
          background: var(--contract-details-inner);
          padding: 10px;
          color: var(--contract-details-text);
          font-size: 13px;
          font-weight: 750;
          line-height: 1.6;
        }

        .contract-crm-actions {
          display: grid;
          grid-template-columns: minmax(110px, 0.7fr) minmax(130px, 1fr) minmax(118px, 0.8fr);
          gap: 8px;
          padding: 0 14px 14px;
        }

        .contract-crm-actions select,
        .contract-crm-actions button {
          min-width: 0;
          height: 40px;
          gap: 6px;
          font-weight: 950;
        }

        @media (max-width: 1180px) {
          .contract-page-topbar,
          .contract-redesigned-layout,
          .contract-workbench-nav {
            grid-template-columns: 1fr;
          }

          .contract-redesigned-layout {
            grid-template-areas:
              "hero"
              "decision"
              "operations";
          }

          .contract-side-rail {
            position: static;
            grid-template-columns: 1fr;
          }

          .contract-topbar-actions {
            justify-content: stretch;
          }

          .contract-topbar-actions button {
            flex: 1 1 130px;
          }

          .contract-workbench-tabs {
            justify-content: flex-start;
          }

          .contract-command-center,
          .contract-operations-workspace,
          .contract-next-action,
          .contract-activity-strip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .contract-risk-board {
            grid-template-columns: 1fr;
          }

          .contract-next-action button,
          .contract-action-dock button {
            width: 100%;
          }

          .contract-health-factors,
          .contract-crm-stats,
          .contract-crm-actions,
          .contract-smart-task {
            grid-template-columns: 1fr;
          }

          .contract-smart-task b {
            width: fit-content;
          }
        }

        .contract-details-system [role="tab"][data-state="active"] {
          background: var(--contract-details-focus) !important;
          color: white !important;
          border-color: var(--contract-details-focus) !important;
          box-shadow: 0 8px 18px rgba(23, 58, 99, 0.18) !important;
        }

        .contract-details-system [role="tab"][data-state="active"] svg {
          color: white !important;
        }

        .contract-details-system .hover\\:bg-slate-100:hover,
        .contract-details-system .hover\\:bg-neutral-100:hover,
        .contract-details-system .hover\\:bg-gray-100:hover {
          background-color: var(--contract-details-inner) !important;
        }

        .contract-details-system .bg-primary,
        .contract-details-system button[type="submit"] {
          background-color: var(--contract-details-success) !important;
          color: white !important;
        }

        .contract-details-system .bg-destructive,
        .contract-details-system .bg-red-600,
        .contract-details-system .bg-rose-600 {
          background-color: var(--contract-details-alert) !important;
          color: white !important;
        }

        .contract-details-system [class*="[&>div]:bg-primary"] > div,
        .contract-details-system [data-radix-progress-indicator],
        .contract-details-system .bg-primary {
          background-color: var(--contract-details-success) !important;
        }

        .contract-details-system th {
          color: var(--contract-details-muted) !important;
          background: var(--contract-details-inner) !important;
          font-weight: 700;
        }

        .contract-details-system tr:hover td {
          background-color: color-mix(in srgb, var(--contract-details-info) 6%, white) !important;
        }

        .contract-details-system .ring-offset-background {
          --tw-ring-offset-color: var(--contract-details-surface) !important;
        }

        .contract-details-system *:focus-visible {
          outline-color: var(--contract-details-focus) !important;
          --tw-ring-color: var(--contract-details-focus) !important;
        }

        @media (max-width: 768px) {
          .contract-details-system > div {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .contract-details-system [role="tab"] {
            flex: 0 0 auto;
            padding-inline: 0.9rem !important;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default ContractDetailsPageRedesigned;
