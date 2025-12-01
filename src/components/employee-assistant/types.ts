/**
 * أنواع نظام مساعد الموظف
 * Employee Assistant System Types
 */

export type WorkflowType = 
  | 'new_contract' 
  | 'payment_recording'
  | 'vehicle_return' 
  | 'new_customer'
  | 'new_invoice';

export type StepStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'skipped' 
  | 'blocked';

export type CheckType = 
  | 'auto'      // تحقق تلقائي من النظام
  | 'manual'    // تأكيد يدوي من الموظف
  | 'conditional'; // يظهر فقط في حالات معينة

export type AlertLevel = 
  | 'info' 
  | 'warning' 
  | 'error' 
  | 'success';

export interface WorkflowCheck {
  id: string;
  title: string;
  description?: string;
  type: CheckType;
  required: boolean;
  completed: boolean;
  
  // للتحققات التلقائية
  autoCheckFn?: (data: any) => boolean;
  
  // للتحققات الشرطية
  condition?: (data: any) => boolean;
  
  // رسائل
  blockingMessage?: string;
  warningMessage?: string;
  successMessage?: string;
}

export interface WorkflowPhase {
  id: string;
  title: string;
  icon: string;
  description?: string;
  checks: WorkflowCheck[];
  status: StepStatus;
}

export interface WorkflowAlert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

export interface WorkflowConfig {
  id: WorkflowType;
  title: string;
  description: string;
  icon: string;
  phases: Omit<WorkflowPhase, 'status'>[];
}

export interface WorkflowState {
  workflowId: WorkflowType;
  isActive: boolean;
  currentPhaseIndex: number;
  phases: WorkflowPhase[];
  alerts: WorkflowAlert[];
  startedAt?: Date;
  completedAt?: Date;
  data: Record<string, any>;
}

export interface EmployeeAssistantProps {
  workflowType: WorkflowType;
  data?: Record<string, any>;
  onComplete?: () => void;
  onStepComplete?: (phaseId: string, checkId: string) => void;
  className?: string;
}

