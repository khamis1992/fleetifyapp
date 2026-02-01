/**
 * useEmployeeNotifications Hook
 * Hook لإدارة إشعارات الموظف
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
        .eq('user_id', user?.id)
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
        .from('employee_notifications')
        .select('*')
        .eq('profile_id', profile.id);

      // Apply filters
      if (filters?.type && filters.type.length > 0) {
        query = query.in('type', filters.type);
      }

      if (filters?.priority && filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      if (filters?.isRead !== undefined) {
        query = query.eq('is_read', filters.isRead);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as EmployeeNotification[];
    },
    enabled: !!profile?.id,
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
      const { error } = await supabase
        .from('employee_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;

      const { error } = await supabase
        .from('employee_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('profile_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-notifications'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('employee_notifications')
        .delete()
        .eq('id', notificationId);

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
