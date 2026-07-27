/**
 * useEmployeeContracts Hook
 * Hook لإدارة عقود الموظف
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getEligibleEmployeeProfileIds } from '@/services/employeeAssignmentEligibility';
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
    queryKey: ['employee-profile-contracts', 'v4', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User is not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id, role, is_active')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data.company_id) throw new Error('Employee profile is missing company_id');
      const eligibleProfileIds = await getEligibleEmployeeProfileIds(data.company_id);
      return {
        ...data,
        is_employee_workspace_eligible: eligibleProfileIds.has(data.id),
      };
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
    queryKey: ['employee-contracts', 'v4', profile?.id, profile?.is_employee_workspace_eligible, filters],
    queryFn: async () => {
      if (!profile?.id || !profile.company_id) return [];
      if (!profile.is_active || !profile.is_employee_workspace_eligible) return [];

      let query = supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          company_id,
          vehicle_id,
          status,
          start_date,
          end_date,
          contract_amount,
          monthly_amount,
          balance_due,
          total_paid,
          late_fine_amount,
          vehicle_returned,
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
            company_name,
            company_name_ar,
            customer_type,
            national_id,
            phone,
            email
          ),
          vehicles (
            id,
            plate_number,
            make,
            model,
            year
          )
        `)
        .eq('assigned_to_profile_id', profile.id)
        .eq('company_id', profile.company_id);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      } else {
        // The employee workspace represents the current operational workload.
        // Historical assignments remain available in reports, but must not inflate
        // the employee's assigned-contract count.
        query = query.eq('status', 'active');
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

      const contractIds = (data || [])
        .map((contract) => contract.id)
        .filter(Boolean);

      const violationStatsByContract = new Map<string, { count: number; total: number }>();
      if (contractIds.length > 0) {
        const { data: violations, error: violationsError } = await supabase
          .from('penalties')
          .select('contract_id, amount, payment_status, status')
          .eq('company_id', profile.company_id)
          .in('contract_id', contractIds);

        if (violationsError) throw violationsError;

        (violations || []).forEach((violation) => {
          if (!violation.contract_id) return;
          const paymentStatus = String(violation.payment_status || '').toLowerCase();
          const status = String(violation.status || '').toLowerCase();
          if (paymentStatus === 'paid' || status === 'cancelled') return;

          const current = violationStatsByContract.get(violation.contract_id) || { count: 0, total: 0 };
          violationStatsByContract.set(violation.contract_id, {
            count: current.count + 1,
            total: current.total + Number(violation.amount || 0),
          });
        });
      }

      // Transform data
      const transformedData: EmployeeContract[] = (data || []).map((contract: any) => {
        const customer = contract.customers;
        const violationStats = violationStatsByContract.get(contract.id) || { count: 0, total: 0 };
        
        // Build customer name with priority: Arabic names > Company name > English names
        let customerName = 'غير محدد';
        if (customer) {
          if (customer.company_name_ar) {
            customerName = customer.company_name_ar;
          } else if (customer.first_name_ar && customer.last_name_ar) {
            customerName = `${customer.first_name_ar} ${customer.last_name_ar}`;
          } else if (customer.first_name_ar) {
            customerName = customer.first_name_ar;
          } else if (customer.first_name && customer.last_name) {
            customerName = `${customer.first_name} ${customer.last_name}`;
          } else if (customer.first_name) {
            customerName = customer.first_name;
          }
        }

        return {
          id: contract.id,
          contract_number: contract.contract_number,
          customer_id: contract.customer_id,
          company_id: contract.company_id,
          vehicle_id: contract.vehicle_id,
          customer_name: customerName,
          customer_phone: customer?.phone,
          customer_email: customer?.email,
          status: contract.status,
          start_date: contract.start_date,
          end_date: contract.end_date,
          contract_amount: contract.contract_amount || 0,
          monthly_amount: contract.monthly_amount || 0,
          balance_due: contract.balance_due || 0,
          total_paid: contract.total_paid || 0,
          traffic_violation_count: violationStats.count,
          traffic_violation_total: violationStats.total,
          late_fine_amount: contract.late_fine_amount,
          vehicle_returned: contract.vehicle_returned,
          days_overdue: contract.days_overdue,
          vehicle_make: contract.vehicles?.make || contract.make,
          vehicle_model: contract.vehicles?.model || contract.model,
          vehicle_plate: contract.vehicles?.plate_number || contract.license_plate,
          customer: customer ? {
            id: customer.id,
            first_name: customer.first_name,
            last_name: customer.last_name,
            first_name_ar: customer.first_name_ar,
            last_name_ar: customer.last_name_ar,
            company_name: customer.company_name,
            company_name_ar: customer.company_name_ar,
            phone: customer.phone,
            email: customer.email,
            national_id: customer.national_id,
            customer_type: customer.customer_type,
          } : null,
          vehicle: contract.vehicles ? {
            id: contract.vehicles.id,
            plate_number: contract.vehicles.plate_number,
            make: contract.vehicles.make,
            model: contract.vehicles.model,
            year: contract.vehicles.year,
          } : null,
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
