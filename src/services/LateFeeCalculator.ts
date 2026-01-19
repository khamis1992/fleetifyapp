/**
 * Late Fee Calculator
 * 
 * Service for calculating late fees based on existing rules
 * Supports multiple fee calculation methods using the existing late_fee_rules table
 * Matches the actual database schema
 */

import { LateFeeType } from '@/types/payment-enums';
import { logger } from '@/lib/logger';

/**
 * Late Fee Rule Definition (matches database schema)
 */
export interface LateFeeRule {
  id: string;
  companyId: string;
  ruleName: string;
  gracePeriodDays: number;
  feeType: LateFeeType;
  feeAmount: number;
  maxFeeAmount?: number;
  percentage?: number;
  minFeeAmount?: number;
  applyToInvoiceTypes?: string[];
  isActive: boolean;
  priority?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Late Fee Calculation Result
 */
export interface LateFeeCalculationResult {
  contractId: string;
  customerId: string;
  companyId: string;
  
  // Original payment info
  originalAmount: number;
  dueDate: string;
  paymentDate?: string;
  daysLate: number;
  
  // Fee calculation
  baseFee: number;
  penaltyAmount: number;
  totalLateFee: number;
  
  // Calculation breakdown
  breakdown: {
    daysInPeriod: number;
    periods: number;
    rateApplied: number;
    calculationMethod: 'fixed' | 'percentage';
  };
  
  // Rule applied
  ruleId: string;
  ruleName: string;
  
  // Timestamps
  calculatedAt: string;
}

/**
 * Overdue Contract Info
 */
export interface OverdueContractInfo {
  contractId: string;
  customerId: string;
  companyId: string;
  contractNumber: string;
  monthlyAmount: number;
  dueDate: string;
  daysLate: number;
  paidAmount: number;
  remainingBalance: number;
}

/**
 * Late Fee Calculator Class
 */
export class LateFeeCalculator {
  
  /**
   * Calculate late fee for a contract
   */
  async calculateLateFee(
    contractInfo: OverdueContractInfo,
    rule: LateFeeRule
  ): Promise<LateFeeCalculationResult> {
    try {
      logger.debug('Calculating late fee', {
        contractId: contractInfo.contractId,
        daysLate: contractInfo.daysLate,
        ruleId: rule.id
      });

      // 1. Check if grace period applies
      if (contractInfo.daysLate <= rule.gracePeriodDays) {
        logger.info('Grace period applies', {
          contractId: contractInfo.contractId,
          daysLate: contractInfo.daysLate,
          gracePeriod: rule.gracePeriodDays
        });
        
        return this.createZeroFeeResult(contractInfo, rule);
      }

      // 2. Calculate base fee
      let baseFee = 0;
      let calculationMethod: 'fixed' | 'percentage';

      if (rule.feeType === 'percentage' && rule.percentage) {
        // Percentage-based calculation
        calculationMethod = 'percentage';
        baseFee = contractInfo.monthlyAmount * (rule.percentage / 100);
      } else {
        // Fixed amount calculation
        calculationMethod = 'fixed';
        baseFee = rule.feeAmount;
      }

      // 3. Apply minimum fee
      if (rule.minFeeAmount && baseFee < rule.minFeeAmount) {
        baseFee = rule.minFeeAmount;
      }

      // 4. Apply maximum fee cap
      if (rule.maxFeeAmount && baseFee > rule.maxFeeAmount) {
        logger.info('Late fee capped at maximum', {
          contractId: contractInfo.contractId,
          calculatedFee: baseFee,
          maxAmount: rule.maxFeeAmount
        });
        baseFee = rule.maxFeeAmount;
      }

      // 5. Calculate penalty (separate from late fee)
      let penaltyAmount = 0;
      if (rule.feeType === 'penalty') {
        penaltyAmount = baseFee;
        baseFee = 0;
      }

      const totalLateFee = baseFee + penaltyAmount;

      // 6. Create result
      const result: LateFeeCalculationResult = {
        contractId: contractInfo.contractId,
        customerId: contractInfo.customerId,
        companyId: contractInfo.companyId,
        
        originalAmount: contractInfo.monthlyAmount,
        dueDate: contractInfo.dueDate,
        paymentDate: contractInfo.dueDate,
        daysLate: contractInfo.daysLate,
        
        baseFee,
        penaltyAmount,
        totalLateFee,
        
        breakdown: {
          daysInPeriod: contractInfo.daysLate,
          periods: 1, // One period per month
          rateApplied: rule.percentage || rule.feeAmount || 0,
          calculationMethod
        },
        
        ruleId: rule.id,
        ruleName: rule.ruleName,
        
        calculatedAt: new Date().toISOString()
      };

      logger.info('Late fee calculated', {
        contractId: contractInfo.contractId,
        totalLateFee,
        daysLate: contractInfo.daysLate
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate late fee', {
        contractId: contractInfo.contractId,
        ruleId: rule.id,
        error
      });
      throw error;
    }
  }

