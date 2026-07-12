/**
 * Payment Linking Service
 * 
 * موحد منطق ربط المدفوعات بكل من:
 * - PaymentService.autoMatch()
 * - SmartPaymentLinker.findBestContract()
 * - ProfessionalPaymentLinker.performSmartLinking()
 * 
 * هذا يضمن ثبات في المنطق وسجل شامل لقرارات الربط.
 */

import { BaseService } from './core/BaseService';
import { PaymentRepository } from './repositories/PaymentRepository';
import type { Payment } from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { auditTrailSystem } from '@/utils/auditTrailSystem';

export interface LinkingSuggestion {
  targetId: string;
  targetType: 'invoice' | 'contract';
  confidence: number;
  reason: string;
  details: {
    invoiceNumber?: string;
    contractNumber?: string;
    amountMatch?: boolean;
    customerMatch?: boolean;
    referenceMatch?: boolean;
    dateProximity?: number;
  };
}

export interface LinkingResult {
  success: boolean;
  linkedTo?: {
    type: 'invoice' | 'contract';
    id: string;
    number: string;
  };
  confidence: number;
  reason: string;
  warnings?: string[];
}

export interface LinkingDecision {
  paymentId: string;
  decision: 'auto_linked' | 'linked_to_best' | 'no_match' | 'low_confidence';
  targetId?: string;
  targetType?: 'invoice' | 'contract';
  confidence: number;
  reason: string;
  timestamp: string;
}

export interface InvoiceAllocationInput {
  invoice_id: string;
  amount: number;
}

interface InvoiceAllocationRow {
  target_id: string;
  amount: number;
  allocation_order: number;
}

export interface InvoiceBalanceCandidate {
  invoiceId: string;
  availableAmount: number;
}

export function distributePaymentAcrossInvoices(
  paymentAmount: number,
  invoices: InvoiceBalanceCandidate[]
): InvoiceAllocationInput[] {
  const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const allocations: InvoiceAllocationInput[] = [];
  let remaining = roundMoney(Math.max(Number(paymentAmount), 0));

  for (const invoice of invoices) {
    if (remaining <= 0.01) {
      break;
    }

    const availableAmount = roundMoney(Math.max(Number(invoice.availableAmount), 0));
    const allocationAmount = roundMoney(Math.min(remaining, availableAmount));
    if (allocationAmount > 0.01) {
      allocations.push({ invoice_id: invoice.invoiceId, amount: allocationAmount });
      remaining = roundMoney(remaining - allocationAmount);
    }
  }

  return allocations;
}

/**
 * عتبات الثقة للربط
 */
const CONFIDENCE_THRESHOLDS = {
  AUTO_MATCH: 0.70,     // 70% - ربط تلقائي
  MANUAL_MATCH: 0.40,   // 40% - ربط يدوي (اقتراحات فقط)
  HIGH_CONFIDENCE: 0.85, // 85% - ثقة عالية جداً
  MIN_REASONABLE: 0.20 // 20% - أدنى ثقة معقولة
} as const;

/**
 * أوزان العوامل في حساب الثقة
 */
const CONFIDENCE_WEIGHTS = {
  AMOUNT_MATCH: 0.40,      // تطابق المبلغ (40 نقطة)
  CUSTOMER_MATCH: 0.30,     // تطابق العميل (30 نقطة)
  REFERENCE_MATCH: 0.30,    // تطابق المرجع (30 نقطة)
  DATE_PROXIMITY: 0.10,      // القرب الزمني (10 نقاط)
  BASE_CONFIDENCE: 0.30      // ثقة أساسية لأي تطابق محتمل
} as const;

class PaymentLinkingService extends BaseService<Payment> {
  private linkingHistory: Map<string, LinkingDecision[]> = new Map();

  constructor() {
    const paymentRepo = new PaymentRepository();
    super(paymentRepo, 'PaymentLinkingService');
  }

