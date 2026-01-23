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
  CheckCircle2,
  Clock,
  Trash2,
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
  Palette,
  Gauge,
  Fuel,
  ExternalLink,
  Hash,
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
import { ContractPaymentsTabRedesigned } from './ContractPaymentsTabRedesigned';
import { ContractInvoicesTabRedesigned } from './ContractInvoicesTabRedesigned';
import { EnhancedPaymentScheduleTabRedesigned } from './EnhancedPaymentScheduleTabRedesigned';
import { VehiclePickupReturnTabRedesigned } from './VehiclePickupReturnTabRedesigned';
import { ContractViolationsTabRedesigned } from './ContractViolationsTabRedesigned';
import { ContractHeaderRedesigned } from './ContractHeaderRedesigned';
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
      show: contract.status === 'active',
    },
    {
      label: 'إعادة تفعيل العقد',
      icon: CheckCircle2,
      onClick: onReactivate,
      color: 'bg-emerald-500 hover:bg-emerald-600 text-white border-transparent',
      show: contract.status === 'cancelled',
    },
    {
      label: 'حذف العقد نهائياً',
      icon: Trash2,
      onClick: onDeletePermanent,
      color: 'bg-rose-600 hover:bg-rose-700 text-white border-transparent',
      show: true, // يظهر دائماً لجميع الحالات
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
  </div>
);

// Contract Tab Component
const ContractTab = ({
  contract,
}: {
  contract: Contract;
}) => (
  <div className="w-full">
    <OfficialContractView contract={contract} />
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
        value="payments"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <CreditCard className="w-4 h-4" />
        الدفعات
      </TabsTrigger>
      <TabsTrigger
        value="schedule"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-600 rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-teal-500"
      >
        <Wallet className="w-4 h-4" />
        جدول الدفعات
      </TabsTrigger>
    </TabsList>

    <TabsContent value="overview" className="mt-6">
      <FinancialDashboard contract={contract} formatCurrency={formatCurrency} />
    </TabsContent>

    <TabsContent value="invoices" className="mt-6">
      <ContractInvoicesTabRedesigned
        invoices={invoices}
        formatCurrency={formatCurrency}
        onPayInvoice={onPayInvoice}
        onPreviewInvoice={onPreviewInvoice}
        onCreateInvoice={onCreateInvoice}
        onCancelInvoice={onCancelInvoice}
        isCancellingInvoice={isCancellingInvoice}
        contractNumber={contract.contract_number}
      />
    </TabsContent>

    <TabsContent value="payments" className="mt-6">
      <ContractPaymentsTabRedesigned
        contractId={contractId}
        companyId={companyId}
        invoiceIds={invoices.map(inv => inv.id)}
        formatCurrency={formatCurrency}
      />
    </TabsContent>

    <TabsContent value="schedule" className="mt-6">
      <EnhancedPaymentScheduleTabRedesigned
        contract={contract}
        formatCurrency={formatCurrency}
        payments={paymentSchedules}
        onGenerateSchedules={invoices.length > 0 && paymentSchedules.length < invoices.length ? onGeneratePaymentSchedules : undefined}
        hasInvoices={invoices.length > 0}
      />
    </TabsContent>
  </Tabs>
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
  
  return (
    <div className="space-y-6">
      {/* Vehicle Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-[#00A896] via-[#008F7A] to-[#007A68] rounded-3xl p-6 text-white relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative z-10">
          {/* Header with plate number */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Car className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-blue-200 text-sm mb-1">المركبة المؤجرة</p>
                <h2 className="text-2xl font-bold">
                  {vehicle?.make || ''} {vehicle?.model || ''}
                </h2>
                <p className="text-blue-200">{vehicle?.year || ''}</p>
              </div>
            </div>
            
            {/* Plate Number Badge */}
            <div className="bg-white rounded-xl px-4 py-3 text-center shadow-lg">
              <p className="text-xs text-neutral-500 mb-1">رقم اللوحة</p>
              <p className="text-xl font-bold text-neutral-900 font-mono" dir="ltr">
                {plateNumber || 'غير محدد'}
              </p>
            </div>
          </div>
          
          {/* Vehicle Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                <Palette className="w-4 h-4" />
                <span>اللون</span>
              </div>
              <p className="font-semibold text-lg">{vehicle?.color || 'غير محدد'}</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                <Hash className="w-4 h-4" />
                <span>رقم الهيكل</span>
              </div>
              <p className="font-semibold text-sm font-mono" dir="ltr">
                {vehicle?.vin ? `...${vehicle.vin.slice(-8)}` : 'غير محدد'}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                <Gauge className="w-4 h-4" />
                <span>العداد</span>
              </div>
              <p className="font-semibold text-lg">
                {vehicle?.current_mileage?.toLocaleString() || '0'} كم
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                <Fuel className="w-4 h-4" />
                <span>نوع الوقود</span>
              </div>
              <p className="font-semibold text-lg">
                {vehicle?.fuel_type === 'petrol' ? 'بنزين' : 
                 vehicle?.fuel_type === 'diesel' ? 'ديزل' : 
                 vehicle?.fuel_type === 'electric' ? 'كهربائي' : 
                 vehicle?.fuel_type === 'hybrid' ? 'هجين' : 'غير محدد'}
              </p>
            </div>
          </div>
          
          {/* Action Button */}
          {vehicle?.id && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 rounded-xl gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                عرض تفاصيل المركبة الكاملة
              </Button>
            </div>
          )}
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
}) => (
  <ContractViolationsTabRedesigned
    violations={trafficViolations}
    formatCurrency={formatCurrency}
    contractNumber={contractNumber}
  />
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
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
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

  const handleExport = useCallback(() => {
    // Export functionality - can be implemented later
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

  const confirmCancelInvoice = useCallback(async (e?: React.MouseEvent) => {
    e?.preventDefault();
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

  const handleReactivate = useCallback(() => {
    setIsReactivateDialogOpen(true);
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
    { value: 'violations', label: 'المخالفات', icon: AlertCircle },
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
        {/* Contract Header - Redesigned */}
        <ContractHeaderRedesigned
          contract={contract}
          onEdit={() => setIsEditWizardOpen(true)}
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={handleRefresh}
          onStatusClick={() => setIsStatusManagementOpen(true)}
          isRefreshing={false}
        />

        {/* Quick Actions */}
        <QuickActionsBar
          contract={contract}
          onRenew={handleRenew}
          onAmend={handleAmend}
          onTerminate={handleTerminate}
          onReactivate={handleReactivate}
          onDeletePermanent={handleOpenDeletePermanent}
          onConvertToLegal={() => setIsConvertToLegalOpen(true)}
          onRemoveLegal={() => setIsRemoveLegalDialogOpen(true)}
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
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              <TabsContent value="violations" className="mt-0">
                <ViolationsTab
                  trafficViolations={trafficViolations}
                  formatCurrency={formatCurrency}
                  contractNumber={contract.contract_number}
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

      {/* Reactivate Dialog */}
      <AlertDialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">إعادة تفعيل العقد</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من إعادة تفعيل العقد #{contract.contract_number}؟ سيتم تحديث حالة العقد إلى "نشط".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeReactivateContract}
              disabled={isReactivating}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
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
              onClick={(e) => {
                e.preventDefault();
                confirmCancelInvoice(e);
              }}
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
