/**
 * Contract Compliance Validation Framework
 *
 * Comprehensive rule engine for validating contract compliance
 * with business rules, legal requirements, and internal policies.
 */

export type ComplianceRuleType = 'business_rule' | 'legal_requirement' | 'internal_policy' | 'financial_regulation' | 'safety_standard';
export type ComplianceSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending_review' | 'exempt';

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  rule_type: ComplianceRuleType;
  severity: ComplianceSeverity;
  enabled: boolean;
  conditions: ComplianceCondition[];
  actions: ComplianceAction[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ComplianceCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'between' | 'regex';
  value: any;
  description: string;
}

export interface ComplianceAction {
  type: 'validate' | 'calculate' | 'check' | 'verify' | 'flag' | 'notify' | 'block';
  description: string;
  parameters?: Record<string, any>;
}

export interface ComplianceResult {
  contract_id: string;
  rule_id: string;
  status: ComplianceStatus;
  severity: ComplianceSeverity;
  message: string;
  details?: Record<string, any>;
  recommendations?: string[];
  flagged_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface ComplianceReport {
  contract_id: string;
  overall_status: ComplianceStatus;
  total_rules_checked: number;
  rules_passed: number;
  rules_failed: number;
  rules_pending: number;
  critical_issues: number;
  results: ComplianceResult[];
  generated_at: string;
  next_review_date: string;
}

export interface ContractComplianceConfig {
  enable_auto_resolution: boolean;
  notification_threshold: ComplianceSeverity;
  escalation_rules: Array<{
    severity: ComplianceSeverity;
    action: 'notify_manager' | 'block_operation' | 'require_review';
    recipients: string[];
  }>;
  exemption_workflow: boolean;
  scheduled_checks: {
    frequency: 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
  };
}

/**
 * Contract Compliance Engine Class
 */
export class ContractComplianceEngine {
  private rules: Map<string, ComplianceRule> = new Map();
  private results: Map<string, ComplianceResult[]> = new Map();
  private config: ContractComplianceConfig;

  constructor(config: Partial<ContractComplianceConfig> = {}) {
    this.config = {
      enable_auto_resolution: false,
      notification_threshold: 'error',
      escalation_rules: [],
      exemption_workflow: true,
      scheduled_checks: {
        frequency: 'weekly',
        enabled: true
      },
      ...config
    };

    this.initializeDefaultRules();
  }

