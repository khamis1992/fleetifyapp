/**
 * Employee Workspace Page - Redesigned
 * صفحة مساحة عمل الموظف - تصميم احترافي
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  RefreshCw, 
  Briefcase, 
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
  MoreHorizontal
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const EmployeeWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showFollowupDialog, setShowFollowupDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [showBulkUnassignDialog, setShowBulkUnassignDialog] = useState(false);
  const [showConvertToLegalDialog, setShowConvertToLegalDialog] = useState(false);
  const [showDailyLogDialog, setShowDailyLogDialog] = useState(false);
  const [showContractWizard, setShowContractWizard] = useState(false);
  const [signedScanContract, setSignedScanContract] = useState<{
    id: string;
    contractNumber: string;
  } | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [preselectedContractCustomerId, setPreselectedContractCustomerId] = useState<string | undefined>();
  const [selectedBulkContractIds, setSelectedBulkContractIds] = useState<string[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [dailyLogForm, setDailyLogForm] = useState<DailyLogFormState | null>(null);
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

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflowY: html.style.overflowY,
      htmlOverflowX: html.style.overflowX,
      htmlHeight: html.style.height,
      htmlPosition: html.style.position,
      htmlTouchAction: html.style.touchAction,
      bodyOverflowY: body.style.overflowY,
      bodyOverflowX: body.style.overflowX,
      bodyHeight: body.style.height,
      bodyPosition: body.style.position,
      bodyTouchAction: body.style.touchAction,
      bodyScrollLocked: body.getAttribute('data-scroll-locked'),
    };

    body.removeAttribute('data-scroll-locked');
    html.style.setProperty('overflow-y', 'auto', 'important');
    html.style.setProperty('overflow-x', 'hidden', 'important');
    html.style.setProperty('height', 'auto', 'important');
    html.style.setProperty('position', 'relative', 'important');
    html.style.setProperty('touch-action', 'pan-y', 'important');
    body.style.setProperty('overflow-y', 'auto', 'important');
    body.style.setProperty('overflow-x', 'hidden', 'important');
    body.style.setProperty('height', 'auto', 'important');
    body.style.setProperty('position', 'relative', 'important');
    body.style.setProperty('touch-action', 'pan-y', 'important');

    return () => {
      html.style.overflowY = previous.htmlOverflowY;
      html.style.overflowX = previous.htmlOverflowX;
      html.style.height = previous.htmlHeight;
      html.style.position = previous.htmlPosition;
      html.style.touchAction = previous.htmlTouchAction;
      body.style.overflowY = previous.bodyOverflowY;
      body.style.overflowX = previous.bodyOverflowX;
      body.style.height = previous.bodyHeight;
      body.style.position = previous.bodyPosition;
      body.style.touchAction = previous.bodyTouchAction;
      if (previous.bodyScrollLocked) {
        body.setAttribute('data-scroll-locked', previous.bodyScrollLocked);
      } else {
        body.removeAttribute('data-scroll-locked');
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
      return data;
    },
    onSuccess: async () => {
      await refetchDailyLog();
      toast({
        title: 'تم حفظ إقفال اليوم',
        description: 'تم حفظ سجل العمل اليومي داخل مساحة العمل.',
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
      notes: `رفع بواسطة الموظف من مساحة العمل بتاريخ ${scannedAt}، ويتضمن ${pageImages.length} صفحة`,
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

  // Filter contracts based on search
  const filteredContracts = contracts.filter(c => 
    c.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
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
    <div className="min-h-dvh bg-[#F4F7FA] p-3 text-[#142033] sm:p-4 md:p-6 lg:p-8" dir="rtl">
      
      {/* --- Header --- */}
      <header className="relative mb-4 overflow-hidden rounded-xl border border-[#DDE5EF] bg-[#142033] p-4 text-white shadow-[0_22px_55px_rgba(20,32,51,0.18)] sm:mb-5 sm:rounded-2xl sm:p-5 md:p-6">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_20%_20%,rgba(27,191,154,0.28),transparent_34%),radial-gradient(circle_at_70%_70%,rgba(63,131,191,0.24),transparent_34%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#7FE5CB] ring-1 ring-white/15 sm:h-12 sm:w-12">
                <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-normal sm:text-2xl md:text-3xl">مساحة عملي</h1>
                <p className="mt-1 max-w-full text-xs font-medium leading-5 text-slate-300 sm:text-sm">
                  أهلاً بك، {user?.email?.split('@')[0]} - لوحة متابعة التحصيل والعقود اليومية
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-xs min-[390px]:grid-cols-2 sm:flex sm:flex-wrap">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-center text-slate-200 sm:text-start">
                {contractStats.activeContracts} عقد نشط
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-center text-slate-200 sm:text-start">
                {taskStats.todayTasks} مهام اليوم
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-center text-slate-200 min-[390px]:col-span-2 sm:col-span-1 sm:text-start">
                {formatCurrency(collectionStats.totalPending)} مستحق هذا الشهر
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <NotificationBell />

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
              className="h-10 w-full justify-center rounded-lg border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white sm:h-9 sm:w-auto"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-10 w-full justify-center rounded-lg border-white/15 bg-white/10 text-white hover:bg-white/15 sm:h-9 sm:w-auto"
            >
              <RefreshCw className={cn("ml-2 h-4 w-4", isLoading && "animate-spin")} />
              تحديث
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="h-10 w-full justify-center rounded-lg border-white/15 bg-white/10 text-white hover:bg-white/15 sm:h-9 sm:w-auto"
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              الرئيسية
            </Button>
          </div>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-5">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={cn("min-h-12 justify-center rounded-xl px-3 py-3 text-xs font-bold leading-5 shadow-sm sm:justify-start sm:px-4 sm:text-sm", action.className)}
            >
              <Icon className="ml-2 h-4 w-4" />
              {action.label}
            </Button>
          );
        })}
      </div>

      <Card className={cn(
        "mb-5 overflow-hidden rounded-xl border shadow-sm",
        isDailyLogClosed ? "border-[#BFEBDD] bg-[#F4FFFB]" : "border-[#DDE5EF] bg-white"
      )}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                isDailyLogClosed ? "bg-[#E9FBF6] text-[#11A37F]" : "bg-[#EEF4FA] text-[#1D4F7A]"
              )}>
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black text-[#142033]">إقفال يوم العمل</h2>
                  <Badge className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-bold",
                    isDailyLogClosed
                      ? "bg-[#E9FBF6] text-[#0D876A] hover:bg-[#E9FBF6]"
                      : "bg-[#FFF6E5] text-[#9A5B00] hover:bg-[#FFF6E5]"
                  )}>
                    {isDailyLogClosed ? 'تم الإقفال اليوم' : 'بانتظار الإقفال'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-medium leading-6 text-[#6A7688]">
                  سجّل ملخص اليوم وقائمة التحقق اليومية بدل تعبئة الدفتر الورقي، مع حفظ السجل للمتابعة الإدارية.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-[180px] rounded-xl border border-[#DDE5EF] bg-white px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-[#6A7688]">
                  <span>اكتمال قائمة التحقق</span>
                  <span>{checklistDoneCount}/{DAILY_LOG_CHECKLIST.length}</span>
                </div>
                <Progress value={checklistPercent} className="h-2" />
              </div>
              <Button
                type="button"
                onClick={() => setShowDailyLogDialog(true)}
                className="h-11 rounded-xl bg-[#11A37F] px-5 font-bold text-white hover:bg-[#0D876A]"
              >
                <ClipboardCheck className="ml-2 h-4 w-4" />
                {isDailyLogClosed ? 'عرض الإقفال' : 'إقفال اليوم'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Stats Overview --- */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-[#6A7688] mb-1">العقود المخصصة حاليًا</p>
              <h3 className="text-2xl font-black text-[#142033] sm:text-3xl">{contractStats.totalContracts}</h3>
              <p className="text-xs text-[#11A37F] mt-1 font-bold">العقود النشطة فقط</p>
            </div>
            <div className="p-3 bg-[#EEF4FA] text-[#1D4F7A] rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-[#6A7688] mb-1">المبالغ المستحقة لهذا الشهر</p>
              <h3 className="break-words text-2xl font-black text-[#142033] sm:text-3xl">{formatCurrency(collectionStats.totalPending)}</h3>
              <p className="text-xs text-[#9A5B00] mt-1 font-bold">تحصيل الشهر الحالي</p>
            </div>
            <div className="p-3 bg-[#FFF6E5] text-[#9A5B00] rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-[#6A7688] mb-1">مهام اليوم</p>
              <h3 className="text-2xl font-black text-[#142033] sm:text-3xl">{taskStats.todayTasks}</h3>
              <p className="text-xs text-[#11A37F] mt-1 font-bold">{taskStats.completionRate}% نسبة الإنجاز</p>
            </div>
            <div className="p-3 bg-[#E9FBF6] text-[#11A37F] rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-[#6A7688] mb-1">نقاط الأداء</p>
              <h3 className="text-2xl font-black text-[#142033] sm:text-3xl">{performance ? Math.round(performance.performance_score) : 0}</h3>
              <p className="text-xs text-[#1D4F7A] mt-1 font-bold">{performanceGrade?.label_ar || 'جيد'}</p>
            </div>
            <div className="p-3 bg-[#EEF4FA] text-[#1D4F7A] rounded-xl">
              <Star className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-5">
        
        {/* --- Main Content (Left) --- */}
        <div className="col-span-12 space-y-5 lg:col-span-8">
          
          <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
            <div className="mb-4 -mx-1 overflow-x-auto rounded-xl border border-[#DDE5EF] bg-white p-1 shadow-sm sm:mx-0">
              <TabsList className="h-auto min-w-max bg-transparent p-0">
                <TabsTrigger value="overview" className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white">نظرة عامة</TabsTrigger>
                <TabsTrigger value="collections" className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white">التحصيل الشهري</TabsTrigger>
                <TabsTrigger value="contracts" className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white">العقود ({contractStats.totalContracts})</TabsTrigger>
                <TabsTrigger value="tasks" className="rounded-lg px-4 py-2.5 text-sm font-bold data-[state=active]:bg-[#142033] data-[state=active]:text-white">المهام ({taskStats.totalTasks})</TabsTrigger>
              </TabsList>
            </div>

            {/* View: Overview */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              
              {/* Priority Section */}
              {priorityContracts.length > 0 && (
                <Card className="overflow-hidden rounded-xl border-[#F2C56B] bg-white shadow-sm">
                  <CardHeader className="border-b border-[#FBE7B5] bg-[#FFF8EA] pb-3">
                    <CardTitle className="flex items-center gap-2 text-sm font-black text-[#8A5A00]">
                      <AlertCircle className="w-4 h-4" />
                      يحتاج اهتمامك الفوري
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {priorityContracts.slice(0, 3).map((contract, idx) => (
                      <div 
                        key={contract.id} 
                        className="flex cursor-pointer flex-col gap-3 border-b p-4 transition-colors last:border-0 hover:bg-[#FFF8EA] sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => {
                           setSelectedContractId(contract.id);
                           // Optional: Open contract details or highlight
                        }}
                      >
                        <div className="flex items-center gap-4">
                           <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-[#FFF0C7] text-xs font-black text-[#9A5B00]">
                             {idx + 1}
                           </div>
                           <div>
                             <h4 className="font-semibold text-gray-900">{contract.customer_name}</h4>
                             <p className="text-xs text-gray-500">عقد #{contract.contract_number}</p>
                           </div>
                        </div>
                        <div className="w-full text-right sm:w-auto sm:text-left">
                          <Badge variant="outline" className="bg-white border-amber-200 text-amber-700 mb-1">
                            {contract.priority_reason_ar}
                          </Badge>
                          <p className="text-xs text-red-600 font-bold flex items-center justify-end gap-1">
                            {contract.priority_reason === 'overdue_payment' ? (
                               <>{formatCurrency(contract.balance_due)} مستحق</>
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
              <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-[#EEF2F6] pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-black text-[#142033]">
                    <Calendar className="w-5 h-5 text-[#11A37F]" />
                    مهام اليوم
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {todayTasks.length} مهام متبقية
                  </Badge>
                </CardHeader>
                <CardContent>
                  {todayTasks.length > 0 ? (
                    <div className="space-y-2">
                      {todayTasks.map((task) => (
                        <div 
                          key={task.id} 
                          className={cn(
                            "flex flex-col gap-3 rounded-xl border p-3 transition-all sm:flex-row sm:items-center sm:justify-between",
                            task.status === 'completed' 
                              ? "bg-[#F7F9FB] border-[#EEF2F6] opacity-70" 
                              : "bg-white border-[#EEF2F6] hover:border-[#11A37F]/35 hover:shadow-sm"
                          )}
                        >
                          <div className="flex min-w-0 items-start gap-3 sm:items-center">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              task.status === 'completed' ? "bg-gray-300" : "bg-[#11A37F]"
                            )} />
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                task.status === 'completed' ? "text-gray-500 line-through" : "text-gray-900"
                              )}>
                                {task.title_ar || task.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {task.scheduled_time || '09:00 ص'}
                                </span>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" /> {task.customer_name}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {task.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs hover:border-[#11A37F]/30 hover:bg-[#E9FBF6] hover:text-[#0D876A]"
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
                    <div className="rounded-xl border border-dashed border-[#DDE5EF] bg-[#F8FAFC] py-10 text-center">
                      <p className="text-gray-500 text-sm">لا توجد مهام مجدولة لهذا اليوم</p>
                      <Button variant="link" className="text-teal-600 text-xs mt-2" onClick={() => setShowFollowupDialog(true)}>
                        + إضافة مهمة جديدة
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>

            {/* View: Monthly Collections */}
            <TabsContent value="collections" className="space-y-6 mt-0">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500 mb-1">المستهدف هذا الشهر</p>
                    <h3 className="text-xl font-bold text-gray-900">{formatCurrency(collectionStats.totalDue)}</h3>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500 mb-1">تم تحصيله</p>
                    <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(collectionStats.totalCollected)}</h3>
                    <Progress value={collectionStats.collectionRate} className="h-1.5 mt-2 bg-emerald-100" />
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500 mb-1">المتبقي</p>
                    <h3 className="text-xl font-bold text-amber-600">{formatCurrency(collectionStats.totalPending)}</h3>
                  </CardContent>
                </Card>
              </div>

              {/* Collections List - Grouped by Customer */}
              <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                <CardHeader className="border-b border-[#EEF2F6] pb-3">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-lg font-black text-[#142033]">
                      <DollarSign className="w-5 h-5 text-[#11A37F]" />
                      قائمة التحصيل الشهري
                    </CardTitle>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {groupedCollections.length} عميل
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="pr-0 sm:pr-4">
                    {groupedCollections.length > 0 ? (
                      <div className="space-y-3">
                        {groupedCollections.map((group) => {
                          const isExpanded = expandedCustomers.has(group.customer_id);
                          
                          return (
                            <div 
                              key={group.customer_id}
                              className="overflow-hidden rounded-xl border border-[#DDE5EF] bg-white transition-all hover:border-[#11A37F]/45 hover:shadow-sm"
                            >
                              {/* Customer Header */}
                              <div 
                                className="flex flex-col gap-3 bg-[#F8FAFC] p-3 transition-all hover:bg-[#E9FBF6] sm:flex-row sm:items-center sm:justify-between sm:p-4"
                              >
                                <div className="flex w-full min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
                                  <Avatar 
                                    className="h-11 w-11 shrink-0 cursor-pointer border-2 border-emerald-200 shadow-sm transition-all hover:border-emerald-400 sm:h-12 sm:w-12"
                                    onClick={() => {
                                      // الانتقال لأول عقد للعميل
                                      const firstInvoice = group.invoices[0];
                                      if (firstInvoice?.contract_number) {
                                        navigate(`/contracts/${firstInvoice.contract_number}`);
                                      }
                                    }}
                                  >
                                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold text-lg">
                                      {group.customer_name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <h4 
                                      className="mb-1 cursor-pointer break-words text-sm font-bold text-gray-900 transition-colors hover:text-emerald-600 hover:underline sm:text-base"
                                      onClick={() => {
                                        // الانتقال لأول عقد للعميل
                                        const firstInvoice = group.invoices[0];
                                        if (firstInvoice?.contract_number) {
                                          navigate(`/contracts/${firstInvoice.contract_number}`);
                                        }
                                      }}
                                    >
                                      {group.customer_name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 sm:gap-3">
                                      <span className="flex items-center gap-1">
                                        <FileText className="w-3 h-3" />
                                        {group.invoices.length} فاتورة
                                      </span>
                                      <span className="text-gray-300">â€¢</span>
                                      <span className="flex items-center gap-1 font-bold text-amber-600">
                                        <DollarSign className="w-3 h-3" />
                                        {formatCurrency(group.total_amount)} مستحق
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid w-full grid-cols-[1fr_auto] items-center gap-2 sm:flex sm:w-auto">
                                  <Button 
                                    size="sm" 
                                    className="h-10 bg-emerald-600 text-white hover:bg-emerald-700 sm:h-9"
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
                                    <DollarSign className="w-4 h-4 ml-2" />
                                    تسجيل دفعة
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-9 w-9 p-0 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
                                    onClick={() => toggleCustomerExpanded(group.customer_id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-gray-600" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-600" />
                                    )}
                                  </Button>
                                </div>
                              </div>

                              {/* Invoices List (Expandable) */}
                              {isExpanded && (
                                <div className="border-t border-gray-200 bg-gray-50/50">
                                  <div className="p-3 space-y-2">
                                    {group.invoices.map((invoice) => (
                                      <div 
                                        key={invoice.invoice_id}
                                        className="group/invoice flex cursor-pointer flex-col gap-3 rounded-lg border border-gray-100 bg-white p-3 transition-all hover:border-emerald-200 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                                        onClick={() => navigate(`/contracts/${invoice.contract_number}`)}
                                      >
                                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover/invoice:bg-emerald-100 group-hover/invoice:text-emerald-600 transition-colors">
                                            <FileText className="w-4 h-4" />
                                          </div>
                                          <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 group-hover/invoice:text-emerald-600 transition-colors">
                                              فاتورة #{invoice.invoice_number}
                                            </p>
                                            <p className="text-xs text-gray-500 group-hover/invoice:text-emerald-600 transition-colors">
                                              عقد #{invoice.contract_number}
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                                          <div className="text-right sm:text-left">
                                            <p className="text-sm font-bold text-gray-900">
                                              {formatCurrency(invoice.amount - invoice.paid_amount)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              استحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                          </div>
                                          
                                          <Badge 
                                            variant="outline" 
                                            className={cn(
                                              "text-xs",
                                              invoice.status === 'overdue' 
                                                ? "bg-red-50 text-red-700 border-red-200" 
                                                : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}
                                          >
                                            {invoice.status === 'overdue' ? 'متأخر' : 'مستحق'}
                                          </Badge>
                                        </div>
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
                      <div className="text-center py-12">
                        <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">لا توجد مستحقات لهذا الشهر</p>
                        <p className="text-xs text-gray-400 mt-2">جميع الفواتير مدفوعة</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* View: Contracts */}
            <TabsContent value="contracts" className="mt-0">
              <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                <CardHeader className="border-b border-[#EEF2F6] pb-3">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="flex items-center gap-2 text-lg font-black text-[#142033]">
                      <FileText className="w-5 h-5 text-[#1D4F7A]" />
                      سجل العقود
                    </CardTitle>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="بحث برقم العقد أو الاسم..."
                        className="h-10 rounded-lg border-[#DDE5EF] bg-[#F8FAFC] pr-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
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
                <CardContent className="px-3 sm:px-6">
                  <div className="pr-0 sm:pr-4">
                    <div className="space-y-3">
                      {filteredContracts.length > 0 ? filteredContracts.map((contract) => {
                        const statusStyle = getContractStatusStyle(contract.status);
                        const StatusIcon = statusStyle.icon;
                        const hasSignedContract = signedContractIds.includes(contract.id);
                        
                        return (
                        <div
                          key={contract.id}
                          className="group relative overflow-hidden rounded-lg border border-[#DDE5EF] bg-white transition-all duration-200 hover:border-[#A9DCCF] hover:shadow-[0_8px_24px_rgba(20,32,51,0.08)]"
                        >
                          <div
                            className={cn(
                              "absolute inset-y-0 right-0 w-1",
                              statusStyle.badge.split(' ')[0].replace('-100', '-500'),
                            )}
                          />

                          <div className="p-4 pr-5 sm:p-5 sm:pr-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="flex min-w-0 items-start gap-3">
                                {canUnassignContracts && (
                                  <div
                                    className="pt-3"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Checkbox
                                      checked={selectedBulkContractIds.includes(contract.id)}
                                      onCheckedChange={() => toggleBulkContractSelection(contract.id)}
                                      aria-label={`تحديد العقد ${contract.contract_number || contract.id}`}
                                    />
                                  </div>
                                )}

                                <Avatar className="h-11 w-11 shrink-0 border border-[#DDE5EF] bg-[#F4F8FB] sm:h-12 sm:w-12">
                                  <AvatarFallback className="bg-[#E9FBF6] text-base font-black text-[#0D876A]">
                                    {contract.customer_name?.[0] || 'C'}
                                  </AvatarFallback>
                                </Avatar>

                                <button
                                  type="button"
                                  className="min-w-0 text-right"
                                  onClick={() => navigate(`/contracts/${contract.contract_number || contract.id}`)}
                                >
                                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <h4 className="break-words text-base font-black text-[#142033] transition-colors group-hover:text-[#1D4F7A]">
                                      {contract.customer_name || 'غير محدد'}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className={cn("h-6 gap-1 border px-2 text-[11px] font-bold", statusStyle.badge)}
                                    >
                                      <StatusIcon className="h-3 w-3" />
                                      {statusStyle.label}
                                    </Badge>
                                    {hasSignedContract ? (
                                      <Badge className="h-6 gap-1 border border-[#BFEBDD] bg-[#E9FBF6] px-2 text-[11px] text-[#0D876A] hover:bg-[#E9FBF6]">
                                        <FileCheck2 className="h-3 w-3" />
                                        العقد موثق
                                      </Badge>
                                    ) : workspaceProfile?.id
                                      && !isSignedContractStatusLoading
                                      && !hasSignedContractStatusError ? (
                                      <Badge
                                        variant="outline"
                                        className="h-6 gap-1 border-[#F4C96B] bg-[#FFF8E7] px-2 text-[11px] text-[#8A5700]"
                                      >
                                        <AlertCircle className="h-3 w-3" />
                                        نسخة العقد ناقصة
                                      </Badge>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6A7688]">
                                    <span className="flex items-center gap-1.5 font-bold text-[#40516A]">
                                      <FileText className="h-3.5 w-3.5 text-[#8A9AAF]" />
                                      {contract.contract_number || 'بدون رقم'}
                                    </span>
                                    {contract.customer_phone && (
                                      <span className="flex items-center gap-1.5" dir="ltr">
                                        <Phone className="h-3.5 w-3.5 text-[#8A9AAF]" />
                                        {contract.customer_phone}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              </div>

                              <div className="flex shrink-0 items-end justify-between gap-6 border-t border-[#EEF2F6] pt-3 lg:min-w-52 lg:justify-end lg:border-r lg:border-t-0 lg:pr-6 lg:pt-0">
                                <div>
                                  <p className="text-[11px] font-bold text-[#7B8798]">
                                    {(contract.balance_due || 0) > 0 ? 'الرصيد المستحق' : 'حالة التحصيل'}
                                  </p>
                                  <p
                                    className={cn(
                                      "mt-1 text-base font-black",
                                      (contract.balance_due || 0) > 0 ? "text-[#A56000]" : "text-[#0D876A]",
                                    )}
                                    dir={(contract.balance_due || 0) > 0 ? 'ltr' : undefined}
                                  >
                                    {(contract.balance_due || 0) > 0
                                      ? formatCurrency(contract.balance_due || 0)
                                      : 'مدفوع بالكامل'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 border-t border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                              {contract.status === 'active' && (
                                <Button
                                  size="sm"
                                  className="h-9 gap-2 rounded-md bg-[#173A63] px-4 text-xs font-bold text-white hover:bg-[#102B4C]"
                                  onClick={() => {
                                    setSelectedContractId(contract.id);
                                    setShowNoteDialog(true);
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                  إضافة ملاحظة
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant={hasSignedContract ? 'outline' : 'default'}
                                className={cn(
                                  'h-9 gap-2 rounded-md px-4 text-xs font-bold',
                                  hasSignedContract
                                    ? 'border-[#C8D3E0] bg-white text-[#173A63] hover:bg-[#EEF5FB]'
                                    : 'bg-[#11A37F] text-white hover:bg-[#0D876A]',
                                )}
                                onClick={() => setSignedScanContract({
                                  id: contract.id,
                                  contractNumber: contract.contract_number || contract.id,
                                })}
                              >
                                <ScanLine className="h-4 w-4" />
                                {hasSignedContract ? 'إضافة نسخة' : 'تصوير العقد'}
                              </Button>

                              {contract.status === 'active' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 gap-2 rounded-md border-[#BFEBDD] bg-white px-4 text-xs font-bold text-[#0D876A] hover:bg-[#E9FBF6]"
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
                                  <DollarSign className="h-4 w-4" />
                                  تسجيل دفعة
                                </Button>
                              )}

                              {contract.status === 'active' && (contract.balance_due || 0) > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 gap-2 rounded-md border-[#C8D3E0] bg-white px-4 text-xs font-bold text-[#173A63] hover:bg-[#EEF5FB]"
                                  onClick={() => {
                                    setSelectedContractId(contract.id);
                                    setShowConvertToLegalDialog(true);
                                  }}
                                >
                                  <Scale className="h-4 w-4" />
                                  تحويل للقانونية
                                </Button>
                              )}
                            </div>

                            {(contract.customer_phone || contract.status === 'active' || canUnassignContracts) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 shrink-0 rounded-md border-[#C8D3E0] bg-white text-[#40516A] hover:bg-[#EEF5FB]"
                                    aria-label="إجراءات إضافية"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 text-right">
                                  <div dir="rtl">
                                  {contract.customer_phone && (
                                    <DropdownMenuItem
                                      className="gap-2"
                                      onClick={() => { window.location.href = `tel:${contract.customer_phone}`; }}
                                    >
                                      <Phone className="h-4 w-4" />
                                      اتصال بالعميل
                                    </DropdownMenuItem>
                                  )}
                                  {contract.status === 'active' && (
                                    <>
                                      <DropdownMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                          setSelectedContractId(contract.id);
                                          setShowFollowupDialog(true);
                                        }}
                                      >
                                        <Calendar className="h-4 w-4" />
                                        جدولة متابعة
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {canUnassignContracts && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="gap-2 text-red-700 focus:bg-red-50 focus:text-red-800"
                                        onClick={() => {
                                          setSelectedContractId(contract.id);
                                          setShowUnassignDialog(true);
                                        }}
                                      >
                                        <XCircle className="h-4 w-4" />
                                        إلغاء التعيين
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      )}) : (
                        <div className="text-center py-12">
                           <p className="text-gray-500">لا توجد عقود مطابقة للبحث</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* View: Tasks */}
            <TabsContent value="tasks" className="mt-0">
               <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
                 <CardHeader className="border-b border-[#EEF2F6]">
                    <CardTitle className="text-lg font-black text-[#142033]">جميع المهام</CardTitle>
                    <CardDescription>عرض وإدارة جميع المهام المجدولة والسابقة</CardDescription>
                 </CardHeader>
                 <CardContent className="px-3 sm:px-6">
                    <div>
                      <div className="space-y-2">
                        {tasks.map((task) => (
                           <div key={task.id} className="rounded-xl border border-[#EEF2F6] p-4 transition-colors hover:bg-[#F8FAFC]">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                 <div className="min-w-0">
                                    <h4 className="font-medium text-gray-900">{task.title_ar || task.title}</h4>
                                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500 sm:gap-4">
                                       <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {task.scheduled_date}</span>
                                       <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {task.scheduled_time}</span>
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                   <Badge variant={task.status === 'completed' ? 'secondary' : 'outline'}>
                                      {task.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                                   </Badge>
                                   {task.status !== 'completed' && (
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       className="h-8 rounded-lg text-xs hover:border-[#11A37F]/30 hover:bg-[#E9FBF6] hover:text-[#0D876A]"
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
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>

        </div>

        {/* --- Sidebar (Right) --- */}
        <div className="col-span-12 space-y-5 lg:col-span-4">
          
          {/* Verification Tasks */}
          <VerificationTasksList limit={5} />

          {/* Performance Detailed */}
          <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EEF2F6] pb-3">
              <CardTitle className="text-base font-black text-[#142033]">تحليل الأداء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-[#6A7688]">نسبة التحصيل</span>
                  <span className="font-black text-[#142033]">{performance ? Math.round(performance.collection_rate) : 0}%</span>
                </div>
                <Progress value={performance?.collection_rate || 0} className="h-2" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-[#6A7688]">إنجاز المهام</span>
                  <span className="font-black text-[#142033]">{performance ? Math.round(performance.followup_completion_rate) : 0}%</span>
                </div>
                <Progress value={performance?.followup_completion_rate || 0} className="h-2" />
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <p className="rounded-lg bg-[#F8FAFC] p-3 text-xs leading-relaxed text-[#6A7688]">
                  أداؤك هذا الشهر {performanceGrade?.label_ar === 'ممتاز' ? 'رائع!' : 'جيد.'} استمر في متابعة العملاء المتأخرين لتحسين نسبة التحصيل لديك.
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Activity Log (Simplified) */}
          <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm">
            <CardHeader className="border-b border-[#EEF2F6] pb-3">
              <CardTitle className="text-base font-black text-[#142033]">النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mr-2 space-y-6 border-r border-[#DDE5EF]">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="relative pr-6">
                    <div className="absolute -right-[5px] top-1 h-2.5 w-2.5 rounded-full bg-[#11A37F] ring-4 ring-white" />
                    <p className="text-sm font-bold text-[#142033]">تم تحديث حالة العقد #123{i}</p>
                    <p className="mt-1 text-xs text-[#6A7688]">منذ {i + 2} ساعات</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

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

      <QuickPaymentDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setSelectedPaymentCustomer(null);
        }}
        customerId={selectedPaymentCustomer?.customerId || ''}
        customerName={selectedPaymentCustomer?.customerName || ''}
        customerPhone={selectedPaymentCustomer?.customerPhone || null}
        onSuccess={() => {
          refetchContracts();
          refetchCollections();
          refetchPerformance();
        }}
      />

      <CallLogDialog
        open={showCallDialog}
        onOpenChange={setShowCallDialog}
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
