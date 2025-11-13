/**
 * Audit Log Types
 * 
 * Type definitions for the audit logging system
 */

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'CANCEL'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'EXPORT'
  | 'IMPORT'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_CHANGE'
  | 'ROLE_CHANGE';

export type AuditResourceType =
  | 'contract'
  | 'customer'
  | 'vehicle'
  | 'invoice'
  | 'payment'
  | 'employee'
  | 'user'
  | 'company'
  | 'maintenance'
  | 'penalty'
  | 'journal_entry'
  | 'account'
  | 'role'
  | 'permission';

export type AuditStatus = 'success' | 'failed' | 'pending';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLog {
  id: string;
  
  // User Information
  user_id: string;
  user_email?: string;
  user_name?: string;
  
  // Company Information
  company_id?: string;
  
  // Action Details
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id?: string;
  entity_name?: string;
  
  // Change Details
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes_summary?: string;
  
  // Request Information
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  
  // Status and Result
  status: AuditStatus;
  error_message?: string;
  severity?: AuditSeverity;
  
  // Additional Context
  metadata?: Record<string, any>;
  notes?: string;
  
  // Timestamps
  created_at: string;
}

export interface CreateAuditLogParams {
  action: AuditAction;
  resource_type: AuditResourceType;
  resource_id?: string;
  entity_name?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes_summary?: string;
  metadata?: Record<string, any>;
  notes?: string;
  status?: AuditStatus;
  severity?: AuditSeverity;
}

export interface AuditLogFilters {
  action?: AuditAction | AuditAction[];
  resource_type?: AuditResourceType | AuditResourceType[];
  user_id?: string;
  company_id?: string;
  status?: AuditStatus;
  severity?: AuditSeverity;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface AuditLogStats {
  total_logs: number;
  by_action: Record<AuditAction, number>;
  by_resource: Record<AuditResourceType, number>;
  by_status: Record<AuditStatus, number>;
  by_severity: Record<AuditSeverity, number>;
  recent_activity: AuditLog[];
}
