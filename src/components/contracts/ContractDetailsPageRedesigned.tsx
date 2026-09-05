/**
 * صفحة تفاصيل العقد — التجربة الجديدة "غرفة تحكم العقد"
 *
 * فلسفة التصميم (V3):
 * - Hero سينمائي داكن يجيب بنظرة واحدة: من، أي مركبة، كم، كم تبقى، متى.
 * - شريط إجراء واحد ذكي يرشّح الخطوة التالية حسب حالة العقد.
 * - تبويبات لاصقة بشارات عدد — كل تبويب مسؤول عن عالم واحد فقط.
 * - عمود "نبض العقد" يجمع صحة العقد، المهام، التشخيص المالي، CRM، والسجل
 *   في مكان واحد بدل تكرارها في أربع مناطق مختلفة.
 *
 * كل منطق الأعمال (الاستعلامات، الإجراءات، الحوارات) محفوظ كما هو.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Car,
  CheckCircle,
  FileCheck,
  Folder,
  GitBranch,
  LayoutDashboard,
  Loader2,
  PlayCircle,
  Receipt,
  RefreshCw,
  ShieldCheck,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractStatusManagement } from './ContractStatusManagement';
import { ContractCancellationDialog } from './ContractCancellationDialog';
import { LegalTransferReadinessWizard as ConvertToLegalDialog } from './LegalTransferReadinessWizard';
import { PermanentContractDeleteDialog } from './PermanentContractDeleteDialog';

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
import {
  ContractViolationsTabRedesigned,
  type TrafficViolation as ContractViolationInput,
} from './ContractViolationsTabRedesigned';
import { ContractDocuments } from './ContractDocuments';
import { ContractHealthAnalysis } from './ContractHealthAnalysis';
import { SeizedActiveContractBanner } from './SeizedActiveContractBanner';
import { OfficialContractView } from './OfficialContractView';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { cn } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { analyzeContractBillingPeriod } from '@/utils/contractCalculations';
import type { Contract } from '@/types/contracts';
import type { Invoice } from '@/types/finance.types';
import type { Database } from '@/integrations/supabase/types';

import { useToast } from '@/hooks/use-toast';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useVehicleInspections } from '@/hooks/useVehicleInspections';
import { useCustomerCRMActivity } from '@/hooks/useCustomerCRMActivity';
import type { PaymentSchedule } from '@/types/payment-schedules';
import { useTourGuide } from '@/components/tour-guide';
import { revertContractLegalProcedure } from '@/services/contractLegalProcedureService';
import { reactivateCancelledContract } from '@/services/contractReactivationService';
import { generateContractBillingGraph } from '@/services/contractBillingGraph';
import { refreshContractFinancialQueries } from '@/utils/contractFinancialQueries';
import { fetchContractInvoiceEvidence } from '@/services/contractInvoiceEvidence';
import { contractPaymentEvidenceQueryOptions, type ContractPaymentEvidence } from '@/services/contractPaymentEvidence';
import { contractFinancialSyncQueryOptions, retryContractFinancialReads } from '@/services/contractFinancialSynchronization';

import { ContractHero } from './contract-details-v3/ContractHero';
import { ContractActionBar } from './contract-details-v3/ContractActionBar';
import { ContractPulse } from './contract-details-v3/ContractPulse';
import {
  billableContractStatusesV3,
  buildContractFinancialSnapshotV3,
  calculateContractHealthScoreV3,
  chunkInvoicesForCancellationV3,
  getInitialContractTabV3,
  permanentlyDeletableContractStatusesV3,
  type ContractFinancialSnapshot,
} from './contract-details-v3/tokens';

type ContractTrafficViolation = Database['public']['Tables']['traffic_violations']['Row'] & {
  description?: string | null;
};

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

// ===== Financial Tab (embedded) =====
const FinancialTab = ({
  contract,
  invoices,
  paymentSchedules,
  snapshot,
  contractId,
  companyId,
  formatCurrency,
  onPayInvoice,
  onPreviewInvoice,
  onCreateInvoice,
  onCancelInvoice,
  isCancellingInvoice,
  onBulkCancelInvoices,
  isBulkCancellingInvoices,
  onGeneratePaymentSchedules,
  onGenerateMissingInvoices,
  isGeneratingMissingInvoices,
  billingGenerationBlocker,
  customerName,
  trafficViolations,
}: {
  contract: Contract;
  invoices: Invoice[];
  paymentSchedules: PaymentSchedule[];
  snapshot: ContractFinancialSnapshot;
  contractId: string;
  companyId: string;
  formatCurrency: (amount: number) => string;
  onPayInvoice: (invoice: Invoice) => void;
  onPreviewInvoice: (invoice: Invoice) => void;
  onCreateInvoice: () => void;
  onCancelInvoice: (invoice: Invoice) => void;
  isCancellingInvoice: boolean;
  onBulkCancelInvoices: (invoices: Invoice[]) => Promise<void>;
  isBulkCancellingInvoices: boolean;
  onGeneratePaymentSchedules: () => void;
  onGenerateMissingInvoices?: () => void;
  isGeneratingMissingInvoices?: boolean;
  billingGenerationBlocker?: string | null;
  customerName: string;
  trafficViolations: ContractTrafficViolation[];
}) => (
  <div className="space-y-5">
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabsTrigger
          value="overview"
          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
        >
          <LayoutDashboard className="w-4 h-4" />
          نظرة عامة
        </TabsTrigger>
        <TabsTrigger
          value="invoices"
          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
        >
          <Receipt className="w-4 h-4" />
          الفواتير
        </TabsTrigger>
        <TabsTrigger
          value="payments"
          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
        >
          <RefreshCw className="w-4 h-4" />
          الدفعات
        </TabsTrigger>
        <TabsTrigger
          value="schedule"
          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
        >
          <Receipt className="w-4 h-4" />
          جدول الدفعات
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <FinancialDashboard contract={contract} formatCurrency={formatCurrency} snapshot={snapshot} />
      </TabsContent>

      <TabsContent value="invoices" className="mt-4">
        <ContractInvoicesTabRedesigned
          invoices={invoices}
          formatCurrency={formatCurrency}
          onPayInvoice={onPayInvoice}
          onPreviewInvoice={onPreviewInvoice}
          onCreateInvoice={onCreateInvoice}
          onCancelInvoice={onCancelInvoice}
          isCancellingInvoice={isCancellingInvoice}
          onBulkCancelInvoices={onBulkCancelInvoices}
          isBulkCancellingInvoices={isBulkCancellingInvoices}
          onGenerateMissingInvoices={onGenerateMissingInvoices}
          isGeneratingMissingInvoices={isGeneratingMissingInvoices}
          billingGenerationBlocker={billingGenerationBlocker}
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

      <TabsContent value="payments" className="mt-4">
        <ContractPaymentsTab
          contractId={contractId}
          companyId={companyId}
          customerId={contract.customer_id}
          invoiceIds={invoices.map((inv) => inv.id)}
          invoices={invoices}
          contractStartDate={contract.start_date}
          formatCurrency={formatCurrency}
          contractNumber={contract.contract_number}
          customerInfo={{
            name: customerName,
            phone: contract.customer?.phone,
            nationalId: contract.customer?.national_id,
          }}
        />
      </TabsContent>

      <TabsContent value="schedule" className="mt-4">
        <EnhancedPaymentScheduleTab
          formatCurrency={formatCurrency}
          onGenerateSchedules={
            !billingGenerationBlocker && invoices.length > 0 && paymentSchedules.length < invoices.length
              ? onGeneratePaymentSchedules
              : undefined
          }
          hasInvoices={invoices.length > 0}
          snapshot={snapshot}
        />
      </TabsContent>
    </Tabs>
  </div>
);

// ===== Vehicle Tab =====
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
    vehicle?.fuel_type === 'petrol'
      ? 'بنزين'
      : vehicle?.fuel_type === 'diesel'
        ? 'ديزل'
        : vehicle?.fuel_type === 'electric'
          ? 'كهربائي'
          : vehicle?.fuel_type === 'hybrid'
            ? 'هجين'
            : 'غير محدد';

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Vehicle identity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#22C7A1]/10 text-[#0E9E7E]">
                <Car className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">المركبة المرتبطة بالعقد</p>
                <h2 className="mt-1 text-xl font-black text-[#0F172A]">{vehicleName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">{vehicle?.year || 'غير محدد'}</span>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1">{vehicle?.color || 'غير محدد'}</span>
                  <span className="rounded-lg bg-[#22C7A1]/10 px-2.5 py-1 text-[#0E9E7E]" dir="ltr">
                    {plateNumber || 'غير محدد'}
                  </span>
                </div>
              </div>
            </div>
            {vehicle?.id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/fleet/vehicles/${vehicle.id}`)}
                className="gap-2 rounded-lg border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                ملف المركبة
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'نوع الوقود', value: fuelLabel },
              { label: 'قراءة العداد', value: `${vehicle?.current_mileage?.toLocaleString() || '0'} كم` },
              { label: 'رقم الهيكل', value: vehicle?.vin ? `...${vehicle.vin.slice(-8)}` : 'غير محدد', ltr: true },
              { label: 'اللون', value: vehicle?.color || 'غير محدد' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold text-slate-400">{item.label}</p>
                <p className="mt-1 truncate text-sm font-black text-[#0F172A]" dir={item.ltr ? 'ltr' : 'rtl'}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick facts */}
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400">رقم اللوحة</p>
            <p className="mt-1.5 text-3xl font-black tracking-wide text-[#0F172A]" dir="ltr">
              {plateNumber || '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400">العقد المرتبط</p>
            <p className="mt-1.5 text-lg font-black text-[#0F172A]" dir="ltr">
              {contract.contract_number}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{customerName}</p>
          </div>
        </div>
      </div>

      <VehiclePickupReturnTabRedesigned
        contract={{
          id: contract.id,
          vehicle_id: contract.vehicle_id || contract.vehicle?.id || '',
          contract_number: contract.contract_number,
          customer_name: customerName,
          customer_phone: contract.customer?.phone || '',
          vehicle_plate: plateNumber || '',
          vehicle_make: contract.vehicle?.make || '',
          vehicle_model: contract.vehicle?.model || '',
          vehicle_year: contract.vehicle?.year || 0,
          start_date: contract.start_date,
          end_date: contract.end_date,
          vehicle_returned: contract.vehicle_returned,
        }}
        formatCurrency={formatCurrency}
      />
    </div>
  );
};

