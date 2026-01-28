/**
 * useEmployeePerformance Hook
 * Hook لحساب وعرض أداء الموظف
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeePerformance, getPerformanceGrade } from '@/types/employee-workspace.types';

interface UseEmployeePerformanceOptions {
  employeeId?: string; // If provided, get performance for specific employee (for management)
  enabled?: boolean;
}

export const useEmployeePerformance = (options: UseEmployeePerformanceOptions = {}) => {
  const { user } = useAuth();
  const { employeeId, enabled = true } = options;

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile', user?.id, employeeId],
    queryFn: async () => {
      const query = employeeId
        ? supabase.from('profiles').select('*').eq('id', employeeId).single()
        : supabase.from('profiles').select('*').eq('user_id', user?.id).single();

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: (!!user?.id || !!employeeId) && enabled
  });

  // Fetch performance data from view
  const {
    data: performance,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-performance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('employee_performance_view')
        .select('*')
        .eq('employee_id', profile.id)
        .single();

      if (error) {
        // If no data in view, return default values
        if (error.code === 'PGRST116') {
          return {
            employee_id: profile.id,
            user_id: profile.user_id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            company_id: profile.company_id,
            assigned_contracts_count: 0,
            active_contracts_count: 0,
            contracts_with_balance_count: 0,
            total_contract_value: 0,
            total_collected: 0,
            total_balance_due: 0,
            collection_rate: 0,
            total_followups: 0,
            completed_followups: 0,
            pending_followups: 0,
            overdue_followups: 0,
            followup_completion_rate: 0,
            total_communications: 0,
            phone_calls_count: 0,
            messages_count: 0,
            contact_coverage_rate: 0,
            performance_score: 0
          } as EmployeePerformance;
        }
        throw error;
      }

      return data as EmployeePerformance;
    },
    enabled: !!profile?.id && enabled,
    staleTime: 60 * 1000, // 1 minute
  });

  // Get current month's target
  const { data: currentTarget } = useQuery({
    queryKey: ['employee-current-target', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('employee_collection_targets')
        .select('*')
        .eq('employee_id', profile.id)
        .eq('is_active', true)
        .gte('period_start', firstDayOfMonth.toISOString().split('T')[0])
        .lte('period_end', lastDayOfMonth.toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!profile?.id && enabled
  });

  // Calculate progress towards targets
  const targetProgress = currentTarget && performance ? {
    collectionAmount: {
      target: currentTarget.target_collection_amount || 0,
      actual: performance.total_collected,
      percentage: currentTarget.target_collection_amount 
        ? Math.round((performance.total_collected / currentTarget.target_collection_amount) * 100)
        : 0
    },
    collectionRate: {
      target: currentTarget.target_collection_rate || 0,
      actual: performance.collection_rate,
      percentage: currentTarget.target_collection_rate
        ? Math.round((performance.collection_rate / currentTarget.target_collection_rate) * 100)
        : 0
    },
    followupsCount: {
      target: currentTarget.target_followups_count || 0,
      actual: performance.completed_followups,
      percentage: currentTarget.target_followups_count
        ? Math.round((performance.completed_followups / currentTarget.target_followups_count) * 100)
        : 0
    },
    communicationsCount: {
      target: currentTarget.target_communications_count || 0,
      actual: performance.total_communications,
      percentage: currentTarget.target_communications_count
        ? Math.round((performance.total_communications / currentTarget.target_communications_count) * 100)
        : 0
    }
  } : null;

  // Get performance grade
  const performanceGrade = performance 
    ? getPerformanceGrade(performance.performance_score)
    : null;

  // Calculate performance metrics breakdown
  const metricsBreakdown = performance ? {
    collection: {
      score: performance.collection_rate,
      weight: 35,
      contribution: (performance.collection_rate * 0.35)
    },
    followupCompletion: {
      score: performance.followup_completion_rate,
      weight: 25,
      contribution: (performance.followup_completion_rate * 0.25)
    },
    contactCoverage: {
      score: performance.contact_coverage_rate,
      weight: 20,
      contribution: (performance.contact_coverage_rate * 0.20)
    },
    activityLevel: {
      score: performance.assigned_contracts_count > 0
        ? Math.min((performance.total_communications / performance.assigned_contracts_count) * 10, 100)
        : 0,
      weight: 20,
      contribution: performance.assigned_contracts_count > 0
        ? Math.min((performance.total_communications / performance.assigned_contracts_count) * 10, 100) * 0.20
        : 0
    }
  } : null;

  // Get historical performance (last 6 months)
  const { data: historicalPerformance } = useQuery({
    queryKey: ['employee-historical-performance', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // This would require a separate table or calculation
      // For now, return empty array
      // TODO: Implement historical performance tracking
      return [];
    },
    enabled: !!profile?.id && enabled
  });

  return {
    performance,
    performanceGrade,
    currentTarget,
    targetProgress,
    metricsBreakdown,
    historicalPerformance: historicalPerformance || [],
    isLoading,
    error,
    refetch,
    profile
  };
};
