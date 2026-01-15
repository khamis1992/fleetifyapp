/**
 * صفحة تفاصيل العقد - UX Redesign V2
 * Professional SaaS design with improved information architecture
 * Better visual hierarchy, clearer actions, and enhanced mobile experience
 *
 * @component ContractDetailsPageRedesignedV2
 */

import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Printer,
  FileText,
  FileSignature,
  User,
  Car,
  RefreshCw,
  FileEdit,
  XCircle,
  DollarSign,
  Calendar,
  CreditCard,
  Info,
  Wallet,
  AlertTriangle,
  AlertCircle,
  Folder,
  GitBranch,
  Activity,
  CheckCircle,
  Clock,
  Plus,
  Eye,
  Scale,
  Loader2,
  LayoutDashboard,
  FileCheck,
  Receipt,
  Wrench,
  Phone,
  Mail,
  MapPin,
  Building2,
  Share2,
  Download,
  Bell,
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ContractDocuments } from './ContractDocuments';
import { OfficialContractView } from './OfficialContractView';
import { ContractStatusBadge } from './ContractStatusBadge';
import { ContractStatusManagement } from './ContractStatusManagement';
import { ConvertToLegalDialog } from './ConvertToLegalDialog';
import { VehicleHandoverUnified } from '@/components/contracts/VehicleHandoverUnified';
import { PayInvoiceDialog } from '@/components/finance/PayInvoiceDialog';
import { InvoicePreviewDialog } from '@/components/finance/InvoicePreviewDialog';
import { ContractInvoiceDialog } from '@/components/contracts/ContractInvoiceDialog';
import { ContractRenewalDialog } from './ContractRenewalDialog';
import { SimpleContractWizard } from './SimpleContractWizard';
import { ContractPrintDialog } from './ContractPrintDialog';
import { FinancialDashboard } from './FinancialDashboard';
import { ContractAlerts } from './ContractAlerts';
import { TimelineView } from './TimelineView';
import { QuickActionsButton } from './QuickActionsButton';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { useContractPaymentSchedules, useGeneratePaymentSchedulesFromInvoices } from '@/hooks/usePaymentSchedules';
import { ContractPaymentsTab } from './ContractPaymentsTab';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';

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

const slideIn = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
  }
};

