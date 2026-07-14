/**
 * useEmployeeNotifications Hook
 * Hook لإدارة إشعارات الموظف
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';
import type { 
  EmployeeNotification, 
  NotificationStats, 
  NotificationFilters 
} from '@/types/mobile-employee.types';

interface UseEmployeeNotificationsReturn {
  notifications: EmployeeNotification[];
  unreadNotifications: EmployeeNotification[];
  importantNotifications: EmployeeNotification[];
  stats: NotificationStats;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
}

type NotificationPayload = {
  type?: string;
  title?: string;
  title_ar?: string;
  message?: string;
  message_ar?: string;
  related_id?: string;
  related_type?: string;
};

const parseNotificationPayload = (value: Json): NotificationPayload =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as NotificationPayload
    : {};

export const useEmployeeNotifications = (
  filters?: NotificationFilters
): UseEmployeeNotificationsReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get employee's profile
  const { data: profile } = useQuery({
    queryKey: ['employee-profile-notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id')
        .eq('user_id', user!.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ['employee-notifications', profile?.id, filters],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('staff_notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('company_id', profile.company_id);

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((row): EmployeeNotification => {
        const payload = parseNotificationPayload(row.notification);
        return {
          id: row.id,
          type: (payload.type || 'new_task_assigned') as EmployeeNotification['type'],
          title: payload.title || '',
          title_ar: payload.title_ar,
          message: payload.message || '',
          message_ar: payload.message_ar,
          priority: row.priority as EmployeeNotification['priority'],
          is_read: row.status === 'read' || Boolean(row.read_at),
          profile_id: row.user_id || profile.id,
          related_id: payload.related_id,
          related_type: payload.related_type,
          created_at: row.created_at,
          read_at: row.read_at || undefined,
        };
      });

      return mapped.filter((notification) => {
        if (filters?.type?.length && !filters.type.includes(notification.type)) return false;
        if (filters?.priority?.length && !filters.priority.includes(notification.priority)) return false;
        if (filters?.isRead !== undefined && notification.is_read !== filters.isRead) return false;
        return true;
      });
    },
    enabled: !!profile?.id && !!profile?.company_id,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
  });

  // Filter notifications
  const unreadNotifications = notifications.filter(n => !n.is_read);
  const importantNotifications = notifications.filter(n => n.priority === 'high');

  // Calculate stats
  const stats: NotificationStats = {
    total: notifications.length,
    unread: unreadNotifications.length,
    important: importantNotifications.length,
  };

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!profile?.id || !profile.company_id) throw new Error('المستخدم أو الشركة غير محددين');
      const { error } = await supabase
        .from('staff_notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', profile.id)
        .eq('company_id', profile.company_id)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !profile.company_id) return;

      const { error } = await supabase
        .from('staff_notifications')
        .update({
          status: 'read',
          read_at: new Date().toISOString(),
        })
        .eq('user_id', profile.id)
        .eq('company_id', profile.company_id)
        .neq('status', 'read');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!profile?.id || !profile.company_id) throw new Error('المستخدم أو الشركة غير محددين');
      const { error } = await supabase
        .from('staff_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', profile.id)
        .eq('company_id', profile.company_id)
        .select('id')
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });

  return {
    notifications,
    unreadNotifications,
    importantNotifications,
    stats,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
    markAsRead: (notificationId: string) => markAsReadMutation.mutateAsync(notificationId),
    markAllAsRead: () => markAllAsReadMutation.mutateAsync(),
    deleteNotification: (notificationId: string) => 
      deleteNotificationMutation.mutateAsync(notificationId),
  };
};
