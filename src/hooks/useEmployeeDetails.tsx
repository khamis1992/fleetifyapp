/**
 * useEmployeeDetails Hook
 * Hook لجلب تفاصيل موظف معين
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useEmployeeDetails = (employeeId: string) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id || user?.company?.id;

  // Fetch employee profile
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-details', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!employeeId,
  });

  // Fetch employee performance
  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ['employee-performance-details', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('employee_performance_view')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!employeeId,
  });

  const { data: performanceHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['employee-performance-history', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('employee_performance')
        .select('period_start, performance_score, collection_rate, followup_completion_rate')
        .eq('employee_id', employeeId)
        .eq('company_id', companyId)
        .order('period_start', { ascending: true })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && !!employeeId,
  });

  // Fetch assigned contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['employee-contracts-details', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          status,
          start_date,
          end_date,
          monthly_amount,
          balance_due,
          total_paid,
          assigned_at,
          customers:customer_id (
            first_name_ar,
            last_name_ar,
            company_name_ar
          )
        `)
        .eq('assigned_to_profile_id', employeeId)
        .eq('company_id', companyId)
        .neq('status', 'cancelled')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!employeeId,
  });

  // Fetch scheduled tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['employee-tasks-details', companyId, employeeId],
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required');
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select(`
          id,
          title,
          followup_type,
          scheduled_date,
          scheduled_time,
          status,
          priority,
          contracts:contract_id (
            contract_number,
            customers:customer_id (
              first_name_ar,
              company_name_ar
            )
          )
        `)
        .eq('assigned_to', employeeId)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!employeeId,
  });

  const isLoading = employeeLoading || performanceLoading || historyLoading || contractsLoading || tasksLoading;

  return {
    employee,
    performance,
    performanceHistory,
    contracts,
    tasks,
    isLoading,
    stats: {
      totalContracts: contracts?.length || 0,
      activeContracts: contracts?.filter(c => c.status === 'active').length || 0,
      totalBalance: contracts?.reduce((sum, c) => sum + (c.balance_due || 0), 0) || 0,
      totalCollected: contracts?.reduce((sum, c) => sum + (c.total_paid || 0), 0) || 0,
      pendingTasks: tasks?.filter(t => t.status === 'pending').length || 0,
      completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
    },
  };
};
