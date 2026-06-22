/**
 * Late Fee Rules Service
 * 
 * Service for managing late fee rules:
 * - CRUD operations on late fee rules
 * - Rule validation and testing
 * - Default rules for companies
 * - Rule versioning and history
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { LateFeeType, LateFeeFrequency, LateFeeCalculationMethod } from '@/types/payment-enums';
import { lateFeeCalculator, LateFeeRule } from './lateFeeCalculator';

/**
 * Late Fee Rule Create Input
 * Input for creating a new late fee rule
 */
export interface CreateLateFeeRuleInput {
  companyId: string;
  contractId?: string;
  ruleName: string;
  ruleNameAr?: string;
  description?: string;
  descriptionAr?: string;
  feeType: LateFeeType;
  calculationMethod: LateFeeCalculationMethod;
  fixedAmount?: number;
  percentageRate?: number;
  maxAmount?: number;
  frequency: LateFeeFrequency;
  gracePeriodDays: number;
  maxLateDays?: number;
  escalateAfterDays?: number;
  escalationMultiplier?: number;
  escalationCap?: number;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

/**
 * Late Fee Rule Update Input
 * Input for updating an existing late fee rule
 */
export interface UpdateLateFeeRuleInput extends Partial<CreateLateFeeRuleInput> {
  // All fields from create input are optional for updates
}

/**
 * Rule History Entry
 * Historical record of rule changes
 */
export interface LateFeeRuleHistory {
  id: string;
  ruleId: string;
  companyId: string;
  action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedBy?: string;
  changedAt: string;
  changeReason?: string;
}

/**
 * Late Fee Rules Service
 * Main service class
 */
class LateFeeRulesService {
  /**
   * Get all late fee rules for a company
   */
  async getCompanyRules(companyId: string, options?: {
    includeInactive?: boolean;
    contractId?: string;
  }): Promise<LateFeeRule[]> {
    try {
      let query = supabase
        .from('late_fee_rules')
        .select('*')
        .eq('company_id', companyId);

      if (!options?.includeInactive) {
        query = query.eq('is_active', true);
      }

      if (options?.contractId) {
        query = query.eq('contract_id', options.contractId);
      }

      const { data: rules, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch company late fee rules', { companyId, error });
        throw error;
      }

      logger.debug('Fetched company late fee rules', { companyId, count: rules.length });
      return rules;

    } catch (error) {
      logger.error('Exception fetching company late fee rules', { companyId, error });
      throw error;
    }
  }

  /**
   * Get a specific late fee rule
   */
  async getRule(ruleId: string): Promise<LateFeeRule | null> {
    try {
      const { data: rule, error } = await supabase
        .from('late_fee_rules')
        .select('*')
        .eq('id', ruleId)
        .single();

      if (error) {
        logger.error('Failed to fetch late fee rule', { ruleId, error });
        return null;
      }

      logger.debug('Fetched late fee rule', { ruleId });
      return rule;

    } catch (error) {
      logger.error('Exception fetching late fee rule', { ruleId, error });
      return null;
    }
  }

