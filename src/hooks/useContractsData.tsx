import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

// Extend the contract type to include vehicle data
interface ContractWithVehicle extends Record<string, any> {
  id: string;
  company_id: string;
  customer_id: string;
  vehicle_id?: string | null;
  contract_number: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  monthly_amount: number;
  status: string;
  contract_type: string;
  description?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
  cost_center_id?: string;
  account_id?: string;
  journal_entry_id?: string;
  auto_renew_enabled?: boolean;
  renewal_terms?: any;
  vehicle_returned?: boolean;
  last_renewal_check?: string;
  last_payment_check_date?: string;
  suspension_reason?: string;
  expired_at?: string;
  created_by?: string;
  total_paid?: number;
  balance_due?: number;
  linked_payments_amount?: number;
  customers?: {
    id: string;
    first_name_ar?: string;
    last_name_ar?: string;
    first_name?: string;
    last_name?: string;
    company_name_ar?: string;
    company_name?: string;
    customer_type?: string;
  };
  cost_center?: {
    id: string;
    center_code?: string;
    center_name?: string;
    center_name_ar?: string;
  };
  vehicle?: {
    id: string;
    plate_number: string;
    make: string;
    model: string;
    year?: number;
    status: string;
  };
}

export const useContractsData = (filters: any = {}) => {
  const { filter, getQueryKey, user, isBrowsingMode, browsedCompany, actualUserCompanyId } = useUnifiedCompanyAccess();

  // Fetch contracts with customer data
  const { data: contractsResponse, isLoading, refetch } = useQuery({
    queryKey: getQueryKey(['contracts', filters?.page, filters?.pageSize]),
    queryFn: async () => {
      const companyId = filter?.company_id || null;
      console.log('🔍 [CONTRACTS_QUERY] Fetching contracts', {
        companyId,
        isBrowsingMode,
        browsedCompanyId: browsedCompany?.id,
        actualUserCompanyId,
        page: filters?.page,
        pageSize: filters?.pageSize
      });

      // Get total count if pagination is requested
      let totalCount = 0;
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 50;

      if (filters?.page || filters?.pageSize) {
        let countQuery = supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true });

        if (companyId) {
          countQuery = countQuery.eq('company_id', companyId);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          console.error('❌ [CONTRACTS_QUERY] Error fetching count:', countError);
        } else {
          totalCount = count || 0;
        }
      }

      let query = supabase
        .from('contracts')
        .select(`
          *,
          customers(
            id,
            first_name_ar,
            last_name_ar,
            first_name,
            last_name,
            company_name_ar,
            company_name,
            customer_type
          ),
          cost_center:cost_centers(
            id,
            center_code,
            center_name,
            center_name_ar
          )
        `);

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Apply pagination
      if (filters?.page || filters?.pageSize) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('❌ [CONTRACTS_QUERY] Error fetching contracts:', error);
        throw error;
      }
      
      // If we have contracts, fetch vehicle data separately to avoid PostgREST relationship issues
      if (data && data.length > 0) {
        // Extract unique vehicle IDs (filter out null/undefined values)
        const vehicleIds = [...new Set(
          data
            .filter((contract: any) => contract.vehicle_id)
            .map((contract: any) => contract.vehicle_id)
            .filter((id: any) => id != null)
        )];
        
        console.log('🔍 [CONTRACTS_QUERY] Found vehicle IDs to fetch:', vehicleIds.length);
        
        if (vehicleIds.length > 0) {
          // Fetch vehicles in a separate query
          const { data: vehiclesData, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, plate_number, make, model, year, status')
            .in('id', vehicleIds);
          
          if (!vehiclesError && vehiclesData) {
            console.log('✅ [CONTRACTS_QUERY] Successfully fetched vehicles:', vehiclesData.length);
            
            // Create a map for quick lookup
            const vehiclesMap = new Map(vehiclesData.map((vehicle: any) => [vehicle.id, vehicle]));
            
            // Attach vehicle data to contracts
            data.forEach((contract: any) => {
              if (contract.vehicle_id && vehiclesMap.has(contract.vehicle_id)) {
                contract.vehicle = vehiclesMap.get(contract.vehicle_id);
              }
            });
          } else if (vehiclesError) {
            console.error('❌ [CONTRACTS_QUERY] Error fetching vehicles:', vehiclesError);
          }
        }
      }

      console.log('✅ [CONTRACTS_QUERY] Successfully fetched contracts with vehicle data:', data?.length || 0);

      // Return with pagination info if pagination is requested
      if (filters?.page || filters?.pageSize) {
        return {
          data: data || [],
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasMore: (page * pageSize) < totalCount
          }
        };
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Extract contracts from response (handle both array and paginated response)
  const contracts = useMemo(() => {
    if (!contractsResponse) return [];
    if (Array.isArray(contractsResponse)) return contractsResponse;
    if (contractsResponse && typeof contractsResponse === 'object' && 'data' in contractsResponse) {
      return Array.isArray(contractsResponse.data) ? contractsResponse.data : [];
    }
    return [];
  }, [contractsResponse]);

  // Extract pagination info if available
  const paginationInfo = useMemo(() => {
    if (contractsResponse && typeof contractsResponse === 'object' && 'pagination' in contractsResponse) {
      return contractsResponse.pagination;
    }
    return undefined;
  }, [contractsResponse]);

  // Contract statistics
  const statistics = useMemo(() => {
    if (!contracts) return {
      activeContracts: [],
      draftContracts: [],
      underReviewContracts: [],
      expiredContracts: [],
      suspendedContracts: [],
      cancelledContracts: [],
      totalRevenue: 0
    };

    // Function to check if contract amounts are zero or invalid
    const isZeroAmount = (c: any) => {
      const ca = c?.contract_amount;
      const ma = c?.monthly_amount;
      const caNum = ca === undefined || ca === null || ca === '' ? null : Number(ca);
      const maNum = ma === undefined || ma === null || ma === '' ? null : Number(ma);
      
      // Consider as zero amount only if both are explicitly zero
      return (caNum === 0 && maNum === 0);
    };

    // Active contracts should not be filtered by zero amounts
    const activeContracts = contracts.filter((c: any) => c.status === 'active');
    const underReviewContracts = contracts.filter((c: any) => c.status === 'under_review' && !isZeroAmount(c));
    const draftContracts = contracts.filter((c: any) => c.status === 'draft' || (isZeroAmount(c) && !['cancelled','expired','suspended','under_review', 'active'].includes(c.status)));
    const expiredContracts = contracts.filter((c: any) => c.status === 'expired');
    const suspendedContracts = contracts.filter((c: any) => c.status === 'suspended');
    const cancelledContracts = contracts.filter((c: any) => c.status === 'cancelled');
    
    // Include both active and under_review contracts in revenue calculation
    const totalRevenue = [...activeContracts, ...underReviewContracts].reduce((sum, contract: any) => sum + (contract.contract_amount || 0), 0);

    return {
      activeContracts,
      draftContracts,
      underReviewContracts,
      expiredContracts,
      suspendedContracts,
      cancelledContracts,
      totalRevenue
    };
  }, [contracts]);

  // Apply filters to contracts
  const filteredContracts = useMemo(() => {
    console.log('🔍 [CONTRACTS_FILTER] Applying filters', { 
      filtersApplied: Object.keys(filters).length > 0,
      filters, 
      contractsLength: contracts?.length 
    });
    
    if (!contracts || contracts.length === 0) {
      console.log('🔍 [CONTRACTS_FILTER] No contracts data available');
      return [];
    }
    
    // If no filters are applied, return all contracts
    if (!filters || Object.keys(filters).length === 0) {
      console.log('🔍 [CONTRACTS_FILTER] No filters applied, returning all contracts:', contracts.length);
      return contracts;
    }
    
    const result = contracts.filter((contract: any) => {
      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        const searchableText = [
          contract.contract_number || '',
          contract.description || '',
          contract.terms || '',
          contract.vehicle?.plate_number || contract.license_plate || '',
          contract.vehicle?.make || contract.make || '',
          contract.vehicle?.model || contract.model || ''
        ].join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status !== 'all' && filters.status !== '') {
        if (contract.status !== filters.status) {
          return false;
        }
      }

      // Contract type filter
      if (filters.contract_type && filters.contract_type !== 'all' && filters.contract_type !== '') {
        if (contract.contract_type !== filters.contract_type) {
          return false;
        }
      }

      // Customer filter
      if (filters.customer_id && filters.customer_id !== 'all' && filters.customer_id !== '') {
        if (contract.customer_id !== filters.customer_id) {
          return false;
        }
      }

      // Cost center filter
      if (filters.cost_center_id && filters.cost_center_id !== 'all' && filters.cost_center_id !== '') {
        if (contract.cost_center_id !== filters.cost_center_id) {
          return false;
        }
      }

      // Vehicle filter
      if (filters.vehicle_id && filters.vehicle_id !== 'all' && filters.vehicle_id !== '') {
        if (contract.vehicle_id !== filters.vehicle_id) {
          return false;
        }
      }

      // Date range filters
      if (filters.start_date && filters.start_date !== '') {
        const contractStartDate = new Date(contract.start_date);
        const filterStartDate = new Date(filters.start_date);
        if (contractStartDate < filterStartDate) {
          return false;
        }
      }

      if (filters.end_date && filters.end_date !== '') {
        const contractEndDate = new Date(contract.end_date);
        const filterEndDate = new Date(filters.end_date);
        if (contractEndDate > filterEndDate) {
          return false;
        }
      }

      // Amount range filters
      if (filters.min_amount && filters.min_amount !== '') {
        const minAmount = parseFloat(filters.min_amount);
        if (!isNaN(minAmount) && contract.contract_amount < minAmount) {
          return false;
        }
      }

      if (filters.max_amount && filters.max_amount !== '') {
        const maxAmount = parseFloat(filters.max_amount);
        if (!isNaN(maxAmount) && contract.contract_amount > maxAmount) {
          return false;
        }
      }

      return true;
    });
    
    console.log('🔍 [CONTRACTS_FILTER] Final filtered results:', result.length, 'out of', contracts.length);
    return result;
  }, [contracts, filters]);

  return {
    contracts,
    filteredContracts,
    isLoading,
    refetch,
    statistics,
    pagination: paginationInfo
  };
};