  /**
   * الربط الرئيسي: يجد أفضل تطابق ويربط تلقائياً إذا كانت الثقة عالية
   */
  async linkPayment(
    paymentId: string,
    options: {
      autoLink?: boolean;
      forceLink?: boolean;
      preferredTargetType?: 'invoice' | 'contract';
    } = {}
  ): Promise<LinkingResult> {
    try {
      this.log('linkPayment', 'Starting payment linking', { paymentId, options });

      // 1. جلب الدفعة
      const payment = await this.getById(paymentId);
      if (!payment) {
        throw new Error('الدفعة غير موجودة');
      }

      // A legacy invoice_id/contract_id is not proof of a financial allocation.
      const currentAllocations = await this.getCurrentInvoiceAllocations(payment.id);
      if (currentAllocations.length > 0) {
        const primaryInvoiceId = currentAllocations[0].invoice_id;
        return {
          success: true,
          linkedTo: {
            type: 'invoice',
            id: primaryInvoiceId,
            number: (await this.getTargetNumber('invoice', primaryInvoiceId)) || 'الفاتورة'
          },
          confidence: 1,
          reason: 'الدفعة مخصصة بالفعل في دفتر تخصيص الدفعات'
        };
      }

      // 3. الحصول على اقتراحات الربط
      const allSuggestions = await this.findLinkingSuggestions(payment);
      const suggestions = options.preferredTargetType
        ? allSuggestions.filter((suggestion) => suggestion.targetType === options.preferredTargetType)
        : allSuggestions;

      if (suggestions.length === 0) {
        const decision: LinkingDecision = {
          paymentId,
          decision: 'no_match',
          confidence: 0,
          reason: 'لم يتم العثور على اقتراحات للربط',
          timestamp: new Date().toISOString()
        };
        
        this.recordDecision(decision);
        this.log('linkPayment', 'No suggestions found', { paymentId });

        return {
          success: false,
          confidence: 0,
          reason: 'لم يتم العثور على عقود أو فواتير مناسبة للربط'
        };
      }

      // 4. اختيار أفضل اقتراح
      const bestMatch = suggestions[0];
      
      // 5. اتخاذ القرار
      let shouldAutoLink = options.autoLink !== false && options.forceLink;
      let warnings: string[] = [];

      if (!shouldAutoLink) {
        // إذا لم يُحدد autoLink، نستخدم عتبة الربط التلقائي
        shouldAutoLink = bestMatch.confidence >= CONFIDENCE_THRESHOLDS.AUTO_MATCH;
        
        if (bestMatch.confidence < CONFIDENCE_THRESHOLDS.AUTO_MATCH) {
          warnings.push(`الثقة (${(bestMatch.confidence * 100).toFixed(0)}%) أقل من عتبة الربط التلقائي (${(CONFIDENCE_THRESHOLDS.AUTO_MATCH * 100).toFixed(0)}%)`);
        }
      }

      // 6. تنفيذ الربط
      if (shouldAutoLink || options.forceLink) {
        const result = await this.executeLinking(payment, bestMatch);
        
        // تسجيل القرار
        const decision: LinkingDecision = {
          paymentId,
          decision: shouldAutoLink ? 'auto_linked' : 'linked_to_best',
          targetId: bestMatch.targetId,
          targetType: bestMatch.targetType,
          confidence: bestMatch.confidence,
          reason: this.buildReasonString(bestMatch),
          timestamp: new Date().toISOString()
        };
        
        this.recordDecision(decision);
        
        // سجل تدقيق
        auditTrailSystem.logPaymentAction(
          'linked',
          paymentId,
          payment.created_by || 'system',
          payment.company_id,
          bestMatch.targetId,
          {
            confidence: bestMatch.confidence,
            targetType: bestMatch.targetType,
            suggestionsCount: suggestions.length,
            autoLinked: shouldAutoLink
          }
        );

        return result;
      } else {
        // الثقة منخفضة - إرجاع الاقتراحات للمستخدم
        const decision: LinkingDecision = {
          paymentId,
          decision: 'low_confidence',
          targetId: bestMatch.targetId,
          targetType: bestMatch.targetType,
          confidence: bestMatch.confidence,
          reason: `الثقة منخفضة (${(bestMatch.confidence * 100).toFixed(0)}%) - يتطلب مراجعة يدوية`,
          timestamp: new Date().toISOString()
        };
        
        this.recordDecision(decision);

        return {
          success: false,
          confidence: bestMatch.confidence,
          reason: `الثقة منخفضة (${(bestMatch.confidence * 100).toFixed(0)}%) - يرجى مراجعة الاقتراحات يدوياً`,
          warnings: [
            `${suggestions.length} اقتراح متاحة`,
            ...warnings
          ]
        };
      }
    } catch (error) {
      this.handleError('linkPayment', error);
      return {
        success: false,
        confidence: 0,
        reason: error instanceof Error ? error.message : 'فشل في ربط الدفعة'
      };
    }
  }

