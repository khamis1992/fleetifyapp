/**
 * Invoice Service
 * 
 * Business logic layer for invoice operations.
 * Handles invoice creation, status management, and payment tracking.
 */

import { BaseService, type ValidationResult } from './core/BaseService';
import { InvoiceRepository } from './repositories/InvoiceRepository';
import type {
  Invoice,
  InvoiceCreationData,
  InvoiceWithDetails
} from '@/types/invoice';
import { supabase } from '@/integrations/supabase/client';

export class InvoiceService extends BaseService<Invoice> {
  private invoiceRepo: InvoiceRepository;

  constructor() {
    const repository = new InvoiceRepository();
    super(repository, 'InvoiceService');
    this.invoiceRepo = repository;
  }

  // ============ Public Methods ============

  /**
   * Create a new invoice
   */
  async createInvoice(
    data: InvoiceCreationData,
    userId: string,
    companyId: string
  ): Promise<Invoice> {
    try {
      this.log('createInvoice', 'Starting invoice creation', { userId, companyId });

      // Validate invoice data
      const validation = await this.validateInvoiceData(data);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(companyId);

      // Calculate total amount
      const totalAmount = data.amount + (data.tax_amount || 0) - (data.discount_amount || 0);

      // Prepare invoice data
      const invoiceData: Omit<Invoice, 'id'> = {
        company_id: companyId,
        customer_id: data.customer_id,
        contract_id: data.contract_id || null,
        invoice_number: invoiceNumber,
        invoice_date: data.invoice_date || new Date().toISOString(),
        due_date: data.due_date,
        amount: data.amount,
        paid_amount: 0,
        balance: totalAmount,
        status: 'pending',
        payment_status: 'unpaid',
        invoice_type: data.invoice_type || 'rental',
        description: data.description || null,
        notes: data.notes || null,
        reference_number: null,
        tax_amount: data.tax_amount || 0,
        discount_amount: data.discount_amount || 0,
        total_amount: totalAmount,
        currency: 'QAR',
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Create invoice
      const invoice = await this.invoiceRepo.create(invoiceData);

      this.log('createInvoice', 'Invoice created successfully', { invoiceId: invoice.id });
      return invoice;
    } catch (error) {
      this.handleError('createInvoice', error);
      throw error;
    }
  }

  /**
   * Get invoice with full details
   */
  async getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | null> {
    return this.invoiceRepo.findWithDetails(id);
  }

  /**
   * Get all invoices with details
   */
  async getAllInvoicesWithDetails(companyId?: string): Promise<InvoiceWithDetails[]> {
    return this.invoiceRepo.findAllWithDetails(companyId);
  }

  /**
   * Get invoices by company
   */
  async getByCompany(companyId: string): Promise<Invoice[]> {
    return this.invoiceRepo.findByCompany(companyId);
  }

  /**
   * Get pending invoices
   */
  async getPendingInvoices(companyId?: string): Promise<Invoice[]> {
    return this.invoiceRepo.findPending(companyId);
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(companyId?: string): Promise<Invoice[]> {
    return this.invoiceRepo.findOverdue(companyId);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string, paymentId: string, paidAmount: number): Promise<Invoice> {
    this.log('markAsPaid', 'Marking invoice as paid', { invoiceId, paymentId, paidAmount });

    // Update invoice
    const invoice = await this.invoiceRepo.markAsPaid(invoiceId, paidAmount);

    // TODO: Create journal entry for payment
    // TODO: Send notification

    return invoice;
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(id: string, status: Invoice['status']): Promise<Invoice> {
    this.log('updateInvoiceStatus', 'Updating invoice status', { id, status });

    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Invoice with id ${id} not found`);
    }

    return this.invoiceRepo.updateStatus(id, status);
  }

  /**
   * Calculate invoice statistics
   */
  async getInvoiceStats(companyId: string): Promise<{
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  }> {
    const invoices = await this.getByCompany(companyId);

    const stats = invoices.reduce((acc, invoice) => {
      acc.total++;
      acc.totalAmount += invoice.total_amount;
      acc.paidAmount += invoice.paid_amount || 0;

      switch (invoice.status) {
        case 'paid':
          acc.paid++;
          break;
        case 'pending':
        case 'partially_paid':
          acc.pending++;
          acc.pendingAmount += invoice.balance || invoice.total_amount;
          break;
        case 'overdue':
          acc.overdue++;
          acc.pendingAmount += invoice.balance || invoice.total_amount;
          break;
      }

      return acc;
    }, {
      total: 0,
      pending: 0,
      paid: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0
    });

    return stats;
  }

  /**
   * Check and update overdue invoices
   */
  async checkOverdueInvoices(companyId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .lt('due_date', today);

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return 0;
    }

    // Update all to overdue
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .in('id', overdueInvoices.map(i => i.id));

    if (error) {
      throw error;
    }

    this.log('checkOverdueInvoices', 'Updated overdue invoices', { count: overdueInvoices.length });
    return overdueInvoices.length;
  }

  // ============ Helper Methods ============

  private async validateInvoiceData(data: InvoiceCreationData): Promise<{ isValid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    if (!data.customer_id) errors.push('معرف العميل مطلوب');
    if (!data.due_date) errors.push('تاريخ الاستحقاق مطلوب');
    if (!data.amount || data.amount <= 0) errors.push('مبلغ الفاتورة يجب أن يكون أكبر من صفر');

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async generateInvoiceNumber(companyId: string): Promise<string> {
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.invoice_number) {
      const match = data.invoice_number.match(/\d+/);
      if (match) {
        const nextNumber = parseInt(match[0]) + 1;
        return `INV-${nextNumber.toString().padStart(6, '0')}`;
      }
    }

    return 'INV-000001';
  }

  // ============ Service Lifecycle Hooks ============

  protected async validate(data: Partial<Invoice>): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};

    if (data.amount !== undefined && data.amount <= 0) {
      errors.amount = ['مبلغ الفاتورة يجب أن يكون أكبر من صفر'];
    }

    if (data.total_amount !== undefined && data.total_amount <= 0) {
      errors.total_amount = ['المبلغ الإجمالي يجب أن يكون أكبر من صفر'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();

