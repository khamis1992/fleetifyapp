/**
 * محرك توزيع المدفوعات - Payment Allocation Engine
 * نظام متقدم لتوزيع المدفوعات على العقود والفواتير والالتزامات المالية
 */

import { supabase } from '@/integrations/supabase/client';
import { PaymentData, ContractData, InvoiceData } from './professionalPaymentLinking';

// ===============================
// أنواع توزيع المدفوعات
// ===============================

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  allocation_type: 'contract' | 'invoice' | 'obligation' | 'late_fee';
  target_id: string; // ID of contract, invoice, or obligation
  amount: number;
  allocated_date: string;
  allocation_method: 'auto' | 'manual' | 'proportional';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AllocationRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  conditions: AllocationCondition[];
  actions: AllocationAction[];
  enabled: boolean;
}

export interface AllocationCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface AllocationAction {
  type: 'allocate_to_contract' | 'allocate_to_invoice' | 'allocate_to_obligation' | 'create_late_fee';
  target: string;
  amount: 'full' | 'partial' | 'percentage';
  amountValue?: number;
  notes?: string;
}

export interface AllocationResult {
  payment: PaymentData;
  allocations: PaymentAllocation[];
  totalAllocated: number;
  remainingAmount: number;
  success: boolean;
  errors: string[];
  warnings: string[];
}

export interface FinancialObligation {
  id: string;
  company_id: string;
  customer_id: string;
  contract_id?: string;
  obligation_type: 'installment' | 'deposit' | 'fee' | 'penalty' | 'insurance';
  amount: number;
  original_amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid' | 'cancelled';
  paid_amount: number;
  remaining_amount: number;
  days_overdue: number;
  obligation_number: string;
  description: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
}

// ===============================
// محرك توزيع المدفوعات
// ===============================

export class PaymentAllocationEngine {
  private companyId: string;
  private allocationRules: AllocationRule[];

  constructor(companyId: string) {
    this.companyId = companyId;
    this.allocationRules = [];
  }

  /**
   * توزيع المدفوعة تلقائياً
   */
  async allocatePayment(payment: PaymentData, options: {
    autoAllocate?: boolean;
    allocationRules?: AllocationRule[];
    manualAllocations?: Partial<PaymentAllocation>[];
  } = {}): Promise<AllocationResult> {
    const { autoAllocate = true, allocationRules = this.allocationRules, manualAllocations = [] } = options;

    const result: AllocationResult = {
      payment,
      allocations: [],
      totalAllocated: 0,
      remainingAmount: payment.amount,
      success: true,
      errors: [],
      warnings: []
    };

    try {
      // 1. التوزيع اليدوي أولاً
      if (manualAllocations.length > 0) {
        const manualResult = await this.processManualAllocations(payment, manualAllocations);
        result.allocations.push(...manualResult.allocations);
        result.totalAllocated += manualResult.totalAllocated;
        result.remainingAmount -= manualResult.totalAllocated;
        result.errors.push(...manualResult.errors);
        result.warnings.push(...manualResult.warnings);
      }

      // 2. التوزيع التلقائي للباقي
      if (autoAllocate && result.remainingAmount > 0) {
        const autoResult = await this.processAutoAllocations(payment, allocationRules, result.remainingAmount);
        result.allocations.push(...autoResult.allocations);
        result.totalAllocated += autoResult.totalAllocated;
        result.remainingAmount -= autoResult.totalAllocated;
        result.errors.push(...autoResult.errors);
        result.warnings.push(...autoResult.warnings);
      }

      // 3. حفظ التوزيعات في قاعدة البيانات
      if (result.allocations.length > 0) {
        await this.saveAllocations(result.allocations);
      }

      // 4. تحديث حالة المدفوعة
      if (result.totalAllocated === payment.amount) {
        await this.updatePaymentStatus(payment.id!, 'fully_allocated');
      } else if (result.totalAllocated > 0) {
        await this.updatePaymentStatus(payment.id!, 'partially_allocated');
      } else {
        await this.updatePaymentStatus(payment.id!, 'unallocated');
      }

      console.log('✅ تم توزيع المدفوعة بنجاح:', result);
      return result;

    } catch (error) {
      console.error('❌ خطأ في توزيع المدفوعة:', error);
      result.success = false;
      result.errors.push(`خطأ في التوزيع: ${error}`);
      return result;
    }
  }

