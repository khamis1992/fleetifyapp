import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
  Shield,
  Database
} from 'lucide-react';
import { ContractCreationState, ContractCreationStep } from '@/hooks/useContractCreation';
import { cn } from '@/lib/utils';

interface EnhancedContractCreationProgressProps {
  creationState: ContractCreationState;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

const getStepIcon = (step: ContractCreationStep) => {
  switch (step.status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'processing':
      return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return <Clock className="h-4 w-4 text-slate-400" />;
  }
};

const getStepColor = (step: ContractCreationStep) => {
  switch (step.status) {
    case 'completed':
      return 'bg-green-100 border-green-300 dark:bg-green-900/20';
    case 'failed':
      return 'bg-red-100 border-red-300 dark:bg-red-900/20';
    case 'processing':
      return 'bg-blue-100 border-blue-300 dark:bg-blue-900/20';
    case 'warning':
      return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/20';
    default:
      return 'bg-slate-50 border-slate-200 dark:bg-slate-900/20';
  }
};

const getProgressColor = (healthStatus: string) => {
  switch (healthStatus) {
    case 'good':
      return 'bg-green-500';
    case 'warning':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};

export const EnhancedContractCreationProgress: React.FC<EnhancedContractCreationProgressProps> = ({
  creationState,
  onRetry,
  onCancel,
  className
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [realTimeProgress, setRealTimeProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const completedSteps = creationState.steps.filter(step => step.status === 'completed').length;
  const totalSteps = creationState.steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  const hasFailedSteps = creationState.steps.some(step => step.status === 'failed');
  const hasWarnings = creationState.steps.some(step => step.status === 'warning');
  const isProcessing = creationState.isProcessing;

  // Simulate real-time progress for active steps
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        setRealTimeProgress(prev => {
          const target = progressPercentage;
          if (prev < target) {
            return Math.min(prev + 2, target);
          }
          return target;
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setRealTimeProgress(progressPercentage);
    }
  }, [isProcessing, progressPercentage]);

  // Estimate time remaining
  useEffect(() => {
    if (isProcessing && completedSteps > 0) {
      const avgTimePerStep = creationState.totalExecutionTime 
        ? creationState.totalExecutionTime / completedSteps 
        : 2000; // Default 2 seconds per step
      const remainingSteps = totalSteps - completedSteps;
      setEstimatedTimeRemaining(avgTimePerStep * remainingSteps);
    } else {
      setEstimatedTimeRemaining(null);
    }
  }, [isProcessing, completedSteps, totalSteps, creationState.totalExecutionTime]);

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds} ثانية`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} دقيقة`;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            حالة إنشاء العقد
            <Badge variant={hasFailedSteps ? "destructive" : hasWarnings ? "secondary" : "default"}>
              {completedSteps}/{totalSteps}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isProcessing && estimatedTimeRemaining && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(estimatedTimeRemaining)} متبقية
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={cn(
                "flex items-center gap-1",
                creationState.healthStatus === 'good' && "border-green-500 text-green-700",
                creationState.healthStatus === 'warning' && "border-yellow-500 text-yellow-700",
                creationState.healthStatus === 'error' && "border-red-500 text-red-700"
              )}
            >
              <Shield className="h-3 w-3" />
              {creationState.healthStatus === 'good' && 'سليم'}
              {creationState.healthStatus === 'warning' && 'تحذير'}
              {creationState.healthStatus === 'error' && 'خطأ'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>التقدم الإجمالي</span>
            <span>{Math.round(realTimeProgress)}%</span>
          </div>
          <Progress 
            value={realTimeProgress} 
            className={cn(
              "h-2 transition-all duration-300",
              getProgressColor(creationState.healthStatus)
            )}
          />
          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Zap className="h-3 w-3 text-blue-500" />
              جاري المعالجة...
            </div>
          )}
        </div>

        {/* Health Status Alert */}
        {(hasFailedSteps || hasWarnings) && (
          <Alert className={hasFailedSteps ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {hasFailedSteps ? (
                  <XCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <div>
                  <AlertTitle className="text-sm">
                    {hasFailedSteps ? 'فشل في بعض الخطوات' : 'يوجد تحذيرات'}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {hasFailedSteps 
                      ? 'يرجى مراجعة الأخطاء أدناه ومحاولة إعادة المعالجة'
                      : 'تم اكتشاف بعض المشاكل البسيطة التي لا تمنع المتابعة'
                    }
                  </AlertDescription>
                </div>
              </div>
              {onRetry && creationState.canRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  إعادة المحاولة
                </Button>
              )}
            </div>
          </Alert>
        )}

        {/* Individual Steps */}
        <div className="space-y-2">
          <h4 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            تفاصيل الخطوات
          </h4>
          <div className="space-y-1">
            {creationState.steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "rounded-lg border p-3 transition-all duration-200",
                  getStepColor(step)
                )}
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleStepExpansion(step.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-800 border">
                      <span className="text-xs font-medium">{index + 1}</span>
                    </div>
                    {getStepIcon(step)}
                    <div>
                      <p className="font-medium text-sm">{step.title}</p>
                      {step.executionTime && (
                        <p className="text-xs text-muted-foreground">
                          وقت التنفيذ: {step.executionTime}ms
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.retryCount && step.retryCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        المحاولة {step.retryCount}
                      </Badge>
                    )}
                    {expandedSteps.has(step.id) ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Step Details */}
                {expandedSteps.has(step.id) && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الحالة:</span>
                        <Badge variant="outline">
                          {step.status === 'completed' && 'مكتملة'}
                          {step.status === 'failed' && 'فاشلة'}
                          {step.status === 'processing' && 'قيد المعالجة'}
                          {step.status === 'warning' && 'تحذير'}
                          {step.status === 'pending' && 'في الانتظار'}
                        </Badge>
                      </div>
                      
                      {step.error && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">رسالة الخطأ:</span>
                          <div className="bg-red-100 dark:bg-red-900/20 rounded p-2 text-xs">
                            {step.error}
                          </div>
                        </div>
                      )}
                      
                      {step.warnings && step.warnings.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-muted-foreground">التحذيرات:</span>
                          <div className="space-y-1">
                            {step.warnings.map((warning, idx) => (
                              <div key={idx} className="bg-yellow-100 dark:bg-yellow-900/20 rounded p-2 text-xs">
                                {warning}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contract Information */}
        {creationState.contractId && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="font-medium text-sm text-green-800 dark:text-green-200">
                  تم إنشاء العقد بنجاح
                </p>
                <p className="text-xs text-green-600 dark:text-green-300">
                  معرف العقد: {creationState.contractId}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(onRetry || onCancel) && (
          <div className="flex justify-end gap-2 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" size="sm" onClick={onCancel}>
                إلغاء
              </Button>
            )}
            {onRetry && creationState.canRetry && (
              <Button size="sm" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                إعادة المحاولة
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};