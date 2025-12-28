/**
 * Contract Repository
 * 
 * Handles all database operations for contracts.
 */

import { BaseRepository } from '../core/BaseRepository';
import type { Contract, ContractWithCustomer } from '@/types/contracts';
import { supabase } from '@/integrations/supabase/client';

export class ContractRepository extends BaseRepository<Contract> {
  constructor() {
    super('contracts');
  }

  /**
   * Find contracts by company
   */
  async findByCompany(companyId: string): Promise<Contract[]> {
    return this.findWhere({ company_id: companyId } as Partial<Contract>);
  }

  /**
   * Find contracts by customer
   */
  async findByCustomer(customerId: string): Promise<Contract[]> {
    return this.findWhere({ customer_id: customerId } as Partial<Contract>);
  }

  /**
   * Find contracts with customer details
   */
  async findWithCustomer(id: string): Promise<ContractWithCustomer | null> {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data as ContractWithCustomer;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all contracts with customer details
   */
  async findAllWithCustomer(companyId?: string): Promise<ContractWithCustomer[]> {
    try {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          )
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as ContractWithCustomer[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find contracts by status
   */
  async findByStatus(status: Contract['status'], companyId?: string): Promise<Contract[]> {
    try {
      let query = supabase
        .from('contracts')
        .select('*')
        .eq('status', status);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Contract[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find active contracts
   */
  async findActive(companyId?: string): Promise<Contract[]> {
    return this.findByStatus('active', companyId);
  }

  /**
   * Find contracts by contract number
   */
  async findByContractNumber(contractNumber: string): Promise<Contract | null> {
    return this.findOne({ contract_number: contractNumber } as Partial<Contract>);
  }

  /**
   * Update contract status
   * When cancelling a contract, automatically delete FUTURE unpaid invoices only
   * Invoices during the contract period (even if unpaid) are legitimate dues and should remain
   */
  async updateStatus(id: string, status: Contract['status']): Promise<Contract> {
    // If cancelling the contract, delete only FUTURE unpaid invoices
    if (status === 'cancelled') {
      try {
        // Get current date (cancellation date)
        const cancellationDate = new Date().toISOString().split('T')[0];

        // First, get the count and details of FUTURE unpaid invoices only
        const { data: futureUnpaidInvoices, error: countError } = await supabase
          .from('invoices')
          .select('id, invoice_number, balance_due, due_date')
          .eq('contract_id', id)
          .eq('payment_status', 'unpaid')
          .gt('due_date', cancellationDate);  // Only invoices AFTER cancellation date

        if (countError) {
          console.error('Error fetching future unpaid invoices:', countError);
        }

        const invoiceCount = futureUnpaidInvoices?.length || 0;
        const totalAmount = futureUnpaidInvoices?.reduce((sum, inv) => sum + (inv.balance_due || 0), 0) || 0;

        // Delete only FUTURE unpaid invoices
        const { error: deleteError } = await supabase
          .from('invoices')
          .delete()
          .eq('contract_id', id)
          .eq('payment_status', 'unpaid')
          .gt('due_date', cancellationDate);  // Only invoices AFTER cancellation date

        if (deleteError) {
          console.error('Error deleting future unpaid invoices:', deleteError);
          // Continue with status update even if invoice deletion fails
        } else if (invoiceCount > 0) {
          // Log the deletion to audit_logs
          try {
            const { data: contract } = await supabase
              .from('contracts')
              .select('contract_number')
              .eq('id', id)
              .single();

            await supabase
              .from('audit_logs')
              .insert({
                action: 'DELETE_FUTURE_INVOICES',
                resource_type: 'invoice',
                resource_id: id,
                entity_name: `Future invoices for contract ${contract?.contract_number || id}`,
                changes_summary: `Deleted ${invoiceCount} future unpaid invoices after ${cancellationDate} (total: ${totalAmount.toFixed(2)})`,
                metadata: {
                  contract_id: id,
                  contract_number: contract?.contract_number,
                  deleted_count: invoiceCount,
                  total_amount: totalAmount,
                  cancellation_date: cancellationDate,
                  reason: 'Contract cancelled - removed future invoices only',
                  invoice_numbers: futureUnpaidInvoices?.map(inv => inv.invoice_number),
                  note: 'Unpaid invoices during contract period are retained as legitimate dues'
                },
                severity: 'medium',
                status: 'completed'
              });

            console.log(`Successfully deleted ${invoiceCount} future unpaid invoices for contract ${contract?.contract_number}`);
          } catch (auditError) {
            console.error('Error logging audit:', auditError);
            // Continue even if audit logging fails
          }
        }
      } catch (error) {
        console.error('Error in future invoice cleanup:', error);
        // Continue with status update even if invoice deletion fails
      }
    }

    return this.update(id, { status } as Partial<Contract>);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: Contract['payment_status'],
    totalPaid?: number,
    balanceDue?: number
  ): Promise<Contract> {
    const updateData: Partial<Contract> = { payment_status: paymentStatus };
    
    if (totalPaid !== undefined) {
      updateData.total_paid = totalPaid;
    }
    
    if (balanceDue !== undefined) {
      updateData.balance_due = balanceDue;
    }

    return this.update(id, updateData);
  }

  /**
   * Find contracts expiring soon
   */
  async findExpiringSoon(days: number, companyId?: string): Promise<Contract[]> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      let query = supabase
        .from('contracts')
        .select('*')
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString().split('T')[0]);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as Contract[];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Count contracts by status
   */
  async countByStatus(status: Contract['status'], companyId?: string): Promise<number> {
    try {
      let query = supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      throw error;
    }
  }
}

