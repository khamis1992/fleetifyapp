/**
 * تنبيه مركزي لمهام التدقيق المعلقة
 * يظهر في منتصف الشاشة لجذب انتباه الموظف
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMyVerificationTasks } from '@/hooks/useVerificationTasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ClipboardCheck,
  X,
  ArrowLeft,
  Clock,
  AlertTriangle,
  User,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const VerificationTaskAlert: React.FC = () => {
  const navigate = useNavigate();
  const { data: tasks = [] } = useMyVerificationTasks();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastDismissedCount, setLastDismissedCount] = useState(0);

  // Show alert when there are pending tasks
  useEffect(() => {
    // Check if dismissed for this session
    const sessionDismissed = sessionStorage.getItem('verificationAlertDismissed');
    const dismissedCount = parseInt(sessionStorage.getItem('verificationAlertDismissedCount') || '0');
    
    if (tasks.length > 0) {
      // Show if not dismissed or if new tasks arrived
      if (!sessionDismissed || tasks.length > dismissedCount) {
        setIsVisible(true);
        setIsDismissed(false);
      }
    } else {
      setIsVisible(false);
    }
  }, [tasks.length]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('verificationAlertDismissed', 'true');
    sessionStorage.setItem('verificationAlertDismissedCount', tasks.length.toString());
  };

  const handleOpenTask = (taskId: string) => {
    // إغلاق النافذة أولاً ثم الانتقال
    setIsVisible(false);
    sessionStorage.setItem('verificationAlertDismissed', 'true');
    sessionStorage.setItem('verificationAlertDismissedCount', tasks.length.toString());
    
    // تأخير بسيط للسماح بإغلاق النافذة قبل الانتقال
    setTimeout(() => {
      navigate(`/legal/verify/${taskId}`);
    }, 100);
  };

  const handleOpenAllTasks = () => {
    // إغلاق النافذة أولاً ثم الانتقال
    setIsVisible(false);
    sessionStorage.setItem('verificationAlertDismissed', 'true');
    sessionStorage.setItem('verificationAlertDismissedCount', tasks.length.toString());
    
    // تأخير بسيط للسماح بإغلاق النافذة قبل الانتقال
    // الانتقال مباشرة لتبويب مهام التدقيق
    setTimeout(() => {
      navigate('/tasks?tab=verification');
    }, 100);
  };

  return (
    <AnimatePresence>
      {isVisible && tasks.length > 0 && (
        <motion.div
          key="verification-alert-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleDismiss}
        >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl mx-4"
        >
          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            {/* Header */}
            <div className="relative overflow-hidden bg-[#0f766e] p-5 text-white" dir="rtl">
              <div className="absolute inset-y-0 left-0 w-40 bg-white/10 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      تنبيه تدقيق
                    </div>
                    <h2 className="text-xl font-black leading-7 tracking-normal">مهام تحتاج انتباهك</h2>
                    <p className="mt-1 text-sm text-teal-50">
                      لديك <span className="font-bold text-white">{tasks.length}</span> مهمة معلقة تحتاج مراجعة قبل المتابعة القانونية
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-9 w-9 shrink-0 rounded-full text-white hover:bg-white/15 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-slate-50 p-4" dir="rtl">
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">قائمة مهام التدقيق</p>
                  <p className="text-xs text-slate-500">اضغط على أي عميل لفتح مهمة التدقيق مباشرة</p>
                </div>
                <Badge className="rounded-full bg-teal-100 px-3 py-1 text-teal-800 hover:bg-teal-100">
                  {tasks.length} معلقة
                </Badge>
              </div>

              <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1">
                {tasks.slice(0, 5).map((task: any, index: number) => {
                  const customerName = task.customer
                    ? `${task.customer.first_name} ${task.customer.last_name}`
                    : 'عميل غير معروف';

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
                      onClick={() => handleOpenTask(task.id)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold text-slate-950">{customerName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            {task.contract?.contract_number && (
                              <span className="inline-flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {task.contract.contract_number}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.created_at), 'd MMM', { locale: ar })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100">
                          معلقة
                        </Badge>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-colors group-hover:bg-teal-600 group-hover:text-white">
                          <ArrowLeft className="h-4 w-4" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {tasks.length > 5 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-500">
                    +{tasks.length - 5} مهام أخرى في صفحة مهام التدقيق
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div className="text-sm text-amber-900">
                    <p className="font-bold">مهم قبل رفع الدعاوى</p>
                    <p className="mt-1 text-amber-800">
                      أكمل التدقيق للتأكد من صحة بيانات العميل والعقد قبل أي إجراء قانوني.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t bg-white p-4" dir="rtl">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="h-11 flex-1 rounded-xl border-slate-200 bg-slate-50 font-bold text-slate-700 hover:bg-slate-100"
              >
                تذكيرني لاحقاً
              </Button>
              <Button
                onClick={handleOpenAllTasks}
                className="h-11 flex-1 gap-2 rounded-xl bg-teal-600 font-bold text-white hover:bg-teal-700"
              >
                <ClipboardCheck className="h-4 w-4" />
                عرض مهام التدقيق
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VerificationTaskAlert;
