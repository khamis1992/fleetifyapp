/**
 * Enhanced Audit Logging System
 * Tracks sensitive operations for compliance and security
 * Integrates with comprehensive financial audit service
 */

import { supabase } from '@/integrations/supabase/client';
import { financialAuditService } from '@/services/auditService';

export type AuditEventType =
  | 'user_login'
  | 'user_logout'
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  | 'payment_created'
  | 'payment_updated'
  | 'payment_deleted'
  | 'payment_approved'
  | 'contract_created'
  | 'contract_updated'
  | 'contract_deleted'
  | 'contract_approved'
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  | 'legal_consultation'
  | 'legal_document_generated'
  | 'legal_case_created'
  | 'api_key_updated'
  | 'settings_changed'
  | 'data_exported'
  | 'backup_created'
  | 'rls_policy_violated'
  | 'unauthorized_access_attempt';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditLogEntry {
  id?: string;
  event_type: AuditEventType;
  severity: AuditSeverity;
  user_id?: string;
  company_id?: string;
  entity_type?: string;
  entity_id?: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at?: string;
}

class AuditLogger {
  private pendingLogs: AuditLogEntry[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'id' | 'created_at' | 'ip_address' | 'user_agent'>): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Enrich with metadata
      const enrichedEntry: AuditLogEntry = {
        ...entry,
        user_id: entry.user_id || user?.id,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
      };

      // Add to pending batch
      this.pendingLogs.push(enrichedEntry);

      // Log to console in development
      if (import.meta.env.DEV) {
        console.log('📝 Audit Log:', {
          type: enrichedEntry.event_type,
          action: enrichedEntry.action,
          severity: enrichedEntry.severity,
          success: enrichedEntry.success,
        });
      }

      // Flush if batch is full or severity is critical
      if (this.pendingLogs.length >= this.batchSize || entry.severity === 'critical') {
        await this.flush();
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Flush pending logs to database
   */
  private async flush(): Promise<void> {
    if (this.pendingLogs.length === 0) return;

    const logsToFlush = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert(logsToFlush);

      if (error) {
        console.error('Failed to flush audit logs:', error);
        // Put logs back for retry
        this.pendingLogs.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing audit logs:', error);
      this.pendingLogs.unshift(...logsToFlush);
    }
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Get client IP address
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      // In production, this would be set by server
      // For now, return undefined (will be set by RLS trigger)
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Log user authentication events
   */
  async logAuth(action: 'login' | 'logout' | 'failed_login', userId?: string, details?: any): Promise<void> {
    await this.log({
      event_type: action === 'login' ? 'user_login' : 'user_logout',
      severity: action === 'failed_login' ? 'medium' : 'low',
      user_id: userId,
      action,
      details,
      success: action !== 'failed_login',
      error_message: action === 'failed_login' ? details?.error : undefined,
    });
  }

  /**
   * Log payment operations
   */
  async logPayment(
    action: 'created' | 'updated' | 'deleted' | 'approved',
    paymentId: string,
    companyId: string,
    details?: any,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      event_type: `payment_${action}` as AuditEventType,
      severity: action === 'deleted' ? 'high' : action === 'approved' ? 'medium' : 'low',
      company_id: companyId,
      entity_type: 'payment',
      entity_id: paymentId,
      action: `payment_${action}`,
      details,
      success,
    });
  }

