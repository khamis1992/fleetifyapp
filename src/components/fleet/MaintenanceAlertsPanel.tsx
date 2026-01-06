/**
 * لوحة تنبيهات الصيانة
 * تصميم Bento Dashboard متوافق مع الداشبورد الرئيسية
 * PERFORMANCE OPTIMIZED: Uses parallel queries
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock,
  Car,
  Wrench,
  Calendar,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MaintenanceAlert {
  id: string;
  type: 'overdue' | 'urgent' | 'scheduled' | 'vehicle_stopped';
  title: string;
  description: string;
  vehiclePlate?: string;
  vehicleId?: string;
  maintenanceId?: string;
  daysOverdue?: number;
  scheduledDate?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface MaintenanceAlertsPanelProps {
  onMaintenanceClick?: (maintenanceId: string) => void;
  onVehicleClick?: (vehicleId: string) => void;
  maxItems?: number;
  compact?: boolean;
}

export function MaintenanceAlertsPanel({
  onMaintenanceClick,
  onVehicleClick,
  maxItems = 5,
  compact = false
}: MaintenanceAlertsPanelProps) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['maintenance-alerts', companyId],
    queryFn: async (): Promise<MaintenanceAlert[]> => {
      if (!companyId) return [];

      const today = new Date();
      const alertsList: MaintenanceAlert[] = [];

      // PARALLEL QUERIES: Execute all queries at once instead of sequentially
      const [
        overdueData,
        urgentData,
        scheduledData,
        stoppedVehicles
      ] = await Promise.all([
        // 1. جلب الصيانة المتأخرة
        supabase
          .from('vehicle_maintenance')
          .select(`
            id,
            maintenance_number,
            scheduled_date,
            priority,
            maintenance_type,
            vehicles (
              id,
              plate_number
            )
          `)
          .eq('company_id', companyId)
          .in('status', ['pending', 'in_progress'])
          .lt('scheduled_date', today.toISOString().split('T')[0])
          .order('scheduled_date', { ascending: true })
          .limit(10),

        // 2. جلب الطلبات العاجلة
        supabase
          .from('vehicle_maintenance')
          .select(`
            id,
            maintenance_number,
            description,
            vehicles (
              id,
              plate_number
            )
          `)
          .eq('company_id', companyId)
          .eq('priority', 'urgent')
          .in('status', ['pending', 'in_progress'])
          .limit(5),

        // 3. جلب الصيانة المجدولة خلال 3 أيام
        supabase
          .from('vehicle_maintenance')
          .select(`
            id,
            maintenance_number,
            scheduled_date,
            maintenance_type,
            vehicles (
              id,
              plate_number
            )
          `)
          .eq('company_id', companyId)
          .eq('status', 'pending')
          .gte('scheduled_date', today.toISOString().split('T')[0])
          .order('scheduled_date', { ascending: true })
          .limit(10),

        // 4. جلب المركبات المتوقفة للصيانة لفترة طويلة
        supabase
          .from('vehicles')
          .select('id, plate_number, last_maintenance_date')
          .eq('company_id', companyId)
          .eq('status', 'maintenance')
          .limit(10),
      ]);

      // Process overdue maintenance
      overdueData?.data?.forEach(m => {
        const scheduled = new Date(m.scheduled_date!);
        const daysOverdue = Math.ceil((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));

        alertsList.push({
          id: `overdue-${m.id}`,
          type: 'overdue',
          title: 'صيانة متأخرة',
          description: `طلب #${m.maintenance_number || m.id.slice(0, 6)} متأخر ${daysOverdue} يوم`,
          vehiclePlate: m.vehicles?.plate_number,
          vehicleId: m.vehicles?.id,
          maintenanceId: m.id,
          daysOverdue,
          priority: daysOverdue > 7 ? 'critical' : daysOverdue > 3 ? 'high' : 'medium',
        });
      });

      // Process urgent maintenance
      urgentData?.data?.forEach(m => {
        alertsList.push({
          id: `urgent-${m.id}`,
          type: 'urgent',
          title: 'صيانة عاجلة',
          description: m.description || `طلب #${m.maintenance_number || m.id.slice(0, 6)}`,
          vehiclePlate: m.vehicles?.plate_number,
          vehicleId: m.vehicles?.id,
          maintenanceId: m.id,
          priority: 'high',
        });
      });

      // Process scheduled maintenance
      const threeDaysLater = new Date(today);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

      scheduledData?.data?.forEach(m => {
        const scheduled = new Date(m.scheduled_date!);
        // Only include if within 3 days
        if (scheduled <= threeDaysLater) {
          alertsList.push({
            id: `scheduled-${m.id}`,
            type: 'scheduled',
            title: 'صيانة قادمة',
            description: `${m.maintenance_type === 'routine' ? 'صيانة دورية' : m.maintenance_type === 'preventive' ? 'صيانة وقائية' : 'صيانة'} مجدولة`,
            vehiclePlate: m.vehicles?.plate_number,
            vehicleId: m.vehicles?.id,
            maintenanceId: m.id,
            scheduledDate: m.scheduled_date,
            priority: 'low',
          });
        }
      });

      // Process stopped vehicles
      stoppedVehicles?.data?.forEach(v => {
        if (v.last_maintenance_date) {
          const maintenanceStart = new Date(v.last_maintenance_date);
          const daysStopped = Math.ceil((today.getTime() - maintenanceStart.getTime()) / (1000 * 60 * 60 * 24));

          if (daysStopped > 7) {
            alertsList.push({
              id: `stopped-${v.id}`,
              type: 'vehicle_stopped',
              title: 'مركبة متوقفة',
              description: `متوقفة منذ ${daysStopped} يوم`,
              vehiclePlate: v.plate_number,
              vehicleId: v.id,
              daysOverdue: daysStopped,
              priority: daysStopped > 14 ? 'high' : 'medium',
            });
          }
        }
      });

      // ترتيب حسب الأولوية
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      alertsList.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      return alertsList.slice(0, maxItems);
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const alertCounts = useMemo(() => {
    if (!alerts) return { critical: 0, high: 0, medium: 0, total: 0 };
    return {
      critical: alerts.filter(a => a.priority === 'critical').length,
      high: alerts.filter(a => a.priority === 'high').length,
      medium: alerts.filter(a => a.priority === 'medium').length,
      total: alerts.length,
    };
  }, [alerts]);

  const getAlertIcon = (type: MaintenanceAlert['type']) => {
    switch (type) {
      case 'overdue': return AlertTriangle;
      case 'urgent': return AlertCircle;
      case 'scheduled': return Calendar;
      case 'vehicle_stopped': return Car;
      default: return Wrench;
    }
  };

  const getAlertColors = (priority: MaintenanceAlert['priority']) => {
    switch (priority) {
      case 'critical': return { bg: 'bg-coral-50', border: 'border-coral-200', text: 'text-coral-700', icon: 'text-coral-600', dot: 'bg-coral-500' };
      case 'high': return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600', dot: 'bg-amber-500' };
      case 'medium': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600', dot: 'bg-blue-500' };
      default: return { bg: 'bg-neutral-50', border: 'border-neutral-200', text: 'text-neutral-700', icon: 'text-neutral-600', dot: 'bg-neutral-500' };
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[1.25rem] p-5 shadow-sm border border-neutral-100">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-neutral-200 rounded w-32" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "bg-white rounded-[1.25rem] shadow-sm border border-neutral-100",
      compact ? "p-4" : "p-5"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-coral-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-coral-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900">تنبيهات الصيانة</h3>
            <p className="text-xs text-neutral-500">{alertCounts.total} تنبيه نشط</p>
          </div>
        </div>

        {/* ملخص الأولويات */}
        <div className="flex items-center gap-2">
          {alertCounts.critical > 0 && (
            <span className="px-2 py-1 bg-coral-100 text-coral-700 text-xs font-medium rounded-full">
              {alertCounts.critical} حرج
            </span>
          )}
          {alertCounts.high > 0 && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              {alertCounts.high} عاجل
            </span>
          )}
        </div>
      </div>

      {/* قائمة التنبيهات */}
      <div className="space-y-2">
        <AnimatePresence>
          {alerts.map((alert, index) => {
            const Icon = getAlertIcon(alert.type);
            const colors = getAlertColors(alert.priority);

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (alert.maintenanceId && onMaintenanceClick) {
                    onMaintenanceClick(alert.maintenanceId);
                  } else if (alert.vehicleId && onVehicleClick) {
                    onVehicleClick(alert.vehicleId);
                  }
                }}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all",
                  colors.bg,
                  `border ${colors.border}`,
                  "hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", colors.dot, alert.priority === 'critical' && "animate-pulse")} />
                  <Icon className={cn("w-4 h-4", colors.icon)} />
                  <div>
                    <p className={cn("text-sm font-medium", colors.text)}>{alert.title}</p>
                    <p className="text-xs text-neutral-500">{alert.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {alert.vehiclePlate && (
                    <span className="px-2 py-1 bg-white/50 rounded text-xs font-mono text-neutral-700">
                      {alert.vehiclePlate}
                    </span>
                  )}
                  <ChevronLeft className="w-4 h-4 text-neutral-400" />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {!compact && alertCounts.total >= maxItems && (
        <div className="mt-4 pt-3 border-t border-neutral-100 text-center">
          <button className="text-sm text-coral-600 hover:text-coral-700 font-medium">
            عرض كل التنبيهات ({alertCounts.total})
          </button>
        </div>
      )}
    </div>
  );
}
