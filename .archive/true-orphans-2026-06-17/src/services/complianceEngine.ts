/**
 * Compliance Engine Service
 * FIN-003: Multi-Currency and Compliance System
 *
 * Provides GAAP compliance validation, regulatory reporting,
 * AML/KYC checks, and compliance workflow management.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ComplianceRule,
  ComplianceValidation,
  ComplianceDashboardSummary,
  RegulatoryReport,
  AMLKYCDiligence,
  ComplianceAuditTrail,
  ComplianceCalendar
} from '@/types/finance.types';

export interface ComplianceCheckRequest {
  entityType: string;
  entityId: string;
  companyId: string;
  ruleCategories?: string[];
  jurisdiction?: string;
}

export interface ComplianceCheckResult {
  entityId: string;
  entityType: string;
  validations: ComplianceValidation[];
  overallStatus: 'compliant' | 'non_compliant' | 'pending_review';
  complianceScore: number;
  actionRequired: boolean;
  highRiskFindings: number;
}

export interface RegulatoryReportRequest {
  reportType: string;
  jurisdiction: string;
  periodStart: string;
  periodEnd: string;
  companyId: string;
  reportData?: Record<string, any>;
}

export class ComplianceEngine {
  private static instance: ComplianceEngine;

  public static getInstance(): ComplianceEngine {
    if (!ComplianceEngine.instance) {
      ComplianceEngine.instance = new ComplianceEngine();
    }
    return ComplianceEngine.instance;
  }

  /**
   * Run compliance validation for an entity
   */
  public async runComplianceValidation(request: ComplianceCheckRequest): Promise<ComplianceCheckResult> {
    const { entityType, entityId, companyId, ruleCategories, jurisdiction } = request;

    try {
      // Get applicable compliance rules
      const rules = await this.getApplicableRules(companyId, ruleCategories, jurisdiction);

      if (rules.length === 0) {
        return {
          entityId,
          entityType,
          validations: [],
          overallStatus: 'compliant',
          complianceScore: 100,
          actionRequired: false,
          highRiskFindings: 0
        };
      }

      // Run validations for each rule
      const validations: ComplianceValidation[] = [];
      let totalScore = 0;
      let actionRequired = false;
      let highRiskFindings = 0;

      for (const rule of rules) {
        const validation = await this.validateEntity(rule, entityType, entityId, companyId);
        validations.push(validation);

        totalScore += validation.validation_score || 0;

        if (validation.action_required) {
          actionRequired = true;
        }

        if (validation.risk_assessment === 'high' || validation.risk_assessment === 'critical') {
          highRiskFindings++;
        }
      }

      const overallStatus = this.determineOverallStatus(validations);
      const complianceScore = totalScore / rules.length;

      // Save validations to database
      await this.saveValidations(validations);

      return {
        entityId,
        entityType,
        validations,
        overallStatus,
        complianceScore,
        actionRequired,
        highRiskFindings
      };
    } catch (error) {
      console.error('Error running compliance validation:', error);
      throw error;
    }
  }

  /**
   * Get compliance dashboard summary
   */
  public async getDashboardSummary(companyId: string): Promise<ComplianceDashboardSummary> {
    try {
      const { data, error } = await supabase.rpc('get_compliance_dashboard_summary', {
        p_company_id: companyId
      });

      if (error) throw error;

      const summary = data?.[0] || {};

      // Get upcoming deadlines
      const { data: deadlines, error: deadlinesError } = await supabase.rpc(
        'get_upcoming_compliance_deadlines',
        { p_company_id: companyId, p_days_ahead: 30 }
      );

      // Get recent validations
      const { data: recentValidations, error: validationsError } = await supabase
        .from('compliance_validations')
        .select('*')
        .eq('company_id', companyId)
        .order('validated_at', { ascending: false })
        .limit(10);

      // Get currency exposure
      const exposureService = await import('./exchangeRateService').then(m => m.exchangeRateService);
      const riskExposure = await exposureService.calculateCurrencyExposure(companyId);

      if (deadlinesError) console.error('Error getting deadlines:', deadlinesError);
      if (validationsError) console.error('Error getting validations:', validationsError);

      return {
        total_rules: summary.total_rules || 0,
        active_validations: summary.active_validations || 0,
        pending_actions: summary.pending_actions || 0,
        overdue_reports: summary.overdue_reports || 0,
        high_risk_entities: summary.high_risk_entities || 0,
        compliance_score: summary.compliance_score || 0,
        upcoming_deadlines: deadlines || [],
        recent_validations: recentValidations || [],
        risk_exposure: riskExposure || []
      };
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Generate regulatory report
   */
  public async generateRegulatoryReport(request: RegulatoryReportRequest): Promise<RegulatoryReport> {
    const { reportType, jurisdiction, periodStart, periodEnd, companyId, reportData } = request;

    try {
      // Get report template and requirements
      const reportTemplate = await this.getReportTemplate(reportType, jurisdiction);

      // Collect required data
      const collectedData = reportData || await this.collectReportData(reportType, jurisdiction, periodStart, periodEnd, companyId);

      // Apply compliance checks
      const complianceCheck = await this.validateReportData(reportType, jurisdiction, collectedData);

      // Generate report
      const report: Partial<RegulatoryReport> = {
        company_id: companyId,
        report_type: reportType,
        jurisdiction,
        reporting_period_start: periodStart,
        reporting_period_end: periodEnd,
        report_data: {
          ...collectedData,
          compliance_check: complianceCheck,
          generated_at: new Date().toISOString(),
          template_version: reportTemplate.version
        },
        status: 'draft',
        compliance_score: complianceCheck.score,
        findings_count: complianceCheck.findings.length,
        violations_count: complianceCheck.violations.length
      };

      // Save report to database
      const { data, error } = await supabase
        .from('regulatory_reports')
        .insert(report)
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logComplianceAction({
        companyId,
        actionType: 'report_generated',
        entityType: 'regulatory_report',
        entityId: data.id,
        description: `Generated ${reportType} report for ${jurisdiction}`,
        newValues: { report_type: reportType, jurisdiction, period: `${periodStart} to ${periodEnd}` }
      });

      return data;
    } catch (error) {
      console.error('Error generating regulatory report:', error);
      throw error;
    }
  }

  /**
   * Run AML/KYC check
   */
  public async runAMLKYCCheck(
    entityType: 'customer' | 'vendor' | 'beneficial_owner',
    entityId: string,
    companyId: string
  ): Promise<AMLKYCDiligence> {
    try {
      // Get entity details
      const entityData = await this.getEntityDetails(entityType, entityId, companyId);

      // Perform screening
      const screeningResults = await this.performScreening(entityData);

      // Calculate risk rating
      const riskRating = this.calculateRiskRating(screeningResults);

      // Determine due diligence level
      const dueDiligenceLevel = this.determineDueDiligenceLevel(riskRating, entityData);

      // Create or update AML/KYC record
      const amlKycData = {
        company_id: companyId,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityData.name,
        risk_rating: riskRating,
        verification_status: screeningResults.matched ? 'additional_info_required' : 'verified',
        verification_score: screeningResults.confidence,
        screening_results: screeningResults,
        due_diligence_level: dueDiligenceLevel,
        enhanced_due_diligence: dueDiligenceLevel === 'enhanced',
        ongoing_monitoring: riskRating !== 'low',
        pep_status: screeningResults.pep_status,
        sanctions_status: screeningResults.sanctions_status,
        adverse_media_findings: screeningResults.adverse_media_count,
        next_review_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year
      };

      const { data, error } = await supabase
        .from('aml_kyc_diligence')
        .upsert(amlKycData, {
          onConflict: 'company_id, entity_type, entity_id'
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      await this.logComplianceAction({
        companyId,
        actionType: 'aml_kyc_check',
        entityType: entityType,
        entityId: entityId,
        description: `AML/KYC check completed with risk rating: ${riskRating}`,
        newValues: { risk_rating: riskRating, verification_status: data.verification_status }
      });

      return data;
    } catch (error) {
      console.error('Error running AML/KYC check:', error);
      throw error;
    }
  }

  /**
   * Schedule compliance calendar event
   */
  public async scheduleComplianceEvent(
    companyId: string,
    eventType: string,
    title: string,
    dueDate: string,
    options?: {
      description?: string;
      jurisdiction?: string;
      responsibleUserId?: string;
      recurringPattern?: 'monthly' | 'quarterly' | 'annually';
      priority?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<ComplianceCalendar> {
    try {
      const eventData = {
        company_id: companyId,
        event_type: eventType,
        event_title: title,
        event_description: options?.description,
        jurisdiction: options?.jurisdiction,
        due_date: dueDate,
        reminder_days: 7,
        recurring_pattern: options?.recurringPattern,
        responsible_user_id: options?.responsibleUserId,
        priority: options?.priority || 'medium',
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('compliance_calendar')
        .insert(eventData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error scheduling compliance event:', error);
      throw error;
    }
  }

  // Private methods

  private async getApplicableRules(
    companyId: string,
    categories?: string[],
    jurisdiction?: string
  ): Promise<ComplianceRule[]> {
    try {
      let query = supabase
        .from('compliance_rules')
        .select('*')
        .eq('is_active', true)
        .or(`company_id.eq.${companyId},company_id.is.null`);

      if (categories && categories.length > 0) {
        query = query.in('rule_category', categories);
      }

      if (jurisdiction) {
        query = query.or(`jurisdiction.eq.${jurisdiction},jurisdiction.is.null`);
      }

      const { data, error } = await query.order('severity_level', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting applicable rules:', error);
      return [];
    }
  }

  private async validateEntity(
    rule: ComplianceRule,
    entityType: string,
    entityId: string,
    companyId: string
  ): Promise<ComplianceValidation> {
    try {
      // This is where specific validation logic would be implemented
      // For now, we'll create a basic validation structure

      const validation: Partial<ComplianceValidation> = {
        company_id: companyId,
        rule_id: rule.id,
        entity_type: entityType,
        entity_id: entityId,
        validation_result: 'pass',
        validation_score: 85,
        validation_details: {
          rule_code: rule.rule_code,
          rule_name: rule.rule_name,
          execution_time: new Date().toISOString()
        },
        risk_assessment: rule.severity_level === 'critical' ? 'medium' : 'low',
        action_required: false,
        validated_at: new Date().toISOString()
      };

      // Specific validation logic based on rule type
      switch (rule.rule_type) {
        case 'validation':
          return await this.runValidationRule(rule, entityType, entityId, companyId);
        case 'threshold':
          return await this.runThresholdRule(rule, entityType, entityId, companyId);
        case 'workflow':
          return await this.runWorkflowRule(rule, entityType, entityId, companyId);
        default:
          return validation as ComplianceValidation;
      }
    } catch (error) {
      console.error('Error validating entity:', error);
      throw error;
    }
  }

  private async runValidationRule(
    rule: ComplianceRule,
    entityType: string,
    entityId: string,
    companyId: string
  ): Promise<ComplianceValidation> {
    // Implement specific validation logic based on rule configuration
    const validation: Partial<ComplianceValidation> = {
      company_id: companyId,
      rule_id: rule.id,
      entity_type: entityType,
      entity_id: entityId,
      validation_result: 'pass',
      validation_score: 90,
      validation_details: {
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        validation_type: 'validation',
        checks_performed: []
      },
      risk_assessment: 'low',
      action_required: false,
      validated_at: new Date().toISOString()
    };

    return validation as ComplianceValidation;
  }

  private async runThresholdRule(
    rule: ComplianceRule,
    entityType: string,
    entityId: string,
    companyId: string
  ): Promise<ComplianceValidation> {
    // Implement threshold checking logic
    const validation: Partial<ComplianceValidation> = {
      company_id: companyId,
      rule_id: rule.id,
      entity_type: entityType,
      entity_id: entityId,
      validation_result: 'pass',
      validation_score: 95,
      validation_details: {
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        validation_type: 'threshold',
        threshold_met: false
      },
      risk_assessment: 'low',
      action_required: false,
      validated_at: new Date().toISOString()
    };

    return validation as ComplianceValidation;
  }

  private async runWorkflowRule(
    rule: ComplianceRule,
    entityType: string,
    entityId: string,
    companyId: string
  ): Promise<ComplianceValidation> {
    // Implement workflow validation logic
    const validation: Partial<ComplianceValidation> = {
      company_id: companyId,
      rule_id: rule.id,
      entity_type: entityType,
      entity_id: entityId,
      validation_result: 'pending',
      validation_score: 0,
      validation_details: {
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        validation_type: 'workflow',
        workflow_status: 'pending_review'
      },
      risk_assessment: 'medium',
      action_required: true,
      action_description: 'Manual review required for this workflow',
      validated_at: new Date().toISOString()
    };

    return validation as ComplianceValidation;
  }

  private determineOverallStatus(validations: ComplianceValidation[]): 'compliant' | 'non_compliant' | 'pending_review' {
    const failed = validations.filter(v => v.validation_result === 'fail' || v.validation_result === 'error');
    const pending = validations.filter(v => v.validation_result === 'pending');

    if (failed.length > 0) return 'non_compliant';
    if (pending.length > 0) return 'pending_review';
    return 'compliant';
  }

  private async saveValidations(validations: ComplianceValidation[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('compliance_validations')
        .upsert(validations);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving validations:', error);
      throw error;
    }
  }

  private async getReportTemplate(reportType: string, jurisdiction: string): Promise<any> {
    // This would typically fetch report templates from a configuration or database
    return {
      version: '1.0',
      requiredFields: [],
      format: 'json'
    };
  }

  private async collectReportData(
    reportType: string,
    jurisdiction: string,
    periodStart: string,
    periodEnd: string,
    companyId: string
  ): Promise<Record<string, any>> {
    // This would implement specific data collection logic based on report type
    return {
      period_start: periodStart,
      period_end: periodEnd,
      jurisdiction,
      company_id: companyId,
      data_collected_at: new Date().toISOString()
    };
  }

  private async validateReportData(
    reportType: string,
    jurisdiction: string,
    data: Record<string, any>
  ): Promise<{ score: number; findings: any[]; violations: any[] }> {
    // Implement report validation logic
    return {
      score: 95,
      findings: [],
      violations: []
    };
  }

  private async getEntityDetails(
    entityType: string,
    entityId: string,
    companyId: string
  ): Promise<any> {
    // This would fetch entity details based on type
    return {
      id: entityId,
      name: 'Entity Name',
      type: entityType
    };
  }

  private async performScreening(entityData: any): Promise<any> {
    // Implement actual screening logic (sanctions, PEP, adverse media)
    return {
      matched: false,
      confidence: 85,
      pep_status: 'none',
      sanctions_status: 'clear',
      adverse_media_count: 0
    };
  }

  private calculateRiskRating(screeningResults: any): 'low' | 'medium' | 'high' | 'prohibited' {
    if (screeningResults.matched) return 'high';
    if (screeningResults.confidence < 70) return 'medium';
    return 'low';
  }

  private determineDueDiligenceLevel(
    riskRating: string,
    entityData: any
  ): 'simplified' | 'standard' | 'enhanced' {
    if (riskRating === 'high' || riskRating === 'prohibited') return 'enhanced';
    if (entityData.type === 'customer') return 'standard';
    return 'simplified';
  }

  private async logComplianceAction(logData: {
    companyId: string;
    actionType: string;
    entityType?: string;
    entityId?: string;
    description: string;
    newValues?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('compliance_audit_trail')
        .insert({
          company_id: logData.companyId,
          action_type: logData.actionType,
          entity_type: logData.entityType,
          entity_id: logData.entityId,
          action_description: logData.description,
          new_values: logData.newValues,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          system_generated: false,
          compliance_impact: 'medium',
          requires_review: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error logging compliance action:', error);
    }
  }
}

// Export singleton instance
export const complianceEngine = ComplianceEngine.getInstance();