  /**
   * تنفيذ عملية الربط الفعلية
   */
  private async executeLinking(
    payment: Payment,
    suggestion: LinkingSuggestion
  ): Promise<LinkingResult> {
    try {
      const expectedAllocations = await this.getCurrentInvoiceAllocations(payment.id);
      const allocations = suggestion.targetType === 'invoice'
        ? await this.buildInvoiceAllocation(payment, suggestion.targetId, expectedAllocations)
        : await this.buildContractAllocations(payment, suggestion.targetId, expectedAllocations);

      const reason = suggestion.targetType === 'invoice'
        ? `تخصيص الدفعة للفاتورة: ${suggestion.reason}`
        : `توزيع الدفعة على فواتير العقد: ${suggestion.reason}`;

      await this.replaceInvoiceAllocations(payment, allocations, expectedAllocations, reason);

      this.log('executeLinking', 'Payment linked successfully', {
        paymentId: payment.id,
        targetType: suggestion.targetType,
        targetId: suggestion.targetId,
        confidence: suggestion.confidence,
        allocations
      });

      const targetNumber = await this.getTargetNumber(
        suggestion.targetType,
        suggestion.targetId
      );

      const allocatedAmount = allocations.reduce((total, allocation) => total + allocation.amount, 0);
      const unallocatedAmount = this.roundMoney(Number(payment.amount) - allocatedAmount);

      return {
        success: true,
        linkedTo: {
          type: suggestion.targetType,
          id: suggestion.targetId,
          number: targetNumber || 'غير معروف'
        },
        confidence: suggestion.confidence,
        reason: suggestion.reason,
        warnings: unallocatedAmount > 0.01
          ? [`بقي ${unallocatedAmount.toFixed(2)} ر.ق كرصيد عميل غير مخصص`]
          : undefined
      };
    } catch (error) {
      this.log('executeLinking', 'Failed to link payment', { error, paymentId: payment.id });
      throw error;
    }
  }

  private async getCurrentInvoiceAllocations(paymentId: string): Promise<InvoiceAllocationInput[]> {
    const { data, error } = await (supabase as any)
      .from('payment_allocations')
      .select('target_id, amount, allocation_order')
      .eq('payment_id', paymentId)
      .eq('allocation_type', 'invoice')
      .eq('is_active', true)
      .order('allocation_order', { ascending: true });

    if (error) {
      throw new Error(`تعذر قراءة تخصيصات الدفعة الحالية: ${error.message}`);
    }

    return ((data || []) as InvoiceAllocationRow[]).map((allocation) => ({
      invoice_id: allocation.target_id,
      amount: this.roundMoney(Number(allocation.amount))
    }));
  }

  private async buildInvoiceAllocation(
    payment: Payment,
    invoiceId: string,
    currentAllocations: InvoiceAllocationInput[]
  ): Promise<InvoiceAllocationInput[]> {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('id, company_id, customer_id, contract_id, invoice_number, total_amount, paid_amount, balance_due, status, payment_status')
      .eq('id', invoiceId)
      .eq('company_id', payment.company_id)
      .maybeSingle();

    if (error) {
      throw new Error(`تعذر قراءة الفاتورة: ${error.message}`);
    }
    if (!invoice) {
      throw new Error('الفاتورة غير موجودة في شركة الدفعة');
    }

    this.assertInvoiceCanReceivePayment(payment, invoice);
    const currentAmount = currentAllocations.find((allocation) => allocation.invoice_id === invoice.id)?.amount || 0;
    const availableAmount = this.getInvoiceAvailableAmount(invoice, currentAmount);
    const allocations = distributePaymentAcrossInvoices(Number(payment.amount), [
      { invoiceId: invoice.id, availableAmount }
    ]);

    if (allocations.length === 0) {
      throw new Error(`الفاتورة ${invoice.invoice_number} مسددة بالكامل ولا تقبل تخصيصًا جديدًا`);
    }

    return allocations;
  }

