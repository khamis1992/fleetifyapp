import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';
import { toast } from 'sonner';

export interface SmartAlert {
  id: string;
  company_id: string;
  alert_type: string;
  alert_title: string;
  alert_message: string;
  alert_data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  target_users?: string[];
  notification_sent: boolean;
  notification_sent_at?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface SmartAlertConfig {
  id: string;
  company_id: string;
  alert_type: string;
  is_enabled: boolean;
  trigger_conditions: any;
  notification_settings: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertCheckResult {
  success: boolean;
  total_alerts_created: number;
  breakdown: {
    payment_due_reminders: number;
    overdue_payments: number;
    credit_limit_alerts: number;
  };
  timestamp: string;
}

// Mock implementation since smart_alerts tables don't exist yet
// These hooks return empty data and are disabled until the tables are created

// Hook to get active alerts
export const useActiveAlerts = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['smart-alerts']),
    queryFn: async (): Promise<SmartAlert[]> => {
      // Return empty array since tables don't exist yet
      return [];
    },
    enabled: false, // Disabled until tables are created
    refetchInterval: 2 * 60 * 1000,
  });
};

// Hook to get alerts by priority
export const useAlertsByPriority = (priority?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['smart-alerts', 'priority', priority]),
    queryFn: async (): Promise<SmartAlert[]> => {
      return [];
    },
    enabled: false, // Disabled until tables are created
  });
};

// Hook to get alert configurations
export const useAlertConfigs = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['alert-configs']),
    queryFn: async (): Promise<SmartAlertConfig[]> => {
      return [];
    },
    enabled: false, // Disabled until tables are created
  });
};

// Hook to run smart alerts check
export const useRunAlertsCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AlertCheckResult> => {
      // Mock result since RPC doesn't exist yet
      return {
        success: true,
        total_alerts_created: 0,
        breakdown: {
          payment_due_reminders: 0,
          overdue_payments: 0,
          credit_limit_alerts: 0,
        },
        timestamp: new Date().toISOString()
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      toast.info('فحص التنبيهات غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error running alerts check:', error);
      toast.error(`خطأ في فحص التنبيهات: ${error.message}`);
    },
  });
};

// Hook to acknowledge an alert
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string): Promise<boolean> => {
      // Mock implementation
      return true;
    },
    onSuccess: (success, alertId) => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      toast.info('الإقرار بالتنبيه غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error acknowledging alert:', error);
      toast.error(`خطأ في الإقرار بالتنبيه: ${error.message}`);
    },
  });
};

// Hook to update alert status
export const useUpdateAlertStatus = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({
      alertId,
      status,
    }: {
      alertId: string;
      status: 'acknowledged' | 'resolved' | 'dismissed';
    }) => {
      // Mock implementation
      return { id: alertId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      toast.info('تحديث حالة التنبيه غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error updating alert status:', error);
      toast.error(`خطأ في تحديث حالة التنبيه: ${error.message}`);
    },
  });
};

// Hook to update alert configuration
export const useUpdateAlertConfig = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async ({
      configId,
      isEnabled,
      triggerConditions,
      notificationSettings,
    }: {
      configId: string;
      isEnabled?: boolean;
      triggerConditions?: any;
      notificationSettings?: any;
    }) => {
      // Mock implementation
      return { id: configId, is_enabled: isEnabled };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      toast.info('تحديث إعدادات التنبيه غير مُفعل حالياً');
    },
    onError: (error: any) => {
      console.error('Error updating alert config:', error);
      toast.error(`خطأ في تحديث إعدادات التنبيه: ${error.message}`);
    },
  });
};

// Hook to get alert statistics
export const useAlertStatistics = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['alert-statistics']),
    queryFn: async () => {
      // Mock statistics
      return {
        total: 0,
        active: 0,
        acknowledged: 0,
        resolved: 0,
        byPriority: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
        },
        byType: {},
      };
    },
    enabled: false, // Disabled until tables are created
    refetchInterval: 5 * 60 * 1000,
  });
};