// ===== Main Component =====
const ContractDetailsPageRedesigned = () => {
  const { contractNumber } = useParams<{ contractNumber: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { startTour } = useTourGuide();
  const queryClient = useQueryClient();
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();

  // State
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => getInitialContractTabV3(requestedTab));
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
  const [isDeletePermanentDialogOpen, setIsDeletePermanentDialogOpen] = useState(false);
  const [isRemoveLegalDialogOpen, setIsRemoveLegalDialogOpen] = useState(false);
  const [isRemovingLegal, setIsRemovingLegal] = useState(false);
  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivationViolationsAccepted, setReactivationViolationsAccepted] = useState(false);
  const [isCancellingInvoice, setIsCancellingInvoice] = useState(false);
  const [isBulkCancellingInvoices, setIsBulkCancellingInvoices] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [isCancelInvoiceDialogOpen, setIsCancelInvoiceDialogOpen] = useState(false);
  const [quickCrmNote, setQuickCrmNote] = useState('');
  const [quickCrmStatus, setQuickCrmStatus] = useState<'answered' | 'no_answer' | 'busy'>('answered');

  useEffect(() => {
    const nextTab = getInitialContractTabV3(requestedTab);
    setActiveTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
  }, [requestedTab]);

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
            fuel_type,
            vin,
            current_mileage,
            status
          ),
          assigned_employee:profiles!contracts_assigned_to_profile_id_fkey(
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            email
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
    staleTime: 30000,
    gcTime: 300000,
  });

  const {
    data: financialSyncResult,
    error: financialSyncError,
    isFetching: isFinancialSyncing,
  } = useQuery(contractFinancialSyncQueryOptions(queryClient, {
    contractId: contract?.id || '',
    contractNumber: contract?.contract_number || contractNumber || '',
    companyId: companyId || '',
  }));

  // Fetch invoices with caching (including cancelled to show full history)
  const {
    data: invoices = [],
    error: invoicesError,
    isLoading: areInvoicesLoading,
  } = useQuery({
    queryKey: ['contract-invoices', contract?.id, companyId, contract?.customer_id, 'complete-evidence'],
    queryFn: async () => {
      return fetchContractInvoiceEvidence({
        companyId: companyId || '', contractId: contract?.id || '', customerId: contract?.customer_id || '',
      });
    },
    enabled: !!contract?.id && !!companyId,
    staleTime: 30000,
    gcTime: 300000,
  });

  const invoiceIntegrityWarnings = useMemo(
    () => (invoices as Invoice[] & { integrityWarnings?: string[] }).integrityWarnings || [],
    [invoices],
  );

  const invoiceIdsForPayments = useMemo(
    () => invoices.map((invoice) => invoice.id).filter(Boolean),
    [invoices],
  );

  const {
    data: paymentEvidenceBundle,
    error: paymentsError,
    isLoading: arePaymentsLoading,
  } = useQuery({
    ...contractPaymentEvidenceQueryOptions({ companyId: companyId || '', contractId: contract?.id || '',
      customerId: contract?.customer_id || '', invoiceIds: invoiceIdsForPayments }),
    enabled: !!contract?.id && !!companyId && !!contract?.customer_id && !areInvoicesLoading,
  });
  const contractPayments = useMemo(() => paymentEvidenceBundle?.payments || [], [paymentEvidenceBundle]);
  const paymentIntegrityWarnings = paymentEvidenceBundle?.integrityWarnings || [];

  // Fetch traffic violations with caching
  const {
    data: trafficViolations = [],
    error: trafficViolationsError,
    isLoading: areTrafficViolationsLoading,
  } = useQuery({
    queryKey: ['contract-violations', contract?.id, companyId],
    queryFn: async () => {
      if (!contract?.id || !companyId) return [];

      const { data, error } = await supabase
        .from('traffic_violations')
        .select('*')
        .eq('contract_id', contract.id)
        .eq('company_id', companyId)
        .order('violation_date', { ascending: false });

      if (error) throw error;
      return (data || []).map((violation) => ({
        ...violation,
        description: violation.violation_description,
      }));
    },
    enabled: !!contract?.id && !!companyId,
    staleTime: 30000,
    gcTime: 300000,
  });

  const unsettledTrafficViolations = useMemo(
    () => trafficViolations.filter((violation) => ![
      'paid',
      'cancelled',
      'canceled',
      'void',
      'voided',
      'deleted',
      'resolved',
    ].includes(String(violation.status || '').trim().toLowerCase())),
    [trafficViolations],
  );
  const reactivationViolationTotal = useMemo(
    () => unsettledTrafficViolations.reduce(
      (total, violation) => total + Number(violation.fine_amount || violation.total_amount || 0),
      0,
    ),
    [unsettledTrafficViolations],
  );
  const reactivationHasViolations = unsettledTrafficViolations.length > 0;

  // Vehicle inspections
  const {
    data: checkInInspections = [],
    error: checkInInspectionError,
    isLoading: isCheckInInspectionLoading,
  } = useVehicleInspections({
    contractId: contract?.id,
    inspectionType: 'check_in',
    enabled: !!contract?.id,
  });
  const {
    data: checkOutInspections = [],
    error: checkOutInspectionError,
    isLoading: isCheckOutInspectionLoading,
  } = useVehicleInspections({
    contractId: contract?.id,
    inspectionType: 'check_out',
    enabled: !!contract?.id,
  });
  const checkInInspection = checkInInspections[0] || null;
  const checkOutInspection = checkOutInspections[0] || null;

  // Audit the entire persisted schedule, including undated/out-of-period rows.
  // The financial snapshot handles display exclusions only after validation.
  const {
    data: paymentSchedules = [],
    error: paymentSchedulesError,
    isLoading: arePaymentSchedulesLoading,
  } = useContractPaymentSchedules(contract?.id || '');

  const {
    activities: crmActivities = [],
    stats: crmStats,
    error: crmActivitiesError,
    addActivity: addCrmActivity,
    isAdding: isAddingCrmActivity,
  } = useCustomerCRMActivity(contract?.customer_id || null);

  const {
    data: contractAuditLogs = [],
    error: contractAuditLogsError,
  } = useQuery({
    queryKey: ['contract-audit-logs', contract?.id, companyId],
    queryFn: async (): Promise<ContractAuditLog[]> => {
      if (!contract?.id || !companyId) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, changes_summary, entity_name, created_at, severity, status, user_name')
        .eq('company_id', companyId)
        .eq('resource_type', 'contract')
        .eq('resource_id', contract.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []) as ContractAuditLog[];
    },
    enabled: !!contract?.id && !!companyId,
    staleTime: 60000,
  });

  // Hook to generate payment schedules from invoices
  const generatePaymentSchedulesFromInvoices = useGeneratePaymentSchedulesFromInvoices();

  // ===== Derived state =====
  const snapshot: ContractFinancialSnapshot = useMemo(
    () => buildContractFinancialSnapshotV3(invoices, contractPayments, paymentSchedules, contract || undefined),
    [contract, invoices, contractPayments, paymentSchedules],
  );

  const officialPaymentSchedules = useMemo(() => {
    const activeIds = new Set(snapshot.activeSchedules.map((schedule) => schedule.id).filter(Boolean));
    if (activeIds.size > 0) {
      return paymentSchedules.filter((schedule) => activeIds.has(schedule.id));
    }

    const activeMonths = new Set(
      snapshot.activeSchedules
        .map((schedule) => String(schedule.due_date || '').slice(0, 7))
        .filter(Boolean),
    );
    return paymentSchedules.filter((schedule) => activeMonths.has(String(schedule.due_date || '').slice(0, 7)));
  }, [paymentSchedules, snapshot.activeSchedules]);

  const billingPeriodValidation = useMemo(
    () => contract
      ? analyzeContractBillingPeriod({
          startDate: contract.start_date,
          endDate: contract.end_date,
          contractAmount: contract.contract_amount,
          monthlyAmount: contract.monthly_amount,
          invoices,
          schedules: paymentSchedules,
        })
      : null,
    [contract, invoices, paymentSchedules],
  );
  const documentGenerationBlocker = billingPeriodValidation?.blockingMessage
    || (checkInInspectionError || checkOutInspectionError
      ? 'تعذر التحقق من تقارير استلام وتسليم المركبة؛ أعد تحميل الصفحة قبل إنشاء مستند رسمي.'
      : null);

  const contractStats = useMemo(() => {
    if (!contract) return null;

    const startDate = new Date(contract.start_date);
    const endDate = new Date(contract.end_date);
    const today = new Date();

    const totalDays = Math.max(0, differenceInDays(endDate, startDate));
    const daysElapsed = Math.max(0, differenceInDays(today, startDate));
    const daysRemaining = differenceInDays(endDate, today);
    const totalPayments = billingPeriodValidation?.availableBillingMonths
      || snapshot.totalSchedulesCount;
    const progressPercentage = totalDays > 0
      ? Math.max(0, Math.min(100, Math.round((daysElapsed / totalDays) * 100)))
      : 0;

    return {
      totalAmount: snapshot.contractTotal,
      monthlyAmount: contract.monthly_amount || 0,
      totalDays,
      daysElapsed,
      daysRemaining,
      totalMonths: totalPayments,
      progressPercentage,
      paidPayments: snapshot.paidSchedulesCount,
      totalPayments,
      paymentStatus:
        snapshot.contractTotal > 0 && snapshot.remainingTotal === 0 && snapshot.hasFinancialCoverage && !snapshot.financialReviewRequired
          ? 'completed'
          : 'pending',
    };
  }, [billingPeriodValidation?.availableBillingMonths, contract, snapshot]);

  const contractHealth = useMemo(
    () => calculateContractHealthScoreV3({
      snapshot,
      daysRemaining: contractStats?.daysRemaining ?? null,
      violationsCount: unsettledTrafficViolations.length,
      contractStatus: contract?.status,
    }),
    [contract?.status, contractStats?.daysRemaining, snapshot, unsettledTrafficViolations.length],
  );

  const customerName = useMemo(() => {
    if (!contract?.customer) return 'غير محدد';
    return formatCustomerName(contract.customer, { preferArabic: true });
  }, [contract?.customer]);

  const vehicleName = useMemo(() => {
    if (!contract?.vehicle) return 'غير محدد';
    const vehicle = contract.vehicle;
    return `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim();
  }, [contract?.vehicle]);

  const plateNumber = contract?.vehicle?.plate_number;

  // ===== Handlers =====
  const handleBack = useCallback(() => {
    navigate('/contracts');
  }, [navigate]);

  const handlePrint = useCallback(() => {
    if (documentGenerationBlocker) {
      toast({
        title: 'العقد غير جاهز للطباعة',
        description: documentGenerationBlocker,
        variant: 'destructive',
      });
      return;
    }
    setIsPrintDialogOpen(true);
  }, [documentGenerationBlocker, toast]);

  const handleExport = useCallback(() => {
    if (documentGenerationBlocker) {
      toast({
        title: 'العقد غير جاهز للتصدير',
        description: documentGenerationBlocker,
        variant: 'destructive',
      });
      return;
    }
    setIsOfficialExportOpen(true);
  }, [documentGenerationBlocker, toast]);

  const handleRefresh = useCallback(() => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contract-details', contractNumber, companyId] }),
      queryClient.invalidateQueries({ queryKey: ['contract-financial-refresh', contract?.id, companyId] }),
      queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract?.id] }),
      queryClient.invalidateQueries({ queryKey: ['contract-payments'] }),
      queryClient.invalidateQueries({ queryKey: ['contract-violations', contract?.id, companyId] }),
      queryClient.invalidateQueries({ queryKey: ['payment-schedules', contract?.id] }),
      queryClient.invalidateQueries({ queryKey: ['contract-audit-logs', contract?.id, companyId] }),
    ]);
  }, [companyId, contract?.id, contractNumber, queryClient]);

  const handleCustomerClick = useCallback(() => {
    if (contract?.customer?.id) {
      navigate(`/customers/${contract.customer.id}`);
    }
  }, [contract, navigate]);

  const handleRetryFinancialReads = useCallback(async () => {
    if (!contract?.id || !companyId) return;
    try {
      await retryContractFinancialReads(queryClient, {
        contractId: contract.id,
        contractNumber: contract.contract_number,
        companyId,
      });
    } catch {
      toast({
        title: 'تعذر تحميل النتائج الجديدة',
        description: 'لم تُعد المزامنة المالية. تحقق من الاتصال ثم أعد تحميل البيانات.',
        variant: 'destructive',
      });
    }
  }, [contract?.id, contract?.contract_number, companyId, queryClient, toast]);

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
    } catch (saveError) {
      console.error('Error saving contract CRM activity:', saveError);
      toast({
        title: 'تعذر حفظ التواصل',
        description: saveError instanceof Error ? saveError.message : 'حدث خطأ أثناء تحديث سجل CRM.',
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

  const confirmCancelInvoice = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (!invoiceToCancel) return;

      setIsCancellingInvoice(true);
      try {
        const cancellationNote = `تم إلغاء الفاتورة من صفحة تفاصيل العقد بتاريخ ${new Date().toISOString()}`;
        const { error } = await supabase.rpc('cancel_invoice_with_reversal', {
          p_invoice_id: invoiceToCancel.id,
          p_company_id: invoiceToCancel.company_id,
          p_reason: cancellationNote,
        });

        if (error) throw error;

        toast({
          title: 'تم إلغاء الفاتورة',
          description: `تم إلغاء الفاتورة ${invoiceToCancel.invoice_number} بنجاح`,
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['contract-invoices'] }),
          queryClient.invalidateQueries({ queryKey: ['invoices'] }),
          queryClient.invalidateQueries({ queryKey: ['payment-schedules'] }),
          queryClient.invalidateQueries({ queryKey: ['contract-details'] }),
          queryClient.invalidateQueries({ queryKey: ['contract-financial-refresh'] }),
        ]);
      } catch (cancelError) {
        console.error('Error cancelling invoice:', cancelError);
        const rawMessage =
          cancelError instanceof Error
            ? cancelError.message
            : typeof cancelError === 'object' && cancelError !== null && 'message' in cancelError
              ? String((cancelError as { message?: unknown }).message || '')
              : '';
        const cancellationErrorMessage =
          rawMessage.includes('Could not find the function public.cancel_invoice_with_reversal') ||
          rawMessage.includes('cancel_invoice_with_reversal') ||
          rawMessage.includes('schema cache')
            ? 'إلغاء الفاتورة المرتبطة بقيد يومية يحتاج تطبيق تحديث قاعدة البيانات الجديد أولاً حتى يتم عكس القيد ثم إلغاء الفاتورة.'
            : rawMessage.includes('Invoices with payments or journal entries cannot be deleted')
              ? 'لا يمكن إلغاء الفاتورة بتعديل مباشر لأنها مرتبطة بدفعة أو قيد يومية. ألغِ الدفعات أولاً، ثم استخدم مسار عكس القيد لإلغاء الفاتورة.'
              : rawMessage || 'حدث خطأ أثناء إلغاء الفاتورة';
        toast({
          title: 'خطأ في إلغاء الفاتورة',
          description: cancellationErrorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsCancellingInvoice(false);
        setIsCancelInvoiceDialogOpen(false);
        setInvoiceToCancel(null);
      }
    },
    [invoiceToCancel, queryClient, toast],
  );

  const handleBulkCancelInvoices = useCallback(
    async (selectedInvoices: Invoice[]) => {
      if (!contract?.id || !companyId || selectedInvoices.length === 0) return;

      setIsBulkCancellingInvoices(true);
      try {
        const invoiceBatches = chunkInvoicesForCancellationV3(selectedInvoices);
        let cancelledCount = 0;

        for (let index = 0; index < invoiceBatches.length; index += 1) {
          const invoiceBatch = invoiceBatches[index];
          const { data, error } = await supabase.rpc('cancel_contract_invoices_bulk_v1', {
            p_company_id: companyId,
            p_contract_id: contract.id,
            p_invoice_ids: invoiceBatch.map((invoice) => invoice.id),
            p_reason: `إلغاء جماعي لفواتير غير صحيحة من صفحة العقد ${contract.contract_number}`,
          });

          if (error) throw error;

          const result = data as { cancelled_count?: number } | null;
          cancelledCount += Number(result?.cancelled_count || invoiceBatch.length);

          if (invoiceBatches.length > 1) {
            toast({
              title: 'جاري إلغاء الفواتير',
              description: `تم إلغاء ${cancelledCount} من ${selectedInvoices.length} فاتورة.`,
            });
          }
        }

        toast({
          title: 'تم إلغاء الفواتير المحددة',
          description: `تم إلغاء ${cancelledCount} فاتورة وعكس القيود المرتبطة بها بنجاح.`,
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['contract-invoices'] }),
          queryClient.invalidateQueries({ queryKey: ['invoices'] }),
          queryClient.invalidateQueries({ queryKey: ['payment-schedules'] }),
          queryClient.invalidateQueries({ queryKey: ['contract-details'] }),
        ]);
      } catch (bulkError) {
        console.error('[ContractDetails] bulk invoice cancellation failed:', bulkError);
        const rawMessage =
          bulkError instanceof Error
            ? bulkError.message
            : typeof bulkError === 'object' && bulkError !== null && 'message' in bulkError
              ? String((bulkError as { message?: unknown }).message || '')
              : '';
        const description =
          rawMessage.includes('Paid or partially paid invoice')
            ? 'تتضمن الفواتير المحددة فاتورة مسددة أو مسددة جزئيًا. أزلها من التحديد ثم أعد المحاولة.'
            : rawMessage.includes('active payment')
              ? 'إحدى الفواتير مرتبطة بدفعة نشطة. يجب إلغاء الدفعة أو إعادة توزيعها أولًا.'
              : rawMessage.includes('statement timeout') || rawMessage.includes('57014')
                ? 'توقف الإلغاء بسبب طول العملية. تم تقسيم العملية إلى دفعات صغيرة، أعد المحاولة وسيكمل النظام من الفواتير المتبقية.'
                : rawMessage.includes('cancel_contract_invoices_bulk_v1') || rawMessage.includes('schema cache')
                  ? 'خدمة الإلغاء الجماعي تحتاج تطبيق تحديث قاعدة البيانات الجديد أولًا.'
                  : rawMessage || 'تعذر إلغاء الفواتير المحددة.';

        toast({
          title: 'لم يتم إلغاء الفواتير',
          description,
          variant: 'destructive',
        });
        throw bulkError;
      } finally {
        setIsBulkCancellingInvoices(false);
      }
    },
    [companyId, contract?.contract_number, contract?.id, queryClient, toast],
  );

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
    setReactivationViolationsAccepted(false);
    setIsReactivateDialogOpen(true);
  }, []);

  const handleGeneratePaymentSchedules = useCallback(() => {
    if (!contract?.id) return;
    if (!billableContractStatusesV3.has(String(contract.status || '').toLowerCase())) {
      toast({
        title: 'لا يمكن إنشاء جدول دفعات',
        description: 'لا يمكن إنشاء جداول دفعات جديدة لعقد ملغي أو منتهي.',
        variant: 'destructive',
      });
      return;
    }

    if (billingPeriodValidation && !billingPeriodValidation.valid) {
      toast({
        title: 'بيانات العقد متعارضة',
        description: billingPeriodValidation.blockingMessage || 'راجع مدة العقد وقيمته وجدول الدفعات.',
        variant: 'destructive',
      });
      return;
    }

    generatePaymentSchedulesFromInvoices.mutate(contract.id);
  }, [billingPeriodValidation, contract?.id, contract?.status, generatePaymentSchedulesFromInvoices, toast]);

  const handleCreateInvoiceRequest = useCallback(() => {
    if (!billableContractStatusesV3.has(String(contract?.status || '').toLowerCase())) {
      toast({
        title: 'لا يمكن إنشاء فاتورة',
        description: 'لا يمكن إنشاء فواتير جديدة لعقد ملغي أو منتهي.',
        variant: 'destructive',
      });
      return;
    }

    if (billingPeriodValidation && !billingPeriodValidation.valid) {
      toast({
        title: 'بيانات العقد متعارضة',
        description: billingPeriodValidation.blockingMessage || 'راجع مدة العقد وقيمته وجدول الدفعات.',
        variant: 'destructive',
      });
      return;
    }

    setIsInvoiceDialogOpen(true);
  }, [billingPeriodValidation, contract?.status, toast]);

  const [isGeneratingMissingInvoices, setIsGeneratingMissingInvoices] = useState(false);
  const handleGenerateMissingInvoices = useCallback(async () => {
    if (!contract?.id) return;
    if (!billableContractStatusesV3.has(String(contract.status || '').toLowerCase())) {
      toast({
        title: 'لا يمكن إنشاء فواتير',
        description: 'لا يمكن إنشاء فواتير جديدة لعقد ملغي أو منتهي.',
        variant: 'destructive',
      });
      return;
    }

    if (billingPeriodValidation && !billingPeriodValidation.valid) {
      toast({
        title: 'بيانات العقد متعارضة',
        description: billingPeriodValidation.blockingMessage || 'راجع مدة العقد وقيمته وجدول الدفعات.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingMissingInvoices(true);
    try {
      const result = await generateContractBillingGraph(contract.id);
      const invoiceCount = result.createdInvoices;

      queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedules'] });

      toast({
        title: invoiceCount ? 'تم إنشاء الفواتير بنجاح' : 'لا توجد فواتير ناقصة',
        description: invoiceCount
          ? `تم إنشاء ${invoiceCount} فاتورة من ${result.scheduleCount} قسطاً متحققاً.`
          : 'كل أقساط العقد المتحققة لها فواتير بالفعل.',
      });
    } catch (generateError) {
      console.error('Error generating invoices:', generateError);
      const errorMessage =
        generateError instanceof Error
          ? generateError.message
          : typeof generateError === 'object' && generateError !== null && 'message' in generateError
            ? String((generateError as { message?: unknown }).message || 'حدث خطأ أثناء إنشاء الفواتير')
            : 'حدث خطأ أثناء إنشاء الفواتير';

      toast({
        title: 'خطأ في إنشاء الفواتير',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingMissingInvoices(false);
    }
  }, [billingPeriodValidation, contract?.id, contract?.status, queryClient, toast]);

  // Handle add violation
  const handleAddViolation = useCallback(
    async (violation: Partial<ContractViolationInput>) => {
      if (!contract?.id || !contract?.vehicle_id || !companyId) {
        throw new Error('بيانات العقد غير مكتملة');
      }
      const violationType = String(violation.violation_type || '').trim();
      const violationDate = String(violation.violation_date || '').trim();
      const fineAmount = Number(violation.fine_amount);
      const requestId = String(violation.manual_request_id || '').trim();
      if (!violationType || !violationDate || !requestId || !Number.isFinite(fineAmount) || fineAmount <= 0) {
        throw new Error('نوع المخالفة وتاريخها ومبلغها بيانات مطلوبة');
      }

      const { data, error } = await supabase.rpc('create_manual_contract_traffic_violation_v1', {
        p_company_id: companyId,
        p_contract_id: contract.id,
        p_vehicle_id: contract.vehicle_id,
        p_violation_type: violationType,
        p_violation_date: violationDate,
        p_fine_amount: fineAmount,
        p_idempotency_key: requestId,
        p_violation_number: violation.violation_number || undefined,
        p_location: violation.location || undefined,
        p_description: violation.description || undefined,
      });

      if (error) throw error;
      const result = data as {
        success?: boolean;
        created?: boolean;
        violation_id?: string;
        violation_number?: string;
      } | null;
      if (!result?.success || !result.violation_id || !result.violation_number) {
        throw new Error('لم تؤكد قاعدة البيانات اكتمال إضافة المخالفة');
      }

      // Send WhatsApp notification to customer
      try {
        const customerPhone = contract.customer?.phone;
        if (customerPhone && result.created) {
          const { generateViolationNotification } = await import('@/services/whatsapp/MessageTemplates');
          const { whatsAppService } = await import('@/services/whatsapp/WhatsAppService');

          const message = generateViolationNotification({
            customerName: formatCustomerName(contract.customer),
            contractNumber: contract.contract_number,
            vehiclePlate: contract.vehicle?.plate_number || contract.license_plate || 'غير محدد',
            violationType,
            violationNumber: result.violation_number,
            violationDate,
            fineAmount,
            location: violation.location || undefined,
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
      }

      queryClient.invalidateQueries({ queryKey: ['contract-violations', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['contract-details', contractNumber, companyId] });
    },
    [contract, companyId, contractNumber, queryClient, toast],
  );

  const handleOpenDeletePermanent = useCallback(async () => {
    if (!contract?.id) return;
    if (!permanentlyDeletableContractStatusesV3.has(String(contract.status || '').toLowerCase())) {
      toast({
        title: 'الحذف غير مسموح',
        description: 'يجب إنهاء العقد أو إلغاؤه أولًا. لا يمكن حذف عقد نشط أو تحت إجراء قانوني.',
        variant: 'destructive',
      });
      return;
    }
    setIsDeletePermanentDialogOpen(true);
  }, [contract, toast]);

  const executeReactivateContract = useCallback(async () => {
    if (!contract?.id) return;
    if (reactivationHasViolations && !reactivationViolationsAccepted) {
      toast({
        title: 'يلزم تأكيد المخالفات',
        description: 'راجع تنبيه المخالفات ووافق عليه قبل إعادة تفعيل العقد.',
        variant: 'destructive',
      });
      return;
    }

    setIsReactivating(true);
    try {
      await reactivateCancelledContract({
        contractId: contract.id,
        acceptUnpaidViolations: reactivationViolationsAccepted,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['contract-details'] }),
        queryClient.invalidateQueries({ queryKey: ['contracts'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] }),
        queryClient.invalidateQueries({ queryKey: ['payment-schedules'] }),
      ]);

      toast({
        title: 'تمت إعادة تفعيل العقد',
        description: `تم إرجاع العقد #${contract.contract_number} إلى الحالة النشطة مع الحفاظ على مستنداته المالية.`,
      });
      setIsReactivateDialogOpen(false);
      setReactivationViolationsAccepted(false);
    } catch (reactivateError) {
      console.error('خطأ في إعادة تفعيل العقد:', reactivateError);
      toast({
        title: 'تعذر إعادة تفعيل العقد',
        description: reactivateError instanceof Error ? reactivateError.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsReactivating(false);
    }
  }, [
    contract,
    queryClient,
    reactivationHasViolations,
    reactivationViolationsAccepted,
    toast,
  ]);

  const executeRemoveLegalProcedure = useCallback(async () => {
    if (!contract?.id || !companyId) return;

    setIsRemovingLegal(true);
    try {
      await revertContractLegalProcedure({
        contractId: contract.id,
        companyId,
        reason: 'تمت إزالة الإجراء القانوني من صفحة تفاصيل العقد',
      });

      queryClient.invalidateQueries({ queryKey: ['contract-details'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['delinquent-customers'] });

      toast({
        title: 'تم إزالة الإجراء القانوني',
        description: `تم إعادة العقد #${contract.contract_number} للحالة النشطة`,
      });

      setIsRemoveLegalDialogOpen(false);
    } catch (removeLegalError) {
      console.error('خطأ في إزالة الإجراء القانوني:', removeLegalError);
      toast({
        title: 'خطأ في إزالة الإجراء القانوني',
        description: removeLegalError instanceof Error ? removeLegalError.message : 'حدث خطأ غير متوقع',
        variant: 'destructive',
      });
    } finally {
      setIsRemovingLegal(false);
    }
  }, [contract, companyId, queryClient, toast]);

  // Row-level integrity warnings from the invoice/payment evidence readers.
  // These keep legacy records visible without failing the whole page.
  // Must run before every early return (Rules of Hooks).
  const integrityWarnings = useMemo(
    () => [...invoiceIntegrityWarnings, ...paymentIntegrityWarnings],
    [invoiceIntegrityWarnings, paymentIntegrityWarnings],
  );

  // Loading state
  if (
    isLoading
    || isInitializing
    || areInvoicesLoading
    || arePaymentsLoading
    || areTrafficViolationsLoading
    || arePaymentSchedulesLoading
    || isCheckInInspectionLoading
    || isCheckOutInspectionLoading
  ) {
    return <PageSkeletonFallback />;
  }

  if (error || !contract) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-6" dir="rtl">
        <Card className="max-w-md w-full border-slate-200 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#FB6B7A]/10">
              <AlertCircle className="h-8 w-8 text-[#FB6B7A]" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-neutral-900">خطأ في تحميل العقد</h2>
            <p className="mb-4 text-neutral-500">
              {error ? 'تعذر تحميل بيانات العقد. تحقق من الاتصال ثم أعد المحاولة.' : 'لم يتم العثور على العقد المطلوب.'}
            </p>
            {error && (
              <Button onClick={financialSyncResult?.readError ? handleRetryFinancialReads : handleRefresh} variant="outline" className="mb-2 w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                إعادة المحاولة
              </Button>
            )}
            <Button onClick={handleBack} className="bg-[#0F172A] hover:bg-[#1E293B]">
              العودة للقائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const failedContractSources = [
    invoicesError ? 'الفواتير' : null,
    paymentsError ? 'الدفعات' : null,
    paymentSchedulesError ? 'جدول الدفعات' : null,
    trafficViolationsError ? 'المخالفات المرورية' : null,
  ].filter((source): source is string => Boolean(source));

  const unavailableSecondarySources = [
    contractAuditLogsError ? 'سجل تدقيق العقد' : null,
    crmActivitiesError ? 'سجل تواصل العميل' : null,
  ].filter((source): source is string => Boolean(source));

  if (failedContractSources.length > 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-6" dir="rtl">
        <Card className="w-full max-w-lg border-rose-200 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-rose-50">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
            </div>
            <h2 className="mb-2 text-lg font-bold text-neutral-900">بيانات العقد غير مكتملة</h2>
            <p className="mb-5 text-sm leading-7 text-neutral-600">
              تعذر تحميل {failedContractSources.join('، ')}. أوقف النظام عرض الأرقام حتى لا تتحول البيانات الناقصة إلى أصفار مضللة.
            </p>
            {invoicesError instanceof Error && (
              <p role="alert" className="mb-5 rounded-lg bg-amber-50 p-3 text-sm leading-7 text-amber-900">
                {invoicesError.message}
              </p>
            )}
            <Button onClick={financialSyncResult?.readError ? handleRetryFinancialReads : handleRefresh} className="w-full gap-2 bg-[#0F172A] hover:bg-[#1E293B]">
              <RefreshCw className="h-4 w-4" />
              إعادة تحميل جميع بيانات العقد
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { value: 'health', label: 'صحة العقد', icon: ShieldCheck, badge: 0 },
    { value: 'financial', label: 'المالي', icon: Receipt, badge: snapshot.openInvoicesCount },
    { value: 'vehicle', label: 'المركبة', icon: Car, badge: 0 },
    { value: 'violations', label: 'المخالفات', icon: AlertCircle, badge: unsettledTrafficViolations.length },
    { value: 'records', label: 'السجل والمستندات', icon: Folder, badge: 0 },
  ];

  const paidAmount = snapshot.paidTotal;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-[#F6F8FB]"
      dir="rtl"
    >
      <div className="mx-auto max-w-[1680px] space-y-4 px-4 pb-10 sm:px-6">
        {/* Systemic alerts (seizure / expiry) */}
        <SeizedActiveContractBanner
          contractStatus={contract.status}
          vehicleStatus={contract.vehicle?.status}
          className="pt-4"
        />
        <ContractAlerts contract={contract} />
        {isFinancialSyncing && (
          <Alert className="border-sky-200 bg-sky-50 text-sky-900">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>يجري التحقق آلياً من أرصدة العقد والفواتير والدفعات.</AlertDescription>
          </Alert>
        )}
        {snapshot.financialReviewRequired && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              المسدد محسوب من تخصيصات الدفعات المكتملة، وتوجد أرصدة مخزنة أو روابط أقساط تحتاج مطابقة قبل اعتماد المطالبة.
            </AlertDescription>
          </Alert>
        )}

        {!!financialSyncError && !isFinancialSyncing && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{financialSyncError instanceof Error ? financialSyncError.message : 'تعذرت المزامنة الخلفية للأرصدة. لم يعتبر النظام ذلك رصيداً صفرياً.'}</span>
              <Button type="button" size="sm" variant="outline" onClick={handleRefresh} className="gap-2">
                <RefreshCw className="h-3.5 w-3.5" />
                إعادة المحاولة
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {financialSyncResult?.readError && !isFinancialSyncing && !financialSyncError && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>{financialSyncResult.readError}</span>
              <Button type="button" size="sm" variant="outline" onClick={handleRetryFinancialReads}>
                إعادة تحميل النتائج فقط
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {unavailableSecondarySources.length > 0 && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              تعذر تحميل {unavailableSecondarySources.join(' و')}. لن يعرض النظام بيانات فارغة على أنها سجل مكتمل.
            </AlertDescription>
          </Alert>
        )}
        {integrityWarnings.length > 0 && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-950">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <span className="font-bold">سجلات تحتاج مطابقة قبل اعتماد الأرقام:</span>
              <ul className="mt-1 list-inside list-disc space-y-1 text-xs">
                {integrityWarnings.slice(0, 5).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              {integrityWarnings.length > 5 && (
                <span className="text-xs">و{integrityWarnings.length - 5} تنبيهاً آخر في تبويب الفواتير والدفعات.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* ===== Hero identity band ===== */}
        <ContractHero
          contract={contract}
          customerName={customerName}
          vehicleName={vehicleName}
          plateNumber={plateNumber}
          totalAmount={contractStats?.totalAmount || 0}
          monthlyAmount={contractStats?.monthlyAmount || 0}
          paidAmount={paidAmount}
          paidPayments={contractStats?.paidPayments || 0}
          totalPayments={contractStats?.totalPayments || 0}
          daysRemaining={contractStats?.daysRemaining ?? null}
          progressPercentage={contractStats?.progressPercentage || 0}
          snapshot={snapshot}
          formatCurrency={formatCurrency}
          onBack={handleBack}
          onEdit={handleAmend}
          onStatusClick={() => setIsStatusManagementOpen(true)}
          onCustomerClick={handleCustomerClick}
          onVehicleClick={handleVehicleClick}
        />

        {/* ===== Smart action strip ===== */}
        <ContractActionBar
          contract={contract}
          snapshot={snapshot}
          violationsCount={unsettledTrafficViolations.length}
          daysRemaining={contractStats?.daysRemaining ?? null}
          formatCurrency={formatCurrency}
          onEdit={handleAmend}
          onPrint={handlePrint}
          onExport={handleExport}
          onRefresh={handleRefresh}
          onRenew={handleRenew}
          onTerminate={handleTerminate}
          onReactivate={handleReactivate}
          onConvertToLegal={() => setIsConvertToLegalOpen(true)}
          onRemoveLegal={() => setIsRemoveLegalDialogOpen(true)}
          onDeletePermanent={handleOpenDeletePermanent}
          onCollect={() => setActiveTab('financial')}
          onOpenViolations={() => setActiveTab('violations')}
          onOpenDocuments={() => setActiveTab('records')}
          documentGenerationBlocker={documentGenerationBlocker}
        />

        {/* ===== Main: workbench (+ pulse rail only on the health tab) ===== */}
        <div className={cn('grid gap-4', activeTab === 'health' && 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
          {/* Workbench */}
          <div className="min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="sticky top-0 z-30 -mx-1 rounded-2xl border border-[#E5EAF1] bg-white/90 px-1 py-2 shadow-[0_6px_24px_-16px_rgba(15,23,42,0.3)] backdrop-blur-md">
                <TabsList className="flex h-auto w-full justify-start gap-1.5 overflow-x-auto rounded-xl bg-transparent p-1">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="relative gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 transition-all hover:bg-[#F6F8FB] data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white data-[state=active]:shadow-[0_8px_18px_-8px_rgba(34,199,161,0.6)]"
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {tab.badge > 0 && (
                        <span
                          className={cn(
                            'absolute -top-0.5 left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black',
                            tab.value === 'violations'
                              ? 'bg-[#FB6B7A] text-white'
                              : 'bg-[#F59E0B] text-[#452A03]',
                          )}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="mt-4 min-h-[480px]">
                {activeTab === 'health' && (
                  <ContractHealthAnalysis
                    contract={contract}
                    formatCurrency={formatCurrency}
                    paymentSchedules={paymentSchedules}
                    billingGenerationBlocker={billingPeriodValidation?.blockingMessage}
                    healthScore={contractHealth.score}
                  />
                )}

                {activeTab === 'records' && (
                  <div className="space-y-5">
                    <Tabs defaultValue="official" className="w-full">
                      <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-[#E5EAF1] bg-white p-1 shadow-sm">
                        <TabsTrigger
                          value="official"
                          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                        >
                          <FileCheck className="w-4 h-4" />
                          العقد الرسمي
                        </TabsTrigger>
                        <TabsTrigger
                          value="documents"
                          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                        >
                          <Folder className="w-4 h-4" />
                          المستندات
                        </TabsTrigger>
                        <TabsTrigger
                          value="timeline"
                          className="gap-2 rounded-lg px-5 py-2.5 text-[#5B6677] transition-all data-[state=active]:bg-[#22C7A1] data-[state=active]:text-white"
                        >
                          <GitBranch className="w-4 h-4" />
                          الجدول الزمني
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="official" className="mt-4">
                        <div className="overflow-hidden rounded-2xl border border-[#E5EAF1] bg-white shadow-sm">
                          <OfficialContractView
                            contract={contract}
                            paymentSchedules={officialPaymentSchedules}
                            checkInInspection={checkInInspection}
                            checkOutInspection={checkOutInspection}
                            blockingMessage={documentGenerationBlocker}
                          />
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="mt-4">
                        <ContractDocuments
                          contractId={contract.id}
                          customerId={contract.customer_id}
                          vehicleId={contract.vehicle_id || contract.vehicle?.id}
                        />
                      </TabsContent>

                      <TabsContent value="timeline" className="mt-4">
                        <Card className="rounded-2xl border-[#E5EAF1] shadow-sm">
                          <CardHeader className="border-b border-[#E5EAF1] bg-[#F6F8FB]">
                            <CardTitle className="text-lg text-[#0F172A]">الجدول الزمني للعقد</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <TimelineView
                              contract={contract}
                              trafficViolationsCount={trafficViolations.length}
                              formatCurrency={formatCurrency}
                              auditLogs={contractAuditLogs}
                              paidTotal={snapshot.paidTotal}
                              remainingTotal={snapshot.remainingTotal}
                            />
                          </CardContent>
                        </Card>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}

                {activeTab === 'financial' && (
                  <FinancialTab
                    contract={contract}
                    invoices={invoices}
                    paymentSchedules={paymentSchedules}
                    snapshot={snapshot}
                    contractId={contract.id}
                    companyId={contract.company_id}
                    formatCurrency={formatCurrency}
                    onPayInvoice={handleInvoicePay}
                    onPreviewInvoice={handleInvoicePreview}
                    onCreateInvoice={handleCreateInvoiceRequest}
                    onCancelInvoice={handleCancelInvoice}
                    isCancellingInvoice={isCancellingInvoice}
                    onBulkCancelInvoices={handleBulkCancelInvoices}
                    isBulkCancellingInvoices={isBulkCancellingInvoices}
                    onGeneratePaymentSchedules={handleGeneratePaymentSchedules}
                    onGenerateMissingInvoices={
                      billableContractStatusesV3.has(String(contract.status || '').toLowerCase())
                        ? handleGenerateMissingInvoices
                        : undefined
                    }
                    isGeneratingMissingInvoices={isGeneratingMissingInvoices}
                    billingGenerationBlocker={billingPeriodValidation?.blockingMessage}
                    customerName={customerName}
                    trafficViolations={trafficViolations}
                  />
                )}

                {activeTab === 'vehicle' && (
                  <VehicleTab
                    contract={contract}
                    customerName={customerName}
                    plateNumber={plateNumber}
                    formatCurrency={formatCurrency}
                  />
                )}

                {activeTab === 'violations' && (
                  <ContractViolationsTabRedesigned
                    violations={trafficViolations}
                    formatCurrency={formatCurrency}
                    contractNumber={contract.contract_number}
                    onAddViolation={handleAddViolation}
                  />
                )}
              </div>
            </Tabs>
          </div>

          {/* Pulse rail — visible only on the health (overview) tab */}
          {activeTab === 'health' && (
            <ContractPulse
              contract={contract}
              snapshot={snapshot}
              invoices={invoices}
              payments={contractPayments}
              paymentSchedules={paymentSchedules}
              crmActivities={crmActivities}
              crmStats={crmStats}
              violationsCount={unsettledTrafficViolations.length}
              daysRemaining={contractStats?.daysRemaining ?? null}
              auditLogs={contractAuditLogs}
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
            />
          )}
        </div>
      </div>

      {/* ===== Dialogs ===== */}
      {selectedInvoice && (
        <>
          <PayInvoiceDialog
            open={isPayDialogOpen}
            onOpenChange={setIsPayDialogOpen}
            invoice={selectedInvoice}
            onPaymentCreated={async () => {
              await refreshContractFinancialQueries(queryClient, {
                contractId: contract.id,
                contractNumber: contract.contract_number,
                companyId: contract.company_id,
              });
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

      <ContractPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        contract={contract}
        paymentSchedules={officialPaymentSchedules}
        checkInInspection={checkInInspection}
        checkOutInspection={checkOutInspection}
      />

      <Dialog open={isOfficialExportOpen} onOpenChange={setIsOfficialExportOpen}>
        <DialogContent className="max-h-[95vh] max-w-[96vw] overflow-auto rounded-2xl bg-[#F6F8FB] p-4">
          <DialogHeader>
            <DialogTitle className="text-right text-lg font-black text-[#142033]">تصدير العقد الرسمي</DialogTitle>
          </DialogHeader>
          <OfficialContractView
            contract={contract}
            paymentSchedules={officialPaymentSchedules}
            checkInInspection={checkInInspection}
            checkOutInspection={checkOutInspection}
            blockingMessage={documentGenerationBlocker}
          />
        </DialogContent>
      </Dialog>

      <ContractStatusManagement open={isStatusManagementOpen} onOpenChange={setIsStatusManagementOpen} contract={contract} />

      <ConvertToLegalDialog open={isConvertToLegalOpen} onOpenChange={setIsConvertToLegalOpen} contract={contract} />

      {/* Terminate Dialog */}
      <ContractCancellationDialog
        open={isTerminateDialogOpen}
        onOpenChange={setIsTerminateDialogOpen}
        contract={contract}
        onCancelled={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['contract-details', contractNumber, companyId] }),
            queryClient.invalidateQueries({ queryKey: ['contract-invoices', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['payment-schedules'] }),
            queryClient.invalidateQueries({ queryKey: ['contract-violations', contract.id] }),
            queryClient.invalidateQueries({ queryKey: ['contracts'] }),
            queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
          ]);
        }}
      />

      {/* Reactivate Dialog */}
      <AlertDialog
        open={isReactivateDialogOpen}
        onOpenChange={(open) => {
          setIsReactivateDialogOpen(open);
          if (!open && !isReactivating) setReactivationViolationsAccepted(false);
        }}
      >
        <AlertDialogContent className="rounded-2xl" data-tour="contract-reactivate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-emerald-600">إعادة تفعيل العقد</AlertDialogTitle>
            <AlertDialogDescription data-tour="contract-reactivate-warning">
              هل أنت متأكد من إعادة تفعيل العقد #{contract.contract_number}؟ سيتم تحديث حالته إلى &quot;نشط&quot; مع الحفاظ
              على الفواتير والدفعات والقيود القائمة دون تكرارها.
            </AlertDialogDescription>
            {reactivationHasViolations && (
              <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-right">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="accept-reactivation-violations"
                    checked={reactivationViolationsAccepted}
                    onCheckedChange={(checked) => setReactivationViolationsAccepted(checked === true)}
                    disabled={isReactivating}
                  />
                  <label
                    htmlFor="accept-reactivation-violations"
                    className="cursor-pointer text-sm font-bold leading-6 text-amber-900"
                  >
                    أوافق على إعادة تفعيل العقد رغم وجود {unsettledTrafficViolations.length} مخالفة غير مسددة بإجمالي{' '}
                    {formatCurrency(reactivationViolationTotal)}، وأقر بأن المخالفات ستبقى مسجلة دون حذف أو تسوية تلقائية.
                  </label>
                </div>
              </div>
            )}
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
              onClick={(event) => {
                event.preventDefault();
                void executeReactivateContract();
              }}
              disabled={isReactivating || (reactivationHasViolations && !reactivationViolationsAccepted)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
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
      <PermanentContractDeleteDialog
        open={isDeletePermanentDialogOpen}
        onOpenChange={setIsDeletePermanentDialogOpen}
        contract={contract}
        companyId={companyId}
        onDeleted={async () => {
          await queryClient.invalidateQueries({ queryKey: ['contract-details', contractNumber, companyId] });
          navigate('/contracts');
        }}
        onReviewViolations={() => {
          setIsDeletePermanentDialogOpen(false);
          setActiveTab('violations');
        }}
      />

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
                    سيتم إعادة العقد للحالة النشطة مع إغلاق القضايا وتعطيل سجل التعثر، مع الاحتفاظ بكامل السجل للمراجعة.
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
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
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
                <p>
                  هل أنت متأكد من إلغاء الفاتورة <strong>{invoiceToCancel?.invoice_number}</strong>؟
                </p>
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
              className="rounded-xl bg-red-600 hover:bg-red-700"
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
    </motion.div>
  );
};

export default ContractDetailsPageRedesigned;