  private async buildContractAllocations(
    payment: Payment,
    contractId: string,
    currentAllocations: InvoiceAllocationInput[]
  ): Promise<InvoiceAllocationInput[]> {
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, company_id, customer_id, contract_number, status')
      .eq('id', contractId)
      .eq('company_id', payment.company_id)
      .maybeSingle();

    if (contractError) {
      throw new Error(`تعذر قراءة العقد: ${contractError.message}`);
    }
    if (!contract) {
      throw new Error('العقد غير موجود في شركة الدفعة');
    }
    if (payment.customer_id && contract.customer_id && payment.customer_id !== contract.customer_id) {
      throw new Error('لا يمكن ربط الدفعة بعقد يخص عميلًا آخر');
    }
    if (payment.contract_id && payment.contract_id !== contract.id) {
      throw new Error('الدفعة مسجلة على عقد آخر ولا يمكن إعادة توجيهها دون تسوية معتمدة');
    }

    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, company_id, customer_id, contract_id, invoice_number, total_amount, paid_amount, balance_due, status, payment_status, due_date')
      .eq('company_id', payment.company_id)
      .eq('contract_id', contract.id)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('invoice_number', { ascending: true });

    if (invoicesError) {
      throw new Error(`تعذر قراءة فواتير العقد: ${invoicesError.message}`);
    }

    const currentByInvoice = new Map(
      currentAllocations.map((allocation) => [allocation.invoice_id, allocation.amount])
    );
    const candidates: InvoiceBalanceCandidate[] = [];

    for (const invoice of invoices || []) {
      if (this.isInactiveInvoice(invoice)) {
        continue;
      }

      this.assertInvoiceCanReceivePayment(payment, invoice, contract.id);
      const availableAmount = this.getInvoiceAvailableAmount(
        invoice,
        currentByInvoice.get(invoice.id) || 0
      );
      candidates.push({ invoiceId: invoice.id, availableAmount });
    }

    const allocations = distributePaymentAcrossInvoices(Number(payment.amount), candidates);

    if (allocations.length === 0) {
      throw new Error(`لا توجد فواتير مستحقة قابلة للتخصيص في العقد ${contract.contract_number}`);
    }

    return allocations;
  }

  private async replaceInvoiceAllocations(
    payment: Payment,
    allocations: InvoiceAllocationInput[],
    expectedAllocations: InvoiceAllocationInput[],
    reason: string
  ): Promise<void> {
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await (supabase as any).rpc('replace_payment_invoice_allocations', {
      p_payment_id: payment.id,
      p_company_id: payment.company_id,
      p_allocations: allocations,
      p_reason: reason,
      p_expected_allocations: expectedAllocations,
      p_actor_id: authData.user?.id || null
    });

    if (error) {
      throw new Error(`فشل حفظ تخصيص الدفعة: ${error.message}`);
    }
  }

  private assertInvoiceCanReceivePayment(
    payment: Payment,
    invoice: {
      customer_id: string | null;
      contract_id: string | null;
      status: string;
      payment_status: string;
    },
    expectedContractId?: string
  ): void {
    if (this.isInactiveInvoice(invoice)) {
      throw new Error('لا يمكن تخصيص دفعة لفاتورة ملغاة أو غير نشطة');
    }
    if (invoice.customer_id && invoice.customer_id !== payment.customer_id) {
      throw new Error('لا يمكن تخصيص الدفعة لفاتورة تخص عميلًا آخر');
    }
    if (payment.contract_id && invoice.contract_id !== payment.contract_id) {
      throw new Error('الفاتورة لا تتبع العقد المسجل على الدفعة');
    }
    if (expectedContractId && invoice.contract_id !== expectedContractId) {
      throw new Error('إحدى الفواتير لا تتبع العقد المحدد');
    }
  }

  private isInactiveInvoice(invoice: { status: string; payment_status: string }): boolean {
    const inactiveStatuses = new Set(['cancelled', 'canceled', 'void', 'voided', 'deleted']);
    return inactiveStatuses.has((invoice.status || '').toLowerCase())
      || inactiveStatuses.has((invoice.payment_status || '').toLowerCase());
  }

