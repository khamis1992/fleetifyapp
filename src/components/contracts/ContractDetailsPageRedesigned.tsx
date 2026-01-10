/**
 * صفحة تفاصيل العقد - تصميم SaaS احترافي مع نظام ألوان تركواز
 * Professional SaaS design for Contract Details Page with Turquoise color system
 *
 * @component ContractDetailsPageRedesigned
 */

import { useState, useMemo, useCallback, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Printer,
  Download,
  FileText,
  FileSignature,
  User,
  Car,
  RefreshCw,
  FileEdit,
  XCircle,
  DollarSign,
  Calendar,
  CalendarCheck,
  CalendarX,
  CreditCard,
  ClipboardCheck,
  Info,
  Wallet,
  LogIn,
  LogOut,
  AlertTriangle,
  AlertCircle,
  Folder,
  GitBranch,
  Activity,
  CheckCircle,
  Clock,
  Circle,
  Plus,
  Eye,
  Upload,
  Scale,
  Loader2,
  ChevronDown,
  LayoutDashboard,
  FileCheck,
  Receipt,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { ContractAmendmentForm } from './ContractAmendmentForm';
import { ContractPrintDialog } from './ContractPrintDialog';
import { FinancialDashboard } from './FinancialDashboard';
import { ContractAlerts } from './ContractAlerts';
import { TimelineView } from './TimelineView';
import { QuickActionsButton } from './QuickActionsButton';
import { PageSkeletonFallback } from '@/components/common/LazyPageWrapper';
import { useContractPaymentSchedules } from '@/hooks/usePaymentSchedules';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';

// === Theme Colors ===
const TURQUOISE = '#40E0D0';
const TURQUOISE_DARK = '#20B2AA';
const TURQUOISE_LIGHT = 'rgb(45, 212, 191)'; // teal-400

// === New Tab Components ===

// Overview Tab Component
const ContractOverviewTab = ({
  contract,
  customerName,
  vehicleName,
  plateNumber,
  contractStats,
  trafficViolationsCount,
  formatCurrency,
  onStatusClick,
}: {
  contract: Contract;
  customerName: string;
  vehicleName: string;
  plateNumber?: string;
  contractStats: any;
  trafficViolationsCount: number;
  formatCurrency: (amount: number) => string;
  onStatusClick: () => void;
}) => (
  <div className="space-y-6">
    {/* Header Row */}
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200">
              <FileSignature className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">عقد #{contract.contract_number}</h2>
              <p className="text-sm text-slate-500">{contract.contract_type === 'rental' ? 'عقد إيجار' : contract.contract_type}</p>
            </div>
          </div>
          <div onClick={onStatusClick} className="cursor-pointer">
            <ContractStatusBadge status={contract.status} clickable />
          </div>
        </div>
        {contractStats?.daysRemaining !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-slate-600">
              {contractStats.daysRemaining > 0
                ? `${contractStats.daysRemaining} يوم متبقي`
                : contractStats.daysRemaining === 0
                  ? 'ينتهي اليوم'
                  : 'منتهي'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Quick Stats Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Value */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-teal-100/50 hover:scale-[1.02] transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs text-slate-500">إجمالي القيمة</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {formatCurrency(contractStats?.totalAmount || 0)}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          شهرياً: {formatCurrency(contractStats?.monthlyAmount || 0)}
        </p>
      </motion.div>

      {/* Duration */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-teal-100/50 hover:scale-[1.02] transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="w-11 h-11 bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs text-slate-500">مدة العقد</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {contractStats?.totalMonths || 0} شهر
        </p>
        <div className="mt-3">
          <Progress value={contractStats?.progressPercentage || 0} className="h-2" />
        </div>
      </motion.div>

      {/* Payment Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-teal-100/50 hover:scale-[1.02] transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shadow-lg",
            contractStats?.paymentStatus === 'completed'
              ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-200'
              : 'bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] shadow-teal-200'
          )}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs text-slate-500">حالة السداد</span>
        </div>
        <p className={cn(
          "text-2xl font-bold",
          contractStats?.paymentStatus === 'completed' ? 'text-emerald-600' : 'text-[#40E0D0]'
        )}>
          {contractStats?.paidPayments} / {contractStats?.totalPayments}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {contractStats?.paymentStatus === 'completed' ? 'تم السداد' : 'قيد السداد'}
        </p>
      </motion.div>

      {/* Violations */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg hover:shadow-teal-100/50 hover:scale-[1.02] transition-all duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shadow-lg",
            trafficViolationsCount > 0
              ? 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-rose-200'
              : 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-200'
          )}>
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs text-slate-500">المخالفات</span>
        </div>
        <p className="text-2xl font-bold text-slate-900">
          {trafficViolationsCount}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {trafficViolationsCount === 0 ? 'لا توجد مخالفات' : 'مخالفة مرورية'}
        </p>
      </motion.div>
    </div>

    {/* Customer & Vehicle Summary */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Customer Card */}
      <Card className="border-teal-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1">العميل</p>
              <p className="font-semibold text-slate-900">{customerName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Card */}
      <Card className="border-teal-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-1">السيارة</p>
              <p className="font-semibold text-slate-900">
                {vehicleName} {plateNumber && `• ${plateNumber}`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

// Contract Tab Component (Details + Official)
const ContractTab = ({
  contract,
  formatCurrency,
}: {
  contract: Contract;
  formatCurrency: (amount: number) => string;
}) => (
  <Tabs defaultValue="details" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-slate-200">
      <TabsTrigger
        value="details"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <Info className="w-4 h-4" />
        التفاصيل
      </TabsTrigger>
      <TabsTrigger
        value="official"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <FileCheck className="w-4 h-4" />
        العقد الرسمي
      </TabsTrigger>
    </TabsList>

    <TabsContent value="details" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معلومات العقد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">رقم العقد</p>
              <p className="font-semibold text-slate-900">{contract.contract_number}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">نوع العقد</p>
              <p className="font-semibold text-slate-900">{contract.contract_type === 'rental' ? 'إيجار' : contract.contract_type}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">تاريخ البداية</p>
              <p className="font-semibold text-slate-900">{contract.start_date ? format(new Date(contract.start_date), 'dd MMMM yyyy', { locale: ar }) : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">تاريخ الانتهاء</p>
              <p className="font-semibold text-slate-900">{contract.end_date ? format(new Date(contract.end_date), 'dd MMMM yyyy', { locale: ar }) : '-'}</p>
            </div>
          </div>
          {contract.notes && (
            <div>
              <p className="text-sm text-slate-500 mb-1">ملاحظات</p>
              <p className="text-slate-700">{contract.notes}</p>
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
}: {
  contract: Contract;
  invoices: Invoice[];
  paymentSchedules: any[];
  isLoadingPaymentSchedules: boolean;
  contractId: string;
  companyId: string;
  formatCurrency: (amount: number) => string;
  onPayInvoice: (invoice: Invoice) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onCreateInvoice: () => void;
}) => (
  <Tabs defaultValue="overview" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-slate-200">
      <TabsTrigger
        value="overview"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <LayoutDashboard className="w-4 h-4" />
        نظرة عامة
      </TabsTrigger>
      <TabsTrigger
        value="invoices"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <Receipt className="w-4 h-4" />
        الفواتير
      </TabsTrigger>
      <TabsTrigger
        value="schedule"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <Wallet className="w-4 h-4" />
        جدول الدفعات
      </TabsTrigger>
    </TabsList>

    <TabsContent value="overview" className="mt-6">
      <FinancialDashboard contract={contract} formatCurrency={formatCurrency} />
    </TabsContent>

    <TabsContent value="invoices" className="mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">الفواتير</CardTitle>
          <Button onClick={onCreateInvoice} size="sm" className="gap-2 bg-gradient-to-r from-[#40E0D0] to-[#20B2AA] hover:shadow-lg shadow-teal-200">
            <Plus className="w-4 h-4" />
            إنشاء فاتورة
          </Button>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد فواتير لهذا العقد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المبلغ</TableHead>
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
                          <Button size="sm" onClick={() => onPayInvoice(invoice)} className="bg-gradient-to-r from-[#40E0D0] to-[#20B2AA]">
                            <DollarSign className="w-4 h-4 ml-2" />
                            دفع
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">جدول الدفعات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPaymentSchedules ? (
            <div className="text-center py-12 text-slate-500">
              <Loader2 className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-spin" />
              <p>جاري تحميل جدول الدفعات...</p>
            </div>
          ) : paymentSchedules.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
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
                              : 'secondary'
                        }
                      >
                        {schedule.status === 'paid'
                          ? 'مدفوع'
                          : schedule.status === 'overdue'
                            ? 'متأخر'
                            : schedule.status === 'pending'
                              ? 'معلق'
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
  </Tabs>
);

// Vehicle Tab Component
const VehicleTab = ({
  contract,
  customerName,
  plateNumber,
  trafficViolations,
  contractId,
  companyId,
  formatCurrency,
}: {
  contract: Contract;
  customerName: string;
  plateNumber?: string;
  trafficViolations: any[];
  contractId: string;
  companyId: string;
  formatCurrency: (amount: number) => string;
}) => (
  <Tabs defaultValue="handover" className="w-full">
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-slate-200">
      <TabsTrigger
        value="handover"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <Wrench className="w-4 h-4" />
        استلام وتسليم المركبة
      </TabsTrigger>
      <TabsTrigger
        value="violations"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">المخالفات المرورية</CardTitle>
        </CardHeader>
        <CardContent>
          {trafficViolations.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد مخالفات مرورية لهذا العقد</p>
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
                {trafficViolations.map((violation: any) => (
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
    <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none border-b border-slate-200">
      <TabsTrigger
        value="documents"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <Folder className="w-4 h-4" />
        المستندات
      </TabsTrigger>
      <TabsTrigger
        value="timeline"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <GitBranch className="w-4 h-4" />
        الجدول الزمني
      </TabsTrigger>
      <TabsTrigger
        value="activity"
        className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-4 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0]"
      >
        <Activity className="w-4 h-4" />
        النشاط
      </TabsTrigger>
    </TabsList>

    <TabsContent value="documents" className="mt-6">
      <ContractDocuments contractId={contract.id} />
    </TabsContent>

    <TabsContent value="timeline" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">الجدول الزمني للعقد</CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineView contract={contract} trafficViolationsCount={0} formatCurrency={(amount: number) => `${amount.toLocaleString()} ر.ق`} />
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="activity" className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سجل النشاط</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-slate-500">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p>سجل النشاط سيظهر هنا</p>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
);

// === Main Component ===
const ContractDetailsPageRedesigned = () => {
  const { contractId: contractNumber } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isRenewalDialogOpen, setIsRenewalDialogOpen] = useState(false);
  const [isAmendmentDialogOpen, setIsAmendmentDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isStatusManagementOpen, setIsStatusManagementOpen] = useState(false);
  const [isConvertToLegalOpen, setIsConvertToLegalOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [isDeletePermanentDialogOpen, setIsDeletePermanentDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [relatedDataCounts, setRelatedDataCounts] = useState<{invoices: number; payments: number; violations: number} | null>(null);

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
        .order('due_date', { ascending: false });

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
    const make = vehicle.make_ar || vehicle.make || '';
    const model = vehicle.model_ar || vehicle.model || '';
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

  const handleInvoicePay = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPayDialogOpen(true);
  }, []);

  const handleInvoicePreview = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPreviewDialogOpen(true);
  }, []);

  const handleRenew = useCallback(() => {
    setIsRenewalDialogOpen(true);
  }, []);

  const handleAmend = useCallback(() => {
    setIsAmendmentDialogOpen(true);
  }, []);

  const handleTerminate = useCallback(() => {
    setIsTerminateDialogOpen(true);
  }, []);

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

      if (contract.vehicle_id) {
        await supabase
          .from('vehicles')
          .update({ status: 'available' })
          .eq('id', contract.vehicle_id);
      }

      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });

      toast({
        title: 'تم إنهاء العقد',
        description: `تم إنهاء العقد #${contract.contract_number} بنجاح`,
      });

      setIsTerminateDialogOpen(false);
    } catch (error: any) {
      console.error('خطأ في إنهاء العقد:', error);
      toast({
        title: 'خطأ في إنهاء العقد',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsTerminating(false);
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
    } catch (error: any) {
      console.error('خطأ في الحذف النهائي:', error);
      toast({
        title: 'خطأ في الحذف',
        description: error.message || 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [contract, companyId, queryClient, toast, navigate]);

  // Loading state
  if (isLoading) {
    return <PageSkeletonFallback />;
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">خطأ في تحميل العقد</h2>
            <p className="text-slate-500 mb-4">لم يتم العثور على العقد المطلوب</p>
            <Button onClick={handleBack}>العودة للقائمة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Back & Title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="rounded-xl"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#40E0D0] to-[#20B2AA] rounded-xl flex items-center justify-center shadow-lg shadow-teal-200">
                  <FileSignature className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">عقد #{contract.contract_number}</h1>
                  <p className="text-sm text-slate-500">تفاصيل العقد</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="rounded-xl"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPrintDialogOpen(true)}
                className="rounded-xl gap-2 border-[#40E0D0] text-[#40E0D0] hover:bg-teal-50"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">طباعة</span>
              </Button>
              <QuickActionsButton contract={contract} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Alerts */}
        <ContractAlerts
          contract={contract}
          trafficViolationsCount={trafficViolations.length}
          formatCurrency={formatCurrency}
        />

        {/* Main Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-200 px-6">
              <TabsList className="w-full justify-start bg-transparent h-auto p-0 rounded-none flex gap-1 overflow-x-auto">
                <TabsTrigger
                  value="overview"
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0] hover:bg-teal-50/50 whitespace-nowrap"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger
                  value="contract"
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0] hover:bg-teal-50/50 whitespace-nowrap"
                >
                  <FileCheck className="w-4 h-4" />
                  العقد
                </TabsTrigger>
                <TabsTrigger
                  value="financial"
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0] hover:bg-teal-50/50 whitespace-nowrap"
                >
                  <Receipt className="w-4 h-4" />
                  المالي
                </TabsTrigger>
                <TabsTrigger
                  value="vehicle"
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0] hover:bg-teal-50/50 whitespace-nowrap relative"
                >
                  <Car className="w-4 h-4" />
                  المركبة
                  {(checkInInspection || checkOutInspection) && (
                    <span className="absolute top-2 left-2 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:bg-teal-50 data-[state=active]:text-[#40E0D0] rounded-t-lg px-5 py-3 gap-2 transition-all border-b-2 border-transparent data-[state=active]:border-[#40E0D0] hover:bg-teal-50/50 whitespace-nowrap"
                >
                  <Folder className="w-4 h-4" />
                  المستندات
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
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
                />

                {/* Quick Actions */}
                <div className="mt-6 flex flex-wrap items-center gap-3 pt-6 border-t border-slate-200">
                  {contract.status === 'active' && (
                    <>
                      <Button onClick={handleRenew} className="gap-2 bg-gradient-to-r from-[#40E0D0] to-[#20B2AA] hover:shadow-lg shadow-teal-200 rounded-xl">
                        <RefreshCw className="w-4 h-4" />
                        تجديد العقد
                      </Button>
                      <Button onClick={handleAmend} variant="outline" className="gap-2 border-[#40E0D0] text-[#40E0D0] hover:bg-teal-50 rounded-xl">
                        <FileEdit className="w-4 h-4" />
                        تعديل العقد
                      </Button>
                    </>
                  )}
                  {(contract.status === 'active' || contract.status === 'cancelled') && (
                    <Button
                      onClick={() => setIsConvertToLegalOpen(true)}
                      variant="outline"
                      className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50 rounded-xl"
                    >
                      <Scale className="w-4 h-4" />
                      تحويل للشؤون القانونية
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleTerminate}
                    className="gap-2 border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl"
                  >
                    <XCircle className="w-4 h-4" />
                    إنهاء العقد
                  </Button>
                  {contract.status === 'cancelled' && (
                    <Button
                      variant="destructive"
                      onClick={handleOpenDeletePermanent}
                      className="gap-2 rounded-xl"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      حذف نهائي
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="contract" className="mt-0">
                <ContractTab contract={contract} formatCurrency={formatCurrency} />
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
                />
              </TabsContent>

              <TabsContent value="vehicle" className="mt-0">
                <VehicleTab
                  contract={contract}
                  customerName={customerName}
                  plateNumber={plateNumber}
                  trafficViolations={trafficViolations}
                  contractId={contract.id}
                  companyId={companyId}
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
        <ContractAmendmentForm
          open={isAmendmentDialogOpen}
          onOpenChange={setIsAmendmentDialogOpen}
          contract={contract}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contract-details'] });
            setIsAmendmentDialogOpen(false);
          }}
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
    </div>
  );
};

export default ContractDetailsPageRedesigned;
