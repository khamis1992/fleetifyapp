import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useToast } from '@/hooks/use-toast';
import { usePropertyAlerts } from '@/hooks/usePropertyAlerts';

export interface RealTimeAlert {
  id: string;
  type: 'smart' | 'budget' | 'vehicle' | 'property' | 'system' | 'notification';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  created_at: string;
  data?: Record<string, any>;
}

export const useRealTimeAlerts = () => {
  const { companyId, user, getQueryKey } = useUnifiedCompanyAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubscribed, setIsSubscribed] = useState(false);
  
  // Get property alerts
  const { data: propertyAlerts = [] } = usePropertyAlerts();

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

      // Add property alerts to real-time alerts
      propertyAlerts.forEach(alert => {
        if (!alert.acknowledged) {
          allAlerts.push({
            id: alert.id,
            type: 'property',
            severity: alert.priority === 'high' ? 'high' : 'medium',
            title: alert.title,
            message: alert.description,
            created_at: alert.createdAt.toISOString(),
            data: {
              property_id: alert.propertyId,
              contract_id: alert.contractId,
              alert_type: alert.type,
              due_date: alert.dueDate,
              days_remaining: alert.daysRemaining,
              amount: alert.amount
            }
          });
        }
      });

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
          toast({
            title: "تنبيه موازنة جديد",
            description: newAlert.message_ar || newAlert.message,
            variant: newAlert.alert_type === 'budget_exceeded' ? 'destructive' : 'default',
          });
          queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
          // Also invalidate other notification-related queries for sync
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
          queryClient.invalidateQueries({ queryKey: getQueryKey(['budget-alerts']) });
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
          toast({
            title: "تنبيه مركبة جديد",
            description: newAlert.alert_message,
            variant: newAlert.priority === 'high' ? 'destructive' : 'default',
          });
          queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
          // Also invalidate other notification-related queries for sync
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
          queryClient.invalidateQueries({ queryKey: getQueryKey(['vehicle-alerts']) });
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
          
          // Check if it's a verification task notification
          if (newNotification.related_type === 'verification_task') {
            // Play distinctive sound
            const soundEnabled = localStorage.getItem('notificationSoundEnabled') !== 'false';
            if (soundEnabled) {
              try {
                const audio = new Audio('/sounds/verification-task.mp3');
                audio.volume = 0.4;
                audio.play().catch(() => {
                  // Fallback to Web Audio API
                  try {
                    const context = new AudioContext();
                    const playTone = (frequency: number, startTime: number, duration: number) => {
                      const oscillator = context.createOscillator();
                      const gainNode = context.createGain();
                      oscillator.connect(gainNode);
                      gainNode.connect(context.destination);
                      oscillator.frequency.value = frequency;
                      oscillator.type = 'sine';
                      gainNode.gain.setValueAtTime(0.15, context.currentTime + startTime);
                      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + startTime + duration);
                      oscillator.start(context.currentTime + startTime);
                      oscillator.stop(context.currentTime + startTime + duration);
                    };
                    playTone(880, 0, 0.15);
                    playTone(1100, 0.15, 0.15);
                    playTone(880, 0.35, 0.15);
                  } catch (e) { console.log('Sound error:', e); }
                });
              } catch (e) { console.log('Sound error:', e); }
            }
            
            // Show special toast for verification task
            toast({
              title: "📋 مهمة تدقيق جديدة",
              description: newNotification.message || "تم تكليفك بمهمة تدقيق بيانات عميل",
              variant: 'default',
              duration: 10000, // Show longer
            });
            
            // Browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('مهمة تدقيق جديدة', {
                body: newNotification.message || 'تم تكليفك بمهمة تدقيق بيانات عميل',
                icon: '/favicon.ico',
                tag: 'verification-task',
                requireInteraction: true
              });
            }
          } else {
            toast({
              title: "إشعار جديد",
              description: newNotification.title,
              variant: newNotification.notification_type === 'error' ? 'destructive' : 'default',
            });
          }
          
          queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
          // Also invalidate other notification-related queries for sync
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
          queryClient.invalidateQueries({ queryKey: getQueryKey(['user-notifications']) });
        }
      )
      .subscribe();

    setIsSubscribed(true);

    // Cleanup function
    return () => {
      alertsChannel.unsubscribe();
      setIsSubscribed(false);
    };
  }, [companyId, queryClient, toast, user?.id, getQueryKey]);

  // Statistics
  const totalAlerts = alerts.length;
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical').length;
  const highPriorityAlerts = alerts.filter(alert => 
    alert.severity === 'critical' || alert.severity === 'high'
  ).length;
  
  // Count verification task notifications
  const verificationTaskAlerts = alerts.filter(alert => 
    alert.data?.related_type === 'verification_task'
  ).length;

  // Update browser tab title when there are verification tasks
  useEffect(() => {
    const originalTitle = document.title.replace(/^\(.*?\)\s*/, '');
    
    if (verificationTaskAlerts > 0) {
      document.title = `(${verificationTaskAlerts} مهمة تدقيق) ${originalTitle}`;
    } else if (totalAlerts > 0) {
      document.title = `(${totalAlerts}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [verificationTaskAlerts, totalAlerts]);

  // Play sound for verification task notifications
  useEffect(() => {
    if (verificationTaskAlerts > 0) {
      const soundEnabled = localStorage.getItem('notificationSoundEnabled') !== 'false';
      if (soundEnabled) {
        playVerificationTaskSound();
      }
    }
  }, [verificationTaskAlerts]);

  // Play a distinctive sound for verification tasks
  const playVerificationTaskSound = () => {
    try {
      // Try to play audio file first
      const audio = new Audio('/sounds/verification-task.mp3');
      audio.volume = 0.4;
      audio.play().catch(() => {
        // Fallback to Web Audio API with a distinctive tone
        try {
          const context = new AudioContext();
          
          // Play two tones for verification task
          const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(context.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.15, context.currentTime + startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + startTime + duration);
            oscillator.start(context.currentTime + startTime);
            oscillator.stop(context.currentTime + startTime + duration);
          };
          
          // Two-tone notification sound
          playTone(880, 0, 0.15);      // A5
          playTone(1100, 0.15, 0.15);  // C#6
          playTone(880, 0.35, 0.15);   // A5
        } catch (e) {
          // Quietly handle errors - browsers block autoplay without user interaction
          // We don't want to spam the console with these warnings
        }
      });
    } catch (error) {
      // Quietly handle errors
    }
  };

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
        // Check if it's a verification task notification - don't allow manual dismissal
        const { data: notification } = await supabase
          .from('user_notifications')
          .select('related_type')
          .eq('id', alertId)
          .single();
        
        if (notification?.related_type === 'verification_task') {
          toast({
            title: "غير مسموح",
            description: "تنبيهات مهام التدقيق تبقى حتى إكمال المهمة",
            variant: "default"
          });
          return;
        }
        
        await supabase
          .from('user_notifications')
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq('id', alertId);
      } else if (alertType === 'property') {
        // For property alerts, we'll mark them as acknowledged locally
        // since they don't have a direct table acknowledgment field
        console.log('Property alert dismissed:', alertId);
      }
      
      // Refresh alerts - invalidate all related query keys for synchronization
      queryClient.invalidateQueries({ queryKey: ['real-time-alerts'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['real-time-alerts']) });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['notifications']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['budget-alerts']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['vehicle-alerts']) });
      queryClient.invalidateQueries({ queryKey: getQueryKey(['property-alerts']) });
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

      // Mark all notifications as read (except verification task notifications)
      await supabase
        .from('user_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false)
        .or('related_type.is.null,related_type.neq.verification_task');

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
    verificationTaskAlerts,
    dismissAlert,
    markAllAsRead,
    isSubscribed,
    playVerificationTaskSound
  };
};