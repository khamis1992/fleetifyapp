import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Save,
  X,
  Lightbulb,
} from 'lucide-react';
import { useFinanceWorkflow } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Workflow Engine
 * محرك تدفق العمل للعمليات المالية المتسلسلة
 * 
 * يدعم:
 * - خطوات متعددة مع validation
 * - حفظ تلقائي للبيانات
 * - رجوع وتقدم بين الخطوات
 * - اقتراحات ذكية في كل خطوة
 * - معاينة قبل التنفيذ
 */

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<WorkflowStepProps>;
  validation?: (data: any) => { valid: boolean; errors?: string[] };
  autoAdvance?: boolean;
  autoActions?: ((data: any) => Promise<void>)[];
  help?: string;
}

export interface WorkflowStepProps {
  data: Record<string, any>;
  onUpdate: (newData: Record<string, any>) => void;
  onNext: () => void;
  onBack: () => void;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  steps: WorkflowStep[];
  onComplete: (data: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}

interface WorkflowEngineProps {
  workflow: Workflow;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const WorkflowEngine: React.FC<WorkflowEngineProps> = ({
  workflow,
  onComplete,
  onCancel,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<Record<string, any>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { workflowData, updateData, completeWorkflow } = useFinanceWorkflow();

  const currentStep = workflow.steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === workflow.steps.length - 1;
  const progress = ((currentStepIndex + 1) / workflow.steps.length) * 100;

  // تحميل البيانات المحفوظة
  useEffect(() => {
    if (workflowData && Object.keys(workflowData).length > 0) {
      setData(workflowData);
    }
  }, [workflowData]);

  // حفظ تلقائي
  useEffect(() => {
    if (Object.keys(data).length > 0) {
      updateData(data);
    }
  }, [data, updateData]);

  const handleUpdate = useCallback((newData: Record<string, any>) => {
    setData(prev => ({ ...prev, ...newData }));
    setErrors([]);
  }, []);

  const validateCurrentStep = useCallback(() => {
    if (currentStep.validation) {
      const result = currentStep.validation(data);
      if (!result.valid) {
        setErrors(result.errors || ['يرجى إكمال جميع الحقول المطلوبة']);
        return false;
      }
    }
    setErrors([]);
    return true;
  }, [currentStep, data]);

  const handleNext = useCallback(async () => {
    if (!validateCurrentStep()) {
      return;
    }

    // تنفيذ الإجراءات التلقائية
    if (currentStep.autoActions) {
      setIsProcessing(true);
      try {
        await Promise.all(
          currentStep.autoActions.map(action => action(data))
        );
      } catch (error) {
        console.error('Error executing auto actions:', error);
        setErrors(['حدث خطأ أثناء معالجة البيانات']);
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
    }

    if (isLastStep) {
      // إتمام الـ workflow
      setIsProcessing(true);
      try {
        await workflow.onComplete(data);
        completeWorkflow();
        onComplete?.();
      } catch (error) {
        console.error('Error completing workflow:', error);
        setErrors(['حدث خطأ أثناء إتمام العملية']);
      } finally {
        setIsProcessing(false);
      }
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [
    currentStep,
    data,
    isLastStep,
    validateCurrentStep,
    workflow,
    completeWorkflow,
    onComplete,
  ]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex(prev => prev - 1);
      setErrors([]);
    }
  }, [isFirstStep]);

  const handleCancel = useCallback(() => {
    if (confirm('هل أنت متأكد من إلغاء هذه العملية؟ سيتم حفظ البيانات المدخلة.')) {
      workflow.onCancel?.();
      onCancel?.();
    }
  }, [workflow, onCancel]);

  const CurrentStepComponent = currentStep.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <workflow.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{workflow.title}</h2>
              <p className="text-muted-foreground">{workflow.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              الخطوة {currentStepIndex + 1} من {workflow.steps.length}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mt-6">
          {workflow.steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    index < currentStepIndex &&
                      'bg-green-100 border-green-500 text-green-700',
                    index === currentStepIndex &&
                      'bg-primary border-primary text-primary-foreground',
                    index > currentStepIndex && 'border-gray-300 text-gray-400'
                  )}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs text-center max-w-[100px]',
                    index === currentStepIndex ? 'font-semibold' : 'text-muted-foreground'
                  )}
                >
                  {step.title}
                </span>
              </div>
              {index < workflow.steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-300'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Current Step */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">{currentStep.title}</h3>
          <p className="text-muted-foreground">{currentStep.description}</p>
        </div>

        {/* Help Tip */}
        {currentStep.help && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">نصيحة</p>
              <p className="text-sm text-blue-700">{currentStep.help}</p>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-2">
                  يرجى تصحيح الأخطاء التالية:
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentStepComponent
              data={data}
              onUpdate={handleUpdate}
              onNext={handleNext}
              onBack={handleBack}
            />
          </motion.div>
        </AnimatePresence>
      </Card>

      {/* Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirstStep || isProcessing}
            >
              <ArrowRight className="w-4 h-4 ml-2" />
              السابق
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleNext}
              disabled={isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
                  جاري المعالجة...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  إتمام
                </>
              ) : (
                <>
                  التالي
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Auto-save indicator */}
      <div className="text-center">
        <Badge variant="outline" className="text-xs">
          <Save className="w-3 h-3 ml-1" />
          يتم الحفظ تلقائياً
        </Badge>
      </div>
    </div>
  );
};

