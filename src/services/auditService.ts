/**
 * Comprehensive Financial Audit Service
 * Provides complete audit trail functionality for financial operations
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import {
  AuditAction,
  AuditResourceType,
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
  AuditSeverity,
  CreateFinancialAuditLogParams
} from '@/types/auditLog';

type AuditLogRow = Database['public']['Tables']['audit_logs']['Row'];
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];
type FinancialData = CreateFinancialAuditLogParams['financial_data'];

interface AuditIntegrityRpcRow {
  company_id: string | null;
  checked_entries: number;
  broken_entries: number;
  missing_hash_entries: number;
  is_valid: boolean;
}

interface AuditIntegrityRpcResult {
  data: AuditIntegrityRpcRow[] | null;
  error: { message: string } | null;
}

const AUDIT_ACTIONS = new Set<AuditAction>([
  'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'CANCEL', 'ARCHIVE',
  'RESTORE', 'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'ROLE_CHANGE',
]);

const AUDIT_RESOURCE_TYPES = new Set<AuditResourceType>([
  'contract', 'customer', 'vehicle', 'invoice', 'payment', 'employee', 'user',
  'company', 'maintenance', 'penalty', 'journal_entry', 'account', 'role', 'permission',
  'system', 'other',
]);

const AUDIT_STATUSES = new Set<AuditStatus>(['success', 'failed', 'pending']);
const AUDIT_SEVERITIES = new Set<AuditSeverity>(['low', 'medium', 'high', 'critical']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeFinancialData(value: unknown): FinancialData {
  if (!isRecord(value)) return {};

  return {
    amount: getNumber(value.amount),
    currency: getString(value.currency),
    account_code: getString(value.account_code),
    reference_number: getString(value.reference_number),
    transaction_date: getString(value.transaction_date),
    payment_method: getString(value.payment_method),
    invoice_number: getString(value.invoice_number),
    contract_number: getString(value.contract_number),
    customer_id: getString(value.customer_id),
    vendor_id: getString(value.vendor_id),
    tax_amount: getNumber(value.tax_amount),
    discount_amount: getNumber(value.discount_amount),
    balance: getNumber(value.balance),
  };
}

function toJson(value: unknown): Json | null {
  if (value === undefined || value === null) return null;

  try {
    return JSON.parse(JSON.stringify(value)) as Json;
  } catch {
    return null;
  }
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
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Get company context
      const { data: companyContext } = await supabase
        .rpc('get_user_company_id');

      if (!companyContext) {
        throw new Error('User company context is unavailable');
      }

      const complianceFlags = this.detectComplianceViolations(params);
      const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

      // Prepare audit log data
      const auditLogData: AuditLogInsert = {
        user_id: user.id,
        user_email: user.email ?? null,
        user_name: profileName || user.email?.split('@')[0] || null,
        company_id: companyContext,
        action: this.mapEventTypeToAction(params.event_type),
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        entity_name: params.entity_name ?? null,
        old_values: toJson(params.old_values),
        new_values: toJson(params.new_values),
        changes_summary: params.changes_summary ?? null,
        metadata: toJson({
          ...params.metadata,
          financial_data: params.financial_data,
          event_type: params.event_type,
          ...(complianceFlags.length > 0 ? { compliance_flags: complianceFlags } : {}),
        }),
        notes: params.notes ?? null,
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
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      if (filters.resource_type) {
        query = Array.isArray(filters.resource_type)
          ? query.in('resource_type', filters.resource_type)
          : query.eq('resource_type', filters.resource_type);
      }
      if (filters.resource_id) {
        query = query.eq('resource_id', filters.resource_id);
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
        const search = filters.search.replace(/[,%()]/g, ' ').trim();
        if (search) {
          query = query.or(`entity_name.ilike.%${search}%,notes.ilike.%${search}%`);
        }
      }
      if (filters.event_type) {
        query = Array.isArray(filters.event_type)
          ? query.in('metadata->>event_type', filters.event_type)
          : query.eq('metadata->>event_type', filters.event_type);
      }

      // Financial-specific filters
      if (filters.amount_min !== undefined) {
        query = query.filter('metadata->financial_data->>amount', 'gte', String(filters.amount_min));
      }
      if (filters.amount_max !== undefined) {
        query = query.filter('metadata->financial_data->>amount', 'lte', String(filters.amount_max));
      }
      if (filters.currency) {
        query = query.filter('metadata->financial_data->>currency', 'eq', filters.currency);
      }
      if (filters.account_code) {
        query = query.filter('metadata->financial_data->>account_code', 'eq', filters.account_code);
      }
      if (filters.reference_number) {
        query = query.filter('metadata->financial_data->>reference_number', 'ilike', `%${filters.reference_number}%`);
      }
      if (filters.verification_status) {
        query = query.eq('metadata->>verification_status', filters.verification_status);
      }
      if (filters.transaction_date_from) {
        query = query.gte('metadata->financial_data->>transaction_date', filters.transaction_date_from);
      }
      if (filters.transaction_date_to) {
        query = query.lte('metadata->financial_data->>transaction_date', filters.transaction_date_to);
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
      const transformedLogs = (logs || []).map(log => this.transformAuditLog(log));

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
      const { data: transactionLogs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_id', transactionId)
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (error || !transactionLogs || transactionLogs.length === 0) {
        logger.error('Failed to find primary transaction', { error, transactionId });
        return null;
      }

      const primary = this.transformAuditLog(transactionLogs[0]);

      const { data: explicitlyRelatedLogs, error: relatedError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .contains('metadata', { related_transaction_ids: [transactionId] })
        .order('created_at', { ascending: true });

      if (relatedError) {
        logger.warn('Unable to load explicitly related audit transactions', {
          error: relatedError,
          transactionId,
        });
      }

      const uniqueRows = new Map<string, AuditLogRow>();
      for (const row of [...transactionLogs, ...(explicitlyRelatedLogs || [])]) {
        uniqueRows.set(row.id, row);
      }

      const auditTrail = [...uniqueRows.values()]
        .sort((left, right) => (left.created_at || '').localeCompare(right.created_at || ''))
        .map(row => this.transformAuditLog(row));
      const relatedLogs = auditTrail.filter(log => log.resource_id !== transactionId);

      return {
        transaction_id: transactionId,
        transaction_type: primary.event_type,
        amount: primary.financial_data.amount || 0,
        currency: primary.financial_data.currency || 'QAR',
        created_at: primary.created_at,
        created_by: primary.user_id || '',
        child_transaction_ids: [],
        related_transactions: relatedLogs.map(log => ({
          id: log.resource_id || '',
          type: log.event_type,
          relationship: this.determineTransactionRelationship(primary, log),
          amount: log.financial_data.amount
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
      // The hash-chain function is introduced by a migration newer than the
      // generated client types, so keep the untyped boundary limited to this RPC.
      const verifyHashChain = supabase.rpc as unknown as (
        name: 'verify_audit_log_hash_chain',
        args: { p_company_id: string }
      ) => PromiseLike<AuditIntegrityRpcResult>;
      const { data, error } = await verifyHashChain('verify_audit_log_hash_chain', {
        p_company_id: companyId,
      });

      if (error) {
        logger.error('Failed to verify data integrity', { error, companyId });
        let countQuery = supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId);
        if (dateFrom) countQuery = countQuery.gte('created_at', dateFrom);
        if (dateTo) countQuery = countQuery.lte('created_at', dateTo);
        const { count } = await countQuery;
        const unverifiedCount = count || 0;

        return {
          total_records: unverifiedCount,
          verified_records: 0,
          tampered_records: 0,
          suspicious_records: unverifiedCount,
          verification_errors: [],
          integrity_score: 0,
          last_verification: new Date().toISOString(),
          recommendations: [
            'Deploy the verify_audit_log_hash_chain migration before relying on audit integrity results.',
          ],
        };
      }

      const result = data?.[0];
      if (!result) {
        return {
          ...this.createEmptyIntegrityReport(),
          integrity_score: 100,
          recommendations: ['No audit records were found for this company.'],
        };
      }

      const invalidRecords = Math.max(result.broken_entries, result.missing_hash_entries);
      const verifiedRecords = Math.max(0, result.checked_entries - invalidRecords);
      const tamperedRecords = Math.max(0, result.broken_entries - result.missing_hash_entries);
      const verificationErrors: DataIntegrityReport['verification_errors'] = [];

      if (result.broken_entries > 0) {
        verificationErrors.push({
          record_id: 'audit-chain',
          error_type: 'broken_hash_chain',
          expected_hash: 'valid chained hashes',
          actual_hash: `${result.broken_entries} broken entries`,
        });
      }
      if (result.missing_hash_entries > 0) {
        verificationErrors.push({
          record_id: 'audit-chain',
          error_type: 'missing_hash',
          expected_hash: 'entry hash present',
          actual_hash: `${result.missing_hash_entries} entries without hashes`,
        });
      }

      const integrityScore = result.checked_entries > 0
        ? Math.round((verifiedRecords / result.checked_entries) * 100)
        : 100;
      const recommendations = this.generateIntegrityRecommendations(integrityScore, verificationErrors);
      if (dateFrom || dateTo) {
        recommendations.push('Hash-chain verification covers the complete company ledger; date filters are informational only.');
      }

      if (result.is_valid && verificationErrors.length === 0) {
        recommendations.unshift('The audit hash chain is complete and valid.');
      }

      return {
        total_records: result.checked_entries,
        verified_records: verifiedRecords,
        tampered_records: tamperedRecords,
        suspicious_records: result.missing_hash_entries,
        verification_errors: verificationErrors,
        integrity_score: integrityScore,
        last_verification: new Date().toISOString(),
        recommendations,
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
      const periodEnd = endDate.length === 10 ? `${endDate}T23:59:59.999Z` : endDate;
      const [allLogsResult, highRiskResult, failedResult, violationsResult] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .eq('company_id', companyId)
          .gte('created_at', startDate)
          .lte('created_at', periodEnd)
          .order('created_at', { ascending: false })
          .range(0, 9999),
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('severity', ['critical', 'high'])
          .gte('created_at', startDate)
          .lte('created_at', periodEnd),
        supabase
          .from('audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'failed')
          .gte('created_at', startDate)
          .lte('created_at', periodEnd),
        supabase
          .from('audit_logs')
          .select('*')
          .eq('company_id', companyId)
          .in('action', ['DELETE', 'CANCEL', 'REJECT'])
          .gte('created_at', startDate)
          .lte('created_at', periodEnd)
          .range(0, 9999),
      ]);

      if (allLogsResult.error) {
        logger.error('Failed to generate compliance report', {
          error: allLogsResult.error,
          companyId,
        });
        return this.createEmptyComplianceReport(startDate, endDate);
      }

      const sodViolations = await this.checkSegregationOfDuties(companyId, startDate, endDate);
      const totalTransactions = allLogsResult.count || 0;
      const highRiskOps = highRiskResult.count || 0;
      const failedOps = failedResult.count || 0;
      const complianceScore = totalTransactions > 0
        ? Math.max(0, 100 - Math.round(((highRiskOps + failedOps) / totalTransactions) * 100))
        : 100;
      const violations = (violationsResult.data || []).map(row => this.transformAuditLog(row));

      return {
        period_start: startDate,
        period_end: endDate,
        total_transactions: totalTransactions,
        high_risk_transactions: highRiskOps,
        compliance_violations: this.categorizeViolations(violations),
        required_approvals_missing: 0, // Would need approval workflow data
        segregation_duties_violations: sodViolations,
        compliance_score: complianceScore,
        audit_trail_complete: (allLogsResult.data?.length || 0) === totalTransactions,
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

  private detectComplianceViolations(params: CreateFinancialAuditLogParams): string[] {
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

    return flags;
  }

  private transformAuditLog(log: AuditLogRow): FinancialAuditLog {
    const metadata = isRecord(log.metadata) ? log.metadata : {};
    const action = this.normalizeAction(log.action);
    const resourceType = this.normalizeResourceType(log.resource_type);
    const eventType = this.normalizeEventType(metadata.event_type, resourceType, action);
    const verificationStatus = metadata.verification_status;

    return {
      id: log.id,
      user_id: log.user_id || undefined,
      user_email: log.user_email || undefined,
      user_name: log.user_name || undefined,
      company_id: log.company_id || undefined,
      action,
      resource_type: resourceType,
      resource_id: log.resource_id || undefined,
      entity_name: log.entity_name || undefined,
      old_values: isRecord(log.old_values) ? log.old_values : undefined,
      new_values: isRecord(log.new_values) ? log.new_values : undefined,
      changes_summary: log.changes_summary || undefined,
      ip_address: getString(log.ip_address),
      user_agent: log.user_agent || undefined,
      request_method: log.request_method || undefined,
      request_path: log.request_path || undefined,
      status: this.normalizeStatus(log.status),
      error_message: log.error_message || undefined,
      severity: this.normalizeSeverity(log.severity),
      metadata,
      notes: log.notes || undefined,
      created_at: log.created_at || '',
      event_type: eventType,
      financial_data: normalizeFinancialData(metadata.financial_data),
      hash_signature: getString(metadata.entry_hash) || getString(metadata.hash_signature),
      verification_status:
        verificationStatus === 'verified' || verificationStatus === 'tampered' || verificationStatus === 'suspicious'
          ? verificationStatus
          : undefined,
      previous_hash: getString(metadata.previous_hash),
      compliance_flags: Array.isArray(metadata.compliance_flags)
        ? metadata.compliance_flags.filter((flag): flag is string => typeof flag === 'string')
        : [],
      retention_period: getNumber(metadata.retention_period),
      archival_date: getString(metadata.archival_date),
    };
  }

  private normalizeAction(value: string): AuditAction {
    const normalized = value.toUpperCase() as AuditAction;
    return AUDIT_ACTIONS.has(normalized) ? normalized : 'UPDATE';
  }

  private normalizeResourceType(value: string): AuditResourceType {
    const normalized = value.toLowerCase() as AuditResourceType;
    return AUDIT_RESOURCE_TYPES.has(normalized) ? normalized : 'other';
  }

  private normalizeStatus(value: string | null): AuditStatus {
    const normalized = (value || 'success').toLowerCase() as AuditStatus;
    return AUDIT_STATUSES.has(normalized) ? normalized : 'success';
  }

  private normalizeSeverity(value: string | null): AuditSeverity {
    const normalized = (value || 'low').toLowerCase() as AuditSeverity;
    return AUDIT_SEVERITIES.has(normalized) ? normalized : 'low';
  }

  private normalizeEventType(
    value: unknown,
    resourceType: AuditResourceType,
    action: AuditAction
  ): FinancialAuditEventType {
    const storedEventType = getString(value);
    if (storedEventType) return storedEventType as FinancialAuditEventType;

    const suffixByAction: Partial<Record<AuditAction, string>> = {
      CREATE: 'created',
      UPDATE: 'updated',
      DELETE: 'deleted',
      APPROVE: 'approved',
      REJECT: 'rejected',
      CANCEL: 'cancelled',
    };
    const suffix = suffixByAction[action];
    if (suffix && ['payment', 'invoice', 'contract', 'journal_entry', 'account'].includes(resourceType)) {
      return `${resourceType}_${suffix}` as FinancialAuditEventType;
    }

    return 'audit_performed';
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

  private determineTransactionRelationship(
    primary: FinancialAuditLog,
    related: FinancialAuditLog
  ): 'parent' | 'child' | 'related' | 'reversal' | 'refund' {
    const primaryDate = new Date(primary.created_at);
    const relatedDate = new Date(related.created_at);

    if (relatedDate < primaryDate) {
      return 'parent';
    }

    if (related.event_type.includes('reversed') || related.event_type.includes('refunded')) {
      return related.event_type.includes('refunded') ? 'refund' : 'reversal';
    }

    return 'related';
  }

  private determineCurrentStatus(auditTrail: FinancialAuditLog[]): 'active' | 'cancelled' | 'reversed' | 'refunded' | 'disputed' {
    const latestLog = auditTrail[auditTrail.length - 1];

    if (latestLog.event_type.includes('cancelled') || latestLog.event_type.includes('terminated')) return 'cancelled';
    if (latestLog.event_type.includes('reversed')) return 'reversed';
    if (latestLog.event_type.includes('refunded')) return 'refunded';
    if (latestLog.status === 'failed') return 'disputed';

    return 'active';
  }

  private calculateNetAmount(auditTrail: FinancialAuditLog[]): number {
    if (auditTrail.length === 0) return 0;

    let netAmount = auditTrail.find(log => (log.financial_data.amount || 0) !== 0)?.financial_data.amount || 0;
    for (const log of auditTrail.slice(1)) {
      const amount = log.financial_data.amount || 0;
      if (log.event_type.includes('refunded') || log.event_type.includes('reversed')) {
        netAmount -= amount;
      }
      if (
        log.event_type.includes('deleted') ||
        log.event_type.includes('cancelled') ||
        log.event_type.includes('terminated')
      ) {
        netAmount = 0;
      }
    }

    return Math.max(0, netAmount);
  }

  private generateIntegrityRecommendations(
    score: number,
    errors: DataIntegrityReport['verification_errors']
  ): string[] {
    const recommendations: string[] = [];

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

  private categorizeViolations(
    violations: FinancialAuditLog[]
  ): ComplianceReport['compliance_violations'] {
    const categories: Record<string, ComplianceReport['compliance_violations'][number]> = {};

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
      categories[type].total_amount += violation.financial_data.amount || 0;
    });

    return Object.values(categories);
  }

  private getViolationDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'DELETE': 'Critical data deletion detected',
      'CANCEL': 'Important transaction cancellation',
      'REJECT': 'Approval rejection indicates potential issues'
    };

    return descriptions[type] || 'Unusual operation detected';
  }

  private async checkSegregationOfDuties(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<ComplianceReport['segregation_duties_violations']> {
    void companyId;
    void startDate;
    void endDate;
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

  /**
   * Subscribe to real-time audit updates
   */
  subscribeToRealtimeUpdates(companyId: string, callback: (log: FinancialAuditLog) => void) {
    const channelName = `audit-updates-${companyId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'audit_logs',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          callback(this.transformAuditLog(payload.new as AuditLogRow));
        }
      )
      .subscribe();

    return channel;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromRealtimeUpdates(channel: any) {
    channel.unsubscribe();
  }

  /**
   * Get audit retention policies
   */
  async getRetentionPolicy(): Promise<AuditRetentionPolicy[]> {
    // This would typically be stored in a configuration table
    // For now, return default retention policies
    return [
      {
        entity_type: 'payment',
        retention_days: 2555, // 7 years
        archival_after_days: 1095, // 3 years
        auto_delete: true,
        compliance_requirements: ['SOX', 'PCI-DSS', 'GAAP']
      },
      {
        entity_type: 'invoice',
        retention_days: 2555,
        archival_after_days: 1095,
        auto_delete: true,
        compliance_requirements: ['SOX', 'PCI-DSS', 'Tax Regulations']
      },
      {
        entity_type: 'contract',
        retention_days: 2555,
        archival_after_days: 1825, // 5 years
        auto_delete: true,
        compliance_requirements: ['Legal Requirements', 'Contract Laws']
      },
      {
        entity_type: 'journal_entry',
        retention_days: 2555,
        archival_after_days: 1825,
        auto_delete: true,
        compliance_requirements: ['SOX', 'Accounting Standards']
      },
      {
        entity_type: 'account',
        retention_days: 2555,
        auto_delete: false, // Never auto-delete account records
        compliance_requirements: ['Regulatory Requirements']
      },
      {
        entity_type: 'customer',
        retention_days: 1825, // 5 years
        archival_after_days: 730, // 2 years
        auto_delete: true,
        compliance_requirements: ['Privacy Regulations', 'GDPR']
      }
    ];
  }

  /**
   * Archive old audit logs
   */
  async archiveAuditLogs(beforeDate: string): Promise<{ archived: number; errors: string[] }> {
    void beforeDate;

    return {
      archived: 0,
      errors: ['Audit logs are append-only. Create an audit retention snapshot instead of mutating audit_log rows.'],
    };
  }

  /**
   * Delete audit logs older than retention period
   */
  async deleteOldAuditLogs(): Promise<{ deleted: number; errors: string[] }> {
    return {
      deleted: 0,
      errors: ['Audit logs are immutable and cannot be deleted. Use retention snapshots outside the append-only ledger.'],
    };
  }
}

// Export singleton instance
export const financialAuditService = FinancialAuditService.getInstance();