  /**
   * Create a new late fee rule
   */
  async createRule(input: CreateLateFeeRuleInput, userId?: string): Promise<LateFeeRule> {
    try {
      logger.info('Creating late fee rule', {
        companyId: input.companyId,
        ruleName: input.ruleName
      });

      // Validate input
      const validation = lateFeeCalculator.validateRule(input);
      if (!validation.isValid) {
        const error = new Error(`Invalid late fee rule: ${validation.errors.join(', ')}`);
        logger.error('Late fee rule validation failed', {
          companyId: input.companyId,
          errors: validation.errors
        });
        throw error;
      }

      // Create rule
      const { data: rule, error: createError } = await supabase
        .from('late_fee_rules')
        .insert({
          company_id: input.companyId,
          contract_id: input.contractId || null,
          rule_name: input.ruleName,
          rule_name_ar: input.ruleNameAr || input.ruleName,
          description: input.description || null,
          description_ar: input.descriptionAr || input.description,
          fee_type: input.feeType,
          calculation_method: input.calculationMethod,
          fixed_amount: input.fixedAmount || null,
          percentage_rate: input.percentageRate || null,
          max_amount: input.maxAmount || null,
          frequency: input.frequency,
          grace_period_days: input.gracePeriodDays || 0,
          max_late_days: input.maxLateDays || null,
          escalate_after_days: input.escalateAfterDays || null,
          escalation_multiplier: input.escalationMultiplier || null,
          escalation_cap: input.escalationCap || null,
          is_active: input.isActive !== undefined ? true : input.isActive,
          effective_from: input.effectiveFrom || new Date().toISOString(),
          effective_to: input.effectiveTo || null,
          created_by: userId || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        logger.error('Failed to create late fee rule', {
          companyId: input.companyId,
          error: createError
        });
        throw createError;
      }

      // Create history entry
      await this.createHistoryEntry(rule.id, input.companyId, 'created', null, rule, userId);

      logger.info('Late fee rule created successfully', {
        ruleId: rule.id,
        companyId: input.companyId,
        ruleName: input.ruleName
      });

      return rule;

    } catch (error) {
      logger.error('Exception creating late fee rule', {
        companyId: input.companyId,
        error
      });
      throw error;
    }
  }

  /**
   * Update an existing late fee rule
   */
  async updateRule(ruleId: string, updates: UpdateLateFeeRuleInput, userId?: string): Promise<LateFeeRule> {
    try {
      logger.info('Updating late fee rule', { ruleId, updates });

      // Get current rule for history
      const currentRule = await this.getRule(ruleId);
      if (!currentRule) {
        throw new Error('Late fee rule not found');
      }

      // Validate updates
      const validation = lateFeeCalculator.validateRule(updates);
      if (!validation.isValid) {
        const error = new Error(`Invalid late fee rule update: ${validation.errors.join(', ')}`);
        logger.error('Late fee rule validation failed', {
          ruleId,
          errors: validation.errors
        });
        throw error;
      }

      // Prepare update data
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString()
      };

      if (updates.ruleName !== undefined) {
        updateData.rule_name = updates.ruleName;
        updateData.rule_name_ar = updates.ruleNameAr || updates.ruleName;
      }

      if (updates.description !== undefined) {
        updateData.description = updates.description;
        updateData.description_ar = updates.descriptionAr || updates.description;
      }

      if (updates.feeType !== undefined) {
        updateData.fee_type = updates.feeType;
      }

      if (updates.calculationMethod !== undefined) {
        updateData.calculation_method = updates.calculationMethod;
      }

      if (updates.fixedAmount !== undefined) {
        updateData.fixed_amount = updates.fixedAmount;
      }

      if (updates.percentageRate !== undefined) {
        updateData.percentage_rate = updates.percentageRate;
      }

      if (updates.maxAmount !== undefined) {
        updateData.max_amount = updates.maxAmount;
      }

      if (updates.frequency !== undefined) {
        updateData.frequency = updates.frequency;
      }

      if (updates.gracePeriodDays !== undefined) {
        updateData.grace_period_days = updates.gracePeriodDays;
      }

      if (updates.maxLateDays !== undefined) {
        updateData.max_late_days = updates.maxLateDays;
      }

      if (updates.escalateAfterDays !== undefined) {
        updateData.escalate_after_days = updates.escalateAfterDays;
      }

      if (updates.escalationMultiplier !== undefined) {
        updateData.escalation_multiplier = updates.escalationMultiplier;
      }

      if (updates.escalationCap !== undefined) {
        updateData.escalation_cap = updates.escalationCap;
      }

      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive;
      }

      if (updates.effectiveFrom !== undefined) {
        updateData.effective_from = updates.effectiveFrom;
      }

      if (updates.effectiveTo !== undefined) {
        updateData.effective_to = updates.effectiveTo;
      }

      // Update rule
      const { data: rule, error: updateError } = await supabase
        .from('late_fee_rules')
        .update(updateData)
        .eq('id', ruleId)
        .select()
        .single();

      if (updateError) {
        logger.error('Failed to update late fee rule', { ruleId, error: updateError });
        throw updateError;
      }

      // Create history entry
      await this.createHistoryEntry(ruleId, currentRule.companyId, 'updated', currentRule, rule, userId);

      logger.info('Late fee rule updated successfully', {
        ruleId,
        companyId: currentRule.companyId,
        updates: Object.keys(updateData).length
      });

      return rule;

    } catch (error) {
      logger.error('Exception updating late fee rule', { ruleId, error });
      throw error;
    }
  }

