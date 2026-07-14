/**
 * useEmployeeTasks Hook
 * Hook لإدارة مهام الموظف
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, isToday } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';
import type { 
  EmployeeTask, 
  TaskPriority,
  TaskStatus,
  TaskType,
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
  const companyId = user?.profile?.company_id || user?.company?.id;

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-tasks', companyId, user?.id],
    queryFn: async () => {
      if (!user?.id || !companyId) throw new Error('Employee identity is required');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();
      
      if (error) throw error;
      if (!data.company_id) throw new Error('Employee company is required');
      return { id: data.id, company_id: data.company_id };
    },
    enabled: !!user?.id && !!companyId
  });

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-tasks', companyId, profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('employee_tasks')
        .select(`
          id,
          title,
          title_ar,
          description,
          task_type,
          status,
          priority,
          scheduled_date,
          due_date,
          completed_at,
          contract_id,
          customer_id,
          assigned_to,
          assigned_by,
          result_notes,
          delay_reason,
          delay_notes,
          collection_amount,
          created_at,
          updated_at,
          customers!employee_tasks_customer_id_fkey (
            id,
            first_name,
            last_name,
            first_name_ar,
            last_name_ar,
            company_name_ar
          )
        `)
        .eq('assigned_to', profile.id)
        .eq('company_id', profile.company_id);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.type && filters.type.length > 0) {
        const taskTypes = filters.type.map(type => ({
          call: 'followup',
          followup: 'followup',
          visit: 'customer_visit',
          payment: 'payment_collection',
          other: 'other',
        } satisfies Record<TaskType, string>)[type]);
        query = query.in('task_type', taskTypes);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority.map(priority =>
          priority === 'medium' ? 'normal' : priority
        ));
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

      query = query.order('scheduled_date', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: EmployeeTask[] = (data || []).map(task => {
        const customer = task.customers;
        const customerName = customer?.first_name_ar || customer?.company_name_ar || 
                            `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim();
        const scheduledDate = task.scheduled_date || task.due_date || task.created_at || new Date().toISOString();
        const taskType: TaskType = ({
          followup: 'followup',
          payment_collection: 'payment',
          customer_visit: 'visit',
        } as Record<string, TaskType>)[task.task_type] || 'other';
        const taskStatus: TaskStatus = task.status === 'delayed'
          ? 'pending'
          : (['pending', 'in_progress', 'completed', 'cancelled'].includes(task.status || '')
              ? task.status as TaskStatus
              : 'pending');
        const taskPriority: TaskPriority = task.priority === 'normal'
          ? 'medium'
          : (['low', 'medium', 'high', 'urgent'].includes(task.priority || '')
              ? task.priority as TaskPriority
              : 'medium');

        return {
          id: task.id,
          title: task.title,
          title_ar: task.title_ar || undefined,
          description: task.description || undefined,
          type: taskType,
          status: taskStatus,
          priority: taskPriority,
          scheduled_date: scheduledDate,
          scheduled_time: scheduledDate.includes('T') ? scheduledDate.slice(11, 16) : undefined,
          completed_at: task.completed_at || undefined,
          contract_id: task.contract_id || undefined,
          customer_id: task.customer_id || undefined,
          customer_name: customerName,
          assigned_to_profile_id: task.assigned_to || profile.id,
          created_by: task.assigned_by || '',
          notes: task.description || undefined,
          created_at: task.created_at || undefined,
          updated_at: task.updated_at || undefined,
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
      if (!profile?.id) throw new Error('Employee profile is required');
      const { error } = await supabase
        .from('employee_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('company_id', profile.company_id)
        .eq('assigned_to', profile.id)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (!profile?.id) throw new Error('Employee profile is required');
      const { error } = await supabase
        .from('employee_tasks')
        .delete()
        .eq('id', taskId)
        .eq('company_id', profile.company_id)
        .eq('assigned_to', profile.id)
        .select('id')
        .single();

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
      if (!profile?.id) throw new Error('Employee profile is required');
      const databaseUpdates: Database['public']['Tables']['employee_tasks']['Update'] = {
        updated_at: new Date().toISOString(),
      };
      if (updates.title !== undefined) databaseUpdates.title = updates.title;
      if (updates.title_ar !== undefined) databaseUpdates.title_ar = updates.title_ar;
      if (updates.description !== undefined) databaseUpdates.description = updates.description;
      if (updates.notes !== undefined) databaseUpdates.description = updates.notes;
      if (updates.status !== undefined) databaseUpdates.status = updates.status;
      if (updates.priority !== undefined) {
        databaseUpdates.priority = updates.priority === 'medium' ? 'normal' : updates.priority;
      }
      if (updates.type !== undefined) {
        databaseUpdates.task_type = {
          call: 'followup',
          followup: 'followup',
          visit: 'customer_visit',
          payment: 'payment_collection',
          other: 'other',
        }[updates.type];
      }
      if (updates.scheduled_date !== undefined) databaseUpdates.scheduled_date = updates.scheduled_date;

      const { error } = await supabase
        .from('employee_tasks')
        .update(databaseUpdates)
        .eq('id', taskId)
        .eq('company_id', profile.company_id)
        .eq('assigned_to', profile.id);

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