  /**
   * Initialize default compliance rules
   */
  private initializeDefaultRules(): void {
    // Financial compliance rules
    this.addRule({
      id: 'FIN_001',
      name: 'Minimum Deposit Requirement',
      description: 'Contract must have minimum deposit of 10% of annual value',
      rule_type: 'financial_regulation',
      severity: 'error',
      enabled: true,
      conditions: [
        {
          field: 'financial_terms.deposit_amount',
          operator: 'greater_than',
          value: 0,
          description: 'Deposit amount must be greater than 0'
        }
      ],
      actions: [
        {
          type: 'validate',
          description: 'Validate deposit amount meets minimum requirements'
        }
      ],
      metadata: {
        minimum_percentage: 10,
        reference: 'Company Policy FIN-001'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Legal requirement rules
    this.addRule({
      id: 'LEGAL_001',
      name: 'Contract Duration Limits',
      description: 'Contract duration cannot exceed 36 months for individual customers',
      rule_type: 'legal_requirement',
      severity: 'error',
      enabled: true,
      conditions: [
        {
          field: 'customer_type',
          operator: 'equals',
          value: 'individual',
          description: 'Customer type must be individual'
        },
        {
          field: 'contract_duration_months',
          operator: 'less_than',
          value: 36,
          description: 'Contract duration must be less than 36 months'
        }
      ],
      actions: [
        {
          type: 'validate',
          description: 'Validate contract duration limits for individuals'
        }
      ],
      metadata: {
        max_months_individual: 36,
        max_months_company: 60,
        reference: 'Regulation CONTRACT-LIMITS-2024'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Business rule validation
    this.addRule({
      id: 'BIZ_001',
      name: 'Vehicle Availability Check',
      description: 'Vehicle must be available for contract duration',
      rule_type: 'business_rule',
      severity: 'critical',
      enabled: true,
      conditions: [
        {
          field: 'vehicle_status',
          operator: 'equals',
          value: 'available',
          description: 'Vehicle must be available'
        }
      ],
      actions: [
        {
          type: 'check',
          description: 'Check vehicle availability in fleet system'
        }
      ],
      metadata: {
        check_maintenance_schedule: true,
        check_existing_bookings: true
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Safety standard rules
    this.addRule({
      id: 'SAFETY_001',
      name: 'Insurance Coverage Validation',
      description: 'Contract must include valid insurance coverage',
      rule_type: 'safety_standard',
      severity: 'critical',
      enabled: true,
      conditions: [
        {
          field: 'insurance_coverage',
          operator: 'greater_than',
          value: 0,
          description: 'Insurance coverage must be greater than 0'
        },
        {
          field: 'insurance_expiry',
          operator: 'greater_than',
          value: new Date().toISOString(),
          description: 'Insurance must not be expired'
        }
      ],
      actions: [
        {
          type: 'verify',
          description: 'Verify insurance coverage with provider'
        }
      ],
      metadata: {
        minimum_coverage: 1000000,
        required_types: ['liability', 'collision', 'comprehensive']
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Internal policy rules
    this.addRule({
      id: 'POLICY_001',
      name: 'Credit Score Requirement',
      description: 'Customer must meet minimum credit score requirements',
      rule_type: 'internal_policy',
      severity: 'warning',
      enabled: true,
      conditions: [
        {
          field: 'customer.credit_score',
          operator: 'greater_than',
          value: 650,
          description: 'Credit score must be greater than 650'
        }
      ],
      actions: [
        {
          type: 'flag',
          description: 'Flag for manual review if credit score is low'
        }
      ],
      metadata: {
        minimum_score: 650,
        recommended_score: 700,
        exception_process: 'manager_approval_required'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Payment terms validation
    this.addRule({
      id: 'FIN_002',
      name: 'Payment Terms Validation',
      description: 'Payment terms must comply with company policies',
      rule_type: 'financial_regulation',
      severity: 'error',
      enabled: true,
      conditions: [
        {
          field: 'payment_terms.days',
          operator: 'between',
          value: [0, 90],
          description: 'Payment terms must be between 0 and 90 days'
        }
      ],
      actions: [
        {
          type: 'validate',
          description: 'Validate payment terms compliance'
        }
      ],
      metadata: {
        max_payment_days: 90,
        standard_terms: [30, 60, 90],
        reference: 'Finance Policy PAY-TERMS-2024'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Contract documentation rules
    this.addRule({
      id: 'DOC_001',
      name: 'Required Documentation',
      description: 'All required documents must be present and valid',
      rule_type: 'legal_requirement',
      severity: 'critical',
      enabled: true,
      conditions: [
        {
          field: 'documents.id_copy',
          operator: 'exists',
          value: true,
          description: 'ID copy must be present'
        },
        {
          field: 'documents.license_copy',
          operator: 'exists',
          value: true,
          description: 'License copy must be present'
        },
        {
          field: 'documents.address_proof',
          operator: 'exists',
          value: true,
          description: 'Address proof must be present'
        }
      ],
      actions: [
        {
          type: 'verify',
          description: 'Verify all required documents are present and valid'
        }
      ],
      metadata: {
        required_documents: ['id_copy', 'license_copy', 'address_proof', 'insurance_policy'],
        optional_documents: ['reference_letter', 'bank_statement']
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Add a compliance rule
   */
  addRule(rule: ComplianceRule): void {
    rule.updated_at = new Date().toISOString();
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a compliance rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Update a compliance rule
   */
  updateRule(ruleId: string, updates: Partial<ComplianceRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = { ...rule, ...updates, updated_at: new Date().toISOString() };
    this.rules.set(ruleId, updatedRule);
    return true;
  }

  /**
   * Validate contract against compliance rules
   */
  async validateContract(
    contractId: string,
    contractData: Record<string, any>,
    ruleIds?: string[]
  ): Promise<ComplianceReport> {
    const rulesToCheck = ruleIds
      ? ruleIds.map(id => this.rules.get(id)).filter(Boolean) as ComplianceRule[]
      : Array.from(this.rules.values()).filter(rule => rule.enabled);

    const results: ComplianceResult[] = [];

    for (const rule of rulesToCheck) {
      try {
        const result = await this.evaluateRule(rule, contractId, contractData);
        results.push(result);
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
        results.push({
          contract_id: contractId,
          rule_id: rule.id,
          status: 'pending_review',
          severity: 'error',
          message: `Error evaluating rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
          flagged_at: new Date().toISOString()
        });
      }
    }

    const report: ComplianceReport = {
      contract_id: contractId,
      overall_status: this.calculateOverallStatus(results),
      total_rules_checked: results.length,
      rules_passed: results.filter(r => r.status === 'compliant').length,
      rules_failed: results.filter(r => r.status === 'non_compliant').length,
      rules_pending: results.filter(r => r.status === 'pending_review').length,
      critical_issues: results.filter(r => r.severity === 'critical' && r.status === 'non_compliant').length,
      results,
      generated_at: new Date().toISOString(),
      next_review_date: this.calculateNextReviewDate()
    };

    // Store results
    this.results.set(contractId, results);

    // Trigger notifications if needed
    await this.triggerNotifications(report);

    return report;
  }

  /**
   * Evaluate a single compliance rule
   */
  private async evaluateRule(
    rule: ComplianceRule,
    contractId: string,
    contractData: Record<string, any>
  ): Promise<ComplianceResult> {
    // Evaluate all conditions
    const conditionResults = await Promise.all(
      rule.conditions.map(condition => this.evaluateCondition(condition, contractData))
    );

    // All conditions must pass for compliance
    const allConditionsPassed = conditionResults.every(result => result.passed);

    const result: ComplianceResult = {
      contract_id: contractId,
      rule_id: rule.id,
      status: allConditionsPassed ? 'compliant' : 'non_compliant',
      severity: rule.severity,
      message: allConditionsPassed
        ? `Compliant with rule: ${rule.name}`
        : `Non-compliant with rule: ${rule.name}`,
      details: {
        condition_results: conditionResults,
        rule_metadata: rule.metadata
      },
      recommendations: allConditionsPassed ? [] : this.generateRecommendations(rule, conditionResults),
      flagged_at: new Date().toISOString()
    };

    // Execute rule actions
    await this.executeRuleActions(rule, result, contractData);

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: ComplianceCondition,
    contractData: Record<string, any>
  ): Promise<{ passed: boolean; actual_value: any; message: string }> {
    const actualValue = this.getNestedValue(contractData, condition.field);
    let passed = false;
    let message = '';

    switch (condition.operator) {
      case 'equals':
        passed = actualValue === condition.value;
        message = `${condition.field} ${passed ? 'equals' : 'does not equal'} ${condition.value}`;
        break;

      case 'not_equals':
        passed = actualValue !== condition.value;
        message = `${condition.field} ${passed ? 'does not equal' : 'equals'} ${condition.value}`;
        break;

      case 'greater_than':
        passed = Number(actualValue) > Number(condition.value);
        message = `${condition.field} ${passed ? 'is greater than' : 'is not greater than'} ${condition.value}`;
        break;

      case 'less_than':
        passed = Number(actualValue) < Number(condition.value);
        message = `${condition.field} ${passed ? 'is less than' : 'is not less than'} ${condition.value}`;
        break;

      case 'contains':
        passed = String(actualValue).includes(String(condition.value));
        message = `${condition.field} ${passed ? 'contains' : 'does not contain'} ${condition.value}`;
        break;

      case 'not_contains':
        passed = !String(actualValue).includes(String(condition.value));
        message = `${condition.field} ${passed ? 'does not contain' : 'contains'} ${condition.value}`;
        break;

      case 'between':
        const [min, max] = condition.value as [number, number];
        passed = Number(actualValue) >= min && Number(actualValue) <= max;
        message = `${condition.field} ${passed ? 'is within' : 'is not within'} range [${min}, ${max}]`;
        break;

      case 'regex':
        const regex = new RegExp(condition.value);
        passed = regex.test(String(actualValue));
        message = `${condition.field} ${passed ? 'matches' : 'does not match'} pattern ${condition.value}`;
        break;

      case 'exists':
        passed = actualValue !== undefined && actualValue !== null;
        message = `${condition.field} ${passed ? 'exists' : 'does not exist'}`;
        break;

      default:
        throw new Error(`Unknown operator: ${condition.operator}`);
    }

    return {
      passed,
      actual_value: actualValue,
      message: `${condition.description}: ${message}`
    };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(
    rule: ComplianceRule,
    result: ComplianceResult,
    contractData: Record<string, any>
  ): Promise<void> {
    for (const action of rule.actions) {
      try {
        await this.executeAction(action, result, contractData);
      } catch (error) {
        console.error(`Error executing action ${action.type} for rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: ComplianceAction,
    result: ComplianceResult,
    contractData: Record<string, any>
  ): Promise<void> {
    switch (action.type) {
      case 'validate':
        // Validation is already done during condition evaluation
        break;

      case 'calculate':
        // Perform calculation if needed
        break;

      case 'check':
        // Perform external system checks
        break;

      case 'verify':
        // Verify with external systems
        break;

      case 'flag':
        // Flag for manual review
        if (result.status === 'non_compliant') {
          result.status = 'pending_review';
        }
        break;

      case 'notify':
        // Send notifications
        await this.sendNotification(result, action.parameters);
        break;

      case 'block':
        // Block operation if critical
        if (result.severity === 'critical' && result.status === 'non_compliant') {
          throw new Error(`Contract blocked due to critical compliance issue: ${result.message}`);
        }
        break;
    }
  }

  /**
   * Send notification for compliance issues
   */
  private async sendNotification(
    result: ComplianceResult,
    parameters?: Record<string, any>
  ): Promise<void> {
    // Integration with notification system
    console.log(`Compliance notification: ${result.message}`, {
      contract_id: result.contract_id,
      rule_id: result.rule_id,
      severity: result.severity,
      parameters
    });
  }

  /**
   * Calculate overall compliance status
   */
  private calculateOverallStatus(results: ComplianceResult[]): ComplianceStatus {
    if (results.length === 0) return 'compliant';

    const hasCritical = results.some(r => r.severity === 'critical' && r.status === 'non_compliant');
    if (hasCritical) return 'non_compliant';

    const hasErrors = results.some(r => r.severity === 'error' && r.status === 'non_compliant');
    if (hasErrors) return 'non_compliant';

    const hasPending = results.some(r => r.status === 'pending_review');
    if (hasPending) return 'pending_review';

    const hasWarnings = results.some(r => r.severity === 'warning' && r.status === 'non_compliant');
    if (hasWarnings) return 'pending_review';

    return 'compliant';
  }

  /**
   * Generate recommendations for non-compliant rules
   */
  private generateRecommendations(
    rule: ComplianceRule,
    conditionResults: Array<{ passed: boolean; actual_value: any; message: string }>
  ): string[] {
    const recommendations: string[] = [];

    for (const result of conditionResults.filter(r => !r.passed)) {
      switch (rule.rule_type) {
        case 'financial_regulation':
          recommendations.push('Review financial terms with finance team');
          break;

        case 'legal_requirement':
          recommendations.push('Consult legal department for compliance');
          break;

        case 'business_rule':
          recommendations.push('Contact operations team for exception process');
          break;

        case 'safety_standard':
          recommendations.push('Update safety documentation immediately');
          break;

        case 'internal_policy':
          recommendations.push('Request manager approval for policy exception');
          break;
      }
    }

    return recommendations;
  }

  /**
   * Calculate next review date
   */
  private calculateNextReviewDate(): string {
    const frequency = this.config.scheduled_checks.frequency;
    const now = new Date();

    switch (frequency) {
      case 'daily':
        return addDays(now, 1).toISOString();
      case 'weekly':
        return addDays(now, 7).toISOString();
      case 'monthly':
        return addDays(now, 30).toISOString();
      default:
        return addDays(now, 7).toISOString();
    }
  }

  /**
   * Trigger notifications based on report results
   */
  private async triggerNotifications(report: ComplianceReport): Promise<void> {
    if (report.critical_issues > 0) {
      await this.sendEscalationNotification(report, 'critical');
    } else if (report.rules_failed > 0) {
      await this.sendEscalationNotification(report, 'error');
    }
  }

  /**
   * Send escalation notification
   */
  private async sendEscalationNotification(
    report: ComplianceReport,
    severity: ComplianceSeverity
  ): Promise<void> {
    const escalationRules = this.config.escalation_rules.filter(
      rule => rule.severity === severity
    );

    for (const rule of escalationRules) {
      // Integration with notification system
      console.log(`Escalation notification for ${rule.action}:`, {
        contract_id: report.contract_id,
        severity,
        recipients: rule.recipients,
        failed_rules: report.results.filter(r => r.status === 'non_compliant').length
      });
    }
  }

  /**
   * Get all compliance rules
   */
  getRules(): ComplianceRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get compliance results for a contract
   */
  getContractResults(contractId: string): ComplianceResult[] {
    return this.results.get(contractId) || [];
  }

  /**
   * Get configuration
   */
  getConfig(): ContractComplianceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ContractComplianceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear compliance results for a contract
   */
  clearContractResults(contractId: string): void {
    this.results.delete(contractId);
  }

  /**
   * Get compliance statistics
   */
  getComplianceStatistics(): {
    total_rules: number;
    enabled_rules: number;
    contracts_checked: number;
    overall_compliance_rate: number;
    critical_issues_count: number;
  } {
    const totalRules = this.rules.size;
    const enabledRules = Array.from(this.rules.values()).filter(r => r.enabled).length;
    const contractsChecked = this.results.size;

    let totalChecks = 0;
    let passedChecks = 0;
    let criticalIssues = 0;

    for (const results of this.results.values()) {
      for (const result of results) {
        totalChecks++;
        if (result.status === 'compliant') passedChecks++;
        if (result.severity === 'critical' && result.status === 'non_compliant') criticalIssues++;
      }
    }

    const overallComplianceRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

    return {
      total_rules: totalRules,
      enabled_rules: enabledRules,
      contracts_checked: contractsChecked,
      overall_compliance_rate: overallComplianceRate,
      critical_issues_count: criticalIssues
    };
  }
}

/**
 * Default compliance engine instance
 */
export const defaultComplianceEngine = new ContractComplianceEngine();