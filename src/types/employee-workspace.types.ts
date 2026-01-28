/**
 * Employee Workspace Types
 * أنواع بيانات نظام مساحة عمل الموظفين
 */

import { Database } from '@/integrations/supabase/types';

// ============================================================================
// Database Types
// ============================================================================

export type FollowupPolicy = Database['public']['Tables']['followup_policies']['Row'];
export type FollowupPolicyInsert = Database['public']['Tables']['followup_policies']['Insert'];
export type FollowupPolicyUpdate = Database['public']['Tables']['followup_policies']['Update'];

export type EmployeeCollectionTarget = Database['public']['Tables']['employee_collection_targets']['Row'];
export type EmployeeCollectionTargetInsert = Database['public']['Tables']['employee_collection_targets']['Insert'];
export type EmployeeCollectionTargetUpdate = Database['public']['Tables']['employee_collection_targets']['Update'];

// ============================================================================
// Employee Performance Types
// ============================================================================

export interface EmployeePerformance {
  employee_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  company_id: string;
  
  // Contract Statistics
  assigned_contracts_count: number;
  active_contracts_count: number;
  contracts_with_balance_count: number;
  
  // Collection Statistics
  total_contract_value: number;
  total_collected: number;
  total_balance_due: number;
  collection_rate: number;
  
  // Followup Statistics
  total_followups: number;
  completed_followups: number;
  pending_followups: number;
  overdue_followups: number;
  followup_completion_rate: number;
  
  // Communication Statistics
  total_communications: number;
  phone_calls_count: number;
  messages_count: number;
  contact_coverage_rate: number;
  
  // Performance Score
  performance_score: number;
  
  // Last Activity
  last_communication_date?: string;
  last_followup_date?: string;
}

export interface EmployeePerformanceGrade {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  label: string;
  label_ar: string;
  color: string;
  minScore: number;
  maxScore: number;
}

export const PERFORMANCE_GRADES: EmployeePerformanceGrade[] = [
  { grade: 'A', label: 'Excellent', label_ar: 'ممتاز', color: 'green', minScore: 90, maxScore: 100 },
  { grade: 'B', label: 'Good', label_ar: 'جيد', color: 'blue', minScore: 75, maxScore: 89 },
  { grade: 'C', label: 'Average', label_ar: 'متوسط', color: 'yellow', minScore: 60, maxScore: 74 },
  { grade: 'D', label: 'Below Average', label_ar: 'أقل من المتوسط', color: 'orange', minScore: 40, maxScore: 59 },
  { grade: 'F', label: 'Poor', label_ar: 'ضعيف', color: 'red', minScore: 0, maxScore: 39 },
];

// ============================================================================
// Employee Quick Stats Types
// ============================================================================

export interface EmployeeQuickStats {
  assignedContractsCount: number;
  totalDueThisMonth: number;
  totalOverdue: number;
  todayTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  performanceScore: number;
  performanceGrade: EmployeePerformanceGrade;
  collectionRate: number;
  monthlyProgress: number; // Progress towards monthly target
}

// ============================================================================
// Priority Contract Types
// ============================================================================

export type ContractPriority = 'critical' | 'high' | 'medium' | 'low';

export interface PriorityContract {
  id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  vehicle_plate?: string;
  
  // Priority Info
  priority: ContractPriority;
  priority_reason: string;
  priority_reason_ar: string;
  
  // Financial Info
  monthly_amount: number;
  balance_due: number;
  days_overdue?: number;
  
  // Status Info
  status: string;
  last_contact_date?: string;
  last_contact_outcome?: string;
  
  // Action Required
  action_required: string;
  action_required_ar: string;
  due_date?: string;
}

export interface PriorityReason {
  type: string;
  label: string;
  label_ar: string;
  icon: string;
  color: string;
  priority: ContractPriority;
}

