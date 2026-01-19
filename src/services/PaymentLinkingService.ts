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

import { BaseService, type ValidationResult } from './core/BaseService';
import { PaymentRepository } from './repositories/PaymentRepository';
import type { Payment } from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { auditTrailSystem } from '@/utils/auditTrailSystem';
import { paymentStateMachine } from './PaymentStateMachine';

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
  private paymentRepo: PaymentRepository;
  private linkingHistory: Map<string, LinkingDecision[]> = new Map();

  constructor() {
    const paymentRepo = new PaymentRepository();
    super(paymentRepo, 'PaymentLinkingService');
    this.paymentRepo = paymentRepo;
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

      // 2. التحقق من عدم ربطها بالفعل
      if (payment.invoice_id || payment.contract_id) {
        const existingTarget = payment.invoice_id 
          ? { type: 'invoice' as const, id: payment.invoice_id, number: 'الفاتورة' }
          : { type: 'contract' as const, id: payment.contract_id!, number: 'العقد' };

        this.log('linkPayment', 'Payment already linked', {
          paymentId,
          target: existingTarget
        });

        return {
          success: true,
          linkedTo: {
            type: existingTarget.type,
            id: existingTarget.id,
            number: (await this.getTargetNumber(existingTarget.type, existingTarget.id)) || existingTarget.number
          },
          confidence: 100,
          reason: 'الدفعة مربوطة بالفعل'
        };
      }

      // 3. الحصول على اقتراحات الربط
      const suggestions = await this.findLinkingSuggestions(payment);

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
      // التحقق من عدم تكرار الربط
      if (suggestion.targetType === 'invoice') {
        // التحقق من أن الفاتورة مربوطة بدفعة أخرى
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id, payment_number, invoice_id, contract_id')
          .eq('invoice_id', suggestion.targetId)
          .neq('id', payment.id)
          .eq('company_id', payment.company_id)
          .limit(1)
          .maybeSingle();

        if (existingPayment) {
          this.log('executeLinking', 'Invoice already linked to another payment', {
            paymentId: payment.id,
            invoiceId: suggestion.targetId,
            existingPaymentId: existingPayment.id,
            existingPaymentNumber: existingPayment.payment_number
          });

          return {
            success: false,
            confidence: 0,
            reason: `الفاتورة مربوطة بالفعل بدفعة أخرى (${existingPayment.payment_number})`
          };
        }

        // التحقق من وجود journal_entry_id للدفعة
        if (payment.journal_entry_id) {
          this.log('executeLinking', 'Payment already has journal entry, skipping invoice creation', {
            paymentId: payment.id,
            journalEntryId: payment.journal_entry_id
          });

          // فقط تحديث الروابط دون إنشاء فاتورة جديدة
          const updateData: any = {
            linking_confidence: suggestion.confidence,
            allocation_status: 'fully_allocated',
            reconciliation_status: 'matched',
            processing_status: 'completed',
            processing_notes: `ربط آلي بثقة ${(suggestion.confidence * 100).toFixed(0)}% - ${suggestion.reason} - القيد المحاسبي موجود`
          };

          await this.paymentRepo.update(payment.id, updateData);
          this.log('executeLinking', 'Payment linked without new invoice', {
            paymentId: payment.id,
            targetType: suggestion.targetType,
            targetId: suggestion.targetId,
            confidence: suggestion.confidence
          });

          return {
            success: true,
            linkedTo: {
              type: suggestion.targetType,
              id: suggestion.targetId,
              number: await this.getTargetNumber(suggestion.targetType, suggestion.targetId) || 'غير معروف'
            },
            confidence: suggestion.confidence,
            reason: suggestion.reason
          };
        }
      } else if (suggestion.targetType === 'contract') {
        // التحقق من أن العقد مربوط بدفعة أخرى بالفعل
        const { data: existingPayments } = await supabase
          .from('payments')
          .select('id, payment_number, contract_id, invoice_id, payment_date, amount')
          .eq('contract_id', suggestion.targetId)
          .neq('id', payment.id)
          .eq('company_id', payment.company_id)
          .eq('payment_status', 'completed')
          .order('payment_date', { ascending: false })
          .limit(5);

        if (existingPayments && existingPayments.length > 0) {
          this.log('executeLinking', 'Contract already has other payments', {
            paymentId: payment.id,
            contractId: suggestion.targetId,
            existingCount: existingPayments.length
          });

          // تحديث الروابط فقط
          const updateData: any = {
            linking_confidence: suggestion.confidence,
            allocation_status: 'partially_allocated',
            reconciliation_status: 'matched',
            processing_status: 'completed',
            processing_notes: `ربط آلي بثقة ${(suggestion.confidence * 100).toFixed(0)}% - ${suggestion.reason} - ${existingPayments.length} مدفوعات سابقة`
          };

          await this.paymentRepo.update(payment.id, updateData);
          this.log('executeLinking', 'Payment linked to contract without new invoice', {
            paymentId: payment.id,
            targetType: suggestion.targetType,
            targetId: suggestion.targetId,
            confidence: suggestion.confidence
          });

          return {
            success: true,
            linkedTo: {
              type: suggestion.targetType,
              id: suggestion.targetId,
              number: await this.getTargetNumber(suggestion.targetType, suggestion.targetId) || 'غير معروف'
            },
            confidence: suggestion.confidence,
            reason: suggestion.reason
          };
        }

        // التحقق من وجود journal_entry_id
        if (payment.journal_entry_id) {
          this.log('executeLinking', 'Payment already has journal entry', {
            paymentId: payment.id,
            journalEntryId: payment.journal_entry_id
          });

          const updateData: any = {
            linking_confidence: suggestion.confidence,
            allocation_status: 'fully_allocated',
            reconciliation_status: 'matched',
            processing_status: 'completed',
            processing_notes: `ربط آلي بثقة ${(suggestion.confidence * 100).toFixed(0)}% - ${suggestion.reason} - القيد المحاسبي موجود`
          };

          await this.paymentRepo.update(payment.id, updateData);
          this.log('executeLinking', 'Payment linked without new invoice', {
            paymentId: payment.id,
            targetType: suggestion.targetType,
            targetId: suggestion.targetId,
            confidence: suggestion.confidence
          });

          return {
            success: true,
            linkedTo: {
              type: suggestion.targetType,
              id: suggestion.targetId,
              number: await this.getTargetNumber(suggestion.targetType, suggestion.targetId) || 'غير معروف'
            },
            confidence: suggestion.confidence,
            reason: suggestion.reason
          };
        }
      }

      const updateData: any = {};

      if (suggestion.targetType === 'invoice') {
        updateData.invoice_id = suggestion.targetId;
      } else if (suggestion.targetType === 'contract') {
        updateData.contract_id = suggestion.targetId;
      }

      updateData.linking_confidence = suggestion.confidence;
      updateData.allocation_status = 'fully_allocated';
      updateData.reconciliation_status = 'matched';
      updateData.processing_status = 'completed';
      updateData.processing_notes = `ربط آلي بثقة ${(suggestion.confidence * 100).toFixed(0)}% - ${suggestion.reason}`;

      await this.paymentRepo.update(payment.id, updateData);

      this.log('executeLinking', 'Payment linked successfully', {
        paymentId: payment.id,
        targetType: suggestion.targetType,
        targetId: suggestion.targetId,
        confidence: suggestion.confidence
      });

      const targetNumber = await this.getTargetNumber(
        suggestion.targetType,
        suggestion.targetId
      );

      return {
        success: true,
        linkedTo: {
          type: suggestion.targetType,
          id: suggestion.targetId,
          number: targetNumber || 'غير معروف'
        },
        confidence: suggestion.confidence,
        reason: suggestion.reason
      };
    } catch (error) {
      this.log('executeLinking', 'Failed to link payment', { error, paymentId: payment.id });
      throw error;
    }
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

      // تنفيذ الربط مع forceLink
      const result = await this.linkPayment(paymentId, {
        forceLink: true,
        preferredTargetType: targetType
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

      if (!payment.invoice_id && !payment.contract_id) {
        return {
          success: true,
          message: 'الدفعة غير مربوطة أصلاً'
        };
      }

      // فك الربط
      const updateData: any = {
        invoice_id: null,
        contract_id: null,
        linking_confidence: null,
        allocation_status: null,
        reconciliation_status: 'unmatched',
        processing_notes: 'فك الربط اليدوي'
      };

      await this.paymentRepo.update(payment.id, updateData);

      // سجل تدقيق
      auditTrailSystem.logPaymentAction(
        'unlinked',
        paymentId,
        userId || payment.created_by || 'manual_user',
        payment.company_id,
        undefined,
        {
          reason: 'فك الربط اليدوي'
        }
      );

      this.log('unlinkPayment', 'Payment unlinked successfully', { paymentId });

      return {
        success: true,
        message: 'تم فك الربط بنجاح'
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
