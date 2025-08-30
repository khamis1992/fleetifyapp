import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface DuplicateContract {
  id: string;
  contract_number: string;
  customer_name: string;
  contract_type: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  status: string;
}

export interface ContractDuplicateCheckResult {
  has_duplicates: boolean;
  duplicates: DuplicateContract[];
  count: number;
}

export interface ContractData {
  contract_number?: string;
  customer_id?: string;
  vehicle_id?: string;
  start_date?: string;
  end_date?: string;
}

export const useContractDuplicateCheck = (
  contractData: ContractData,
  enabled: boolean = true
) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ['contract-duplicate-check', companyId, contractData],
    queryFn: async (): Promise<ContractDuplicateCheckResult> => {
      if (!companyId) {
        throw new Error("No company access available");
      }

      // If no data to check, return empty result
      if (!contractData.contract_number && !contractData.customer_id && !contractData.vehicle_id) {
        return {
          has_duplicates: false,
          duplicates: [],
          count: 0
        };
      }

      console.log('🔍 [CONTRACT_DUPLICATE_CHECK] Searching with:', {
        companyId,
        contractData
      });

      // Build the query for duplicate contracts
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
        .neq('status', 'cancelled');

      // Check for duplicate contract number
      if (contractData.contract_number) {
        query = query.eq('contract_number', contractData.contract_number);
      }

      // Check for contracts with same customer and overlapping dates
      if (contractData.customer_id && contractData.start_date && contractData.end_date) {
        query = query.eq('customer_id', contractData.customer_id)
                     .not('start_date', 'gt', contractData.end_date)
                     .not('end_date', 'lt', contractData.start_date);
      }

      // Check for contracts with same vehicle and overlapping dates
      if (contractData.vehicle_id && contractData.start_date && contractData.end_date) {
        query = query.eq('vehicle_id', contractData.vehicle_id)
                     .not('start_date', 'gt', contractData.end_date)
                     .not('end_date', 'lt', contractData.start_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking contract duplicates:', error);
        throw error;
      }

      // Format the results
      const duplicates = (data || []).map((contract: any) => {
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
      });

      const result = {
        has_duplicates: duplicates.length > 0,
        duplicates,
        count: duplicates.length
      };

      console.log('🔍 [CONTRACT_DUPLICATE_CHECK] Results:', result);

      return result;
    },
    enabled: enabled && !!companyId && (
      !!contractData.contract_number || 
      !!contractData.customer_id || 
      !!contractData.vehicle_id ||
      !!(contractData.customer_id && contractData.start_date && contractData.end_date) ||
      !!(contractData.vehicle_id && contractData.start_date && contractData.end_date)
    ),
    staleTime: 0, // Always fresh for duplicate checks
  });
};