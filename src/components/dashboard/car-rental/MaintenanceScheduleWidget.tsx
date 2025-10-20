import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wrench, AlertCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';

interface MaintenanceItem {
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  lastMaintenanceDate?: string;
  daysUntilDue: number;
  urgency: 'overdue' | 'due_soon' | 'on_schedule';
  maintenanceType: string;
}

export const MaintenanceScheduleWidget: React.FC = () => {
  const navigate = useNavigate();
  const { data: vehicles, isLoading } = useVehicles();
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Calculate maintenance schedule based on last_maintenance_date
  // Assuming maintenance is due every 90 days (3 months)
  const MAINTENANCE_INTERVAL_DAYS = 90;

  const maintenanceSchedule = React.useMemo(() => {
    if (!vehicles) return [];

    const schedule: MaintenanceItem[] = [];
    const today = new Date();

    vehicles.forEach((vehicle) => {
      if (!vehicle.last_maintenance_date) {
        // No maintenance record - mark as overdue
        schedule.push({
          vehicleId: vehicle.id,
          plateNumber: vehicle.plate_number,
          make: vehicle.make,
          model: vehicle.model,
          lastMaintenanceDate: undefined,
          daysUntilDue: -999, // Very overdue
          urgency: 'overdue',
          maintenanceType: 'صيانة دورية',
        });
        return;
      }

      const lastMaintenance = parseISO(vehicle.last_maintenance_date);
      const nextDueDate = addDays(lastMaintenance, MAINTENANCE_INTERVAL_DAYS);
      const daysUntilDue = differenceInDays(nextDueDate, today);

      let urgency: 'overdue' | 'due_soon' | 'on_schedule';
      if (daysUntilDue < 0) {
        urgency = 'overdue';
      } else if (daysUntilDue <= 7) {
        urgency = 'due_soon';
      } else {
        urgency = 'on_schedule';
      }

      schedule.push({
        vehicleId: vehicle.id,
        plateNumber: vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        lastMaintenanceDate: vehicle.last_maintenance_date,
        daysUntilDue,
        urgency,
        maintenanceType: 'صيانة دورية',
      });
    });

    // Sort by urgency: overdue first, then due_soon, then on_schedule
    return schedule.sort((a, b) => {
      if (a.urgency === b.urgency) {
        return a.daysUntilDue - b.daysUntilDue;
      }
      const urgencyOrder = { overdue: 0, due_soon: 1, on_schedule: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }, [vehicles]);

  // Count by urgency
  const urgencyCounts = React.useMemo(() => {
    const counts = {
      overdue: 0,
      due_soon: 0,
      on_schedule: 0,
    };

    maintenanceSchedule.forEach((item) => {
      counts[item.urgency]++;
    });

    return counts;
  }, [maintenanceSchedule]);

  // Get items for display (overdue and due soon only, limit to 5)
  const displayItems = React.useMemo(() => {
    return maintenanceSchedule
      .filter((item) => item.urgency === 'overdue' || item.urgency === 'due_soon')
      .slice(0, 5);
  }, [maintenanceSchedule]);

  // Prepare export data
  const exportData = React.useMemo(() =>
    maintenanceSchedule.map(item => ({
      'رقم اللوحة': item.plateNumber,
      'الطراز': `${item.make} ${item.model}`,
      'نوع الصيانة': item.maintenanceType,
      'آخر صيانة': item.lastMaintenanceDate ? format(parseISO(item.lastMaintenanceDate), 'dd/MM/yyyy') : 'لا يوجد',
      'الأيام المتبقية': item.daysUntilDue,
      'الحالة': item.urgency === 'overdue' ? 'متأخر' : item.urgency === 'due_soon' ? 'مستحق قريباً' : 'في الموعد'
    })),
    [maintenanceSchedule]
  );

  const getUrgencyBadge = (urgency: 'overdue' | 'due_soon' | 'on_schedule') => {
    switch (urgency) {
      case 'overdue':
        return {
          label: 'متأخر',
          className: 'bg-red-100 text-red-700 border-red-300',
          icon: AlertCircle,
          iconColor: 'text-red-600',
        };
      case 'due_soon':
        return {
          label: 'مستحق قريباً',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: Clock,
          iconColor: 'text-yellow-600',
        };
      case 'on_schedule':
        return {
          label: 'في الموعد',
          className: 'bg-green-100 text-green-700 border-green-300',
          icon: CheckCircle,
          iconColor: 'text-green-600',
        };
    }
  };

  if (isLoading) {
    return <WidgetSkeleton hasChart={false} hasStats statCount={3} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-orange-50/50 to-amber-50/30 border-orange-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600">
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <span>جدول الصيانة</span>
            </div>
            <div className="flex items-center gap-2">
              {urgencyCounts.overdue > 0 && (
                <Badge variant="destructive" className="font-semibold">
                  {urgencyCounts.overdue} متأخر
                </Badge>
              )}
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="maintenance_schedule"
                title="جدول الصيانة"
                variant="ghost"
                size="sm"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" ref={chartRef}>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-1 mb-1">
                <AlertCircle className="h-3 w-3 text-red-600" />
                <span className="text-xs font-medium text-muted-foreground">متأخر</span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {urgencyCounts.overdue}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="h-3 w-3 text-yellow-600" />
                <span className="text-xs font-medium text-muted-foreground">خلال 7 أيام</span>
              </div>
              <div className="text-xl font-bold text-yellow-600">
                {urgencyCounts.due_soon}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-muted-foreground">في الموعد</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                {urgencyCounts.on_schedule}
              </div>
            </div>
          </div>

          {/* Maintenance Items List */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              الصيانات القادمة والمتأخرة
            </h4>

            {displayItems.length === 0 ? (
              <EmptyStateCompact
                type="no-data"
                title="جميع المركبات في موعد الصيانة"
                description="لا توجد صيانات متأخرة أو قادمة"
              />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {displayItems.map((item) => {
                  const badge = getUrgencyBadge(item.urgency);
                  const BadgeIcon = badge.icon;

                  return (
                    <motion.div
                      key={item.vehicleId}
                      whileHover={{ scale: 1.01 }}
                      className="p-3 rounded-lg bg-white/80 border border-orange-200/50 hover:border-orange-300 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <BadgeIcon className={`h-4 w-4 ${badge.iconColor}`} />
                            <span className="font-semibold text-sm truncate">
                              {item.plateNumber} - {item.make} {item.model}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.maintenanceType}</span>
                            {item.lastMaintenanceDate && (
                              <>
                                <span>•</span>
                                <span>
                                  آخر صيانة:{' '}
                                  {format(parseISO(item.lastMaintenanceDate), 'dd MMM yyyy', {
                                    locale: ar,
                                  })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={badge.className}>
                          {item.daysUntilDue < 0
                            ? `متأخر ${Math.abs(item.daysUntilDue)} يوم`
                            : `بعد ${item.daysUntilDue} يوم`}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Action */}
          <Button
            onClick={() => navigate('/fleet')}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
          >
            جدولة صيانة
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
