import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface Task {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  created_by: string;
  assigned_to?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  start_date?: string;
  completed_at?: string;
  category?: string;
  tags?: string[];
  whatsapp_notification_sent: boolean;
  whatsapp_sent_at?: string;
  reminder_sent: boolean;
  attachments?: any[];
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relations
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    avatar_url?: string;
  };
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    avatar_url?: string;
  };
  checklists?: TaskChecklist[];
  comments_count?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  attachments?: any[];
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
    avatar_url?: string;
  };
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  completed_by?: string;
  completed_at?: string;
  sort_order: number;
  created_at: string;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  old_value?: any;
  new_value?: any;
  description?: string;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    first_name_ar?: string;
    last_name_ar?: string;
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  assigned_to?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  due_date?: string;
  start_date?: string;
  category?: string;
  tags?: string[];
  checklists?: { title: string }[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
}

export interface TaskFilters {
  status?: Task['status'] | Task['status'][];
  priority?: Task['priority'] | Task['priority'][];
  assigned_to?: string;
  created_by?: string;
  category?: string;
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
}

// Hook: Fetch Tasks
export function useTasks(filters?: TaskFilters) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['tasks', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(id, first_name, last_name, first_name_ar, last_name_ar, avatar_url),
          checklists:task_checklists(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.priority) {
        if (Array.isArray(filters.priority)) {
          query = query.in('priority', filters.priority);
        } else {
          query = query.eq('priority', filters.priority);
        }
      }

      if (filters?.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }

      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }

      if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!companyId,
  });
}

// Hook: Fetch Single Task
export function useTask(taskId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(id, first_name, last_name, first_name_ar, last_name_ar, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(id, first_name, last_name, first_name_ar, last_name_ar, avatar_url),
          checklists:task_checklists(*)
        `)
        .eq('id', taskId)
        .single();

      if (error) throw error;
      return data as Task;
    },
    enabled: !!taskId && !!user,
  });
}

// Hook: Create Task
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const companyId = user?.profile?.company_id;
      if (!companyId || !user?.id) {
        throw new Error('لم يتم تحديد الشركة أو المستخدم');
      }

      const { checklists, ...taskData } = input;

      // Create the task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          company_id: companyId,
          created_by: user.id,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create checklists if provided
      if (checklists && checklists.length > 0) {
        const checklistItems = checklists.map((item, index) => ({
          task_id: task.id,
          title: item.title,
          sort_order: index,
        }));

        const { error: checklistError } = await supabase
          .from('task_checklists')
          .insert(checklistItems);

        if (checklistError) {
          console.error('Error creating checklists:', checklistError);
        }
      }

      // Create notification for assignee if assigned
      if (input.assigned_to && input.assigned_to !== user.id) {
        await supabase.from('task_notifications').insert({
          task_id: task.id,
          user_id: input.assigned_to,
          type: 'assignment',
          title: 'مهمة جديدة',
          message: `تم إسناد مهمة جديدة إليك: ${input.title}`,
        });
      }

      return task as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('تم إنشاء المهمة بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إنشاء المهمة');
    },
  });
}

// Hook: Update Task
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const { id, checklists, ...taskData } = input;

      const { data: task, error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Handle assignee change notification
      if (taskData.assigned_to && taskData.assigned_to !== user?.id) {
        await supabase.from('task_notifications').insert({
          task_id: id,
          user_id: taskData.assigned_to,
          type: 'assignment',
          title: 'تم إسناد مهمة إليك',
          message: `تم إسناد المهمة "${task.title}" إليك`,
        });
      }

      return task as Task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      toast.success('تم تحديث المهمة بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث المهمة');
    },
  });
}

// Hook: Delete Task
export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('تم حذف المهمة بنجاح');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء حذف المهمة');
    },
  });
}

// Hook: Update Task Status
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: Task['status'] }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث حالة المهمة');
    },
  });
}

// Hook: Task Comments
export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:profiles!task_comments_user_id_fkey(id, first_name, last_name, first_name_ar, last_name_ar, avatar_url)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!taskId,
  });
}

// Hook: Add Comment
export function useAddTaskComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ taskId, content }: { taskId: string; content: string }) => {
      if (!user?.id) throw new Error('المستخدم غير مسجل');

      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TaskComment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء إضافة التعليق');
    },
  });
}

// Hook: Task Activity Log
export function useTaskActivityLog(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_activity_log')
        .select(`
          *,
          user:profiles!task_activity_log_user_id_fkey(id, first_name, last_name, first_name_ar, last_name_ar)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TaskActivityLog[];
    },
    enabled: !!taskId,
  });
}

// Hook: Toggle Checklist Item
export function useToggleChecklist() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ checklistId, isCompleted }: { checklistId: string; isCompleted: boolean }) => {
      const { data, error } = await supabase
        .from('task_checklists')
        .update({
          is_completed: isCompleted,
          completed_by: isCompleted ? user?.id : null,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', checklistId)
        .select()
        .single();

      if (error) throw error;
      return data as TaskChecklist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث القائمة');
    },
  });
}

// Hook: Get Team Members (for assignment)
export function useTeamMembers() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['team-members', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, first_name_ar, last_name_ar, avatar_url, position, position_ar')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('first_name_ar');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// Hook: Task Statistics
export function useTaskStatistics() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['task-statistics', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('tasks')
        .select('status, priority')
        .eq('company_id', companyId);

      if (error) throw error;

      const stats = {
        total: data.length,
        byStatus: {
          pending: data.filter(t => t.status === 'pending').length,
          in_progress: data.filter(t => t.status === 'in_progress').length,
          completed: data.filter(t => t.status === 'completed').length,
          cancelled: data.filter(t => t.status === 'cancelled').length,
          on_hold: data.filter(t => t.status === 'on_hold').length,
        },
        byPriority: {
          urgent: data.filter(t => t.priority === 'urgent').length,
          high: data.filter(t => t.priority === 'high').length,
          medium: data.filter(t => t.priority === 'medium').length,
          low: data.filter(t => t.priority === 'low').length,
        },
        completionRate: data.length > 0 
          ? Math.round((data.filter(t => t.status === 'completed').length / data.length) * 100) 
          : 0,
      };

      return stats;
    },
    enabled: !!companyId,
  });
}

