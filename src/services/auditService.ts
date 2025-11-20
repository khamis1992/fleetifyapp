/**
 * Comprehensive Financial Audit Service
 * Provides complete audit trail functionality for financial operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  FinancialAuditLog,
  FinancialAuditFilters,
  FinancialAuditSummary,
  TransactionLineage,
  DataIntegrityReport,
  ComplianceReport,
  AuditRetentionPolicy,
  AuditExportOptions,
  FinancialAuditEventType,
  AuditStatus,
  AuditSeverity
} from '@/types/auditLog';

export interface CreateFinancialAuditLogParams {
  event_type: FinancialAuditEventType;
  resource_type: 'payment' | 'invoice' | 'contract' | 'journal_entry' | 'account' | 'customer';
  resource_id: string;
  entity_name?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes_summary?: string;
  metadata?: Record<string, any>;
  notes?: string;
  status?: AuditStatus;
  severity?: AuditSeverity;
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
}

class FinancialAuditService {
  private static instance: FinancialAuditService;

  static getInstance(): FinancialAuditService {
    if (!FinancialAuditService.instance) {
      FinancialAuditService.instance = new FinancialAuditService();
    }
    return FinancialAuditService.instance;
  }

  /**
   * Create a comprehensive financial audit log
   */
  async logFinancialOperation(params: CreateFinancialAuditLogParams): Promise<string | null> {
    try {
      // Get current user and company context
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Get company context
      const { data: companyContext } = await supabase
        .rpc('user_company_id');

      // Prepare audit log data
      const auditLogData = {
        user_id: user.id,
        user_email: user.email,
        user_name: profile?.full_name || user.email?.split('@')[0],
        company_id: companyContext,
        action: this.mapEventTypeToAction(params.event_type),
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        entity_name: params.entity_name,
        old_values: params.old_values,
        new_values: params.new_values,
        changes_summary: params.changes_summary,
        metadata: {
          ...params.metadata,
          financial_data: params.financial_data,
          event_type: params.event_type,
        },
        notes: params.notes,
        status: params.status || 'success',
        severity: params.severity || this.getDefaultSeverity(params.event_type),
      };

      // Insert audit log (this will automatically trigger integrity verification)
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(auditLogData)
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to create financial audit log', { error, params });
        return null;
      }

      // Check for compliance violations
      await this.checkComplianceViolations(data.id, params);

      logger.info('Financial audit log created', {
        auditLogId: data.id,
        eventType: params.event_type,
        resourceType: params.resource_type,
        resourceId: params.resource_id
      });

      return data.id;
    } catch (error) {
      logger.error('Error creating financial audit log', { error, params });
      return null;
    }
  }

  /**
   * Get financial audit trail with advanced filtering
   */
  async getFinancialAuditTrail(filters: FinancialAuditFilters): Promise<{
    logs: FinancialAuditLog[];
    totalCount: number;
    summary: FinancialAuditSummary;
  }> {
    try {
      let query = supabase
        .from('financial_audit_trail')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      if (filters.resource_type) {
        query = Array.isArray(filters.resource_type)
          ? query.in('entity_type', filters.resource_type)
          : query.eq('entity_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('entity_id', filters.resource_id);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.action) {
        query = Array.isArray(filters.action)
          ? query.in('action', filters.action)
          : query.eq('action', filters.action);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }
      if (filters.search) {
        query = query.or(`entity_name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      // Financial-specific filters
      if (filters.amount_min || filters.amount_max) {
        query = query.filter('financial_data->>amount', 'gte', filters.amount_min || 0);
        if (filters.amount_max) {
          query = query.filter('financial_data->>amount', 'lte', filters.amount_max);
        }
      }
      if (filters.currency) {
        query = query.filter('financial_data->>currency', 'eq', filters.currency);
      }
      if (filters.account_code) {
        query = query.filter('financial_data->>account_code', 'eq', filters.account_code);
      }
      if (filters.reference_number) {
        query = query.filter('financial_data->>reference_number', 'ilike', `%${filters.reference_number}%`);
      }
      if (filters.verification_status) {
        query = query.eq('verification_status', filters.verification_status);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: logs, error, count } = await query;

      if (error) {
        logger.error('Failed to fetch financial audit trail', { error, filters });
        return { logs: [], totalCount: 0, summary: this.createEmptySummary() };
      }

      // Transform data to FinancialAuditLog format
      const transformedLogs: FinancialAuditLog[] = (logs || []).map(this.transformAuditLog);

      // Generate summary
      const summary = await this.generateFinancialSummary(filters, transformedLogs, count || 0);

      return {
        logs: transformedLogs,
        totalCount: count || 0,
        summary
      };
    } catch (error) {
      logger.error('Error fetching financial audit trail', { error, filters });
      return { logs: [], totalCount: 0, summary: this.createEmptySummary() };
    }
  }

  /**
   * Get complete transaction lineage
   */
  async getTransactionLineage(transactionId: string, companyId: string): Promise<TransactionLineage | null> {
    try {
      // Get the primary transaction
      const { data: primaryLog, error } = await supabase
        .from('financial_audit_trail')
        .select('*')
        .eq('entity_id', transactionId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error || !primaryLog || primaryLog.length === 0) {
        logger.error('Failed to find primary transaction', { error, transactionId });
        return null;
      }

      const primary = primaryLog[0];

      // Find related transactions based on metadata and reference numbers
      const { data: relatedLogs } = await supabase
        .from('financial_audit_trail')
        .select('*')
        .eq('company_id', companyId)
        .or(`entity_id.eq.${transactionId},metadata->>related_transaction_ids.cs.{${transactionId}}`)
        .neq('id', primary.id)
        .order('created_at', { ascending: true });

      // Transform and build lineage
      const auditTrail = [primary, ...(relatedLogs || [])].map(this.transformAuditLog);

      const financialData = primary.financial_data || {};

      return {
        transaction_id: transactionId,
        transaction_type: primary.action as FinancialAuditEventType,
        amount: financialData.amount || 0,
        currency: financialData.currency || 'USD',
        created_at: primary.created_at,
        created_by: primary.user_id,
        child_transaction_ids: [],
        related_transactions: (relatedLogs || []).map(log => ({
          id: log.entity_id || '',
          type: log.action as FinancialAuditEventType,
          relationship: this.determineTransactionRelationship(primary, log),
          amount: log.financial_data?.amount
        })),
        audit_trail: auditTrail,
        current_status: this.determineCurrentStatus(auditTrail),
        net_amount: this.calculateNetAmount(auditTrail)
      };
    } catch (error) {
      logger.error('Error getting transaction lineage', { error, transactionId });
      return null;
    }
  }

  /**
   * Verify data integrity of audit logs
   */
  async verifyDataIntegrity(companyId: string, dateFrom?: string, dateTo?: string): Promise<DataIntegrityReport> {
    try {
      let query = supabase
        .from('audit_integrity')
        .select(`
          *,
          audit_logs!inner(
            company_id,
            created_at
          )
        `)
        .eq('audit_logs.company_id', companyId);

      if (dateFrom) {
        query = query.gte('audit_logs.created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('audit_logs.created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to verify data integrity', { error, companyId });
        return this.createEmptyIntegrityReport();
      }

      const integrityRecords = data || [];
      const totalRecords = integrityRecords.length;
      const verifiedRecords = integrityRecords.filter(r => r.verification_status === 'verified').length;
      const tamperedRecords = integrityRecords.filter(r => r.verification_status === 'tampered').length;
      const suspiciousRecords = integrityRecords.filter(r => r.verification_status === 'suspicious').length;

      // Detailed verification for suspicious records
      const verificationErrors = [];
      for (const record of integrityRecords.filter(r => r.verification_status !== 'verified')) {
        const error = await this.verifySingleRecord(record);
        if (error) {
          verificationErrors.push(error);
        }
      }

      const integrityScore = totalRecords > 0 ? Math.round((verifiedRecords / totalRecords) * 100) : 100;

      return {
        total_records: totalRecords,
        verified_records: verifiedRecords,
        tampered_records: tamperedRecords,
        suspicious_records: suspiciousRecords,
        verification_errors: verificationErrors,
        integrity_score: integrityScore,
        last_verification: new Date().toISOString(),
        recommendations: this.generateIntegrityRecommendations(integrityScore, verificationErrors)
      };
    } catch (error) {
      logger.error('Error verifying data integrity', { error, companyId });
      return this.createEmptyIntegrityReport();
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(companyId: string, startDate: string, endDate: string): Promise<ComplianceReport> {
    try {
      // Get audit summary from database function
      const { data: summaryData, error } = await supabase
        .rpc('get_audit_summary', {
          p_company_id: companyId,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (error) {
        logger.error('Failed to generate compliance report', { error, companyId });
        return this.createEmptyComplianceReport(startDate, endDate);
      }

      // Get detailed compliance violations
      const { data: violations } = await supabase
        .from('financial_audit_trail')
        .select('*')
        .eq('company_id', companyId)
        .in('action', ['DELETE', 'CANCEL', 'REJECT'])
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      // Check for segregation of duties violations
      const sodViolations = await this.checkSegregationOfDuties(companyId, startDate, endDate);

      // Calculate compliance score
      const totalTransactions = summaryData?.total_transactions || 0;
      const highRiskOps = summaryData?.high_risk_operations || 0;
      const failedOps = summaryData?.failed_operations || 0;
      const complianceScore = totalTransactions > 0
        ? Math.max(0, 100 - Math.round(((highRiskOps + failedOps) / totalTransactions) * 100))
        : 100;

      return {
        period_start: startDate,
        period_end: endDate,
        total_transactions: totalTransactions,
        high_risk_transactions: highRiskOps,
        compliance_violations: this.categorizeViolations(violations || []),
        required_approvals_missing: 0, // Would need approval workflow data
        segregation_duties_violations: sodViolations,
        compliance_score: complianceScore,
        audit_trail_complete: true // Assuming complete if we can query all data
      };
    } catch (error) {
      logger.error('Error generating compliance report', { error, companyId });
      return this.createEmptyComplianceReport(startDate, endDate);
    }
  }

  /**
   * Export audit data
   */
  async exportAuditData(options: AuditExportOptions): Promise<Blob | null> {
    try {
      // Get filtered audit data
      const { logs } = await this.getFinancialAuditTrail(options.filters);

      // Prepare data based on options
      let exportData = logs.map(log => {
        const baseData = {
          id: log.id,
          created_at: log.created_at,
          user_name: log.user_name,
          action: log.action,
          resource_type: log.resource_type,
          entity_name: log.entity_name,
          status: log.status,
          severity: log.severity
        };

        if (options.include_integrity_data) {
          Object.assign(baseData, {
            hash_signature: log.hash_signature,
            verification_status: log.verification_status
          });
        }

        if (options.include_financial_data) {
          Object.assign(baseData, log.financial_data);
        }

        if (options.anonymize_user_data) {
          delete baseData.user_name;
        }

        if (options.compliance_mode) {
          Object.assign(baseData, {
            compliance_flags: log.compliance_flags,
            retention_period: log.retention_period
          });
        }

        return baseData;
      });

      // Generate export based on format
      switch (options.format) {
        case 'json':
          return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });

        case 'csv':
          return this.generateCSVExport(exportData);

        case 'excel':
          return this.generateExcelExport(exportData);

        case 'pdf':
          return this.generatePDFExport(exportData);

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      logger.error('Error exporting audit data', { error, options });
      return null;
    }
  }

  // Private helper methods

  private mapEventTypeToAction(eventType: FinancialAuditEventType): string {
    // Map financial event types to general actions
    if (eventType.includes('created')) return 'CREATE';
    if (eventType.includes('updated')) return 'UPDATE';
    if (eventType.includes('deleted')) return 'DELETE';
    if (eventType.includes('approved')) return 'APPROVE';
    if (eventType.includes('rejected')) return 'REJECT';
    if (eventType.includes('cancelled')) return 'CANCEL';
    if (eventType.includes('terminated')) return 'DELETE';
    if (eventType.includes('reversed')) return 'UPDATE';
    return eventType.toUpperCase();
  }

  private getDefaultSeverity(eventType: FinancialAuditEventType): AuditSeverity {
    if (eventType.includes('deleted') || eventType.includes('terminated')) return 'critical';
    if (eventType.includes('cancelled') || eventType.includes('rejected')) return 'high';
    if (eventType.includes('approved') || eventType.includes('created')) return 'medium';
    return 'low';
  }

  private async checkComplianceViolations(auditLogId: string, params: CreateFinancialAuditLogParams): Promise<void> {
    const flags: string[] = [];

    // Check for high-value transactions
    if (params.financial_data.amount && params.financial_data.amount > 10000) {
      flags.push('HIGH_VALUE_TRANSACTION');
    }

    // Check for off-hours transactions
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      flags.push('OFF_HOURS_TRANSACTION');
    }

    // Check for rapid transactions
    // This would require checking recent transactions from the same user

    if (flags.length > 0) {
      await supabase
        .from('audit_logs')
        .update({
          metadata: { compliance_flags: flags }
        })
        .eq('id', auditLogId);
    }
  }

  private transformAuditLog(log: any): FinancialAuditLog {
    return {
      id: log.id,
      user_id: log.user_id,
      user_email: log.user_email,
      user_name: log.user_name,
      company_id: log.company_id,
      action: log.action as any,
      resource_type: log.entity_type as any,
      resource_id: log.entity_id,
      entity_name: log.entity_name,
      old_values: log.old_values,
      new_values: log.new_values,
      changes_summary: log.changes_summary,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      request_method: log.request_method,
      request_path: log.request_path,
      status: log.status as any,
      error_message: log.error_message,
      severity: log.severity as any,
      metadata: log.metadata,
      notes: log.notes,
      created_at: log.created_at,
      event_type: log.metadata?.event_type as FinancialAuditEventType,
      financial_data: log.financial_data || {},
      hash_signature: log.hash_signature,
      verification_status: log.verification_status,
      previous_hash: null, // Not exposed in view
      compliance_flags: log.metadata?.compliance_flags || [],
      retention_period: log.metadata?.retention_period,
      archival_date: log.metadata?.archival_date
    };
  }

  private createEmptySummary(): FinancialAuditSummary {
    return {
      total_transactions: 0,
      total_amount: 0,
      amount_by_currency: {},
      by_event_type: {} as Record<FinancialAuditEventType, number>,
      by_status: {} as Record<AuditStatus, number>,
      by_severity: {} as Record<AuditSeverity, number>,
      failed_operations: 0,
      high_risk_operations: 0,
      compliance_violations: 0,
      tampered_records: 0,
      period_start: '',
      period_end: ''
    };
  }

  private async generateFinancialSummary(
    filters: FinancialAuditFilters,
    logs: FinancialAuditLog[],
    totalCount: number
  ): Promise<FinancialAuditSummary> {
    const summary = this.createEmptySummary();

    summary.total_transactions = totalCount;
    summary.period_start = filters.date_from || '';
    summary.period_end = filters.date_to || '';

    // Calculate totals and aggregates
    logs.forEach(log => {
      // Total amount
      if (log.financial_data.amount) {
        summary.total_amount += log.financial_data.amount;

        const currency = log.financial_data.currency || 'USD';
        summary.amount_by_currency[currency] =
          (summary.amount_by_currency[currency] || 0) + log.financial_data.amount;
      }

      // By event type
      if (log.event_type) {
        summary.by_event_type[log.event_type] =
          (summary.by_event_type[log.event_type] || 0) + 1;
      }

      // By status
      if (log.status) {
        summary.by_status[log.status] =
          (summary.by_status[log.status] || 0) + 1;
      }

      // By severity
      if (log.severity) {
        summary.by_severity[log.severity] =
          (summary.by_severity[log.severity] || 0) + 1;
      }

      // Failed operations
      if (log.status === 'failed') {
        summary.failed_operations++;
      }

      // High risk operations
      if (log.severity === 'critical' || log.severity === 'high') {
        summary.high_risk_operations++;
      }

      // Compliance violations
      if (log.compliance_flags && log.compliance_flags.length > 0) {
        summary.compliance_violations++;
      }

      // Tampered records
      if (log.verification_status === 'tampered') {
        summary.tampered_records++;
      }
    });

    return summary;
  }

  private determineTransactionRelationship(primary: any, related: any): 'parent' | 'child' | 'related' | 'reversal' | 'refund' {
    const primaryDate = new Date(primary.created_at);
    const relatedDate = new Date(related.created_at);

    if (relatedDate < primaryDate) {
      return 'parent';
    }

    if (related.action.includes('reverse') || related.action.includes('refund')) {
      return related.action.includes('refund') ? 'refund' : 'reversal';
    }

    return 'related';
  }

  private determineCurrentStatus(auditTrail: FinancialAuditLog[]): 'active' | 'cancelled' | 'reversed' | 'refunded' | 'disputed' {
    const latestLog = auditTrail[auditTrail.length - 1];

    if (latestLog.action.includes('cancel')) return 'cancelled';
    if (latestLog.action.includes('reverse')) return 'reversed';
    if (latestLog.action.includes('refund')) return 'refunded';
    if (latestLog.status === 'failed') return 'disputed';

    return 'active';
  }

  private calculateNetAmount(auditTrail: FinancialAuditLog[]): number {
    let netAmount = 0;

    auditTrail.forEach(log => {
      const amount = log.financial_data.amount || 0;

      if (log.action.includes('create') || log.action.includes('approve')) {
        netAmount += amount;
      } else if (log.action.includes('reverse') || log.action.includes('refund') || log.action.includes('delete')) {
        netAmount -= amount;
      }
    });

    return Math.max(0, netAmount);
  }

  private async verifySingleRecord(record: any): Promise<any> {
    // Implement detailed verification for a single record
    // This would recalculate the hash and compare with stored hash
    return null; // Placeholder
  }

  private generateIntegrityRecommendations(score: number, errors: any[]): string[] {
    const recommendations = [];

    if (score < 90) {
      recommendations.push('Review suspicious audit records immediately');
    }

    if (errors.length > 0) {
      recommendations.push('Investigate tampered records and restore from backups');
    }

    recommendations.push('Implement additional security measures for audit trail access');
    recommendations.push('Schedule regular integrity verification checks');

    return recommendations;
  }

  private createEmptyIntegrityReport(): DataIntegrityReport {
    return {
      total_records: 0,
      verified_records: 0,
      tampered_records: 0,
      suspicious_records: 0,
      verification_errors: [],
      integrity_score: 0,
      last_verification: new Date().toISOString(),
      recommendations: []
    };
  }

  private createEmptyComplianceReport(startDate: string, endDate: string): ComplianceReport {
    return {
      period_start: startDate,
      period_end: endDate,
      total_transactions: 0,
      high_risk_transactions: 0,
      compliance_violations: [],
      required_approvals_missing: 0,
      segregation_duties_violations: [],
      compliance_score: 0,
      audit_trail_complete: false
    };
  }

  private categorizeViolations(violations: any[]): any[] {
    // Categorize violations by type
    const categories = {};

    violations.forEach(violation => {
      const type = violation.action;
      if (!categories[type]) {
        categories[type] = {
          violation_type: type,
          count: 0,
          total_amount: 0,
          description: this.getViolationDescription(type)
        };
      }
      categories[type].count++;
      categories[type].total_amount += violation.financial_data?.amount || 0;
    });

    return Object.values(categories);
  }

  private getViolationDescription(type: string): string {
    const descriptions = {
      'DELETE': 'Critical data deletion detected',
      'CANCEL': 'Important transaction cancellation',
      'REJECT': 'Approval rejection indicates potential issues'
    };

    return descriptions[type] || 'Unusual operation detected';
  }

  private async checkSegregationOfDuties(companyId: string, startDate: string, endDate: string): Promise<any[]> {
    // Implement segregation of duties analysis
    // This would check if users are performing conflicting roles
    return [];
  }

  private async generateCSVExport(data: any[]): Promise<Blob> {
    // Simple CSV generation
    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }

  private async generateExcelExport(data: any[]): Promise<Blob> {
    // Excel export would require a library like xlsx
    // For now, return CSV format
    return this.generateCSVExport(data);
  }

  private async generatePDFExport(data: any[]): Promise<Blob> {
    // PDF export would require a library like jspdf
    // For now, return JSON format
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }
}

// Export singleton instance
export const financialAuditService = FinancialAuditService.getInstance();