export const PRIORITY_REASONS: PriorityReason[] = [
  {
    type: 'overdue_payment',
    label: 'Overdue Payment',
    label_ar: 'دفعة متأخرة',
    icon: '💰',
    color: 'red',
    priority: 'critical'
  },
  {
    type: 'new_violation',
    label: 'New Violation',
    label_ar: 'مخالفة جديدة',
    icon: '🚗',
    color: 'orange',
    priority: 'high'
  },
  {
    type: 'contract_expiring',
    label: 'Contract Expiring Soon',
    label_ar: 'ينتهي قريباً',
    icon: '📄',
    color: 'yellow',
    priority: 'medium'
  },
  {
    type: 'no_contact',
    label: 'No Recent Contact',
    label_ar: 'لم يتم التواصل',
    icon: '📞',
    color: 'blue',
    priority: 'medium'
  },
  {
    type: 'payment_due_today',
    label: 'Payment Due Today',
    label_ar: 'دفعة مستحقة اليوم',
    icon: '⏰',
    color: 'green',
    priority: 'high'
  }
];

// ============================================================================
// Employee Task Types
// ============================================================================

export interface EmployeeTask {
  id: string;
  type: 'followup' | 'payment_collection' | 'contract_renewal' | 'violation_check' | 'customer_contact';
  title: string;
  title_ar: string;
  description?: string;
  
  // Contract & Customer Info
  contract_id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  
  // Task Details
  scheduled_date: string;
  scheduled_time?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  
  // Outcome
  outcome?: string;
  outcome_notes?: string;
  completed_at?: string;
  
  // Metadata
  created_at: string;
  assigned_to: string;
}

// ============================================================================
// Contract Assignment Types
// ============================================================================

export interface ContractAssignment {
  contract_id: string;
  assigned_to_profile_id: string;
  assigned_by_profile_id?: string;
  assigned_at: string;
  assignment_notes?: string;
}

export interface BulkAssignmentRequest {
  contract_ids: string[];
  employee_id: string;
  notes?: string;
}

export interface AssignmentHistory {
  id: string;
  contract_id: string;
  contract_number: string;
  assigned_to: string;
  assigned_to_name: string;
  assigned_by: string;
  assigned_by_name: string;
  assigned_at: string;
  unassigned_at?: string;
  notes?: string;
}

// ============================================================================
// Activity Log Types
// ============================================================================

export interface EmployeeActivity {
  id: string;
  type: 'call' | 'payment' | 'followup' | 'note' | 'contract_update' | 'renewal';
  icon: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  
  // Related Entities
  contract_id?: string;
  contract_number?: string;
  customer_id?: string;
  customer_name?: string;
  
  // Details
  amount?: number;
  duration?: number; // for calls
  outcome?: string;
  
  // Timestamp
  created_at: string;
  created_by: string;
}

// ============================================================================
// Filter & Search Types
// ============================================================================

export interface EmployeeContractFilters {
  status?: string[];
  priority?: ContractPriority[];
  hasOverdue?: boolean;
  expiringInDays?: number;
  lastContactDays?: number;
  search?: string;
}

export interface EmployeeTaskFilters {
  status?: string[];
  type?: string[];
  priority?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================================================
// Dashboard Widget Types
// ============================================================================

export interface DashboardWidget {
  id: string;
  title: string;
  title_ar: string;
  type: 'stats' | 'chart' | 'list' | 'calendar';
  size: 'small' | 'medium' | 'large';
  order: number;
  visible: boolean;
  config?: Record<string, any>;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface EmployeeNotification {
  id: string;
  type: 'task_reminder' | 'overdue_payment' | 'new_violation' | 'contract_expiring' | 'target_achievement';
  title: string;
  title_ar: string;
  message: string;
  message_ar: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  // Related Entity
  related_type?: 'contract' | 'task' | 'customer';
  related_id?: string;
  
  // Status
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// ============================================================================
// Export Helper Functions
// ============================================================================

export function getPerformanceGrade(score: number): EmployeePerformanceGrade {
  return PERFORMANCE_GRADES.find(
    grade => score >= grade.minScore && score <= grade.maxScore
  ) || PERFORMANCE_GRADES[PERFORMANCE_GRADES.length - 1];
}

export function getPriorityColor(priority: ContractPriority): string {
  const colors: Record<ContractPriority, string> = {
    critical: 'red',
    high: 'orange',
    medium: 'yellow',
    low: 'blue'
  };
  return colors[priority];
}

export function getTaskStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'blue',
    in_progress: 'yellow',
    completed: 'green',
    cancelled: 'gray',
    overdue: 'red'
  };
  return colors[status] || 'gray';
}
