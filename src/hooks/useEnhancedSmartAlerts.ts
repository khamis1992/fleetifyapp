import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

// Hook to get active alerts
export const useActiveAlerts = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['smart-alerts']),
    queryFn: async (): Promise<SmartAlert[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('smart_alerts_log')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['active', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
};

// Hook to get alerts by priority
export const useAlertsByPriority = (priority?: string) => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['smart-alerts', 'priority', priority]),
    queryFn: async (): Promise<SmartAlert[]> => {
      if (!companyId) return [];

      let query = supabase
        .from('smart_alerts_log')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['active', 'acknowledged']);

      if (priority) {
        query = query.eq('priority', priority);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
};

// Hook to get alert configurations
export const useAlertConfigs = () => {
  const { companyId, getQueryKey } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: getQueryKey(['alert-configs']),
    queryFn: async (): Promise<SmartAlertConfig[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('smart_alerts_config')
        .select('*')
        .eq('company_id', companyId)
        .order('alert_type', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
};

// Hook to run smart alerts check
export const useRunAlertsCheck = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AlertCheckResult> => {
      const { data, error } = await supabase
        .rpc('run_smart_alerts_check');

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      
      if (data.success && data.total_alerts_created > 0) {
        toast.success(`تم إنشاء ${data.total_alerts_created} تنبيه جديد`);
      } else {
        toast.info('لا توجد تنبيهات جديدة');
      }
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
      const { data, error } = await supabase
        .rpc('acknowledge_alert', { p_alert_id: alertId });

      if (error) throw error;
      return data;
    },
    onSuccess: (success, alertId) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
        toast.success('تم الإقرار بالتنبيه');
      } else {
        toast.error('فشل في الإقرار بالتنبيه');
      }
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
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const updateData: any = {
        status,
      };

      if (status === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      } else if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('smart_alerts_log')
        .update(updateData)
        .eq('id', alertId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['smart-alerts'] });
      
      const statusLabels = {
        acknowledged: 'تم الإقرار',
        resolved: 'تم الحل',
        dismissed: 'تم التجاهل',
      };
      
      toast.success(`${statusLabels[data.status as keyof typeof statusLabels]} بالتنبيه`);
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
      if (!companyId) throw new Error('معرف الشركة مطلوب');

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (isEnabled !== undefined) updateData.is_enabled = isEnabled;
      if (triggerConditions) updateData.trigger_conditions = triggerConditions;
      if (notificationSettings) updateData.notification_settings = notificationSettings;

      const { data, error } = await supabase
        .from('smart_alerts_config')
        .update(updateData)
        .eq('id', configId)
        .eq('company_id', companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-configs'] });
      toast.success('تم تحديث إعدادات التنبيه بنجاح');
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
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('smart_alerts_log')
        .select('priority, status, alert_type, created_at')
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (error) throw error;

      // حساب الإحصائيات
      const stats = {
        total: data.length,
        active: data.filter(a => a.status === 'active').length,
        acknowledged: data.filter(a => a.status === 'acknowledged').length,
        resolved: data.filter(a => a.status === 'resolved').length,
        byPriority: {
          critical: data.filter(a => a.priority === 'critical').length,
          high: data.filter(a => a.priority === 'high').length,
          medium: data.filter(a => a.priority === 'medium').length,
          low: data.filter(a => a.priority === 'low').length,
        },
        byType: data.reduce((acc: Record<string, number>, alert) => {
          acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1;
          return acc;
        }, {}),
      };

      return stats;
    },
    enabled: !!companyId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};
