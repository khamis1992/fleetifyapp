import React from 'react';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Car, 
  User, 
  Bell,
  ChevronLeft,
  ExternalLink
} from 'lucide-react';
import { useTrafficViolationStats } from '@/hooks/useTrafficViolationStats';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Alert {
  id: string;
  type: 'critical' | 'urgent' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  icon: React.ElementType;
  action?: () => void;
}

interface TrafficViolationsAlertsPanelProps {
  onFilterByStatus?: (status: string) => void;
  onNavigateToVehicle?: (vehicleId: string) => void;
}

export const TrafficViolationsAlertsPanel: React.FC<TrafficViolationsAlertsPanelProps> = ({
  onFilterByStatus,
  onNavigateToVehicle,
}) => {
  const { data: stats, isLoading } = useTrafficViolationStats();
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading || !stats) return null;

  // Build alerts list
  const alerts: Alert[] = [];

  // Critical: Overdue violations (>30 days)
  if (stats.overdueViolations > 0) {
    alerts.push({
      id: 'overdue',
      type: 'critical',
      title: 'مخالفات متأخرة',
      description: `${stats.overdueViolations} مخالفة غير مسددة منذ أكثر من 30 يوم`,
      count: stats.overdueViolations,
      icon: Clock,
      action: () => onFilterByStatus?.('unpaid'),
    });
  }

  // Urgent: High value violations
  if (stats.highValueViolations > 0) {
    alerts.push({
      id: 'high-value',
      type: 'urgent',
      title: 'مخالفات بمبالغ عالية',
      description: `${stats.highValueViolations} مخالفة بمبلغ 500 ر.ق أو أكثر`,
      count: stats.highValueViolations,
      icon: DollarSign,
      action: () => onFilterByStatus?.('unpaid'),
    });
  }

  // Warning: Repeated vehicles
  if (stats.repeatedVehicles > 0) {
    alerts.push({
      id: 'repeated-vehicles',
      type: 'warning',
      title: 'مركبات متكررة',
      description: `${stats.repeatedVehicles} مركبة لديها أكثر من 3 مخالفات`,
      count: stats.repeatedVehicles,
      icon: Car,
    });
  }

  // Warning: Repeated customers
  if (stats.repeatedCustomers > 0) {
    alerts.push({
      id: 'repeated-customers',
      type: 'warning',
      title: 'عملاء متكررين',
      description: `${stats.repeatedCustomers} عميل لديه أكثر من 3 مخالفات`,
      count: stats.repeatedCustomers,
      icon: User,
    });
  }

  // Info: Pending violations
  if (stats.pendingCount > 0) {
    alerts.push({
      id: 'pending',
      type: 'info',
      title: 'مخالفات قيد المراجعة',
      description: `${stats.pendingCount} مخالفة تحتاج للتأكيد`,
      count: stats.pendingCount,
      icon: Bell,
      action: () => onFilterByStatus?.('pending'),
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-green-50 rounded-[1.25rem] p-5 border border-green-100 text-center">
        <div className="text-green-600 font-bold mb-1">✅ لا توجد تنبيهات</div>
        <div className="text-green-500 text-sm">جميع المخالفات تحت السيطرة</div>
      </div>
    );
  }

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          textColor: 'text-red-700',
          badgeBg: 'bg-red-500',
        };
      case 'urgent':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          textColor: 'text-orange-700',
          badgeBg: 'bg-orange-500',
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
          textColor: 'text-amber-700',
          badgeBg: 'bg-amber-500',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          textColor: 'text-blue-700',
          badgeBg: 'bg-blue-500',
        };
    }
  };

  return (
    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          تنبيهات المخالفات ({alerts.length})
        </h3>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          const Icon = alert.icon;

          return (
            <div
              key={alert.id}
              className={`${styles.bg} ${styles.border} border rounded-xl p-4 hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <div className={`${styles.iconBg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${styles.textColor}`}>
                      {alert.title}
                    </span>
                    <Badge className={`${styles.badgeBg} text-white text-[10px] px-2`}>
                      {alert.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    {alert.description}
                  </p>
                </div>
                {alert.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={alert.action}
                    className={`${styles.iconColor} hover:${styles.bg}`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Violating Vehicles */}
      {stats.topViolatingVehicles.length > 0 && (
        <div className="mt-5 pt-5 border-t border-neutral-100">
          <h4 className="text-xs font-bold text-neutral-500 uppercase mb-3">
            🚗 أكثر المركبات مخالفات
          </h4>
          <div className="space-y-2">
            {stats.topViolatingVehicles.slice(0, 3).map((vehicle, index) => (
              <div
                key={vehicle.vehicle_id}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                onClick={() => onNavigateToVehicle?.(vehicle.vehicle_id)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-rose-100 text-coral-600' :
                    index === 1 ? 'bg-amber-100 text-amber-600' :
                    'bg-neutral-200 text-neutral-600'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-mono text-sm font-bold text-neutral-800">
                      {vehicle.plate_number}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {vehicle.make} {vehicle.model}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-coral-600">
                    {vehicle.count} مخالفة
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {formatCurrency(vehicle.totalAmount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficViolationsAlertsPanel;

