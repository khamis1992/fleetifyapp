/**
 * Workflow Types
 * 
 * Type definitions for the workflow engine.
 */

export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

export enum WorkflowEntityType {
  CONTRACT = 'contract',
  PAYMENT = 'payment',
  INVOICE = 'invoice',
  PURCHASE_ORDER = 'purchase_order',
  EXPENSE = 'expense',
  TRANSFER = 'transfer'
}

export interface WorkflowStep {
  id: string;
  step_number: number;
  name: string;
  approver_role: string[];
  approver_user_id?: string | null;
  status: WorkflowStatus;
  comments?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  required: boolean;
}

export interface Workflow {
  id: string;
  entity_type: WorkflowEntityType;
  entity_id: string;
  company_id: string;
  steps: WorkflowStep[];
  current_step: number;
  status: WorkflowStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
}

export interface WorkflowConfig {
  entity_type: WorkflowEntityType;
  entity_id: string;
  company_id: string;
  steps: Omit<WorkflowStep, 'id' | 'status' | 'approved_at' | 'approved_by'>[];
  created_by: string;
}

export interface ApprovalAction {
  workflow_id: string;
  user_id: string;
  comments?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  entity_type: WorkflowEntityType;
  steps: Omit<WorkflowStep, 'id' | 'status' | 'approved_at' | 'approved_by'>[];
  conditions?: {
    min_amount?: number;
    requires_role?: string[];
  };
}