// ===== Contract Header Component =====
const ContractHeader = ({
  contract,
  onBack,
  onRefresh,
  onPrint,
  onStatusClick,
}: {
  contract: Contract;
  onBack: () => void;
  onRefresh: () => void;
  onPrint: () => void;
  onStatusClick: () => void;
}) => {
  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case 'rental': return 'عقد إيجار';
      case 'lease': return 'عقد تأجير';
      case 'corporate': return 'عقد شركة';
      default: return type;
    }
  };

  const isExpiringSoon = contract.end_date && differenceInDays(new Date(contract.end_date), new Date()) <= 30;
  const isExpired = contract.end_date && new Date(contract.end_date) < new Date();

  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm"
    >
      {/* Cover Gradient */}
      <div className="h-28 bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0di0yaDJ2MmgtMnptMC00djJoMnYyaC0yem0wLTR2MmgydjJoLTJ6bTAgLTR2MmgydjJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

        {/* Top Actions */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrint}
              className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            >
              <Printer className="w-4 h-4" />
            </Button>
            <QuickActionsButton contract={contract} />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 pb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-neutral-900">#{contract.contract_number}</h1>
              <Badge className={cn(
                "text-sm px-3 py-1",
                isExpired ? 'bg-red-100 text-red-700' : isExpiringSoon ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
              )}>
                {isExpired ? 'منتهي' : isExpiringSoon ? 'ينتهي قريباً' : contract.status === 'active' ? 'نشط' : contract.status}
              </Badge>
            </div>
            <p className="text-neutral-500 text-lg">{getContractTypeLabel(contract.contract_type)}</p>
          </div>

          <div onClick={onStatusClick} className="cursor-pointer">
            <ContractStatusBadge status={contract.status} clickable />
          </div>
        </div>

        {/* Key Info Bar */}
        <div className="flex items-center gap-6 text-sm">
          {contract.start_date && (
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="w-4 h-4" />
              <span>من {format(new Date(contract.start_date), 'dd MMM yyyy', { locale: ar })}</span>
            </div>
          )}
          {contract.end_date && (
            <div className="flex items-center gap-2 text-neutral-600">
              <Calendar className="w-4 h-4" />
              <span>إلى {format(new Date(contract.end_date), 'dd MMM yyyy', { locale: ar })}</span>
            </div>
          )}
          {contract.monthly_amount && (
            <div className="flex items-center gap-2 text-teal-600 font-semibold">
              <DollarSign className="w-4 h-4" />
              <span>{contract.monthly_amount.toLocaleString()} ر.ق / شهرياً</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
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
      subtext: `${contractStats?.daysRemaining > 0 ? `${contractStats.daysRemaining} يوم متبقي` : contractStats?.daysRemaining === 0 ? 'ينتهي اليوم' : 'منتهي'}`,
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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {stats.map((stat, idx) => (
        <motion.div
          key={idx}
          variants={scaleIn}
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", stat.color)}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-neutral-500">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900 mb-1">{stat.value}</p>
          <p className="text-sm text-neutral-500">{stat.subtext}</p>
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
    className="grid grid-cols-1 md:grid-cols-2 gap-4"
  >
    {/* Customer Card */}
    <Card className="border-neutral-200 hover:border-teal-200 transition-colors cursor-pointer" onClick={onCustomerClick}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <User className="w-7 h-7 text-white" />
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
    <Card className="border-neutral-200 hover:border-teal-200 transition-colors cursor-pointer" onClick={onVehicleClick}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Car className="w-7 h-7 text-white" />
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

// ===== Quick Actions Bar =====
const QuickActionsBar = ({
  contract,
  onRenew,
  onAmend,
  onTerminate,
  onConvertToLegal,
  onRemoveLegal,
}: {
  contract: Contract;
  onRenew: () => void;
  onAmend: () => void;
  onTerminate: () => void;
  onConvertToLegal: () => void;
  onRemoveLegal: () => void;
}) => {
  const actions = [
    {
      label: 'تجديد العقد',
      icon: RefreshCw,
      onClick: onRenew,
      color: 'bg-teal-500 hover:bg-teal-600 text-white border-transparent',
      show: contract.status === 'active',
    },
    {
      label: 'تعديل العقد',
      icon: FileEdit,
      onClick: onAmend,
      color: 'border-teal-200 text-teal-700 hover:bg-teal-50',
      show: contract.status === 'active',
    },
    {
      label: 'تحويل للشؤون القانونية',
      icon: Scale,
      onClick: onConvertToLegal,
      color: 'border-violet-200 text-violet-700 hover:bg-violet-50',
      show: contract.status === 'active' || contract.status === 'cancelled',
    },
    {
      label: 'إزالة الإجراء القانوني',
      icon: Scale,
      onClick: onRemoveLegal,
      color: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
      show: contract.status === 'under_legal_procedure',
    },
    {
      label: 'إنهاء العقد',
      icon: XCircle,
      onClick: onTerminate,
      color: 'border-rose-200 text-rose-700 hover:bg-rose-50',
      show: contract.status === 'active' || contract.status === 'cancelled',
    },
  ];

  const visibleActions = actions.filter(a => a.show);

  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white rounded-2xl border border-neutral-200 p-4"
    >
      <div className="flex items-center gap-3 overflow-x-auto">
        <span className="text-sm font-medium text-neutral-500 whitespace-nowrap">إجراءات سريعة:</span>
        {visibleActions.map((action, idx) => (
          <motion.div
            key={idx}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant={action.color.includes('border') ? 'outline' : 'default'}
              size="sm"
              onClick={action.onClick}
              className={cn("gap-2 whitespace-nowrap rounded-xl", action.color)}
            >
              <action.icon className="w-4 h-4" />
              {action.label}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
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
  onRenew,
  onAmend,
  onTerminate,
  onConvertToLegal,
  onRemoveLegal,
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
  onRenew: () => void;
  onAmend: () => void;
  onTerminate: () => void;
  onConvertToLegal: () => void;
  onRemoveLegal: () => void;
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
    <Card className="border-neutral-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-teal-600" />
          شروط العقد
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

    <QuickActionsBar
      contract={contract}
      onRenew={onRenew}
      onAmend={onAmend}
      onTerminate={onTerminate}
      onConvertToLegal={onConvertToLegal}
      onRemoveLegal={onRemoveLegal}
    />
  </div>
);

// Contract Tab Component
const ContractTab = ({
  contract,
}: {
  contract: Contract;
}) => (
  <Tabs defaultValue="details" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-neutral-200">
      <TabsTrigger
        value="details"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Info className="w-4 h-4" />
        التفاصيل
      </TabsTrigger>
      <TabsTrigger
        value="official"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <FileCheck className="w-4 h-4" />
        العقد الرسمي
      </TabsTrigger>
    </TabsList>

    <TabsContent value="details" className="mt-6">
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">معلومات العقد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-neutral-500 mb-2">رقم العقد</p>
              <p className="font-semibold text-neutral-900 text-lg">{contract.contract_number}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-2">نوع العقد</p>
              <p className="font-semibold text-neutral-900 text-lg">
                {contract.contract_type === 'rental' ? 'إيجار' : contract.contract_type}
              </p>
            </div>
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
              <p className="font-semibold text-teal-600 text-lg">
                {contract.monthly_amount ? `${contract.monthly_amount.toLocaleString()} ر.ق` : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500 mb-2">التأمين</p>
              <p className="font-semibold text-neutral-900 text-lg">
                {contract.insurance_amount ? `${contract.insurance_amount.toLocaleString()} ر.ق` : '-'}
              </p>
            </div>
          </div>
          {contract.notes && (
            <div className="pt-6 border-t border-neutral-100">
              <p className="text-sm text-neutral-500 mb-2">ملاحظات</p>
              <p className="text-neutral-700 leading-relaxed">{contract.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="official" className="mt-6">
      <OfficialContractView contract={contract} />
    </TabsContent>
  </Tabs>
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
}) => (
  <Tabs defaultValue="overview" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-neutral-200">
      <TabsTrigger
        value="overview"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <LayoutDashboard className="w-4 h-4" />
        نظرة عامة
      </TabsTrigger>
      <TabsTrigger
        value="invoices"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Receipt className="w-4 h-4" />
        الفواتير
      </TabsTrigger>
      <TabsTrigger
        value="schedule"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Wallet className="w-4 h-4" />
        جدول الدفعات
      </TabsTrigger>
      <TabsTrigger
        value="payments"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <CreditCard className="w-4 h-4" />
        الدفعات
      </TabsTrigger>
    </TabsList>

    <TabsContent value="overview" className="mt-6">
      <FinancialDashboard contract={contract} formatCurrency={formatCurrency} />
    </TabsContent>

    <TabsContent value="invoices" className="mt-6">
      <Card className="border-neutral-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">الفواتير</CardTitle>
          <Button onClick={onCreateInvoice} size="sm" className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl">
            <Plus className="w-4 h-4" />
            إنشاء فاتورة
          </Button>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-10 h-10 text-neutral-400" />
              </div>
              <p className="text-neutral-500">لا توجد فواتير لهذا العقد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>المبلغ المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : '-'}</TableCell>
                    <TableCell>{formatCurrency(invoice.total_amount || 0)}</TableCell>
                    <TableCell className={invoice.balance_due && invoice.balance_due > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      {formatCurrency(invoice.balance_due || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.payment_status === 'paid' ? 'مسدد' : invoice.payment_status === 'partial' ? 'جزئي' : 'مستحق'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => onPreviewInvoice(invoice)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {invoice.payment_status !== 'paid' && (
                          <Button size="sm" onClick={() => onPayInvoice(invoice)} className="bg-gradient-to-r from-teal-500 to-teal-600">
                            <DollarSign className="w-4 h-4 ml-2" />
                            دفع
                          </Button>
                        )}
                        {invoice.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onCancelInvoice(invoice)}
                            disabled={isCancellingInvoice}
                          >
                            <XCircle className="w-4 h-4 ml-1" />
                            إلغاء
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="schedule" className="mt-6">
      <Card className="border-neutral-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">جدول الدفعات</CardTitle>
          {invoices.length > 0 && paymentSchedules.length < invoices.length && (
            <Button
              onClick={onGeneratePaymentSchedules}
              size="sm"
              className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:shadow-lg shadow-teal-200 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
              إنشاء جدول الدفعات من الفواتير
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingPaymentSchedules ? (
            <div className="text-center py-16 text-neutral-500">
              <Loader2 className="w-12 h-12 text-neutral-300 mx-auto mb-4 animate-spin" />
              <p>جاري تحميل جدول الدفعات...</p>
            </div>
          ) : paymentSchedules.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-neutral-400" />
              </div>
              <p>لا يوجد جدول دفعات لهذا العقد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم القسط</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentSchedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.installment_number || '-'}</TableCell>
                    <TableCell>
                      {schedule.due_date ? format(new Date(schedule.due_date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(schedule.amount || 0)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          schedule.status === 'paid'
                            ? 'default'
                            : schedule.status === 'overdue'
                              ? 'destructive'
                              : schedule.status === 'partially_paid'
                                ? 'outline'
                                : 'secondary'
                        }
                      >
                        {schedule.status === 'paid'
                          ? 'مدفوع'
                          : schedule.status === 'overdue'
                            ? 'متأخر'
                            : schedule.status === 'pending'
                              ? 'معلق'
                              : schedule.status === 'partially_paid'
                                ? 'جزئي'
                                : schedule.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {schedule.payment_date
                        ? format(new Date(schedule.payment_date), 'dd/MM/yyyy', { locale: ar })
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="payments" className="mt-6">
      <ContractPaymentsTab
        contractId={contractId}
        companyId={companyId}
        invoiceIds={invoices.map(inv => inv.id)}
        formatCurrency={formatCurrency}
      />
    </TabsContent>
  </Tabs>
);

// Vehicle Tab Component
const VehicleTab = ({
  contract,
  customerName,
  plateNumber,
  trafficViolations,
  formatCurrency,
}: {
  contract: Contract;
  customerName: string;
  plateNumber?: string;
  trafficViolations: Array<{
    id: string;
    violation_date: string | null;
    violation_type: string | null;
    fine_amount: number | null;
    status: string;
  }>;
  formatCurrency: (amount: number) => string;
}) => (
  <Tabs defaultValue="handover" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-neutral-200">
      <TabsTrigger
        value="handover"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Wrench className="w-4 h-4" />
        استلام وتسليم المركبة
      </TabsTrigger>
      <TabsTrigger
        value="violations"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <AlertCircle className="w-4 h-4" />
        المخالفات
      </TabsTrigger>
    </TabsList>

    <TabsContent value="handover" className="mt-6">
      <VehicleHandoverUnified
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
        initialType="pickup"
        onComplete={(type, data) => {
          console.log('Handover completed:', type, data);
        }}
      />
    </TabsContent>

    <TabsContent value="violations" className="mt-6">
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">المخالفات المرورية</CardTitle>
        </CardHeader>
        <CardContent>
          {trafficViolations.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="text-neutral-500">لا توجد مخالفات مرورية لهذا العقد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trafficViolations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell>
                      {violation.violation_date ? format(new Date(violation.violation_date), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>{violation.violation_type || '-'}</TableCell>
                    <TableCell>{formatCurrency(violation.fine_amount || 0)}</TableCell>
                    <TableCell>
                      <Badge variant={violation.status === 'paid' ? 'default' : 'secondary'}>
                        {violation.status === 'paid' ? 'مسدد' : 'غير مسدد'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
);

// Documents Tab Component
const DocumentsTab = ({
  contract,
}: {
  contract: Contract;
}) => (
  <Tabs defaultValue="documents" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-neutral-200">
      <TabsTrigger
        value="documents"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Folder className="w-4 h-4" />
        المستندات
      </TabsTrigger>
      <TabsTrigger
        value="timeline"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <GitBranch className="w-4 h-4" />
        الجدول الزمني
      </TabsTrigger>
      <TabsTrigger
        value="activity"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Activity className="w-4 h-4" />
        النشاط
      </TabsTrigger>
    </TabsList>

    <TabsContent value="documents" className="mt-6">
      <ContractDocuments contractId={contract.id} />
    </TabsContent>

    <TabsContent value="timeline" className="mt-6">
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">الجدول الزمني للعقد</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineView contract={contract} trafficViolationsCount={0} formatCurrency={(amount: number) => `${amount.toLocaleString()} ر.ق`} />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="activity" className="mt-6">
      <Card className="border-neutral-200">
        <CardHeader>
          <CardTitle className="text-lg">سجل النشاط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-16 text-neutral-500">
            <div className="w-20 h-20 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-10 h-10 text-neutral-400" />
            </div>
            <p>سجل النشاط سيظهر هنا</p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
);

// ===== Main Component =====
const ContractDetailsPageRedesigned = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isEditWizardOpen, setIsEditWizardOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isStatusManagementOpen, setIsStatusManagementOpen] = useState(false);
  const [isConvertToLegalOpen, setIsConvertToLegalOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isDeletePermanentDialogOpen, setIsDeletePermanentDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemoveLegalDialogOpen, setIsRemoveLegalDialogOpen] = useState(false);
  const [isRemovingLegal, setIsRemovingLegal] = useState(false);
  const [relatedDataCounts, setRelatedDataCounts] = useState<{invoices: number; payments: number; violations: number} | null>(null);
  const [isCancellingInvoice, setIsCancellingInvoice] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [isCancelInvoiceDialogOpen, setIsCancelInvoiceDialogOpen] = useState(false);

  // Fetch contract data
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract-details', contractNumber, companyId],
    queryFn: async () => {
      if (!contractNumber || !companyId) {
        throw new Error('رقم العقد أو الشركة مفقود');
      }

      const { data, error } = await supabase
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
        .eq('contract_number', contractNumber)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data as Contract;
    },
    enabled: !!contractNumber && !!companyId,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ['contract-invoices', contract?.id],
    queryFn: async () => {
      if (!contract?.id) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!contract?.id,
  });

  // Fetch traffic violations
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
  });

  // Vehicle inspections
  const { data: checkInInspection } = useVehicleInspections(contract?.id, 'check_in');
  const { data: checkOutInspection } = useVehicleInspections(contract?.id, 'check_out');

  // Fetch payment schedules
  const { data: paymentSchedules = [], isLoading: isLoadingPaymentSchedules } = useContractPaymentSchedules(contract?.id || '');

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
    const customer = contract.customer;
    if (customer.customer_type === 'company') {
      return customer.company_name_ar || customer.company_name || 'شركة غير محددة';
    }
    return `${customer.first_name_ar || customer.first_name || ''} ${customer.last_name_ar || customer.last_name || ''}`.trim() || 'عميل غير محدد';
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

  const confirmCancelInvoice = useCallback(async () => {
    if (!invoiceToCancel) return;

    setIsCancellingInvoice(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceToCancel.id);

      if (error) throw error;

      toast({
        title: 'تم إلغاء الفاتورة',
        description: `تم إلغاء الفاتورة ${invoiceToCancel.invoice_number} بنجاح`,
      });

      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: 'خطأ في إلغاء الفاتورة',
        description: 'حدث خطأ أثناء إلغاء الفاتورة',
        variant: 'destructive',
      });
    } finally {
      setIsCancellingInvoice(false);
      setIsCancelInvoiceDialogOpen(false);
      setInvoiceToCancel(null);
    }
  }, [invoiceToCancel, queryClient, toast]);

  const handleRenew = useCallback(() => {
    setIsRenewalDialogOpen(true);
  }, []);

  const handleAmend = useCallback(() => {
    setIsEditWizardOpen(true);
  }, []);

  const handleTerminate = useCallback(() => {
    setIsTerminateDialogOpen(true);
  }, []);

  const handleGeneratePaymentSchedules = useCallback(() => {
    if (!contract?.id) return;
    generatePaymentSchedulesFromInvoices.mutate(contract.id);
  }, [contract?.id, generatePaymentSchedulesFromInvoices]);

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
      await supabase.from('delinquent_customers').delete().eq('contract_id', contract.id);
      await supabase.from('payments').delete().eq('contract_id', contract.id);
      await supabase.from('invoices').delete().eq('contract_id', contract.id);
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
      <div className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-neutral-200">
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
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
    { value: 'overview', label: 'نظرة عامة', icon: LayoutDashboard },
    { value: 'contract', label: 'العقد', icon: FileCheck },
    { value: 'financial', label: 'المالي', icon: Receipt },
    { value: 'vehicle', label: 'المركبة', icon: Car },
    { value: 'documents', label: 'المستندات', icon: Folder },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-neutral-100 via-white to-neutral-100"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Contract Header */}
        <ContractHeader
          contract={contract}
          onBack={handleBack}
          onRefresh={handleRefresh}
          onPrint={handlePrint}
          onStatusClick={() => setIsStatusManagementOpen(true)}
        />

        {/* Alerts */}
        <ContractAlerts
          contract={contract}
          trafficViolationsCount={trafficViolations.length}
          formatCurrency={formatCurrency}
        />

        {/* Main Tabs */}
        <motion.div
          variants={fadeInUp}
          className="bg-white rounded-3xl border border-neutral-200 overflow-hidden shadow-sm"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-neutral-200 px-6">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-4 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500 hover:bg-teal-50/50 whitespace-nowrap"
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="p-8">
              <TabsContent value="overview" className="mt-0">
                <ContractOverviewTab
                  contract={contract}
                  customerName={customerName}
                  vehicleName={vehicleName}
                  plateNumber={plateNumber}
                  contractStats={contractStats}
                  trafficViolationsCount={trafficViolations.length}
                  formatCurrency={formatCurrency}
                  onStatusClick={() => setIsStatusManagementOpen(true)}
                  onCustomerClick={handleCustomerClick}
                  onVehicleClick={handleVehicleClick}
                  onRenew={handleRenew}
                  onAmend={handleAmend}
                  onTerminate={handleTerminate}
                  onConvertToLegal={() => setIsConvertToLegalOpen(true)}
                  onRemoveLegal={() => setIsRemoveLegalDialogOpen(true)}
                />
              </TabsContent>

              <TabsContent value="contract" className="mt-0">
                <ContractTab contract={contract} />
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
                />
              </TabsContent>

              <TabsContent value="vehicle" className="mt-0">
                <VehicleTab
                  contract={contract}
                  customerName={customerName}
                  plateNumber={plateNumber}
                  trafficViolations={trafficViolations}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <DocumentsTab contract={contract} />
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
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

      <ContractStatusManagement open={isStatusManagementOpen} onOpenChange={setIsStatusManagementOpen} contract={contract} />

      <ConvertToLegalDialog open={isConvertToLegalOpen} onOpenChange={setIsConvertToLegalOpen} contract={contract} />

      {/* Terminate Dialog */}
      <AlertDialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>إنهاء العقد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إنهاء العقد #{contract.contract_number}؟ سيتم تحديث حالة العقد إلى "ملغي" وتحرير المركبة.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeTerminateContract}
              disabled={isTerminating}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
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

      {/* Delete Permanent Dialog */}
      <AlertDialog open={isDeletePermanentDialogOpen} onOpenChange={setIsDeletePermanentDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600">الحذف النهائي</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>هل أنت متأكد من حذف العقد #{contract.contract_number} نهائياً؟</p>
                {relatedDataCounts && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      سيتم حذف {relatedDataCounts.invoices} فاتورة، {relatedDataCounts.payments} دفعة، و {relatedDataCounts.violations} مخالفة مرتبطة بهذا العقد. هذا الإجراء لا يمكن التراجع عنه!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDeletePermanent}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">إزالة الإجراء القانوني</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>هل أنت متأكد من إزالة الإجراء القانوني للعقد #{contract.contract_number}؟</p>
                <Alert className="border-emerald-200 bg-emerald-50">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <AlertDescription className="text-emerald-800">
                    سيتم إعادة العقد للحالة النشطة وحذف سجل العميل المتعثر إن وجد.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRemoveLegalProcedure}
              disabled={isRemovingLegal}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
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
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">إلغاء الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p>هل أنت متأكد من إلغاء الفاتورة <strong>{invoiceToCancel?.invoice_number}</strong>؟</p>
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    سيتم إلغاء الفاتورة ولن تظهر في التقارير المالية. هذا الإجراء لا يمكن التراجع عنه.
                  </AlertDescription>
                </Alert>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">تراجع</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelInvoice}
              disabled={isCancellingInvoice}
              className="bg-red-600 hover:bg-red-700 rounded-xl"
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
    </motion.div>
  );
};

export default ContractDetailsPageRedesigned;
