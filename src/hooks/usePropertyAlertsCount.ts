import { usePropertyAlerts } from './usePropertyAlerts';

export const usePropertyAlertsCount = () => {
  const { data: propertyAlerts = [] } = usePropertyAlerts();
  
  const unacknowledgedAlerts = propertyAlerts.filter(alert => !alert.acknowledged);
  const highPriorityAlerts = unacknowledgedAlerts.filter(alert => alert.priority === 'high');
  const criticalAlerts = unacknowledgedAlerts.filter(alert => 
    alert.type === 'contract_expiry' || alert.type === 'payment_overdue'
  );

  return {
    total: unacknowledgedAlerts.length,
    highPriority: highPriorityAlerts.length,
    critical: criticalAlerts.length,
    alerts: unacknowledgedAlerts
  };
};