  /**
   * Delete a late fee rule
   */
  async deleteRule(ruleId: string, userId?: string): Promise<void> {
    try {
      logger.info('Deleting late fee rule', { ruleId });

      // Get current rule for history
      const currentRule = await this.getRule(ruleId);
      if (!currentRule) {
        throw new Error('Late fee rule not found');
      }

      // Delete rule
      const { error: deleteError } = await supabase
        .from('late_fee_rules')
        .delete()
        .eq('id', ruleId);

      if (deleteError) {
        logger.error('Failed to delete late fee rule', { ruleId, error: deleteError });
        throw deleteError;
      }

      // Create history entry
      await this.createHistoryEntry(ruleId, currentRule.companyId, 'deleted', currentRule, null, userId);

      logger.info('Late fee rule deleted successfully', { ruleId });

    } catch (error) {
      logger.error('Exception deleting late fee rule', { ruleId, error });
      throw error;
    }
  }

  /**
   * Activate a late fee rule
   */
  async activateRule(ruleId: string, userId?: string): Promise<LateFeeRule> {
    return this.updateRule(ruleId, { isActive: true }, userId);
  }

  /**
   * Deactivate a late fee rule
   */
  async deactivateRule(ruleId: string, userId?: string): Promise<LateFeeRule> {
    return this.updateRule(ruleId, { isActive: false }, userId);
  }

