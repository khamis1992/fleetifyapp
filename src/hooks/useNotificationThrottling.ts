import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ThrottledNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  count: number;
  lastSeen: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface NotificationSettings {
  enabled: boolean;
  cooldownMinutes: number;
  maxPerHour: number;
  groupSimilar: boolean;
  enableQuietHours: boolean;
  quietStart: string;
  quietEnd: string;
  allowCritical: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  cooldownMinutes: 5,
  maxPerHour: 20,
  groupSimilar: true,
  enableQuietHours: false,
  quietStart: '22:00',
  quietEnd: '08:00',
  allowCritical: true,
};

export const useNotificationThrottling = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    const stored = localStorage.getItem('notification-settings');
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });
  
  const [throttledNotifications, setThrottledNotifications] = useState<ThrottledNotification[]>([]);
  const notificationHistory = useRef<Array<{ timestamp: Date; type: string }>>([]);
  const cooldownMap = useRef<Map<string, Date>>(new Map());

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('notification-settings', JSON.stringify(settings));
  }, [settings]);

  // Clean up old history every hour
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      notificationHistory.current = notificationHistory.current.filter(
        h => h.timestamp > oneHourAgo
      );
      
      // Clean up cooldown map
      const now = new Date();
      cooldownMap.current.forEach((timestamp, key) => {
        if (now.getTime() - timestamp.getTime() > settings.cooldownMinutes * 60 * 1000) {
          cooldownMap.current.delete(key);
        }
      });
    }, 60000); // Run every minute

    return () => clearInterval(cleanup);
  }, [settings.cooldownMinutes]);

  const isInQuietHours = (): boolean => {
    if (!settings.enableQuietHours) return false;
    
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = parseInt(settings.quietStart.replace(':', ''));
    const endTime = parseInt(settings.quietEnd.replace(':', ''));
    
    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  };

  const getNotificationKey = (type: string, title: string): string => {
    if (settings.groupSimilar) {
      return `${type}-${title.substring(0, 20)}`;
    }
    return `${type}-${title}-${Date.now()}`;
  };

  const shouldThrottleNotification = (
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): boolean => {
    if (!settings.enabled) return false;
    
    // Always allow critical notifications if setting is enabled
    if (severity === 'critical' && settings.allowCritical) return false;
    
    // Check quiet hours
    if (isInQuietHours() && severity !== 'critical') return true;
    
    // Check hourly limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentNotifications = notificationHistory.current.filter(
      h => h.timestamp > oneHourAgo
    );
    
    if (recentNotifications.length >= settings.maxPerHour) return true;
    
    // Check cooldown
    const key = type;
    const lastSeen = cooldownMap.current.get(key);
    if (lastSeen) {
      const cooldownMs = settings.cooldownMinutes * 60 * 1000;
      if (Date.now() - lastSeen.getTime() < cooldownMs) return true;
    }
    
    return false;
  };

  const showNotification = (
    type: string,
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    variant?: 'default' | 'destructive'
  ) => {
    const notificationKey = getNotificationKey(type, title);
    
    if (shouldThrottleNotification(type, severity)) {
      // Add to throttled notifications instead of showing
      setThrottledNotifications(prev => {
        const existing = prev.find(n => n.id === notificationKey);
        if (existing) {
          return prev.map(n => 
            n.id === notificationKey 
              ? { ...n, count: n.count + 1, lastSeen: new Date() }
              : n
          );
        } else {
          return [...prev, {
            id: notificationKey,
            type,
            title,
            message,
            count: 1,
            lastSeen: new Date(),
            severity
          }];
        }
      });
      return;
    }

    // Show the notification
    toast({
      title,
      description: message,
      variant: variant || (severity === 'critical' ? 'destructive' : 'default'),
    });

    // Update history and cooldown
    notificationHistory.current.push({ timestamp: new Date(), type });
    cooldownMap.current.set(type, new Date());
  };

  const getThrottledSummary = (): string => {
    if (throttledNotifications.length === 0) return '';
    
    const total = throttledNotifications.reduce((sum, n) => sum + n.count, 0);
    const critical = throttledNotifications.filter(n => n.severity === 'critical').length;
    
    if (critical > 0) {
      return `${total} تنبيه محجوب (${critical} حرج)`;
    }
    return `${total} تنبيه محجوب`;
  };

  const clearThrottledNotifications = () => {
    setThrottledNotifications([]);
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    settings,
    updateSettings,
    showNotification,
    throttledNotifications,
    getThrottledSummary,
    clearThrottledNotifications,
    isInQuietHours: isInQuietHours(),
    notificationCount: throttledNotifications.reduce((sum, n) => sum + n.count, 0)
  };
};