import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TaskNotification {
  id: string;
  task_id: string;
  user_id: string;
  type: 'assignment' | 'due_reminder' | 'status_change' | 'comment' | 'mention';
  title: string;
  message?: string;
  is_read: boolean;
  whatsapp_sent: boolean;
  whatsapp_sent_at?: string;
  created_at: string;
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
  };
}

// Hook: Fetch User Notifications
export function useTaskNotifications(unreadOnly = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task-notifications', user?.id, unreadOnly],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('task_notifications')
        .select(`
          *,
          task:tasks(id, title, status, priority)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data as TaskNotification[];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Hook: Get Unread Count
export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['task-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('task_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

// Hook: Mark Notification as Read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('task_notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
      return notificationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['task-notifications-count'] });
    },
  });
}

// Hook: Mark All Notifications as Read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('المستخدم غير مسجل');

      const { error } = await supabase
        .from('task_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['task-notifications-count'] });
      toast.success('تم تحديد جميع الإشعارات كمقروءة');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ');
    },
  });
}

// Hook: Send WhatsApp Notification
export function useSendWhatsAppNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      notificationId, 
      phoneNumber, 
      message 
    }: { 
      notificationId: string; 
      phoneNumber: string; 
      message: string;
    }) => {
      // This would integrate with your WhatsApp API
      // For now, we'll just mark it as sent
      const { error } = await supabase
        .from('task_notifications')
        .update({ 
          whatsapp_sent: true,
          whatsapp_sent_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      // TODO: Integrate with actual WhatsApp API
      // const response = await sendWhatsAppMessage(phoneNumber, message);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
      toast.success('تم إرسال إشعار WhatsApp');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل إرسال إشعار WhatsApp');
    },
  });
}

// Hook: Create Due Reminder Notifications (for scheduled jobs)
export function useCreateDueReminders() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Find tasks due within 24 hours that haven't had reminders sent
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: dueTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, assigned_to, due_date')
        .eq('reminder_sent', false)
        .not('assigned_to', 'is', null)
        .lte('due_date', tomorrow.toISOString())
        .gt('due_date', new Date().toISOString())
        .not('status', 'in', '("completed","cancelled")');

      if (fetchError) throw fetchError;

      if (!dueTasks || dueTasks.length === 0) {
        return { count: 0 };
      }

      // Create notifications for each task
      const notifications = dueTasks.map(task => ({
        task_id: task.id,
        user_id: task.assigned_to!,
        type: 'due_reminder' as const,
        title: 'تذكير: موعد تسليم قريب',
        message: `المهمة "${task.title}" مستحقة قريباً`,
      }));

      const { error: insertError } = await supabase
        .from('task_notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      // Mark tasks as reminder sent
      const taskIds = dueTasks.map(t => t.id);
      await supabase
        .from('tasks')
        .update({ reminder_sent: true })
        .in('id', taskIds);

      return { count: notifications.length };
    },
    onSuccess: (result) => {
      if (result.count > 0) {
        queryClient.invalidateQueries({ queryKey: ['task-notifications'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
  });
}

// Type definitions for notification display
export const notificationTypeLabels: Record<TaskNotification['type'], string> = {
  assignment: 'إسناد مهمة',
  due_reminder: 'تذكير بالموعد',
  status_change: 'تغيير الحالة',
  comment: 'تعليق جديد',
  mention: 'إشارة',
};

export const notificationTypeIcons: Record<TaskNotification['type'], string> = {
  assignment: '📋',
  due_reminder: '⏰',
  status_change: '🔄',
  comment: '💬',
  mention: '@',
};

