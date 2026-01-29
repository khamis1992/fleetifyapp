/**
 * useEmployeeDetails Hook
 * Hook لجلب تفاصيل موظف معين
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEmployeeDetails = (employeeId: string) => {
  // Fetch employee profile
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee-details', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch employee performance
  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ['employee-performance-details', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_performance_view')
        .select('*')
        .eq('employee_id', employeeId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch assigned contracts
  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['employee-contracts-details', employeeId],
    queryFn: async () => {
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
        .neq('status', 'cancelled')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  // Fetch scheduled tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['employee-tasks-details', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_followups')
        .select(`
          id,
          title,
          title_ar,
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
        .order('scheduled_date', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const isLoading = employeeLoading || performanceLoading || contractsLoading || tasksLoading;

  return {
    employee,
    performance,
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
