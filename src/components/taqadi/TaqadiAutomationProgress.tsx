/**
 * Taqadi Automation Progress Component
 * Displays real-time progress of form filling automation
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Check,
  X,
  Loader2,
  AlertCircle,
  ExternalLink,
  Copy,
  Download,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AutomationState, AutomationStatus } from '@/hooks/useTaqadiAutomation';

interface TaqadiAutomationProgressProps {
  state: AutomationState;
  onCancel?: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  className?: string;
}

// Status configurations
const STATUS_CONFIG: Record<AutomationStatus, {
  color: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  showProgress?: boolean;
}> = {
  idle: {
    color: 'gray',
    icon: <Loader2 className="h-5 w-5" />,
    title: 'جاهز للبدء',
    description: 'اضغط على "بدء الأتمتة" للبدء',
  },
  preparing: {
    color: 'blue',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    title: 'جاري التحضير...',
    description: 'جاري استخراج وتجهيز البيانات',
    showProgress: true,
  },
  ready: {
    color: 'green',
    icon: <Check className="h-5 w-5" />,
    title: 'البيانات جاهزة',
    description: 'تم فتح نظام تقاضي - استخدم Bookmarklet',
  },
  connecting: {
    color: 'blue',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    title: 'جاري الاتصال...',
    description: 'جاري الاتصال بنظام تقاضي',
    showProgress: true,
  },
  logging_in: {
    color: 'amber',
    icon: <Loader2 className="h-5 w-5 animate-pulse" />,
    title: 'في انتظار تسجيل الدخول...',
    description: 'يرجى تسجيل الدخول في نظام تقاضي',
  },
  filling: {
    color: 'purple',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    title: 'جاري ملء النموذج...',
    description: 'جاري تعبئة حقول النموذج تلقائياً',
    showProgress: true,
  },
  uploading: {
    color: 'purple',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    title: 'جاري رفع المستندات...',
    description: 'جاري رفع المستندات المرفقة',
    showProgress: true,
  },
  reviewing: {
    color: 'green',
    icon: <Check className="h-5 w-5" />,
    title: 'جاهز للمراجعة',
    description: 'تم ملء النموذج - يرجى المراجعة والإرسال',
  },
  submitting: {
    color: 'blue',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    title: 'جاري التقديم...',
    description: 'جاري إرسال الدعوى',
  },
  completed: {
    color: 'green',
    icon: <Check className="h-5 w-5" />,
    title: 'تم بنجاح! ✅',
    description: 'تم إرسال الدعوى بنجاح',
  },
  failed: {
    color: 'red',
    icon: <X className="h-5 w-5" />,
    title: 'فشلت الأتمتة',
    description: 'حدث خطأ أثناء الأتمتة',
  },
  cancelled: {
    color: 'gray',
    icon: <X className="h-5 w-5" />,
    title: 'تم الإلغاء',
    description: 'تم إلغاء عملية الأتمتة',
  },
};

export function TaqadiAutomationProgress({
  state,
  onCancel,
  onRetry,
  onDownload,
  className = '',
}: TaqadiAutomationProgressProps) {
  const config = STATUS_CONFIG[state.status];

  // Handle bookmarklet copy
  const handleCopyBookmarklet = async () => {
    // This would need the bookmarklet code - for now show alert
    toast.info('Bookmarklet', {
      description: 'قم بسحب زر Bookmarklet إلى شريط المفضلة',
    });
  };

  return (
    <AnimatePresence>
      {(state.status !== 'idle') && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={className}
        >
          <Card className={`border-2 border-${config.color}-200 bg-${config.color}-50/50`}>
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${config.color}-100 rounded-lg text-${config.color}-600`}>
                    {config.icon}
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg text-${config.color}-900`}>
                      {config.title}
                    </h3>
                    <p className={`text-sm text-${config.color}-700`}>
                      {config.description}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <Badge variant="outline" className={`border-${config.color}-300 text-${config.color}-700`}>
                  {state.status}
                </Badge>
              </div>

              {/* Progress Bar */}
              {config.showProgress && (
                <div className="mb-4">
                  <Progress value={state.progress} className="h-2" />
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>التقدم</span>
                    <span>{state.progress}%</span>
                  </div>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2 mb-4">
                {state.steps.map((step, index) => {
                  const isCurrentStep = index === state.currentStep;
                  const isCompleted = step.status === 'completed';
                  const isFailed = step.status === 'failed';

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center gap-3 p-2 rounded-lg ${
                        isCurrentStep ? `bg-${config.color}-100` : ''
                      } ${isFailed ? 'bg-red-50' : ''} ${isCompleted ? 'bg-green-50' : ''}`}
                    >
                      {/* Step Icon */}
                      <div className="flex-shrink-0">
                        {step.status === 'pending' && (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                        {step.status === 'running' && (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        )}
                        {step.status === 'completed' && (
                          <Check className="w-5 h-5 text-green-600" />
                        )}
                        {step.status === 'failed' && (
                          <X className="w-5 h-5 text-red-600" />
                        )}
                      </div>

                      {/* Step Name */}
                      <span className={`text-sm flex-1 ${
                        isFailed ? 'text-red-700' : isCompleted ? 'text-green-700' : 'text-gray-700'
                      }`}>
                        {step.name}
                      </span>

                      {/* Step Error */}
                      {step.error && (
                        <span className="text-xs text-red-600">{step.error}</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Error Display */}
              {(state.status === 'failed' || state.status === 'cancelled') && state.error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              {/* Session URL (when ready) */}
              {state.sessionUrl && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    تم فتح نظام تقاضي في نافذة جديدة. بعد تسجيل الدخول، اضغط على Bookmarklet لملء النموذج.
                  </AlertDescription>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open(state.sessionUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 ml-2" />
                    فتح تقاضي
                  </Button>
                </Alert>
              )}

              {/* Success */}
              {state.status === 'completed' && state.caseReference && (
                <Alert className="mb-4 bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    تم إرسال الدعوى بنجاح! رقم المرجع: {state.caseReference}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {/* Cancel Button */}
                {onCancel && (state.status === 'preparing' || state.status === 'connecting') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 ml-2" />
                    إلغاء
                  </Button>
                )}

                {/* Retry Button */}
                {onRetry && (state.status === 'failed' || state.status === 'cancelled') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                  >
                    <RotateCcw className="h-4 w-4 ml-2" />
                    إعادة المحاولة
                  </Button>
                )}

                {/* Download Button */}
                {onDownload && state.data && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownload}
                  >
                    <Download className="h-4 w-4 ml-2" />
                    تحميل البيانات
                  </Button>
                )}

                {/* Bookmarklet Info */}
                {state.status === 'ready' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyBookmarklet}
                  >
                    <Copy className="h-4 w-4 ml-2" />
                    تعليمات Bookmarklet
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TaqadiAutomationProgress;