  private getInvoiceAvailableAmount(
    invoice: { total_amount: number; paid_amount: number | null; balance_due: number | null },
    currentPaymentAllocation: number
  ): number {
    const calculatedBalance = Math.max(
      Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0),
      0
    );
    const reportedBalance = invoice.balance_due === null
      ? calculatedBalance
      : Math.max(Number(invoice.balance_due), 0);

    return this.roundMoney(Math.max(reportedBalance, calculatedBalance) + currentPaymentAllocation);
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * البحث عن أفضل اقتراحات للربط
   */
  async findLinkingSuggestions(
    payment: Payment
  ): Promise<LinkingSuggestion[]> {
    try {
      this.log('findLinkingSuggestions', 'Finding suggestions', { paymentId: payment.id });

      const suggestions: LinkingSuggestion[] = [];

      // 1. البحث عن الفواتير
      const invoiceSuggestions = await this.findInvoiceSuggestions(payment);
      suggestions.push(...invoiceSuggestions);

      // 2. البحث عن العقود
      const contractSuggestions = await this.findContractSuggestions(payment);
      suggestions.push(...contractSuggestions);

      // 3. الترتيب حسب الثقة
      suggestions.sort((a, b) => b.confidence - a.confidence);

      // 4. إرجاع أفضل 10 اقتراحات
      return suggestions.slice(0, 10);
    } catch (error) {
      this.handleError('findLinkingSuggestions', error);
      return [];
    }
  }

  /**
   * البحث عن فواتير مناسبة للربط
   */
  private async findInvoiceSuggestions(
    payment: Payment
  ): Promise<LinkingSuggestion[]> {
    const suggestions: LinkingSuggestion[] = [];

    try {
      // البحث حسب المبلغ (تسامح ±5%)
      const amountTolerance = payment.amount * 0.05;
      
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          balance_due,
          payment_status,
          customer_id,
          contract_id,
          due_date
        `)
        .eq('company_id', payment.company_id)
        .in('payment_status', ['unpaid', 'partial', 'overdue'])
        .gte('total_amount', payment.amount - amountTolerance)
        .lte('total_amount', payment.amount + amountTolerance)
        .order('due_date', { ascending: true })
        .limit(10);

      if (invoices && invoices.length > 0) {
        for (const invoice of invoices) {
          const confidence = this.calculateInvoiceConfidence(payment, invoice);
          
          if (confidence >= CONFIDENCE_THRESHOLDS.MIN_REASONABLE) {
            suggestions.push({
              targetId: invoice.id,
              targetType: 'invoice',
              confidence,
              reason: this.buildInvoiceReasonString(payment, invoice, confidence),
              details: {
                invoiceNumber: invoice.invoice_number,
                amountMatch: Math.abs(payment.amount - invoice.total_amount) <= amountTolerance,
                customerMatch: payment.customer_id === invoice.customer_id,
                dateProximity: invoice.due_date && payment.payment_date
                  ? Math.abs(new Date(invoice.due_date).getTime() - new Date(payment.payment_date).getTime()) / (1000 * 60 * 60 * 24)
                  : undefined
              }
            });
          }
        }
      }

      // البحث حسب رقم المرجع
      if (payment.reference_number || payment.agreement_number) {
        const reference = payment.reference_number || payment.agreement_number;
        
        const { data: refInvoices } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            total_amount,
            customer_id,
            contract_id
          `)
          .eq('company_id', payment.company_id)
          .in('payment_status', ['unpaid', 'partial', 'overdue'])
          .or(`invoice_number.ilike.%${reference}%,reference_number.ilike.%${reference}%`)
          .limit(5);

        if (refInvoices && refInvoices.length > 0) {
          for (const invoice of refInvoices) {
            const existingSuggestion = suggestions.find(s => 
              s.targetId === invoice.id && s.targetType === 'invoice'
            );

            if (!existingSuggestion) {
              const confidence = CONFIDENCE_WEIGHTS.REFERENCE_MATCH + CONFIDENCE_WEIGHTS.BASE_CONFIDENCE;
              
              suggestions.push({
                targetId: invoice.id,
                targetType: 'invoice',
                confidence: Math.min(confidence, 1.0),
                reason: `تطابق رقم المرجع: ${reference}`,
                details: {
                  invoiceNumber: invoice.invoice_number,
                  referenceMatch: true,
                  amountMatch: Math.abs(payment.amount - invoice.total_amount) <= amountTolerance
                }
              });
            }
          }
        }
      }

