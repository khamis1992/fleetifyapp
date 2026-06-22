/**
 * useRealtimeNotifications Hook
 * 
 * React hook for managing real-time notifications
 * Automatically handles subscription lifecycle and cleanup
 */

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  subscribeToNotifications, 
  NotificationPayload,
  cleanupRealtimeSubscriptions 
} from '@/utils/realtimeNotifications';

interface UseRealtimeNotificationsOptions {
  /**
   * Show toast notifications for new messages
   */
  showToast?: boolean;
  
  /**
   * Play sound on new notification
   */
  playSound?: boolean;
  
  /**
   * Custom notification handler
   */
  onNotification?: (notification: NotificationPayload) => void;
  
  /**
   * Filter notifications by type
   */
  filterType?: 'info' | 'success' | 'warning' | 'error';
}

export const useRealtimeNotifications = (options: UseRealtimeNotificationsOptions = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    showToast = true,
    playSound = false,
    onNotification,
    filterType
  } = options;
  
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const handleNotification = useCallback((notification: NotificationPayload) => {
    console.log('🔔 [HOOK] Notification received:', notification);
    
    // Filter by type if specified
    if (filterType && notification.notification_type !== filterType) {
      return;
    }
    
    // Invalidate notifications queries
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['unified-notification-count'] });
    
    // Show toast if enabled
    if (showToast) {
      const toastVariant = notification.notification_type === 'error' 
        ? 'destructive' 
        : notification.notification_type === 'warning'
        ? 'default'
        : 'default';
      
      toast({
        title: notification.title,
        description: notification.message,
        variant: toastVariant,
        duration: 5000,
      });
    }
    
    // Play sound if enabled
    if (playSound) {
      playNotificationSound();
    }
    
    // Call custom handler
    onNotification?.(notification);
  }, [showToast, playSound, onNotification, filterType, toast, queryClient]);

  useEffect(() => {
    if (!user?.id || !user?.company_id) {
      console.log('⚠️ [HOOK] User not authenticated, skipping subscription');
      return;
    }

    console.log('📡 [HOOK] Setting up real-time notifications');
    
    // Subscribe to notifications
    const unsubscribe = subscribeToNotifications(
      user.id,
      user.company_id,
      handleNotification
    );
    
    unsubscribeRef.current = unsubscribe;

    // Cleanup on unmount
    return () => {
      console.log('🔌 [HOOK] Cleaning up real-time notifications');
      unsubscribe();
    };
  }, [user?.id, user?.company_id, handleNotification]);

  // Cleanup on app unmount
  useEffect(() => {
    return () => {
      cleanupRealtimeSubscriptions();
    };
  }, []);

  return {
    isConnected: !!unsubscribeRef.current,
  };
};

/**
 * Play notification sound
 */
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(error => {
      console.warn('Could not play notification sound:', error);
    });
  } catch (error) {
    console.warn('Notification sound error:', error);
  }
};

/**
 * Hook for subscribing to specific table changes
 */
export const useRealtimeTable = <T = any>(
  table: string,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onInsert?: (record: T) => void;
    onUpdate?: (oldRecord: T, newRecord: T) => void;
    onDelete?: (record: T) => void;
    enabled?: boolean;
  }
) => {
  const { enabled = true, ...subscriptionOptions } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    console.log(`📡 [HOOK] Setting up ${table} realtime subscription`);

    const { subscribeToTableChanges } = require('@/utils/realtimeNotifications');
    
    const unsubscribe = subscribeToTableChanges<T>(table, {
      ...subscriptionOptions,
      onInsert: (record) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: [table] });
        subscriptionOptions.onInsert?.(record);
      },
      onUpdate: (oldRecord, newRecord) => {
        queryClient.invalidateQueries({ queryKey: [table] });
        subscriptionOptions.onUpdate?.(oldRecord, newRecord);
      },
      onDelete: (record) => {
        queryClient.invalidateQueries({ queryKey: [table] });
        subscriptionOptions.onDelete?.(record);
      },
    });

    return () => {
      console.log(`🔌 [HOOK] Cleaning up ${table} subscription`);
      unsubscribe();
    };
  }, [table, enabled, queryClient]);
};

/**
 * Hook for presence tracking (online users)
 */
export const usePresence = (channelName: string, metadata?: Record<string, any>) => {
  const { user } = useAuth();
  const presenceRef = useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;

    const { subscribeToPresence } = require('@/utils/realtimeNotifications');
    
    const presence = subscribeToPresence(channelName, user.id, metadata);
    presenceRef.current = presence;

    // Track presence
    presence.track();

    return () => {
      presence.untrack();
    };
  }, [channelName, user?.id, metadata]);

  const getOnlineUsers = useCallback(async () => {
    if (!presenceRef.current) return [];
    return await presenceRef.current.getPresence();
  }, []);

  return {
    getOnlineUsers,
  };
};
