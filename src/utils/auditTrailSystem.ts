import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface AuditTrailEntry {
  id?: string;
  userId: string;
  userEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  companyId: string;
}

export interface AuditQuery {
  companyId: string;
  resourceType?: string;
  resourceId?: string;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  entries: AuditTrailEntry[];
  totalCount: number;
  summary: {
    byAction: Record<string, number>;
    byUser: Record<string, number>;
    byResourceType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

class AuditTrailSystem {
  async logAction(entry: Omit<AuditTrailEntry, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const auditEntry = {
        user_id: entry.userId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        old_values: entry.oldValues || null,
        new_values: entry.newValues || null,
        company_id: entry.companyId,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
        severity: entry.severity || 'low',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('audit_logs')
        .insert(auditEntry);

      if (error) throw error;

      logger.debug('Audit trail entry created', { 
        action: entry.action, 
        resourceType: entry.resourceType, 
        resourceId: entry.resourceId 
      });

      return true;
    } catch (error) {
      logger.error('Failed to create audit trail entry', { error, entry });
      return false;
    }
  }

  async logPaymentAction(
    action: 'created' | 'updated' | 'deleted' | 'linked' | 'allocated',
    paymentId: string,
    userId: string,
    companyId: string,
    oldValues?: any,
    newValues?: any,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    return this.logAction({
      userId,
      action: `payment_${action}`,
      resourceType: 'payment',
      resourceId: paymentId,
      oldValues,
      newValues,
      metadata,
      severity: this.getPaymentActionSeverity(action),
      companyId
    });
  }

  async logContractAction(
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'cancelled',
    contractId: string,
    userId: string,
    companyId: string,
    oldValues?: any,
    newValues?: any
  ): Promise<boolean> {
    return this.logAction({
      userId,
      action: `contract_${action}`,
      resourceType: 'contract',
      resourceId: contractId,
      oldValues,
      newValues,
      severity: this.getContractActionSeverity(action),
      companyId
    });
  }

  async logJournalEntryAction(
    action: 'created' | 'updated' | 'deleted' | 'posted' | 'reversed',
    journalEntryId: string,
    userId: string,
    companyId: string,
    oldValues?: any,
    newValues?: any
  ): Promise<boolean> {
    return this.logAction({
      userId,
      action: `journal_entry_${action}`,
      resourceType: 'journal_entry',
      resourceId: journalEntryId,
      oldValues,
      newValues,
      severity: 'high', // Journal entries are always high severity
      companyId
    });
  }

  async logAccountAction(
    action: 'created' | 'updated' | 'deleted' | 'deactivated',
    accountId: string,
    userId: string,
    companyId: string,
    oldValues?: any,
    newValues?: any
  ): Promise<boolean> {
    return this.logAction({
      userId,
      action: `account_${action}`,
      resourceType: 'chart_of_accounts',
      resourceId: accountId,
      oldValues,
      newValues,
      severity: action === 'deleted' ? 'critical' : 'medium',
      companyId
    });
  }

  async getAuditTrail(query: AuditQuery): Promise<AuditReport> {
    try {
      let supabaseQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('company_id', query.companyId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (query.resourceType) {
        supabaseQuery = supabaseQuery.eq('resource_type', query.resourceType);
      }
      if (query.resourceId) {
        supabaseQuery = supabaseQuery.eq('resource_id', query.resourceId);
      }
      if (query.userId) {
        supabaseQuery = supabaseQuery.eq('user_id', query.userId);
      }
      if (query.action) {
        supabaseQuery = supabaseQuery.eq('action', query.action);
      }
      if (query.severity) {
        supabaseQuery = supabaseQuery.eq('severity', query.severity);
      }
      if (query.startDate) {
        supabaseQuery = supabaseQuery.gte('created_at', query.startDate);
      }
      if (query.endDate) {
        supabaseQuery = supabaseQuery.lte('created_at', query.endDate);
      }

      // Apply pagination
      const limit = query.limit || 50;
      const offset = query.offset || 0;
      supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

      const { data: entries, error, count } = await supabaseQuery;

      if (error) throw error;

      // Generate summary
      const summary = this.generateAuditSummary(entries || []);

      return {
        entries: (entries || []).map(this.mapAuditEntry),
        totalCount: count || 0,
        summary
      };
    } catch (error) {
      logger.error('Failed to fetch audit trail', { error, query });
      return {
        entries: [],
        totalCount: 0,
        summary: {
          byAction: {},
          byUser: {},
          byResourceType: {},
          bySeverity: {}
        }
      };
    }
  }

  async getResourceAuditHistory(
    resourceType: string,
    resourceId: string,
    companyId: string
  ): Promise<AuditTrailEntry[]> {
    const query: AuditQuery = {
      companyId,
      resourceType,
      resourceId,
      limit: 100
    };

    const report = await this.getAuditTrail(query);
    return report.entries;
  }

  async getUserActivitySummary(
    userId: string,
    companyId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    lastActivity: string | null;
    riskScore: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query: AuditQuery = {
      companyId,
      userId,
      startDate: startDate.toISOString(),
      limit: 1000
    };

    const report = await this.getAuditTrail(query);
    const entries = report.entries;

    const actionsByType = entries.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const lastActivity = entries.length > 0 ? entries[0].timestamp : null;
    const riskScore = this.calculateUserRiskScore(entries);

    return {
      totalActions: entries.length,
      actionsByType,
      lastActivity,
      riskScore
    };
  }

  private getPaymentActionSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'created':
      case 'linked':
        return 'medium';
      case 'updated':
      case 'allocated':
        return 'low';
      case 'deleted':
        return 'high';
      default:
        return 'low';
    }
  }

  private getContractActionSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    switch (action) {
      case 'created':
      case 'activated':
        return 'high';
      case 'updated':
        return 'medium';
      case 'cancelled':
      case 'deleted':
        return 'critical';
      default:
        return 'medium';
    }
  }

  private mapAuditEntry(entry: any): AuditTrailEntry {
    return {
      id: entry.id,
      userId: entry.user_id,
      action: entry.action,
      resourceType: entry.resource_type,
      resourceId: entry.resource_id,
      oldValues: entry.old_values,
      newValues: entry.new_values,
      timestamp: entry.created_at,
      ipAddress: entry.ip_address,
      userAgent: entry.user_agent,
      severity: entry.severity,
      companyId: entry.company_id
    };
  }

  private generateAuditSummary(entries: any[]) {
    const summary = {
      byAction: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
      byResourceType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    entries.forEach(entry => {
      // By action
      summary.byAction[entry.action] = (summary.byAction[entry.action] || 0) + 1;
      
      // By user
      summary.byUser[entry.user_id] = (summary.byUser[entry.user_id] || 0) + 1;
      
      // By resource type
      summary.byResourceType[entry.resource_type] = (summary.byResourceType[entry.resource_type] || 0) + 1;
      
      // By severity
      summary.bySeverity[entry.severity] = (summary.bySeverity[entry.severity] || 0) + 1;
    });

    return summary;
  }

  private calculateUserRiskScore(entries: AuditTrailEntry[]): number {
    let score = 0;
    
    entries.forEach(entry => {
      switch (entry.severity) {
        case 'low':
          score += 1;
          break;
        case 'medium':
          score += 2;
          break;
        case 'high':
          score += 5;
          break;
        case 'critical':
          score += 10;
          break;
      }
    });

    // Normalize to 0-100 scale
    return Math.min(score, 100);
  }
}

export const auditTrailSystem = new AuditTrailSystem();