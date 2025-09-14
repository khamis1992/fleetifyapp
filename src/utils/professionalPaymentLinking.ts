/**
 * نظام ربط المدفوعات الاحترافي - Professional Payment Linking System
 * نظام شامل لربط المدفوعات بالعقود والفواتير مع دقة محاسبية عالية
 */

import { supabase } from '@/integrations/supabase/client';
import { Constants } from '@/integrations/supabase/types';

// ===============================
// الأنواع والواجهات الأساسية
// ===============================

export interface PaymentData {
  id?: string;
  company_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_type: 'receipt' | 'payment';
  payment_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  reference_number?: string;
  notes?: string;
  customer_id?: string;
  vendor_id?: string;
  contract_id?: string;
  invoice_id?: string;
  agreement_number?: string;
  currency?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContractData {
  id: string;
  company_id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id?: string;
  start_date: string;
  end_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  contract_status: 'draft' | 'active' | 'expired' | 'cancelled';
  payment_schedule?: PaymentSchedule[];
  created_at: string;
  updated_at: string;
}

export interface PaymentSchedule {
  id: string;
  contract_id: string;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  payment_id?: string;
}

export interface InvoiceData {
  id: string;
  company_id: string;
  invoice_number: string;
  customer_id: string;
  contract_id?: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  invoice_status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CustomerData {
  id: string;
  company_id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  customer_type: 'individual' | 'corporate';
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

// ===============================
// محرك الربط الذكي للعقود
// ===============================

export interface ContractMatch {
  contract: ContractData;
  confidence: number;
  matchMethod: 'exact_contract_number' | 'agreement_number' | 'customer_match' | 'amount_match' | 'fuzzy_match';
  matchingFactors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ContractMatchingEngine {
  findBestMatches: (payment: PaymentData) => Promise<ContractMatch[]>;
  validateMatch: (payment: PaymentData, contract: ContractData) => Promise<ContractMatch>;
  suggestLinking: (payment: PaymentData) => Promise<LinkingSuggestion>;
}

export interface LinkingSuggestion {
  primaryMatch: ContractMatch | null;
  alternativeMatches: ContractMatch[];
  confidence: number;
  recommendation: 'auto_link' | 'manual_review' | 'create_new_contract';
  reasons: string[];
}

/**
 * محرك الربط الذكي للعقود
 */
export class SmartContractMatchingEngine implements ContractMatchingEngine {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  /**
   * البحث عن أفضل تطابقات للعقود
   */
  async findBestMatches(payment: PaymentData): Promise<ContractMatch[]> {
    const matches: ContractMatch[] = [];

    try {
      console.log('🔍 بدء البحث عن العقود للمدفوعة:', payment.payment_number);

      // 1. البحث بالتطابق التام لرقم العقد
      if (payment.contract_id) {
        const exactMatch = await this.findExactContractMatch(payment.contract_id);
        if (exactMatch) {
          matches.push(exactMatch);
        }
      }

      // 2. البحث برقم الاتفاقية
      if (payment.agreement_number) {
        const agreementMatches = await this.findByAgreementNumber(payment.agreement_number);
        matches.push(...agreementMatches);
      }

      // 3. البحث بالعميل والمبلغ
      if (payment.customer_id) {
        const customerMatches = await this.findByCustomerAndAmount(payment.customer_id, payment.amount);
        matches.push(...customerMatches);
      }

      // 4. البحث الضبابي (Fuzzy Search)
      const fuzzyMatches = await this.findFuzzyMatches(payment);
      matches.push(...fuzzyMatches);

      // ترتيب النتائج حسب الثقة
      const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);
      
      console.log(`✅ تم العثور على ${sortedMatches.length} تطابق للمدفوعة ${payment.payment_number}`);
      
      return sortedMatches;

    } catch (error) {
      console.error('❌ خطأ في البحث عن العقود:', error);
      return [];
    }
  }

  /**
   * البحث بالتطابق التام لرقم العقد
   */
  private async findExactContractMatch(contractId: string): Promise<ContractMatch | null> {
    try {
      const { data: contract, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('id', contractId)
        .eq('company_id', this.companyId)
        .single();

      if (error || !contract) {
        console.log('⚠️ العقد غير موجود:', contractId);
        return null;
      }

      return {
        contract,
        confidence: 1.0,
        matchMethod: 'exact_contract_number',
        matchingFactors: ['تطابق تام لرقم العقد'],
        warnings: [],
        recommendations: ['ربط مباشر - ثقة 100%']
      };
    } catch (error) {
      console.error('❌ خطأ في البحث التام:', error);
      return null;
    }
  }

  /**
   * البحث برقم الاتفاقية
   */
  private async findByAgreementNumber(agreementNumber: string): Promise<ContractMatch[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', this.companyId)
        .ilike('contract_number', `%${agreementNumber}%`);

      if (error || !contracts) return [];

      return contracts.map(contract => ({
        contract,
        confidence: this.calculateAgreementMatchConfidence(agreementNumber, contract.contract_number),
        matchMethod: 'agreement_number',
        matchingFactors: [`رقم الاتفاقية: ${agreementNumber}`, `رقم العقد: ${contract.contract_number}`],
        warnings: this.generateAgreementWarnings(agreementNumber, contract.contract_number),
        recommendations: ['تحقق من تطابق رقم الاتفاقية']
      }));
    } catch (error) {
      console.error('❌ خطأ في البحث برقم الاتفاقية:', error);
      return [];
    }
  }

  /**
   * البحث بالعميل والمبلغ
   */
  private async findByCustomerAndAmount(customerId: string, amount: number): Promise<ContractMatch[]> {
    try {
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            company_name,
            customer_type
          )
        `)
        .eq('company_id', this.companyId)
        .eq('customer_id', customerId)
        .gte('balance_due', amount * 0.9) // المبلغ ضمن 90% من المبلغ المستحق
        .order('balance_due', { ascending: true });

      if (error || !contracts) return [];

      return contracts.map(contract => ({
        contract,
        confidence: this.calculateCustomerAmountConfidence(amount, contract.balance_due),
        matchMethod: 'customer_match',
        matchingFactors: [
          `العميل: ${contract.customers?.company_name || contract.customers?.first_name}`,
          `المبلغ: ${amount}`,
          `المبلغ المستحق: ${contract.balance_due}`
        ],
        warnings: this.generateCustomerAmountWarnings(amount, contract.balance_due),
        recommendations: ['تحقق من تطابق المبلغ مع العقد']
      }));
    } catch (error) {
      console.error('❌ خطأ في البحث بالعميل والمبلغ:', error);
      return [];
    }
  }

  /**
   * البحث الضبابي
   */
  private async findFuzzyMatches(payment: PaymentData): Promise<ContractMatch[]> {
    try {
      // البحث في ملاحظات المدفوعة عن أرقام عقود محتملة
      const potentialContractNumbers = this.extractPotentialContractNumbers(payment);
      
      if (potentialContractNumbers.length === 0) return [];

      const matches: ContractMatch[] = [];

      for (const contractNumber of potentialContractNumbers) {
        const { data: contracts, error } = await supabase
          .from('contracts')
          .select(`
            *,
            customers (
              first_name,
              last_name,
              company_name,
              customer_type
            )
          `)
          .eq('company_id', this.companyId)
          .ilike('contract_number', `%${contractNumber}%`);

        if (!error && contracts) {
          contracts.forEach(contract => {
            matches.push({
              contract,
              confidence: 0.6, // ثقة متوسطة للبحث الضبابي
              matchMethod: 'fuzzy_match',
              matchingFactors: [
                `رقم محتمل في الملاحظات: ${contractNumber}`,
                `رقم العقد: ${contract.contract_number}`
              ],
              warnings: ['بحث ضبابي - يتطلب مراجعة يدوية'],
              recommendations: ['تحقق من صحة الربط']
            });
          });
        }
      }

      return matches;
    } catch (error) {
      console.error('❌ خطأ في البحث الضبابي:', error);
      return [];
    }
  }

  /**
   * التحقق من صحة الربط
   */
  async validateMatch(payment: PaymentData, contract: ContractData): Promise<ContractMatch> {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let confidence = 0.8; // البداية بثقة عالية

    // التحقق من المبلغ
    if (payment.amount > contract.balance_due) {
      confidence -= 0.3;
      warnings.push(`المبلغ (${payment.amount}) أكبر من المبلغ المستحق (${contract.balance_due})`);
      recommendations.push('تحقق من صحة المبلغ أو قم بإنشاء عقد جديد');
    }

    // التحقق من العميل
    if (payment.customer_id && payment.customer_id !== contract.customer_id) {
      confidence -= 0.2;
      warnings.push('عدم تطابق العميل');
      recommendations.push('تحقق من صحة العميل');
    }

    // التحقق من تاريخ العقد
    const contractEndDate = new Date(contract.end_date || contract.start_date);
    const paymentDate = new Date(payment.payment_date);
    
    if (paymentDate > contractEndDate) {
      confidence -= 0.1;
      warnings.push('تاريخ الدفع بعد انتهاء العقد');
      recommendations.push('تحقق من حالة العقد');
    }

    return {
      contract,
      confidence: Math.max(0, confidence),
      matchMethod: 'exact_contract_number',
      matchingFactors: ['التحقق اليدوي'],
      warnings,
      recommendations
    };
  }

  /**
   * اقتراح الربط
   */
  async suggestLinking(payment: PaymentData): Promise<LinkingSuggestion> {
    const matches = await this.findBestMatches(payment);
    
    if (matches.length === 0) {
      return {
        primaryMatch: null,
        alternativeMatches: [],
        confidence: 0,
        recommendation: 'create_new_contract',
        reasons: ['لم يتم العثور على عقد مطابق']
      };
    }

    const primaryMatch = matches[0];
    const alternativeMatches = matches.slice(1);

    let recommendation: 'auto_link' | 'manual_review' | 'create_new_contract';
    let reasons: string[] = [];

    if (primaryMatch.confidence >= 0.9) {
      recommendation = 'auto_link';
      reasons = ['ثقة عالية في الربط - يمكن الربط التلقائي'];
    } else if (primaryMatch.confidence >= 0.6) {
      recommendation = 'manual_review';
      reasons = ['ثقة متوسطة - يتطلب مراجعة يدوية'];
    } else {
      recommendation = 'create_new_contract';
      reasons = ['ثقة منخفضة - يُفضل إنشاء عقد جديد'];
    }

    return {
      primaryMatch,
      alternativeMatches,
      confidence: primaryMatch.confidence,
      recommendation,
      reasons
    };
  }

  // ===============================
  // الدوال المساعدة
  // ===============================

  private calculateAgreementMatchConfidence(agreementNumber: string, contractNumber: string): number {
    if (contractNumber === agreementNumber) return 0.95;
    if (contractNumber.includes(agreementNumber)) return 0.8;
    if (agreementNumber.includes(contractNumber)) return 0.7;
    return 0.5;
  }

  private calculateCustomerAmountConfidence(amount: number, balanceDue: number): number {
    const ratio = amount / balanceDue;
    if (ratio >= 0.95 && ratio <= 1.05) return 0.9; // تطابق دقيق
    if (ratio >= 0.8 && ratio <= 1.2) return 0.7;   // تطابق جيد
    if (ratio >= 0.5 && ratio <= 1.5) return 0.5;   // تطابق مقبول
    return 0.3; // تطابق ضعيف
  }

  private generateAgreementWarnings(agreementNumber: string, contractNumber: string): string[] {
    const warnings: string[] = [];
    if (contractNumber !== agreementNumber) {
      warnings.push(`رقم الاتفاقية (${agreementNumber}) لا يتطابق تماماً مع رقم العقد (${contractNumber})`);
    }
    return warnings;
  }

  private generateCustomerAmountWarnings(amount: number, balanceDue: number): string[] {
    const warnings: string[] = [];
    if (amount > balanceDue) {
      warnings.push(`المبلغ (${amount}) أكبر من المبلغ المستحق (${balanceDue})`);
    }
    return warnings;
  }

  private extractPotentialContractNumbers(payment: PaymentData): string[] {
    const potentialNumbers: string[] = [];
    
    // البحث في رقم المرجع
    if (payment.reference_number) {
      const refNumbers = payment.reference_number.match(/\d+/g);
      if (refNumbers) {
        potentialNumbers.push(...refNumbers.filter(n => n.length >= 3));
      }
    }

    // البحث في الملاحظات
    if (payment.notes) {
      const noteNumbers = payment.notes.match(/\d+/g);
      if (noteNumbers) {
        potentialNumbers.push(...noteNumbers.filter(n => n.length >= 3));
      }
    }

    return [...new Set(potentialNumbers)]; // إزالة التكرار
  }
}

// ===============================
// نظام إنشاء الفواتير التلقائي
// ===============================

export interface AutoInvoiceConfig {
  enabled: boolean;
  template: InvoiceTemplate;
  numberingSystem: InvoiceNumberingSystem;
  triggerConditions: InvoiceTrigger[];
}

export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  defaultTerms: string;
  defaultDueDays: number;
  autoGenerate: boolean;
  requiredFields: string[];
}

export interface InvoiceNumberingSystem {
  prefix: string;
  format: string; // مثل: INV-YYYY-NNNN
  nextNumber: number;
  resetYearly: boolean;
}

export interface InvoiceTrigger {
  id: string;
  name: string;
  condition: InvoiceTriggerCondition;
  enabled: boolean;
}

export interface InvoiceTriggerCondition {
  type: 'payment_amount' | 'payment_method' | 'customer_type' | 'contract_status';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
}

/**
 * نظام إنشاء الفواتير التلقائي
 */
export class AutoInvoiceSystem {
  private companyId: string;
  private config: AutoInvoiceConfig;

  constructor(companyId: string, config: AutoInvoiceConfig) {
    this.companyId = companyId;
    this.config = config;
  }

  /**
   * إنشاء فاتورة تلقائية للمدفوعة
   */
  async createInvoiceForPayment(payment: PaymentData, contract?: ContractData): Promise<InvoiceData | null> {
    if (!this.config.enabled) return null;

    // التحقق من شروط الإنشاء التلقائي
    if (!this.shouldCreateInvoice(payment)) return null;

    try {
      console.log('📄 إنشاء فاتورة تلقائية للمدفوعة:', payment.payment_number);

      // إنشاء رقم الفاتورة
      const invoiceNumber = await this.generateInvoiceNumber();

      // إنشاء الفاتورة
      const invoiceData = {
        company_id: this.companyId,
        invoice_number: invoiceNumber,
        customer_id: payment.customer_id || contract?.customer_id,
        contract_id: payment.contract_id || contract?.id,
        invoice_date: payment.payment_date,
        due_date: this.calculateDueDate(payment.payment_date),
        total_amount: payment.amount,
        paid_amount: 0, // سيتم تحديثها عند ربط المدفوعة
        balance_due: payment.amount,
        invoice_status: 'draft' as const,
        created_by: payment.created_by
      };

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();

      if (error) {
        console.error('❌ خطأ في إنشاء الفاتورة:', error);
        return null;
      }

      console.log('✅ تم إنشاء الفاتورة التلقائية:', invoice.invoice_number);
      return invoice;

    } catch (error) {
      console.error('❌ خطأ في إنشاء الفاتورة التلقائية:', error);
      return null;
    }
  }

  /**
   * ربط المدفوعة بالفاتورة
   */
  async linkPaymentToInvoice(payment: PaymentData, invoice: InvoiceData): Promise<boolean> {
    try {
      console.log('🔗 ربط المدفوعة بالفاتورة:', payment.payment_number, '->', invoice.invoice_number);

      // تحديث المدفوعة
      const { error: paymentError } = await supabase
        .from('payments')
        .update({ 
          invoice_id: invoice.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (paymentError) {
        console.error('❌ خطأ في تحديث المدفوعة:', paymentError);
        return false;
      }

      // تحديث الفاتورة
      const newPaidAmount = (invoice.paid_amount || 0) + payment.amount;
      const newBalanceDue = invoice.total_amount - newPaidAmount;
      const newStatus = newBalanceDue <= 0 ? 'paid' : 'sent';

      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          balance_due: newBalanceDue,
          invoice_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (invoiceError) {
        console.error('❌ خطأ في تحديث الفاتورة:', invoiceError);
        return false;
      }

      console.log('✅ تم ربط المدفوعة بالفاتورة بنجاح');
      return true;

    } catch (error) {
      console.error('❌ خطأ في ربط المدفوعة بالفاتورة:', error);
      return false;
    }
  }

  private shouldCreateInvoice(payment: PaymentData): boolean {
    return this.config.triggerConditions.some(trigger => {
      if (!trigger.enabled) return false;
      return this.evaluateTriggerCondition(trigger.condition, payment);
    });
  }

  private evaluateTriggerCondition(condition: InvoiceTriggerCondition, payment: PaymentData): boolean {
    switch (condition.type) {
      case 'payment_amount':
        return this.compareValues(payment.amount, condition.operator, condition.value);
      case 'payment_method':
        return this.compareValues(payment.payment_method, condition.operator, condition.value);
      case 'customer_type':
        // يحتاج جلب نوع العميل
        return true; // مؤقت
      case 'contract_status':
        // يحتاج جلب حالة العقد
        return true; // مؤقت
      default:
        return false;
    }
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      case 'contains':
        return String(actual).includes(String(expected));
      default:
        return false;
    }
  }

  private async generateInvoiceNumber(): Promise<string> {
    const { format, prefix, nextNumber } = this.config.numberingSystem;
    const year = new Date().getFullYear();
    
    // تحديث الرقم التالي
    this.config.numberingSystem.nextNumber = nextNumber + 1;
    
    // تنسيق الرقم
    return format
      .replace('YYYY', year.toString())
      .replace('NNNN', nextNumber.toString().padStart(4, '0'))
      .replace('PREFIX', prefix);
  }

  private calculateDueDate(paymentDate: string): string {
    const dueDays = this.config.template.defaultDueDays;
    const date = new Date(paymentDate);
    date.setDate(date.getDate() + dueDays);
    return date.toISOString().split('T')[0];
  }
}

// ===============================
// تصدير الدوال الرئيسية
// ===============================

export const createSmartContractMatchingEngine = (companyId: string): SmartContractMatchingEngine => {
  return new SmartContractMatchingEngine(companyId);
};

export const createAutoInvoiceSystem = (companyId: string, config: AutoInvoiceConfig): AutoInvoiceSystem => {
  return new AutoInvoiceSystem(companyId, config);
};
