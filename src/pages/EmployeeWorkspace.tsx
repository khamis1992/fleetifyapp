/**
 * Employee Workspace Page - Redesigned
 * صفحة مساحة عمل الموظف - تصميم احترافي
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  RefreshCw, 
  Briefcase, 
  Car,
  LogOut,
  CheckCircle, 
  Clock, 
  AlertCircle,
  Phone,
  FileText,
  DollarSign,
  Calendar,
  Search,
  Star,
  TrendingUp,
  Filter,
  XCircle,
  PauseCircle,
  Scale,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ClipboardCheck,
  Save,
  FileDown,
  FilePlus2,
  FileCheck2,
  ScanLine,
  Upload,
  Edit3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useEmployeeTasks } from '@/hooks/useEmployeeTasks';
import { useEmployeePerformance } from '@/hooks/useEmployeePerformance';
import { useMonthlyCollections } from '@/hooks/useMonthlyCollections';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCustomerName } from '@/utils/formatCustomerName';
import {
  CallLogDialog,
  ScheduleFollowupDialog,
  AddNoteDialog,
} from '@/components/employee/dialogs';
import { QuickPaymentDialog } from '@/components/finance/QuickPaymentDialog';
import { UnassignContractDialog } from '@/components/team';
import { LegalTransferReadinessWizard as ConvertToLegalDialog } from '@/components/contracts/LegalTransferReadinessWizard';
import { SimpleContractWizard } from '@/components/contracts/SimpleContractWizard';
import {
  SignedContractScannerDialog,
  type SignedContractScanFiles,
} from '@/components/contracts/SignedContractScannerDialog';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportEmployeeWorkspaceReport } from '@/utils/exports/employeeReport';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { VerificationTasksList } from '@/components/tasks/VerificationTasksList';
import {
  getPerformanceGrade as getReportPerformanceGrade,
  type EmployeePerformance as ReportEmployeePerformance,
  type EmployeeTask as ReportEmployeeTask,
} from '@/types/employee-workspace.types';
import type { ContractForLegal } from '@/hooks/useConvertToLegal';
import { useCreateContractDocument } from '@/hooks/useContractDocuments';

type DailyLogChecklistKey =
  | 'workspace_opened'
  | 'page_refreshed'
  | 'metrics_reviewed'
  | 'priority_started'
  | 'calls_documented'
  | 'payments_verified'
  | 'followups_scheduled'
  | 'notes_added'
  | 'tasks_completed'
  | 'legal_reviewed'
  | 'remaining_reviewed'
  | 'report_exported';

type DailyLogFormState = {
  logDate: string;
  employeeName: string;
  team: string;
  department: string;
  startTime: string;
  endTime: string;
  assignedContracts: string;
  totalDue: string;
  priorityCases: string;
  callsLogged: string;
  answeredCalls: string;
  noAnswerCalls: string;
  paymentPromises: string;
  paymentsRegistered: string;
  totalCollected: string;
  followupsScheduled: string;
  notesAdded: string;
  completedTasks: string;
  delayedTasks: string;
  legalReferrals: 'yes' | 'no';
  reportExported: boolean;
  keyCases: string;
  legalReviewCases: string;
  blockers: string;
  status: 'completed' | 'incomplete';
  incompleteReason: string;
  checklist: Record<DailyLogChecklistKey, boolean>;
};

type DailyActivityMetrics = {
  callsLogged: number;
  answeredCalls: number;
  noAnswerCalls: number;
  paymentPromises: number;
  paymentsRegistered: number;
  totalCollected: number;
  followupsScheduled: number;
  notesAdded: number;
  completedTasks: number;
  delayedTasks: number;
};

type DailyContractActivityItem = {
  id: string;
  source: 'contract_operation' | 'payment' | 'document';
  label: string;
  title: string;
  detail: string;
  contractNumber?: string | null;
  amount?: number | null;
  occurredAt?: string | null;
};

type DailyContractActivitySummary = {
  contractUpdates: number;
  statusChanges: number;
  paymentsRegistered: number;
  documentsAdded: number;
  totalPaymentAmount: number;
  items: DailyContractActivityItem[];
};

type ContractWorkFilter = 'all' | 'collection' | 'operational' | 'ready_to_close' | 'needs_completion';

const DAILY_LOG_CHECKLIST: Array<{ key: DailyLogChecklistKey; label: string }> = [
  { key: 'workspace_opened', label: 'تم الدخول إلى مساحة عملي والتأكد من ظهور البيانات' },
  { key: 'page_refreshed', label: 'تم الضغط على تحديث في بداية اليوم' },
  { key: 'metrics_reviewed', label: 'تمت مراجعة بطاقات المؤشرات والمهام المطلوبة' },
  { key: 'priority_started', label: 'تم البدء بالعقود والعملاء ذوي الأولوية الأعلى' },
  { key: 'calls_documented', label: 'تم تنفيذ المكالمات وتوثيق نتائجها المؤثرة' },
  { key: 'payments_verified', label: 'تمت مطابقة العميل والعقد قبل تسجيل أي دفعة' },
  { key: 'followups_scheduled', label: 'تمت جدولة موعد لكل متابعة مؤجلة أو وعد بالدفع' },
  { key: 'notes_added', label: 'تمت إضافة الملاحظات المهمة بوضوح واختصار' },
  { key: 'tasks_completed', label: 'تم تحديد إنجاز المهام المنفذة فعليًا فقط' },
  { key: 'legal_reviewed', label: 'تمت مراجعة الملاحظات والدفعات قبل أي تصعيد قانوني' },
  { key: 'remaining_reviewed', label: 'تمت مراجعة المهام المتبقية في نهاية اليوم' },
  { key: 'report_exported', label: 'تم تحديث الصفحة وتصدير التقرير عند الحاجة' },
];

const AUTO_DAILY_RESULT_FIELDS = new Set<keyof DailyLogFormState>([
  'callsLogged',
  'answeredCalls',
  'noAnswerCalls',
  'paymentsRegistered',
  'totalCollected',
  'followupsScheduled',
  'notesAdded',
  'completedTasks',
  'delayedTasks',
]);

const emptyChecklist = (): Record<DailyLogChecklistKey, boolean> => DAILY_LOG_CHECKLIST.reduce(
  (acc, item) => ({ ...acc, [item.key]: false }),
  {} as Record<DailyLogChecklistKey, boolean>,
);

const todayISODate = () => new Date().toISOString().slice(0, 10);

const currentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const numberValue = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const emptyDailyActivityMetrics: DailyActivityMetrics = {
  callsLogged: 0,
  answeredCalls: 0,
  noAnswerCalls: 0,
  paymentPromises: 0,
  paymentsRegistered: 0,
  totalCollected: 0,
  followupsScheduled: 0,
  notesAdded: 0,
  completedTasks: 0,
  delayedTasks: 0,
};

const emptyDailyContractActivity: DailyContractActivitySummary = {
  contractUpdates: 0,
  statusChanges: 0,
  paymentsRegistered: 0,
  documentsAdded: 0,
  totalPaymentAmount: 0,
  items: [],
};

const contractOperationLabels: Record<string, string> = {
  update: 'تعديل عقد',
  contract_update: 'تعديل عقد',
  status_change: 'تغيير حالة عقد',
  close_contract: 'إغلاق عقد',
  cancel_contract: 'إلغاء عقد',
  convert_to_legal: 'تحويل قانوني',
  revert_from_legal: 'إرجاع من القانوني',
  legal_transfer_readiness_completed: 'اكتمال جاهزية التحويل',
  signed_contract_uploaded: 'رفع عقد موقع',
};

const humanizeContractOperation = (operationType?: string | null) => {
  const key = String(operationType || '').trim();
  if (!key) return 'تعديل عقد';
  return contractOperationLabels[key] || key.replace(/_/g, ' ');
};

const formatActivityTime = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('ar-QA', { hour: '2-digit', minute: '2-digit' });
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const EmployeeWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [contractWorkFilter, setContractWorkFilter] = useState<ContractWorkFilter>('all');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [showBulkUnassignDialog, setShowBulkUnassignDialog] = useState(false);
  const [showCancelContractDialog, setShowCancelContractDialog] = useState(false);
  const [showConvertToLegalDialog, setShowConvertToLegalDialog] = useState(false);
  const [showDailyLogDialog, setShowDailyLogDialog] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [signedScanContract, setSignedScanContract] = useState<{
    id: string;
    contractNumber: string;
  } | null>(null);
  const [violationProofContract, setViolationProofContract] = useState<{
    id: string;
    contractNumber: string;
  } | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [preselectedContractCustomerId, setPreselectedContractCustomerId] = useState<string | undefined>();
  const [selectedBulkContractIds, setSelectedBulkContractIds] = useState<string[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [dailyLogForm, setDailyLogForm] = useState<DailyLogFormState | null>(null);
  const [contractCancellationReason, setContractCancellationReason] = useState('');
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<{
    customerId: string;
    customerName: string;
    customerPhone: string | null;
  } | null>(null);
  // This page is the current employee's own workspace. Reassignment must happen
  // from Team Management, even when the employee also has a management role.
  const canUnassignContracts = false;
  const companyId = user?.profile?.company_id || user?.company?.id || '';
  const todayLogDate = todayISODate();
  const createContractDocument = useCreateContractDocument();
  const violationProofInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Remove scroll lock that might be set by Radix UI dialogs
    const body = document.body;
    const wasLocked = body.hasAttribute('data-scroll-locked');
    if (wasLocked) {
      body.removeAttribute('data-scroll-locked');
      body.style.overflow = '';
      body.style.paddingRight = '';
    }

    return () => {
      // Cleanup: restore scroll lock if it was present
      if (wasLocked) {
        body.setAttribute('data-scroll-locked', '');
      }
    };
  }, []);

  // Fetch data
  const {
    contracts,
    priorityContracts,
    stats: contractStats,
    isLoading: isLoadingContracts,
    refetch: refetchContracts
  } = useEmployeeContracts();

  const {
    todayTasks,
    tasks,
    stats: taskStats,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
    completeTask
  } = useEmployeeTasks();

  const {
    performance,
    performanceGrade,
    isLoading: isLoadingPerformance,
    refetch: refetchPerformance
  } = useEmployeePerformance();

  const {
    collections,
    stats: collectionStats,
    isLoading: isLoadingCollections,
    refetch: refetchCollections
  } = useMonthlyCollections();

  const {
    data: workspaceProfile,
  } = useQuery({
    queryKey: ['employee-workspace-profile', companyId, user?.id],
    queryFn: async () => {
      if (!user?.id || !companyId) throw new Error('Employee identity is required');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, company_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!companyId,
  });

  const assignedContractIdsKey = contracts.map((contract) => contract.id).join(',');
  const {
    data: signedContractIds = [],
    isLoading: isSignedContractStatusLoading,
    isError: hasSignedContractStatusError,
  } = useQuery({
    queryKey: ['employee-signed-contract-documents', companyId, workspaceProfile?.id, assignedContractIdsKey],
    queryFn: async (): Promise<string[]> => {
      const assignedContractIds = contracts.map((contract) => contract.id).filter(Boolean);
      if (!companyId || assignedContractIds.length === 0) return [];

      const { data, error } = await supabase
        .from('contract_documents')
        .select('contract_id')
        .eq('company_id', companyId)
        .in('document_type', ['signed_contract', 'signed_contract_image'])
        .in('contract_id', assignedContractIds);

      if (error) throw error;
      return Array.from(new Set(
        (data || [])
          .map((document) => document.contract_id)
          .filter((contractId): contractId is string => Boolean(contractId)),
      ));
    },
    enabled: !!companyId && !!workspaceProfile?.id && contracts.length > 0,
    staleTime: 30_000,
  });

  const {
    data: dailyLog,
    refetch: refetchDailyLog,
  } = useQuery({
    queryKey: ['employee-daily-workspace-log', companyId, workspaceProfile?.id, todayLogDate],
    queryFn: async () => {
      if (!workspaceProfile?.id || !companyId) return null;

      const { data, error } = await (supabase as any)
        .from('employee_daily_workspace_logs')
        .select('*')
        .eq('company_id', companyId)
        .eq('employee_profile_id', workspaceProfile.id)
        .eq('log_date', todayLogDate)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceProfile?.id && !!companyId,
  });

  const {
    data: dailyActivityMetrics = emptyDailyActivityMetrics,
    refetch: refetchDailyActivityMetrics,
  } = useQuery({
    queryKey: ['employee-daily-activity-metrics', companyId, workspaceProfile?.id, user?.id, todayLogDate, contracts.map((contract) => contract.id).join(',')],
    queryFn: async (): Promise<DailyActivityMetrics> => {
      if (!workspaceProfile?.id || !companyId || !user?.id) return emptyDailyActivityMetrics;

      const dayStart = `${todayLogDate}T00:00:00`;
      const dayEnd = `${todayLogDate}T23:59:59`;
      const assignedContractIds = contracts.map((contract) => contract.id).filter(Boolean);

      const [communicationsResult, followupsResult, paymentsResult] = await Promise.all([
        (supabase as any)
          .from('customer_communications')
          .select('communication_type, notes, follow_up_scheduled')
          .eq('company_id', companyId)
          .eq('employee_id', user.id)
          .eq('communication_date', todayLogDate),
        (supabase as any)
          .from('scheduled_followups')
          .select('id')
          .eq('company_id', companyId)
          .eq('created_by', workspaceProfile.id)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd),
        assignedContractIds.length > 0
          ? (supabase as any)
              .from('payments')
              .select('id, amount')
              .eq('company_id', companyId)
              .eq('payment_status', 'completed')
              .eq('payment_date', todayLogDate)
              .in('contract_id', assignedContractIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (communicationsResult.error) throw communicationsResult.error;
      if (followupsResult.error) throw followupsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const communications = communicationsResult.data || [];
      const phoneCommunications = communications.filter((item: any) => item.communication_type === 'phone');
      const noteCommunications = communications.filter((item: any) => item.communication_type === 'note');
      const payments = paymentsResult.data || [];

      const noAnswerCalls = phoneCommunications.filter((item: any) => {
        const notes = String(item.notes || '').toLowerCase();
        return notes.includes('no_answer') || notes.includes('لا رد') || notes.includes('لم يتم الرد');
      }).length;

      const paymentPromises = phoneCommunications.filter((item: any) => {
        const notes = String(item.notes || '').toLowerCase();
        return notes.includes('payment_promised') || notes.includes('وعد') || notes.includes('promise');
      }).length;

      return {
        callsLogged: phoneCommunications.length,
        answeredCalls: Math.max(0, phoneCommunications.length - noAnswerCalls),
        noAnswerCalls,
        paymentPromises,
        paymentsRegistered: payments.length || collectionStats.paidCount || 0,
        totalCollected: payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0) || performance?.total_collected || collectionStats.totalCollected || 0,
        followupsScheduled: followupsResult.data?.length || phoneCommunications.filter((item: any) => item.follow_up_scheduled).length || 0,
        notesAdded: noteCommunications.length || performance?.notes_added || 0,
        completedTasks: todayTasks.filter((task) => task.status === 'completed').length || performance?.tasks_completed || taskStats.completedTasks || 0,
        delayedTasks: taskStats.overdueTasks || 0,
      };
    },
    enabled: !!workspaceProfile?.id && !!companyId && !!user?.id,
  });

  const {
    data: dailyContractActivity = emptyDailyContractActivity,
    refetch: refetchDailyContractActivity,
  } = useQuery({
    queryKey: ['employee-daily-contract-activity', companyId, workspaceProfile?.id, user?.id, todayLogDate, contracts.map((contract) => contract.id).join(',')],
    queryFn: async (): Promise<DailyContractActivitySummary> => {
      if (!workspaceProfile?.id || !companyId || !user?.id) return emptyDailyContractActivity;

      const dayStart = `${todayLogDate}T00:00:00`;
      const dayEnd = `${todayLogDate}T23:59:59`;
      const assignedContractIds = contracts.map((contract) => contract.id).filter(Boolean);
      const assignedContractIdSet = new Set(assignedContractIds);

      const [operationsResult, documentsResult, paymentsResult] = await Promise.all([
        (supabase as any)
          .from('contract_operations_log')
          .select('id, contract_id, operation_type, operation_details, old_values, new_values, notes, performed_at, performed_by')
          .eq('company_id', companyId)
          .eq('performed_by', workspaceProfile.id)
          .gte('performed_at', dayStart)
          .lte('performed_at', dayEnd),
        (supabase as any)
          .from('contract_documents')
          .select('id, contract_id, document_name, document_type, uploaded_at, created_at, uploaded_by')
          .eq('company_id', companyId)
          .eq('uploaded_by', user.id)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd),
        (supabase as any)
          .from('payments')
          .select('id, contract_id, payment_number, amount, payment_status, payment_date, created_at, created_by')
          .eq('company_id', companyId)
          .eq('created_by', user.id)
          .gte('created_at', dayStart)
          .lte('created_at', dayEnd),
      ]);

      if (operationsResult.error) throw operationsResult.error;
      if (documentsResult.error) throw documentsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const operations = (operationsResult.data || []).filter((item: any) =>
        !item.contract_id || assignedContractIdSet.size === 0 || assignedContractIdSet.has(item.contract_id)
      );
      const documents = (documentsResult.data || []).filter((item: any) =>
        !item.contract_id || assignedContractIdSet.size === 0 || assignedContractIdSet.has(item.contract_id)
      );
      const payments = (paymentsResult.data || []).filter((item: any) =>
        !item.contract_id || assignedContractIdSet.size === 0 || assignedContractIdSet.has(item.contract_id)
      );

      const activityContractIds = Array.from(new Set(
        [...operations, ...documents, ...payments]
          .map((item: any) => item.contract_id)
          .filter(Boolean),
      ));

      const contractsById = new Map<string, string>();
      if (activityContractIds.length > 0) {
        const { data: activityContracts, error: contractsError } = await supabase
          .from('contracts')
          .select('id, contract_number')
          .eq('company_id', companyId)
          .in('id', activityContractIds);

        if (contractsError) throw contractsError;
        (activityContracts || []).forEach((contract) => {
          contractsById.set(contract.id, contract.contract_number || contract.id);
        });
      }

      const operationItems: DailyContractActivityItem[] = operations.map((operation: any) => {
        const oldValues = operation.old_values || {};
        const newValues = operation.new_values || {};
        const changedFields = Object.keys(newValues).filter((key) => oldValues?.[key] !== newValues?.[key]);
        const label = humanizeContractOperation(operation.operation_type);
        const fieldText = changedFields.length > 0 ? `الحقول: ${changedFields.slice(0, 4).join('، ')}` : (operation.notes || 'تم تسجيل تعديل على العقد');

        return {
          id: `operation-${operation.id}`,
          source: 'contract_operation',
          label,
          title: `${label}${contractsById.get(operation.contract_id) ? ` - ${contractsById.get(operation.contract_id)}` : ''}`,
          detail: fieldText,
          contractNumber: contractsById.get(operation.contract_id),
          occurredAt: operation.performed_at,
        };
      });

      const documentItems: DailyContractActivityItem[] = documents.map((document: any) => ({
        id: `document-${document.id}`,
        source: 'document',
        label: 'إضافة مستند',
        title: `إضافة مستند${contractsById.get(document.contract_id) ? ` - ${contractsById.get(document.contract_id)}` : ''}`,
        detail: document.document_name || document.document_type || 'مستند عقد',
        contractNumber: contractsById.get(document.contract_id),
        occurredAt: document.uploaded_at || document.created_at,
      }));

      const paymentItems: DailyContractActivityItem[] = payments.map((payment: any) => ({
        id: `payment-${payment.id}`,
        source: 'payment',
        label: 'تسجيل دفعة',
        title: `تسجيل دفعة${contractsById.get(payment.contract_id) ? ` - ${contractsById.get(payment.contract_id)}` : ''}`,
        detail: `${payment.payment_number || 'دفعة'} - ${payment.payment_status || 'بدون حالة'}`,
        contractNumber: contractsById.get(payment.contract_id),
        amount: Number(payment.amount || 0),
        occurredAt: payment.created_at || payment.payment_date,
      }));

      const items = [...operationItems, ...documentItems, ...paymentItems]
        .sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime());

      return {
        contractUpdates: operationItems.length,
        statusChanges: operations.filter((operation: any) => {
          const type = String(operation.operation_type || '').toLowerCase();
          const oldStatus = operation.old_values?.status;
          const newStatus = operation.new_values?.status;
          return type.includes('status') || oldStatus !== newStatus;
        }).length,
        paymentsRegistered: paymentItems.length,
        documentsAdded: documentItems.length,
        totalPaymentAmount: paymentItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        items,
      };
    },
    enabled: !!workspaceProfile?.id && !!companyId && !!user?.id,
  });

  const employeeDisplayName = useMemo(() => {
    const profileName = [workspaceProfile?.first_name, workspaceProfile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    return profileName || user?.email?.split('@')[0] || 'الموظف';
  }, [user?.email, workspaceProfile?.first_name, workspaceProfile?.last_name]);

  const buildDefaultDailyLogForm = (): DailyLogFormState => ({
    logDate: todayLogDate,
    employeeName: employeeDisplayName,
    team: 'فريق المتابعة والتحصيل',
    department: 'التحصيل والمتابعة',
    startTime: currentTimeValue(),
    endTime: '',
    assignedContracts: String(contractStats.totalContracts || 0),
    totalDue: String(contractStats.totalBalanceDue || 0),
    priorityCases: String(priorityContracts.length || 0),
    callsLogged: String(dailyActivityMetrics.callsLogged),
    answeredCalls: String(dailyActivityMetrics.answeredCalls),
    noAnswerCalls: String(dailyActivityMetrics.noAnswerCalls),
    paymentPromises: String(dailyActivityMetrics.paymentPromises),
    paymentsRegistered: String(dailyActivityMetrics.paymentsRegistered),
    totalCollected: String(dailyActivityMetrics.totalCollected),
    followupsScheduled: String(dailyActivityMetrics.followupsScheduled),
    notesAdded: String(dailyActivityMetrics.notesAdded),
    completedTasks: String(dailyActivityMetrics.completedTasks),
    delayedTasks: String(dailyActivityMetrics.delayedTasks),
    legalReferrals: 'no',
    reportExported: false,
    keyCases: '',
    legalReviewCases: '',
    blockers: '',
    status: 'completed',
    incompleteReason: '',
    checklist: emptyChecklist(),
  });

  const dailyLogToForm = (log: any): DailyLogFormState => {
    const beginningMetrics = log?.beginning_metrics || {};
    const summary = log?.summary || {};
    return {
      ...buildDefaultDailyLogForm(),
      logDate: log?.log_date || todayLogDate,
      employeeName: log?.employee_name || employeeDisplayName,
      team: log?.team || 'فريق المتابعة والتحصيل',
      department: log?.department || 'التحصيل والمتابعة',
      startTime: (log?.start_time || '').slice(0, 5),
      endTime: (log?.end_time || '').slice(0, 5),
      assignedContracts: String(beginningMetrics.assigned_contracts ?? contractStats.totalContracts ?? 0),
      totalDue: String(beginningMetrics.total_due ?? contractStats.totalBalanceDue ?? 0),
      priorityCases: String(beginningMetrics.priority_cases ?? priorityContracts.length ?? 0),
      callsLogged: String(summary.calls_logged ?? dailyActivityMetrics.callsLogged),
      answeredCalls: String(summary.answered_calls ?? dailyActivityMetrics.answeredCalls),
      noAnswerCalls: String(summary.no_answer_calls ?? dailyActivityMetrics.noAnswerCalls),
      paymentPromises: String(summary.payment_promises ?? dailyActivityMetrics.paymentPromises),
      paymentsRegistered: String(summary.payments_registered ?? dailyActivityMetrics.paymentsRegistered),
      totalCollected: String(summary.total_collected ?? dailyActivityMetrics.totalCollected),
      followupsScheduled: String(summary.followups_scheduled ?? dailyActivityMetrics.followupsScheduled),
      notesAdded: String(summary.notes_added ?? dailyActivityMetrics.notesAdded),
      completedTasks: String(summary.completed_tasks ?? dailyActivityMetrics.completedTasks),
      delayedTasks: String(summary.delayed_tasks ?? dailyActivityMetrics.delayedTasks),
      legalReferrals: summary.legal_referrals ? 'yes' : 'no',
      reportExported: Boolean(summary.report_exported),
      keyCases: log?.key_cases || '',
      legalReviewCases: log?.legal_review_cases || '',
      blockers: log?.blockers || '',
      status: log?.completion_status === 'incomplete' ? 'incomplete' : 'completed',
      incompleteReason: log?.incomplete_reason || '',
      checklist: { ...emptyChecklist(), ...(log?.checklist || {}) },
    };
  };

  useEffect(() => {
    if (!showDailyLogDialog) return;
    void refetchDailyActivityMetrics();
    void refetchDailyContractActivity();
    setDailyLogForm(dailyLog ? dailyLogToForm(dailyLog) : buildDefaultDailyLogForm());
  }, [
    showDailyLogDialog,
    dailyLog,
    employeeDisplayName,
    todayLogDate,
    contractStats.totalContracts,
    contractStats.totalBalanceDue,
    priorityContracts.length,
    dailyActivityMetrics,
    dailyContractActivity,
  ]);

  const checklistDoneCount = dailyLogForm
    ? DAILY_LOG_CHECKLIST.filter((item) => dailyLogForm.checklist[item.key]).length
    : DAILY_LOG_CHECKLIST.filter((item) => dailyLog?.checklist?.[item.key]).length;
  const checklistPercent = Math.round((checklistDoneCount / DAILY_LOG_CHECKLIST.length) * 100);
  const isDailyLogClosed = Boolean(dailyLog?.closed_at);

  const updateDailyLogField = <K extends keyof DailyLogFormState>(
    field: K,
    value: DailyLogFormState[K],
  ) => {
    setDailyLogForm((current) => current ? { ...current, [field]: value } : current);
  };

  const toggleDailyChecklist = (key: DailyLogChecklistKey, checked: boolean) => {
    setDailyLogForm((current) => current
      ? { ...current, checklist: { ...current.checklist, [key]: checked } }
      : current
    );
  };

  const saveDailyLogMutation = useMutation({
    mutationFn: async (form: DailyLogFormState) => {
      if (!workspaceProfile?.id || !companyId) {
        throw new Error('تعذر تحديد الموظف أو الشركة');
      }

      const payload = {
        company_id: companyId,
        employee_profile_id: workspaceProfile.id,
        log_date: form.logDate,
        employee_name: form.employeeName,
        team: form.team || null,
        department: form.department || null,
        start_time: form.startTime || null,
        end_time: form.endTime || null,
        beginning_metrics: {
          assigned_contracts: numberValue(form.assignedContracts),
          total_due: numberValue(form.totalDue),
          priority_cases: numberValue(form.priorityCases),
          today_tasks: taskStats.todayTasks || 0,
        },
        checklist: form.checklist,
        summary: {
          calls_logged: numberValue(form.callsLogged),
          answered_calls: numberValue(form.answeredCalls),
          no_answer_calls: numberValue(form.noAnswerCalls),
          payment_promises: numberValue(form.paymentPromises),
          payments_registered: numberValue(form.paymentsRegistered),
          total_collected: numberValue(form.totalCollected),
          followups_scheduled: numberValue(form.followupsScheduled),
          notes_added: numberValue(form.notesAdded),
          completed_tasks: numberValue(form.completedTasks),
          delayed_tasks: numberValue(form.delayedTasks),
          legal_referrals: form.legalReferrals === 'yes',
          report_exported: form.reportExported,
          contract_activity: {
            contract_updates: dailyContractActivity.contractUpdates,
            status_changes: dailyContractActivity.statusChanges,
            payments_registered: dailyContractActivity.paymentsRegistered,
            documents_added: dailyContractActivity.documentsAdded,
            total_payment_amount: dailyContractActivity.totalPaymentAmount,
            items: dailyContractActivity.items.slice(0, 50),
          },
        },
        key_cases: form.keyCases || null,
        legal_review_cases: form.legalReviewCases || null,
        blockers: form.blockers || null,
        completion_status: form.status,
        incomplete_reason: form.status === 'incomplete' ? form.incompleteReason || null : null,
        closed_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase as any)
        .from('employee_daily_workspace_logs')
        .upsert(payload, { onConflict: 'employee_profile_id,log_date' })
        .select('*')
        .single();

      if (error) throw error;

      const { data: managers, error: managersError } = await supabase
        .from('profiles')
        .select('id, user_id, role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('role', ['super_admin', 'company_admin', 'manager', 'admin', 'owner']);

      if (managersError) throw managersError;

      const managerNotifications = (managers || [])
        .filter((manager) => manager.user_id)
        .map((manager) => ({
          company_id: companyId,
          user_id: manager.user_id,
          title: 'تم إقفال يوم عمل موظف',
          message: `قام ${form.employeeName || employeeDisplayName} بإقفال يوم العمل ${form.logDate}. التحصيل: ${formatCurrency(numberValue(form.totalCollected))}. نشاط العقود: ${dailyContractActivity.items.length}. الحالة: ${form.status === 'completed' ? 'مكتمل' : 'غير مكتمل'}.`,
          notification_type: form.status === 'completed' ? 'success' : 'warning',
          is_read: false,
          related_id: data.id,
          related_type: 'employee_daily_closeout',
          created_at: payload.closed_at,
        }));

      if (managerNotifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('user_notifications')
          .insert(managerNotifications);

        if (notificationError) throw notificationError;
      }

      return data;
    },
    onSuccess: async () => {
      await refetchDailyLog();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['employee-daily-closeouts'] });
      toast({
        title: 'تم حفظ إقفال اليوم',
        description: 'تم حفظ سجل العمل اليومي وإرسال تنبيه للمدير.',
      });
      setShowDailyLogDialog(false);
    },
    onError: (error) => {
      toast({
        title: 'تعذر حفظ إقفال اليوم',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ السجل اليومي',
        variant: 'destructive',
      });
    },
  });

  const handlePrintDailyLog = () => {
    const form = dailyLogForm || (dailyLog ? dailyLogToForm(dailyLog) : null);
    if (!form) return;

    const printable = window.open('', '_blank', 'width=900,height=1100');
    if (!printable) {
      toast({
        title: 'تعذر فتح نافذة الطباعة',
        description: 'يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.',
        variant: 'destructive',
      });
      return;
    }

    const logDate = new Date(`${form.logDate}T00:00:00`);
    const dayNumber = Number.isNaN(logDate.getTime())
      ? form.logDate.slice(-2)
      : String(logDate.getDate()).padStart(2, '0');
    const checklistColumns = [DAILY_LOG_CHECKLIST.slice(0, 6), DAILY_LOG_CHECKLIST.slice(6)];
    const checklistMarkup = checklistColumns.map((column) => `
      <div class="check-column">
        ${column.map((item) => `
          <div class="check-row">
            <span>${escapeHtml(item.label)}</span>
            <span class="box-mark">${form.checklist[item.key] ? '✓' : ''}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    const resultCells = [
      ['وعود بالدفع', form.paymentPromises],
      ['لم يتم الرد', form.noAnswerCalls],
      ['تم الرد', form.answeredCalls],
      ['المكالمات موثقة', form.callsLogged],
      ['ملاحظات مضافة', form.notesAdded],
      ['مواعيد متابعة', form.followupsScheduled],
      ['إجمالي المحصل (QAR)', formatCurrency(numberValue(form.totalCollected))],
      ['دفعات مسجلة', form.paymentsRegistered],
      ['تقرير مصدر (نعم/لا)', form.reportExported ? 'نعم' : 'لا'],
      ['إحالات قانونية', form.legalReferrals === 'yes' ? 'نعم' : 'لا'],
      ['مهام مؤجلة', form.delayedTasks],
      ['مهام منجزة', form.completedTasks],
    ].map(([label, value]) => `
      <div class="result-cell">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join('');

    const keyCasesRows = Array.from({ length: 4 }).map((_, index) => `
      <tr>
        <td>${index === 0 ? escapeHtml(form.keyCases || '') : ''}</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
      </tr>
    `).join('');

    const contractActivityRows = dailyContractActivity.items.length > 0
      ? dailyContractActivity.items.slice(0, 10).map((item) => `
        <tr>
          <td>${escapeHtml(item.contractNumber || '')}</td>
          <td>${escapeHtml(item.label)}</td>
          <td>${escapeHtml(item.detail || '')}</td>
          <td>${item.amount ? escapeHtml(formatCurrency(item.amount)) : ''}</td>
          <td>${escapeHtml(formatActivityTime(item.occurredAt))}</td>
        </tr>
      `).join('')
      : `
        <tr>
          <td colspan="5" class="empty-activity">لا توجد تعديلات عقود أو دفعات أو مستندات مسجلة لهذا الموظف اليوم.</td>
        </tr>
      `;

    const contractActivityCells = [
      ['تعديلات العقود', dailyContractActivity.contractUpdates],
      ['تغييرات الحالة', dailyContractActivity.statusChanges],
      ['دفعات مسجلة', dailyContractActivity.paymentsRegistered],
      ['مستندات مضافة', dailyContractActivity.documentsAdded],
      ['إجمالي دفعات النشاط', formatCurrency(dailyContractActivity.totalPaymentAmount)],
    ].map(([label, value]) => `
      <div class="result-cell">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join('');

    printable.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>سجل مساحة عمل الموظف اليومي - ${form.logDate}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f3f6fa;
              color: #142033;
              font-family: "Cairo", "Tahoma", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.55;
            }
            .print-action {
              position: fixed;
              top: 16px;
              left: 16px;
              z-index: 10;
              border: 0;
              border-radius: 10px;
              background: #142033;
              color: #fff;
              padding: 10px 18px;
              font-weight: 800;
              cursor: pointer;
            }
            .sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 18px auto;
              background: #fff;
              padding: 0 9mm 7mm;
              position: relative;
              overflow: hidden;
            }
            .sheet::before {
              content: "";
              display: block;
              height: 8px;
              margin: 0 -9mm 9mm;
              background: #11a37f;
            }
            .topbar {
              display: grid;
              grid-template-columns: 1fr 2fr 1fr;
              align-items: center;
              gap: 12px;
              border-bottom: 2px solid #cfd8e3;
              padding-bottom: 10px;
            }
            .brand {
              text-align: right;
              font-weight: 900;
              color: #11a37f;
              font-size: 17px;
            }
            .brand small {
              display: block;
              margin-top: 12px;
              color: #8a97aa;
              font-size: 10px;
              font-weight: 700;
            }
            .title { text-align: center; }
            .title h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 0;
            }
            .title p {
              margin: 4px 0 0;
              color: #6a7688;
              font-size: 12px;
              font-weight: 700;
            }
            .day-badge {
              justify-self: end;
              width: 75px;
              height: 66px;
              border-radius: 12px;
              background: #142033;
              color: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-weight: 900;
            }
            .day-badge span {
              color: #cfd8e3;
              font-size: 9px;
            }
            .day-badge strong {
              font-size: 22px;
              line-height: 1;
            }
            .section {
              margin-top: 9px;
              break-inside: avoid;
            }
            .section-heading {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 10px;
              margin: 7px 0 5px;
              border-top: 1px solid #cfd8e3;
              padding-top: 5px;
            }
            .section-heading h2 {
              margin: 0;
              font-size: 14px;
              font-weight: 900;
            }
            .section-pill {
              min-width: 48px;
              border-radius: 999px;
              background: #142033;
              color: #fff;
              padding: 8px 10px;
              text-align: center;
              font-size: 10px;
              font-weight: 900;
            }
            .field-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 6px;
            }
            .field {
              min-height: 36px;
              border: 1px solid #cfd8e3;
              border-radius: 7px;
              padding: 7px 9px 4px;
              background: #fff;
            }
            .field label {
              display: block;
              color: #6a7688;
              font-size: 10px;
              font-weight: 900;
              text-align: left;
            }
            .field div {
              margin-top: 7px;
              border-bottom: 1px solid #8a97aa;
              min-height: 13px;
              font-weight: 900;
            }
            .metric-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
            }
            .metric-card {
              border: 1px solid #cfd8e3;
              border-radius: 7px;
              padding: 8px 10px 6px;
              min-height: 46px;
              background: #fff;
              position: relative;
            }
            .metric-card::before {
              content: "";
              position: absolute;
              inset: 0 0 auto 0;
              height: 5px;
              border-radius: 7px 7px 0 0;
              background: var(--accent, #1d4f7a);
            }
            .metric-card label {
              display: flex;
              color: #6a7688;
              font-size: 10px;
              font-weight: 900;
              justify-content: flex-start;
            }
            .metric-card div {
              margin-top: 11px;
              border-bottom: 1px solid #8a97aa;
              min-height: 14px;
              font-weight: 900;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #cfd8e3;
              padding: 6px 8px;
              vertical-align: top;
              text-align: right;
            }
            th {
              background: #142033;
              color: #fff;
              font-weight: 900;
              text-align: center;
            }
            td { height: 25px; font-weight: 800; }
            .checklist {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }
            .check-column {
              display: flex;
              flex-direction: column;
              gap: 5px;
            }
            .check-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 8px;
              min-height: 24px;
              border: 1px solid #cfd8e3;
              border-radius: 6px;
              background: #f8fafc;
              padding: 4px 8px;
              font-weight: 700;
            }
            .box-mark {
              width: 16px;
              height: 16px;
              border: 2px solid #8a97aa;
              border-radius: 4px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              color: #11a37f;
              font-weight: 900;
              line-height: 1;
            }
            .results-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              border-top: 1px solid #cfd8e3;
              border-right: 1px solid #cfd8e3;
            }
            .result-cell {
              min-height: 37px;
              border-left: 1px solid #cfd8e3;
              border-bottom: 1px solid #cfd8e3;
              padding: 5px 8px 3px;
            }
            .result-cell span {
              display: block;
              color: #6a7688;
              font-size: 10px;
              font-weight: 900;
            }
            .result-cell strong {
              display: block;
              margin-top: 8px;
              border-bottom: 1px solid #8a97aa;
              min-height: 12px;
            }
            .note-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }
            .activity-summary {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              border-top: 1px solid #cfd8e3;
              border-right: 1px solid #cfd8e3;
              margin-bottom: 7px;
            }
            .empty-activity {
              height: 34px;
              text-align: center;
              color: #6a7688;
              font-weight: 900;
            }
            .note-box {
              min-height: 62px;
              border: 1px solid #cfd8e3;
              border-radius: 7px;
              padding: 8px;
              white-space: pre-wrap;
              font-weight: 700;
            }
            .note-box h3 {
              margin: 0 0 18px;
              font-size: 11px;
              font-weight: 900;
              text-align: left;
            }
            .note-line {
              border-bottom: 1px solid #8a97aa;
              min-height: 14px;
            }
            .approval {
              margin-top: 8px;
              border: 2px solid #a6c6db;
              border-radius: 9px;
              background: #eef7fd;
              padding: 9px 10px;
            }
            .approval h2 {
              margin: 0 0 8px;
              text-align: right;
              font-size: 14px;
              font-weight: 900;
            }
            .approval-checks {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-bottom: 8px;
              color: #6a7688;
              font-size: 10px;
              font-weight: 900;
            }
            .approval-checks div {
              display: flex;
              align-items: center;
              justify-content: flex-end;
              gap: 7px;
            }
            .status-line {
              display: flex;
              align-items: center;
              gap: 12px;
              margin: 6px 0;
            }
            .status-line strong { margin-left: auto; }
            .status-line span {
              display: inline-flex;
              align-items: center;
              gap: 5px;
              font-weight: 900;
            }
            .long-line {
              flex: 1;
              border-bottom: 1px solid #8a97aa;
              min-height: 14px;
            }
            .signature-row {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 18px;
              margin-top: 8px;
            }
            .signature-row div {
              border-bottom: 1px solid #8a97aa;
              min-height: 18px;
              font-weight: 900;
              color: #142033;
            }
            .footer {
              margin-top: 72px;
              display: flex;
              justify-content: space-between;
              border-top: 1px solid #cfd8e3;
              padding-top: 8px;
              color: #6a7688;
              font-size: 10px;
              font-weight: 700;
            }
            @media print {
              body { background: #fff; }
              .print-action { display: none; }
              .sheet {
                width: auto;
                min-height: auto;
                margin: 0;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-action" onclick="window.print()">طباعة السجل</button>
          <main class="sheet">
            <header class="topbar">
              <div class="brand">Fleetify<small>العراف لتأجير السيارات</small></div>
              <div class="title">
                <h1>سجل العمل اليومي لمساحة عمل الموظف</h1>
                <p>المهمة اليومية: الإقفال والتوثيق قبل نهاية الدوام</p>
              </div>
              <div class="day-badge"><span>اليوم</span><strong>${escapeHtml(dayNumber)}</strong></div>
            </header>

            <section class="section">
              <div class="field-grid">
                <div class="field"><label>اسم الموظف</label><div>${escapeHtml(form.employeeName)}</div></div>
                <div class="field"><label>اليوم</label><div>${escapeHtml(dayNumber)}</div></div>
                <div class="field"><label>التاريخ</label><div>${escapeHtml(form.logDate)}</div></div>
                <div class="field"><label>وقت الانتهاء</label><div>${escapeHtml(form.endTime || '')}</div></div>
                <div class="field"><label>وقت البدء</label><div>${escapeHtml(form.startTime || '')}</div></div>
                <div class="field"><label>القسم / الفريق</label><div>${escapeHtml(form.department || form.team || '')}</div></div>
              </div>
            </section>

            <section class="section">
              <div class="section-heading"><span class="section-pill">أولاً</span><h2>مؤشرات بداية اليوم بعد تحديث الصفحة</h2></div>
              <div class="metric-grid">
                <div class="metric-card" style="--accent:#b94e52"><label>حالات ذات أولوية</label><div>${form.priorityCases}</div></div>
                <div class="metric-card" style="--accent:#11a37f"><label>مهام اليوم</label><div>${taskStats.todayTasks || ''}</div></div>
                <div class="metric-card" style="--accent:#d99b34"><label>إجمالي المستحقات (QAR)</label><div>${formatCurrency(numberValue(form.totalDue))}</div></div>
                <div class="metric-card" style="--accent:#1d4f7a"><label>العقود المسندة</label><div>${form.assignedContracts}</div></div>
              </div>
            </section>

            <section class="section">
              <div class="section-heading"><span class="section-pill">ثانياً</span><h2>قائمة تنفيذ المهمة اليومية</h2></div>
              <div class="checklist">${checklistMarkup}</div>
            </section>

            <section class="section">
              <div class="section-heading"><span class="section-pill">ثالثاً</span><h2>ملخص نتائج العمل</h2></div>
              <div class="results-grid">${resultCells}</div>
            </section>

            <section class="section">
              <div class="section-heading"><span class="section-pill">رابعاً</span><h2>أهم الحالات والإجراءات المنفذة</h2></div>
              <table>
                <thead>
                  <tr>
                    <th>رقم العقد</th>
                    <th>اسم العميل</th>
                    <th>الإجراء المنفذ</th>
                    <th>النتيجة / المبلغ</th>
                    <th>المتابعة القادمة</th>
                  </tr>
                </thead>
                <tbody>${keyCasesRows}</tbody>
              </table>
            </section>

            <section class="section">
              <div class="section-heading"><span class="section-pill">خامساً</span><h2>نشاط العقود والملفات المحتسب من النظام</h2></div>
              <div class="activity-summary">${contractActivityCells}</div>
              <table>
                <thead>
                  <tr>
                    <th>رقم العقد</th>
                    <th>نوع العملية</th>
                    <th>التفاصيل</th>
                    <th>المبلغ</th>
                    <th>الوقت</th>
                  </tr>
                </thead>
                <tbody>${contractActivityRows}</tbody>
              </table>
            </section>

            <section class="section">
              <div class="note-grid">
                <div class="note-box"><h3>حالات تحتاج مراجعة المدير / القانونية</h3><div class="note-line">${escapeHtml(form.legalReviewCases || '')}</div></div>
                <div class="note-box"><h3>معوقات أو أخطاء بالنظام</h3><div class="note-line">${escapeHtml(form.blockers || '')}</div></div>
              </div>
            </section>

            <section class="approval">
              <h2>اعتماد إقفال المهمة اليومية</h2>
              <div class="approval-checks">
                <div><span>وثقت الإجراءات المهمة داخل النظام</span><span class="box-mark">✓</span></div>
                <div><span>حدثت مساحة العمل</span><span class="box-mark">${form.reportExported ? '✓' : ''}</span></div>
                <div><span>راجعت المهام المتبقية</span><span class="box-mark">${form.checklist.remaining_reviewed ? '✓' : ''}</span></div>
              </div>
              <div class="status-line">
                <strong>حالة المهمة:</strong>
                <span><span class="box-mark">${form.status === 'completed' ? '✓' : ''}</span> مكتملة</span>
                <span><span class="box-mark">${form.status === 'incomplete' ? '✓' : ''}</span> غير مكتملة</span>
                <strong>سبب عدم الاكتمال:</strong>
                <div class="long-line">${escapeHtml(form.incompleteReason || '')}</div>
              </div>
              <div class="signature-row">
                <div>توقيع الموظف</div>
                <div>اعتماد / أحرف المشرف</div>
                <div>وقت الإقفال</div>
              </div>
            </section>

            <footer class="footer">
              <span>للاستخدام الداخلي</span>
              <span>اليوم ${escapeHtml(dayNumber)} - صفحة 6 من 36</span>
              <span>رمز النموذج: FLT-EMP-LOG-01</span>
            </footer>
          </main>
        </body>
      </html>
    `);
    printable.document.close();
  };

  const isLoading = isLoadingContracts || isLoadingTasks || isLoadingPerformance || isLoadingCollections;

  const handleRefresh = () => {
    refetchContracts();
    refetchTasks();
    refetchPerformance();
    refetchCollections();
    refetchDailyActivityMetrics();
    refetchDailyContractActivity();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      await completeTask(taskId);
      refetchPerformance();
      toast({
        title: 'تم إنجاز المهمة',
        description: 'تم تحديث حالة المهمة بنجاح',
      });
    } catch (error) {
      toast({
        title: 'فشل إنجاز المهمة',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث المهمة',
        variant: 'destructive',
      });
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Quick Actions Configuration
  const quickActions = [
    {
      icon: FilePlus2,
      label: 'عقد جديد',
      onClick: () => openNewContractWizard(),
      variant: 'default',
      className: 'bg-[#11A37F] text-white hover:bg-[#0D876A]'
    },
    { 
      icon: Phone, 
      label: 'تسجيل مكالمة', 
      onClick: () => setShowCallDialog(true),
      variant: 'default',
      className: 'bg-[#1D4F7A] text-white hover:bg-[#163F62]'
    },
    { 
      icon: Calendar, 
      label: 'جدولة موعد', 
      onClick: () => setShowFollowupDialog(true),
      variant: 'secondary',
      className: 'bg-[#EEF4FA] text-[#173A63] hover:bg-[#DDEAF5]'
    },
    { 
      icon: FileText, 
      label: 'ملاحظة جديدة', 
      onClick: () => setShowNoteDialog(true),
      variant: 'secondary',
      className: 'bg-[#FFF6E5] text-[#9A5B00] hover:bg-[#FFE9B8]'
    },
    {
      icon: ClipboardCheck,
      label: 'إقفال اليوم',
      onClick: () => setShowDailyLogDialog(true),
      variant: 'default',
      className: 'bg-[#142033] text-white hover:bg-[#1D4F7A]'
    },
  ];

  // Prepare contracts data for dialogs
  const contractsForDialogs = contracts.map(contract => ({
    id: contract.id,
    contract_number: contract.contract_number || '',
    customer_name: contract.customer_name || 'غير محدد',
    customer_id: contract.customer_id,
    balance_due: contract.balance_due || 0,
  }));

  const selectedWorkspaceContract = contracts.find(contract => contract.id === selectedContractId);
  const selectedLegalContract: ContractForLegal | null = selectedWorkspaceContract
    ? {
        id: selectedWorkspaceContract.id,
        contract_number: selectedWorkspaceContract.contract_number,
        customer_id: selectedWorkspaceContract.customer_id,
        vehicle_id: selectedWorkspaceContract.vehicle_id,
        company_id: selectedWorkspaceContract.company_id,
        contract_amount: selectedWorkspaceContract.contract_amount || selectedWorkspaceContract.monthly_amount || 0,
        total_paid: selectedWorkspaceContract.total_paid,
        balance_due: selectedWorkspaceContract.balance_due,
        late_fine_amount: selectedWorkspaceContract.late_fine_amount,
        monthly_amount: selectedWorkspaceContract.monthly_amount,
        start_date: selectedWorkspaceContract.start_date,
        end_date: selectedWorkspaceContract.end_date,
        status: selectedWorkspaceContract.status,
        vehicle_returned: selectedWorkspaceContract.vehicle_returned,
        customer: selectedWorkspaceContract.customer,
        vehicle: selectedWorkspaceContract.vehicle,
      }
    : null;

  const handleEmployeeSignedContractScan = async ({
    pdfFile,
    pageImages,
  }: SignedContractScanFiles) => {
    if (!signedScanContract || !workspaceProfile?.id || !companyId) {
      throw new Error('تعذر تحديد الموظف أو العقد');
    }

    const { data: assignedContract, error: assignmentError } = await supabase
      .from('contracts')
      .select('id, contract_number')
      .eq('id', signedScanContract.id)
      .eq('company_id', companyId)
      .eq('assigned_to_profile_id', workspaceProfile.id)
      .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignedContract) {
      throw new Error('هذا العقد لم يعد مخصصًا لك، لذلك لم يتم رفع المستند');
    }

    const scannedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

    await createContractDocument.mutateAsync({
      contract_id: assignedContract.id,
      document_type: 'signed_contract',
      document_name: `نسخة العقد الموقع المجمعة - ${assignedContract.contract_number || signedScanContract.contractNumber}`,
      file: pdfFile,
      notes: pageImages.length > 0
        ? `رفع بواسطة الموظف من مساحة العمل بتاريخ ${scannedAt}، ويتضمن ${pageImages.length} صفحة`
        : `رفع ملف PDF جاهز بواسطة الموظف من مساحة العمل بتاريخ ${scannedAt}`,
      is_required: true,
      suppressSuccessToast: true,
    });

    for (let index = pageImages.length - 1; index >= 0; index -= 1) {
      await createContractDocument.mutateAsync({
        contract_id: assignedContract.id,
        document_type: 'signed_contract_image',
        document_name: `صورة العقد الموقع - صفحة ${index + 1}`,
        file: pageImages[index],
        notes: 'صورة ممسوحة بكاميرا الموظف مع قص A4 وتصحيح المنظور تلقائيًا',
        is_required: false,
        suppressSuccessToast: true,
      });
    }

    await queryClient.invalidateQueries({
      queryKey: ['employee-signed-contract-documents', companyId, workspaceProfile.id],
    });
  };

  const handleViolationProofUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!violationProofContract || !workspaceProfile?.id || !companyId) {
      toast({
        title: 'تعذر تحديد العقد',
        description: 'اختر العقد مرة أخرى ثم أعد رفع ملف المخالفات.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: assignedContract, error: assignmentError } = await supabase
        .from('contracts')
        .select('id, contract_number')
        .eq('id', violationProofContract.id)
        .eq('company_id', companyId)
        .eq('assigned_to_profile_id', workspaceProfile.id)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignedContract) {
        throw new Error('هذا العقد لم يعد مخصصًا لك، لذلك لم يتم رفع ملف المخالفات');
      }

      const uploadedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

      await createContractDocument.mutateAsync({
        contract_id: assignedContract.id,
        document_type: 'violations_proof',
        document_name: `ملف المخالفات المرورية - وزارة الداخلية - ${assignedContract.contract_number || violationProofContract.contractNumber}`,
        file,
        notes: `رفع بواسطة الموظف من مساحة العمل بتاريخ ${uploadedAt}`,
        is_required: true,
        suppressSuccessToast: true,
      });

      toast({
        title: 'تم رفع ملف المخالفات',
        description: 'تم حفظ ملف وزارة الداخلية ضمن مستندات العقد.',
      });
      setViolationProofContract(null);
    } catch (error) {
      toast({
        title: 'تعذر رفع ملف المخالفات',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء رفع الملف',
        variant: 'destructive',
      });
    }
  };

  const reportTasks = useMemo<ReportEmployeeTask[]>(() => tasks.map(task => {
    const contract = contracts.find(item => item.id === task.contract_id);
    const reportType: ReportEmployeeTask['type'] = ({
      call: 'followup',
      followup: 'followup',
      visit: 'customer_contact',
      payment: 'payment_collection',
      other: 'task',
    } as const)[task.type];

    return {
      id: task.id,
      type: reportType,
      title: task.title,
      title_ar: task.title_ar || task.title,
      description: task.description,
      contract_id: task.contract_id || '',
      contract_number: contract?.contract_number || '',
      customer_id: task.customer_id || contract?.customer_id || '',
      customer_name: task.customer_name || contract?.customer_name || '',
      customer_phone: contract?.customer_phone,
      scheduled_date: task.scheduled_date,
      scheduled_time: task.scheduled_time,
      priority: task.priority === 'medium' ? 'normal' : task.priority,
      status: task.status,
      outcome_notes: task.notes,
      completed_at: task.completed_at,
      created_at: task.created_at || task.scheduled_date,
      assigned_to: task.assigned_to_profile_id,
    };
  }), [contracts, tasks]);

  const reportPerformance = useMemo<ReportEmployeePerformance | null>(() => {
    if (!performance) return null;

    const employeeName = user?.email?.split('@')[0] || '';
    const [firstName = '', ...lastNameParts] = employeeName.split(' ');

    return {
      employee_id: performance.profile_id,
      user_id: user?.id || '',
      first_name: firstName,
      last_name: lastNameParts.join(' '),
      company_id: user?.profile?.company_id || user?.company?.id || '',
      assigned_contracts_count: contractStats.totalContracts,
      active_contracts_count: contractStats.activeContracts,
      contracts_with_balance_count: contracts.filter(contract => contract.balance_due > 0).length,
      total_contract_value: contracts.reduce((sum, contract) => sum + contract.monthly_amount, 0),
      total_collected: performance.total_collected,
      total_balance_due: contractStats.totalBalanceDue,
      collection_rate: performance.collection_rate,
      total_followups: taskStats.totalTasks,
      completed_followups: taskStats.completedTasks,
      pending_followups: taskStats.pendingTasks,
      overdue_followups: taskStats.overdueTasks,
      followup_completion_rate: performance.followup_completion_rate,
      total_communications: performance.calls_logged + performance.notes_added,
      phone_calls_count: performance.calls_logged,
      messages_count: 0,
      contact_coverage_rate: 0,
      performance_score: performance.performance_score,
    };
  }, [contractStats, contracts, performance, taskStats, user]);

  const reportPerformanceGrade = reportPerformance
    ? getReportPerformanceGrade(reportPerformance.performance_score)
    : null;

  const getContractWorkStatus = (contract: typeof contracts[number]): ContractWorkFilter => {
    const balanceDue = Number(contract.balance_due || 0);
    const hasSignedContract = signedContractIds.includes(contract.id);
    const hasOpenViolations = (contract.traffic_violation_count || 0) > 0;
    const hasPendingTasks = tasks.some((task) =>
      task.contract_id === contract.id && !['completed', 'cancelled'].includes(task.status)
    );

    if (balanceDue > 0) return 'collection';
    if (hasOpenViolations || !hasSignedContract || hasPendingTasks) return 'needs_completion';
    if (contract.vehicle_returned === true) return 'ready_to_close';
    return 'operational';
  };

  const contractWorkSummary = contracts.reduce((summary, contract) => {
    const status = getContractWorkStatus(contract);
    summary[status] += 1;
    return summary;
  }, {
    all: contracts.length,
    collection: 0,
    operational: 0,
    ready_to_close: 0,
    needs_completion: 0,
  } as Record<ContractWorkFilter, number> & { all: number });

  // Filter contracts based on search
  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.vehicle_make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.vehicle_model?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWorkStatus = contractWorkFilter === 'all' || getContractWorkStatus(contract) === contractWorkFilter;
    return matchesSearch && matchesWorkStatus;
  });
  const filteredContractGroups = filteredContracts.reduce((groups, contract) => {
    const groupKey = contract.customer_id || `customer-${contract.customer_name || contract.id}`;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.contracts.push(contract);
      existing.totalBalance += contract.balance_due || 0;
      existing.totalMonthly += contract.monthly_amount || 0;
      return groups;
    }

    groups.set(groupKey, {
      customerId: contract.customer_id,
      customerName: contract.customer_name || 'غير محدد',
      customerPhone: contract.customer_phone || null,
      contracts: [contract],
      totalBalance: contract.balance_due || 0,
      totalMonthly: contract.monthly_amount || 0,
    });

    return groups;
  }, new Map<string, {
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    contracts: typeof filteredContracts;
    totalBalance: number;
    totalMonthly: number;
  }>());
  const filteredContractGroupsList = Array.from(filteredContractGroups.values());
  const filteredContractIds = filteredContracts.map(contract => contract.id);
  const selectedFilteredContractIds = selectedBulkContractIds.filter(id => filteredContractIds.includes(id));
  const allFilteredContractsSelected =
    filteredContractIds.length > 0 && selectedFilteredContractIds.length === filteredContractIds.length;

  const selectedBulkContracts = contracts.filter(contract => selectedBulkContractIds.includes(contract.id));

  const toggleBulkContractSelection = (contractId: string) => {
    setSelectedBulkContractIds(prev =>
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const toggleAllFilteredContracts = () => {
    setSelectedBulkContractIds(prev => {
      if (allFilteredContractsSelected) {
        return prev.filter(id => !filteredContractIds.includes(id));
      }

      return Array.from(new Set([...prev, ...filteredContractIds]));
    });
  };

  const clearBulkSelection = () => {
    setSelectedBulkContractIds([]);
  };

  const bulkUnassignMutation = useMutation({
    mutationFn: async (contractIds: string[]) => {
      if (contractIds.length === 0) {
        throw new Error('No contracts selected');
      }

      const { error } = await supabase
        .from('contracts')
        .update({
          assigned_to_profile_id: null,
          assigned_at: null,
          assignment_notes: `تم إلغاء التعيين جماعياً بواسطة ${user?.email || 'المستخدم'}`,
        })
        .in('id', contractIds);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'تم إلغاء التعيين الجماعي',
        description: `تم إلغاء تعيين ${selectedBulkContractIds.length} عقود بنجاح`,
      });

      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts-details'] });
      queryClient.invalidateQueries({ queryKey: ['team-employees'] });
      queryClient.invalidateQueries({ queryKey: ['team-active-contract-stats'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts-bulk'] });
      queryClient.invalidateQueries({ queryKey: ['unassigned-contracts-smart'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-collections'] });

      clearBulkSelection();
      setShowBulkUnassignDialog(false);
    },
    onError: (error: unknown) => {
      toast({
        title: 'فشل إلغاء التعيين الجماعي',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء التعيين',
        variant: 'destructive',
      });
    },
  });

  const cancelContractMutation = useMutation({
    mutationFn: async ({
      contractId,
      reason,
    }: {
      contractId: string;
      reason: string;
    }) => {
      if (!workspaceProfile?.id || !companyId || !user?.id) {
        throw new Error('تعذر تحديد الموظف أو الشركة');
      }

      const employeeName = [workspaceProfile.first_name, workspaceProfile.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || user.email || 'موظف مساحة العمل';

      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, contract_number, customer_id, balance_due, status, assigned_to_profile_id')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .eq('assigned_to_profile_id', workspaceProfile.id)
        .single();

      if (contractError) throw contractError;
      if (!contract) {
        throw new Error('هذا العقد لم يعد مخصصًا لك');
      }
      if (contract.status !== 'active') {
        throw new Error('يمكن إلغاء العقود النشطة فقط من مساحة العمل');
      }

      const now = new Date().toISOString();
      const finalReason = reason.trim() || 'إلغاء من مساحة عمل الموظف';

      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          status: 'cancelled',
          suspension_reason: finalReason,
          assignment_notes: `تم إلغاء العقد من مساحة عمل الموظف بواسطة ${employeeName} (${user.email || user.id}) بتاريخ ${now}`,
          updated_at: now,
        })
        .eq('id', contractId)
        .eq('company_id', companyId)
        .eq('assigned_to_profile_id', workspaceProfile.id);

      if (updateError) throw updateError;

      const { data: managers, error: managersError } = await supabase
        .from('profiles')
        .select('id, user_id, role')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('role', ['super_admin', 'company_admin', 'manager', 'admin']);

      if (managersError) throw managersError;

      const managerNotifications = (managers || [])
        .filter((manager) => manager.user_id)
        .map((manager) => ({
          company_id: companyId,
          user_id: manager.user_id,
          title: 'تم إلغاء عقد من مساحة العمل',
          message: `قام ${employeeName} بإلغاء العقد ${contract.contract_number || contract.id}. الرصيد المستحق: ${formatCurrency(Number(contract.balance_due || 0))}. السبب: ${finalReason}`,
          notification_type: Number(contract.balance_due || 0) > 0 ? 'warning' : 'info',
          is_read: false,
          related_id: contract.id,
          related_type: 'contract_cancelled_by_employee',
          created_at: now,
        }));

      if (managerNotifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('user_notifications')
          .insert(managerNotifications);

        if (notificationError) throw notificationError;
      }

      return contract;
    },
    onSuccess: () => {
      toast({
        title: 'تم إلغاء العقد',
        description: 'تم إلغاء العقد وإرسال تنبيه للمدير، وسيختفي من مساحة العمل.',
      });

      setShowCancelContractDialog(false);
      setContractCancellationReason('');
      setSelectedContractId(undefined);

      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-signed-contract-documents'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-collections'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchContracts();
      refetchCollections();
      refetchPerformance();
    },
    onError: (error: unknown) => {
      toast({
        title: 'تعذر إلغاء العقد',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء العقد',
        variant: 'destructive',
      });
    },
  });

  const closeCompletedContractMutation = useMutation({
    mutationFn: async (contractId: string) => {
      if (!workspaceProfile?.id || !companyId || !user?.id) {
        throw new Error('تعذر تحديد الموظف أو الشركة');
      }

      const contract = contracts.find((item) => item.id === contractId);
      if (!contract) {
        throw new Error('العقد غير موجود في مساحة العمل الحالية');
      }

      const balanceDue = Number(contract.balance_due || 0);
      const hasSignedContract = signedContractIds.includes(contract.id);
      const hasOpenViolations = (contract.traffic_violation_count || 0) > 0;
      const hasPendingTasks = tasks.some((task) =>
        task.contract_id === contract.id && !['completed', 'cancelled'].includes(task.status)
      );

      if (contract.status !== 'active') {
        throw new Error('يمكن إغلاق العقود النشطة فقط');
      }
      if (balanceDue > 0) {
        throw new Error('لا يمكن إغلاق العقد قبل تصفية الرصيد المستحق');
      }
      if (hasOpenViolations) {
        throw new Error('لا يمكن إغلاق العقد قبل معالجة المخالفات المرورية المفتوحة');
      }
      if (!hasSignedContract) {
        throw new Error('لا يمكن إغلاق العقد قبل رفع نسخة العقد');
      }
      if (hasPendingTasks) {
        throw new Error('لا يمكن إغلاق العقد قبل إكمال المهام والمتابعات المفتوحة');
      }
      if (contract.vehicle_returned !== true) {
        throw new Error('لا يمكن إغلاق العقد قبل تأكيد رجوع المركبة');
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status: 'expired',
          assignment_notes: `تم إغلاق العقد المكتمل من مساحة الموظف بواسطة ${user.email || user.id} بتاريخ ${now}`,
          updated_at: now,
        })
        .eq('id', contractId)
        .eq('company_id', companyId)
        .eq('assigned_to_profile_id', workspaceProfile.id)
        .eq('status', 'active')
        .select('id, contract_number')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (contract) => {
      toast({
        title: 'تم إغلاق العقد المكتمل',
        description: `تم إغلاق العقد ${contract.contract_number || ''} وسيختفي من مساحة العمل.`,
      });

      queryClient.invalidateQueries({ queryKey: ['employee-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['employee-contracts-details'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-collections'] });
      refetchContracts();
      refetchCollections();
      refetchPerformance();
    },
    onError: (error: unknown) => {
      toast({
        title: 'تعذر إغلاق العقد',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء إغلاق العقد',
        variant: 'destructive',
      });
    },
  });

  const openNewContractWizard = (contract?: any) => {
    if (contract?.customer_id) {
      setPreselectedContractCustomerId(contract.customer_id);
    } else {
      setPreselectedContractCustomerId(undefined);
    }
    setShowContractWizard(true);
  };

  const handleContractWizardOpenChange = (open: boolean) => {
    setShowContractWizard(open);
    if (!open) {
      setPreselectedContractCustomerId(undefined);
      refetchContracts();
      refetchCollections();
      refetchPerformance();
    }
  };
  // Group invoices by customer for monthly collections
  const groupedCollections = useMemo(() => {
    const groups = new Map<string, {
      customer_id: string;
      customer_name: string;
      customer_phone?: string;
      total_amount: number;
      invoices: typeof collections;
    }>();

    collections.forEach(item => {
      if (!groups.has(item.customer_id)) {
        groups.set(item.customer_id, {
          customer_id: item.customer_id,
          customer_name: item.customer_name,
          customer_phone: undefined, // سنحصل عليه من العقد
          total_amount: 0,
          invoices: []
        });
      }

      const group = groups.get(item.customer_id)!;
      group.total_amount += item.amount - item.paid_amount;
      group.invoices.push(item);
    });

    return Array.from(groups.values()).sort((a, b) => b.total_amount - a.total_amount);
  }, [collections]);

  const toggleCustomerExpanded = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Get contract status styling
  const getContractStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return {
          badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          border: 'border-emerald-200',
          bg: 'bg-emerald-50/30',
          icon: PlayCircle,
          label: 'نشط'
        };
      case 'expired':
        return {
          badge: 'bg-red-100 text-red-700 border-red-200',
          border: 'border-red-200',
          bg: 'bg-red-50/30',
          icon: XCircle,
          label: 'منتهي'
        };
      case 'cancelled':
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
          border: 'border-gray-200',
          bg: 'bg-gray-50/30',
          icon: XCircle,
          label: 'ملغي'
        };
      case 'suspended':
        return {
          badge: 'bg-orange-100 text-orange-700 border-orange-200',
          border: 'border-orange-200',
          bg: 'bg-orange-50/30',
          icon: PauseCircle,
          label: 'موقوف'
        };
      case 'under_legal_procedure':
        return {
          badge: 'bg-purple-100 text-purple-700 border-purple-200',
          border: 'border-purple-200',
          bg: 'bg-purple-50/30',
          icon: Scale,
          label: 'تحت الإجراء القانوني'
        };
      case 'pending':
        return {
          badge: 'bg-amber-100 text-amber-700 border-amber-200',
          border: 'border-amber-200',
          bg: 'bg-amber-50/30',
          icon: Clock,
          label: 'معلق'
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-200',
          border: 'border-gray-200',
          bg: 'bg-gray-50/30',
          icon: FileText,
          label: status
        };
    }
  };

  return (
    <div className="min-h-dvh bg-[#F0F2F5] text-[#142033] overflow-y-auto" dir="rtl" style={{ WebkitOverflowScrolling: 'touch', height: '100dvh' }}>

      {/* --- Compact Header --- */}
      <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="flex h-14 items-center justify-between gap-3 sm:h-16">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#11A37F] to-[#0D876A] text-white shadow-sm sm:h-10 sm:w-10">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-black sm:text-lg">مساحة عملي</h1>
                <p className="hidden truncate text-xs text-[#6A7688] sm:block">
                  {user?.email?.split('@')[0]}
                </p>
              </div>
            </div>

            {/* Header Stats - Compact */}
            <div className="hidden items-center gap-4 md:flex">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#11A37F]" />
                <span className="font-bold text-[#6A7688]">{contractStats.activeContracts}</span>
                <span className="text-[#94A3B8]">عقد</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                <span className="font-bold text-[#6A7688]">{taskStats.todayTasks}</span>
                <span className="text-[#94A3B8]">مهمة</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
                <span className="font-bold text-[#6A7688]">{formatCurrency(collectionStats.totalPending)}</span>
                <span className="text-[#94A3B8]">مستحق</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoading}
                className="h-9 w-9 rounded-xl text-[#6A7688] hover:bg-[#F1F5F9] hover:text-[#142033]"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="h-9 w-9 rounded-xl text-[#6A7688] hover:bg-[#F1F5F9] hover:text-[#142033]"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-9 w-9 rounded-xl text-[#EF4444] hover:bg-[#FEF2F2] hover:text-[#DC2626]"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* --- Quick Actions Bar --- */}
      <div className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
          <div className="flex gap-2 overflow-x-auto py-2.5 scrollbar-hide sm:gap-3 sm:py-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 sm:px-5 sm:py-3 sm:text-sm",
                    action.className
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="whitespace-nowrap">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5 lg:px-6">

        {/* --- Daily Log Card --- */}
        <Card className={cn(
          "mb-4 overflow-hidden rounded-2xl border shadow-sm sm:mb-5",
          isDailyLogClosed ? "border-[#A7F3D0] bg-gradient-to-l from-[#ECFDF5] to-white" : "border-[#E2E8F0] bg-white"
        )}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12",
                  isDailyLogClosed ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#FEF3C7] text-[#D97706]"
                )}>
                  <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black sm:text-base">إقفال يوم العمل</h2>
                    <Badge className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-xs",
                      isDailyLogClosed
                        ? "bg-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5]"
                        : "bg-[#FEF3C7] text-[#D97706] hover:bg-[#FEF3C7]"
                    )}>
                      {isDailyLogClosed ? 'تم الإقفال' : 'بانتظار الإقفال'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-[#6A7688] sm:text-sm">
                    سجّل ملخص اليوم وقائمة التحقق اليومية
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden min-w-[140px] rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 sm:block">
                  <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-[#6A7688]">
                    <span>اكتمال القائمة</span>
                    <span>{checklistDoneCount}/{DAILY_LOG_CHECKLIST.length}</span>
                  </div>
                  <Progress value={checklistPercent} className="h-1.5" />
                </div>
                <Button
                  type="button"
                  onClick={() => setShowDailyLogDialog(true)}
                  size="sm"
                  className="h-10 rounded-xl bg-[#11A37F] px-4 text-xs font-bold text-white shadow-sm hover:bg-[#0D876A] sm:h-11 sm:px-5 sm:text-sm"
                >
                  <ClipboardCheck className="ml-1.5 h-4 w-4" />
                  {isDailyLogClosed ? 'عرض الإقفال' : 'إقفال اليوم'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Stats Cards --- */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:mb-5 sm:gap-4 lg:grid-cols-4">
          <Card className="group rounded-2xl border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#6A7688] sm:text-xs">العقود المخصصة</p>
                  <h3 className="mt-1 text-xl font-black text-[#142033] sm:text-2xl">{contractStats.totalContracts}</h3>
                  <p className="mt-1 text-[10px] font-bold text-[#11A37F] sm:text-xs">نشطة</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FA] text-[#1D4F7A] sm:h-12 sm:w-12">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#EEF4FA]">
                <div className="h-full rounded-full bg-[#1D4F7A] transition-all" style={{ width: `${Math.min(100, (contractStats.activeContracts / Math.max(1, contractStats.totalContracts)) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="group rounded-2xl border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#6A7688] sm:text-xs">المستحقات</p>
                  <h3 className="mt-1 break-words text-lg font-black text-[#142033] sm:text-2xl">{formatCurrency(collectionStats.totalPending)}</h3>
                  <p className="mt-1 text-[10px] font-bold text-[#D97706] sm:text-xs">هذا الشهر</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706] sm:h-12 sm:w-12">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#FEF3C7]">
                <div className="h-full rounded-full bg-[#D97706] transition-all" style={{ width: `${Math.min(100, collectionStats.collectionRate)}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="group rounded-2xl border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#6A7688] sm:text-xs">مهام اليوم</p>
                  <h3 className="mt-1 text-xl font-black text-[#142033] sm:text-2xl">{taskStats.todayTasks}</h3>
                  <p className="mt-1 text-[10px] font-bold text-[#11A37F] sm:text-xs">{taskStats.completionRate}% إنجاز</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D1FAE5] text-[#059669] sm:h-12 sm:w-12">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#D1FAE5]">
                <div className="h-full rounded-full bg-[#059669] transition-all" style={{ width: `${taskStats.completionRate}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="group rounded-2xl border-[#E2E8F0] bg-white shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[#6A7688] sm:text-xs">نقاط الأداء</p>
                  <h3 className="mt-1 text-xl font-black text-[#142033] sm:text-2xl">{performance ? Math.round(performance.performance_score) : 0}</h3>
                  <p className="mt-1 text-[10px] font-bold text-[#1D4F7A] sm:text-xs">{performanceGrade?.label_ar || 'جيد'}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FA] text-[#1D4F7A] sm:h-12 sm:w-12">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#EEF4FA]">
                <div className="h-full rounded-full bg-[#1D4F7A] transition-all" style={{ width: `${performance ? Math.min(100, performance.performance_score) : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-12 gap-4 sm:gap-5">

          {/* --- Main Content (Left) --- */}
          <div className="col-span-12 space-y-4 sm:space-y-5 lg:col-span-8">

          <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
            <div className="mb-3 -mx-1 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-sm sm:mx-0 sm:mb-4">
              <TabsList className="h-auto min-w-max bg-transparent p-0">
                <TabsTrigger value="overview" className="rounded-lg px-3 py-2 text-xs font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white sm:px-4 sm:py-2.5 sm:text-sm">نظرة عامة</TabsTrigger>
                <TabsTrigger value="collections" className="rounded-lg px-3 py-2 text-xs font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white sm:px-4 sm:py-2.5 sm:text-sm">التحصيل الشهري</TabsTrigger>
                <TabsTrigger value="contracts" className="rounded-lg px-3 py-2 text-xs font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white sm:px-4 sm:py-2.5 sm:text-sm">العقود ({contractStats.totalContracts})</TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-lg px-3 py-2 text-xs font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white sm:px-4 sm:py-2.5 sm:text-sm">المهام ({taskStats.totalTasks})</TabsTrigger>
              </TabsList>
            </div>

            {/* View: Overview */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              
              {/* Priority Section */}
              {priorityContracts.length > 0 && (
                <Card className="overflow-hidden rounded-2xl border-[#FDE68A] bg-gradient-to-l from-[#FFFBEB] to-white shadow-sm">
                  <CardHeader className="border-b border-[#FDE68A] bg-[#FFFBEB] pb-2.5 sm:pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-black text-[#92400E]">
                      <AlertCircle className="h-4 w-4" />
                      يحتاج اهتمامك الفوري
                      <Badge className="mr-auto bg-[#FDE68A] text-[#92400E] hover:bg-[#FDE68A]">{priorityContracts.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {priorityContracts.slice(0, 3).map((contract, idx) => (
                      <div
                        key={contract.id}
                        className="flex cursor-pointer items-center gap-3 border-b border-[#FDE68A]/50 p-3 transition-colors last:border-0 hover:bg-[#FFFBEB] sm:p-4"
                        onClick={() => navigate(`/contracts/${contract.contract_number || contract.id}`)}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FDE68A] text-xs font-black text-[#92400E] sm:h-10 sm:w-10">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-bold text-gray-900">{contract.customer_name}</h4>
                          <p className="text-xs text-gray-500">عقد #{contract.contract_number}</p>
                        </div>
                        <div className="shrink-0 text-left">
                          <Badge variant="outline" className="mb-1 border-[#FDE68A] bg-white text-[10px] text-[#92400E] sm:text-xs">
                            {contract.priority_reason_ar}
                          </Badge>
                          <p className="text-[10px] font-bold text-red-600 sm:text-xs">
                            {contract.priority_reason === 'overdue_payment' ? (
                              <>{formatCurrency(contract.balance_due)}</>
                            ) : (
                              <>متأخر {contract.days_overdue} يوم</>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Today's Tasks */}
              <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5] text-[#059669]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    مهام اليوم
                  </CardTitle>
                  <Badge variant="secondary" className="rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569]">
                    {todayTasks.length} مهام
                  </Badge>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {todayTasks.length > 0 ? (
                    <div className="space-y-2">
                      {todayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 transition-all",
                            task.status === 'completed'
                              ? "border-[#F1F5F9] bg-[#F8FAFC] opacity-60"
                              : "border-[#E2E8F0] bg-white hover:border-[#11A37F]/40 hover:shadow-sm"
                          )}
                        >
                          <div className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            task.status === 'completed' ? "bg-gray-300" : "bg-[#11A37F]"
                          )} />
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-sm font-medium",
                              task.status === 'completed' ? "text-gray-400 line-through" : "text-gray-900"
                            )}>
                              {task.title_ar || task.title}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
                                <Clock className="h-3 w-3" /> {task.scheduled_time || '09:00 ص'}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] text-gray-400 sm:text-xs">
                                <Briefcase className="h-3 w-3" /> {task.customer_name}
                              </span>
                            </div>
                          </div>
                          {task.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 shrink-0 rounded-lg border-[#E2E8F0] text-xs hover:border-[#11A37F]/30 hover:bg-[#ECFDF5] hover:text-[#059669]"
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={completingTaskId === task.id}
                            >
                              {completingTaskId === task.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                'إنجاز'
                              )}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-8 text-center">
                      <CheckCircle className="mx-auto mb-2 h-8 w-8 text-[#D1FAE5]" />
                      <p className="text-sm text-gray-400">لا توجد مهام مجدولة لهذا اليوم</p>
                      <Button variant="link" className="mt-1 text-xs text-[#11A37F]" onClick={() => setShowFollowupDialog(true)}>
                        + إضافة مهمة جديدة
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* View: Monthly Collections */}
            <TabsContent value="collections" className="space-y-4 mt-0 sm:space-y-5">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] font-bold text-[#6A7688] sm:text-xs">المستهدف</p>
                    <h3 className="mt-1 text-sm font-black text-[#142033] sm:text-xl">{formatCurrency(collectionStats.totalDue)}</h3>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-[#A7F3D0] bg-gradient-to-l from-[#ECFDF5] to-white shadow-sm">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] font-bold text-[#059669] sm:text-xs">تم تحصيله</p>
                    <h3 className="mt-1 text-sm font-black text-[#059669] sm:text-xl">{formatCurrency(collectionStats.totalCollected)}</h3>
                    <Progress value={collectionStats.collectionRate} className="mt-2 h-1 bg-[#D1FAE5]" />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-[#FDE68A] bg-gradient-to-l from-[#FFFBEB] to-white shadow-sm">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] font-bold text-[#D97706] sm:text-xs">المتبقي</p>
                    <h3 className="mt-1 text-sm font-black text-[#D97706] sm:text-xl">{formatCurrency(collectionStats.totalPending)}</h3>
                  </CardContent>
                </Card>
              </div>

              {/* Collections List - Grouped by Customer */}
              <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
                <CardHeader className="border-b border-[#F1F5F9] pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D1FAE5] text-[#059669]">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      قائمة التحصيل الشهري
                    </CardTitle>
                    <Badge className="rounded-full bg-[#EEF4FA] text-xs font-bold text-[#1D4F7A] hover:bg-[#EEF4FA]">
                      {groupedCollections.length} عميل
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {groupedCollections.length > 0 ? (
                    <div className="space-y-2.5">
                      {groupedCollections.map((group) => {
                        const isExpanded = expandedCustomers.has(group.customer_id);

                        return (
                          <div
                            key={group.customer_id}
                            className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition-all hover:border-[#11A37F]/40 hover:shadow-sm"
                          >
                            {/* Customer Header */}
                            <div className="flex items-center gap-3 p-3 sm:p-4">
                              <Avatar
                                className="h-10 w-10 shrink-0 cursor-pointer border-2 border-[#D1FAE5] shadow-sm transition-all hover:border-[#11A37F] sm:h-11 sm:w-11"
                                onClick={() => {
                                  const firstInvoice = group.invoices[0];
                                  if (firstInvoice?.contract_number) {
                                    navigate(`/contracts/${firstInvoice.contract_number}`);
                                  }
                                }}
                              >
                                <AvatarFallback className="bg-gradient-to-br from-[#11A37F] to-[#0D876A] text-sm font-bold text-white">
                                  {group.customer_name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <h4
                                  className="cursor-pointer truncate text-sm font-bold text-gray-900 transition-colors hover:text-[#11A37F] sm:text-base"
                                  onClick={() => {
                                    const firstInvoice = group.invoices[0];
                                    if (firstInvoice?.contract_number) {
                                      navigate(`/contracts/${firstInvoice.contract_number}`);
                                    }
                                  }}
                                >
                                  {group.customer_name}
                                </h4>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-500 sm:text-xs">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    {group.invoices.length} فاتورة
                                  </span>
                                  <span className="flex items-center gap-1 font-bold text-[#D97706]">
                                    <DollarSign className="h-3 w-3" />
                                    {formatCurrency(group.total_amount)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-9 rounded-lg bg-[#11A37F] px-3 text-xs font-bold text-white hover:bg-[#0D876A] sm:px-4"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const relatedContract = contracts.find((contract) => contract.customer_id === group.customer_id);
                                    setSelectedPaymentCustomer({
                                      customerId: group.customer_id,
                                      customerName: group.customer_name,
                                      customerPhone: relatedContract?.customer_phone || group.customer_phone || null,
                                    });
                                    setSelectedContractId(relatedContract?.id);
                                    setShowPaymentDialog(true);
                                  }}
                                >
                                  <DollarSign className="ml-1 h-3.5 w-3.5" />
                                  تسجيل دفعة
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 w-9 rounded-lg p-0 text-gray-400 hover:bg-[#F1F5F9] hover:text-gray-600"
                                  onClick={() => toggleCustomerExpanded(group.customer_id)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Invoices List (Expandable) */}
                            {isExpanded && (
                              <div className="border-t border-[#F1F5F9] bg-[#F8FAFC]">
                                <div className="space-y-2 p-3">
                                  {group.invoices.map((invoice) => (
                                    <div
                                      key={invoice.invoice_id}
                                      className="group/invoice flex cursor-pointer items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 transition-all hover:border-[#11A37F]/40 hover:shadow-sm"
                                      onClick={() => navigate(`/contracts/${invoice.contract_number}`)}
                                    >
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#D97706] transition-colors group-hover/invoice:bg-[#D1FAE5] group-hover/invoice:text-[#059669]">
                                        <FileText className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-gray-900 group-hover/invoice:text-[#11A37F]">
                                          فاتورة #{invoice.invoice_number}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          عقد #{invoice.contract_number}
                                        </p>
                                      </div>
                                      <div className="shrink-0 text-left">
                                        <p className="text-sm font-bold text-gray-900">
                                          {formatCurrency(invoice.amount - invoice.paid_amount)}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                          {new Date(invoice.due_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                        </p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "shrink-0 text-[10px] sm:text-xs",
                                          invoice.status === 'overdue'
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
                                        )}
                                      >
                                        {invoice.status === 'overdue' ? 'متأخر' : 'مستحق'}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#D1FAE5]">
                        <DollarSign className="h-8 w-8 text-[#059669]" />
                      </div>
                      <p className="text-sm font-bold text-gray-400">لا توجد مستحقات لهذا الشهر</p>
                      <p className="mt-1 text-xs text-gray-300">جميع الفواتير مدفوعة</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* View: Contracts */}
            <TabsContent value="contracts" className="mt-0">
              <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
                <CardHeader className="border-b border-[#F1F5F9] pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FA] text-[#1D4F7A]">
                        <FileText className="h-4 w-4" />
                      </div>
                      سجل العقود
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="بحث برقم العقد أو الاسم..."
                        className="h-10 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] pr-9 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pt-2 scrollbar-hide sm:gap-2">
                    {([
                      { key: 'all', label: 'الكل', count: contractWorkSummary.all },
                      { key: 'collection', label: 'تحصيل', count: contractWorkSummary.collection },
                      { key: 'operational', label: 'تشغيل', count: contractWorkSummary.operational },
                      { key: 'needs_completion', label: 'استكمال', count: contractWorkSummary.needs_completion },
                      { key: 'ready_to_close', label: 'إغلاق', count: contractWorkSummary.ready_to_close },
                    ] as Array<{ key: ContractWorkFilter; label: string; count: number }>).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setContractWorkFilter(item.key)}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all",
                          contractWorkFilter === item.key
                            ? "bg-[#142033] text-white shadow-sm"
                            : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]",
                        )}
                      >
                        <span>{item.label}</span>
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px]",
                          contractWorkFilter === item.key
                            ? "bg-white/20 text-white"
                            : "bg-white text-[#1D4F7A]",
                        )}>
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>
                  {canUnassignContracts && filteredContracts.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-xl border border-red-100 bg-red-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={allFilteredContractsSelected}
                          onCheckedChange={toggleAllFilteredContracts}
                          aria-label="تحديد كل العقود الظاهرة"
                        />
                        <div>
                          <p className="text-sm font-black text-red-900">تحديد العقود لإلغاء التعيين الجماعي</p>
                          <p className="text-xs text-red-700/75">
                            {selectedBulkContractIds.length > 0
                              ? `${selectedBulkContractIds.length} عقود محددة`
                              : 'اختر عقداً أو أكثر ثم ألغ التعيين'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedBulkContractIds.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearBulkSelection}
                          >
                            مسح التحديد
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="gap-2 rounded-lg"
                          disabled={selectedBulkContractIds.length === 0}
                          onClick={() => setShowBulkUnassignDialog(true)}
                        >
                          <XCircle className="h-4 w-4" />
                          إلغاء تعيين المحدد
                        </Button>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    {filteredContractGroupsList.length > 0 ? filteredContractGroupsList.map((customerGroup) => (
                      <section
                        key={customerGroup.customerId}
                        className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]"
                      >
                        <header className="flex items-center gap-3 border-b border-[#E2E8F0] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
                          <Avatar className="h-9 w-9 shrink-0 border border-[#E2E8F0] bg-[#F4F8FB] sm:h-10 sm:w-10">
                            <AvatarFallback className="bg-[#EEF5FB] text-sm font-black text-[#173A63]">
                              {customerGroup.customerName?.[0] || 'ع'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <h4 className="truncate text-sm font-black text-[#142033] sm:text-base">
                              {customerGroup.customerName}
                            </h4>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-semibold text-[#6A7688] sm:text-xs">
                              <span>{customerGroup.contracts.length} عقد</span>
                              {customerGroup.customerPhone && <span dir="ltr">{customerGroup.customerPhone}</span>}
                              <span className="text-[#D97706]" dir="ltr">
                                {formatCurrency(customerGroup.totalBalance)}
                              </span>
                            </div>
                          </div>
                          {customerGroup.totalBalance > 0 ? (
                            <Button
                              size="sm"
                              className="h-8 shrink-0 rounded-lg bg-[#11A37F] px-3 text-xs font-bold text-white hover:bg-[#0D876A] sm:px-4"
                              onClick={() => {
                                const firstDueContract = customerGroup.contracts.find((contract) => (contract.balance_due || 0) > 0);
                                setSelectedPaymentCustomer({
                                  customerId: customerGroup.customerId,
                                  customerName: customerGroup.customerName,
                                  customerPhone: customerGroup.customerPhone,
                                });
                                setSelectedContractId(firstDueContract?.id);
                                setShowPaymentDialog(true);
                              }}
                            >
                              <DollarSign className="ml-1 h-3.5 w-3.5" />
                              دفعة
                            </Button>
                          ) : (
                            <Badge className="h-7 shrink-0 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 text-[10px] font-bold text-[#059669] hover:bg-[#ECFDF5] sm:text-xs">
                              مدفوع بالكامل
                            </Badge>
                          )}
                        </header>

                        <div className="space-y-2.5 p-2.5 sm:p-3">
                          {customerGroup.contracts.map((contract) => {
                            const statusStyle = getContractStatusStyle(contract.status);
                            const StatusIcon = statusStyle.icon;
                            const hasSignedContract = signedContractIds.includes(contract.id);
                            const workStatus = getContractWorkStatus(contract);
                            const canCloseCompletedContract = workStatus === 'ready_to_close';

                            return (
                              <div
                                key={contract.id}
                                className="group relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-white transition-all hover:border-[#11A37F]/40 hover:shadow-md"
                              >
                                <div className={cn(
                                  "absolute inset-y-0 right-0 w-1",
                                  statusStyle.badge.split(' ')[0].replace('-100', '-500'),
                                )} />

                                {/* Contract Info */}
                                <div className="p-3 pr-4 sm:p-4 sm:pr-5">
                                  <div className="flex items-start gap-3">
                                    {canUnassignContracts && (
                                      <div
                                        className="pt-1"
                                        onClick={(event) => event.stopPropagation()}
                                      >
                                        <Checkbox
                                          checked={selectedBulkContractIds.includes(contract.id)}
                                          onCheckedChange={() => toggleBulkContractSelection(contract.id)}
                                          aria-label={`تحديد العقد ${contract.contract_number || contract.id}`}
                                        />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/contracts/${contract.contract_number || contract.id}`)}>
                                      {/* Title & Badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <h4 className="text-sm font-black text-[#142033] transition-colors group-hover:text-[#11A37F] sm:text-base">
                                          عقد {contract.contract_number || 'بدون رقم'}
                                        </h4>
                                        <Badge
                                          variant="outline"
                                          className={cn("h-5 gap-1 border px-1.5 text-[10px] font-bold sm:h-6 sm:px-2 sm:text-[11px]", statusStyle.badge)}
                                        >
                                          <StatusIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                          {statusStyle.label}
                                        </Badge>
                                        {hasSignedContract ? (
                                          <Badge className="h-5 gap-1 border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 text-[10px] text-[#059669] hover:bg-[#ECFDF5] sm:h-6 sm:px-2 sm:text-[11px]">
                                            <FileCheck2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            موثق
                                          </Badge>
                                        ) : workspaceProfile?.id
                                          && !isSignedContractStatusLoading
                                          && !hasSignedContractStatusError ? (
                                          <Badge
                                            variant="outline"
                                            className="h-5 gap-1 border-[#FCA5A5] bg-[#FEF2F2] px-1.5 text-[10px] text-[#DC2626] sm:h-6 sm:px-2 sm:text-[11px]"
                                          >
                                            <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            نسخة ناقصة
                                          </Badge>
                                        ) : null}
                                        {(contract.traffic_violation_count || 0) > 0 ? (
                                          <Badge
                                            variant="outline"
                                            className="h-5 gap-1 border-[#FDBA74] bg-[#FFF7ED] px-1.5 text-[10px] text-[#EA580C] sm:h-6 sm:px-2 sm:text-[11px]"
                                          >
                                            <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            {contract.traffic_violation_count} مخالفات
                                          </Badge>
                                        ) : null}
                                        {workStatus === 'operational' ? (
                                          <Badge className="h-5 gap-1 border border-[#BFDBFE] bg-[#EFF6FF] px-1.5 text-[10px] text-[#1D4ED8] hover:bg-[#EFF6FF] sm:h-6 sm:px-2 sm:text-[11px]">
                                            <PlayCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            تشغيل
                                          </Badge>
                                        ) : null}
                                        {workStatus === 'needs_completion' ? (
                                          <Badge
                                            variant="outline"
                                            className="h-5 gap-1 border-[#FDE68A] bg-[#FFFBEB] px-1.5 text-[10px] text-[#92400E] sm:h-6 sm:px-2 sm:text-[11px]"
                                          >
                                            <AlertCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            استكمال
                                          </Badge>
                                        ) : null}
                                        {workStatus === 'ready_to_close' ? (
                                          <Badge className="h-5 gap-1 border border-[#A7F3D0] bg-[#ECFDF5] px-1.5 text-[10px] text-[#059669] hover:bg-[#ECFDF5] sm:h-6 sm:px-2 sm:text-[11px]">
                                            <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                            إغلاق
                                          </Badge>
                                        ) : null}
                                      </div>

                                      {/* Contract Details */}
                                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-[#6A7688] sm:text-xs">
                                        <span className="flex items-center gap-1 font-bold text-[#40516A]">
                                          <Car className="h-3 w-3 text-[#8A9AAF]" />
                                          {[
                                            contract.vehicle_make,
                                            contract.vehicle_model,
                                            contract.vehicle_plate ? `${contract.vehicle_plate}` : null,
                                          ].filter(Boolean).join(' ') || 'مركبة غير محددة'}
                                        </span>
                                        {contract.customer_phone && (
                                          <span className="flex items-center gap-1" dir="ltr">
                                            <Phone className="h-3 w-3 text-[#8A9AAF]" />
                                            {contract.customer_phone}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Balance */}
                                    <div className="shrink-0 text-left">
                                      <p className="text-[10px] font-bold text-[#7B8798]">
                                        {(contract.balance_due || 0) > 0 ? 'المستحق' : 'الحالة'}
                                      </p>
                                      <p
                                        className={cn(
                                          "mt-0.5 text-sm font-black sm:text-base",
                                          (contract.balance_due || 0) > 0 ? "text-[#D97706]" : "text-[#059669]",
                                        )}
                                        dir={(contract.balance_due || 0) > 0 ? 'ltr' : undefined}
                                      >
                                        {(contract.balance_due || 0) > 0
                                          ? formatCurrency(contract.balance_due || 0)
                                          : 'مدفوع'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-1.5 border-t border-[#F1F5F9] bg-[#F8FAFC] px-3 py-2.5 sm:gap-2 sm:px-4">
                                  {contract.status === 'active' && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-lg border-[#E2E8F0] bg-white px-2.5 text-[10px] font-bold text-[#173A63] hover:bg-[#EEF5FB] sm:h-9 sm:px-3 sm:text-xs"
                                      onClick={() => {
                                        setSelectedContractId(contract.id);
                                        setShowNoteDialog(true);
                                      }}
                                    >
                                      <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      ملاحظة
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant={hasSignedContract ? 'outline' : 'default'}
                                    className={cn(
                                      'h-8 gap-1 rounded-lg px-2.5 text-[10px] font-bold sm:h-9 sm:px-3 sm:text-xs',
                                      hasSignedContract
                                        ? 'border-[#E2E8F0] bg-white text-[#173A63] hover:bg-[#EEF5FB]'
                                        : 'bg-[#11A37F] text-white hover:bg-[#0D876A]',
                                    )}
                                    onClick={() => setSignedScanContract({
                                      id: contract.id,
                                      contractNumber: contract.contract_number || contract.id,
                                    })}
                                  >
                                    <ScanLine className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                    {hasSignedContract ? 'نسخة' : 'تصوير'}
                                  </Button>

                                  {contract.status === 'active' && (contract.balance_due || 0) > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-lg border-[#A7F3D0] bg-white px-2.5 text-[10px] font-bold text-[#059669] hover:bg-[#ECFDF5] sm:h-9 sm:px-3 sm:text-xs"
                                      onClick={() => {
                                        setSelectedPaymentCustomer({
                                          customerId: contract.customer_id,
                                          customerName: contract.customer_name || 'غير محدد',
                                          customerPhone: contract.customer_phone || null,
                                        });
                                        setSelectedContractId(contract.id);
                                        setShowPaymentDialog(true);
                                      }}
                                    >
                                      <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      دفعة
                                    </Button>
                                  )}

                                  {canCloseCompletedContract && (
                                    <Button
                                      size="sm"
                                      className="h-8 gap-1 rounded-lg bg-[#11A37F] px-2.5 text-[10px] font-bold text-white hover:bg-[#0D876A] sm:h-9 sm:px-3 sm:text-xs"
                                      disabled={closeCompletedContractMutation.isPending}
                                      onClick={() => closeCompletedContractMutation.mutate(contract.id)}
                                    >
                                      {closeCompletedContractMutation.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      )}
                                      إغلاق
                                    </Button>
                                  )}

                                  {contract.status === 'active' && (contract.balance_due || 0) > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-lg border-[#E2E8F0] bg-white px-2.5 text-[10px] font-bold text-[#173A63] hover:bg-[#EEF5FB] sm:h-9 sm:px-3 sm:text-xs"
                                      onClick={() => {
                                        setSelectedContractId(contract.id);
                                        setShowConvertToLegalDialog(true);
                                      }}
                                    >
                                      <Scale className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      قانونية
                                    </Button>
                                  )}

                                  {contract.customer_phone && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-lg border-[#E2E8F0] bg-white px-2.5 text-[10px] font-bold text-[#173A63] hover:bg-[#EEF5FB] sm:h-9 sm:px-3 sm:text-xs"
                                      onClick={() => {
                                        setSelectedContractId(contract.id);
                                        setShowCallDialog(true);
                                      }}
                                    >
                                      <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      اتصال
                                    </Button>
                                  )}

                                  {contract.status === 'active' && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1 rounded-lg border-[#E2E8F0] bg-white px-2.5 text-[10px] font-bold text-[#40516A] hover:bg-[#F1F5F9] sm:h-9 sm:px-3 sm:text-xs"
                                        onClick={() => {
                                          setSelectedContractId(contract.id);
                                          setShowFollowupDialog(true);
                                        }}
                                      >
                                        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        متابعة
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1 rounded-lg border-red-200 bg-white px-2.5 text-[10px] font-bold text-red-600 hover:bg-red-50 sm:h-9 sm:px-3 sm:text-xs"
                                        onClick={() => {
                                          setSelectedContractId(contract.id);
                                          setContractCancellationReason('');
                                          setShowCancelContractDialog(true);
                                        }}
                                      >
                                        <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        إلغاء
                                      </Button>
                                      {(contract.traffic_violation_count || 0) > 0 && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 gap-1 rounded-lg border-[#FDE68A] bg-white px-2.5 text-[10px] font-bold text-[#92400E] hover:bg-[#FFFBEB] sm:h-9 sm:px-3 sm:text-xs"
                                          disabled={createContractDocument.isPending}
                                          onClick={() => {
                                            setViolationProofContract({
                                              id: contract.id,
                                              contractNumber: contract.contract_number || contract.id,
                                            });
                                            violationProofInputRef.current?.click();
                                          }}
                                        >
                                          {createContractDocument.isPending && violationProofContract?.id === contract.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" />
                                          ) : (
                                            <Upload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                          )}
                                          مخالفات
                                        </Button>
                                      )}
                                    </>
                                  )}

                                  {canUnassignContracts && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 rounded-lg border-red-200 bg-white px-2.5 text-[10px] font-bold text-red-600 hover:bg-red-50 sm:h-9 sm:px-3 sm:text-xs"
                                      onClick={() => {
                                        setSelectedContractId(contract.id);
                                        setShowUnassignDialog(true);
                                      }}
                                    >
                                      <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                      إلغاء تعيين
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )) : (
                      <div className="py-12 text-center">
                        <FileText className="mx-auto mb-3 h-12 w-12 text-[#E2E8F0]" />
                        <p className="text-sm text-gray-400">لا توجد عقود مطابقة للبحث</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* View: Tasks */}
            <TabsContent value="tasks" className="mt-0">
              <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
                <CardHeader className="border-b border-[#F1F5F9] pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base font-black sm:text-lg">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FA] text-[#1D4F7A]">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        جميع المهام
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">عرض وإدارة جميع المهام المجدولة والسابقة</CardDescription>
                    </div>
                    <Badge className="rounded-full bg-[#F1F5F9] text-xs font-bold text-[#475569] hover:bg-[#F1F5F9]">
                      {tasks.length} مهمة
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3 transition-all",
                          task.status === 'completed'
                            ? "border-[#F1F5F9] bg-[#F8FAFC] opacity-60"
                            : "border-[#E2E8F0] bg-white hover:border-[#11A37F]/40 hover:shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          task.status === 'completed' ? "bg-gray-300" : "bg-[#11A37F]"
                        )} />
                        <div className="min-w-0 flex-1">
                          <p className={cn(
                            "text-sm font-medium",
                            task.status === 'completed' ? "text-gray-400 line-through" : "text-gray-900"
                          )}>
                            {task.title_ar || task.title}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-gray-400 sm:text-xs">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {task.scheduled_date}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {task.scheduled_time}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Badge
                            variant={task.status === 'completed' ? 'secondary' : 'outline'}
                            className={cn(
                              "text-[10px] sm:text-xs",
                              task.status === 'completed'
                                ? "bg-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5]"
                                : "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]"
                            )}
                          >
                            {task.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                          </Badge>
                          {task.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg border-[#E2E8F0] text-[10px] hover:border-[#11A37F]/30 hover:bg-[#ECFDF5] hover:text-[#059669] sm:text-xs"
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={completingTaskId === task.id}
                            >
                              {completingTaskId === task.id ? (
                                <Loader2 className="h-3 w-3 animate-spin sm:h-3.5 sm:w-3.5" />
                              ) : (
                                'إنجاز'
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>

        {/* --- Sidebar (Right) --- */}
        <div className="col-span-12 space-y-4 sm:space-y-5 lg:col-span-4">

          {/* Verification Tasks */}
          <VerificationTasksList limit={5} />

          {/* Performance Detailed */}
          <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
            <CardHeader className="border-b border-[#F1F5F9] pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-black">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF4FA] text-[#1D4F7A]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                تحليل الأداء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Performance Score Circle */}
              <div className="flex items-center justify-center py-2">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#E2E8F0" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={(performance?.performance_score ?? 0) >= 80 ? '#059669' : (performance?.performance_score ?? 0) >= 60 ? '#D97706' : '#DC2626'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(performance?.performance_score || 0) * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-[#142033]">{performance ? Math.round(performance.performance_score) : 0}</span>
                    <span className="text-[10px] font-bold text-[#6A7688]">نقطة</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#6A7688]">نسبة التحصيل</span>
                    <span className="font-black text-[#142033]">{performance ? Math.round(performance.collection_rate) : 0}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-[#11A37F] to-[#059669] transition-all"
                      style={{ width: `${performance?.collection_rate || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-[#6A7688]">إنجاز المهام</span>
                    <span className="font-black text-[#142033]">{performance ? Math.round(performance.followup_completion_rate) : 0}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-[#3B82F6] to-[#1D4ED8] transition-all"
                      style={{ width: `${performance?.followup_completion_rate || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#F8FAFC] p-3">
                <p className="text-xs leading-relaxed text-[#6A7688]">
                  أداؤك هذا الشهر {performanceGrade?.label_ar === 'ممتاز' ? 'رائع!' : 'جيد.'} استمر في متابعة العملاء المتأخرين لتحسين نسبة التحصيل لديك.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Export Report */}
          <Card className="rounded-2xl border-[#E2E8F0] bg-white shadow-sm">
            <CardContent className="p-4">
              <ExportButton
                onExportExcel={async () => {
                  try {
                    await exportEmployeeWorkspaceReport({
                      employeeName: user?.email?.split('@')[0] || 'موظف',
                      contracts,
                      tasks: reportTasks,
                      performance: reportPerformance,
                      performanceGrade: reportPerformanceGrade,
                      collections,
                      stats: {
                        contractStats,
                        taskStats,
                        collectionStats
                      }
                    });
                    toast({
                      title: 'تم التصدير بنجاح',
                      description: 'تم تصدير التقرير الشامل إلى Excel',
                    });
                  } catch (error) {
                    console.error('Export error:', error);
                    toast({
                      title: 'خطأ في التصدير',
                      description: error instanceof Error ? error.message : 'فشل تصدير التقرير',
                      variant: 'destructive',
                    });
                  }
                }}
                label="تصدير تقرير شامل (Excel)"
                variant="outline"
                className="h-10 w-full justify-center rounded-xl border-[#E2E8F0] text-xs font-bold text-[#173A63] hover:bg-[#EEF5FB] hover:text-[#173A63]"
              />
            </CardContent>
          </Card>

        </div>
        </div>
      </div>

      {/* --- Dialogs --- */}
      <Dialog open={showDailyLogDialog} onOpenChange={setShowDailyLogDialog}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#142033]">
              <ClipboardCheck className="h-5 w-5 text-[#11A37F]" />
              إقفال يوم العمل
            </DialogTitle>
            <DialogDescription>
              سجّل ملخص اليوم، قائمة التحقق، وأي عوائق أو حالات تحتاج مراجعة قبل نهاية الدوام.
            </DialogDescription>
          </DialogHeader>

          {dailyLogForm && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-log-date">التاريخ</Label>
                  <Input
                    id="daily-log-date"
                    type="date"
                    value={dailyLogForm.logDate}
                    onChange={(event) => updateDailyLogField('logDate', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-employee">اسم الموظف</Label>
                  <Input
                    id="daily-log-employee"
                    value={dailyLogForm.employeeName}
                    onChange={(event) => updateDailyLogField('employeeName', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-team">الفريق</Label>
                  <Input
                    id="daily-log-team"
                    value={dailyLogForm.team}
                    onChange={(event) => updateDailyLogField('team', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-department">القسم</Label>
                  <Input
                    id="daily-log-department"
                    value={dailyLogForm.department}
                    onChange={(event) => updateDailyLogField('department', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-start">وقت البداية</Label>
                  <Input
                    id="daily-log-start"
                    type="time"
                    value={dailyLogForm.startTime}
                    onChange={(event) => updateDailyLogField('startTime', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-end">وقت النهاية</Label>
                  <Input
                    id="daily-log-end"
                    type="time"
                    value={dailyLogForm.endTime}
                    onChange={(event) => updateDailyLogField('endTime', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>حالة اليوم</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={dailyLogForm.status === 'completed' ? 'default' : 'outline'}
                      className={cn(
                        "rounded-lg font-bold",
                        dailyLogForm.status === 'completed' && "bg-[#11A37F] text-white hover:bg-[#0D876A]"
                      )}
                      onClick={() => updateDailyLogField('status', 'completed')}
                    >
                      مكتمل
                    </Button>
                    <Button
                      type="button"
                      variant={dailyLogForm.status === 'incomplete' ? 'default' : 'outline'}
                      className={cn(
                        "rounded-lg font-bold",
                        dailyLogForm.status === 'incomplete' && "bg-[#9A5B00] text-white hover:bg-[#7A4800]"
                      )}
                      onClick={() => updateDailyLogField('status', 'incomplete')}
                    >
                      غير مكتمل
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>تحويلات قانونية اليوم</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={dailyLogForm.legalReferrals === 'no' ? 'default' : 'outline'}
                      className={cn(
                        "rounded-lg font-bold",
                        dailyLogForm.legalReferrals === 'no' && "bg-[#1D4F7A] text-white hover:bg-[#163F62]"
                      )}
                      onClick={() => updateDailyLogField('legalReferrals', 'no')}
                    >
                      لا
                    </Button>
                    <Button
                      type="button"
                      variant={dailyLogForm.legalReferrals === 'yes' ? 'default' : 'outline'}
                      className={cn(
                        "rounded-lg font-bold",
                        dailyLogForm.legalReferrals === 'yes' && "bg-[#11A37F] text-white hover:bg-[#0D876A]"
                      )}
                      onClick={() => updateDailyLogField('legalReferrals', 'yes')}
                    >
                      نعم
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-[#DDE5EF] bg-white p-4">
                  <h3 className="mb-3 text-sm font-black text-[#142033]">مؤشرات بداية اليوم</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="daily-log-contracts">العقود المسندة</Label>
                      <Input
                        id="daily-log-contracts"
                        type="number"
                        value={dailyLogForm.assignedContracts}
                        onChange={(event) => updateDailyLogField('assignedContracts', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daily-log-due">إجمالي المستحق</Label>
                      <Input
                        id="daily-log-due"
                        type="number"
                        value={dailyLogForm.totalDue}
                        onChange={(event) => updateDailyLogField('totalDue', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daily-log-priority">حالات أولوية</Label>
                      <Input
                        id="daily-log-priority"
                        type="number"
                        value={dailyLogForm.priorityCases}
                        onChange={(event) => updateDailyLogField('priorityCases', event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#DDE5EF] bg-white p-4">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-sm font-black text-[#142033]">نتائج مختصرة</h3>
                    <span className="text-xs font-bold text-[#6A7688]">تُحتسب تلقائيًا من نشاط اليوم داخل النظام</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      ['callsLogged', 'المكالمات'],
                      ['answeredCalls', 'تم الرد'],
                      ['noAnswerCalls', 'لا رد'],
                      ['paymentPromises', 'وعود الدفع'],
                      ['paymentsRegistered', 'دفعات'],
                      ['totalCollected', 'المحصل'],
                      ['followupsScheduled', 'متابعات'],
                      ['notesAdded', 'ملاحظات'],
                      ['completedTasks', 'مهام منجزة'],
                      ['delayedTasks', 'مهام مؤجلة'],
                    ].map(([field, label]) => {
                      const fieldKey = field as keyof DailyLogFormState;
                      const isAutoField = AUTO_DAILY_RESULT_FIELDS.has(fieldKey);
                      return (
                        <div key={field} className="space-y-2">
                          <Label htmlFor={`daily-log-${field}`}>{label}</Label>
                          <Input
                            id={`daily-log-${field}`}
                            type="number"
                            readOnly={isAutoField}
                            value={dailyLogForm[fieldKey] as string}
                            onChange={(event) => updateDailyLogField(fieldKey, event.target.value as never)}
                            className={cn(isAutoField && "bg-[#F8FAFC] font-black text-[#142033]")}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#DDE5EF] bg-white p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-[#142033]">
                      <Edit3 className="h-4 w-4 text-[#1D4F7A]" />
                      نشاط العقود والملفات خلال اليوم
                    </h3>
                    <p className="mt-1 text-xs text-[#6A7688]">
                      يتم احتسابه تلقائيًا من تعديلات العقود، الدفعات، وتحديثات المستندات التي نفذها الموظف.
                    </p>
                  </div>
                  <Badge className="bg-[#EEF4FA] text-[#1D4F7A] hover:bg-[#EEF4FA]">
                    {dailyContractActivity.items.length} عملية
                  </Badge>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-5">
                  {[
                    ['تعديلات العقود', dailyContractActivity.contractUpdates],
                    ['تغيير الحالة', dailyContractActivity.statusChanges],
                    ['دفعات مسجلة', dailyContractActivity.paymentsRegistered],
                    ['مستندات مضافة', dailyContractActivity.documentsAdded],
                    ['مبلغ الدفعات', formatCurrency(dailyContractActivity.totalPaymentAmount)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-[#EEF2F6] bg-[#F8FAFC] p-3">
                      <p className="text-xs font-bold text-[#6A7688]">{label}</p>
                      <p className="mt-1 text-sm font-black text-[#142033]">{value}</p>
                    </div>
                  ))}
                </div>

                {dailyContractActivity.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#DDE5EF] bg-[#F8FAFC] p-4 text-center text-sm text-[#6A7688]">
                    لا توجد تعديلات عقود أو دفعات أو مستندات مسجلة لهذا الموظف اليوم.
                  </div>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-auto pr-1">
                    {dailyContractActivity.items.slice(0, 12).map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-2 rounded-lg border border-[#EEF2F6] bg-[#FBFCFE] p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-md bg-white text-[#1D4F7A]">
                              {item.label}
                            </Badge>
                            {item.contractNumber && (
                              <span className="text-xs font-black text-[#142033]">{item.contractNumber}</span>
                            )}
                            {item.occurredAt && (
                              <span className="text-xs text-[#8A96A8]">{formatActivityTime(item.occurredAt)}</span>
                            )}
                          </div>
                          <p className="mt-1 truncate text-sm font-bold text-[#142033]">{item.detail}</p>
                        </div>
                        {item.amount ? (
                          <span className="text-sm font-black text-[#0D876A]">{formatCurrency(item.amount)}</span>
                        ) : null}
                      </div>
                    ))}
                    {dailyContractActivity.items.length > 12 && (
                      <p className="text-center text-xs font-bold text-[#6A7688]">
                        +{dailyContractActivity.items.length - 12} عمليات أخرى محفوظة في الإقفال
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#DDE5EF] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-black text-[#142033]">قائمة التحقق اليومية</h3>
                  <Badge className="bg-[#EEF4FA] text-[#1D4F7A] hover:bg-[#EEF4FA]">
                    {checklistDoneCount}/{DAILY_LOG_CHECKLIST.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {DAILY_LOG_CHECKLIST.map((item) => (
                    <label
                      key={item.key}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#EEF2F6] bg-[#F8FAFC] p-3 text-sm font-bold leading-6 text-[#142033]"
                    >
                      <Checkbox
                        checked={dailyLogForm.checklist[item.key]}
                        onCheckedChange={(checked) => toggleDailyChecklist(item.key, checked === true)}
                        className="mt-1"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="daily-log-key-cases">أهم الحالات والإجراءات</Label>
                  <Textarea
                    id="daily-log-key-cases"
                    value={dailyLogForm.keyCases}
                    onChange={(event) => updateDailyLogField('keyCases', event.target.value)}
                    className="min-h-28"
                    placeholder="مثال: العميل، رقم العقد، الإجراء، النتيجة..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-legal">حالات تحتاج مراجعة قانونية</Label>
                  <Textarea
                    id="daily-log-legal"
                    value={dailyLogForm.legalReviewCases}
                    onChange={(event) => updateDailyLogField('legalReviewCases', event.target.value)}
                    className="min-h-28"
                    placeholder="اكتب الحالات التي تحتاج تدقيقًا قبل أي إجراء قانوني."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily-log-blockers">العوائق أو الملاحظات</Label>
                  <Textarea
                    id="daily-log-blockers"
                    value={dailyLogForm.blockers}
                    onChange={(event) => updateDailyLogField('blockers', event.target.value)}
                    className="min-h-28"
                    placeholder="أي عائق منع إكمال المتابعة أو التحصيل."
                  />
                </div>
              </div>

              {dailyLogForm.status === 'incomplete' && (
                <div className="space-y-2 rounded-xl border border-[#F8D8A8] bg-[#FFF6E5] p-4">
                  <Label htmlFor="daily-log-incomplete">سبب عدم إكمال اليوم</Label>
                  <Textarea
                    id="daily-log-incomplete"
                    value={dailyLogForm.incompleteReason}
                    onChange={(event) => updateDailyLogField('incompleteReason', event.target.value)}
                    className="min-h-24 bg-white"
                    placeholder="اكتب سبب عدم إكمال المهام أو ما يحتاج متابعة غدًا."
                  />
                </div>
              )}

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#DDE5EF] bg-[#F8FAFC] p-4 text-sm font-bold text-[#142033]">
                <Checkbox
                  checked={dailyLogForm.reportExported}
                  onCheckedChange={(checked) => updateDailyLogField('reportExported', checked === true)}
                />
                تم تحديث الصفحة وتصدير التقرير الشامل عند الحاجة
              </label>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintDailyLog}
              disabled={!dailyLogForm}
              className="rounded-xl"
            >
              <FileDown className="ml-2 h-4 w-4" />
              تصدير / طباعة
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDailyLogDialog(false)}
                className="rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={() => dailyLogForm && saveDailyLogMutation.mutate(dailyLogForm)}
                disabled={!dailyLogForm || saveDailyLogMutation.isPending}
                className="rounded-xl bg-[#11A37F] font-bold text-white hover:bg-[#0D876A]"
              >
                {saveDailyLogMutation.isPending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="ml-2 h-4 w-4" />
                )}
                حفظ الإقفال
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SimpleContractWizard
        open={showContractWizard}
        onOpenChange={handleContractWizardOpenChange}
        preselectedCustomerId={preselectedContractCustomerId}
      />

      <SignedContractScannerDialog
        open={Boolean(signedScanContract)}
        onOpenChange={(open) => {
          if (!open) setSignedScanContract(null);
        }}
        onSubmit={handleEmployeeSignedContractScan}
        isSubmitting={createContractDocument.isPending}
      />

      <input
        ref={violationProofInputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleViolationProofUpload}
      />

      <QuickPaymentDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setSelectedPaymentCustomer(null);
        }}
        customerId={selectedPaymentCustomer?.customerId || ''}
        customerName={selectedPaymentCustomer?.customerName || ''}
        customerPhone={selectedPaymentCustomer?.customerPhone || null}
        contractId={selectedContractId}
        allowEmployeeWorkspacePayments
        onSuccess={() => {
          refetchContracts();
          refetchCollections();
          refetchPerformance();
        }}
      />

      <CallLogDialog
        open={showCallDialog}
        onOpenChange={(open) => {
          setShowCallDialog(open);
          if (!open) setSelectedContractId(undefined);
        }}
        contracts={contractsForDialogs}
        preselectedContractId={selectedContractId}
      />

      <ScheduleFollowupDialog
        open={showFollowupDialog}
        onOpenChange={setShowFollowupDialog}
        contracts={contractsForDialogs}
        preselectedContractId={selectedContractId}
      />

      <AddNoteDialog
        open={showNoteDialog}
        onOpenChange={setShowNoteDialog}
        contracts={contractsForDialogs}
        preselectedContractId={selectedContractId}
      />

      <Dialog
        open={showCancelContractDialog}
        onOpenChange={(open) => {
          if (cancelContractMutation.isPending) return;
          setShowCancelContractDialog(open);
          if (!open) setContractCancellationReason('');
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <XCircle className="h-5 w-5 text-red-600" />
              إلغاء العقد من مساحة العمل
            </DialogTitle>
            <DialogDescription className="text-right leading-6">
              سيتم تغيير حالة العقد إلى ملغي، وسيتم إرسال تنبيه للمدير باسم الموظف الذي قام بالإلغاء.
              بعد نجاح الإلغاء سيختفي العقد من مساحة العمل الخاصة بك.
            </DialogDescription>
          </DialogHeader>

          {selectedWorkspaceContract && (
            <div className="space-y-3">
              <div className="rounded-lg border border-[#DDE5EF] bg-[#F8FAFC] p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-[#142033]">
                    {selectedWorkspaceContract.contract_number || selectedWorkspaceContract.id}
                  </span>
                  <span className="text-[#64748B]">{selectedWorkspaceContract.customer_name || 'عميل غير محدد'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[#64748B]">الرصيد المستحق</span>
                  <span
                    className={cn(
                      'font-black',
                      (selectedWorkspaceContract.balance_due || 0) > 0 ? 'text-[#A56000]' : 'text-[#0D876A]',
                    )}
                    dir="ltr"
                  >
                    {formatCurrency(selectedWorkspaceContract.balance_due || 0)}
                  </span>
                </div>
              </div>

              {(selectedWorkspaceContract.balance_due || 0) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                  <p className="font-black">نصيحة النظام</p>
                  <p>
                    يوجد التزام مالي على العميل. الأفضل تحويل العميل إلى الشؤون القانونية قبل إلغاء العقد
                    حتى لا تضيع متابعة المطالبة.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="employee-contract-cancel-reason">سبب الإلغاء</Label>
                <Textarea
                  id="employee-contract-cancel-reason"
                  value={contractCancellationReason}
                  onChange={(event) => setContractCancellationReason(event.target.value)}
                  placeholder="اكتب سبب الإلغاء أو ملاحظة مختصرة للمدير..."
                  className="min-h-24 resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {(selectedWorkspaceContract?.balance_due || 0) > 0 && (
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-[#C8D3E0] text-[#173A63]"
                disabled={cancelContractMutation.isPending}
                onClick={() => {
                  setShowCancelContractDialog(false);
                  setShowConvertToLegalDialog(true);
                }}
              >
                <Scale className="h-4 w-4" />
                تحويل للقانونية
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={cancelContractMutation.isPending}
                onClick={() => setShowCancelContractDialog(false)}
              >
                رجوع
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={cancelContractMutation.isPending || !selectedWorkspaceContract}
                onClick={() => {
                  if (!selectedWorkspaceContract) return;
                  cancelContractMutation.mutate({
                    contractId: selectedWorkspaceContract.id,
                    reason: contractCancellationReason,
                  });
                }}
              >
                {cancelContractMutation.isPending ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الإلغاء...
                  </>
                ) : (
                  'تأكيد إلغاء العقد'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={canUnassignContracts && showBulkUnassignDialog} onOpenChange={setShowBulkUnassignDialog}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              إلغاء تعيين جماعي
            </DialogTitle>
            <DialogDescription>
              سيتم إزالة التعيين الحالي من {selectedBulkContractIds.length} عقود، وبعدها يمكن تعيينها من جديد من إدارة الفريق.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-red-100 bg-red-50 p-3">
            <p className="mb-2 text-sm font-semibold text-red-800">العقود المحددة</p>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {selectedBulkContracts.slice(0, 6).map(contract => (
                <div key={contract.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-slate-900">#{contract.contract_number || contract.id}</span>
                  <span className="text-slate-500">{contract.customer_name || 'غير محدد'}</span>
                </div>
              ))}
              {selectedBulkContracts.length > 6 && (
                <p className="text-xs text-red-700">
                  و {selectedBulkContracts.length - 6} عقود أخرى
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBulkUnassignDialog(false)}
              disabled={bulkUnassignMutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => bulkUnassignMutation.mutate(selectedBulkContractIds)}
              disabled={bulkUnassignMutation.isPending || selectedBulkContractIds.length === 0}
            >
              {bulkUnassignMutation.isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري الإلغاء...
                </>
              ) : (
                'تأكيد إلغاء التعيين'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canUnassignContracts && (
        <UnassignContractDialog
          open={showUnassignDialog}
          onOpenChange={setShowUnassignDialog}
          contractId={selectedContractId || null}
          contractNumber={selectedWorkspaceContract?.contract_number}
          employeeName={user?.email?.split('@')[0] || 'الموظف'}
        />
      )}

      <ConvertToLegalDialog
        open={showConvertToLegalDialog}
        onOpenChange={setShowConvertToLegalDialog}
        contract={selectedLegalContract}
        onSuccess={() => {
          refetchContracts();
          refetchCollections();
          refetchPerformance();
        }}
      />
    </div>
  );
};

export default EmployeeWorkspace;
