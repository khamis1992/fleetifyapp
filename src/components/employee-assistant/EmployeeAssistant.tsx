/**
 * مكون مساعد الموظف الذكي
 * Employee Assistant Component
 * يساعد الموظف على إتمام المهام بشكل صحيح مع checklist تفاعلي
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Info,
  AlertTriangle,
  XCircle,
  Sparkles,
  Shield,
  Clock,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { 
  EmployeeAssistantProps, 
  WorkflowState, 
  WorkflowPhase, 
  WorkflowCheck,
  StepStatus,
  AlertLevel
} from './types';
import { contractWorkflow } from './workflows/contractWorkflow';

// أيقونة حسب مستوى التنبيه
const AlertIcon: React.FC<{ level: AlertLevel; className?: string }> = ({ level, className }) => {
  switch (level) {
    case 'error':
      return <XCircle className={cn('h-4 w-4 text-red-500', className)} />;
    case 'warning':
      return <AlertTriangle className={cn('h-4 w-4 text-amber-500', className)} />;
    case 'success':
      return <CheckCircle2 className={cn('h-4 w-4 text-green-500', className)} />;
    default:
      return <Info className={cn('h-4 w-4 text-blue-500', className)} />;
  }
};

// مكون التحقق الفردي
const CheckItem: React.FC<{
  check: WorkflowCheck;
  onToggle: (checkId: string) => void;
  data: Record<string, any>;
  disabled?: boolean;
}> = ({ check, onToggle, data, disabled }) => {
  // التحقق من الشرط (للتحققات الشرطية)
  const isVisible = check.condition ? check.condition(data) : true;
  if (!isVisible) return null;

  // حساب حالة التحقق التلقائي
  const autoCheckResult = check.type === 'auto' && check.autoCheckFn 
    ? check.autoCheckFn(data) 
    : null;
  
  const isCompleted = check.type === 'auto' ? autoCheckResult === true : check.completed;
  const isFailed = check.type === 'auto' && autoCheckResult === false;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors',
        isCompleted && 'bg-green-50',
        isFailed && 'bg-red-50',
        !isCompleted && !isFailed && 'bg-neutral-50 hover:bg-neutral-100',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {check.type === 'auto' ? (
        <div className="mt-0.5">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : isFailed ? (
            <XCircle className="h-5 w-5 text-red-600" />
          ) : (
            <Clock className="h-5 w-5 text-neutral-400 animate-pulse" />
          )}
        </div>
      ) : (
        <Checkbox
          id={check.id}
          checked={isCompleted}
          onCheckedChange={() => !disabled && onToggle(check.id)}
          disabled={disabled}
          className={cn(
            'mt-0.5',
            check.required && 'border-coral-400'
          )}
        />
      )}
      
      <div className="flex-1 min-w-0">
        <label 
          htmlFor={check.id}
          className={cn(
            'flex items-center gap-2 font-medium text-sm cursor-pointer',
            isCompleted && 'text-green-700 line-through',
            isFailed && 'text-red-700',
            !isCompleted && !isFailed && 'text-neutral-800'
          )}
        >
          {check.title}
          {check.required && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-coral-300 text-coral-600">
              مطلوب
            </Badge>
          )}
          {check.type === 'auto' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-blue-300 text-blue-600">
                    تلقائي
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>يتم التحقق تلقائياً من النظام</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </label>
        
        {check.description && (
          <p className="text-xs text-neutral-500 mt-1">{check.description}</p>
        )}
        
        {/* رسائل التحذير/الخطأ */}
        {isFailed && check.blockingMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 mt-2 p-2 bg-red-100 rounded text-red-700 text-xs"
          >
            <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {check.blockingMessage}
          </motion.div>
        )}
        
        {isFailed && !check.blockingMessage && check.warningMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 mt-2 p-2 bg-amber-100 rounded text-amber-700 text-xs"
          >
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            {check.warningMessage}
          </motion.div>
        )}
        
        {isCompleted && check.successMessage && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-2 mt-2 p-2 bg-green-100 rounded text-green-700 text-xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
            {check.successMessage}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// مكون المرحلة
const PhaseSection: React.FC<{
  phase: WorkflowPhase;
  index: number;
  isActive: boolean;
  onCheckToggle: (phaseId: string, checkId: string) => void;
  data: Record<string, any>;
}> = ({ phase, index, isActive, onCheckToggle, data }) => {
  const [isOpen, setIsOpen] = useState(isActive);
  
  // حساب نسبة الإنجاز
  const visibleChecks = phase.checks.filter(c => !c.condition || c.condition(data));
  const completedChecks = visibleChecks.filter(c => {
    if (c.type === 'auto' && c.autoCheckFn) {
      return c.autoCheckFn(data);
    }
    return c.completed;
  });
  const progress = visibleChecks.length > 0 
    ? (completedChecks.length / visibleChecks.length) * 100 
    : 0;
  
  // تحديد حالة المرحلة
  const hasBlockingIssue = phase.checks.some(c => {
    if (c.type === 'auto' && c.autoCheckFn && c.required) {
      const result = c.autoCheckFn(data);
      return result === false && c.blockingMessage;
    }
    return false;
  });
  
  const isComplete = progress === 100;
  
  useEffect(() => {
    if (isActive) setIsOpen(true);
  }, [isActive]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div 
          className={cn(
            'flex items-center justify-between p-4 cursor-pointer rounded-lg transition-all border',
            isActive && 'bg-coral-50 border-coral-200',
            isComplete && 'bg-green-50 border-green-200',
            hasBlockingIssue && 'bg-red-50 border-red-200',
            !isActive && !isComplete && !hasBlockingIssue && 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100'
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-lg',
              isComplete && 'bg-green-100',
              hasBlockingIssue && 'bg-red-100',
              isActive && !isComplete && !hasBlockingIssue && 'bg-coral-100',
              !isActive && !isComplete && !hasBlockingIssue && 'bg-neutral-200'
            )}>
              {isComplete ? '✓' : phase.icon}
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 flex items-center gap-2">
                <span className="text-xs text-neutral-400">المرحلة {index + 1}</span>
                {phase.title}
              </h3>
              {phase.description && (
                <p className="text-xs text-neutral-500">{phase.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-left">
              <span className="text-xs text-neutral-500">
                {completedChecks.length}/{visibleChecks.length}
              </span>
              <Progress 
                value={progress} 
                className={cn(
                  'h-1.5 w-20',
                  isComplete && '[&>div]:bg-green-500',
                  hasBlockingIssue && '[&>div]:bg-red-500',
                  !isComplete && !hasBlockingIssue && '[&>div]:bg-coral-500'
                )}
              />
            </div>
            {isOpen ? (
              <ChevronUp className="h-5 w-5 text-neutral-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-neutral-400" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2 mt-2 mr-4 pr-4 border-r-2 border-neutral-200"
        >
          {phase.checks.map((check) => (
            <CheckItem
              key={check.id}
              check={check}
              onToggle={(checkId) => onCheckToggle(phase.id, checkId)}
              data={data}
            />
          ))}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// المكون الرئيسي
export const EmployeeAssistant: React.FC<EmployeeAssistantProps> = ({
  workflowType,
  data = {},
  onComplete,
  onStepComplete,
  className
}) => {
  // اختيار سير العمل المناسب
  const workflowConfig = useMemo(() => {
    switch (workflowType) {
      case 'new_contract':
        return contractWorkflow;
      default:
        return contractWorkflow;
    }
  }, [workflowType]);

  // حالة سير العمل
  const [workflowState, setWorkflowState] = useState<WorkflowState>(() => ({
    workflowId: workflowType,
    isActive: true,
    currentPhaseIndex: 0,
    phases: workflowConfig.phases.map(phase => ({
      ...phase,
      status: 'pending' as StepStatus,
      checks: phase.checks.map(check => ({ ...check }))
    })),
    alerts: [],
    startedAt: new Date(),
    data
  }));

  // تحديث البيانات عند تغييرها
  useEffect(() => {
    setWorkflowState(prev => ({ ...prev, data }));
  }, [data]);

  // معالج تبديل التحقق
  const handleCheckToggle = useCallback((phaseId: string, checkId: string) => {
    setWorkflowState(prev => {
      const newPhases = prev.phases.map(phase => {
        if (phase.id !== phaseId) return phase;
        
        return {
          ...phase,
          checks: phase.checks.map(check => {
            if (check.id !== checkId) return check;
            return { ...check, completed: !check.completed };
          })
        };
      });
      
      return { ...prev, phases: newPhases };
    });
    
    onStepComplete?.(phaseId, checkId);
  }, [onStepComplete]);

  // حساب التقدم الكلي
  const overallProgress = useMemo(() => {
    const allChecks = workflowState.phases.flatMap(p => 
      p.checks.filter(c => !c.condition || c.condition(data))
    );
    const completedChecks = allChecks.filter(c => {
      if (c.type === 'auto' && c.autoCheckFn) {
        return c.autoCheckFn(data);
      }
      return c.completed;
    });
    return allChecks.length > 0 
      ? Math.round((completedChecks.length / allChecks.length) * 100)
      : 0;
  }, [workflowState.phases, data]);

  // التحقق من وجود مشاكل مانعة
  const hasBlockingIssues = useMemo(() => {
    return workflowState.phases.some(phase => 
      phase.checks.some(check => {
        if (check.type === 'auto' && check.autoCheckFn && check.required && check.blockingMessage) {
          return !check.autoCheckFn(data);
        }
        return false;
      })
    );
  }, [workflowState.phases, data]);

  // تحديد المرحلة النشطة
  const activePhaseIndex = useMemo(() => {
    for (let i = 0; i < workflowState.phases.length; i++) {
      const phase = workflowState.phases[i];
      const visibleChecks = phase.checks.filter(c => !c.condition || c.condition(data));
      const requiredIncomplete = visibleChecks.some(c => {
        if (!c.required) return false;
        if (c.type === 'auto' && c.autoCheckFn) {
          return !c.autoCheckFn(data);
        }
        return !c.completed;
      });
      if (requiredIncomplete) return i;
    }
    return workflowState.phases.length - 1;
  }, [workflowState.phases, data]);

  const isComplete = overallProgress === 100;

  return (
    <Card className={cn('border-2', className, 
      hasBlockingIssues && 'border-red-300',
      isComplete && 'border-green-300',
      !hasBlockingIssues && !isComplete && 'border-coral-300'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-coral-500" />
            مساعد الموظف
          </CardTitle>
          <Badge 
            variant={isComplete ? 'default' : 'outline'}
            className={cn(
              isComplete && 'bg-green-600',
              hasBlockingIssues && 'border-red-400 text-red-600'
            )}
          >
            {overallProgress}%
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Target className="h-4 w-4" />
          {workflowConfig.title}
        </div>
        
        <Progress 
          value={overallProgress} 
          className={cn(
            'h-2',
            isComplete && '[&>div]:bg-green-500',
            hasBlockingIssues && '[&>div]:bg-red-500',
            !isComplete && !hasBlockingIssues && '[&>div]:bg-coral-500'
          )}
        />
        
        {hasBlockingIssues && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2 bg-red-100 rounded-lg text-red-700 text-sm mt-2"
          >
            <Shield className="h-4 w-4" />
            توجد مشاكل تمنع إتمام العقد - راجع التحققات أدناه
          </motion.div>
        )}
        
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2 bg-green-100 rounded-lg text-green-700 text-sm mt-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            جميع التحققات مكتملة - يمكنك إتمام العقد
          </motion.div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        <AnimatePresence>
          {workflowState.phases.map((phase, index) => (
            <PhaseSection
              key={phase.id}
              phase={phase}
              index={index}
              isActive={index === activePhaseIndex}
              onCheckToggle={handleCheckToggle}
              data={data}
            />
          ))}
        </AnimatePresence>
        
        {isComplete && onComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button 
              onClick={onComplete}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4 ml-2" />
              إتمام العقد
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeAssistant;

