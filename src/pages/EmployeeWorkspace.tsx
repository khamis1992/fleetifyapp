/**
 * Employee Workspace Page - Redesigned
 * صفحة مساحة عمل الموظف - تصميم احترافي
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  Loader2
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
import { Separator } from '@/components/ui/separator';

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
import { ConvertToLegalDialog } from '@/components/contracts/ConvertToLegalDialog';
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
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [selectedBulkContractIds, setSelectedBulkContractIds] = useState<string[]>([]);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [selectedPaymentCustomer, setSelectedPaymentCustomer] = useState<{
    customerId: string;
    customerName: string;
    customerPhone: string | null;
  } | null>(null);
  // This page is the current employee's own workspace. Reassignment must happen
  // from Team Management, even when the employee also has a management role.
  const canUnassignContracts = false;

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

  const isLoading = isLoadingContracts || isLoadingTasks || isLoadingPerformance || isLoadingCollections;

  const handleRefresh = () => {
    refetchContracts();
    refetchTasks();
    refetchPerformance();
    refetchCollections();
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
      icon: Phone, 
      label: 'تسجيل مكالمة', 
      onClick: () => setShowCallDialog(true),
      variant: 'default',
      className: 'bg-[#1D4F7A] text-white hover:bg-[#163F62]'
    },
    { 
      icon: DollarSign, 
      label: 'تسجيل دفعة', 
      onClick: () => {
        setActiveTab('collections');
        toast({
          title: 'اختر العميل',
          description: 'اضغط تسجيل دفعة من بطاقة العميل أو العقد المطلوب',
        });
      },
      variant: 'default',
      className: 'bg-[#11A37F] text-white hover:bg-[#0D876A]'
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
                {formatCurrency(contractStats.totalBalanceDue)} مستحق
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

      <div className="mb-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
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

      {/* --- Stats Overview --- */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-[#6A7688] mb-1">إجمالي العقود</p>
              <h3 className="text-2xl font-black text-[#142033] sm:text-3xl">{contractStats.totalContracts}</h3>
              <p className="text-xs text-[#11A37F] mt-1 font-bold">{contractStats.activeContracts} عقد نشط</p>
            </div>
            <div className="p-3 bg-[#EEF4FA] text-[#1D4F7A] rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-[#DDE5EF] bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="text-sm font-bold text-[#6A7688] mb-1">المبالغ المستحقة</p>
              <h3 className="break-words text-2xl font-black text-[#142033] sm:text-3xl">{formatCurrency(contractStats.totalBalanceDue)}</h3>
              <p className="text-xs text-[#9A5B00] mt-1 font-bold">تحصيل مطلوب</p>
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
                      <p className="text-gray-500 text-sm">لا توجد مهام مجدولة لهذا اليوم 🎉</p>
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
                                      <span className="text-gray-300">•</span>
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
                        <p className="text-xs text-gray-400 mt-2">جميع الفواتير مدفوعة 🎉</p>
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
                        
                        return (
                        <div 
                          key={contract.id} 
                          className={cn(
                            "relative flex flex-col justify-between gap-3 overflow-hidden rounded-xl border bg-white p-3 transition-all hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:p-4",
                            statusStyle.border,
                            statusStyle.bg
                          )}
                        >
                          {/* Status indicator bar */}
                          <div className={cn(
                            "absolute right-0 top-0 bottom-0 w-1.5",
                            statusStyle.badge.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500')
                          )} />

                          {canUnassignContracts && (
                            <div
                              className="mb-3 sm:mb-0 sm:ml-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Checkbox
                                checked={selectedBulkContractIds.includes(contract.id)}
                                onCheckedChange={() => toggleBulkContractSelection(contract.id)}
                                aria-label={`تحديد العقد ${contract.contract_number || contract.id}`}
                              />
                            </div>
                          )}
                          
                          <div 
                            className="mb-1 flex min-w-0 flex-1 cursor-pointer items-start gap-3 sm:mb-0 sm:items-center sm:gap-4"
                            onClick={() => navigate(`/contracts/${contract.contract_number || contract.id}`)}
                          >
                            <Avatar className="h-11 w-11 shrink-0 border-2 border-white shadow-sm ring-1 ring-[#DDE5EF] sm:h-12 sm:w-12">
                              <AvatarFallback className={cn("font-bold text-lg", statusStyle.badge)}>
                                {contract.customer_name?.[0] || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <h4 className="min-w-0 break-words text-sm font-black text-[#142033] transition-colors group-hover:text-[#1D4F7A] sm:text-base">
                                  {contract.customer_name || 'غير محدد'}
                                </h4>
                                <Badge variant="outline" className={cn("text-xs font-bold border-2", statusStyle.badge)}>
                                  <StatusIcon className="w-3 h-3 ml-1" />
                                  {statusStyle.label}
                                </Badge>
                              </div>
                              <p className="flex flex-wrap items-center gap-2 text-xs text-[#6A7688]">
                                <span className="font-semibold">#{contract.contract_number}</span>
                                <span className="text-gray-300">•</span>
                                {contract.customer_phone && (
                                  <>
                                    <a 
                                      href={`tel:${contract.customer_phone}`}
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Phone className="w-3 h-3" />
                                      {contract.customer_phone}
                                    </a>
                                    <span className="text-gray-300">•</span>
                                  </>
                                )}
                                <span className={cn(
                                  "font-medium",
                                  (contract.balance_due || 0) > 0 ? "text-amber-600" : "text-emerald-600"
                                )}>
                                  {(contract.balance_due || 0) > 0 ? `مستحق: ${formatCurrency(contract.balance_due || 0)}` : '✓ مدفوع بالكامل'}
                                </span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid w-full grid-cols-4 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:self-auto">
                            {/* زر الاتصال - متاح لجميع العقود */}
                            {contract.customer_phone && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-10 w-full rounded-lg bg-[#E9FBF6] p-0 text-[#0D876A] hover:bg-[#D8F7EE] hover:text-[#0D876A] sm:h-8 sm:w-8"
                                onClick={() => window.location.href = `tel:${contract.customer_phone}`}
                                title={`اتصال: ${contract.customer_phone}`}
                              >
                                <Phone className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {/* أزرار العمل - فقط للعقود النشطة */}
                            {contract.status === 'active' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-full rounded-lg bg-[#E9FBF6] p-0 text-[#0D876A] hover:bg-[#D8F7EE] hover:text-[#0D876A] sm:h-8 sm:w-8"
                                  onClick={() => {
                                     setSelectedPaymentCustomer({
                                       customerId: contract.customer_id,
                                       customerName: contract.customer_name || 'غير محدد',
                                       customerPhone: contract.customer_phone || null,
                                     });
                                     setSelectedContractId(contract.id);
                                     setShowPaymentDialog(true);
                                  }}
                                  title="تسجيل دفعة"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-full rounded-lg bg-[#EEF4FA] p-0 text-[#1D4F7A] hover:bg-[#DDEAF5] hover:text-[#173A63] sm:h-8 sm:w-8"
                                  onClick={() => {
                                     setSelectedContractId(contract.id);
                                     setShowNoteDialog(true);
                                  }}
                                  title="إضافة ملاحظة"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-10 w-full rounded-lg bg-[#EEF4FA] p-0 text-[#1D4F7A] hover:bg-[#DDEAF5] hover:text-[#173A63] sm:h-8 sm:w-8"
                                  onClick={() => {
                                     setSelectedContractId(contract.id);
                                     setShowFollowupDialog(true);
                                  }}
                                  title="جدولة متابعة"
                                >
                                  <Calendar className="w-4 h-4" />
                                </Button>
                                {(contract.balance_due || 0) > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="col-span-2 h-10 gap-1 rounded-lg border-purple-200 bg-purple-50 px-2 text-xs text-purple-700 hover:bg-purple-100 hover:text-purple-800 sm:col-span-1 sm:h-8"
                                    onClick={() => {
                                      setSelectedContractId(contract.id);
                                      setShowConvertToLegalDialog(true);
                                    }}
                                    title="تحويل للشؤون القانونية"
                                  >
                                    <Scale className="w-4 h-4" />
                                    قانونية
                                  </Button>
                                )}
                              </>
                            )}
                            {canUnassignContracts && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="col-span-2 h-10 gap-1 rounded-lg border-red-200 bg-red-50 px-2 text-xs text-red-700 hover:bg-red-100 hover:text-red-800 sm:col-span-1 sm:h-8"
                                onClick={() => {
                                  setSelectedContractId(contract.id);
                                  setShowUnassignDialog(true);
                                }}
                                title="إلغاء التعيين"
                              >
                                <XCircle className="w-4 h-4" />
                                إلغاء التعيين
                              </Button>
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
