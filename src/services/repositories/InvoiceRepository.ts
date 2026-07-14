/**
 * Invoice Repository
 * 
 * Handles all database operations for invoices.
 */

import { BaseRepository } from '../core/BaseRepository';
import type { Invoice, InvoiceInsert, InvoiceWithDetails } from '@/types/invoice';
import { supabase } from '@/integrations/supabase/client';

export class InvoiceRepository extends BaseRepository<Invoice> {
  constructor() {
    super('invoices');
  }

  async create(data: InvoiceInsert | Omit<Invoice, 'id'>): Promise<Invoice> {
    const { data: result, error } = await supabase
      .from('invoices')
      .insert(data as InvoiceInsert)
      .select()
      .single();

    if (error) throw error;
    if (!result) throw new Error('No invoice returned from insert');
    return result;
  }

  /**
   * Find invoices by company
   */
  async findByCompany(companyId: string): Promise<Invoice[]> {
    return this.findWhere({ company_id: companyId } as Partial<Invoice>);
  }

  /**
   * Find invoices by customer
   */
  async findByCustomer(customerId: string): Promise<Invoice[]> {
    return this.findWhere({ customer_id: customerId } as Partial<Invoice>);
  }

  /**
   * Find invoices by contract
   */
  async findByContract(contractId: string): Promise<Invoice[]> {
    return this.findWhere({ contract_id: contractId } as Partial<Invoice>);
  }

  /**
   * Find invoice with full details
   */
  async findWithDetails(id: string): Promise<InvoiceWithDetails | null> {
    try {
      const companyId = await this.resolveCompanyId();
      const { data, error } = await supabase
        .from('invoices')
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
        .eq('company_id', companyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as InvoiceWithDetails;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all invoices with details
   */
  async findAllWithDetails(companyId?: string): Promise<InvoiceWithDetails[]> {
    try {
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const query = supabase
        .from('invoices')
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
        .eq('company_id', effectiveCompanyId);

      const { data, error } = await query.order('invoice_date', { ascending: false });

      if (error) throw error;

      return (data || []) as InvoiceWithDetails[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find invoices by status
   */
  async findByStatus(status: Invoice['status'], companyId?: string): Promise<Invoice[]> {
    try {
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const query = supabase
        .from('invoices')
        .select('*')
        .eq('status', status)
        .eq('company_id', effectiveCompanyId);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Invoice[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find pending invoices
   */
  async findPending(companyId?: string): Promise<Invoice[]> {
    return this.findByStatus('pending', companyId);
  }

  /**
   * Find overdue invoices
   */
  async findOverdue(companyId?: string): Promise<Invoice[]> {
    try {
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const query = supabase
        .from('invoices')
        .select('*')
        .eq('status', 'overdue')
        .eq('company_id', effectiveCompanyId);

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Invoice[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return this.findOne({ invoice_number: invoiceNumber } as Partial<Invoice>);
  }

  /**
   * Update invoice status
   */
  async updateStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    if (['paid', 'partially_paid', 'cancelled', 'void'].includes(status)) {
      throw new Error(`Direct financial invoice status updates are disabled (${id} -> ${status}). Use the payment or cancellation workflow.`);
    }
    return this.update(id, { status } as Partial<Invoice>);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string, paidAmount: number): Promise<Invoice> {
    throw new Error(`Direct mark-as-paid is disabled (${id}, ${paidAmount}). Record and allocate a payment through the canonical workflow.`);
  }
}

