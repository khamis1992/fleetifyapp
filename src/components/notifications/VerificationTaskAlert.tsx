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
          <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Header */}
            <div className="relative overflow-hidden bg-primary p-5 text-primary-foreground" dir="rtl">
              <div className="absolute inset-y-0 left-0 w-40 bg-primary-foreground/10 blur-3xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/25">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold text-primary-foreground/90 ring-1 ring-primary-foreground/20">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      تنبيه تدقيق
                    </div>
                    <h2 className="text-xl font-black leading-7 tracking-normal">مهام تحتاج انتباهك</h2>
                    <p className="mt-1 text-sm text-primary-foreground/85">
                      لديك <span className="font-bold text-primary-foreground">{tasks.length}</span> مهمة معلقة تحتاج مراجعة قبل المتابعة القانونية
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="h-9 w-9 shrink-0 rounded-full text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="bg-background p-4" dir="rtl">
              <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-card-foreground">قائمة مهام التدقيق</p>
                  <p className="text-xs text-muted-foreground">اضغط على أي عميل لفتح مهمة التدقيق مباشرة</p>
                </div>
                <Badge className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-primary hover:bg-primary/10">
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
                      className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card-hover hover:shadow-md"
                      onClick={() => handleOpenTask(task.id)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold text-card-foreground">{customerName}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                        <Badge className="rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-bold text-warning hover:bg-warning/10">
                          معلقة
                        </Badge>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                          <ArrowLeft className="h-4 w-4" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {tasks.length > 5 && (
                  <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
                    +{tasks.length - 5} مهام أخرى في صفحة مهام التدقيق
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="mt-3 rounded-xl border border-warning/20 bg-warning/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <div className="text-sm text-card-foreground">
                    <p className="font-bold">مهم قبل رفع الدعاوى</p>
                    <p className="mt-1 text-muted-foreground">
                      أكمل التدقيق للتأكد من صحة بيانات العميل والعقد قبل أي إجراء قانوني.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border bg-card p-4" dir="rtl">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="h-11 flex-1 rounded-xl border-border bg-background font-bold text-foreground hover:bg-muted"
              >
                تذكيرني لاحقاً
              </Button>
              <Button
                onClick={handleOpenAllTasks}
                className="h-11 flex-1 gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/90"
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
