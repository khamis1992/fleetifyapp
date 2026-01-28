/**
 * Employee Workspace Page - Redesigned (Bento Style)
 * صفحة مساحة عمل الموظف - تصميم حديث
 */

import React, { useState } from 'react';
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
  Car,
  FileText,
  DollarSign,
  Calendar,
  Search,
  Star,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useEmployeeTasks } from '@/hooks/useEmployeeTasks';
import { useEmployeePerformance } from '@/hooks/useEmployeePerformance';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  QuickPaymentDialog,
  CallLogDialog,
  ScheduleFollowupDialog,
  AddNoteDialog,
} from '@/components/employee/dialogs';

// --- Shared Components ---

const GlassCard = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay, type: "spring", bounce: 0.4 }}
    className={cn(
      "bg-white/70 backdrop-blur-xl border border-white/40 shadow-sm rounded-3xl overflow-hidden",
      className
    )}
  >
    {children}
  </motion.div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
  <GlassCard className="p-6 flex flex-col justify-between h-full group hover:shadow-md transition-all duration-300" delay={delay}>
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {subtitle && (
        <span className={cn("text-xs font-bold px-2 py-1 rounded-full bg-white/50", 
          subtitle.includes('متأخر') ? 'text-red-600 bg-red-50' : 'text-neutral-500'
        )}>
          {subtitle}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-2xl font-black text-neutral-800 mb-1">{value}</h3>
      <p className="text-xs font-medium text-neutral-500">{title}</p>
    </div>
  </GlassCard>
);

const ActionButton = ({ icon: Icon, label, color, onClick }: any) => (
  <motion.button
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-white/50 hover:bg-white/80 border border-white/60 rounded-2xl transition-all shadow-sm gap-3 group"
  >
    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-all", color)}>
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-xs font-bold text-neutral-700">{label}</span>
  </motion.button>
);

export const EmployeeWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const [activeTab, setActiveTab] = useState<'overview' | 'contracts' | 'tasks'>('overview');
  
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

  const isLoading = isLoadingContracts || isLoadingTasks || isLoadingPerformance;

  const handleRefresh = () => {
    refetchContracts();
    refetchTasks();
    refetchPerformance();
  };

  // Quick Actions Configuration
  const quickActions = [
    { 
      icon: Phone, 
      label: 'مكالمة', 
      color: 'bg-gradient-to-br from-blue-500 to-blue-600',
      onClick: () => setShowCallDialog(true)
    },
    { 
      icon: DollarSign, 
      label: 'دفعة', 
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      onClick: () => setShowPaymentDialog(true)
    },
    { 
      icon: Calendar, 
      label: 'موعد', 
      color: 'bg-gradient-to-br from-purple-500 to-purple-600',
      onClick: () => setShowFollowupDialog(true)
    },
    { 
      icon: FileText, 
      label: 'ملاحظة', 
      color: 'bg-gradient-to-br from-amber-500 to-amber-600',
      onClick: () => setShowNoteDialog(true)
    },
  ];

  // Prepare contracts data for dialogs
  const contractsForDialogs = contracts.map(contract => ({
    id: contract.id,
    contract_number: contract.contract_number || '',
    customer_name: contract.customers?.first_name_ar || contract.customers?.company_name_ar || 'غير محدد',
    customer_id: contract.customer_id,
    balance_due: contract.balance_due || 0,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200 p-6 font-sans" dir="rtl">
      
      {/* --- Header --- */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 text-white">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-neutral-900">مساحة عملي</h1>
              <p className="text-sm text-neutral-500 font-medium">أهلاً بك، {user?.email?.split('@')[0]}</p>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <ArrowRight className="ml-2 h-4 w-4" />
            الرئيسية
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-white/50 backdrop-blur-md border-neutral-200 hover:bg-white text-neutral-600 rounded-xl"
          >
            <RefreshCw className={cn("ml-2 h-4 w-4", isLoading && "animate-spin")} />
            تحديث
          </Button>
        </div>
      </header>

      {/* --- Main Layout --- */}
      <div className="grid grid-cols-12 gap-6">
        
        {/* Left Column (Stats & Main Content) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              title="إجمالي العقود" 
              value={contractStats.totalContracts} 
              subtitle={`${contractStats.activeContracts} نشط`}
              icon={FileText} 
              color="bg-blue-500" 
              delay={0.1}
            />
            <StatCard 
              title="المبالغ المستحقة" 
              value={formatCurrency(contractStats.totalBalanceDue)} 
              subtitle={contractStats.totalBalanceDue > 0 ? "متأخر" : "لا يوجد"}
              icon={DollarSign} 
              color="bg-amber-500" 
              delay={0.2}
            />
            <StatCard 
              title="مهام اليوم" 
              value={`${taskStats.todayTasks}`} 
              subtitle={`${taskStats.completionRate}% منجز`}
              icon={CheckCircle} 
              color="bg-emerald-500" 
              delay={0.3}
            />
            <StatCard 
              title="نقاط الأداء" 
              value={performance ? Math.round(performance.performance_score) : 0} 
              subtitle={performanceGrade?.label_ar}
              icon={Star} 
              color="bg-purple-500" 
              delay={0.4}
            />
          </div>

          {/* Tasks & Priorities Section */}
          <GlassCard className="min-h-[500px]" delay={0.5}>
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex gap-2 bg-neutral-100 p-1 rounded-xl">
                {['overview', 'contracts', 'tasks'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      activeTab === tab 
                        ? "bg-white text-teal-600 shadow-sm" 
                        : "text-neutral-500 hover:text-neutral-700"
                    )}
                  >
                    {tab === 'overview' && 'نظرة عامة'}
                    {tab === 'contracts' && `العقود (${contractStats.totalContracts})`}
                    {tab === 'tasks' && `المهام (${taskStats.totalTasks})`}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreHorizontal className="w-5 h-5 text-neutral-400" />
              </Button>
            </div>

            <ScrollArea className="h-[450px] p-6">
              <AnimatePresence mode="wait">
                
                {/* View: Overview */}
                {activeTab === 'overview' && (
                  <motion.div 
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* Priority Contracts */}
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        يحتاج اهتمامك
                      </h3>
                      {priorityContracts.length > 0 ? (
                        <div className="space-y-3">
                          {priorityContracts.slice(0, 3).map((contract, idx) => (
                            <div key={contract.id} className="group p-4 rounded-2xl bg-gradient-to-r from-red-50/50 to-transparent border border-red-100 hover:border-red-200 transition-all cursor-pointer">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-lg">
                                    {contract.priority_reason === 'overdue_payment' ? '💰' : '⚠️'}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-neutral-900">{contract.customer_name}</h4>
                                    <p className="text-xs text-neutral-500 mt-0.5">عقد #{contract.contract_number}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-white/80 border-red-200 text-red-700 text-[10px]">
                                  {contract.priority_reason_ar}
                                </Badge>
                              </div>
                              <div className="mt-3 flex items-center gap-4 text-xs font-medium text-neutral-600">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> تأخير {contract.days_overdue} يوم</span>
                                <span className="flex items-center gap-1 text-red-600 font-bold"><DollarSign className="w-3 h-3" /> {formatCurrency(contract.balance_due)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                          <p className="text-sm text-neutral-500">لا توجد عقود تحتاج اهتمام فوري 🎉</p>
                        </div>
                      )}
                    </div>

                    {/* Today's Tasks */}
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        مهام اليوم
                      </h3>
                      {todayTasks.length > 0 ? (
                        <div className="space-y-3">
                          {todayTasks.map((task, idx) => (
                            <div key={task.id} className="flex items-center p-3 bg-white rounded-xl border border-neutral-100 shadow-sm hover:shadow-md transition-all">
                              <div className={cn("w-2 h-10 rounded-full mr-3", 
                                task.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'
                              )} />
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-neutral-800 line-clamp-1">{task.title_ar || task.title}</h4>
                                <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.scheduled_time || '09:00 ص'}</span>
                                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {task.customer_name}</span>
                                </div>
                              </div>
                              <Button size="sm" variant={task.status === 'completed' ? "ghost" : "default"} className={cn("rounded-lg h-8 text-xs", task.status === 'completed' && "text-emerald-600")}>
                                {task.status === 'completed' ? <CheckCircle className="w-4 h-4" /> : "إنجاز"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
                          <p className="text-sm text-neutral-500">لا مهام مجدولة لليوم</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* View: Contracts List */}
                {activeTab === 'contracts' && (
                  <motion.div
                    key="contracts"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className="relative mb-4">
                      <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="بحث في عقودي..." 
                        className="w-full bg-neutral-50 border-none rounded-xl py-2.5 pr-10 pl-4 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none"
                      />
                    </div>
                    {contracts.map((contract) => (
                      <div key={contract.id} className="p-4 bg-white rounded-2xl border border-neutral-100 shadow-sm hover:border-teal-200 transition-all cursor-pointer group">
                        <div className="flex justify-between">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg">
                              👤
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-neutral-900 group-hover:text-teal-600 transition-colors">
                                {contract.customers?.first_name_ar || contract.customers?.company_name_ar}
                              </h4>
                              <p className="text-xs text-neutral-500">#{contract.contract_number}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("h-6", 
                            contract.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-neutral-50 text-neutral-600"
                          )}>
                            {contract.status === 'active' ? 'نشط' : contract.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

              </AnimatePresence>
            </ScrollArea>
          </GlassCard>

        </div>

        {/* Right Column (Sidebar) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Performance Card */}
          <GlassCard className="relative p-6 bg-gradient-to-b from-[#11A798] to-[#2FC6B5] text-white border-none" delay={0.6}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10" />
            
            <div className="relative z-10 text-center mb-6">
              <h3 className="text-sm font-medium text-teal-100 mb-2">أداؤك الشهري</h3>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-5xl font-black">{performance ? Math.round(performance.performance_score) : 0}</span>
                <span className="text-xl text-teal-200">/ 100</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold">
                <Star className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                {performanceGrade?.label_ar || 'جيد'}
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-teal-100">
                  <span>نسبة التحصيل</span>
                  <span>{performance ? Math.round(performance.collection_rate) : 0}%</span>
                </div>
                <Progress value={performance?.collection_rate || 0} className="h-2 bg-teal-900/30" indicatorClassName="bg-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-teal-100">
                  <span>إنجاز المهام</span>
                  <span>{performance ? Math.round(performance.followup_completion_rate) : 0}%</span>
                </div>
                <Progress value={performance?.followup_completion_rate || 0} className="h-2 bg-teal-900/30" indicatorClassName="bg-blue-400" />
              </div>
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-5" delay={0.7}>
            <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600" />
              إجراء سريع
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action, idx) => (
                <ActionButton key={idx} {...action} />
              ))}
            </div>
          </GlassCard>

          {/* Activity Log Preview */}
          <GlassCard className="p-5" delay={0.8}>
            <h3 className="text-sm font-bold text-neutral-900 mb-4">آخر النشاطات</h3>
            <div className="space-y-4">
              {[1, 2].map((_, i) => (
                <div key={i} className="flex gap-3 relative pb-4 border-l border-neutral-200 last:border-0 last:pb-0 mr-1.5 pr-4">
                  <div className="absolute -right-1.5 top-0 w-3 h-3 rounded-full bg-neutral-200 border-2 border-white ring-1 ring-neutral-100" />
                  <div>
                    <p className="text-xs text-neutral-800 font-medium">تم تسجيل دفعة جديدة</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">منذ 2 ساعة • عقد #1234</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

        </div>
      </div>

      {/* Dialogs */}
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
