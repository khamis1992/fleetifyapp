/**
 * useEmployeeTasks Hook
 * Hook لإدارة مهام الموظف
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, endOfDay, isToday } from 'date-fns';
import type { 
  EmployeeTask, 
  TaskStats, 
  TaskFilters 
} from '@/types/mobile-employee.types';

interface UseEmployeeTasksReturn {
  tasks: EmployeeTask[];
  todayTasks: EmployeeTask[];
  stats: TaskStats;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  completeTask: (taskId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<EmployeeTask>) => Promise<void>;
}

export const useEmployeeTasks = (
  filters?: TaskFilters
): UseEmployeeTasksReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-tasks', user?.id],
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

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-tasks', profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('employee_tasks')
        .select(`
          id,
          title,
          title_ar,
          description,
          type,
          status,
          priority,
          scheduled_date,
          scheduled_time,
          completed_at,
          contract_id,
          customer_id,
          assigned_to_profile_id,
          created_by,
          notes,
          created_at,
          updated_at,
          customers (
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name_ar
          )
        `)
        .eq('assigned_to_profile_id', profile.id);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.type && filters.type.length > 0) {
        query = query.in('type', filters.type);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }

      if (filters?.search) {
        query = query.or(`
          title.ilike.%${filters.search}%,
          title_ar.ilike.%${filters.search}%,
          description.ilike.%${filters.search}%
        `);
      }

      query = query.order('scheduled_date', { ascending: true })
                   .order('scheduled_time', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: EmployeeTask[] = (data || []).map((task: any) => {
        const customer = task.customers;
        const customerName = customer?.first_name_ar || customer?.company_name_ar || 
                            `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();

        return {
          id: task.id,
          title: task.title,
          title_ar: task.title_ar,
          description: task.description,
          type: task.type,
          status: task.status,
          priority: task.priority,
          scheduled_date: task.scheduled_date,
          scheduled_time: task.scheduled_time,
          completed_at: task.completed_at,
          contract_id: task.contract_id,
          customer_id: task.customer_id,
          customer_name: customerName,
          assigned_to_profile_id: task.assigned_to_profile_id,
          created_by: task.created_by,
          notes: task.notes,
          created_at: task.created_at,
          updated_at: task.updated_at,
        };
      });

      return transformedData;
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Filter today's tasks
  const todayTasks = tasks.filter((task) => 
    isToday(new Date(task.scheduled_date))
  );

  // Calculate stats
  const stats: TaskStats = {
    totalTasks: tasks.length,
    todayTasks: todayTasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
    completionRate: tasks.length > 0 
      ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
      : 0,
    overdueTasks: tasks.filter(t => 
      t.status !== 'completed' && 
      new Date(t.scheduled_date) < startOfDay(new Date())
    ).length,
  };

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('employee_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('employee_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      updates 
    }: { 
      taskId: string; 
      updates: Partial<EmployeeTask> 
    }) => {
      const { error } = await supabase
        .from('employee_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
  });

  return {
    tasks,
    todayTasks,
    stats,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    completeTask: (taskId: string) => completeTaskMutation.mutateAsync(taskId),
    deleteTask: (taskId: string) => deleteTaskMutation.mutateAsync(taskId),
    updateTask: (taskId: string, updates: Partial<EmployeeTask>) => 
      updateTaskMutation.mutateAsync({ taskId, updates }),
  };
};
