/**
 * VehicleAlertPanel - لوحة تنبيهات المركبات
 * يعرض التنبيهات الحرجة للتأمين والفحص والصيانة
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Shield,
  FileWarning,
  Calendar,
  AlertCircle,
  ChevronLeft,
  Car,
  Clock,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface VehicleAlert {
  id: string;
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  alertType: 'insurance' | 'registration' | 'service';
  expiryDate: string;
  daysUntilExpiry: number;
  isExpired: boolean;
}

interface VehicleAlertPanelProps {
  onViewVehicle?: (vehicleId: string) => void;
  maxAlerts?: number;
}

export const VehicleAlertPanel: React.FC<VehicleAlertPanelProps> = ({
  onViewVehicle,
  maxAlerts = 10,
}) => {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['vehicle-alerts', companyId],
    queryFn: async (): Promise<VehicleAlert[]> => {
      if (!companyId) return [];

      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, insurance_expiry, registration_expiry, next_service_due')
        .eq('company_id', companyId)
        .or(`insurance_expiry.lte.${thirtyDaysLater.toISOString()},registration_expiry.lte.${thirtyDaysLater.toISOString()},next_service_due.lte.${today.toISOString()}`);

      if (error) throw error;

      const alertsList: VehicleAlert[] = [];

      vehicles?.forEach(vehicle => {
        // تنبيه التأمين
        if (vehicle.insurance_expiry) {
          const expiry = new Date(vehicle.insurance_expiry);
          const days = differenceInDays(expiry, today);
          if (days <= 30) {
            alertsList.push({
              id: `${vehicle.id}-insurance`,
              vehicleId: vehicle.id,
              plateNumber: vehicle.plate_number || '',
              make: vehicle.make || '',
              model: vehicle.model || '',
              alertType: 'insurance',
              expiryDate: vehicle.insurance_expiry,
              daysUntilExpiry: days,
              isExpired: isPast(expiry),
            });
          }
        }

        // تنبيه الفحص الدوري
        if (vehicle.registration_expiry) {
          const expiry = new Date(vehicle.registration_expiry);
          const days = differenceInDays(expiry, today);
          if (days <= 30) {
            alertsList.push({
              id: `${vehicle.id}-registration`,
              vehicleId: vehicle.id,
              plateNumber: vehicle.plate_number || '',
              make: vehicle.make || '',
              model: vehicle.model || '',
              alertType: 'registration',
              expiryDate: vehicle.registration_expiry,
              daysUntilExpiry: days,
              isExpired: isPast(expiry),
            });
          }
        }

        // تنبيه الصيانة
        if (vehicle.next_service_due) {
          const serviceDue = new Date(vehicle.next_service_due);
          const days = differenceInDays(serviceDue, today);
          if (days <= 0) {
            alertsList.push({
              id: `${vehicle.id}-service`,
              vehicleId: vehicle.id,
              plateNumber: vehicle.plate_number || '',
              make: vehicle.make || '',
              model: vehicle.model || '',
              alertType: 'service',
              expiryDate: vehicle.next_service_due,
              daysUntilExpiry: days,
              isExpired: true,
            });
          }
        }
      });

      // ترتيب حسب الأولوية (منتهي أولاً، ثم الأقرب للانتهاء)
      return alertsList
        .sort((a, b) => {
          if (a.isExpired !== b.isExpired) return a.isExpired ? -1 : 1;
          return a.daysUntilExpiry - b.daysUntilExpiry;
        })
        .slice(0, maxAlerts);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  const getAlertConfig = (alert: VehicleAlert) => {
    const configs = {
      insurance: {
        icon: Shield,
        label: 'تأمين',
        color: 'red',
      },
      registration: {
        icon: FileWarning,
        label: 'فحص دوري',
        color: 'amber',
      },
      service: {
        icon: Calendar,
        label: 'صيانة',
        color: 'orange',
      },
    };
    return configs[alert.alertType];
  };

  const getPriorityStyle = (alert: VehicleAlert) => {
    if (alert.isExpired) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-500',
        text: 'text-red-700',
      };
    }
    if (alert.daysUntilExpiry <= 7) {
      return {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        badge: 'bg-orange-500',
        text: 'text-orange-700',
      };
    }
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-500',
      text: 'text-amber-700',
    };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-neutral-200 rounded-lg animate-pulse" />
          <div className="h-5 bg-neutral-200 rounded w-32 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-neutral-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  const expiredCount = alerts.filter(a => a.isExpired).length;
  const urgentCount = alerts.filter(a => !a.isExpired && a.daysUntilExpiry <= 7).length;

  return (
    <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-neutral-800">تنبيهات المركبات</h3>
            <p className="text-xs text-neutral-500">
              {alerts.length} تنبيه • {expiredCount} منتهي • {urgentCount} عاجل
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <Badge className="bg-red-500 text-white">{expiredCount} منتهي</Badge>
          )}
          {urgentCount > 0 && (
            <Badge className="bg-orange-500 text-white">{urgentCount} عاجل</Badge>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        <AnimatePresence>
          {alerts.map((alert, index) => {
            const config = getAlertConfig(alert);
            const style = getPriorityStyle(alert);
            const Icon = config.icon;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border transition-all',
                  style.bg,
                  style.border,
                  onViewVehicle && 'cursor-pointer hover:shadow-md'
                )}
                onClick={() => onViewVehicle?.(alert.vehicleId)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', style.badge)}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-800">
                        {alert.plateNumber}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {alert.make} {alert.model}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5', style.text)}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-neutral-500">
                        {format(new Date(alert.expiryDate), 'dd MMM yyyy', { locale: ar })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {alert.isExpired ? (
                    <Badge className="bg-red-500 text-white text-xs">
                      منتهي منذ {Math.abs(alert.daysUntilExpiry)} يوم
                    </Badge>
                  ) : (
                    <Badge className={cn('text-xs text-white', style.badge)}>
                      {alert.daysUntilExpiry} يوم متبقي
                    </Badge>
                  )}
                  {onViewVehicle && (
                    <ChevronLeft className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VehicleAlertPanel;

