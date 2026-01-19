/**
 * Contract Service
 * 
 * Business logic layer for contract operations.
 * Handles contract creation, validation, and lifecycle management.
 */

import { BaseService, type ValidationResult } from './core/BaseService';
import { ContractRepository } from './repositories/ContractRepository';
import type { 
  Contract, 
  ContractCreationData,
  ContractCreationResult,
  ContractValidationResult,
  ContractWithCustomer 
} from '@/types/contracts';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export class ContractService extends BaseService<Contract> {
  private contractRepo: ContractRepository;

  constructor() {
    const repository = new ContractRepository();
    super(repository, 'ContractService');
    this.contractRepo = repository;
  }

  // ============ Public Methods ============

  /**
   * Create a new contract with full business logic
   * Simplified from 6 steps to 3 steps
   */
  async createContract(data: ContractCreationData, userId: string, companyId: string): Promise<ContractCreationResult> {
    try {
      this.log('createContract', 'Starting contract creation', { userId, companyId });

      // Phase 1: Validate and Prepare (combines old steps 1 & 2)
      await this.validateAndPrepare(data, companyId);

      // Phase 2: Create and Activate (combines old steps 3 & 4)
      const contract = await this.createAndActivate(data, userId, companyId);

      // Phase 3: Verify and Complete (combines old steps 5 & 6)
      await this.verifyAndComplete(contract);

      this.log('createContract', 'Contract created successfully', { contractId: contract.id });

      return {
        success: true,
        contract_id: contract.id,
        contract_number: contract.contract_number,
        journal_entry_id: contract.journal_entry_id || undefined
      };
    } catch (error) {
      this.handleError('createContract', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'فشل إنشاء العقد',
        errors: [error instanceof Error ? error.message : 'فشل إنشاء العقد']
      };
    }
  }

  /**
   * Get contract with customer details
   */
  async getContractWithCustomer(id: string): Promise<ContractWithCustomer | null> {
    return this.contractRepo.findWithCustomer(id);
  }

  /**
   * Get all contracts with customer details
   */
  async getAllContractsWithCustomer(companyId?: string): Promise<ContractWithCustomer[]> {
    return this.contractRepo.findAllWithCustomer(companyId);
  }

  /**
   * Get contracts by company
   */
  async getByCompany(companyId: string): Promise<Contract[]> {
    return this.contractRepo.findByCompany(companyId);
  }

  /**
   * Get active contracts
   */
  async getActiveContracts(companyId?: string): Promise<Contract[]> {
    return this.contractRepo.findActive(companyId);
  }

  /**
   * Get contracts expiring soon
   */
  async getExpiringSoon(days: number, companyId?: string): Promise<Contract[]> {
    return this.contractRepo.findExpiringSoon(days, companyId);
  }

  /**
   * Update contract status
   */
  async updateContractStatus(id: string, status: Contract['status']): Promise<Contract> {
    this.log('updateContractStatus', 'Updating contract status', { id, status });
    
    // Verify contract exists
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Contract with id ${id} not found`);
    }

    return this.contractRepo.updateStatus(id, status);
  }

  /**
   * Calculate contract statistics
   */
  async getContractStats(companyId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    draft: number;
    totalRevenue: number;
  }> {
    const contracts = await this.getByCompany(companyId);

    const stats = contracts.reduce((acc, contract) => {
      acc.total++;
      
      switch (contract.status) {
        case 'active':
          acc.active++;
          break;
        case 'expired':
          acc.expired++;
          break;
        case 'draft':
          acc.draft++;
          break;
      }

      if (contract.contract_amount) {
        acc.totalRevenue += contract.contract_amount;
      }

      return acc;
    }, {
      total: 0,
      active: 0,
      expired: 0,
      draft: 0,
      totalRevenue: 0
    });

    return stats;
  }

  // ============ Phase 1: Validate and Prepare ============

  private async validateAndPrepare(data: ContractCreationData, companyId: string): Promise<void> {
    this.log('validateAndPrepare', 'Starting validation');

    // Validate contract data
    const validation = await this.validateContractData(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Verify customer exists and belongs to company
    await this.verifyCustomer(data.customer_id, companyId);

    // Verify vehicle if provided
    if (data.vehicle_id) {
      await this.verifyVehicle(data.vehicle_id, companyId);
    }

    // Check account mapping exists
    const hasMapping = await this.checkAccountMapping(companyId);
    if (!hasMapping) {
      logger.warn('Account mapping not configured, journal entry will not be created');
    }

    this.log('validateAndPrepare', 'Validation completed successfully');
  }

  // ============ Phase 2: Create and Activate ============

  private async createAndActivate(
    data: ContractCreationData, 
    userId: string, 
    companyId: string
  ): Promise<Contract> {
    this.log('createAndActivate', 'Starting creation');

    // Generate contract number if not provided
    const contractNumber = data.contract_number || await this.generateContractNumber(companyId);

    // Prepare contract data
    const contractData: Omit<Contract, 'id'> = {
      company_id: companyId,
      customer_id: data.customer_id,
      vehicle_id: data.vehicle_id || null,
      contract_number: contractNumber,
      contract_type: data.contract_type,
      contract_date: data.contract_date || new Date().toISOString(),
      start_date: data.start_date,
      end_date: data.end_date,
      contract_amount: data.contract_amount,
      monthly_amount: data.monthly_amount || data.contract_amount,
      description: data.description || null,
      terms: data.terms || null,
      status: 'active', // Activated immediately
      created_by: userId,
      cost_center_id: data.cost_center_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_paid: 0,
      balance_due: data.contract_amount,
      payment_status: 'unpaid'
    };

    // Create contract in database
    const contract = await this.contractRepo.create(contractData);

    // Try to create journal entry (non-blocking)
    try {
      const journalEntryId = await this.createJournalEntry(contract);
      if (journalEntryId) {
        // Update contract with journal entry ID
        const updated = await this.contractRepo.update(contract.id, {
          journal_entry_id: journalEntryId
        } as Partial<Contract>);
        
        this.log('createAndActivate', 'Journal entry created', { journalEntryId });
        return updated;
      }
    } catch (error) {
      logger.warn('Failed to create journal entry, continuing...', error);
    }

    this.log('createAndActivate', 'Contract created', { contractId: contract.id });
    return contract;
  }

  // ============ Phase 3: Verify and Complete ============

  private async verifyAndComplete(contract: Contract): Promise<void> {
    this.log('verifyAndComplete', 'Starting verification', { contractId: contract.id });

    // Verify contract was created correctly
    const created = await this.getById(contract.id);
    if (!created) {
      throw new Error('Contract verification failed: Contract not found after creation');
    }

    // Verify journal entry if it was created
    if (contract.journal_entry_id) {
      const journalExists = await this.verifyJournalEntry(contract.journal_entry_id);
      if (!journalExists) {
        logger.warn('Journal entry not found, may need manual creation', {
          contractId: contract.id,
          journalEntryId: contract.journal_entry_id
        });
      }
    }

    // TODO: Send notifications (implement in future)
    // await this.sendContractNotifications(contract);

    // TODO: Update company statistics (implement in future)
    // await this.updateCompanyStats(contract.company_id);

    this.log('verifyAndComplete', 'Verification completed successfully', { contractId: contract.id });
  }

  // ============ Helper Methods ============

  private async validateContractData(data: ContractCreationData): Promise<ContractValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.customer_id) errors.push('معرف العميل مطلوب');
    if (!data.contract_type) errors.push('نوع العقد مطلوب');
    if (!data.start_date) errors.push('تاريخ البداية مطلوب');
    if (!data.end_date) errors.push('تاريخ النهاية مطلوب');
    if (!data.contract_amount || data.contract_amount <= 0) errors.push('مبلغ العقد يجب أن يكون أكبر من صفر');

    // Date validation
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate <= startDate) {
        errors.push('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async verifyCustomer(customerId: string, companyId: string): Promise<void> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, company_id')
      .eq('id', customerId)
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      throw new Error('العميل غير موجود أو لا ينتمي لهذه الشركة');
    }
  }

  private async verifyVehicle(vehicleId: string, companyId: string): Promise<void> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, company_id, status')
      .eq('id', vehicleId)
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      throw new Error('المركبة غير موجودة أو لا تنتمي لهذه الشركة');
    }

    if (data.status !== 'available') {
      logger.warn('Vehicle is not available', { vehicleId, status: data.status });
    }

    // Check if there's an active contract for this vehicle
    const { data: activeContracts, error: contractError } = await supabase
      .from('contracts')
      .select('id, contract_number, status')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .limit(1);

    if (contractError) {
      logger.error('Error checking active contracts', { vehicleId, error: contractError });
    }

    if (activeContracts && activeContracts.length > 0) {
      const activeContract = activeContracts[0];
      throw new Error(
        `لا يمكن إنشاء عقد جديد. المركبة لديها عقد نشط برقم ${activeContract.contract_number}. يرجى إلغاء العقد القديم أولاً.`
      );
    }
  }

  private async checkAccountMapping(companyId: string): Promise<boolean> {
    const { data } = await supabase
      .from('company_account_mappings')
      .select('id')
      .eq('company_id', companyId)
      .limit(1)
      .single();

    return !!data;
  }

  private async generateContractNumber(companyId: string): Promise<string> {
    // Get the last contract number for this company
    const { data } = await supabase
      .from('contracts')
      .select('contract_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data?.contract_number) {
      // Extract number and increment
      const match = data.contract_number.match(/\d+/);
      if (match) {
        const nextNumber = parseInt(match[0]) + 1;
        return `CON-${nextNumber.toString().padStart(6, '0')}`;
      }
    }

    // Default first contract number
    return 'CON-000001';
  }

  private async createJournalEntry(contract: Contract): Promise<string | null> {
    // TODO: Implement journal entry creation
    // This will be implemented when integrating with the accounting system
    logger.info('Journal entry creation not yet implemented');
    return null;
  }

  private async verifyJournalEntry(journalEntryId: string): Promise<boolean> {
    const { data } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', journalEntryId)
      .single();

    return !!data;
  }

  // ============ Service Lifecycle Hooks ============

  protected async beforeCreate(data: Omit<Contract, 'id'>): Promise<Omit<Contract, 'id'>> {
    // Ensure timestamps
    return {
      ...data,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  protected async afterCreate(contract: Contract): Promise<void> {
    this.log('afterCreate', 'Contract created successfully', { id: contract.id });
  }

  protected async validate(data: Partial<Contract>): Promise<ValidationResult> {
    const errors: Record<string, string[]> = {};

    if (data.contract_amount !== undefined && data.contract_amount <= 0) {
      errors.contract_amount = ['مبلغ العقد يجب أن يكون أكبر من صفر'];
    }

    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      
      if (endDate <= startDate) {
        errors.dates = ['تاريخ النهاية يجب أن يكون بعد تاريخ البداية'];
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    };
  }
}

// Export singleton instance
export const contractService = new ContractService();

