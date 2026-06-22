import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import type { DuplicateContract } from './useContractDuplicateCheck';

export interface ContractData {
  contract_number?: string;
  customer_id?: string;
  vehicle_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface ImprovedDuplicateCheckResult {
  /** Exact match (same contract number) */
  exactMatches: DuplicateContract[];

  /** Similar matches (overlapping dates, same customer/vehicle) */
  similarMatches: DuplicateContract[];

  /** All matches combined */
  allMatches: DuplicateContract[];

  /** Whether there are any duplicates */
  hasDuplicates: boolean;

  /** Whether this is an exact match (should block unless user overrides) */
  isExactMatch: boolean;

  /** Total count of duplicates */
  count: number;
}

/**
 * Improved Contract Duplicate Check Hook
 *
 * Detects duplicates more intelligently:
 * - Exact matches: Same contract number (blocks by default)
 * - Similar matches: Overlapping dates, same customer/vehicle (suggestions)
 * - Only blocks on exact matches
 * - Allows users to dismiss similar match suggestions
 */
export const useImprovedContractDuplicateCheck = (
  contractData: ContractData,
  enabled: boolean = true
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['improved-contract-duplicate-check', companyId, contractData],
    queryFn: async (): Promise<ImprovedDuplicateCheckResult> => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      // If no data to check, return empty result
      if (!contractData.contract_number && !contractData.customer_id && !contractData.vehicle_id) {
        return {
          exactMatches: [],
          similarMatches: [],
          allMatches: [],
          hasDuplicates: false,
          isExactMatch: false,
          count: 0
        };
      }

      console.log('🔍 [IMPROVED_DUPLICATE_CHECK] Searching with:', {
        companyId,
        contractData
      });

      const exactMatches: DuplicateContract[] = [];
      const similarMatches: DuplicateContract[] = [];

      try {
        // Check for exact match (same contract number)
        if (contractData.contract_number) {
          const { data: exactData, error: exactError } = await supabase
            .from('contracts')
            .select(`
              id,
              contract_number,
              contract_type,
              start_date,
              end_date,
              contract_amount,
              status,
              customers!inner(
                first_name,
                last_name,
                company_name,
                customer_type
              )
            `)
            .eq('company_id', companyId)
            .eq('contract_number', contractData.contract_number)
            .neq('status', 'cancelled') as any;

          if (exactError) {
            console.error('Error checking exact duplicates:', exactError);
            throw exactError;
          }

          if (exactData && exactData.length > 0) {
            exactMatches.push(
              ...exactData.map((contract: any) => {
                const customerName = contract.customers?.customer_type === 'individual'
                  ? `${contract.customers.first_name} ${contract.customers.last_name}`
                  : contract.customers?.company_name || 'Unknown Customer';

                return {
                  id: contract.id,
                  contract_number: contract.contract_number,
                  customer_name: customerName,
                  contract_type: contract.contract_type,
                  start_date: contract.start_date,
                  end_date: contract.end_date,
                  contract_amount: contract.contract_amount,
                  status: contract.status
                };
              })
            );
          }
        }

        // Check for similar matches (overlapping dates with same customer or vehicle)
        if (
          (contractData.customer_id || contractData.vehicle_id) &&
          contractData.start_date &&
          contractData.end_date
        ) {
          let query = supabase
            .from('contracts')
            .select(`
              id,
              contract_number,
              contract_type,
              start_date,
              end_date,
              contract_amount,
              status,
              customers!inner(
                first_name,
                last_name,
                company_name,
                customer_type
              )
            `)
            .eq('company_id', companyId)
            .neq('status', 'cancelled')
            .not('start_date', 'gt', contractData.end_date)
            .not('end_date', 'lt', contractData.start_date) as any;

          // Check for customer + overlapping dates
          if (contractData.customer_id) {
            query = query.eq('customer_id', contractData.customer_id);
          }

          const { data: similarData, error: similarError } = await query;

          if (similarError) {
            console.error('Error checking similar duplicates:', similarError);
            throw similarError;
          }

          if (similarData && similarData.length > 0) {
            similarMatches.push(
              ...similarData.map((contract: any) => {
                const customerName = contract.customers?.customer_type === 'individual'
                  ? `${contract.customers.first_name} ${contract.customers.last_name}`
                  : contract.customers?.company_name || 'Unknown Customer';

                return {
                  id: contract.id,
                  contract_number: contract.contract_number,
                  customer_name: customerName,
                  contract_type: contract.contract_type,
                  start_date: contract.start_date,
                  end_date: contract.end_date,
                  contract_amount: contract.contract_amount,
                  status: contract.status
                };
              })
            );
          }

          // Check for vehicle + overlapping dates (if contract_number doesn't match)
          if (contractData.vehicle_id) {
            const { data: vehicleData, error: vehicleError } = await supabase
              .from('contracts')
              .select(`
                id,
                contract_number,
                contract_type,
                start_date,
                end_date,
                contract_amount,
                status,
                customers!inner(
                  first_name,
                  last_name,
                  company_name,
                  customer_type
                )
              `)
              .eq('company_id', companyId)
              .eq('vehicle_id', contractData.vehicle_id)
              .neq('status', 'cancelled')
              .not('start_date', 'gt', contractData.end_date)
              .not('end_date', 'lt', contractData.start_date) as any;

            if (vehicleError) {
              console.error('Error checking vehicle duplicates:', vehicleError);
              throw vehicleError;
            }

            if (vehicleData && vehicleData.length > 0) {
              // Only add if not already in similarMatches
              vehicleData.forEach((contract: any) => {
                if (!similarMatches.some(m => m.id === contract.id)) {
                  const customerName = contract.customers?.customer_type === 'individual'
                    ? `${contract.customers.first_name} ${contract.customers.last_name}`
                    : contract.customers?.company_name || 'Unknown Customer';

                  similarMatches.push({
                    id: contract.id,
                    contract_number: contract.contract_number,
                    customer_name: customerName,
                    contract_type: contract.contract_type,
                    start_date: contract.start_date,
                    end_date: contract.end_date,
                    contract_amount: contract.contract_amount,
                    status: contract.status
                  });
                }
              });
            }
          }
        }

        // Combine results
        const allMatches = [...exactMatches, ...similarMatches];
        const isExactMatch = exactMatches.length > 0;
        const hasDuplicates = allMatches.length > 0;

        const result: ImprovedDuplicateCheckResult = {
          exactMatches,
          similarMatches,
          allMatches,
          hasDuplicates,
          isExactMatch,
          count: allMatches.length
        };

        console.log('🔍 [IMPROVED_DUPLICATE_CHECK] Results:', result);

        return result;
      } catch (error) {
        console.error('Error in improved duplicate check:', error);
        throw error;
      }
    },
    enabled: enabled && !!companyId && (
      !!contractData.contract_number ||
      !!contractData.customer_id ||
      !!contractData.vehicle_id
    ),
    staleTime: 0, // Always fresh for duplicate checks
  });
};
