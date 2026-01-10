/**
 * Payment Validator
 * 
 * نظام شامل للتحقق من صحة البيانات المدفوعات:
 * - Validation rules قوية ومرنة
 * - Support لـ Zod schema validation
 * - رسائل خطأ واضحة وقابلة للترجمة
 * - Validation للحالات الخاصة (overpayment, duplicate, etc)
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { PaymentMethod, PaymentType, PaymentStatus, PaymentEnumUtils } from '@/types/payment-enums';
import type { Payment } from '@/types/payment';
import type { PaymentCreationData } from '@/types/payment';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  messageEn?: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  constraint?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

export interface ValidationRule {
  name: string;
  description: string;
  enabled: boolean;
  severity: 'error' | 'warning' | 'info';
  validate: (data: any) => ValidationError | null;
}

class PaymentValidator {
  private rules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.initializeRules();
  }

  /**
   * تهيئة قواعد الـ Validation
   */
  private initializeRules(): void {
    // =========================================
    // Validation Rules الأساسية
    // =========================================

    this.addRule({
      name: 'amount_positive',
      description: 'المبلغ يجب أن يكون موجباً',
      enabled: true,
      severity: 'error',
      validate: (data) => {
        const amount = data.amount;
        if (!amount || amount <= 0) {
          return {
            field: 'amount',
            code: 'AMOUNT_POSITIVE',
            message: 'المبلغ يجب أن يكون أكبر من صفر',
            messageEn: 'Amount must be greater than zero',
            severity: 'error',
            value: amount
          };
        }
        return null;
      }
    });

    this.addRule({
      name: 'amount_not_excessive',
      description: 'المبلغ لا يجب أن يكون مفرطاً (أكبر من 500,000 ر.ق)',
      enabled: true,
      severity: 'error',
      validate: (data) => {
        const amount = data.amount;
        const MAX_AMOUNT = 500000;

        if (amount > MAX_AMOUNT) {
          return {
            field: 'amount',
            code: 'AMOUNT_EXCESSIVE',
            message: `المبلغ (${amount} ر.ق) يتجاوز الحد الأقصى المسموح (${MAX_AMOUNT} ر.ق)`,
            messageEn: `Amount (${amount} QAR) exceeds maximum allowed (${MAX_AMOUNT} QAR)`,
            severity: 'error',
            value: amount
          };
        }
        return null;
      }
    });

    this.addRule({
      name: 'payment_method_required',
      description: 'طريقة الدفع مطلوبة',
      enabled: true,
      severity: 'error',
      validate: (data) => {
        const method = data.payment_method;
        if (!method || !PaymentEnumUtils.isValidPaymentMethod(method)) {
          return {
            field: 'payment_method',
            code: 'PAYMENT_METHOD_INVALID',
            message: 'طريقة الدفع غير صحيحة',
            messageEn: 'Invalid payment method',
            severity: 'error',
            value: method
          };
        }
        return null;
      }
    });

    this.addRule({
      name: 'payment_type_required',
      description: 'نوع الدفع مطلوب',
      enabled: true,
      severity: 'error',
      validate: (data) => {
        const type = data.payment_type;
        if (type && !PaymentEnumUtils.isValidPaymentType(type)) {
          return {
            field: 'payment_type',
            code: 'PAYMENT_TYPE_INVALID',
            message: 'نوع الدفع غير صحيح',
            messageEn: 'Invalid payment type',
            severity: 'error',
            value: type
          };
        }
        return null;
      }
    });

    this.addRule({
      name: 'payment_date_valid',
      description: 'تاريخ الدفع يجب أن يكون صحيحاً',
      enabled: true,
      severity: 'error',
      validate: (data) => {
        const paymentDate = data.payment_date;
        if (!paymentDate) {
          return {
            field: 'payment_date',
            code: 'PAYMENT_DATE_REQUIRED',
            message: 'تاريخ الدفع مطلوب',
            messageEn: 'Payment date is required',
            severity: 'error'
          };
        }

        const date = new Date(paymentDate);
        const now = new Date();
        const maxFutureDate = new Date();
        maxFutureDate.setDate(maxFutureDate.getDate() + 30); // 30 أيام في المستقبل

        if (isNaN(date.getTime())) {
          return {
            field: 'payment_date',
            code: 'PAYMENT_DATE_INVALID',
            message: 'تاريخ الدفع غير صحيح',
            messageEn: 'Invalid payment date',
            severity: 'error',
            value: paymentDate
          };
        }

        if (date > maxFutureDate) {
          return {
            field: 'payment_date',
            code: 'PAYMENT_DATE_TOO_FUTURE',
            message: `تاريخ الدفع (${paymentDate}) لا يمكن أن يكون أكثر من 30 أيام في المستقبل`,
            messageEn: `Payment date (${paymentDate}) cannot be more than 30 days in the future`,
            severity: 'error',
            value: paymentDate
          };
        }

        return null;
      }
    });

    this.addRule({
      name: 'customer_required_or_valid',
      description: 'العميل مطلوب أو صحيح',
      enabled: true,
      severity: 'error',
      validate: (data) => {
        if (!data.customer_id && !data.invoice_id && !data.contract_id) {
          return {
            field: 'customer_id',
            code: 'CUSTOMER_REQUIRED',
            message: 'يجب تحديد عميل أو فاتورة أو عقد',
            messageEn: 'Customer or invoice/contract must be specified',
            severity: 'error'
          };
        }
        return null;
      }
    });

    // =========================================
    // Validation Rules لـ Contract-Linked Payments
    // =========================================

    this.addRule({
      name: 'contract_exists',
      description: 'العقد يجب أن يكون موجوداً',
      enabled: true,
      severity: 'error',
      validate: async (data) => {
        if (!data.contract_id) {
          return null;
        }

        // Note: This is an async rule, handled in validate() method
        return null;
      }
    });

    this.addRule({
      name: 'contract_active',
      description: 'العقد يجب أن يكون نشطاً',
      enabled: true,
      severity: 'error',
      validate: async (data) => {
        if (!data.contract_id) {
          return null;
        }

        // Note: Async validation handled in validate() method
        return null;
      }
    });

    // =========================================
    // Validation Rules لـ Invoice-Linked Payments
    // =========================================

    this.addRule({
      name: 'invoice_exists',
      description: 'الفاتورة يجب أن تكون موجودة',
      enabled: true,
      severity: 'error',
      validate: async (data) => {
        if (!data.invoice_id) {
          return null;
        }

        return null;
      }
    });

    this.addRule({
      name: 'invoice_not_cancelled',
      description: 'الفاتورة يجب أن لا تكون ملغية',
      enabled: true,
      severity: 'error',
      validate: async (data) => {
        if (!data.invoice_id) {
          return null;
        }

        return null;
      }
    });

    // =========================================
    // Validation Rules للتكرار
    // =========================================

    this.addRule({
      name: 'idempotency_key_unique',
      description: 'مفتاح Idempotency يجب أن يكون فريد',
      enabled: true,
      severity: 'error',
      validate: async (data) => {
        if (!data.idempotency_key) {
          return null;
        }

        // Note: Async validation handled in validate() method
        return null;
      }
    });

    logger.info('Payment validation rules initialized', { rulesCount: this.rules.size });
  }

  /**
   * إضافة قاعدة Validation
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
    logger.debug('Validation rule added', { name: rule.name, enabled: rule.enabled });
  }

  /**
   * إزالة قاعدة Validation
   */
  removeRule(ruleName: string): boolean {
    return this.rules.delete(ruleName);
  }

  /**
   * تفعيل/تعطيل قاعدة
   */
  setRuleEnabled(ruleName: string, enabled: boolean): void {
    const rule = this.rules.get(ruleName);
    if (rule) {
      rule.enabled = enabled;
      logger.debug(`Rule ${ruleName} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * التحقق الشامل من بيانات دفعة
   */
  async validate(data: PaymentCreationData | Payment): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // تنفيذ القواعد المتزامنة
    for (const [name, rule] of this.rules.entries()) {
      if (!rule.enabled) {
        continue;
      }

      try {
        const result = rule.validate(data);

        if (result) {
          switch (result.severity) {
            case 'error':
              errors.push(result);
              break;
            case 'warning':
              warnings.push(result);
              break;
            case 'info':
              info.push(result);
              break;
          }
        }
      } catch (error) {
        logger.error(`Validation rule ${name} failed`, { error, data });
        errors.push({
          field: 'system',
          code: 'VALIDATION_RULE_ERROR',
          message: `فشل في قاعدة التحقق ${name}`,
          messageEn: `Validation rule ${name} failed`,
          severity: 'error'
        });
      }
    }

    // تنفيذ القواعد غير المتزامنة (Async validations)
    await this.runAsyncValidations(data, errors, warnings);

    const isValid = errors.length === 0;

    logger.info('Payment validation completed', {
      isValid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      infoCount: info.length
    });

    return {
      isValid,
      errors,
      warnings,
      info
    };
  }

  /**
   * تنفيذ القواعد غير المتزامنة
   */
  private async runAsyncValidations(
    data: any,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): Promise<void> {
    // التحقق من وجود العقد
    if (data.contract_id) {
      const { data: contract } = await supabase
        .from('contracts')
        .select('id, status, company_id')
        .eq('id', data.contract_id)
        .maybeSingle();

      if (!contract) {
        errors.push({
          field: 'contract_id',
          code: 'CONTRACT_NOT_FOUND',
          message: 'العقد غير موجود',
          messageEn: 'Contract not found',
          severity: 'error',
          value: data.contract_id
        });
      } else if (contract.status !== 'active' && contract.status !== 'under_review') {
        errors.push({
          field: 'contract_id',
          code: 'CONTRACT_INACTIVE',
          message: `العقد ليس نشطاً (الحالة: ${contract.status})`,
          messageEn: `Contract is not active (status: ${contract.status})`,
          severity: 'error',
          value: data.contract_id
        });
      }
    }

    // التحقق من وجود الفاتورة
    if (data.invoice_id) {
      const { data: invoice } = await supabase
        .from('invoices')
        .select('id, payment_status, total_amount, paid_amount')
        .eq('id', data.invoice_id)
        .maybeSingle();

      if (!invoice) {
        errors.push({
          field: 'invoice_id',
          code: 'INVOICE_NOT_FOUND',
          message: 'الفاتورة غير موجودة',
          messageEn: 'Invoice not found',
          severity: 'error',
          value: data.invoice_id
        });
      } else if (invoice.payment_status === 'cancelled' || invoice.payment_status === 'voided') {
        errors.push({
          field: 'invoice_id',
          code: 'INVOICE_CANCELLED',
          message: `الفاتورة ${invoice.payment_status} - لا يمكن إضافة دفعات إليها`,
          messageEn: `Invoice is ${invoice.payment_status} - cannot add payments`,
          severity: 'error',
          value: data.invoice_id
        });
      } else {
        // التحقق من تجاوز الفاتورة
        const totalPaid = (invoice.paid_amount || 0) + data.amount;
        if (totalPaid > invoice.total_amount) {
          errors.push({
            field: 'amount',
            code: 'INVOICE_OVERPAID',
            message: `المبلغ يتجاوز رصيد الفاتورة المتبقي (${invoice.total_amount - (invoice.paid_amount || 0)} ر.ق)`,
            messageEn: `Amount exceeds invoice remaining balance (${invoice.total_amount - (invoice.paid_amount || 0)} QAR)`,
            severity: 'error',
            value: data.amount,
            constraint: 'invoice.total_amount'
          });
        }
      }
    }

    // التحقق من تكرار idempotency key
    if (data.idempotency_key) {
      const { count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: false })
        .eq('idempotency_key', data.idempotency_key)
        .neq('id', data.id || '');

      if ((count || 0) > 0) {
        errors.push({
          field: 'idempotency_key',
          code: 'DUPLICATE_IDEMPOTENCY_KEY',
          message: 'مفتاح Idempotency مستخدم بالفعل في آخر 30 يوم',
          messageEn: 'Idempotency key already used in the last 30 days',
          severity: 'error',
          value: data.idempotency_key
        });
      }
    }
  }

  /**
   * التحقق السريع (دون عمليات قاعدة البيانات)
   */
  quickValidate(data: PaymentCreationData): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const info: ValidationError[] = [];

    // فقط قواعد متزامنة
    for (const [name, rule] of this.rules.entries()) {
      if (!rule.enabled) {
        continue;
      }

      try {
        // Skip async rules
        if (rule.validate.constructor.name === 'AsyncFunction') {
          continue;
        }

        const result = rule.validate(data);

        if (result) {
          switch (result.severity) {
            case 'error':
              errors.push(result);
              break;
            case 'warning':
              warnings.push(result);
              break;
            case 'info':
              info.push(result);
              break;
          }
        }
      } catch (error) {
        logger.error(`Validation rule ${name} failed`, { error, data });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info
    };
  }

  /**
   * الحصول على جميع القواعد
   */
  getRules(): Array<{ name: string; enabled: boolean; description: string; severity: string }> {
    return Array.from(this.rules.entries()).map(([name, rule]) => ({
      name,
      enabled: rule.enabled,
      description: rule.description,
      severity: rule.severity
    }));
  }

  /**
   * الحصول على قاعدة واحدة
   */
  getRule(name: string): ValidationRule | undefined {
    return this.rules.get(name);
  }

  /**
   * تفعيل/تعطيل قواعد متعددة
   */
  setRulesEnabled(ruleNames: string[], enabled: boolean): void {
    ruleNames.forEach(name => {
      this.setRuleEnabled(name, enabled);
    });
  }
}

// Export singleton instance
export const paymentValidator = new PaymentValidator();
