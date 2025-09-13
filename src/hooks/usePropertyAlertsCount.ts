import { usePropertyAlerts } from './usePropertyAlerts';

export const usePropertyAlertsCount = () => {
  const { data: propertyAlerts = [] } = usePropertyAlerts();
  
  const criticalAlerts = propertyAlerts.filter(alert => alert.severity === 'critical');
  const highPriorityAlerts = propertyAlerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical');
  const urgentAlerts = propertyAlerts.filter(alert => 
    alert.type === 'contract_expiry' || alert.type === 'payment_overdue'
  );

  return {
    total: propertyAlerts.length,
    highPriority: highPriorityAlerts.length,
    critical: criticalAlerts.length,
    urgent: urgentAlerts.length,
    alerts: propertyAlerts
  };
};