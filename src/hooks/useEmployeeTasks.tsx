/**
 * useEmployeeTasks Hook
 * Hook لجلب وإدارة مهام الموظف
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { EmployeeTask, EmployeeTaskFilters } from '@/types/employee-workspace.types';
import { format, isToday, isPast, parseISO } from 'date-fns';

interface UseEmployeeTasksOptions {
  filters?: EmployeeTaskFilters;
  enabled?: boolean;
}

export const useEmployeeTasks = (options: UseEmployeeTasksOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { filters, enabled = true } = options;

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && enabled
  });

  // Fetch scheduled followups (tasks)
  const {
    data: tasks,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-tasks', profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('scheduled_followups')
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
            phone
          ),
          contracts (
            id,
            contract_number
          )
        `)
        .eq('assigned_to', profile.id);

      // Apply filters
      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.type && filters.type.length > 0) {
        query = query.in('followup_type', filters.type);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.dateRange) {
        query = query
          .gte('scheduled_date', filters.dateRange.start)
          .lte('scheduled_date', filters.dateRange.end);
      }

      const { data, error } = await query.order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Transform to EmployeeTask format
      const transformedTasks: EmployeeTask[] = (data || []).map(followup => {
        const customerName = followup.customers?.customer_type === 'corporate'
          ? (followup.customers?.company_name_ar || followup.customers?.company_name)
          : `${followup.customers?.first_name_ar || followup.customers?.first_name || ''} ${followup.customers?.last_name_ar || followup.customers?.last_name || ''}`.trim();

        // Determine if task is overdue
        const scheduledDate = parseISO(followup.scheduled_date);
        const isOverdue = isPast(scheduledDate) && followup.status === 'pending';

        return {
          id: followup.id,
          type: followup.followup_type as any,
          title: followup.title,
          title_ar: followup.title,
          description: followup.description,
          contract_id: followup.contract_id || '',
          contract_number: followup.contracts?.contract_number || '',
          customer_id: followup.customer_id,
          customer_name: customerName,
          customer_phone: followup.customers?.phone,
          scheduled_date: followup.scheduled_date,
          scheduled_time: followup.scheduled_time,
          priority: followup.priority as any,
          status: isOverdue ? 'overdue' : followup.status as any,
          outcome: followup.outcome,
          outcome_notes: followup.outcome_notes,
          completed_at: followup.completed_at,
          created_at: followup.created_at,
          assigned_to: followup.assigned_to || ''
        };
      });

      return transformedTasks;
    },
    enabled: !!profile?.id && enabled,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Get today's tasks
  const todayTasks = tasks?.filter(task => 
    isToday(parseISO(task.scheduled_date))
  ) || [];

  // Get overdue tasks
  const overdueTasks = tasks?.filter(task => 
    task.status === 'overdue'
  ) || [];

  // Get pending tasks
  const pendingTasks = tasks?.filter(task => 
    task.status === 'pending'
  ) || [];

  // Get completed tasks
  const completedTasks = tasks?.filter(task => 
    task.status === 'completed'
  ) || [];

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      outcome, 
      notes 
    }: { 
      taskId: string; 
      outcome: string; 
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_followups')
        .update({
          status: 'completed',
          outcome,
          outcome_notes: notes,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      toast({
        title: 'تم إكمال المهمة',
        description: 'تم تحديث حالة المهمة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في تحديث المهمة',
        variant: 'destructive',
      });
      console.error('Error completing task:', error);
    }
  });

  // Reschedule task mutation
  const rescheduleTaskMutation = useMutation({
    mutationFn: async ({ 
      taskId, 
      newDate, 
      newTime,
      reason 
    }: { 
      taskId: string; 
      newDate: string; 
      newTime?: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('scheduled_followups')
        .update({
          scheduled_date: newDate,
          scheduled_time: newTime,
          status: 'rescheduled',
          delay_reason: reason
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      toast({
        title: 'تم إعادة الجدولة',
        description: 'تم تحديث موعد المهمة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في إعادة جدولة المهمة',
        variant: 'destructive',
      });
      console.error('Error rescheduling task:', error);
    }
  });

  // Cancel task mutation
  const cancelTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase
        .from('scheduled_followups')
        .update({ status: 'cancelled' })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-tasks'] });
      toast({
        title: 'تم إلغاء المهمة',
        description: 'تم إلغاء المهمة بنجاح',
      });
    },
    onError: (error) => {
      toast({
        title: 'خطأ',
        description: 'فشل في إلغاء المهمة',
        variant: 'destructive',
      });
      console.error('Error cancelling task:', error);
    }
  });

  // Stats
  const stats = {
    totalTasks: tasks?.length || 0,
    todayTasks: todayTasks.length,
    overdueTasks: overdueTasks.length,
    pendingTasks: pendingTasks.length,
    completedTasks: completedTasks.length,
    completionRate: tasks && tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100) 
      : 0
  };

  return {
    tasks: tasks || [],
    todayTasks,
    overdueTasks,
    pendingTasks,
    completedTasks,
    stats,
    isLoading,
    error,
    refetch,
    completeTask: completeTaskMutation.mutate,
    rescheduleTask: rescheduleTaskMutation.mutate,
    cancelTask: cancelTaskMutation.mutate,
    isCompletingTask: completeTaskMutation.isPending,
    isReschedulingTask: rescheduleTaskMutation.isPending,
    profile
  };
};
