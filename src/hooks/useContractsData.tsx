import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useContractsData = (filters: any = {}) => {
  const { user } = useAuth();

  // Fetch contracts with customer data
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['contracts', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return []
      
      console.log('🔍 [CONTRACTS_QUERY] Fetching contracts for company:', user.profile.company_id)
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          customers(
            id,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            customer_type
          ),
          vehicles(
            id,
            plate_number,
            model,
            make,
            year
          )
        `)
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ [CONTRACTS_QUERY] Error fetching contracts:', error)
        throw error
      }
      
      console.log('✅ [CONTRACTS_QUERY] Successfully fetched contracts:', data?.length || 0)
      return data || []
    },
    enabled: !!user?.profile?.company_id
  });

  // Contract statistics
  const statistics = useMemo(() => {
    if (!contracts) return {
      activeContracts: [],
      draftContracts: [],
      expiredContracts: [],
      suspendedContracts: [],
      cancelledContracts: [],
      totalRevenue: 0
    };

    const activeContracts = contracts.filter(c => c.status === 'active');
    const draftContracts = contracts.filter(c => c.status === 'draft');
    const expiredContracts = contracts.filter(c => c.status === 'expired');
    const suspendedContracts = contracts.filter(c => c.status === 'suspended');
    const cancelledContracts = contracts.filter(c => c.status === 'cancelled');
    const totalRevenue = activeContracts.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0);

    return {
      activeContracts,
      draftContracts,
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
    
    const result = contracts.filter(contract => {
      // Search filter
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        const searchableText = [
          contract.contract_number || '',
          contract.description || '',
          contract.terms || ''
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
    statistics
  };
};