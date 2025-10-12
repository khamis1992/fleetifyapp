/**
 * Audit Logging System
 * Tracks sensitive operations for compliance and security
 */

import { supabase } from '@/integrations/supabase/client';

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