      this.log('findInvoiceSuggestions', `Found ${suggestions.length} invoice suggestions`, {
        paymentId: payment.id
      });

      return suggestions;
    } catch (error) {
      this.handleError('findInvoiceSuggestions', error);
      return [];
    }
  }

  /**
   * البحث عن عقود مناسبة للربط
   */
  private async findContractSuggestions(
    payment: Payment
  ): Promise<LinkingSuggestion[]> {
    const suggestions: LinkingSuggestion[] = [];

    try {
      // البحث عن عقود نشطة
      const { data: contracts } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          monthly_amount,
          contract_amount,
          start_date,
          end_date,
          status,
          customer_id
        `)
        .eq('company_id', payment.company_id)
        .in('status', ['active', 'under_review', 'draft'])
        .limit(20);

      if (contracts && contracts.length > 0) {
        for (const contract of contracts) {
          const confidence = this.calculateContractConfidence(payment, contract);
          
          if (confidence >= CONFIDENCE_THRESHOLDS.MIN_REASONABLE) {
            suggestions.push({
              targetId: contract.id,
              targetType: 'contract',
              confidence,
              reason: this.buildContractReasonString(payment, contract, confidence),
              details: {
                contractNumber: contract.contract_number,
                amountMatch: Math.abs(payment.amount - contract.monthly_amount) <= (payment.amount * 0.05),
                customerMatch: payment.customer_id === contract.customer_id,
                dateProximity: contract.start_date && payment.payment_date
                  ? Math.abs(new Date(contract.start_date).getTime() - new Date(payment.payment_date).getTime()) / (1000 * 60 * 60 * 24)
                  : undefined
              }
            });
          }
        }
      }

      this.log('findContractSuggestions', `Found ${suggestions.length} contract suggestions`, {
        paymentId: payment.id
      });

      return suggestions;
    } catch (error) {
      this.handleError('findContractSuggestions', error);
      return [];
    }
  }

  /**
   * حساب ثقة الربط مع فاتورة
   */
  private calculateInvoiceConfidence(
    payment: Payment,
    invoice: any
  ): number {
    let confidence = 0;

    // تطابق المبلغ
    const amountDiff = Math.abs(payment.amount - invoice.total_amount);
    if (amountDiff === 0) {
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH; // 40 نقطة
    } else if (amountDiff <= payment.amount * 0.02) { // ±2%
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH * 0.75; // 30 نقطة
    } else if (amountDiff <= payment.amount * 0.05) { // ±5%
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH * 0.5; // 20 نقطة
    } else if (amountDiff <= payment.amount * 0.10) { // ±10%
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH * 0.25; // 10 نقاط
    }

    // تطابق العميل
    if (payment.customer_id && payment.customer_id === invoice.customer_id) {
      confidence += CONFIDENCE_WEIGHTS.CUSTOMER_MATCH; // 30 نقطة
    }

    // القرب الزمني (تاريخ الدفع قريب من تاريخ الاستحقاق)
    if (invoice.due_date && payment.payment_date) {
      const daysDiff = Math.abs(
        new Date(invoice.due_date).getTime() - new Date(payment.payment_date).getTime()
      ) / (1000 * 60 * 60 * 24);

      if (daysDiff <= 3) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY; // 10 نقاط
      } else if (daysDiff <= 7) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY * 0.75; // 7.5 نقطة
      } else if (daysDiff <= 14) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY * 0.5; // 5 نقاط
      } else if (daysDiff <= 30) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY * 0.25; // 2.5 نقطة
      }
    }

    // ثقة أساسية لأي اقتراح
    confidence += CONFIDENCE_WEIGHTS.BASE_CONFIDENCE; // 30 نقطة

    return Math.min(confidence, 1.0);
  }

  /**
   * حساب ثقة الربط مع عقد
   */
  private calculateContractConfidence(
    payment: Payment,
    contract: any
  ): number {
    let confidence = 0;

    // تطابق المبلغ مع المبلغ الشهري
    const amountDiff = Math.abs(payment.amount - contract.monthly_amount);
    if (amountDiff === 0) {
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH; // 40 نقطة
    } else if (amountDiff <= payment.amount * 0.02) {
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH * 0.75;
    } else if (amountDiff <= payment.amount * 0.05) {
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH * 0.5;
    } else if (amountDiff <= payment.amount * 0.10) {
      confidence += CONFIDENCE_WEIGHTS.AMOUNT_MATCH * 0.25;
    }

    // تطابق العميل
    if (payment.customer_id && payment.customer_id === contract.customer_id) {
      confidence += CONFIDENCE_WEIGHTS.CUSTOMER_MATCH; // 30 نقطة
    }

    // تطابق رقم الاتفاقية/العقد
    if (payment.agreement_number && contract.contract_number) {
      const agreementNum = payment.agreement_number.toUpperCase();
      const contractNum = contract.contract_number.toUpperCase();

      if (agreementNum === contractNum) {
        confidence += CONFIDENCE_WEIGHTS.REFERENCE_MATCH; // 30 نقطة
      } else if (agreementNum.includes(contractNum) || contractNum.includes(agreementNum)) {
        confidence += CONFIDENCE_WEIGHTS.REFERENCE_MATCH * 0.85; // 25.5 نقطة
      }
    }

    // القرب الزمني من تاريخ بداية العقد
    if (contract.start_date && payment.payment_date) {
      const daysDiff = Math.abs(
        new Date(contract.start_date).getTime() - new Date(payment.payment_date).getTime()
      ) / (1000 * 60 * 60 * 24);

      // الأفضل أن يكون الدفع بعد بداية العقد
      if (daysDiff >= 0 && daysDiff <= 3) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY; // 10 نقاط
      } else if (daysDiff >= 0 && daysDiff <= 7) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY * 0.75;
      } else if (daysDiff >= 0 && daysDiff <= 14) {
        confidence += CONFIDENCE_WEIGHTS.DATE_PROXIMITY * 0.5;
      }
    }

    // ثقة أساسية
    confidence += CONFIDENCE_WEIGHTS.BASE_CONFIDENCE; // 30 نقطة

    return Math.min(confidence, 1.0);
  }

  /**
   * بناء سلسلة سبب الربط للفواتير
   */
  private buildInvoiceReasonString(
    payment: Payment,
    invoice: any,
    confidence: number
  ): string {
    const reasons = [];

    if (invoice.payment_status === 'overdue') {
      reasons.push(`فاتورة متأخرة (${invoice.invoice_number})`);
    }

    if (Math.abs(payment.amount - invoice.total_amount) <= payment.amount * 0.01) {
      reasons.push(`مبلغ متطابق (${payment.amount.toFixed(2)} ر.ق)`);
    }

    if (payment.customer_id === invoice.customer_id) {
      reasons.push('نفس العميل');
    }

    return reasons.length > 0 ? reasons.join(' + ') : 'اقتراح متاح';
  }

  /**
   * بناء سلسلة سبب الربط للعقود
   */
  private buildContractReasonString(
    payment: Payment,
    contract: any,
    confidence: number
  ): string {
    const reasons = [];

    if (contract.status === 'active') {
      reasons.push(`عقد نشط (${contract.contract_number})`);
    }

    if (Math.abs(payment.amount - contract.monthly_amount) <= payment.amount * 0.01) {
      reasons.push(`مبلغ المبلغ الشهري (${payment.amount.toFixed(2)} ر.ق)`);
    }

    if (payment.customer_id === contract.customer_id) {
      reasons.push('نفس العميل');
    }

    return reasons.length > 0 ? reasons.join(' + ') : 'اقتراح متاح';
  }

  /**
   * بناء سلسلة سبب شاملة
   */
  private buildReasonString(suggestion: LinkingSuggestion): string {
    return suggestion.reason;
  }

  /**
   * الحصول على رقم الفاتورة أو العقد
   */
  private async getTargetNumber(
    targetType: 'invoice' | 'contract',
    targetId: string
  ): Promise<string | null> {
    try {
      if (targetType === 'invoice') {
        const { data } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('id', targetId)
          .single();
        
        return data?.invoice_number || null;
      } else {
        const { data } = await supabase
          .from('contracts')
          .select('contract_number')
          .eq('id', targetId)
          .single();
        
        return data?.contract_number || null;
      }
    } catch (error) {
      this.log('getTargetNumber', 'Failed to get target number', { error, targetType, targetId });
      return null;
    }
  }

  /**
   * تسجيل قرار الربط
   */
  private recordDecision(decision: LinkingDecision): void {
    const history = this.linkingHistory.get(decision.paymentId) || [];
    history.push(decision);
    this.linkingHistory.set(decision.paymentId, history);
    
    this.log('recordDecision', 'Linking decision recorded', {
      paymentId: decision.paymentId,
      decision: decision.decision,
      confidence: decision.confidence
    });
  }

  /**
   * الحصول على تاريخ قرارات الربط
   */
  getLinkingHistory(paymentId: string): LinkingDecision[] {
    return this.linkingHistory.get(paymentId) || [];
  }

  /**
   * مسح تاريخ الربط (للاختبار)
   */
  clearLinkingHistory(): void {
    this.linkingHistory.clear();
  }

  /**
   * الحصول على اقتراحات للربط اليدوي (عرض على المستخدم)
   */
  async getManualLinkingSuggestions(
    paymentId: string,
    maxSuggestions: number = 10
  ): Promise<LinkingSuggestion[]> {
    const payment = await this.getById(paymentId);
    if (!payment) {
      throw new Error('الدفعة غير موجودة');
    }

    return this.findLinkingSuggestions(payment).slice(0, maxSuggestions);
  }

  /**
   * ربط يدوي (اختيار المستخدم)
   */
  async manualLink(
    paymentId: string,
    targetType: 'invoice' | 'contract',
    targetId: string,
    userId?: string
  ): Promise<LinkingResult> {
    try {
      this.log('manualLink', 'Manual linking started', {
        paymentId,
        targetType,
        targetId
      });

      const payment = await this.getById(paymentId);
      if (!payment) {
        throw new Error('الدفعة غير موجودة');
      }

      // Manual linking must honor the exact target selected by the user.
      const result = await this.executeLinking(payment, {
        targetId,
        targetType,
        confidence: 1,
        reason: 'اختيار يدوي معتمد من المستخدم',
        details: {}
      });

      if (result.success) {
        // سجل تدقيق للربط اليدوي
        auditTrailSystem.logPaymentAction(
          'linked_manually',
          paymentId,
          userId || payment.created_by || 'manual_user',
          payment.company_id,
          targetId,
          {
            targetType,
            confidence: result.confidence,
            reason: 'ربط يدوي من قبل المستخدم'
          }
        );
      }

      return result;
    } catch (error) {
      this.handleError('manualLink', error);
      return {
        success: false,
        confidence: 0,
        reason: error instanceof Error ? error.message : 'فشل في الربط اليدوي'
      };
    }
  }

  /**
   * فك ربط دفعة
   */
  async unlinkPayment(
    paymentId: string,
    userId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.log('unlinkPayment', 'Unlinking payment', { paymentId });

      const payment = await this.getById(paymentId);
      if (!payment) {
        throw new Error('الدفعة غير موجودة');
      }

      const currentAllocations = await this.getCurrentInvoiceAllocations(payment.id);
      if (currentAllocations.length === 0) {
        return {
          success: true,
          message: 'لا توجد تخصيصات فواتير نشطة لهذه الدفعة'
        };
      }

      await this.replaceInvoiceAllocations(
        payment,
        [],
        currentAllocations,
        'فك تخصيص الفواتير يدويًا'
      );

      // سجل تدقيق
      auditTrailSystem.logPaymentAction(
        'unlinked',
        paymentId,
        userId || payment.created_by || 'manual_user',
        payment.company_id,
        undefined,
        {
          reason: 'فك تخصيص الفواتير يدويًا'
        }
      );

      this.log('unlinkPayment', 'Payment unlinked successfully', { paymentId });

      return {
        success: true,
        message: 'تم فك تخصيص الفواتير وحفظ التسوية المحاسبية بنجاح'
      };
    } catch (error) {
      this.handleError('unlinkPayment', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'فشل في فك الربط'
      };
    }
  }
}

// Export singleton instance
export const paymentLinkingService = new PaymentLinkingService();
