import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface AllocationRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    customerType?: string;
    contractType?: string;
    paymentMethod?: string;
  };
  distribution: {
    accountId: string;
    percentage: number;
    fixedAmount?: number;
    description: string;
  }[];
}

export interface AllocationResult {
  success: boolean;
  allocations: Array<{
    accountId: string;
    accountName: string;
    amount: number;
    percentage: number;
    description: string;
  }>;
  journalEntryPreview?: {
    entryNumber: string;
    totalAmount: number;
    lines: Array<{
      accountId: string;
      accountName: string;
      debitAmount: number;
      creditAmount: number;
      description: string;
    }>;
  };
  errors?: string[];
}

class PaymentAllocationEngine {
  private defaultRules: AllocationRule[] = [
    {
      id: 'default-cash',
      name: 'النقد الافتراضي',
      priority: 1,
      conditions: {},
      distribution: [
        {
          accountId: 'cash-account',
          percentage: 100,
          description: 'إيداع نقدي'
        }
      ]
    }
  ];

  async allocatePayment(
    paymentData: {
      id: string;
      amount: number;
      customerId?: string;
      contractId?: string;
      paymentMethod: string;
      companyId: string;
    }
  ): Promise<AllocationResult> {
    try {
      logger.debug('Starting payment allocation', { paymentId: paymentData.id });

      // Get applicable allocation rules
      const rules = await this.getApplicableRules(paymentData);
      
      // Apply the highest priority rule
      const selectedRule = rules[0] || this.defaultRules[0];
      
      // Calculate allocations
      const allocations = await this.calculateAllocations(paymentData, selectedRule);
      
      // Generate journal entry preview
      const journalEntryPreview = await this.generateJournalPreview(paymentData, allocations);

      return {
        success: true,
        allocations,
        journalEntryPreview
      };
    } catch (error) {
      logger.error('Payment allocation failed', { error, paymentId: paymentData.id });
      return {
        success: false,
        allocations: [],
        errors: [error instanceof Error ? error.message : 'خطأ غير معروف في التوزيع']
      };
    }
  }

  private async getApplicableRules(paymentData: any): Promise<AllocationRule[]> {
    // For now, return default rules since custom rules table doesn't exist
    return this.defaultRules;

    // Removed custom rules logic for now
  }

  private ruleMatches(rule: any, paymentData: any): boolean {
    const conditions = rule.conditions || {};

    // Check amount range
    if (conditions.minAmount && paymentData.amount < conditions.minAmount) return false;
    if (conditions.maxAmount && paymentData.amount > conditions.maxAmount) return false;

    // Check payment method
    if (conditions.paymentMethod && conditions.paymentMethod !== paymentData.paymentMethod) return false;

    return true;
  }

  private async calculateAllocations(paymentData: any, rule: AllocationRule) {
    const allocations = [];
    const { data: accounts } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('company_id', paymentData.companyId)
      .eq('is_active', true);

    const accountMap = new Map(accounts?.map(acc => [acc.id, acc]) || []);

    for (const dist of rule.distribution) {
      const account = accountMap.get(dist.accountId);
      let amount = 0;

      if (dist.fixedAmount) {
        amount = dist.fixedAmount;
      } else {
        amount = (paymentData.amount * dist.percentage) / 100;
      }

      allocations.push({
        accountId: dist.accountId,
        accountName: account?.account_name || 'حساب غير معروف',
        amount,
        percentage: dist.percentage,
        description: dist.description
      });
    }

    return allocations;
  }

  private async generateJournalPreview(paymentData: any, allocations: any[]) {
    const entryNumber = `JE-PAY-${new Date().toISOString().slice(0, 10)}-${paymentData.id.slice(-6)}`;
    
    const lines = [];

    // Debit entries (usually cash/bank accounts)
    for (const allocation of allocations) {
      if (allocation.amount > 0) {
        lines.push({
          accountId: allocation.accountId,
          accountName: allocation.accountName,
          debitAmount: allocation.amount,
          creditAmount: 0,
          description: `دفعة - ${allocation.description}`
        });
      }
    }

    // Credit entry (revenue or receivables reduction)
    const totalAmount = allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    
    // Get revenue account for credit entry
    const { data: revenueAccount } = await supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('company_id', paymentData.companyId)
      .eq('account_type', 'revenue')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (revenueAccount) {
      lines.push({
        accountId: revenueAccount.id,
        accountName: revenueAccount.account_name,
        debitAmount: 0,
        creditAmount: totalAmount,
        description: 'إيرادات من الدفعة'
      });
    }

    return {
      entryNumber,
      totalAmount,
      lines
    };
  }

  async createAllocationRule(rule: Omit<AllocationRule, 'id'>, companyId: string): Promise<string | null> {
    // For now, just add to memory since table doesn't exist
    const newRule = {
      id: `rule-${Date.now()}`,
      ...rule
    };
    this.defaultRules.push(newRule);
    logger.info('Allocation rule created in memory', { ruleId: newRule.id });
    return newRule.id;
  }

  async getAllocationRules(companyId: string): Promise<AllocationRule[]> {
    // Return default rules for now
    return this.defaultRules;
  }
}

export const paymentAllocationEngine = new PaymentAllocationEngine();