  /**
   * Log contract operations
   */
  async logContract(
    action: 'created' | 'updated' | 'deleted' | 'approved',
    contractId: string,
    companyId: string,
    details?: any,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      event_type: `contract_${action}` as AuditEventType,
      severity: action === 'deleted' ? 'high' : action === 'approved' ? 'medium' : 'low',
      company_id: companyId,
      entity_type: 'contract',
      entity_id: contractId,
      action: `contract_${action}`,
      details,
      success,
    });
  }

  /**
   * Log customer operations
   */
  async logCustomer(
    action: 'created' | 'updated' | 'deleted',
    customerId: string,
    companyId: string,
    details?: any,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      event_type: `customer_${action}` as AuditEventType,
      severity: action === 'deleted' ? 'high' : 'low',
      company_id: companyId,
      entity_type: 'customer',
      entity_id: customerId,
      action: `customer_${action}`,
      details,
      success,
    });
  }

  /**
   * Log legal AI operations
   */
  async logLegalAI(
    action: 'consultation' | 'document_generated' | 'case_created',
    companyId: string,
    details?: any,
    success: boolean = true
  ): Promise<void> {
    const eventTypeMap = {
      consultation: 'legal_consultation',
      document_generated: 'legal_document_generated',
      case_created: 'legal_case_created',
    };

    await this.log({
      event_type: eventTypeMap[action] as AuditEventType,
      severity: 'low',
      company_id: companyId,
      entity_type: 'legal_ai',
      action,
      details,
      success,
    });
  }

  /**
   * Log sensitive operations
   */
  async logSensitiveOperation(
    operation: string,
    companyId: string,
    details?: any,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      event_type: 'settings_changed',
      severity: 'high',
      company_id: companyId,
      action: operation,
      details,
      success,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: 'rls_policy_violated' | 'unauthorized_access_attempt',
    details: any
  ): Promise<void> {
    await this.log({
      event_type: eventType,
      severity: 'critical',
      action: eventType,
      details,
      success: false,
    });
  }

  /**
   * Log data export
   */
  async logDataExport(
    exportType: string,
    companyId: string,
    recordCount: number,
    success: boolean = true
  ): Promise<void> {
    await this.log({
      event_type: 'data_exported',
      severity: 'medium',
      company_id: companyId,
      action: 'data_export',
      details: { exportType, recordCount },
      success,
    });
  }

  /**
   * Enhanced financial operation logging with comprehensive audit service integration
   */
  async logFinancialOperation(params: {
    event_type: any;
    resource_type: 'payment' | 'invoice' | 'contract' | 'journal_entry' | 'account' | 'customer';
    resource_id: string;
    entity_name?: string;
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    changes_summary?: string;
    metadata?: Record<string, any>;
    notes?: string;
    status?: 'success' | 'failed' | 'pending';
    severity?: 'low' | 'medium' | 'high' | 'critical';
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
  }): Promise<string | null> {
    // Use the comprehensive financial audit service
    const auditLogId = await financialAuditService.logFinancialOperation(params);

    // Also log to the basic audit system for backward compatibility
    await this.log({
      event_type: params.event_type as any,
      severity: params.severity || this.getSeverityFromEventType(params.event_type),
      company_id: '', // Will be set by financialAuditService
      action: this.mapEventTypeToAction(params.event_type),
      entity_type: params.resource_type,
      entity_id: params.resource_id,
      entity_name: params.entity_name,
      old_values: params.old_values,
      new_values: params.new_values,
      changes_summary: params.changes_summary,
      details: params.metadata,
      notes: params.notes,
      success: params.status === 'success',
    });

    return auditLogId;
  }

  /**
   * Quick financial operation logging helpers
   */
  async logPayment(
    action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected' | 'refunded' | 'allocated' | 'disputed',
    paymentData: any,
    oldPaymentData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<string | null> {
    return this.logFinancialOperation({
      event_type: `payment_${action}` as any,
      resource_type: 'payment',
      resource_id: paymentData.id || paymentData.payment_id,
      entity_name: paymentData.payment_number || paymentData.reference_number,
      old_values: oldPaymentData,
      new_values: paymentData,
      changes_summary: this.generatePaymentSummary(action, oldPaymentData, paymentData),
      notes: options.notes,
      severity: options.severity,
      financial_data: {
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        reference_number: paymentData.payment_number || paymentData.reference_number,
        transaction_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        customer_id: paymentData.customer_id,
        balance: paymentData.balance
      }
    });
  }

  async logContract(
    action: 'created' | 'updated' | 'deleted' | 'approved' | 'activated' | 'cancelled' | 'terminated' | 'renewed' | 'amended',
    contractData: any,
    oldContractData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<string | null> {
    return this.logFinancialOperation({
      event_type: `contract_${action}` as any,
      resource_type: 'contract',
      resource_id: contractData.id || contractData.contract_id,
      entity_name: contractData.contract_number || contractData.reference_number,
      old_values: oldContractData,
      new_values: contractData,
      changes_summary: this.generateContractSummary(action, oldContractData, contractData),
      notes: options.notes,
      severity: options.severity,
      financial_data: {
        amount: contractData.monthly_rent || contractData.total_amount,
        currency: contractData.currency || 'USD',
        reference_number: contractData.contract_number || contractData.reference_number,
        transaction_date: contractData.start_date,
        customer_id: contractData.customer_id
      }
    });
  }

  async logInvoice(
    action: 'created' | 'updated' | 'deleted' | 'approved' | 'sent' | 'paid' | 'overdue' | 'written_off',
    invoiceData: any,
    oldInvoiceData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<string | null> {
    return this.logFinancialOperation({
      event_type: `invoice_${action}` as any,
      resource_type: 'invoice',
      resource_id: invoiceData.id || invoiceData.invoice_id,
      entity_name: invoiceData.invoice_number || invoiceData.reference_number,
      old_values: oldInvoiceData,
      new_values: invoiceData,
      changes_summary: this.generateInvoiceSummary(action, oldInvoiceData, invoiceData),
      notes: options.notes,
      severity: options.severity,
      financial_data: {
        amount: invoiceData.total_amount,
        currency: invoiceData.currency || 'USD',
        reference_number: invoiceData.invoice_number || invoiceData.reference_number,
        transaction_date: invoiceData.invoice_date || invoiceData.created_at,
        customer_id: invoiceData.customer_id,
        tax_amount: invoiceData.tax_amount,
        discount_amount: invoiceData.discount_amount
      }
    });
  }

  async logJournalEntry(
    action: 'created' | 'updated' | 'deleted' | 'posted' | 'reversed',
    entryData: any,
    oldEntryData?: any,
    options: {
      notes?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): Promise<string | null> {
    return this.logFinancialOperation({
      event_type: `journal_entry_${action}` as any,
      resource_type: 'journal_entry',
      resource_id: entryData.id || entryData.journal_entry_id,
      entity_name: entryData.entry_number || entryData.reference_number,
      old_values: oldEntryData,
      new_values: entryData,
      changes_summary: this.generateJournalEntrySummary(action, oldEntryData, entryData),
      notes: options.notes,
      severity: options.severity || 'high', // Journal entries are high severity by default
      financial_data: {
        amount: entryData.total_amount || entryData.amount,
        reference_number: entryData.entry_number || entryData.reference_number,
        transaction_date: entryData.entry_date,
        account_code: entryData.account_code
      }
    });
  }

  // Private helper methods
  private mapEventTypeToAction(eventType: string): string {
    if (eventType.includes('created')) return 'CREATE';
    if (eventType.includes('updated')) return 'UPDATE';
    if (eventType.includes('deleted') || eventType.includes('terminated')) return 'DELETE';
    if (eventType.includes('approved')) return 'APPROVE';
    if (eventType.includes('rejected')) return 'REJECT';
    if (eventType.includes('cancelled')) return 'CANCEL';
    if (eventType.includes('reversed')) return 'UPDATE';
    return eventType.toUpperCase();
  }

  private getSeverityFromEventType(eventType: string): 'low' | 'medium' | 'high' | 'critical' {
    if (eventType.includes('deleted') || eventType.includes('terminated')) return 'critical';
    if (eventType.includes('cancelled') || eventType.includes('rejected')) return 'high';
    if (eventType.includes('approved') || eventType.includes('created')) return 'medium';
    return 'low';
  }

  private generatePaymentSummary(action: string, oldData?: any, newData?: any): string {
    switch (action) {
      case 'payment_created':
        return `Payment of ${newData?.amount || 0} created via ${newData?.payment_method || 'unknown'}`;
      case 'payment_updated':
        return `Payment updated: ${this.describeChanges(oldData, newData)}`;
      case 'payment_deleted':
        return `Payment of ${oldData?.amount || 0} deleted`;
      case 'payment_approved':
        return `Payment of ${newData?.amount || 0} approved`;
      case 'payment_refunded':
        return `Payment of ${newData?.amount || 0} refunded`;
      default:
        return `Payment ${action.replace('payment_', '')}`;
    }
  }

  private generateContractSummary(action: string, oldData?: any, newData?: any): string {
    switch (action) {
      case 'contract_created':
        return `Contract created with value ${newData?.monthly_rent || 0}`;
      case 'contract_updated':
        return `Contract updated: ${this.describeChanges(oldData, newData)}`;
      case 'contract_cancelled':
        return `Contract cancelled: ${oldData?.contract_number || 'Unknown'}`;
      case 'contract_terminated':
        return `Contract terminated: ${oldData?.contract_number || 'Unknown'}`;
      default:
        return `Contract ${action.replace('contract_', '')}`;
    }
  }

  private generateInvoiceSummary(action: string, oldData?: any, newData?: any): string {
    switch (action) {
      case 'invoice_created':
        return `Invoice ${newData?.invoice_number || 'Unknown'} created for ${newData?.total_amount || 0}`;
      case 'invoice_updated':
        return `Invoice updated: ${this.describeChanges(oldData, newData)}`;
      case 'invoice_paid':
        return `Invoice ${newData?.invoice_number || 'Unknown'} marked as paid`;
      case 'invoice_written_off':
        return `Invoice ${newData?.invoice_number || 'Unknown'} written off`;
      default:
        return `Invoice ${action.replace('invoice_', '')}`;
    }
  }

  private generateJournalEntrySummary(action: string, oldData?: any, newData?: any): string {
    switch (action) {
      case 'journal_entry_created':
        return `Journal entry created: ${newData?.description || 'No description'}`;
      case 'journal_entry_posted':
        return `Journal entry posted: ${newData?.entry_number || 'Unknown'}`;
      case 'journal_entry_reversed':
        return `Journal entry reversed: ${newData?.entry_number || 'Unknown'}`;
      default:
        return `Journal entry ${action.replace('journal_entry_', '')}`;
    }
  }

  private describeChanges(oldData?: any, newData?: any): string {
    if (!oldData || !newData) return 'No previous data available';

    const changes = [];
    const fields = ['amount', 'status', 'payment_method', 'due_date', 'customer_id', 'total_amount'];

    fields.forEach(field => {
      if (oldData[field] !== newData[field]) {
        changes.push(`${field}: ${oldData[field]} → ${newData[field]}`);
      }
    });

    return changes.length > 0 ? changes.join(', ') : 'No significant changes';
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters: {
    companyId?: string;
    userId?: string;
    eventType?: AuditEventType;
    startDate?: string;
    endDate?: string;
    severity?: AuditSeverity;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get audit summary
   */
  async getAuditSummary(companyId: string, days: number = 30): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    failedOperations: number;
    criticalEvents: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.queryLogs({
      companyId,
      startDate: startDate.toISOString(),
    });

    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    let failedOperations = 0;
    let criticalEvents = 0;

    logs.forEach(log => {
      // Count by type
      eventsByType[log.event_type] = (eventsByType[log.event_type] || 0) + 1;
      
      // Count by severity
      eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
      
      // Count failures
      if (!log.success) {
        failedOperations++;
      }
      
      // Count critical
      if (log.severity === 'critical') {
        criticalEvents++;
      }
    });

    return {
      totalEvents: logs.length,
      eventsByType,
      eventsBySeverity,
      failedOperations,
      criticalEvents,
    };
  }
}

// Export singleton
export const auditLogger = new AuditLogger();
