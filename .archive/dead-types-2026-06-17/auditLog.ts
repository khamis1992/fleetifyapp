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

// Financial-specific audit types
export type FinancialAuditEventType =
  | 'payment_created'
  | 'payment_updated'
  | 'payment_deleted'
  | 'payment_approved'
  | 'payment_rejected'
  | 'payment_refunded'
  | 'payment_allocated'
  | 'payment_disputed'
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_deleted'
  | 'invoice_approved'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'invoice_written_off'
  | 'contract_created'
  | 'contract_updated'
  | 'contract_deleted'
  | 'contract_approved'
  | 'contract_activated'
  | 'contract_cancelled'
  | 'contract_terminated'
  | 'contract_renewed'
  | 'contract_amended'
  | 'journal_entry_created'
  | 'journal_entry_updated'
  | 'journal_entry_deleted'
  | 'journal_entry_posted'
  | 'journal_entry_reversed'
  | 'account_created'
  | 'account_updated'
  | 'account_deleted'
  | 'account_deactivated'
  | 'account_reactivated'
  | 'financial_report_generated'
  | 'financial_data_exported'
  | 'financial_settings_changed'
  | 'tax_calculation_performed'
  | 'reconciliation_completed'
  | 'audit_performed';

export interface FinancialAuditLog extends AuditLog {
  event_type: FinancialAuditEventType;

  // Financial-specific fields
  financial_data: {
    amount?: number;
    currency?: string;
    account_code?: string;
    reference_number?: string;
    transaction_date?: string;
    payment_method?: string;
    invoice_number?: string;
    contract_number?: string;
    customer_id?: string;
    vendor_id?: string;
    tax_amount?: number;
    discount_amount?: number;
    balance?: number;
  };

  // Data integrity
  hash_signature?: string;
  verification_status?: 'verified' | 'tampered' | 'suspicious';
  previous_hash?: string;

  // Compliance
  compliance_flags: string[];
  retention_period?: number; // days
  archival_date?: string;
}

export interface FinancialAuditFilters extends AuditLogFilters {
  event_type?: FinancialAuditEventType | FinancialAuditEventType[];
  amount_min?: number;
  amount_max?: number;
  currency?: string;
  account_code?: string;
  reference_number?: string;
  verification_status?: 'verified' | 'tampered' | 'suspicious';
  has_compliance_flags?: boolean;
  transaction_date_from?: string;
  transaction_date_to?: string;
}

export interface FinancialAuditSummary {
  total_transactions: number;
  total_amount: number;
  amount_by_currency: Record<string, number>;
  by_event_type: Record<FinancialAuditEventType, number>;
  by_status: Record<AuditStatus, number>;
  by_severity: Record<AuditSeverity, number>;
  failed_operations: number;
  high_risk_operations: number;
  compliance_violations: number;
  tampered_records: number;
  period_start: string;
  period_end: string;
}

export interface TransactionLineage {
  transaction_id: string;
  transaction_type: FinancialAuditEventType;
  amount: number;
  currency: string;
  created_at: string;
  created_by: string;

  // Lineage tracking
  parent_transaction_id?: string;
  child_transaction_ids: string[];
  related_transactions: {
    id: string;
    type: FinancialAuditEventType;
    relationship: 'parent' | 'child' | 'related' | 'reversal' | 'refund';
    amount?: number;
  }[];

  // Full audit trail
  audit_trail: FinancialAuditLog[];

  // Current status
  current_status: 'active' | 'cancelled' | 'reversed' | 'refunded' | 'disputed';
  net_amount: number;
}

export interface DataIntegrityReport {
  total_records: number;
  verified_records: number;
  tampered_records: number;
  suspicious_records: number;
  verification_errors: {
    record_id: string;
    error_type: string;
    expected_hash: string;
    actual_hash: string;
  }[];
  integrity_score: number; // 0-100
  last_verification: string;
  recommendations: string[];
}

export interface ComplianceReport {
  period_start: string;
  period_end: string;
  total_transactions: number;
  high_risk_transactions: number;
  compliance_violations: {
    violation_type: string;
    count: number;
    total_amount: number;
    description: string;
  }[];
  required_approvals_missing: number;
  segregation_duties_violations: {
    user_id: string;
    violation_type: string;
    transaction_count: number;
  }[];
  compliance_score: number; // 0-100
  audit_trail_complete: boolean;
}

export interface AuditRetentionPolicy {
  entity_type: AuditResourceType;
  retention_days: number;
  archival_after_days?: number;
  auto_delete: boolean;
  compliance_requirements: string[];
}

export interface AuditExportOptions {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  date_range: {
    start: string;
    end: string;
  };
  filters: FinancialAuditFilters;
  include_integrity_data: boolean;
  include_financial_data: boolean;
  anonymize_user_data: boolean;
  compliance_mode: boolean; // Include compliance-specific fields
}
