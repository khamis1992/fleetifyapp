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
import { logger } from '@/lib/logger';

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

      // Generate payment number if not provided
      const paymentNumber = await this.generatePaymentNumber(companyId);

      // Prepare payment data
      const paymentData: Omit<Payment, 'id'> = {
        company_id: companyId,
        customer_id: data.customer_id || null,
        contract_id: data.contract_id || null,
        invoice_id: data.invoice_id || null,
        payment_number: paymentNumber,
        payment_date: data.payment_date,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_type: data.payment_type || 'regular',
        payment_status: 'completed',
        transaction_type: data.transaction_type || 'income',
        reference_number: data.reference_number || null,
        agreement_number: data.agreement_number || null,
        check_number: data.check_number || null,
        bank_id: data.bank_id || null,
        bank_account: null,
        account_id: null,
        cost_center_id: null,
        journal_entry_id: null,
        currency: 'QAR',
        notes: data.notes || null,
        description_type: null,
        allocation_status: null,
        reconciliation_status: null,
        processing_status: null,
        processing_notes: null,
        linking_confidence: null,
        due_date: null,
        original_due_date: null,
        late_fine_amount: null,
        late_fine_days_overdue: null,
        late_fine_type: null,
        late_fine_status: null,
        late_fine_waiver_reason: null,
        vendor_id: null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create payment
      const payment = await this.paymentRepo.create(paymentData);

      // Try auto-matching if not already linked
      if (!payment.invoice_id && !payment.contract_id) {
        try {
          // Use centralized PaymentLinkingService
          const { paymentLinkingService } = await import('./PaymentLinkingService');
          const result = await paymentLinkingService.linkPayment(payment.id, { autoLink: true });
          
          if (result.success) {
            this.log('createPayment', 'Auto-linked payment successfully', {
              paymentId: payment.id,
              linkedTo: result.linkedTo,
              confidence: result.confidence
            });
          } else {
            this.log('createPayment', 'Auto-linking failed', {
              paymentId: payment.id,
              reason: result.reason
            });
          }
        } catch (error) {
          logger.warn('Auto-match failed, manual matching may be required', error);
        }
      }

      this.log('createPayment', 'Payment created successfully', { paymentId: payment.id });
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

      const suggestions: PaymentMatchSuggestion[] = [];

      // Match by amount (within 5% tolerance)
      const amountMatches = await this.findByAmountMatch(payment);
      suggestions.push(...amountMatches);

      // Match by reference number
      if (payment.reference_number || payment.agreement_number) {
        const referenceMatches = await this.findByReferenceMatch(payment);
        suggestions.push(...referenceMatches);
      }

      // Match by customer and date
      if (payment.customer_id) {
        const customerMatches = await this.findByCustomerAndDate(payment);
        suggestions.push(...customerMatches);
      }

      // Sort by confidence score (highest first)
      return this.rankSuggestions(suggestions);
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

      const payment = await this.getById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (targetType === 'invoice') {
        await this.paymentRepo.linkToInvoice(paymentId, targetId);
      } else {
        await this.paymentRepo.linkToContract(paymentId, targetId);
      }

      return {
        success: true,
        payment_id: paymentId,
        invoice_id: targetType === 'invoice' ? targetId : undefined,
        confidence: 100,
        message: 'تم ربط الدفعة بنجاح'
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
      
      if (payment.invoice_id || payment.contract_id) {
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

  // ============ Smart Matching Helper Methods ============

  private async attemptAutoMatch(payment: Payment): Promise<void> {
    const suggestions = await this.findMatchingSuggestions(payment);
    
    // Auto-match if confidence > 85%
    const highConfidenceMatch = suggestions.find(s => s.confidence > 85);
    
    if (highConfidenceMatch) {
      await this.paymentRepo.linkToInvoice(payment.id, highConfidenceMatch.invoice_id);
      this.log('attemptAutoMatch', 'Auto-matched payment', {
        paymentId: payment.id,
        invoiceId: highConfidenceMatch.invoice_id,
        confidence: highConfidenceMatch.confidence
      });
    }
  }

  private async findByAmountMatch(payment: Payment): Promise<PaymentMatchSuggestion[]> {
    try {
      const tolerance = payment.amount * 0.05; // 5% tolerance
      
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, customer_id, contract_id')
        .eq('company_id', payment.company_id)
        .eq('status', 'pending')
        .gte('amount', payment.amount - tolerance)
        .lte('amount', payment.amount + tolerance);

      if (!invoices) return [];

      return invoices.map(invoice => ({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        confidence: this.calculateConfidence(payment, invoice, 'amount'),
        reason: 'مطابقة المبلغ',
        customer_id: invoice.customer_id,
        contract_id: invoice.contract_id
      }));
    } catch (error) {
      logger.error('Amount matching failed', error);
      return [];
    }
  }

  private async findByReferenceMatch(payment: Payment): Promise<PaymentMatchSuggestion[]> {
    try {
      const reference = payment.reference_number || payment.agreement_number;
      if (!reference) return [];

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, customer_id, contract_id')
        .eq('company_id', payment.company_id)
        .eq('status', 'pending')
        .or(`invoice_number.ilike.%${reference}%,reference_number.ilike.%${reference}%`);

      if (!invoices) return [];

      return invoices.map(invoice => ({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        confidence: this.calculateConfidence(payment, invoice, 'reference'),
        reason: 'مطابقة الرقم المرجعي',
        customer_id: invoice.customer_id,
        contract_id: invoice.contract_id
      }));
    } catch (error) {
      logger.error('Reference matching failed', error);
      return [];
    }
  }

  private async findByCustomerAndDate(payment: Payment): Promise<PaymentMatchSuggestion[]> {
    try {
      if (!payment.customer_id) return [];

      const paymentDate = new Date(payment.payment_date);
      const dateTolerance = 7; // days
      const startDate = new Date(paymentDate);
      startDate.setDate(startDate.getDate() - dateTolerance);
      const endDate = new Date(paymentDate);
      endDate.setDate(endDate.getDate() + dateTolerance);

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_number, amount, customer_id, contract_id, due_date')
        .eq('company_id', payment.company_id)
        .eq('customer_id', payment.customer_id)
        .eq('status', 'pending')
        .gte('due_date', startDate.toISOString())
        .lte('due_date', endDate.toISOString());

      if (!invoices) return [];

      return invoices.map(invoice => ({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        confidence: this.calculateConfidence(payment, invoice, 'customer'),
        reason: 'مطابقة العميل والتاريخ',
        customer_id: invoice.customer_id,
        contract_id: invoice.contract_id
      }));
    } catch (error) {
      logger.error('Customer/date matching failed', error);
      return [];
    }
  }

  private calculateConfidence(
    payment: Payment,
    invoice: any,
    matchType: 'amount' | 'reference' | 'customer'
  ): number {
    let confidence = 0;

    // Amount match (0-40 points)
    const amountDiff = Math.abs(payment.amount - invoice.amount);
    const amountScore = Math.max(0, 40 - (amountDiff / payment.amount * 100));
    confidence += amountScore;

    // Customer match (0-30 points)
    if (payment.customer_id && payment.customer_id === invoice.customer_id) {
      confidence += 30;
    }

    // Reference match (0-30 points)
    if (matchType === 'reference') {
      confidence += 30;
    }

    return Math.min(100, Math.round(confidence));
  }

  private rankSuggestions(suggestions: PaymentMatchSuggestion[]): PaymentMatchSuggestion[] {
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10); // Return top 10 suggestions
  }

  // ============ Helper Methods ============

  private async validatePaymentData(data: PaymentCreationData): Promise<{ isValid: boolean; errors?: string[] }> {
    const errors: string[] = [];

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

