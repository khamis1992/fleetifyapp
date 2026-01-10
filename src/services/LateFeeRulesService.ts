/**
 * Late Fee Rules Service
 * 
 * إدارة قواعد رسوم التأخير لكل شركة:
 * - CRUD للقواعد
 * - فصل القواعد الافتراضية
 * - التحقق من صحة القواعد
 * - تطبيق القواعد على الحسابات
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { LateFeeRule } from './lateFeeCalculator';
import { lateFeeCalculator, LateFeeCalculator as LateFeeCalc } from './lateFeeCalculator';

export interface RuleValidationError {
  field: string;
  message: string;
  messageEn?: string;
}

export interface RuleTestResult {
  isValid: boolean;
  errors: RuleValidationError[];
  testCases: Array<{
    scenario: string;
    input: any;
    expectedOutput: number;
    actualOutput: number;
    passed: boolean;
  }>;
}

class LateFeeRulesService {
  /**
   * الحصول على جميع قواعد الشركة
   */
  async getRules(companyId: string): Promise<LateFeeRule[]> {
    try {
      const { data: rules } = await supabase
        .from('late_fee_rules')
        .select('*')
        .eq('company_id', companyId)
        .eq('enabled', true)
        .order('created_at', { ascending: false });

      return rules || [];
    } catch (error) {
      logger.error('Failed to get late fee rules', { companyId, error });
      return [];
    }
  }

  /**
   * الحصول على قاعدة واحدة
   */
  async getRule(ruleId: string): Promise<LateFeeRule | null> {
    try {
      const { data: rule } = await supabase
        .from('late_fee_rules')
        .select('*')
        .eq('id', ruleId)
        .maybeSingle();

      return rule || null;
    } catch (error) {
      logger.error('Failed to get late fee rule', { ruleId, error });
      return null;
    }
  }

  /**
   * إنشاء قاعدة جديدة
   */
  async createRule(
    companyId: string,
    rule: Omit<LateFeeRule, 'id' | 'companyId' | 'createdAt'>
  ): Promise<{ success: boolean; rule?: LateFeeRule; error?: string }> {
    try {
      logger.info('Creating late fee rule', { companyId, ruleName: rule.name });

      // التحقق من صحة القاعدة
      const validation = this.validateRule(companyId, rule);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', ')
        };
      }

      // إنشاء القاعدة
      const { data: newRule, error: insertError } = await supabase
        .from('late_fee_rules')
        .insert({
          company_id: companyId,
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError || !newRule) {
        throw insertError || new Error('فشل في إنشاء القاعدة');
      }

      // مسح الـ cache
      lateFeeCalculator.clearCache(companyId);

      logger.info('Late fee rule created', {
        companyId,
        ruleId: newRule.id,
        ruleName: rule.name
      });

      return {
        success: true,
        rule: { ...rule, id: newRule.id, companyId }
      };
    } catch (error) {
      logger.error('Failed to create late fee rule', { companyId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * تحديث قاعدة موجودة
   */
  async updateRule(
    ruleId: string,
    updates: Partial<LateFeeRule>
  ): Promise<{ success: boolean; rule?: LateFeeRule; error?: string }> {
    try {
      logger.info('Updating late fee rule', { ruleId, updates });

      // التحقق من صحة التحديثات
      const currentRule = await this.getRule(ruleId);
      if (!currentRule) {
        return {
          success: false,
          error: 'القاعدة غير موجودة'
        };
      }

      const mergedRule = { ...currentRule, ...updates };
      const validation = this.validateRule(
        currentRule.companyId,
        mergedRule as LateFeeRule
      );

      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.map(e => e.message).join(', ')
        };
      }

      // تحديث القاعدة
      const { data: updatedRule, error: updateError } = await supabase
        .from('late_fee_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId)
        .select('id')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      // مسح الـ cache
      lateFeeCalculator.clearCache(currentRule.companyId);

      logger.info('Late fee rule updated', { ruleId });

      return {
        success: true,
        rule: updatedRule ? { ...currentRule, ...updates, id: ruleId } : undefined
      };
    } catch (error) {
      logger.error('Failed to update late fee rule', { ruleId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * حذف قاعدة
   */
  async deleteRule(ruleId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Deleting late fee rule', { ruleId });

      const currentRule = await this.getRule(ruleId);
      if (!currentRule) {
        return {
          success: false,
          error: 'القاعدة غير موجودة'
        };
      }

      // حذف القاعدة
      const { error: deleteError } = await supabase
        .from('late_fee_rules')
        .delete()
        .eq('id', ruleId);

      if (deleteError) {
        throw deleteError;
      }

      // مسح الـ cache
      lateFeeCalculator.clearCache(currentRule.companyId);

      logger.info('Late fee rule deleted', { ruleId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete late fee rule', { ruleId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * تفعيل/تعطيل قاعدة
   */
  async setRuleEnabled(ruleId: string, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    return this.updateRule(ruleId, { enabled });
  }

  /**
   * التحقق من صحة قاعدة
   */
  validateRule(companyId: string, rule: Omit<LateFeeRule, 'id' | 'companyId' | 'createdAt'>): {
    isValid: boolean;
    errors: RuleValidationError[];
  } {
    const errors: RuleValidationError[] = [];

    // التحقق 1: اسم القاعدة مطلوب
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'اسم القاعدة مطلوب',
        messageEn: 'Rule name is required'
      });
    }

    // التحقق 2: نوع القاعدة مطلوب
    if (!rule.ruleType || !['percentage', 'fixed', 'tiered'].includes(rule.ruleType)) {
      errors.push({
        field: 'ruleType',
        message: 'نوع القاعدة غير صحيح',
        messageEn: 'Invalid rule type'
      });
    }

    // التحقق 3: فترة السماح مطلوبة
    if (!rule.gracePeriodDays || rule.gracePeriodDays < 0) {
      errors.push({
        field: 'gracePeriodDays',
        message: 'فترة السماح يجب أن تكون موجبة و>= 0',
        messageEn: 'Grace period must be positive'
      });
    }

    // التحقق 4: حد الأدنى للتأخير مطلوب
    if (!rule.minimumOverdueDays || rule.minimumOverdueDays < 0) {
      errors.push({
        field: 'minimumOverdueDays',
        message: 'حد الأدنى للتأخير يجب أن يكون >= 0',
        messageEn: 'Minimum overdue days must be >= 0'
      });
    }

    // التحقق 5: يجب أن يكون قاعدة واحدة على الأقل مفعلة
    if (!rule.isAppliesToInvoices && !rule.isAppliesToContracts && !rule.isAppliesToPayments) {
      errors.push({
        field: 'appliesTo',
        message: 'يجب تفعيل قاعدة واحدة على الأقل (فواتير، عقود، أو مدفوعات)',
        messageEn: 'At least one target type must be enabled'
      });
    }

    // التحقق 6: تحقق من البنية حسب النوع
    if (rule.ruleType === 'percentage') {
      if (!rule.feeStructure.dailyRate || rule.feeStructure.dailyRate <= 0) {
        errors.push({
          field: 'feeStructure.dailyRate',
          message: 'النسبة المئوية اليومية مطلوبة و> 0',
          messageEn: 'Daily rate is required and must be > 0'
        });
      }

      if (rule.feeStructure.maxPercentage && rule.feeStructure.maxPercentage <= 0) {
        errors.push({
          field: 'feeStructure.maxPercentage',
          message: 'الحد الأقصى للنسبة يجب أن يكون > 0',
          messageEn: 'Max percentage must be > 0'
        });
      }

      if (rule.feeStructure.maxPercentage && rule.feeStructure.maxPercentage > 100) {
        errors.push({
          field: 'feeStructure.maxPercentage',
          message: 'الحد الأقصى للنسبة لا يمكن أن يتجاوز 100%',
          messageEn: 'Max percentage cannot exceed 100%'
        });
      }
    } else if (rule.ruleType === 'fixed') {
      if (!rule.feeStructure.dailyAmount || rule.feeStructure.dailyAmount <= 0) {
        errors.push({
          field: 'feeStructure.dailyAmount',
          message: 'المبلغ اليومي الثابت مطلوب و> 0',
          messageEn: 'Daily amount is required and must be > 0'
        });
      }

      if (rule.feeStructure.maxAmount && rule.feeStructure.maxAmount <= 0) {
        errors.push({
          field: 'feeStructure.maxAmount',
          message: 'الحد الأقصى للمبلغ يجب أن يكون > 0',
          messageEn: 'Max amount must be > 0'
        });
      }
    } else if (rule.ruleType === 'tiered') {
      if (!rule.feeStructure.tiers || rule.feeStructure.tiers.length === 0) {
        errors.push({
          field: 'feeStructure.tiers',
          message: 'المستويات مطلوبة',
          messageEn: 'Tiers are required'
        });
      }

      // التحقق من كل مستوى
      if (rule.feeStructure.tiers) {
        let previousMaxDays = 0;

        for (const [index, tier] of rule.feeStructure.tiers.entries()) {
          if (!tier.daysRange || tier.daysRange.length !== 2) {
            errors.push({
              field: `feeStructure.tiers[${index}].daysRange`,
              message: 'المدى الزمني للمستوى مطلوب ويجب أن يحتوي على عنصرين',
              messageEn: 'Days range must have 2 elements'
            });
          } else {
            const [minDays, maxDays] = tier.daysRange;

            if (minDays < 0 || maxDays <= 0) {
              errors.push({
                field: `feeStructure.tiers[${index}].daysRange`,
                message: 'الأيام يجب أن تكون موجبة',
                messageEn: 'Days must be positive'
              });
            }

            if (maxDays <= minDays) {
              errors.push({
                field: `feeStructure.tiers[${index}].daysRange`,
                message: 'الحد الأقصى يجب أن يكون أكبر من الحد الأدنى',
                messageEn: 'Max days must be greater than min days'
              });
            }

            // التحقق من التسلسل الصحيح
            if (index > 0 && minDays < previousMaxDays) {
              errors.push({
                field: `feeStructure.tiers[${index}].daysRange`,
                message: 'المستويات يجب أن تكون متسلسلة بالترتيب الصحيح',
                messageEn: 'Tiers must be in correct order'
              });
            }

            previousMaxDays = maxDays;
          }

          if (!tier.dailyRate || tier.dailyRate <= 0) {
            errors.push({
              field: `feeStructure.tiers[${index}].dailyRate`,
              message: 'النسبة المئوية اليومية مطلوبة و> 0',
              messageEn: 'Daily rate is required and must be > 0'
            });
          }

          if (tier.maxAmount && tier.maxAmount <= 0) {
            errors.push({
              field: `feeStructure.tiers[${index}].maxAmount`,
              message: 'الحد الأقصى للمبلغ يجب أن يكون > 0',
              messageEn: 'Max amount must be > 0'
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * اختبار قاعدة
   */
  async testRule(ruleId: string): Promise<RuleTestResult> {
    const rule = await this.getRule(ruleId);
    if (!rule) {
      return {
        isValid: false,
        errors: [{
          field: 'id',
          message: 'القاعدة غير موجودة',
          messageEn: 'Rule not found'
        }],
        testCases: []
      };
    }

    const testCases = this.generateTestCases(rule);

    const results = testCases.map(testCase => {
      const expectedOutput = testCase.expectedOutput;
      let actualOutput = 0;

      if (rule.ruleType === 'percentage') {
        const daysOverdue = testCase.input.daysOverdue;
        const amount = testCase.input.amount;
        const rate = rule.feeStructure.dailyRate!;
        actualOutput = amount * (rate / 100) * daysOverdue;

        if (rule.feeStructure.maxPercentage) {
          const maxAmount = amount * (rule.feeStructure.maxPercentage / 100);
          actualOutput = Math.min(actualOutput, maxAmount);
        }
      } else if (rule.ruleType === 'fixed') {
        const daysOverdue = testCase.input.daysOverdue;
        const dailyAmount = rule.feeStructure.dailyAmount!;
        actualOutput = dailyAmount * daysOverdue;

        if (rule.feeStructure.maxAmount) {
          actualOutput = Math.min(actualOutput, rule.feeStructure.maxAmount);
        }
      } else if (rule.ruleType === 'tiered') {
        const daysOverdue = testCase.input.daysOverdue;
        const amount = testCase.input.amount;
        const tiers = rule.feeStructure.tiers!;

        for (const tier of tiers) {
          const [minDays, maxDays] = tier.daysRange;

          if (daysOverdue >= minDays && daysOverdue < maxDays) {
            actualOutput = amount * (tier.dailyRate / 100);

            if (tier.maxAmount) {
              actualOutput = Math.min(actualOutput, tier.maxAmount);
            }

            break;
          }
        }
      }

      return {
        ...testCase,
        actualOutput,
        passed: Math.abs(actualOutput - expectedOutput) < 0.01
      };
    });

    const allPassed = results.every(r => r.passed);

    logger.info('Late fee rule tested', {
      ruleId,
      ruleName: rule.name,
      testCasesCount: testCases.length,
      passedCount: results.filter(r => r.passed).length,
      allPassed
    });

    return {
      isValid: allPassed,
      errors: allPassed ? [] : [{
        field: 'test',
        message: 'بعض اختبارات فشلت',
        messageEn: 'Some tests failed'
      }],
      testCases: results
    };
  }

  /**
   * إنشاء اختبارات لقاعدة
   */
  private generateTestCases(rule: LateFeeRule): Array<{
    scenario: string;
    input: any;
    expectedOutput: number;
  }> {
    const testCases = [];

    if (rule.ruleType === 'percentage') {
      const rate = rule.feeStructure.dailyRate || 0;
      const maxPercent = rule.feeStructure.maxPercentage || 100;

      testCases.push({
        scenario: 'تأخير 10 أيام، مبلغ 1000 ر.ق',
        input: { daysOverdue: 10, amount: 1000 },
        expectedOutput: Math.min(1000 * (maxPercent / 100), 1000 * (rate / 100) * 10)
      });

      testCases.push({
        scenario: 'تأخير 30 يوماً، مبلغ 1000 ر.ق',
        input: { daysOverdue: 30, amount: 1000 },
        expectedOutput: Math.min(1000 * (maxPercent / 100), 1000 * (rate / 100) * 30)
      });
    } else if (rule.ruleType === 'fixed') {
      const dailyAmount = rule.feeStructure.dailyAmount || 0;
      const maxAmount = rule.feeStructure.maxAmount || 100000;

      testCases.push({
        scenario: 'تأخير 10 أيام، مبلغ 1000 ر.ق',
        input: { daysOverdue: 10, amount: 1000 },
        expectedOutput: Math.min(dailyAmount * 10, maxAmount)
      });

      testCases.push({
        scenario: 'تأخير 30 يوماً، مبلغ 1000 ر.ق',
        input: { daysOverdue: 30, amount: 1000 },
        expectedOutput: Math.min(dailyAmount * 30, maxAmount)
      });
    } else if (rule.ruleType === 'tiered') {
      const tiers = rule.feeStructure.tiers || [];

      for (const tier of tiers) {
        const [minDays, maxDays] = tier.daysRange;
        const dailyRate = tier.dailyRate;
        const maxAmount = tier.maxAmount || 100000;

        testCases.push({
          scenario: `تأخير ${minDays}-${maxDays} يوماً، مبلغ 1000 ر.ق`,
          input: { daysOverdue: (minDays + maxDays) / 2, amount: 1000 },
          expectedOutput: Math.min(1000 * (dailyRate / 100), maxAmount)
        });
      }
    }

    return testCases;
  }

  /**
   * نسخ القواعد الافتراضية لشركة
   */
  async createDefaultRules(companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Creating default late fee rules', { companyId });

      const defaultRule = LateFeeCalc.createDefaultRule(companyId);
      
      const { success } = await this.createRule(companyId, defaultRule);

      if (!success) {
        return {
          success: false,
          error: 'فشل في إنشاء القاعدة الافتراضية'
        };
      }

      logger.info('Default late fee rules created', { companyId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to create default rules', { companyId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * نسخ قواعد من شركة أخرى
   */
  async copyRules(
    fromCompanyId: string,
    toCompanyId: string
  ): Promise<{ success: boolean; rulesCopied: number; error?: string }> {
    try {
      logger.info('Copying late fee rules', { fromCompanyId, toCompanyId });

      // جلب القواعد من الشركة المصدر
      const sourceRules = await this.getRules(fromCompanyId);

      if (sourceRules.length === 0) {
        return {
          success: true,
          rulesCopied: 0
        };
      }

      // نسخ القواعد للشركة الهدف
      let copiedCount = 0;
      for (const rule of sourceRules) {
        const { success } = await this.createRule(toCompanyId, rule);
        if (success) {
          copiedCount++;
        }
      }

      logger.info('Late fee rules copied', {
        fromCompanyId,
        toCompanyId,
        rulesCopied: copiedCount
      });

      return {
        success: true,
        rulesCopied: copiedCount
      };
    } catch (error) {
      logger.error('Failed to copy rules', { fromCompanyId, toCompanyId, error });
      return {
        success: false,
        rulesCopied: 0,
        error: error instanceof Error ? error.message : 'خطأ غير معروف'
      };
    }
  }

  /**
   * الحصول على ملخص القواعد
   */
  async getRulesSummary(companyId: string): Promise<{
    total: number;
    enabled: number;
    disabled: number;
    byType: Record<string, number>;
  }> {
    try {
      const { data: rules } = await supabase
        .from('late_fee_rules')
        .select('rule_type, enabled', { count: 'exact' })
        .eq('company_id', companyId);

      const summary = {
        total: rules?.length || 0,
        enabled: rules?.filter(r => r.enabled).length || 0,
        disabled: rules?.filter(r => !r.enabled).length || 0,
        byType: {
          percentage: 0,
          fixed: 0,
          tiered: 0
        }
      };

      if (rules) {
        for (const rule of rules) {
          if (summary.byType[rule.rule_type] !== undefined) {
            summary.byType[rule.rule_type]++;
          }
        }
      }

      logger.info('Late fee rules summary', { companyId, summary });

      return summary;
    } catch (error) {
      logger.error('Failed to get rules summary', { companyId, error });
      return {
        total: 0,
        enabled: 0,
        disabled: 0,
        byType: { percentage: 0, fixed: 0, tiered: 0 }
      };
    }
  }
}

// Export singleton instance
export const lateFeeRulesService = new LateFeeRulesService();
