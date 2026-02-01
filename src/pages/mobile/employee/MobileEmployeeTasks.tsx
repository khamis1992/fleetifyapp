/**
 * Mobile Employee Tasks Page
 * صفحة مهام الموظف
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeTasks } from '@/hooks/useEmployeeTasks';
import { MobileEmployeeLayout } from '@/components/mobile/employee/layout/MobileEmployeeLayout';
import { MobileEmployeeHeader } from '@/components/mobile/employee/layout/MobileEmployeeHeader';
import { MobileTaskItem } from '@/components/mobile/employee/cards/MobileTaskItem';
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ar } from 'date-fns/locale';

export const MobileEmployeeTasks: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { 
    tasks, 
    todayTasks,
    stats, 
    isLoading, 
    refetch,
    completeTask 
  } = useEmployeeTasks();

  // Filter tasks by selected date
  const tasksForDate = tasks.filter(task => {
    const taskDate = new Date(task.scheduled_date);
    return taskDate.toDateString() === selectedDate.toDateString();
  });

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return 'اليوم';
    if (isTomorrow(date)) return 'غداً';
    if (isYesterday(date)) return 'أمس';
    return format(date, 'EEEE d MMMM', { locale: ar });
  };

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  return (
    <MobileEmployeeLayout showFAB showBottomNav>
      <div className="space-y-6">
        {/* Header */}
        <div className="px-4 pt-4">
          <MobileEmployeeHeader
            title="المهام"
            subtitle={`${stats.totalTasks} مهمة`}
            showNotifications
            showRefresh
            onRefresh={refetch}
          />
        </div>

        {/* Date Selector */}
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handlePreviousDay}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </motion.button>

              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">
                  {getDateLabel(selectedDate)}
                </p>
                <p className="text-xs text-slate-500">
                  {format(selectedDate, 'd MMMM yyyy', { locale: ar })}
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleNextDay}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </motion.button>
            </div>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <div className="px-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-4"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  <p className="text-xs text-slate-500">المهام</p>
                </div>
                <p className="text-xl font-bold text-slate-900">
                  {tasksForDate.length}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs text-slate-500">مكتملة</p>
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  {tasksForDate.filter(t => t.status === 'completed').length}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-slate-500">متبقية</p>
                </div>
                <p className="text-xl font-bold text-amber-600">
                  {tasksForDate.filter(t => t.status !== 'completed').length}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tasks Timeline */}
        <div className="px-4 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-sm text-teal-600">جاري التحميل...</p>
              </div>
            </div>
          ) : tasksForDate.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-2xl p-8 text-center"
            >
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">
                لا توجد مهام لهذا اليوم
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isToday(selectedDate) ? 'استمتع بيومك! 🎉' : 'يوم خالٍ من المهام'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {tasksForDate.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                  >
                    <MobileTaskItem
                      task={task}
                      onComplete={() => handleCompleteTask(task.id)}
                      onClick={() => navigate(`/mobile/employee/tasks/${task.id}`)}
                      showCheckbox
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Quick Stats Summary */}
        {tasksForDate.length > 0 && (
          <div className="px-4 pb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-4 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90">نسبة الإنجاز</p>
                  <p className="text-2xl font-bold">
                    {tasksForDate.length > 0 
                      ? Math.round((tasksForDate.filter(t => t.status === 'completed').length / tasksForDate.length) * 100)
                      : 0}%
                  </p>
                </div>
                <CheckCircle className="w-12 h-12 opacity-20" strokeWidth={1.5} />
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </MobileEmployeeLayout>
  );
};

export default MobileEmployeeTasks;
