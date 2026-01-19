/**
 * Payment Repository
 * 
 * Handles all database operations for payments.
 */

import { BaseRepository } from '../core/BaseRepository';
import type { Payment, PaymentWithDetails } from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';

export class PaymentRepository extends BaseRepository<Payment> {
  constructor() {
    super('payments');
  }

  /**
   * Find payments by company
   */
  async findByCompany(companyId: string): Promise<Payment[]> {
    return this.findWhere({ company_id: companyId } as Partial<Payment>);
  }

  /**
   * Find payments by customer
   */
  async findByCustomer(customerId: string): Promise<Payment[]> {
    return this.findWhere({ customer_id: customerId } as Partial<Payment>);
  }

  /**
   * Find payments by contract
   */
  async findByContract(contractId: string): Promise<Payment[]> {
    return this.findWhere({ contract_id: contractId } as Partial<Payment>);
  }

  /**
   * Find payments by invoice
   */
  async findByInvoice(invoiceId: string): Promise<Payment[]> {
    return this.findWhere({ invoice_id: invoiceId } as Partial<Payment>);
  }

  /**
   * Find payment with full details
   */
  async findWithDetails(id: string): Promise<PaymentWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer:customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          ),
          contract:contracts (
            id,
            contract_number,
            contract_type,
            status
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as PaymentWithDetails;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all payments with details
   */
  async findAllWithDetails(companyId?: string): Promise<PaymentWithDetails[]> {
    try {
      let query = supabase
        .from('payments')
        .select(`
          *,
          customer:customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          ),
          contract:contracts (
            id,
            contract_number,
            contract_type,
            status
          )
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });

      if (error) throw error;

      return (data || []) as PaymentWithDetails[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find payments by status
   */
  async findByStatus(status: Payment['payment_status'], companyId?: string): Promise<Payment[]> {
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .eq('payment_status', status);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Payment[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find unmatched payments (no invoice_id or contract_id)
   */
  async findUnmatched(companyId?: string): Promise<Payment[]> {
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .or('invoice_id.is.null,contract_id.is.null');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Payment[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find payments by payment number
   */
  async findByPaymentNumber(paymentNumber: string): Promise<Payment | null> {
    return this.findOne({ payment_number: paymentNumber } as Partial<Payment>);
  }

  /**
   * Find payments by date range
   */
  async findByDateRange(startDate: string, endDate: string, companyId?: string): Promise<Payment[]> {
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query.order('payment_date', { ascending: false });

      if (error) throw error;

      return (data || []) as Payment[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get total amount by date range
   */
  async getTotalAmount(startDate: string, endDate: string, companyId?: string): Promise<number> {
    try {
      const payments = await this.findByDateRange(startDate, endDate, companyId);
      return payments.reduce((total, payment) => total + payment.amount, 0);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update payment status
   */
  async updateStatus(id: string, status: Payment['payment_status']): Promise<Payment> {
    return this.update(id, { payment_status: status } as Partial<Payment>);
  }

  /**
   * Link payment to invoice
   */
  async linkToInvoice(id: string, invoiceId: string): Promise<Payment> {
    return this.update(id, {
      invoice_id: invoiceId,
      allocation_status: 'allocated'
    } as Partial<Payment>);
  }

  /**
   * Link payment to contract
   */
  async linkToContract(id: string, contractId: string): Promise<Payment> {
    return this.update(id, {
      contract_id: contractId,
      allocation_status: 'allocated'
    } as Partial<Payment>);
  }
}

