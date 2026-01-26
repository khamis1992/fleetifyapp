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
          className="w-full max-w-lg mx-4"
        >
          <Card className="overflow-hidden border border-teal-500/20 shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <ClipboardCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">مهام تدقيق تحتاج انتباهك</h2>
                    <p className="text-sm text-white/80">
                      لديك {tasks.length} مهمة تدقيق معلقة
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 max-h-[400px] overflow-y-auto" dir="rtl">
              <div className="space-y-3">
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
                      className="flex items-center justify-between p-3 rounded-xl border border-teal-100 bg-teal-50/50 hover:bg-teal-50 hover:border-teal-500/30 transition-all cursor-pointer group"
                      onClick={() => handleOpenTask(task.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                          <User className="h-4 w-4 text-teal-700" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{customerName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {task.contract?.contract_number && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {task.contract.contract_number}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.created_at), 'd MMM', { locale: ar })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className="bg-teal-600 text-white text-xs hover:bg-teal-700">
                          معلقة
                        </Badge>
                        <ArrowLeft className="h-4 w-4 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </motion.div>
                  );
                })}

                {tasks.length > 5 && (
                  <p className="text-center text-sm text-gray-500">
                    +{tasks.length - 5} مهام أخرى
                  </p>
                )}
              </div>

              {/* Warning */}
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium">تنبيه هام</p>
                    <p className="text-amber-700 mt-1">
                      يرجى إكمال مهام التدقيق في أقرب وقت ممكن للتأكد من صحة بيانات العملاء قبل رفع الدعاوى.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-3" dir="rtl">
              <Button
                variant="outline"
                onClick={handleDismiss}
                className="flex-1 hover:bg-gray-100"
              >
                تذكيرني لاحقاً
              </Button>
              <Button
                onClick={handleOpenAllTasks}
                className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2"
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
