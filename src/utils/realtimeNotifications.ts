/**
 * Real-time Notifications System
 * 
 * Provides comprehensive real-time notification capabilities using Supabase Realtime.
 * Handles notification delivery, subscription management, and cleanup.
 */

import { logger } from '@/lib/logger';

import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface NotificationPayload {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: 'info' | 'success' | 'warning' | 'error';
  related_id?: string;
  related_type?: string;
  created_at: string;
}

export type NotificationHandler = (notification: NotificationPayload) => void;

let notificationChannel: RealtimeChannel | null = null;
const notificationHandlers = new Set<NotificationHandler>();

/**
 * Subscribe to real-time notifications for the current user
 */
export const subscribeToNotifications = (
  userId: string,
  companyId: string,
  onNotification: NotificationHandler
): (() => void) => {
  // Add handler to set
  notificationHandlers.add(onNotification);

  // Create channel if it doesn't exist
  if (!notificationChannel) {
    logger.log('📡 [REALTIME] Creating notifications channel');
    
    notificationChannel = supabase.channel('notifications-realtime', {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    // Subscribe to user_notifications table changes
    notificationChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          logger.log('🔔 [REALTIME] New notification received:', payload);
          
          const notification = payload.new as NotificationPayload;
          
          // Notify all handlers
          notificationHandlers.forEach(handler => {
            try {
              handler(notification);
            } catch (error) {
              logger.error('❌ [REALTIME] Error in notification handler:', error);
            }
          });
        }
      )
      .subscribe((status) => {
        logger.log('📡 [REALTIME] Notifications subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          logger.log('✅ [REALTIME] Notifications subscription established');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('❌ [REALTIME] Notifications subscription error');
        }
      });
  }

  // Return cleanup function
  return () => {
    notificationHandlers.delete(onNotification);
    
    // If no more handlers, remove channel
    if (notificationHandlers.size === 0 && notificationChannel) {
      logger.log('🔌 [REALTIME] Removing notifications channel');
      supabase.removeChannel(notificationChannel);
      notificationChannel = null;
    }
  };
};

/**
 * Send a notification to specific user(s)
 */
export const sendNotification = async (notification: Omit<NotificationPayload, 'id' | 'created_at'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .insert({
        ...notification,
        is_read: false,
      });

    if (error) throw error;
    
    logger.log('✅ [REALTIME] Notification sent successfully');
    return true;
  } catch (error) {
    logger.error('❌ [REALTIME] Failed to send notification:', error);
    return false;
  }
};

/**
 * Broadcast a message to all users in a channel
 */
export const broadcastMessage = async (
  channel: string,
  event: string,
  payload: any
): Promise<boolean> => {
  try {
    const broadcastChannel = supabase.channel(channel);
    
    await broadcastChannel.send({
      type: 'broadcast',
      event,
      payload
    });

    logger.log('📢 [REALTIME] Broadcast sent:', { channel, event });
    return true;
  } catch (error) {
    logger.error('❌ [REALTIME] Broadcast failed:', error);
    return false;
  }
};

/**
 * Subscribe to data changes for a specific table
 */
export const subscribeToTableChanges = <T = any>(
  table: string,
  options: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
    onInsert?: (record: T) => void;
    onUpdate?: (oldRecord: T, newRecord: T) => void;
    onDelete?: (record: T) => void;
  }
): (() => void) => {
  const { event = '*', filter, onInsert, onUpdate, onDelete } = options;
  
  const channelName = `${table}-changes-${Date.now()}`;
  const channel = supabase.channel(channelName);

  const config: any = {
    event,
    schema: 'public',
    table
  };

  if (filter) {
    config.filter = filter;
  }

  channel
    .on('postgres_changes', config, (payload) => {
      logger.log(`🔄 [REALTIME] ${table} change:`, payload.eventType);
      
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new as T);
          break;
        case 'UPDATE':
          onUpdate?.(payload.old as T, payload.new as T);
          break;
        case 'DELETE':
          onDelete?.(payload.old as T);
          break;
      }
    })
    .subscribe((status) => {
      logger.log(`📡 [REALTIME] ${table} subscription:`, status);
    });

  // Return cleanup function
  return () => {
    logger.log(`🔌 [REALTIME] Removing ${table} subscription`);
    supabase.removeChannel(channel);
  };
};

/**
 * Hook for presence tracking (who's online)
 */
export const subscribeToPresence = (
  channel: string,
  userId: string,
  metadata?: Record<string, any>
): {
  track: () => Promise<void>;
  untrack: () => Promise<void>;
  getPresence: () => Promise<any[]>;
} => {
  const presenceChannel = supabase.channel(channel, {
    config: {
      presence: {
        key: userId
      }
    }
  });

  presenceChannel.subscribe();

  return {
    track: async () => {
      await presenceChannel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...metadata
      });
    },
    untrack: async () => {
      await presenceChannel.untrack();
    },
    getPresence: async () => {
      const state = presenceChannel.presenceState();
      return Object.values(state).flat();
    }
  };
};

/**
 * Cleanup all realtime subscriptions
 */
export const cleanupRealtimeSubscriptions = async (): Promise<void> => {
  try {
    const channels = supabase.getChannels();
    
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    
    notificationHandlers.clear();
    notificationChannel = null;
    
    logger.log('🧹 [REALTIME] All subscriptions cleaned up');
  } catch (error) {
    logger.error('❌ [REALTIME] Cleanup error:', error);
  }
};

/**
 * Get real-time connection status
 */
export const getRealtimeStatus = (): {
  connected: boolean;
  channelCount: number;
} => {
  const channels = supabase.getChannels();
  
  return {
    connected: channels.length > 0,
    channelCount: channels.length
  };
};
