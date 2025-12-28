/**
 * Contract Audit Service
 * 
 * Provides periodic checks and audits for contract-invoice consistency
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface ContractInvoiceInconsistency {
  contract_id: string;
  contract_number: string;
  contract_status: string;
  unpaid_invoices_count: number;
  total_unpaid_amount: number;
}

export interface AuditResult {
  timestamp: string;
  inconsistencies_found: number;
  inconsistencies: ContractInvoiceInconsistency[];
  auto_fixed: number;
  errors: string[];
}

export class ContractAuditService {
  /**
   * Audit contract-invoice consistency
   * Checks for cancelled contracts with unpaid invoices
   */
  async auditContractInvoiceConsistency(autoFix: boolean = false): Promise<AuditResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    let autoFixed = 0;

    try {
      logger.info('Starting contract-invoice consistency audit', { autoFix });

      // Find cancelled contracts with unpaid invoices
      const { data: inconsistencies, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          invoices!inner (
            id,
            payment_status,
            balance_due
          )
        `)
        .eq('status', 'cancelled')
        .eq('invoices.payment_status', 'unpaid');

      if (error) {
        logger.error('Error fetching inconsistencies', { error });
        errors.push(`Database error: ${error.message}`);
        return {
          timestamp,
          inconsistencies_found: 0,
          inconsistencies: [],
          auto_fixed: 0,
          errors
        };
      }

      // Process inconsistencies
      const processedInconsistencies: ContractInvoiceInconsistency[] = [];
      
      if (inconsistencies && inconsistencies.length > 0) {
        for (const contract of inconsistencies) {
          const invoices = Array.isArray(contract.invoices) ? contract.invoices : [contract.invoices];
          const unpaidInvoices = invoices.filter((inv: any) => inv.payment_status === 'unpaid');
          
          const inconsistency: ContractInvoiceInconsistency = {
            contract_id: contract.id,
            contract_number: contract.contract_number,
            contract_status: contract.status,
            unpaid_invoices_count: unpaidInvoices.length,
            total_unpaid_amount: unpaidInvoices.reduce((sum: number, inv: any) => sum + (inv.balance_due || 0), 0)
          };

          processedInconsistencies.push(inconsistency);

          // Auto-fix if enabled
          if (autoFix) {
            try {
              const { error: deleteError } = await supabase
                .from('invoices')
                .delete()
                .eq('contract_id', contract.id)
                .eq('payment_status', 'unpaid');

              if (deleteError) {
                logger.error('Error auto-fixing inconsistency', { 
                  contract_id: contract.id, 
                  error: deleteError 
                });
                errors.push(`Failed to fix ${contract.contract_number}: ${deleteError.message}`);
              } else {
                autoFixed++;
                logger.info('Auto-fixed inconsistency', { 
                  contract_id: contract.id,
                  contract_number: contract.contract_number,
                  deleted_invoices: unpaidInvoices.length
                });
              }
            } catch (fixError) {
              logger.error('Exception during auto-fix', { 
                contract_id: contract.id, 
                error: fixError 
              });
              errors.push(`Exception fixing ${contract.contract_number}: ${fixError}`);
            }
          }
        }
      }

      const result: AuditResult = {
        timestamp,
        inconsistencies_found: processedInconsistencies.length,
        inconsistencies: processedInconsistencies,
        auto_fixed: autoFixed,
        errors
      };

      logger.info('Audit completed', { 
        inconsistencies_found: result.inconsistencies_found,
        auto_fixed: result.auto_fixed,
        errors_count: errors.length
      });

      return result;
    } catch (error) {
      logger.error('Audit failed', { error });
      errors.push(`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        timestamp,
        inconsistencies_found: 0,
        inconsistencies: [],
        auto_fixed: 0,
        errors
      };
    }
  }

  /**
   * Check for vehicles with multiple active contracts
   */
  async auditVehicleContracts(): Promise<{
    timestamp: string;
    vehicles_with_multiple_contracts: Array<{
      vehicle_id: string;
      active_contracts: Array<{
        contract_id: string;
        contract_number: string;
      }>;
    }>;
  }> {
    const timestamp = new Date().toISOString();

    try {
      logger.info('Starting vehicle contracts audit');

      const { data, error } = await supabase
        .from('contracts')
        .select('id, contract_number, vehicle_id')
        .eq('status', 'active')
        .not('vehicle_id', 'is', null);

      if (error) {
        logger.error('Error fetching vehicle contracts', { error });
        return {
          timestamp,
          vehicles_with_multiple_contracts: []
        };
      }

      // Group by vehicle_id
      const vehicleMap = new Map<string, Array<{ contract_id: string; contract_number: string }>>();
      
      data?.forEach(contract => {
        if (!contract.vehicle_id) return;
        
        if (!vehicleMap.has(contract.vehicle_id)) {
          vehicleMap.set(contract.vehicle_id, []);
        }
        
        vehicleMap.get(contract.vehicle_id)!.push({
          contract_id: contract.id,
          contract_number: contract.contract_number
        });
      });

      // Find vehicles with multiple active contracts
      const vehiclesWithMultipleContracts = Array.from(vehicleMap.entries())
        .filter(([_, contracts]) => contracts.length > 1)
        .map(([vehicle_id, active_contracts]) => ({
          vehicle_id,
          active_contracts
        }));

      logger.info('Vehicle contracts audit completed', {
        vehicles_with_issues: vehiclesWithMultipleContracts.length
      });

      return {
        timestamp,
        vehicles_with_multiple_contracts: vehiclesWithMultipleContracts
      };
    } catch (error) {
      logger.error('Vehicle contracts audit failed', { error });
      return {
        timestamp,
        vehicles_with_multiple_contracts: []
      };
    }
  }

  /**
   * Run all audits
   */
  async runAllAudits(autoFix: boolean = false): Promise<{
    contract_invoice_audit: AuditResult;
    vehicle_contracts_audit: Awaited<ReturnType<typeof this.auditVehicleContracts>>;
  }> {
    logger.info('Running all audits', { autoFix });

    const [contractInvoiceAudit, vehicleContractsAudit] = await Promise.all([
      this.auditContractInvoiceConsistency(autoFix),
      this.auditVehicleContracts()
    ]);

    return {
      contract_invoice_audit: contractInvoiceAudit,
      vehicle_contracts_audit: vehicleContractsAudit
    };
  }
}

// Export singleton instance
export const contractAuditService = new ContractAuditService();