  /**
   * معالجة التوزيعات اليدوية
   */
  private async processManualAllocations(
    payment: PaymentData, 
    manualAllocations: Partial<PaymentAllocation>[]
  ): Promise<{ allocations: PaymentAllocation[]; totalAllocated: number; errors: string[]; warnings: string[] }> {
    const allocations: PaymentAllocation[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalAllocated = 0;

    for (const allocation of manualAllocations) {
      try {
        // التحقق من صحة التوزيع
        const validation = await this.validateAllocation(payment, allocation);
        if (!validation.valid) {
          errors.push(...validation.errors);
          continue;
        }

        // إنشاء التوزيع
        const newAllocation: PaymentAllocation = {
          id: crypto.randomUUID(),
          payment_id: payment.id!,
          allocation_type: allocation.allocation_type!,
          target_id: allocation.target_id!,
          amount: allocation.amount!,
          allocated_date: new Date().toISOString(),
          allocation_method: 'manual',
          notes: allocation.notes,
          created_by: payment.created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        allocations.push(newAllocation);
        totalAllocated += newAllocation.amount;

        // تحديث الكيان المستهدف
        await this.updateTargetEntity(newAllocation);

      } catch (error) {
        errors.push(`خطأ في التوزيع اليدوي: ${error}`);
      }
    }

    return { allocations, totalAllocated, errors, warnings };
  }

  /**
   * معالجة التوزيعات التلقائية
   */
  private async processAutoAllocations(
    payment: PaymentData,
    rules: AllocationRule[],
    availableAmount: number
  ): Promise<{ allocations: PaymentAllocation[]; totalAllocated: number; errors: string[]; warnings: string[] }> {
    const allocations: PaymentAllocation[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalAllocated = 0;
    let remainingAmount = availableAmount;

    // ترتيب القواعد حسب الأولوية
    const sortedRules = rules.filter(rule => rule.enabled).sort((a, b) => a.priority - b.priority);

    for (const rule of sortedRules) {
      if (remainingAmount <= 0) break;

      try {
        // التحقق من شروط القاعدة
        if (!this.evaluateRuleConditions(rule, payment)) continue;

        // تطبيق إجراءات القاعدة
        for (const action of rule.actions) {
          const actionResult = await this.executeAllocationAction(
            payment, 
            action, 
            remainingAmount, 
            rule
          );

          if (actionResult.allocation) {
            allocations.push(actionResult.allocation);
            totalAllocated += actionResult.allocation.amount;
            remainingAmount -= actionResult.allocation.amount;
          }

          if (actionResult.errors.length > 0) {
            errors.push(...actionResult.errors);
          }

          if (actionResult.warnings.length > 0) {
            warnings.push(...actionResult.warnings);
          }
        }

      } catch (error) {
        errors.push(`خطأ في تطبيق القاعدة ${rule.name}: ${error}`);
      }
    }

    return { allocations, totalAllocated, errors, warnings };
  }

  /**
   * تقييم شروط القاعدة
   */
  private evaluateRuleConditions(rule: AllocationRule, payment: PaymentData): boolean {
    if (rule.conditions.length === 0) return true;

    let result = true;
    let logicalOperator: 'AND' | 'OR' = 'AND';

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, payment);

      if (condition.logicalOperator) {
        logicalOperator = condition.logicalOperator;
      }

      if (logicalOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  }

  /**
   * تقييم شرط واحد
   */
  private evaluateCondition(condition: AllocationCondition, payment: PaymentData): boolean {
    const fieldValue = this.getFieldValue(payment, condition.field);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in_range':
        const [min, max] = condition.value;
        return Number(fieldValue) >= min && Number(fieldValue) <= max;
      default:
        return false;
    }
  }

  /**
   * الحصول على قيمة الحقل
   */
  private getFieldValue(payment: PaymentData, field: string): any {
    const fieldMap: Record<string, any> = {
      'amount': payment.amount,
      'payment_method': payment.payment_method,
      'payment_type': payment.payment_type,
      'customer_id': payment.customer_id,
      'contract_id': payment.contract_id,
      'reference_number': payment.reference_number,
      'notes': payment.notes
    };

    return fieldMap[field];
  }

  /**
   * تنفيذ إجراء التوزيع
   */
  private async executeAllocationAction(
    payment: PaymentData,
    action: AllocationAction,
    availableAmount: number,
    rule: AllocationRule
  ): Promise<{
    allocation?: PaymentAllocation;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // حساب المبلغ للتوزيع
      let allocationAmount = 0;
      
      switch (action.amount) {
        case 'full':
          allocationAmount = availableAmount;
          break;
        case 'partial':
          allocationAmount = Math.min(action.amountValue || 0, availableAmount);
          break;
        case 'percentage':
          allocationAmount = (availableAmount * (action.amountValue || 0)) / 100;
          break;
      }

      if (allocationAmount <= 0) {
        warnings.push(`المبلغ المحسوب للتوزيع صفر أو سالب`);
        return { errors, warnings };
      }

      // إنشاء التوزيع
      const allocation: PaymentAllocation = {
        id: crypto.randomUUID(),
        payment_id: payment.id!,
        allocation_type: action.type.replace('allocate_to_', '') as any,
        target_id: action.target,
        amount: allocationAmount,
        allocated_date: new Date().toISOString(),
        allocation_method: 'auto',
        notes: `${action.notes || ''} - قاعدة: ${rule.name}`.trim(),
        created_by: payment.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // تحديث الكيان المستهدف
      await this.updateTargetEntity(allocation);

      return { allocation, errors, warnings };

    } catch (error) {
      errors.push(`خطأ في تنفيذ الإجراء ${action.type}: ${error}`);
      return { errors, warnings };
    }
  }

  /**
   * التحقق من صحة التوزيع
   */
  private async validateAllocation(
    payment: PaymentData,
    allocation: Partial<PaymentAllocation>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // التحقق من وجود الحقول المطلوبة
    if (!allocation.allocation_type) {
      errors.push('نوع التوزيع مطلوب');
    }

    if (!allocation.target_id) {
      errors.push('الهدف مطلوب');
    }

    if (!allocation.amount || allocation.amount <= 0) {
      errors.push('المبلغ يجب أن يكون أكبر من صفر');
    }

    if (allocation.amount && allocation.amount > payment.amount) {
      errors.push('المبلغ الموزع لا يمكن أن يكون أكبر من مبلغ المدفوعة');
    }

    // التحقق من وجود الهدف
    if (allocation.target_id && allocation.allocation_type) {
      const targetExists = await this.checkTargetExists(allocation.target_id, allocation.allocation_type);
      if (!targetExists) {
        errors.push('الهدف المحدد غير موجود');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * التحقق من وجود الهدف
   */
  private async checkTargetExists(targetId: string, type: string): Promise<boolean> {
    try {
      switch (type) {
        case 'contract':
          const { data: contract } = await supabase
            .from('contracts')
            .select('id')
            .eq('id', targetId)
            .eq('company_id', this.companyId)
            .single();
          return !!contract;

        case 'invoice':
          const { data: invoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('id', targetId)
            .eq('company_id', this.companyId)
            .single();
          return !!invoice;

        case 'obligation':
          const { data: obligation } = await supabase
            .from('customer_financial_obligations')
            .select('id')
            .eq('id', targetId)
            .eq('company_id', this.companyId)
            .single();
          return !!obligation;

        default:
          return false;
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من وجود الهدف:', error);
      return false;
    }
  }

  /**
   * تحديث الكيان المستهدف
   */
  private async updateTargetEntity(allocation: PaymentAllocation): Promise<void> {
    try {
      switch (allocation.allocation_type) {
        case 'contract':
          await this.updateContractPayment(allocation);
          break;
        case 'invoice':
          await this.updateInvoicePayment(allocation);
          break;
        case 'obligation':
          await this.updateObligationPayment(allocation);
          break;
        case 'late_fee':
          await this.updateLateFeePayment(allocation);
          break;
      }
    } catch (error) {
      console.error('❌ خطأ في تحديث الكيان المستهدف:', error);
      throw error;
    }
  }

  /**
   * تحديث عقد بعد التوزيع
   */
  private async updateContractPayment(allocation: PaymentAllocation): Promise<void> {
    const { data: contract } = await supabase
      .from('contracts')
      .select('paid_amount, balance_due')
      .eq('id', allocation.target_id)
      .single();

    if (!contract) throw new Error('العقد غير موجود');

    const newPaidAmount = (contract.paid_amount || 0) + allocation.amount;
    const newBalanceDue = Math.max(0, (contract.balance_due || 0) - allocation.amount);

    await supabase
      .from('contracts')
      .update({
        paid_amount: newPaidAmount,
        balance_due: newBalanceDue,
        updated_at: new Date().toISOString()
      })
      .eq('id', allocation.target_id);
  }

  /**
   * تحديث فاتورة بعد التوزيع
   */
  private async updateInvoicePayment(allocation: PaymentAllocation): Promise<void> {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('paid_amount, balance_due')
      .eq('id', allocation.target_id)
      .single();

    if (!invoice) throw new Error('الفاتورة غير موجودة');

    const newPaidAmount = (invoice.paid_amount || 0) + allocation.amount;
    const newBalanceDue = Math.max(0, (invoice.balance_due || 0) - allocation.amount);
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'sent';

    await supabase
      .from('invoices')
      .update({
        paid_amount: newPaidAmount,
        balance_due: newBalanceDue,
        invoice_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', allocation.target_id);
  }

  /**
   * تحديث التزام مالي بعد التوزيع
   */
  private async updateObligationPayment(allocation: PaymentAllocation): Promise<void> {
    const { data: obligation } = await supabase
      .from('customer_financial_obligations')
      .select('paid_amount, remaining_amount')
      .eq('id', allocation.target_id)
      .single();

    if (!obligation) throw new Error('الالتزام المالي غير موجود');

    const newPaidAmount = (obligation.paid_amount || 0) + allocation.amount;
    const newRemainingAmount = Math.max(0, (obligation.remaining_amount || 0) - allocation.amount);
    const newStatus = newRemainingAmount <= 0 ? 'paid' : 'partially_paid';

    await supabase
      .from('customer_financial_obligations')
      .update({
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', allocation.target_id);
  }

  /**
   * تحديث غرامة التأخير
   */
  private async updateLateFeePayment(allocation: PaymentAllocation): Promise<void> {
    // تحديث المدفوعة لتشمل معلومات غرامة التأخير
    await supabase
      .from('payments')
      .update({
        late_fine_amount: allocation.amount,
        late_fine_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', allocation.payment_id);
  }

  /**
   * حفظ التوزيعات في قاعدة البيانات
   */
  private async saveAllocations(allocations: PaymentAllocation[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_allocations')
        .insert(allocations);

      if (error) {
        console.error('❌ خطأ في حفظ التوزيعات:', error);
        throw error;
      }

      console.log('✅ تم حفظ التوزيعات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ التوزيعات:', error);
      throw error;
    }
  }

  /**
   * تحديث حالة المدفوعة
   */
  private async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    try {
      await supabase
        .from('payments')
        .update({
          allocation_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId);
    } catch (error) {
      console.error('❌ خطأ في تحديث حالة المدفوعة:', error);
    }
  }

  /**
   * تحميل قواعد التوزيع
   */
  async loadAllocationRules(): Promise<AllocationRule[]> {
    try {
      const { data: rules, error } = await supabase
        .from('payment_allocation_rules')
        .select('*')
        .eq('company_id', this.companyId)
        .eq('enabled', true)
        .order('priority');

      if (error) throw error;

      this.allocationRules = rules || [];
      return this.allocationRules;

    } catch (error) {
      console.error('❌ خطأ في تحميل قواعد التوزيع:', error);
      return [];
    }
  }

  /**
   * إنشاء قاعدة توزيع جديدة
   */
  async createAllocationRule(rule: Omit<AllocationRule, 'id'>): Promise<AllocationRule> {
    try {
      const newRule: AllocationRule = {
        id: crypto.randomUUID(),
        ...rule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('payment_allocation_rules')
        .insert(newRule)
        .select()
        .single();

      if (error) throw error;

      this.allocationRules.push(data);
      return data;

    } catch (error) {
      console.error('❌ خطأ في إنشاء قاعدة التوزيع:', error);
      throw error;
    }
  }
}

// ===============================
// تصدير الدوال الرئيسية
// ===============================

export const createPaymentAllocationEngine = (companyId: string): PaymentAllocationEngine => {
  return new PaymentAllocationEngine(companyId);
};
