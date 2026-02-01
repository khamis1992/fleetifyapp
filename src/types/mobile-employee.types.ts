/**
 * Mobile Employee Workspace Types
 * أنواع البيانات لتطبيق مساحة عمل الموظف
 */

// ============================================
// Contract Types
// ============================================

export type ContractStatus = 
  | 'active' 
  | 'expired' 
  | 'cancelled' 
  | 'suspended' 
  | 'under_legal_procedure' 
  | 'pending';

export type PriorityReason = 
  | 'overdue_payment' 
  | 'expiring_soon' 
  | 'high_balance';

export interface EmployeeContract {
  id: string;
  contract_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  status: ContractStatus;
  start_date: string;
  end_date: string;
  monthly_amount: number;
  balance_due: number;
  total_paid: number;
  days_overdue: number | null;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  priority_reason?: PriorityReason;
  priority_reason_ar?: string;
  assigned_to_profile_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContractStats {
  totalContracts: number;
  activeContracts: number;
  expiredContracts: number;
  suspendedContracts: number;
  totalBalanceDue: number;
  averageBalance: number;
}

// ============================================
// Task Types
// ============================================

export type TaskType = 
  | 'call' 
  | 'followup' 
  | 'visit' 
  | 'payment' 
  | 'other';

export type TaskStatus = 
  | 'pending' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export type TaskPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'urgent';

export interface EmployeeTask {
  id: string;
  title: string;
  title_ar?: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_date: string;
  scheduled_time?: string;
  completed_at?: string;
  contract_id?: string;
  customer_id?: string;
  customer_name?: string;
  assigned_to_profile_id: string;
  created_by: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskStats {
  totalTasks: number;
  todayTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  overdueTasks: number;
}

// ============================================
// Performance Types
// ============================================

export type PerformanceGrade = 
  | 'excellent' 
  | 'good' 
  | 'average' 
  | 'poor';

export interface EmployeePerformance {
  profile_id: string;
  month: string;
  year: number;
  performance_score: number;
  collection_rate: number;
  followup_completion_rate: number;
  calls_logged: number;
  notes_added: number;
  tasks_completed: number;
  total_collected: number;
  target_amount: number;
  grade: PerformanceGrade;
  grade_ar: string;
  created_at?: string;
  updated_at?: string;
}

export interface PerformanceGradeInfo {
  grade: PerformanceGrade;
  label: string;
  label_ar: string;
  color: string;
  icon: string;
  minScore: number;
  maxScore: number;
}

// ============================================
// Collection Types
// ============================================

export type InvoiceStatus = 
  | 'paid' 
  | 'unpaid' 
  | 'partially_paid' 
  | 'overdue';

export interface Invoice {
  invoice_id: string;
  invoice_number: string;
  contract_id: string;
  contract_number: string;
  amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  due_date: string;
  payment_date?: string;
}

export interface CustomerCollection {
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  total_amount: number;
  total_paid: number;
  total_pending: number;
  invoices: Invoice[];
}

export interface CollectionStats {
  totalDue: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 
  | 'payment_received'
  | 'contract_expiring'
  | 'task_completed'
  | 'followup_reminder'
  | 'overdue_payment'
  | 'new_task_assigned';

export type NotificationPriority = 
  | 'low' 
  | 'medium' 
  | 'high';

export interface EmployeeNotification {
  id: string;
  type: NotificationType;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  priority: NotificationPriority;
  is_read: boolean;
  profile_id: string;
  related_id?: string; // contract_id, task_id, etc.
  related_type?: string; // 'contract', 'task', etc.
  created_at: string;
  read_at?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  important: number;
}

// ============================================
// Stats Types
// ============================================

export interface EmployeeStats {
  // Contracts
  totalContracts: number;
  activeContracts: number;
  totalBalanceDue: number;
  
  // Tasks
  todayTasks: number;
  completedTasks: number;
  completionRate: number;
  
  // Performance
  performanceScore: number;
  performanceGrade: string;
  performanceGrade_ar: string;
  
  // Collections
  monthlyTarget: number;
  monthlyCollected: number;
  collectionRate: number;
  
  // Activity
  callsLogged: number;
  notesAdded: number;
  paymentsRecorded: number;
}

// ============================================
// Quick Action Types
// ============================================

export interface QuickPaymentData {
  contract_id: string;
  customer_id: string;
  amount: number;
  payment_method: 'cash' | 'bank' | 'card' | 'cheque';
  reference_number?: string;
  notes?: string;
  payment_date?: string;
}

export interface CallLogData {
  contract_id: string;
  customer_id: string;
  call_type: 'incoming' | 'outgoing';
  duration?: number; // in seconds
  outcome?: string;
  notes?: string;
  call_date?: string;
}

export interface FollowupData {
  contract_id: string;
  customer_id: string;
  scheduled_date: string;
  scheduled_time?: string;
  task_type: TaskType;
  priority: TaskPriority;
  notes?: string;
}

export interface NoteData {
  contract_id: string;
  customer_id: string;
  note_type: string;
  content: string;
  attachments?: string[];
}

// ============================================
// Filter Types
// ============================================

export interface ContractFilters {
  status?: ContractStatus[];
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  minBalance?: number;
  maxBalance?: number;
  priority?: boolean;
}

export interface TaskFilters {
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface NotificationFilters {
  type?: NotificationType[];
  priority?: NotificationPriority[];
  isRead?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// ============================================
// UI State Types
// ============================================

export interface BottomNavTab {
  id: 'home' | 'collections' | 'contracts' | 'tasks' | 'performance';
  icon: React.ComponentType;
  label: string;
  label_ar: string;
  path: string;
  badge?: number;
}

export interface FABAction {
  id: string;
  icon: React.ComponentType;
  label: string;
  label_ar: string;
  color: string;
  onClick: () => void;
}

export interface SwipeAction {
  direction: 'left' | 'right';
  icon: React.ComponentType;
  label: string;
  label_ar: string;
  color: string;
  backgroundColor: string;
  onAction: () => void;
}

// ============================================
// Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Error Types
// ============================================

export interface EmployeeError {
  code: string;
  message: string;
  message_ar?: string;
  details?: any;
}

// ============================================
// Export all types
// ============================================

export type {
  // Re-export for convenience
  React,
};
