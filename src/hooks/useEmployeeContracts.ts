/**
 * useEmployeeContracts Hook
 * Hook لإدارة عقود الموظف
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  EmployeeContract, 
  ContractStats, 
  ContractFilters 
} from '@/types/mobile-employee.types';

interface UseEmployeeContractsReturn {
  contracts: EmployeeContract[];
  priorityContracts: EmployeeContract[];
  stats: ContractStats;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useEmployeeContracts = (
  filters?: ContractFilters
): UseEmployeeContractsReturn => {
  const { user } = useAuth();

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-contracts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch contracts
  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-contracts', profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          status,
          start_date,
          end_date,
          monthly_amount,
          balance_due,
          total_paid,
          days_overdue,
          make,
          model,
          license_plate,
          assigned_to_profile_id,
          created_at,
          updated_at,
          customers!inner (
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name_ar,
            phone,
            email
          )
        `)
        .eq('assigned_to_profile_id', profile.id)
        .eq('company_id', profile.company_id);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.search) {
        query = query.or(`
          contract_number.ilike.%${filters.search}%,
          customers.first_name_ar.ilike.%${filters.search}%,
          customers.last_name_ar.ilike.%${filters.search}%,
          customers.company_name_ar.ilike.%${filters.search}%
        `);
      }

      if (filters?.minBalance) {
        query = query.gte('balance_due', filters.minBalance);
      }

      if (filters?.maxBalance) {
        query = query.lte('balance_due', filters.maxBalance);
      }

      if (filters?.dateFrom) {
        query = query.gte('start_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('end_date', filters.dateTo);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: EmployeeContract[] = (data || []).map((contract: any) => {
        const customer = contract.customers;
        const customerName = customer?.first_name_ar || customer?.company_name_ar || 
                            `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

        return {
          id: contract.id,
          contract_number: contract.contract_number,
          customer_id: contract.customer_id,
          customer_name: customerName,
          customer_phone: customer?.phone,
          customer_email: customer?.email,
          status: contract.status,
          start_date: contract.start_date,
          end_date: contract.end_date,
          monthly_amount: contract.monthly_amount || 0,
          balance_due: contract.balance_due || 0,
          total_paid: contract.total_paid || 0,
          days_overdue: contract.days_overdue,
          vehicle_make: contract.make,
          vehicle_model: contract.model,
          vehicle_plate: contract.license_plate,
          assigned_to_profile_id: contract.assigned_to_profile_id,
          created_at: contract.created_at,
          updated_at: contract.updated_at,
        };
      });

      return transformedData;
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate priority contracts
  const priorityContracts = contracts.filter((contract) => {
    // High balance (> 5000 QAR)
    if (contract.balance_due > 5000) {
      return {
        ...contract,
        priority_reason: 'high_balance' as const,
        priority_reason_ar: 'مبلغ كبير مستحق'
      };
    }

    // Overdue payment (> 30 days)
    if (contract.days_overdue && contract.days_overdue > 30) {
      return {
        ...contract,
        priority_reason: 'overdue_payment' as const,
        priority_reason_ar: 'متأخر في الدفع'
      };
    }

    // Expiring soon (within 7 days)
    const daysUntilExpiry = Math.ceil(
      (new Date(contract.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (contract.status === 'active' && daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
      return {
        ...contract,
        priority_reason: 'expiring_soon' as const,
        priority_reason_ar: 'ينتهي قريباً'
      };
    }

    return null;
  }).filter(Boolean).map((contract) => {
    // Add priority reason to contract
    if (contract.balance_due > 5000) {
      return {
        ...contract,
        priority_reason: 'high_balance' as const,
        priority_reason_ar: 'مبلغ كبير مستحق'
      };
    }
    if (contract.days_overdue && contract.days_overdue > 30) {
      return {
        ...contract,
        priority_reason: 'overdue_payment' as const,
        priority_reason_ar: 'متأخر في الدفع'
      };
    }
    return {
      ...contract,
      priority_reason: 'expiring_soon' as const,
      priority_reason_ar: 'ينتهي قريباً'
    };
  });

  // Calculate stats
  const stats: ContractStats = {
    totalContracts: contracts.length,
    activeContracts: contracts.filter(c => c.status === 'active').length,
    expiredContracts: contracts.filter(c => c.status === 'expired').length,
    suspendedContracts: contracts.filter(c => c.status === 'suspended').length,
    totalBalanceDue: contracts.reduce((sum, c) => sum + (c.balance_due || 0), 0),
    averageBalance: contracts.length > 0 
      ? contracts.reduce((sum, c) => sum + (c.balance_due || 0), 0) / contracts.length 
      : 0,
  };

  return {
    contracts,
    priorityContracts,
    stats,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
};
