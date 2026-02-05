/**
 * Employee Workspace Page - Redesigned
 * صفحة مساحة عمل الموظف - تصميم احترافي
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  MoreHorizontal,
  TrendingUp,
  Filter,
  XCircle,
  PauseCircle,
  Scale,
  PlayCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  QuickPaymentDialog,
  CallLogDialog,
  ScheduleFollowupDialog,
  AddNoteDialog,
} from '@/components/employee/dialogs';
import { ExportButton } from '@/components/shared/ExportButton';
import { exportEmployeeWorkspaceReport } from '@/utils/exports/employeeReport';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { VerificationTasksList } from '@/components/tasks/VerificationTasksList';

export const EmployeeWorkspace: React.FC = () => {
  const navigate = useNavigate();
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
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();

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
    refetch: refetchTasks
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

  // Quick Actions Configuration
  const quickActions = [
    { 
      icon: Phone, 
      label: 'تسجيل مكالمة', 
      onClick: () => setShowCallDialog(true),
      variant: 'default',
      className: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      icon: DollarSign, 
      label: 'تسجيل دفعة', 
      onClick: () => setShowPaymentDialog(true),
      variant: 'default',
      className: 'bg-emerald-600 hover:bg-emerald-700'
    },
    { 
      icon: Calendar, 
      label: 'جدولة موعد', 
      onClick: () => setShowFollowupDialog(true),
      variant: 'secondary',
      className: 'bg-purple-100 text-purple-700 hover:bg-purple-200'
    },
    { 
      icon: FileText, 
      label: 'ملاحظة جديدة', 
      onClick: () => setShowNoteDialog(true),
      variant: 'secondary',
      className: 'bg-[#8f51d2] hover:bg-[#8f51d2]/90'
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

  // Filter contracts based on search
  const filteredContracts = contracts.filter(c => 
    c.contract_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-8 font-sans" dir="rtl">
      
      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-teal-100 rounded-lg text-teal-700">
              <Briefcase className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">مساحة عملي</h1>
          </div>
          <p className="text-sm text-gray-500 mr-12">
            أهلاً بك، {user?.email?.split('@')[0]} - إليك ملخص أعمالك اليوم
          </p>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          
          <ExportButton
            onExportExcel={async () => {
              try {
                await exportEmployeeWorkspaceReport({
                  employeeName: user?.email?.split('@')[0] || 'موظف',
                  contracts,
                  tasks,
                  performance: performance || null,
                  performanceGrade: performanceGrade || null,
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
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={cn("ml-2 h-4 w-4", isLoading && "animate-spin")} />
            تحديث
          </Button>

           <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="h-9"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            الرئيسية
          </Button>
        </div>
      </header>

      {/* --- Stats Overview --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="shadow-sm border-gray-200 hover:border-teal-200 transition-colors">
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">إجمالي العقود</p>
              <h3 className="text-2xl font-bold text-gray-900">{contractStats.totalContracts}</h3>
              <p className="text-xs text-teal-600 mt-1 font-medium">{contractStats.activeContracts} عقد نشط</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 hover:border-teal-200 transition-colors">
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">المبالغ المستحقة</p>
              <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(contractStats.totalBalanceDue)}</h3>
              <p className="text-xs text-amber-600 mt-1 font-medium">تحصيل مطلوب</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 hover:border-teal-200 transition-colors">
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">مهام اليوم</p>
              <h3 className="text-2xl font-bold text-gray-900">{taskStats.todayTasks}</h3>
              <p className="text-xs text-emerald-600 mt-1 font-medium">{taskStats.completionRate}% نسبة الإنجاز</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200 hover:border-teal-200 transition-colors">
          <CardContent className="p-6 flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">نقاط الأداء</p>
              <h3 className="text-2xl font-bold text-gray-900">{performance ? Math.round(performance.performance_score) : 0}</h3>
              <p className="text-xs text-purple-600 mt-1 font-medium">{performanceGrade?.label_ar || 'جيد'}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <Star className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* --- Main Content (Left) --- */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-white border p-1 h-auto">
                <TabsTrigger value="overview" className="px-4 py-2 text-sm">نظرة عامة</TabsTrigger>
                <TabsTrigger value="collections" className="px-4 py-2 text-sm">التحصيل الشهري</TabsTrigger>
                <TabsTrigger value="contracts" className="px-4 py-2 text-sm">العقود ({contractStats.totalContracts})</TabsTrigger>
                <TabsTrigger value="tasks" className="px-4 py-2 text-sm">المهام ({taskStats.totalTasks})</TabsTrigger>
              </TabsList>
            </div>

            {/* View: Overview */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              
              {/* Priority Section */}
              {priorityContracts.length > 0 && (
                <Card className="border-l-4 border-l-amber-500 shadow-sm overflow-hidden">
                  <CardHeader className="bg-amber-50/30 pb-3 border-b border-amber-100/50">
                    <CardTitle className="text-sm font-bold text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      يحتاج اهتمامك الفوري
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {priorityContracts.slice(0, 3).map((contract, idx) => (
                      <div 
                        key={contract.id} 
                        className="flex items-center justify-between p-4 border-b last:border-0 hover:bg-amber-50/10 transition-colors cursor-pointer"
                        onClick={() => {
                           setSelectedContractId(contract.id);
                           // Optional: Open contract details or highlight
                        }}
                      >
                        <div className="flex items-center gap-4">
                           <div className="flex flex-col items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-600 text-xs font-bold">
                             {idx + 1}
                           </div>
                           <div>
                             <h4 className="font-semibold text-gray-900">{contract.customer_name}</h4>
                             <p className="text-xs text-gray-500">عقد #{contract.contract_number}</p>
                           </div>
                        </div>
                        <div className="text-left">
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
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-teal-600" />
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
                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                            task.status === 'completed' 
                              ? "bg-gray-50 border-gray-100 opacity-70" 
                              : "bg-white border-gray-100 hover:border-teal-200 hover:shadow-sm"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              task.status === 'completed' ? "bg-gray-300" : "bg-teal-500"
                            )} />
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                task.status === 'completed' ? "text-gray-500 line-through" : "text-gray-900"
                              )}>
                                {task.title_ar || task.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
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
                            <Button size="sm" variant="outline" className="h-8 text-xs hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200">
                              إنجاز
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50/50 rounded-xl border border-dashed">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-white border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500 mb-1">المستهدف هذا الشهر</p>
                    <h3 className="text-xl font-bold text-gray-900">{formatCurrency(collectionStats.totalDue)}</h3>
                  </CardContent>
                </Card>
                <Card className="bg-white border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500 mb-1">تم تحصيله</p>
                    <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(collectionStats.totalCollected)}</h3>
                    <Progress value={collectionStats.collectionRate} className="h-1.5 mt-2 bg-emerald-100" />
                  </CardContent>
                </Card>
                <Card className="bg-white border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-500 mb-1">المتبقي</p>
                    <h3 className="text-xl font-bold text-amber-600">{formatCurrency(collectionStats.totalPending)}</h3>
                  </CardContent>
                </Card>
              </div>

              {/* Collections List - Grouped by Customer */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      قائمة التحصيل الشهري
                    </CardTitle>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {groupedCollections.length} عميل
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    {groupedCollections.length > 0 ? (
                      <div className="space-y-3">
                        {groupedCollections.map((group) => {
                          const isExpanded = expandedCustomers.has(group.customer_id);
                          
                          return (
                            <div 
                              key={group.customer_id}
                              className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden hover:border-emerald-300 transition-all"
                            >
                              {/* Customer Header */}
                              <div 
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white hover:from-emerald-50 hover:to-white transition-all"
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <Avatar 
                                    className="h-12 w-12 border-2 border-emerald-200 shadow-sm cursor-pointer hover:border-emerald-400 transition-all"
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
                                  <div className="flex-1">
                                    <h4 
                                      className="font-bold text-gray-900 text-base mb-1 cursor-pointer hover:text-emerald-600 hover:underline transition-colors"
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
                                    <div className="flex items-center gap-3 text-xs text-gray-600">
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

                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/finance/payments/quick?customerId=${group.customer_id}&customerName=${encodeURIComponent(group.customer_name)}`);
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
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer group/invoice"
                                        onClick={() => navigate(`/contracts/${invoice.contract_number}`)}
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover/invoice:bg-emerald-100 group-hover/invoice:text-emerald-600 transition-colors">
                                            <FileText className="w-4 h-4" />
                                          </div>
                                          <div>
                                            <p className="text-sm font-semibold text-gray-900 group-hover/invoice:text-emerald-600 transition-colors">
                                              فاتورة #{invoice.invoice_number}
                                            </p>
                                            <p className="text-xs text-gray-500 group-hover/invoice:text-emerald-600 transition-colors">
                                              عقد #{invoice.contract_number}
                                            </p>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                          <div className="text-left">
                                            <p className="text-sm font-bold text-gray-900">
                                              {formatCurrency(invoice.amount - invoice.paid_amount)}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                              استحقاق: {new Date(invoice.due_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
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
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* View: Contracts */}
            <TabsContent value="contracts" className="mt-0">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      سجل العقود
                    </CardTitle>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="بحث برقم العقد أو الاسم..."
                        className="pr-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                      {filteredContracts.length > 0 ? filteredContracts.map((contract) => {
                        const statusStyle = getContractStatusStyle(contract.status);
                        const StatusIcon = statusStyle.icon;
                        
                        return (
                        <div 
                          key={contract.id} 
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border-2 hover:shadow-md transition-all group relative overflow-hidden",
                            statusStyle.border,
                            statusStyle.bg
                          )}
                        >
                          {/* Status indicator bar */}
                          <div className={cn(
                            "absolute right-0 top-0 bottom-0 w-1",
                            statusStyle.badge.split(' ')[0].replace('bg-', 'bg-').replace('-100', '-500')
                          )} />
                          
                          <div 
                            className="flex items-center gap-4 mb-3 sm:mb-0 cursor-pointer flex-1"
                            onClick={() => navigate(`/contracts/${contract.contract_number || contract.id}`)}
                          >
                            <Avatar className="h-12 w-12 border-2 shadow-sm">
                              <AvatarFallback className={cn("font-bold text-lg", statusStyle.badge)}>
                                {contract.customer_name?.[0] || 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                  {contract.customer_name || 'غير محدد'}
                                </h4>
                                <Badge variant="outline" className={cn("text-xs font-bold border-2", statusStyle.badge)}>
                                  <StatusIcon className="w-3 h-3 ml-1" />
                                  {statusStyle.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
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
                          
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {/* زر الاتصال - متاح لجميع العقود */}
                            {contract.customer_phone && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-teal-600 bg-teal-50 hover:bg-teal-100 hover:text-teal-700 rounded-full"
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
                                  className="h-8 w-8 p-0 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-full"
                                  onClick={() => {
                                     const customerName = contract.customer_name || '';
                                     const customerId = contract.customer_id;
                                     const phone = contract.customer_phone || '';
                                     navigate(`/finance/payments/quick?customerId=${customerId}&customerName=${encodeURIComponent(customerName)}&phone=${phone}`);
                                  }}
                                  title="تسجيل دفعة"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-purple-600 bg-purple-50 hover:bg-purple-100 hover:text-purple-700 rounded-full"
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
                                  className="h-8 w-8 p-0 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 rounded-full"
                                  onClick={() => {
                                     setSelectedContractId(contract.id);
                                     setShowFollowupDialog(true);
                                  }}
                                  title="جدولة متابعة"
                                >
                                  <Calendar className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}) : (
                        <div className="text-center py-12">
                           <p className="text-gray-500">لا توجد عقود مطابقة للبحث</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* View: Tasks */}
            <TabsContent value="tasks" className="mt-0">
               <Card className="shadow-sm">
                 <CardHeader>
                    <CardTitle className="text-lg font-bold">جميع المهام</CardTitle>
                    <CardDescription>عرض وإدارة جميع المهام المجدولة والسابقة</CardDescription>
                 </CardHeader>
                 <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {tasks.map((task) => (
                           <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <h4 className="font-medium text-gray-900">{task.title_ar || task.title}</h4>
                                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                       <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {task.scheduled_date}</span>
                                       <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {task.scheduled_time}</span>
                                    </div>
                                 </div>
                                 <Badge variant={task.status === 'completed' ? 'secondary' : 'outline'}>
                                    {task.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                                 </Badge>
                              </div>
                           </div>
                        ))}
                      </div>
                    </ScrollArea>
                 </CardContent>
               </Card>
            </TabsContent>
          </Tabs>

        </div>

        {/* --- Sidebar (Right) --- */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Verification Tasks */}
          <VerificationTasksList limit={5} />

          {/* Performance Detailed */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">تحليل الأداء</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">نسبة التحصيل</span>
                  <span className="font-bold text-gray-900">{performance ? Math.round(performance.collection_rate) : 0}%</span>
                </div>
                <Progress value={performance?.collection_rate || 0} className="h-2" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">إنجاز المهام</span>
                  <span className="font-bold text-gray-900">{performance ? Math.round(performance.followup_completion_rate) : 0}%</span>
                </div>
                <Progress value={performance?.followup_completion_rate || 0} className="h-2" />
              </div>
              
              <Separator />
              
              <div className="pt-2">
                <p className="text-xs text-gray-500 leading-relaxed">
                  أداؤك هذا الشهر {performanceGrade?.label_ar === 'ممتاز' ? 'رائع!' : 'جيد.'} استمر في متابعة العملاء المتأخرين لتحسين نسبة التحصيل لديك.
                </p>
              </div>

            </CardContent>
          </Card>

          {/* Activity Log (Simplified) */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">النشاط الأخير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative border-r border-gray-200 mr-2 space-y-6">
                {[1, 2, 3].map((_, i) => (
                  <div key={i} className="relative pr-6">
                    <div className="absolute -right-[5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-200 ring-4 ring-white" />
                    <p className="text-sm font-medium text-gray-900">تم تحديث حالة العقد #123{i}</p>
                    <p className="text-xs text-gray-500 mt-1">منذ {i + 2} ساعات</p>
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
        onOpenChange={setShowPaymentDialog}
        contracts={contractsForDialogs}
        preselectedContractId={selectedContractId}
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
    </div>
  );
};

export default EmployeeWorkspace;
