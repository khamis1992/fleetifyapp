/**
 * useEmployeeContracts Hook
 * Hook لجلب وإدارة عقود الموظف
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EmployeeContractFilters, PriorityContract, ContractPriority } from '@/types/employee-workspace.types';
import { differenceInDays, parseISO } from 'date-fns';
import { formatCustomerName } from '@/utils/formatCustomerName';

interface UseEmployeeContractsOptions {
  filters?: EmployeeContractFilters;
  enabled?: boolean;
}

export const useEmployeeContracts = (options: UseEmployeeContractsOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { filters, enabled = true } = options;

  // Get employee's profile ID
  const { data: profile } = useQuery({
    queryKey: ['employee-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id, first_name, last_name')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && enabled
  });

  // Fetch assigned contracts
  const {
    data: contracts,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-contracts', profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('contracts')
        .select(`
          *,
          customers (
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name,
            company_name_ar,
            customer_type,
            phone,
            national_id
          ),
          vehicles (
            id,
            plate_number,
            make,
            model,
            year,
            status
          )
        `)
        .eq('assigned_to_profile_id', profile.id)
        .neq('status', 'cancelled');

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.hasOverdue) {
        query = query.gt('balance_due', 0);
      }

      if (filters?.search) {
        const searchTerm = filters.search.toLowerCase();
        query = query.or(`
          contract_number.ilike.%${searchTerm}%,
          description.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Post-processing filters
      let filteredData = data || [];

      // Filter by expiring contracts
      if (filters?.expiringInDays) {
        const today = new Date();
        filteredData = filteredData.filter(contract => {
          if (!contract.end_date) return false;
          const endDate = parseISO(contract.end_date);
          const daysUntilExpiry = differenceInDays(endDate, today);
          return daysUntilExpiry > 0 && daysUntilExpiry <= filters.expiringInDays!;
        });
      }

      return filteredData;
    },
    enabled: !!profile?.id && enabled,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get priority contracts (contracts needing immediate attention)
  const { data: priorityContracts } = useQuery({
    queryKey: ['employee-priority-contracts', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !contracts) return [];

      const priorities: PriorityContract[] = [];
      const today = new Date();

      for (const contract of contracts) {
        const customerName = formatCustomerName(contract.customers);

        // Check for overdue payments
        if (contract.balance_due && contract.balance_due > 0) {
          // Get last payment date to calculate days overdue
          const { data: lastPayment } = await supabase
            .from('payments')
            .select('payment_date')
            .eq('contract_id', contract.id)
            .order('payment_date', { ascending: false })
            .limit(1)
            .single();

          const daysOverdue = lastPayment 
            ? differenceInDays(today, parseISO(lastPayment.payment_date))
            : 30;

          if (daysOverdue > 7) {
            priorities.push({
              id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              customer_name: customerName,
              customer_phone: contract.customers?.phone,
              vehicle_plate: contract.vehicles?.plate_number,
              priority: daysOverdue > 30 ? 'critical' : 'high',
              priority_reason: 'overdue_payment',
              priority_reason_ar: 'دفعة متأخرة',
              monthly_amount: contract.monthly_amount || 0,
              balance_due: contract.balance_due,
              days_overdue: daysOverdue,
              status: contract.status,
              action_required: 'Contact customer for payment',
              action_required_ar: 'التواصل مع العميل للسداد'
            });
          }
        }

        // Check for expiring contracts
        if (contract.end_date) {
          const endDate = parseISO(contract.end_date);
          const daysUntilExpiry = differenceInDays(endDate, today);
          
          if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
            priorities.push({
              id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              customer_name: customerName,
              customer_phone: contract.customers?.phone,
              vehicle_plate: contract.vehicles?.plate_number,
              priority: daysUntilExpiry <= 3 ? 'high' : 'medium',
              priority_reason: 'contract_expiring',
              priority_reason_ar: 'ينتهي قريباً',
              monthly_amount: contract.monthly_amount || 0,
              balance_due: contract.balance_due || 0,
              status: contract.status,
              action_required: 'Initiate contract renewal',
              action_required_ar: 'بدء إجراءات التجديد',
              due_date: contract.end_date
            });
          }
        }

        // Check for no recent contact
        const { data: lastContact } = await supabase
          .from('customer_communications')
          .select('communication_date')
          .eq('customer_id', contract.customer_id)
          .order('communication_date', { ascending: false })
          .limit(1)
          .single();

        if (lastContact) {
          const daysSinceContact = differenceInDays(today, parseISO(lastContact.communication_date));
          
          if (daysSinceContact > 14) {
            priorities.push({
              id: contract.id,
              contract_number: contract.contract_number,
              customer_id: contract.customer_id,
              customer_name: customerName,
              customer_phone: contract.customers?.phone,
              vehicle_plate: contract.vehicles?.plate_number,
              priority: 'medium',
              priority_reason: 'no_contact',
              priority_reason_ar: 'لم يتم التواصل',
              monthly_amount: contract.monthly_amount || 0,
              balance_due: contract.balance_due || 0,
              status: contract.status,
              last_contact_date: lastContact.communication_date,
              action_required: 'Schedule follow-up call',
              action_required_ar: 'جدولة مكالمة متابعة'
            });
          }
        }
      }

      // Sort by priority
      const priorityOrder: Record<ContractPriority, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3
      };

      return priorities.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    },
    enabled: !!profile?.id && !!contracts && contracts.length > 0,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get quick stats
  const stats = {
    totalContracts: contracts?.length || 0,
    activeContracts: contracts?.filter(c => c.status === 'active').length || 0,
    contractsWithBalance: contracts?.filter(c => c.balance_due && c.balance_due > 0).length || 0,
    totalBalanceDue: contracts?.reduce((sum, c) => sum + (c.balance_due || 0), 0) || 0,
    priorityCount: priorityContracts?.length || 0
  };

  return {
    contracts: contracts || [],
    priorityContracts: priorityContracts || [],
    stats,
    isLoading,
    error,
    refetch,
    profile
  };
};