  /**
   * Calculate late fees for multiple contracts
   */
  async calculateLateFeesBatch(
    contracts: OverdueContractInfo[],
    rules: Map<string, LateFeeRule>
  ): Promise<LateFeeCalculationResult[]> {
    logger.info('Calculating late fees for batch', {
      contractCount: contracts.length
    });

    const results: LateFeeCalculationResult[] = [];

    for (const contractInfo of contracts) {
      // Find applicable rule for this company
      const applicableRule = this.findApplicableRule(contractInfo.companyId, rules);
      
      if (!applicableRule) {
        logger.warn('No applicable late fee rule found', {
          contractId: contractInfo.contractId,
          companyId: contractInfo.companyId
        });
        continue;
      }

      const result = await this.calculateLateFee(contractInfo, applicableRule);
      results.push(result);
    }

    logger.info('Batch late fee calculation completed', {
      contractCount: contracts.length,
      resultsCount: results.length
    });

    return results;
  }

  /**
   * Find applicable late fee rule for a company
   */
  private findApplicableRule(
    companyId: string,
    rules: Map<string, LateFeeRule>
  ): LateFeeRule | null {
    // Filter rules by company
    const companyRules = Array.from(rules.values()).filter(rule =>
      rule.companyId === companyId &&
      rule.isActive === true
    );

    if (companyRules.length === 0) {
      return null;
    }

    // Sort by priority (highest first)
    companyRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return companyRules[0];
  }

  /**
   * Create zero fee result (grace period or not overdue)
   */
  private createZeroFeeResult(
    contractInfo: OverdueContractInfo,
    rule: LateFeeRule
  ): LateFeeCalculationResult {
    return {
      contractId: contractInfo.contractId,
      customerId: contractInfo.customerId,
      companyId: contractInfo.companyId,
      
      originalAmount: contractInfo.monthlyAmount,
      dueDate: contractInfo.dueDate,
      daysLate: contractInfo.daysLate,
      
      baseFee: 0,
      penaltyAmount: 0,
      totalLateFee: 0,
      
      breakdown: {
        daysInPeriod: 0,
        periods: 0,
        rateApplied: rule.feeAmount || 0,
        calculationMethod: 'fixed'
      },
      
      ruleId: rule.id,
      ruleName: rule.ruleName,
      
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Create default late fee rule for a company
   */
  createDefaultRule(companyId: string): Partial<LateFeeRule> {
    return {
      companyId,
      ruleName: 'Default Late Fee Rule',
      gracePeriodDays: 7, // 7 days grace period
      feeType: 'late_fee',
      feeAmount: 50, // QAR 50 per month
      maxFeeAmount: 500, // Max QAR 500 per month
      minFeeAmount: 10, // Min QAR 10
      percentage: null,
      applyToInvoiceTypes: null,
      isActive: true,
      priority: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const lateFeeCalculator = new LateFeeCalculator();
