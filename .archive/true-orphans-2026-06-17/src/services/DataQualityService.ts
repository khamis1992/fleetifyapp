/**
 * Data Quality Service
 * 
 * Service for tracking, detecting, and resolving data quality issues
 * in the payment system and related subsystems.
 * 
 * Provides:
 * - Automatic data quality scanning
 * - Issue classification (severity levels)
 * - Resolution workflow
 * - Data quality metrics and reporting
 * - Preventive measures (validation rules)
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Data Quality Issue Types
 * Classifies the type of data quality issue
 */
export enum DataQualityIssueType {
  DUPLICATE_RECORD = 'duplicate_record',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_VALUE = 'invalid_value',
  REFERENTIAL_INTEGRITY = 'referential_integrity',
  DATA_INCONSISTENCY = 'data_inconsistency',
  STALE_DATA = 'stale_data',
  ORPHANED_RECORD = 'orphaned_record',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  FORMAT_VIOLATION = 'format_violation',
  SECURITY_VIOLATION = 'security_violation',
  OTHER = 'other'
}

/**
 * Data Quality Severity Levels
 * Priority levels for resolving data quality issues
 */
export enum DataQualitySeverity {
  CRITICAL = 'critical', // Affects system integrity or financial accuracy
  HIGH = 'high',       // Affects user experience or reporting
  MEDIUM = 'medium',     // Affects data quality but system functional
  LOW = 'low',         // Minor issue, cosmetic or informational
  INFO = 'info'        // Informational, no action required
}

/**
 * Data Quality Issue Status
 * Lifecycle status of a data quality issue
 */
export enum DataQualityIssueStatus {
  OPEN = 'open',           // Issue detected, needs investigation
  IN_PROGRESS = 'in_progress', // Being investigated/resolved
  REVIEWED = 'reviewed', // Under manual review
  RESOLVED = 'resolved',     // Issue has been fixed
  CLOSED = 'closed',         // Issue closed (not applicable)
  IGNORED = 'ignored'       // Issue acknowledged but not fixing
}

/**
 * Data Quality Rule Definition
 * Represents a data quality validation rule
 */
export interface DataQualityRule {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  severity: DataQualitySeverity;
  entityType: string; // Table name (payments, invoices, contracts, etc.)
  conditionSql: string; // SQL condition to detect issues
  checkType: 'sql_query' | 'trigger_check' | 'code_validation';
  resolutionSql?: string; // SQL to fix the issue (optional)
  resolutionFunction?: string; // Function name to call for resolution
  autoResolve: boolean; // Whether issue can be auto-resolved
  tags: string[]; // Tags for categorization
}

/**
 * Data Quality Issue Record
 * Represents a detected data quality issue
 */
export interface DataQualityIssue {
  id: string;
  companyId: string;
  ruleId: string;
  ruleName: string;
  ruleNameAr: string;
  type: DataQualityIssueType;
  severity: DataQualitySeverity;
  status: DataQualityIssueStatus;
  entityType: string;
  entityId: string | null;
  field: string | null;
  currentValue: any | null;
  expectedValue?: string;
  description: string;
  descriptionAr: string;
  affectedRecords: number;
  firstDetectedAt: string;
  lastDetectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  resolutionAr: string | null;
  autoResolved: boolean;
}

/**
 * Data Quality Metrics
 * Aggregate statistics on data quality
 */
export interface DataQualityMetrics {
  totalIssues: number;
  issuesByType: Record<DataQualityIssueType, number>;
  issuesBySeverity: Record<DataQualitySeverity, number>;
  issuesByEntity: Record<string, number>;
  issuesByStatus: Record<DataQualityIssueStatus, number>;
  openCriticalIssues: number;
  highPriorityIssues: number;
  mediumPriorityIssues: number;
  lowPriorityIssues: number;
  overallScore: number; // 0-100, higher is worse
  lastScannedAt: string;
}

/**
 * Data Quality Scan Options
 * Configuration for data quality scanning
 */
