/**
 * Payment Service
 * 
 * Business logic layer for payment operations.
 * Includes smart matching for automatic payment-invoice linking.
 */

import { BaseService, type ValidationResult } from './core/BaseService';
import { PaymentRepository } from './repositories/PaymentRepository';
import type {
  Payment,
  PaymentCreationData,
  PaymentWithDetails,
  PaymentMatchSuggestion,
  PaymentMatchResult
} from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { paymentLinkingService } from './PaymentLinkingService';

export class PaymentService extends BaseService<Payment> {
  private paymentRepo: PaymentRepository;

  constructor() {
    const repository = new PaymentRepository();
    super(repository, 'PaymentService');
    this.paymentRepo = repository;
  }

  // ============ Public Methods ============

  /**
   * Create a new payment
   */
  async createPayment(
    data: PaymentCreationData,
    userId: string,
    companyId: string
  ): Promise<Payment> {
    try {
      this.log('createPayment', 'Starting payment creation', { userId, companyId });

      // Validate payment data
      const validation = await this.validatePaymentData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      const { data: paymentId, error: rpcError } = await (supabase as any).rpc('create_payment_atomic', {
        p_company_id: companyId,
        p_customer_id: data.customer_id || null,
        p_contract_id: data.contract_id || null,
        p_invoice_id: data.invoice_id || null,
        p_payment_number: null,
        p_payment_date: data.payment_date,
        p_amount: data.amount,
        p_payment_method: data.payment_method,
        p_payment_type: data.payment_type || data.payment_method,
        p_transaction_type: data.transaction_type === 'expense' ? 'payment' : 'receipt',
        p_reference_number: data.reference_number || null,
        p_agreement_number: data.agreement_number || null,
        p_check_number: data.check_number || null,
        p_bank_id: data.bank_id || null,
        p_notes: data.notes || null,
        p_created_by: userId,
        p_idempotency_key: null,
        p_account_id: null,
        p_cost_center_id: null,
        p_currency: 'QAR',
        p_initial_status: 'completed',
        p_registration_metadata: {},
      });

      if (rpcError) {
        throw new Error(`Atomic payment failed: ${rpcError.message}`);
      }

      const payment = await this.getById(paymentId);
      if (!payment) {
        throw new Error('Payment created but could not be retrieved');
      }

      this.log('createPayment', 'Payment created atomically', { paymentId: payment.id });
      return payment;
    } catch (error) {
      this.handleError('createPayment', error);
      throw error;
    }
  }

  /**
   * Smart matching: Find matching invoices/contracts for a payment
   */
  async findMatchingSuggestions(payment: Payment): Promise<PaymentMatchSuggestion[]> {
    try {
      this.log('findMatchingSuggestions', 'Finding matching suggestions', { paymentId: payment.id });
      const suggestions = await paymentLinkingService.findLinkingSuggestions(payment);

      return suggestions
        .filter((suggestion) => suggestion.targetType === 'invoice')
        .map((suggestion) => ({
          invoice_id: suggestion.targetId,
          invoice_number: suggestion.details.invoiceNumber || suggestion.targetId,
          amount: payment.amount,
          confidence: Math.round(suggestion.confidence * 100),
          reason: suggestion.reason,
          customer_id: payment.customer_id || undefined
        }));
    } catch (error) {
      this.handleError('findMatchingSuggestions', error);
      throw error;
    }
  }

  /**
   * Match payment to invoice/contract
   */
  async matchPayment(paymentId: string, targetType: 'invoice' | 'contract', targetId: string): Promise<PaymentMatchResult> {
    try {
      this.log('matchPayment', 'Matching payment', { paymentId, targetType, targetId });

      const result = await paymentLinkingService.manualLink(paymentId, targetType, targetId);

      return {
        success: result.success,
        payment_id: paymentId,
        invoice_id: result.success && targetType === 'invoice' ? targetId : undefined,
        confidence: Math.round(result.confidence * 100),
        message: result.success ? 'تم تخصيص الدفعة وحفظها بنجاح' : result.reason
      };
    } catch (error) {
      this.handleError('matchPayment', error);
      return {
        success: false,
        payment_id: paymentId,
        confidence: 0,
        message: error instanceof Error ? error.message : 'فشل ربط الدفعة'
      };
    }
  }

  /**
   * Get payment with full details
   */
  async getPaymentWithDetails(id: string): Promise<PaymentWithDetails | null> {
    return this.paymentRepo.findWithDetails(id);
  }

  /**
   * Get all payments with details
   */
  async getAllPaymentsWithDetails(companyId?: string): Promise<PaymentWithDetails[]> {
    return this.paymentRepo.findAllWithDetails(companyId);
  }

  /**
   * Get payments by company
   */
  async getByCompany(companyId: string): Promise<Payment[]> {
    return this.paymentRepo.findByCompany(companyId);
  }

  /**
   * Get unmatched payments
   */
  async getUnmatchedPayments(companyId?: string): Promise<Payment[]> {
    return this.paymentRepo.findUnmatched(companyId);
  }

  /**
   * Get payments by date range
   */
  async getByDateRange(startDate: string, endDate: string, companyId?: string): Promise<Payment[]> {
    return this.paymentRepo.findByDateRange(startDate, endDate, companyId);
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(companyId: string, startDate?: string, endDate?: string): Promise<{
    total: number;
    totalAmount: number;
    matched: number;
    unmatched: number;
    averageAmount: number;
  }> {
    const payments = startDate && endDate
      ? await this.getByDateRange(startDate, endDate, companyId)
      : await this.getByCompany(companyId);

    const stats = payments.reduce((acc, payment) => {
      acc.total++;
      acc.totalAmount += payment.amount;
      
      if (['allocated', 'partially_allocated', 'fully_allocated'].includes(payment.allocation_status || '')) {
        acc.matched++;
      } else {
        acc.unmatched++;
      }

      return acc;
    }, {
      total: 0,
      totalAmount: 0,
      matched: 0,
      unmatched: 0,
      averageAmount: 0
    });

    stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

    return stats;
  }

  // ============ Helper Methods ============

  private async validatePaymentData(data: PaymentCreationData): Promise<{ isValid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // CRITICAL: customer_id is required
    if (!data.customer_id) errors.push('customer_id is required for payment creation');
    
    if (!data.payment_date) errors.push('تاريخ الدفعة مطلوب');
    if (!data.amount || data.amount <= 0) errors.push('مبلغ الدفعة يجب أن يكون أكبر من صفر');
    if (!data.payment_method) errors.push('طريقة الدفع مطلوبة');

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async generatePaymentNumber(companyId: string): Promise<string> {
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.payment_number) {
      const match = data.payment_number.match(/\d+/);
      if (match) {
        const nextNumber = parseInt(match[0]) + 1;
        return `PAY-${nextNumber.toString().padStart(6, '0')}`;
      }
    }

    return 'PAY-000001';
  }

  // ============ Service Lifecycle Hooks ============

  protected async validate(data: Partial<Payment>): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};

    if (data.amount !== undefined && data.amount <= 0) {
      errors.amount = ['مبلغ الدفعة يجب أن يكون أكبر من صفر'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

