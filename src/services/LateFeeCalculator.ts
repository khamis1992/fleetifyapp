/**
 * Late Fee Calculator
 * 
 * حساب رسوم التأخير:
 * - حساب الأيام المتأخرة
 * - تطبيق قواعد الرسوم
 * - دعم قواعد متعددة (نسبة، ثابت، متدرجة)
 * - حساب الرسوم لكل دفعات وفواتير
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface LateFeeRule {
  id?: string;
  companyId: string;
  name: string;
  nameEn?: string;
  ruleType: 'percentage' | 'fixed' | 'tiered';
  feeStructure: {
    // For percentage rules:
    dailyRate?: number; // Percentage per day (e.g., 1.5% per day)
    maxPercentage?: number; // Maximum percentage of original amount
    
    // For fixed rules:
    dailyAmount?: number; // Fixed amount per day (e.g., 10 QAR per day)
    maxAmount?: number; // Maximum total amount
    
    // For tiered rules:
    tiers?: Array<{
      daysRange: [number, number]; // [minDays, maxDays]
      dailyRate: number;
      maxAmount?: number;
    }>;
  };
  gracePeriodDays: number; // Days before late fees apply
  minimumOverdueDays: number; // Minimum days overdue before fees apply
  isAppliesToInvoices: boolean;
  isAppliesToContracts: boolean;
  isAppliesToPayments: boolean;
  enabled: boolean;
}

export interface LateFeeCalculation {
  targetId: string;
  targetType: 'invoice' | 'contract' | 'payment';
  targetNumber?: string;
  customerId?: string;
  companyId: string;
  dueDate: string;
  paymentDate: string;
  daysOverdue: number;
  originalAmount: number;
  lateFeeAmount: number;
  totalAmount: number; // originalAmount + lateFeeAmount
  ruleId: string;
  ruleName: string;
  calculatedAt: string;
}

export interface LateFeeSummary {
  companyId: string;
  totalFees: number;
  feeCount: number;
  averageFee: number;
  calculations: LateFeeCalculation[];
  period: {
    startDate: string;
    endDate: string;
  };
}

class LateFeeCalculator {
  private rulesCache: Map<string, LateFeeRule[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private CACHE_DURATION_MS = 30 * 60 * 1000; // 30 دقيقة

  /**
   * حساب رسوم التأخير لفاتورة
   */
  async calculateForInvoice(
    invoiceId: string,
    paymentDate: string = new Date().toISOString()
  ): Promise<LateFeeCalculation | null> {
    try {
      // 1. جلب الفاتورة
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          *,
          customers!invoices_customer_id_fkey (
            id,
            company_id
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (!invoice) {
        logger.warn('Invoice not found for late fee calculation', { invoiceId });
        return null;
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(1);

      const lastPaymentDate = payments && payments.length > 0
        ? payments[0].payment_date
        : paymentDate;

      // 2. حساب الأيام المتأخرة
      const dueDate = new Date(invoice.due_date);
      const paymentD = new Date(lastPaymentDate);
      const daysOverdue = Math.max(0, Math.floor(
        (paymentD.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      ));

      // 3. الحصول على القواعد المفعلة للشركة
      const rules = await this.getRulesForCompany(invoice.customers.company_id);

      // 4. البحث عن قاعدة مناسبة
      const applicableRule = this.findApplicableRule(
        rules,
        daysOverdue,
        'invoice',
        invoice.total_amount
      );

      if (!applicableRule) {
        logger.debug('No applicable late fee rule found', {
          invoiceId,
          companyId: invoice.customers.company_id,
          daysOverdue
        });
        return null;
      }

      // 5. حساب الرسم
      const lateFeeAmount = this.calculateFeeAmount(
        applicableRule,
        daysOverdue,
        invoice.total_amount
      );

      const calculation: LateFeeCalculation = {
        targetId: invoiceId,
        targetType: 'invoice',
        targetNumber: invoice.invoice_number,
        customerId: invoice.customer_id,
        companyId: invoice.customers.company_id,
        dueDate: invoice.due_date,
        paymentDate: lastPaymentDate,
        daysOverdue,
        originalAmount: invoice.total_amount,
        lateFeeAmount,
        totalAmount: invoice.total_amount + lateFeeAmount,
        ruleId: applicableRule.id || '',
        ruleName: applicableRule.name,
        calculatedAt: new Date().toISOString()
      };

      logger.info('Late fee calculated for invoice', {
        invoiceId,
        invoiceNumber: invoice.invoice_number,
        daysOverdue,
        lateFeeAmount
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate late fee for invoice', { invoiceId, error });
      return null;
    }
  }

  /**
   * حساب رسوم التأخير لعقد
   */
  async calculateForContract(
    contractId: string,
    paymentDate: string = new Date().toISOString()
  ): Promise<LateFeeCalculation | null> {
    try {
      // 1. جلب العقد
      const { data: contract } = await supabase
        .from('contracts')
        .select(`
          *,
          customers!contracts_customer_id_fkey (
            id,
            company_id
          )
        `)
        .eq('id', contractId)
        .single();

      if (!contract) {
        logger.warn('Contract not found for late fee calculation', { contractId });
        return null;
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('contract_id', contractId)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(1);

      const lastPaymentDate = payments && payments.length > 0
        ? payments[0].payment_date
        : paymentDate;

      // 2. حساب الأيام المتأخرة (من بداية الشهر)
      // نفترض أن كل دفعة شهري ينتظر نهاية الشهر
      const contractStart = new Date(contract.start_date);
      const paymentD = new Date(lastPaymentDate);
      
      // حساب نهاية الشهر للدفعة الأخيرة
      const lastPaymentMonth = new Date(paymentD);
      lastPaymentMonth.setMonth(lastPaymentMonth.getMonth() + 1);
      lastPaymentMonth.setDate(0); // أول يوم من الشهر التالي
      
      const daysOverdue = Math.max(0, Math.floor(
        (lastPaymentMonth.getTime() - paymentD.getTime()) / (1000 * 60 * 60 * 24)
      ));

      // 3. الحصول على القواعد
      const rules = await this.getRulesForCompany(contract.customers.company_id);

      // 4. البحث عن قاعدة مناسبة
      const applicableRule = this.findApplicableRule(
        rules,
        daysOverdue,
        'contract',
        contract.monthly_amount
      );

      if (!applicableRule) {
        logger.debug('No applicable late fee rule found', {
          contractId,
          companyId: contract.customers.company_id,
          daysOverdue
        });
        return null;
      }

      // 5. حساب الرسم
      const lateFeeAmount = this.calculateFeeAmount(
        applicableRule,
        daysOverdue,
        contract.monthly_amount
      );

      const calculation: LateFeeCalculation = {
        targetId: contractId,
        targetType: 'contract',
        targetNumber: contract.contract_number,
        customerId: contract.customer_id,
        companyId: contract.customers.company_id,
        dueDate: lastPaymentDate,
        paymentDate: lastPaymentDate,
        daysOverdue,
        originalAmount: contract.monthly_amount,
        lateFeeAmount,
        totalAmount: contract.monthly_amount + lateFeeAmount,
        ruleId: applicableRule.id || '',
        ruleName: applicableRule.name,
        calculatedAt: new Date().toISOString()
      };

      logger.info('Late fee calculated for contract', {
        contractId,
        contractNumber: contract.contract_number,
        daysOverdue,
        lateFeeAmount
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate late fee for contract', { contractId, error });
      return null;
    }
  }

  /**
   * حساب رسوم التأخير لدفعة متأخرة
   */
  async calculateForPayment(
    paymentId: string
  ): Promise<LateFeeCalculation | null> {
    try {
      // 1. جلب الدفعة
      const { data: payment } = await supabase
        .from('payments')
        .select(`
          *,
          customers!payments_customer_id_fkey (
            id,
            company_id
          ),
          contracts!payments_contract_id_fkey (
            contract_number,
            monthly_amount
          ),
          invoices!payments_invoice_id_fkey (
            invoice_number,
            total_amount
          )
        `)
        .eq('id', paymentId)
        .single();

      if (!payment) {
        logger.warn('Payment not found for late fee calculation', { paymentId });
        return null;
      }

      // 2. حساب الأيام المتأخرة
      // من تاريخ الدفع المتوقع إلى تاريخ الدفع الفعلي
      const expectedDate = new Date(payment.payment_date);
      const actualDate = new Date(payment.created_at);
      const daysOverdue = Math.max(0, Math.floor(
        (actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
      ));

      if (daysOverdue === 0) {
        return null; // لا يوجد تأخير
      }

      // 3. تحديد المبلغ الأصلي
      const originalAmount = payment.amount;

      // 4. الحصول على القواعد
      const rules = await this.getRulesForCompany(payment.customers.company_id);

      // 5. البحث عن قاعدة مناسبة
      const applicableRule = this.findApplicableRule(
        rules,
        daysOverdue,
        'payment',
        originalAmount
      );

      if (!applicableRule) {
        logger.debug('No applicable late fee rule found', {
          paymentId,
          companyId: payment.customers.company_id,
          daysOverdue
        });
        return null;
      }

      // 6. حساب الرسم
      const lateFeeAmount = this.calculateFeeAmount(
        applicableRule,
        daysOverdue,
        originalAmount
      );

      const calculation: LateFeeCalculation = {
        targetId: paymentId,
        targetType: 'payment',
        targetNumber: payment.payment_number,
        customerId: payment.customer_id,
        companyId: payment.customers.company_id,
        dueDate: payment.payment_date,
        paymentDate: payment.created_at,
        daysOverdue,
        originalAmount,
        lateFeeAmount,
        totalAmount: originalAmount + lateFeeAmount,
        ruleId: applicableRule.id || '',
        ruleName: applicableRule.name,
        calculatedAt: new Date().toISOString()
      };

      logger.info('Late fee calculated for payment', {
        paymentId,
        paymentNumber: payment.payment_number,
        daysOverdue,
        lateFeeAmount
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate late fee for payment', { paymentId, error });
      return null;
    }
  }

  /**
   * حساب رسوم التأخير لجميع الفواتير المتأخرة
   */
  async calculateForAllOverdueInvoices(
    companyId: string,
    options: {
      asOfDate?: string;
      includePartiallyPaid?: boolean;
    } = {}
  ): Promise<LateFeeCalculation[]> {
    try {
      const asOfDate = options.asOfDate || new Date().toISOString();

      // جلب جميع الفواتير المتأخرة
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customers!invoices_customer_id_fkey (
            company_id
          )
        `)
        .eq('customers.company_id', companyId)
        .lt('due_date', asOfDate);

      // تضمين أو استبعاد الفواتير المدفوعة جزئياً
      if (options.includePartiallyPaid) {
        query = query.in('payment_status', ['unpaid', 'partial', 'overdue']);
      } else {
        query = query.eq('payment_status', 'unpaid');
      }

      const { data: invoices } = await query;

      if (!invoices || invoices.length === 0) {
        logger.debug('No overdue invoices found', { companyId });
        return [];
      }

      const calculations: LateFeeCalculation[] = [];

      for (const invoice of invoices) {
        const calc = await this.calculateForInvoice(invoice.id, asOfDate);
        if (calc) {
          calculations.push(calc);
        }
      }

      logger.info('Late fees calculated for overdue invoices', {
        companyId,
        invoicesCount: invoices.length,
        calculatedCount: calculations.length
      });

      return calculations;
    } catch (error) {
      logger.error('Failed to calculate late fees for overdue invoices', { companyId, error });
      return [];
    }
  }

  /**
   * حساب رسوم التأخير لجميع العقود المتأخرة الدفع
   */
  async calculateForAllOverdueContracts(
    companyId: string,
    options: {
      asOfDate?: string;
    } = {}
  ): Promise<LateFeeCalculation[]> {
    try {
      const asOfDate = options.asOfDate || new Date().toISOString();

      // جلب العقود مع آخر دفعة لكل عقد
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          c.*,
          (
            SELECT MAX(p.payment_date) as last_payment_date
            FROM payments p
            WHERE p.contract_id = c.id
              AND p.payment_status = 'completed'
          ) as last_payment,
          customers!contracts_customer_id_fkey (
            company_id
          )
        `)
        .eq('customers.company_id', companyId)
        .in('c.status', ['active', 'under_review'])
        .not('c.last_payment_date', null);

      if (!contracts || contracts.length === 0) {
        logger.debug('No contracts with payments found', { companyId });
        return [];
      }

      const calculations: LateFeeCalculation[] = [];

      for (const contract of contracts) {
        const calc = await this.calculateForContract(contract.id, contract.last_payment_date);
        if (calc) {
          calculations.push(calc);
        }
      }

      logger.info('Late fees calculated for overdue contracts', {
        companyId,
        contractsCount: contracts.length,
        calculatedCount: calculations.length
      });

      return calculations;
    } catch (error) {
      logger.error('Failed to calculate late fees for overdue contracts', { companyId, error });
      return [];
    }
  }

  /**
   * الحصول على قواعد الشركة
   */
  private async getRulesForCompany(
    companyId: string
  ): Promise<LateFeeRule[]> {
    // التحقق من الـ cache
    const cachedRules = this.rulesCache.get(companyId);
    const cacheExpiry = this.cacheExpiry.get(companyId);

    if (cachedRules && cacheExpiry && Date.now() < cacheExpiry) {
      return cachedRules;
    }

    // جلب القواعد من قاعدة البيانات
    const { data: rules } = await supabase
      .from('late_fee_rules')
      .select('*')
      .eq('company_id', companyId)
      .eq('enabled', true)
      .order('created_at', { ascending: false });

    // تحديث الـ cache
    const rulesList = rules || [];
    this.rulesCache.set(companyId, rulesList);
    this.cacheExpiry.set(companyId, Date.now() + this.CACHE_DURATION_MS);

    return rulesList;
  }

  /**
   * البحث عن قاعدة مناسبة
   */
  private findApplicableRule(
    rules: LateFeeRule[],
    daysOverdue: number,
    targetType: 'invoice' | 'contract' | 'payment',
    amount: number
  ): LateFeeRule | null {
    // تصفية القواعد حسب النوع المستهدف
    const applicableRules = rules.filter(rule => {
      if (targetType === 'invoice' && !rule.isAppliesToInvoices) return false;
      if (targetType === 'contract' && !rule.isAppliesToContracts) return false;
      if (targetType === 'payment' && !rule.isAppliesToPayments) return false;
      return true;
    });

    // التحقق من حد الأدنى
    for (const rule of applicableRules) {
      if (daysOverdue >= rule.minimumOverdueDays) {
        return rule;
      }
    }

    return null;
  }

  /**
   * حساب مبلغ الرسم
   */
  private calculateFeeAmount(
    rule: LateFeeRule,
    daysOverdue: number,
    amount: number
  ): number {
    const structure = rule.feeStructure;
    let feeAmount = 0;

    if (rule.ruleType === 'percentage') {
      // حساب نسبة لكل يوم
      const dailyRate = structure.dailyRate || 0;
      const percentage = (dailyRate / 100) * daysOverdue;
      feeAmount = amount * (percentage / 100);

      // تطبيق الحد الأقصى
      if (structure.maxPercentage) {
        const maxAmount = amount * (structure.maxPercentage / 100);
        feeAmount = Math.min(feeAmount, maxAmount);
      }
    } else if (rule.ruleType === 'fixed') {
      // مبلغ ثابت لكل يوم
      const dailyAmount = structure.dailyAmount || 0;
      feeAmount = dailyAmount * daysOverdue;

      // تطبيق الحد الأقصى
      if (structure.maxAmount) {
        feeAmount = Math.min(feeAmount, structure.maxAmount);
      }
    } else if (rule.ruleType === 'tiered') {
      // رسوم متدرجة
      const tiers = structure.tiers || [];
      
      for (const tier of tiers) {
        const [minDays, maxDays] = tier.daysRange;
        
        if (daysOverdue >= minDays && daysOverdue < maxDays) {
          feeAmount = amount * (tier.dailyRate / 100);
          
          if (tier.maxAmount) {
            feeAmount = Math.min(feeAmount, tier.maxAmount);
          }
          break;
        }
      }
    }

    return Math.max(0, feeAmount);
  }

  /**
   * إنشاء ملخص الرسوم
   */
  async createFeeSummary(
    companyId: string,
    options: {
      startDate?: string;
      endDate?: string;
      targetTypes?: Array<'invoice' | 'contract' | 'payment'>;
    } = {}
  ): Promise<LateFeeSummary> {
    try {
      const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = options.endDate || new Date().toISOString();

      const calculations: LateFeeCalculation[] = [];

      // حساب للفواتير
      if (!options.targetTypes || options.targetTypes.includes('invoice')) {
        const invoiceFees = await this.calculateForAllOverdueInvoices(companyId, {
          asOfDate: endDate
        });
        calculations.push(...invoiceFees);
      }

      // حساب للعقود
      if (!options.targetTypes || options.targetTypes.includes('contract')) {
        const contractFees = await this.calculateForAllOverdueContracts(companyId, {
          asOfDate: endDate
        });
        calculations.push(...contractFees);
      }

      // حساب للمدفوعات
      if (!options.targetTypes || options.targetTypes.includes('payment')) {
        // TODO: تنفيذ حساب رسوم للمدفوعات المتأخرة
        // حالياً لا توجد حاجة واضحة
      }

      // حساب الإحصائيات
      const totalFees = calculations.reduce((sum, calc) => sum + calc.lateFeeAmount, 0);
      const averageFee = calculations.length > 0 ? totalFees / calculations.length : 0;

      const summary: LateFeeSummary = {
        companyId,
        totalFees,
        feeCount: calculations.length,
        averageFee,
        calculations,
        period: {
          startDate,
          endDate
        }
      };

      logger.info('Late fee summary created', {
        companyId,
        totalFees,
        feeCount: calculations.length
      });

      return summary;
    } catch (error) {
      logger.error('Failed to create late fee summary', { companyId, error });
      throw error;
    }
  }

  /**
   * مسح الـ cache
   */
  clearCache(companyId?: string): void {
    if (companyId) {
      this.rulesCache.delete(companyId);
      this.cacheExpiry.delete(companyId);
    } else {
      this.rulesCache.clear();
      this.cacheExpiry.clear();
    }
    
    logger.debug('Late fee rules cache cleared', { companyId });
  }

  /**
   * إنشاء قاعدة افتراضية لشركة جديدة
   */
  static createDefaultRule(companyId: string): LateFeeRule {
    return {
      id: undefined,
      companyId,
      name: 'قاعدة رسوم تأخير افتراضية',
      nameEn: 'Default Late Fee Rule',
      ruleType: 'percentage',
      feeStructure: {
        dailyRate: 1.5, // 1.5% لكل يوم
        maxPercentage: 20 // أقصى 20% من المبلغ الأصلي
      },
      gracePeriodDays: 7, // فترة سماح 7 أيام
      minimumOverdueDays: 8, // رسوم تبدأ من اليوم الثامن
      isAppliesToInvoices: true,
      isAppliesToContracts: false,
      isAppliesToPayments: false,
      enabled: true
    };
  }
}

// Export singleton instance
export const lateFeeCalculator = new LateFeeCalculator();