  /**
   * Get rule history
   */
  async getRuleHistory(ruleId: string): Promise<LateFeeRuleHistory[]> {
    try {
      const { data: history, error } = await supabase
        .from('late_fee_rule_history')
        .select('*')
        .eq('rule_id', ruleId)
        .order('changed_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch rule history', { ruleId, error });
        throw error;
      }

      return history;

    } catch (error) {
      logger.error('Exception fetching rule history', { ruleId, error });
      throw error;
    }
  }

  /**
   * Test a late fee rule
   * Simulates calculation for a given scenario
   */
  async testRule(
    rule: LateFeeRule,
    testScenarios: Array<{
      amount: number;
      daysLate: number;
      expectedFee?: number;
    }>
  ): Promise<Array<{
    scenario: {
      amount: number;
      daysLate: number;
    };
    calculatedFee: number;
    matchesExpected?: boolean;
    error?: string;
  }>> {
    try {
      logger.info('Testing late fee rule', {
        ruleId: rule.id,
        scenariosCount: testScenarios.length
      });

      const results = [];

      for (const scenario of testScenarios) {
        try {
          const contractInfo = {
            contractId: 'test-contract',
            customerId: 'test-customer',
            companyId: rule.companyId,
            contractNumber: 'TEST-001',
            monthlyAmount: scenario.amount,
            dueDate: new Date().toISOString(),
            daysLate: scenario.daysLate,
            paidAmount: 0,
            remainingBalance: scenario.amount
          };

          const result = await lateFeeCalculator.calculateLateFee(contractInfo, rule);

          results.push({
            scenario,
            calculatedFee: result.totalLateFee,
            matchesExpected: scenario.expectedFee !== undefined
              ? Math.abs(result.totalLateFee - scenario.expectedFee) < 0.01
              : undefined,
            error: undefined
          });

        } catch (error) {
          results.push({
            scenario,
            calculatedFee: 0,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      logger.info('Late fee rule test completed', {
        ruleId: rule.id,
        passedCount: results.filter(r => !r.error).length
      });

      return results;

    } catch (error) {
      logger.error('Exception testing late fee rule', { ruleId, error });
      throw error;
    }
  }

  /**
   * Create default late fee rules for a company
   */
  async createDefaultRules(companyId: string, userId?: string): Promise<LateFeeRule[]> {
    try {
      logger.info('Creating default late fee rules for company', { companyId });

      const defaultRules = [
        // Standard rental late fee
        {
          companyId,
          ruleName: 'Standard Rental Late Fee',
          ruleNameAr: 'غرامة التأخير القياسية',
          description: '1% per month after 7-day grace period',
          descriptionAr: '1% شهرياً بعد فترة السماح 7 أيام',
          feeType: LateFeeType.LATE_FEE,
          calculationMethod: LateFeeCalculationMethod.PERCENTAGE,
          percentageRate: 1,
          frequency: LateFeeFrequency.MONTHLY,
          gracePeriodDays: 7,
          maxAmount: 500,
          escalateAfterDays: 30,
          escalationMultiplier: 1.5,
          escalationCap: 3,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        
        // Security deposit late fee
        {
          companyId,
          ruleName: 'Security Deposit Late Fee',
          ruleNameAr: 'غرامة التأخير للتأمين',
          description: 'Fixed QAR 10 per day for security deposit delays',
          descriptionAr: 'قيمة ثابتة 10 ر.ق يومياً لتأخير التأمين',
          feeType: LateFeeType.PENALTY,
          calculationMethod: LateFeeCalculationMethod.FIXED,
          fixedAmount: 10,
          frequency: LateFeeFrequency.DAILY,
          gracePeriodDays: 0,
          maxAmount: 1000,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const createdRules: LateFeeRule[] = [];

      for (const rule of defaultRules) {
        const created = await this.createRule(rule, userId);
        createdRules.push(created);
      }

      logger.info('Default late fee rules created', {
        companyId,
        count: createdRules.length
      });

      return createdRules;

    } catch (error) {
      logger.error('Exception creating default late fee rules', { companyId, error });
      throw error;
    }
  }

  /**
   * Get active rule for a contract
   */
  async getActiveRuleForContract(companyId: string, contractId: string): Promise<LateFeeRule | null> {
    try {
      // Try to find contract-specific rule
      const { data: contractSpecificRule } = await supabase
        .from('late_fee_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('contract_id', contractId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (contractSpecificRule) {
        return contractSpecificRule;
      }

      // Fall back to company-wide rule
      const { data: companyWideRule } = await supabase
        .from('late_fee_rules')
        .select('*')
        .eq('company_id', companyId)
        .is('contract_id', null) // Company-wide rule
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return companyWideRule;

    } catch (error) {
      logger.error('Exception fetching active rule for contract', { companyId, contractId, error });
      return null;
    }
  }

  /**
   * Create history entry
   */
  private async createHistoryEntry(
    ruleId: string,
    companyId: string,
    action: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated',
    previousValues: Record<string, any> | null,
    newValues: Record<string, any> | null,
    userId?: string
  ): Promise<void> {
    try {
      await supabase.from('late_fee_rule_history').insert({
        rule_id: ruleId,
        company_id: companyId,
        action,
        previous_values: previousValues,
        new_values: newValues,
        changed_by: userId || 'system',
        changed_at: new Date().toISOString()
      });
    } catch (error) {
      // Non-critical: log and continue
      logger.warn('Failed to create rule history entry', { ruleId, action, error });
    }
  }
}

// Export singleton instance
export const lateFeeRulesService = new LateFeeRulesService();

