import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useSmartAlerts } from '@/hooks/useSmartAlerts';

export const useUnifiedNotificationCount = () => {
  const { companyId, user, getQueryKey } = useUnifiedCompanyAccess();
  const { data: smartAlerts = [] } = useSmartAlerts();

  const { data: counts = { total: 0, critical: 0, high: 0 }, isLoading } = useQuery({
    queryKey: getQueryKey(['unified-notification-count', smartAlerts.length.toString()]),
    queryFn: async () => {
      if (!companyId || !user?.id) {
        return { total: 0, critical: 0, high: 0 };
      }

      let totalCount = 0;
      let criticalCount = 0;
      let highCount = 0;

      // Count unread user notifications
      const { count: notificationCount } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (notificationCount) {
        totalCount += notificationCount;
        
        // Count critical notifications (error type)
        const { count: criticalNotifications } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false)
          .eq('notification_type', 'error');

        if (criticalNotifications) {
          criticalCount += criticalNotifications;
        }
      }

      // Count unacknowledged budget alerts
      const { count: budgetCount } = await supabase
        .from('budget_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_acknowledged', false);

      if (budgetCount) {
        totalCount += budgetCount;
        
        // Count critical budget alerts (budget exceeded)
        const { count: criticalBudget } = await supabase
          .from('budget_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_acknowledged', false)
          .eq('alert_type', 'budget_exceeded');

        if (criticalBudget) {
          criticalCount += criticalBudget;
        }
      }

      // Count unacknowledged vehicle alerts
      const { count: vehicleCount } = await supabase
        .from('vehicle_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_acknowledged', false);

      if (vehicleCount) {
        totalCount += vehicleCount;
        
        // Count high priority vehicle alerts
        const { count: highVehicle } = await supabase
          .from('vehicle_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('is_acknowledged', false)
          .eq('priority', 'high');

        if (highVehicle) {
          highCount += highVehicle;
        }
      }

      // Add smart alerts to the count
      const smartAlertsCount = smartAlerts.length;
      totalCount += smartAlertsCount;
      
      // Count high priority smart alerts
      const highPrioritySmartAlerts = smartAlerts.filter(alert => alert.priority === 'high').length;
      const criticalSmartAlerts = smartAlerts.filter(alert => alert.type === 'error').length;
      
      highCount += highPrioritySmartAlerts;
      criticalCount += criticalSmartAlerts;

      return {
        total: totalCount,
        critical: criticalCount,
        high: highCount + criticalCount // High includes critical
      };
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // Refetch every minute
  });

  // Include smart alerts loading state
  const combinedIsLoading = isLoading;

  return {
    totalAlerts: counts.total,
    criticalAlerts: counts.critical,
    highPriorityAlerts: counts.high,
    isLoading: combinedIsLoading
  };
};