/**
 * Mobile Employee Home Page
 * الصفحة الرئيسية لتطبيق مساحة عمل الموظف
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  DollarSign,
  CheckCircle,
  Star,
  AlertCircle,
  TrendingUp,
  Phone,
  Calendar,
  User,
  Car,
  CreditCard,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeStats } from '@/hooks/useEmployeeStats';
import { useEmployeeContracts } from '@/hooks/useEmployeeContracts';
import { useEmployeeTasks } from '@/hooks/useEmployeeTasks';
import { MobileEmployeeLayout } from '@/components/mobile/employee/layout/MobileEmployeeLayout';
import { MobileEmployeeHeader } from '@/components/mobile/employee/layout/MobileEmployeeHeader';
import { MobileStatsCard } from '@/components/mobile/employee/cards/MobileStatsCard';
import { QuickPaymentModal } from '@/components/mobile/employee/dialogs/QuickPaymentModal';
import { CallLogModal } from '@/components/mobile/employee/dialogs/CallLogModal';
import { ScheduleFollowupModal } from '@/components/mobile/employee/dialogs/ScheduleFollowupModal';
import { AddNoteModal } from '@/components/mobile/employee/dialogs/AddNoteModal';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const MobileEmployeeHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatCurrency } = useCurrencyFormatter();
  const { stats, isLoading, refetchAll } = useEmployeeStats();
  const { priorityContracts } = useEmployeeContracts();
  const { todayTasks, completeTask } = useEmployeeTasks();

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showFollowupModal, setShowFollowupModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string>();

  // Get user's first name
  const getUserName = () => {
    return user?.email?.split('@')[0] || 'موظف';
  };

  // Get current date in Arabic
  const getCurrentDate = () => {
    return format(new Date(), 'EEEE d MMMM yyyy', { locale: ar });
  };

  // Handle FAB actions
  useEffect(() => {
    const handleFABAction = (event: CustomEvent) => {
      const { action } = event.detail;
      
      switch (action) {
        case 'call':
          setShowCallModal(true);
          break;
        case 'payment':
          setShowPaymentModal(true);
          break;
        case 'followup':
          setShowFollowupModal(true);
          break;
        case 'note':
          setShowNoteModal(true);
          break;
      }
    };

    window.addEventListener('fab-action', handleFABAction as EventListener);
    return () => {
      window.removeEventListener('fab-action', handleFABAction as EventListener);
    };
  }, []);

  return (
    <MobileEmployeeLayout showFAB showBottomNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="px-4 pt-4">
          <MobileEmployeeHeader
            title={`مرحباً، ${getUserName()}`}
            subtitle={getCurrentDate()}
            showNotifications
            showRefresh
            onRefresh={refetchAll}
          />
        </div>

        {/* Stats Cards */}
        <div className="px-4">
          <div className="grid grid-cols-2 gap-3">
            <MobileStatsCard
              icon={FileText}
              label="إجمالي العقود"
              value={stats.totalContracts}
              subtitle={`${stats.activeContracts} عقد نشط`}
              color="from-blue-500 to-blue-600"
              onClick={() => navigate('/mobile/employee/contracts')}
            />
            <MobileStatsCard
              icon={DollarSign}
              label="المبالغ المستحقة"
              value={formatCurrency(stats.totalBalanceDue)}
              subtitle="تحصيل مطلوب"
              color="from-amber-500 to-amber-600"
              onClick={() => navigate('/mobile/employee/collections')}
            />
            <MobileStatsCard
              icon={CheckCircle}
              label="مهام اليوم"
              value={stats.todayTasks}
              subtitle={`${stats.completionRate}% نسبة الإنجاز`}
              color="from-emerald-500 to-emerald-600"
              onClick={() => navigate('/mobile/employee/tasks')}
            />
            <MobileStatsCard
              icon={Star}
              label="نقاط الأداء"
              value={stats.performanceScore}
              subtitle={stats.performanceGrade_ar}
              color="from-purple-500 to-purple-600"
              onClick={() => navigate('/mobile/employee/performance')}
            />
          </div>
        </div>

        {/* Priority Alerts */}
        {priorityContracts.length > 0 && (
          <div className="px-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl border border-amber-200/50 rounded-3xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-bold text-amber-900">
                  يحتاج اهتمامك الفوري
                </h2>
                <span className="mr-auto bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {priorityContracts.length}
                </span>
              </div>

              <div className="space-y-3">
                {priorityContracts.slice(0, 3).map((contract, index) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/mobile/employee/contracts/${contract.id}`)}
                    className="flex items-center gap-3 p-3 bg-amber-50/50 rounded-2xl border border-amber-100 hover:bg-amber-50 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {/* Number Badge */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {contract.customer_name}
                      </p>
                      <p className="text-xs text-slate-600">
                        عقد #{contract.contract_number}
                      </p>
                    </div>

                    {/* Info */}
                    <div className="text-left">
                      <span className="px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold">
                        {contract.priority_reason_ar}
                      </span>
                      {contract.priority_reason === 'overdue_payment' && (
                        <p className="text-xs text-red-600 font-bold mt-1">
                          {contract.days_overdue} يوم
                        </p>
                      )}
                      {contract.priority_reason === 'high_balance' && (
                        <p className="text-xs text-red-600 font-bold mt-1">
                          {formatCurrency(contract.balance_due)}
                        </p>
                      )}
                    </div>

                    <ChevronLeft className="w-4 h-4 text-slate-400" />
                  </motion.div>
                ))}
              </div>

              {priorityContracts.length > 3 && (
                <button
                  onClick={() => navigate('/mobile/employee/contracts?priority=true')}
                  className="w-full mt-3 py-2 text-sm text-amber-700 font-medium hover:text-amber-800 transition-colors"
                >
                  عرض الكل ({priorityContracts.length})
                </button>
              )}
            </motion.div>
          </div>
        )}

        {/* Today's Tasks */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">📅 مهام اليوم</h2>
            <button
              onClick={() => navigate('/mobile/employee/tasks')}
              className="text-sm text-teal-600 font-medium"
            >
              عرض الكل
            </button>
          </div>

          {todayTasks.length > 0 ? (
            <div className="space-y-3">
              {todayTasks.slice(0, 5).map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4',
                    task.status === 'completed' && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => task.status !== 'completed' && completeTask(task.id)}
                      className={cn(
                        'flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                        task.status === 'completed'
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300 hover:border-teal-500'
                      )}
                    >
                      {task.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />
                      )}
                    </motion.button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 font-medium">
                          {task.scheduled_time || '09:00'}
                        </span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                        <span className={cn(
                          'text-xs font-medium',
                          task.priority === 'urgent' && 'text-red-600',
                          task.priority === 'high' && 'text-amber-600',
                          task.priority === 'medium' && 'text-blue-600',
                          task.priority === 'low' && 'text-slate-500'
                        )}>
                          {task.priority === 'urgent' && '🔴 عاجل'}
                          {task.priority === 'high' && '🟠 مهم'}
                          {task.priority === 'medium' && '🔵 متوسط'}
                          {task.priority === 'low' && '⚪ عادي'}
                        </span>
                      </div>

                      <p className={cn(
                        'text-sm font-medium mb-1',
                        task.status === 'completed' 
                          ? 'text-slate-500 line-through' 
                          : 'text-slate-900'
                      )}>
                        {task.title_ar || task.title}
                      </p>

                      {task.customer_name && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <User className="w-3 h-3" />
                          <span>{task.customer_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-8 text-center"
            >
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">لا توجد مهام لهذا اليوم 🎉</p>
              <p className="text-xs text-slate-500 mt-1">استمتع بيومك!</p>
            </motion.div>
          )}
        </div>

        {/* Quick Stats Bar */}
        <div className="px-4 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <p className="text-xs text-slate-500">التحصيل</p>
                </div>
                <p className="text-lg font-bold text-teal-600">
                  {stats.collectionRate}%
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-slate-500">المهام</p>
                </div>
                <p className="text-lg font-bold text-emerald-600">
                  {stats.completionRate}%
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-slate-500">المكالمات</p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {stats.callsLogged}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <QuickPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        preselectedContractId={selectedContractId}
      />
      <CallLogModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        preselectedContractId={selectedContractId}
      />
      <ScheduleFollowupModal
        isOpen={showFollowupModal}
        onClose={() => setShowFollowupModal(false)}
        preselectedContractId={selectedContractId}
      />
      <AddNoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        preselectedContractId={selectedContractId}
      />
    </MobileEmployeeLayout>
  );
};

export default MobileEmployeeHome;