export interface DataQualityScanOptions {
  companyId: string;
  entityTypes?: string[]; // Entities to scan (all if not provided)
  severityFilter?: DataQualitySeverity[]; // Only scan issues of certain severity
  includeAutoResolvable?: boolean; // Include only issues that can be auto-resolved
  limit?: number; // Limit results
}

/**
 * Resolution Options
 * Configuration for resolving data quality issues
 */
export interface ResolutionOptions {
  autoApply: boolean; // Automatically apply the resolution
  dryRun: boolean; // Preview resolution without applying
  createAuditLog: boolean; // Create audit log entry
  userId?: string; // User resolving the issue
}

/**
 * Data Quality Service
 * Main service class
 */
class DataQualityService {
  // In-memory cache of data quality rules
  private rules: Map<string, DataQualityRule> = new Map();
  
  // Cache of detected issues
  private issuesCache: Map<string, DataQualityIssue[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize default data quality rules
   */
  private async initializeRules(): Promise<void> {
    logger.debug('Initializing data quality rules');

    // Define default rules
    const defaultRules: DataQualityRule[] = [
      // Critical: Duplicate payments
      {
        id: 'duplicate_payments_by_company_date_amount',
        name: 'Duplicate Payments',
        nameAr: 'دفعات مكررة',
        description: 'Multiple payments with same company, customer, date, and amount',
        descriptionAr: 'دفعات متكررة بنفس الشركة، العميل، التاريخ، والمبلغ',
        severity: DataQualitySeverity.CRITICAL,
        entityType: 'payments',
        conditionSql: `
          SELECT company_id, customer_id, payment_date, amount, COUNT(*) as count
          FROM payments
          WHERE payment_status IN ('completed', 'processing')
          GROUP BY company_id, customer_id, payment_date, amount
          HAVING COUNT(*) > 1
        `,
        checkType: 'sql_query',
        resolutionSql: `
          WITH ranked_payments AS (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY company_id, customer_id, payment_date, amount ORDER BY created_at) as rn
            FROM payments
            WHERE id IN (SELECT payment_id FROM payments WHERE id IN (SELECT MAX(id) FROM payments GROUP BY company_id, customer_id, payment_date, amount HAVING COUNT(*) > 1))
          )
          UPDATE payments
          SET notes = COALESCE(notes, '') || ' [DUPLICATE] Duplicate payment detected'
          WHERE id = (SELECT id FROM ranked_payments WHERE rn > 1)
          RETURNING id
        `,
        autoResolve: true
      },

      // Critical: Orphaned payments
      {
        id: 'orphaned_payments_no_customer',
        name: 'Orphaned Payments',
        nameAr: 'دفعات بدون عميل',
        description: 'Payments without customer_id reference',
        descriptionAr: 'مدفوعات بدون إشارة إلى العميل',
        severity: DataQualitySeverity.CRITICAL,
        entityType: 'payments',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM payments
          WHERE customer_id IS NULL
        `,
        checkType: 'sql_query',
        resolutionSql: `
          UPDATE payments p
          SET customer_id = c.customer_id
          FROM payments p
          JOIN contracts c ON p.contract_id = c.id
          WHERE p.customer_id IS NULL AND p.contract_id IS NOT NULL
        `,
        autoResolve: true
      },

      // Critical: Orphaned payments (no contract or invoice)
      {
        id: 'orphaned_payments_no_link',
        name: 'Unlinked Payments',
        nameAr: 'دفعات غير مرتبطة',
        description: 'Payments without contract or invoice reference',
        descriptionAr: 'مدفوعات غير مرتبطة بعقد أو فاتورة',
        severity: DataQualitySeverity.HIGH,
        entityType: 'payments',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM payments
          WHERE customer_id IS NOT NULL 
            AND contract_id IS NULL 
            AND invoice_id IS NULL
        `,
        checkType: 'sql_query',
        resolutionSql: `
          UPDATE payments p
          SET allocation_status = 'unallocated'
          WHERE customer_id IS NOT NULL 
            AND contract_id IS NULL 
            AND invoice_id IS NULL
        `,
        autoResolve: false
      },

      // Critical: Invalid payment amounts
      {
        id: 'invalid_payment_amounts',
        name: 'Invalid Payment Amounts',
        nameAr: 'مبالغ مدفوعات',
        description: 'Payments with zero, negative, or suspiciously large amounts',
        descriptionAr: 'مدفوعات بمبالغ صفر، سالب، أو مبالغ كبير بشكل مشبوه',
        severity: DataQualitySeverity.CRITICAL,
        entityType: 'payments',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM payments
          WHERE amount <= 0 OR amount > 100000
        `,
        checkType: 'sql_query',
        resolutionSql: `
          UPDATE payments
          SET payment_status = 'failed',
              processing_status = 'manual_review',
              processing_notes = COALESCE(processing_notes, '') || '[INVALID] ' || CASE 
                  WHEN amount <= 0 THEN 'Amount is zero or negative'
                  WHEN amount > 100000 THEN 'Suspiciously large amount detected'
                  ELSE 'Invalid amount detected'
              END
          WHERE amount <= 0 OR amount > 100000
        `,
        autoResolve: false
      },

      // High: Missing required fields
      {
        id: 'missing_payment_required_fields',
        name: 'Missing Payment Fields',
        nameAr: 'حقول مدفوعات ناقصة',
        description: 'Payments missing required fields (customer_id, payment_date, amount, payment_method)',
        descriptionAr: 'مدفوعات ناقصة حقول إلزامية (customer_id، تاريخ الدفع، المبلغ، طريقة الدفع)',
        severity: DataQualitySeverity.HIGH,
        entityType: 'payments',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM payments
          WHERE customer_id IS NULL
             OR payment_date IS NULL
             OR amount IS NULL
             OR payment_method IS NULL
        `,
        checkType: 'sql_query',
        resolutionSql: `
          -- Cannot auto-resolve - requires manual intervention
        `,
        autoResolve: false
      },

      // High: Duplicate invoices
      {
        id: 'duplicate_invoices',
        name: 'Duplicate Invoices',
        nameAr: 'فواتير مكررة',
        description: 'Multiple invoices for the same payment',
        descriptionAr: 'فواتير متكررة لنفس الدفعة',
        severity: DataQualitySeverity.HIGH,
        entityType: 'invoices',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM invoices i1
          WHERE EXISTS (
            SELECT 1 FROM invoices i2
            WHERE i1.payment_id = i2.payment_id
              AND i1.id <> i2.id
          )
        `,
        checkType: 'sql_query',
        resolutionSql: `
          WITH duplicates_to_keep AS (
            SELECT id FROM invoices
            WHERE payment_id IN (
              SELECT payment_id FROM invoices GROUP BY payment_id HAVING COUNT(*) > 1
            )
            ORDER BY created_at ASC
          )
          DELETE FROM invoices
          WHERE payment_id IN (
              SELECT payment_id FROM invoices GROUP BY payment_id HAVING COUNT(*) > 1
            )
            AND id NOT IN (SELECT id FROM duplicates_to_keep)
        `,
        autoResolve: true
      },

      // Medium: Incomplete payment processing
      {
        id: 'stuck_payments',
        name: 'Stuck Payments',
        nameAr: 'مدفوعات عالقة',
        description: 'Payments stuck in processing status for extended period',
        descriptionAr: 'مدفوعات عالقة في حالة المعالجة لفترة طويلة',
        severity: DataQualitySeverity.MEDIUM,
        entityType: 'payments',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM payments
          WHERE processing_status = 'processing'
            AND payment_date < NOW() - INTERVAL '7 days'
        `,
        checkType: 'sql_query',
        resolutionSql: `
          UPDATE payments
          SET processing_status = 'manual_review',
              processing_notes = COALESCE(processing_notes, '') || '[STUCK] Stuck in processing for extended period'
          WHERE processing_status = 'processing'
            AND payment_date < NOW() - INTERVAL '7 days'
        `,
        autoResolve: true
      },

      // Low: Missing payment numbers
      {
        id: 'missing_payment_numbers',
        name: 'Missing Payment Numbers',
        nameAr: 'أرقام مدفوعات ناقصة',
        description: 'Payments without payment numbers',
        descriptionAr: 'مدفوعات بدون رقم مرجعي',
        severity: DataQualitySeverity.LOW,
        entityType: 'payments',
        conditionSql: `
          SELECT COUNT(*) as count
          FROM payments
          WHERE payment_number IS NULL OR payment_number = ''
        `,
        checkType: 'sql_query',
        resolutionSql: `
          UPDATE payments
          SET payment_number = 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(TO_CHAR(ROUND(RANDOM() * 9999), 4), '0')
          WHERE payment_number IS NULL OR payment_number = ''
          LIMIT 100
        `,
        autoResolve: true
      }
    ];

    // Load custom rules from database if available
    try {
      const { data: customRules } = await supabase
        .from('data_quality_rules')
        .select('*')
        .eq('company_id', 'default')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (customRules) {
        customRules.forEach(rule => {
          this.rules.set(rule.id, rule);
        });
        logger.info(`Loaded ${customRules.length} custom data quality rules`);
      }
    } catch (error) {
      logger.warn('Failed to load custom data quality rules', error);
    }

    logger.info(`Data quality service initialized with ${this.rules.size} rules`);
  }

  /**
   * Scan for data quality issues
   */
  async scanForIssues(options: DataQualityScanOptions): Promise<DataQualityIssue[]> {
    try {
      logger.info('Scanning for data quality issues', { companyId: options.companyId });

      const issues: DataQualityIssue[] = [];

      for (const [ruleId, rule] of this.rules.entries()) {
        // Check if rule applies to requested entity types
        if (options.entityTypes && !options.entityTypes.includes(rule.entityType)) {
          continue;
        }

        // Check severity filter
        if (options.severityFilter && !options.severityFilter.includes(rule.severity)) {
          continue;
        }

        // Check if issue should be auto-resolved
        if (options.includeAutoResolvable !== false && !rule.autoResolve) {
          continue;
        }

        // Execute scan
        const { data: scanResult } = await supabase
          .rpc('execute_data_quality_scan', {
            rule_id: ruleId,
            company_id: options.companyId
          });

        // Process scan results
        if (scanResult && scanResult.detectedIssues) {
          for (const issue of scanResult.detectedIssues) {
            issues.push({
              id: this.generateIssueId(),
              companyId: options.companyId,
              ruleId,
              ruleName: rule.name,
              ruleNameAr: rule.nameAr,
              type: rule.type,
              severity: rule.severity,
              status: DataQualityIssueStatus.OPEN,
              entityType: rule.entityType,
              entityId: issue.entityId,
              field: issue.field,
              currentValue: issue.currentValue,
              expectedValue: issue.expectedValue,
              description: rule.description,
              descriptionAr: rule.descriptionAr,
              affectedRecords: issue.affectedCount || 1,
              firstDetectedAt: new Date().toISOString(),
              lastDetectedAt: new Date().toISOString(),
              resolvedAt: null,
              resolvedBy: null,
              resolution: null,
              resolutionAr: null,
              autoResolved: rule.autoResolve
            });
          }
        }
      }

      // Cache issues
      issues.forEach(issue => {
        const key = `${issue.companyId}-${issue.entityType}`;
        const existingIssues = this.issuesCache.get(key) || [];
        existingIssues.push(issue);
        this.issuesCache.set(key, existingIssues);
      });

      logger.info(`Data quality scan completed: ${issues.length} issues detected`, { 
        companyId: options.companyId,
        criticalIssues: issues.filter(i => i.severity === DataQualitySeverity.CRITICAL).length,
        highPriorityIssues: issues.filter(i => i.severity === DataQualitySeverity.HIGH).length
      });

      return issues;
    } catch (error) {
      logger.error('Failed to scan for data quality issues', error);
      throw error;
    }
  }

  /**
   * Get data quality metrics
   */
  async getQualityMetrics(companyId: string): Promise<DataQualityMetrics> {
    try {
      const { data: issues } = await supabase
        .from('data_quality_issues')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      const metrics: DataQualityMetrics = {
        totalIssues: issues.length,
        issuesByType: {} as Record<DataQualityIssueType, number>,
        issuesBySeverity: {} as Record<DataQualitySeverity, number>,
        issuesByEntity: {} as Record<string, number>,
        issuesByStatus: {} as Record<DataQualityIssueStatus, number>,
        openCriticalIssues: 0,
        highPriorityIssues: 0,
        mediumPriorityIssues: 0,
        lowPriorityIssues: 0,
        overallScore: 100,
        lastScannedAt: new Date().toISOString()
      };

      // Calculate metrics by type
      issues.forEach(issue => {
        metrics.issuesByType[issue.type] = (metrics.issuesByType[issue.type] || 0) + 1;
      });

      // Calculate metrics by severity
      Object.values(DataQualitySeverity).forEach(severity => {
        const count = issues.filter(i => i.severity === severity).length;
        metrics.issuesBySeverity[severity] = count;
      });

      // Calculate metrics by status
      Object.values(DataQualityIssueStatus).forEach(status => {
        const count = issues.filter(i => i.status === status).length;
        metrics.issuesByStatus[status] = count;
      });

      // Calculate priority metrics
      metrics.openCriticalIssues = issues.filter(i => 
        i.severity === DataQualitySeverity.CRITICAL && i.status === DataQualityIssueStatus.OPEN
      ).length;
      
      metrics.highPriorityIssues = issues.filter(i => 
        (i.severity === DataQualitySeverity.HIGH && i.status === DataQualityIssueStatus.OPEN) ||
        (i.severity === DataQualitySeverity.CRITICAL && i.status === DataQualityIssueStatus.OPEN)
      ).length;
      
      metrics.mediumPriorityIssues = issues.filter(i => 
        i.severity === DataQualitySeverity.MEDIUM && i.status === DataQualityIssueStatus.OPEN
      ).length;
      
      metrics.lowPriorityIssues = issues.filter(i => 
        i.severity === DataQualitySeverity.LOW && i.status === DataQualityIssueStatus.OPEN
      ).length;

      // Calculate overall score
      if (issues.length > 0) {
        const severityWeights = {
          [DataQualitySeverity.CRITICAL]: 25,
          [DataQualitySeverity.HIGH]: 15,
          [DataQualitySeverity.MEDIUM]: 8,
          [DataQualitySeverity.LOW]: 3,
          [DataQualitySeverity.INFO]: 1
        };

        let weightedScore = 0;
        issues.forEach(issue => {
          const weight = severityWeights[issue.severity] || 1;
          if (issue.status === DataQualityIssueStatus.OPEN) {
            weightedScore += weight;
          } else if (issue.status === DataQualityIssueStatus.IN_PROGRESS) {
            weightedScore += weight * 0.5; // Half weight for in-progress
          }
        });

        metrics.overallScore = Math.max(0, 100 - Math.round(weightedScore / (issues.length * 25)));
      }

      logger.info('Data quality metrics computed', {
        companyId,
        totalIssues: metrics.totalIssues,
        overallScore: metrics.overallScore,
        openCriticalIssues: metrics.openCriticalIssues
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get data quality metrics', error);
      throw error;
    }
  }

  /**
   * Resolve a data quality issue
   */
  async resolveIssue(
    issueId: string,
    companyId: string,
    options: ResolutionOptions = {}
  ): Promise<{
    success: boolean;
    resolved: DataQualityIssue | null;
    error?: string;
  }> {
    try {
      logger.info('Resolving data quality issue', { issueId, options });

      // Get the issue
      const { data: issue } = await supabase
        .from('data_quality_issues')
        .select('*')
        .eq('id', issueId)
        .single();

      if (!issue) {
        return {
          success: false,
          error: 'Issue not found'
        };
      }

      // Get the rule
      const rule = this.rules.get(issue.ruleId);
      if (!rule) {
        return {
          success: false,
          error: 'Rule not found'
        };
      }

      // Check if issue is already resolved
      if (issue.status === DataQualityIssueStatus.RESOLVED) {
        return {
          success: true,
          resolved: issue
        };
      }

      // Apply resolution
      if (options.dryRun) {
        logger.info('Dry run: would apply resolution', {
          issueId,
          resolution: rule.resolutionSql
        });
        return {
          success: true,
          resolved: { ...issue, status: DataQualityIssueStatus.IN_PROGRESS }
        };
      }

      // Execute resolution SQL
      if (rule.resolutionSql) {
        const { error: resolutionError } = await supabase.rpc('execute_resolution', {
          issue_id: issueId,
          company_id: companyId,
          resolution_sql: rule.resolutionSql
        });

        if (resolutionError) {
          logger.error('Failed to execute resolution', { issueId, error: resolutionError });
          return {
            success: false,
            error: resolutionError.message
          };
        }
      }

      // Update issue status
      const { error: updateError } = await supabase
        .from('data_quality_issues')
        .update({
          status: DataQualityIssueStatus.RESOLVED,
          resolved_at: new Date().toISOString(),
          resolved_by: options.userId || 'system',
          resolution: options.resolution || 'Auto-resolved by system',
          resolutionAr: options.resolution || 'تم الحل التلقائي بواسطة النظام',
          auto_resolved: rule.autoResolve
        })
        .eq('id', issueId);

      if (updateError) {
        logger.error('Failed to update issue status', { issueId, error: updateError });
        return {
          success: false,
          error: updateError.message
        };
      }

      // Create audit log if requested
      if (options.createAuditLog) {
        await this.createAuditLogEntry({
          companyId,
          action: 'resolve_data_quality_issue',
          issueId,
          userId: options.userId,
          details: {
            ruleName: rule.name,
            resolution: options.resolution,
            autoResolved: rule.autoResolve
          }
        });
      }

      logger.info('Data quality issue resolved', {
        issueId,
        ruleId: rule.name,
        resolvedBy: options.userId
      });

      // Clear cache for this issue
      const cacheKey = `${companyId}-${issue.entityType}`;
      const cachedIssues = this.issuesCache.get(cacheKey) || [];
      this.issuesCache.set(
        cacheKey,
        cachedIssues.filter(i => i.id !== issueId)
      );

      return {
        success: true,
        resolved: { ...issue, status: DataQualityIssueStatus.RESOLVED }
      };

    } catch (error) {
      logger.error('Failed to resolve data quality issue', { issueId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution failed'
      };
    }
  }

  /**
   * Bulk resolve multiple issues
   */
  async resolveIssues(
    issueIds: string[],
    companyId: string,
    userId: string
  ): Promise<{
    success: boolean;
    resolvedCount: number;
    failedCount: number;
    errors: string[];
  }> {
    try {
      logger.info('Bulk resolving data quality issues', { 
        companyId, 
        issueCount: issueIds.length 
      });

      const resolvedIssues: DataQualityIssue[] = [];
      const errors: string[] = [];

      for (const issueId of issueIds) {
        const result = await this.resolveIssue(issueId, companyId, {
          userId,
          autoApply: true
        });

        if (result.success && result.resolved) {
          resolvedIssues.push(result.resolved);
        } else {
          errors.push(`Failed to resolve ${issueId}: ${result.error || 'Unknown error'}`);
        }
      }

      logger.info('Bulk resolution completed', {
        companyId,
        resolvedCount: resolvedIssues.length,
        failedCount: errors.length
      });

      return {
        success: errors.length === 0,
        resolvedCount: resolvedIssues.length,
        failedCount: errors.length,
        errors
      };

    } catch (error) {
      logger.error('Failed to bulk resolve data quality issues', error);
      return {
        success: false,
        resolvedCount: 0,
        failedCount: 0,
        errors: [error instanceof Error ? error.message : 'Bulk resolution failed']
      };
    }
  }

  /**
   * Auto-scan and auto-resolve data quality issues
   */
  async autoScanAndResolve(companyId: string): Promise<{
    scanned: number;
    resolved: number;
    failed: number;
  }> {
    try {
      logger.info('Auto-scanning and resolving data quality issues', { companyId });

      // Scan for issues (auto-resolvable only)
      const scanResult = await this.scanForIssues({
        companyId,
        includeAutoResolvable: true,
        severityFilter: [DataQualitySeverity.CRITICAL, DataQualitySeverity.HIGH]
      });

      if (scanResult.length === 0) {
        logger.info('No data quality issues found', { companyId });
        return {
          scanned: 0,
          resolved: 0,
          failed: 0
        };
      }

      // Filter issues that can be auto-resolved
      const autoResolvableIssues = scanResult.filter(issue => issue.autoResolved);
      const issueIds = autoResolvableIssues.map(i => i.id);

      // Resolve issues
      const resolveResult = await this.resolveIssues(issueIds, companyId, {
        userId: 'system', // Auto-resolved by system
        autoApply: true
      });

      logger.info('Auto-scan and resolve completed', {
        companyId,
        scanned: scanResult.length,
        resolved: resolveResult.resolvedCount,
        failed: resolveResult.failedCount
      });

      return resolveResult;

    } catch (error) {
      logger.error('Failed to auto-scan and resolve data quality issues', error);
      return {
        scanned: 0,
        resolved: 0,
        failed: 1
      };
    }
  }

  /**
   * Get open data quality issues
   */
  async getOpenIssues(companyId: string, options?: {
    severityFilter?: DataQualitySeverity[],
    limit?: number
  }): Promise<DataQualityIssue[]> {
    try {
      let query = supabase
        .from('data_quality_issues')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', DataQualityIssueStatus.OPEN);

      if (severityFilter && severityFilter.length > 0) {
        query = query.in('severity', severityFilter);
      }

      query = query.order('created_at', { ascending: false });

      if (options && options.limit) {
        query = query.limit(options.limit);
      }

      const { data: issues } = await query;

      logger.info(`Retrieved ${issues.length} open issues`, { companyId });
      return issues;

    } catch (error) {
      logger.error('Failed to get open issues', error);
      throw error;
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLogEntry(params: any): Promise<void> {
    try {
      await supabase.from('data_quality_audit_log').insert({
        company_id: params.companyId,
        action: params.action,
        issue_id: params.issueId,
        user_id: params.userId || 'system',
        details: params.details,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to create audit log entry', error);
    }
  }

  /**
   * Generate issue ID
   */
  private generateIssueId(): string {
    return `dq-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Get all data quality rules
   */
  getAllRules(): DataQualityRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Add custom data quality rule
   */
  async addCustomRule(rule: Omit<DataQualityRule, 'id'>): Promise<DataQualityRule> {
    try {
      const newRule = {
        id: this.generateIssueId(),
        ...rule,
        is_active: true
      };

      const { data } = await supabase
        .from('data_quality_rules')
        .insert(newRule)
        .select()
        .single();

      // Cache rule
      this.rules.set(newRule.id, newRule);

      logger.info('Custom data quality rule added', { ruleId: newRule.id });
      return data;

    } catch (error) {
      logger.error('Failed to add custom data quality rule', error);
      throw error;
    }
  }

  /**
   * Update data quality rule
   */
  async updateCustomRule(ruleId: string, updates: Partial<DataQualityRule>): Promise<DataQualityRule> {
    try {
      const { data } = await supabase
        .from('data_quality_rules')
        .update(updates)
        .eq('id', ruleId)
        .select()
        .single();

      if (!data) {
        throw new Error('Rule not found');
      }

      // Update cache
      this.rules.set(ruleId, data);

      logger.info('Data quality rule updated', { ruleId });
      return data;

    } catch (error) {
      logger.error('Failed to update data quality rule', error);
      throw error;
    }
  }

  /**
   * Delete custom data quality rule
   */
  async deleteCustomRule(ruleId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('data_quality_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        throw error;
      }

      // Remove from cache
      this.rules.delete(ruleId);

      logger.info('Data quality rule deleted', { ruleId });
    } catch (error) {
      logger.error('Failed to delete data quality rule', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dataQualityService = new DataQualityService();
