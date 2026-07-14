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
      const companyId = await this.resolveCompanyId();
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
        .eq('company_id', companyId)
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
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const query = supabase
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
        .eq('company_id', effectiveCompanyId);

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
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const query = supabase
        .from('contracts')
        .select('*')
        .eq('status', status)
        .eq('company_id', effectiveCompanyId);

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
   * When cancelling a contract, automatically cancel all future unpaid invoices
   */
  async updateStatus(id: string, status: Contract['status']): Promise<Contract> {
    throw new Error(`Direct contract status updates are disabled (${id} -> ${status}). Use an approved contract lifecycle operation.`);
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
    throw new Error(`Direct contract payment totals are disabled (${id} -> ${paymentStatus}, ${totalPaid ?? 'unchanged'}, ${balanceDue ?? 'unchanged'}). Use canonical payment allocation.`);
  }

  /**
   * Find contracts expiring soon
   */
  async findExpiringSoon(days: number, companyId?: string): Promise<Contract[]> {
    try {
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const query = supabase
        .from('contracts')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString().split('T')[0]);

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
      const effectiveCompanyId = await this.resolveCompanyId(companyId);
      const query = supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', status)
        .eq('company_id', effectiveCompanyId);

      const { count, error } = await query;

      if (error) throw error;

      return count || 0;
    } catch (error) {
      throw error;
    }
  }
}

