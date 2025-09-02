import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useNotificationThrottling } from '@/hooks/useNotificationThrottling';
import { useToast } from '@/hooks/use-toast';

export interface RealTimeAlert {
  id: string;
  type: 'smart' | 'budget' | 'vehicle' | 'system' | 'notification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  created_at: string;
  data?: Record<string, any>;
}

export const useRealTimeAlerts = () => {
  const { companyId, user, getQueryKey } = useUnifiedCompanyAccess();
  const { showNotification } = useNotificationThrottling();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Query for fetching all alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: getQueryKey(['real-time-alerts']),
    queryFn: async (): Promise<RealTimeAlert[]> => {
      if (!companyId) return [];

      const allAlerts: RealTimeAlert[] = [];

      // Fetch budget alerts
      const { data: budgetAlerts } = await supabase
        .from('budget_alerts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (budgetAlerts) {
        budgetAlerts.forEach(alert => {
          allAlerts.push({
            id: alert.id,
            type: 'budget',
            severity: alert.alert_type === 'budget_exceeded' ? 'critical' : 'high',
            title: 'تجاوز في الموازنة',
            message: alert.message_ar || alert.message,
            created_at: alert.created_at,
            data: {
              percentage: alert.current_percentage,
              amount: alert.amount_exceeded,
              budget_id: alert.budget_id
            }
          });
        });
      }

      // Fetch vehicle alerts
      const { data: vehicleAlerts } = await supabase
        .from('vehicle_alerts')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_acknowledged', false)
        .order('created_at', { ascending: false });

      if (vehicleAlerts) {
        vehicleAlerts.forEach(alert => {
          allAlerts.push({
            id: alert.id,
            type: 'vehicle',
            severity: alert.priority === 'high' ? 'high' : 'medium',
            title: alert.alert_title,
            message: alert.alert_message,
            created_at: alert.created_at,
            data: {
              vehicle_id: alert.vehicle_id,
              alert_type: alert.alert_type,
              due_date: alert.due_date
            }
          });
        });
      }

      // Fetch notifications
      const { data: notifications } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (notifications) {
        notifications.forEach(notification => {
          allAlerts.push({
            id: notification.id,
            type: 'notification',
            severity: notification.notification_type === 'error' ? 'high' : 'medium',
            title: notification.title,
            message: notification.message,
            created_at: notification.created_at,
            data: {
              notification_type: notification.notification_type,
              related_id: notification.related_id,
              related_type: notification.related_type
            }
          });
        });
      }

      // Sort by creation date (newest first)
      return allAlerts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!companyId,
    staleTime: 1000 * 60, // 1 minute
  });

  // Real-time subscription
  useEffect(() => {
    if (!companyId || isSubscribed) return;

    // Create a unified channel for all alert types to avoid conflicts
    const alertsChannel = supabase
      .channel(`company-alerts-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'budget_alerts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Budget alert change:', payload);
          const newAlert = payload.new as any;
          
          // Use throttled notification system
          showNotification(
            'budget',
            "تنبيه موازنة جديد",
            newAlert.message_ar || newAlert.message,
            newAlert.alert_type === 'budget_exceeded' ? 'critical' : 'high',
            newAlert.alert_type === 'budget_exceeded' ? 'destructive' : 'default'
          );
          
          // Debounced query invalidation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
            queryClient.invalidateQueries({ queryKey: getQueryKey(['budget-alerts']) });
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'vehicle_alerts',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Vehicle alert change:', payload);
          const newAlert = payload.new as any;
          
          // Use throttled notification system
          showNotification(
            'vehicle',
            "تنبيه مركبة جديد",
            newAlert.alert_message,
            newAlert.priority === 'high' ? 'high' : 'medium',
            newAlert.priority === 'high' ? 'destructive' : 'default'
          );
          
          // Debounced query invalidation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
            queryClient.invalidateQueries({ queryKey: getQueryKey(['vehicle-alerts']) });
          }, 1000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Notification change:', payload);
          const newNotification = payload.new as any;
          
          // Use throttled notification system
          showNotification(
            'notification',
            newNotification.title,
            newNotification.message,
            newNotification.notification_type === 'error' ? 'critical' : 'medium',
            newNotification.notification_type === 'error' ? 'destructive' : 'default'
          );
          
          // Debounced query invalidation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
            queryClient.invalidateQueries({ queryKey: getQueryKey(['notifications']) });
          }, 1000);
        }
      )
      .subscribe();

    setIsSubscribed(true);

    // Cleanup function
    return () => {
      alertsChannel.unsubscribe();
      setIsSubscribed(false);
    };
  }, [companyId, queryClient, showNotification, user?.id, getQueryKey]);

  // Statistics
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const highPriorityAlerts = alerts.filter(alert => 
    alert.severity === 'critical' || alert.severity === 'high'
  ).length;

  // Alert management functions
  const dismissAlert = async (alertId: string, alertType: string) => {
    try {
      if (alertType === 'budget') {
        await supabase
          .from('budget_alerts')
          .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
          .eq('id', alertId);
      } else if (alertType === 'vehicle') {
        await supabase
          .from('vehicle_alerts')
          .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
          .eq('id', alertId);
      } else if (alertType === 'notification') {
        await supabase
          .from('user_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', alertId);
      }
      
      // Refresh alerts - invalidate all related query keys for synchronization
      queryClient.invalidateQueries({ queryKey: ['real-time-alerts'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['notifications']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['budget-alerts']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['vehicle-alerts']) });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد التنبيه",
        variant: "destructive"
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      if (!companyId) return;

      // Mark all budget alerts as acknowledged
      await supabase
        .from('budget_alerts')
        .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('is_acknowledged', false);

      // Mark all vehicle alerts as acknowledged
      await supabase
        .from('vehicle_alerts')
        .update({ is_acknowledged: true, acknowledged_at: new Date().toISOString() })
        .eq('company_id', companyId)
        .eq('is_acknowledged', false);

      // Mark all notifications as read
      await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);

      // Refresh alerts - invalidate all related query keys for synchronization
      queryClient.invalidateQueries({ queryKey: ['real-time-alerts'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['notifications']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['budget-alerts']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['vehicle-alerts']) });
      
      toast({
        title: "تم تأكيد جميع التنبيهات",
        description: "تم تأكيد جميع التنبيهات بنجاح"
      });
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تأكيد التنبيهات",
        variant: "destructive"
      });
    }
  };

  return {
    alerts,
    isLoading,
    totalAlerts,
    criticalAlerts,
    highPriorityAlerts,
    dismissAlert,
    markAllAsRead,
    isSubscribed
  };
};