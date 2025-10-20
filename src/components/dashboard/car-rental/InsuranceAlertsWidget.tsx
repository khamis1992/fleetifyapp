import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DocumentAlert {
  vehicleId: string;
  vehicleName: string;
  documentType: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  urgency: 'critical' | 'warning' | 'info';
}

type UrgencyType = 'critical' | 'warning' | 'info';

export const InsuranceAlertsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: vehicles } = useVehicles();

  // Fetch all insurance records
  const { data: insuranceRecords, isLoading: insuranceLoading } = useQuery({
    queryKey: ['fleet-insurance-all', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from('fleet_vehicle_insurance')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  const isLoading = insuranceLoading;

  // Build alerts from insurance and vehicle data
  const alerts = React.useMemo(() => {
    if (!vehicles || !insuranceRecords) return [];

    const alertsList: DocumentAlert[] = [];
    const today = new Date();

    // Check insurance expiry
    insuranceRecords.forEach((insurance) => {
      const vehicle = vehicles.find((v) => v.id === insurance.vehicle_id);
      if (!vehicle) return;

      const expiryDate = parseISO(insurance.end_date);
      const daysUntilExpiry = differenceInDays(expiryDate, today);

      let urgency: UrgencyType;
      if (daysUntilExpiry < 7) {
        urgency = 'critical';
      } else if (daysUntilExpiry < 30) {
        urgency = 'warning';
      } else if (daysUntilExpiry < 90) {
        urgency = 'info';
      } else {
        return; // Don't show alerts for documents expiring in > 90 days
      }

      alertsList.push({
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}`,
        documentType: 'تأمين المركبة',
        expiryDate,
        daysUntilExpiry,
        urgency,
      });
    });

    // Check vehicle registration expiry (from vehicles table if available)
    vehicles.forEach((vehicle) => {
      // Assuming vehicles table has registration_expiry field
      if (vehicle.registration_expiry) {
        const expiryDate = parseISO(vehicle.registration_expiry as string);
        const daysUntilExpiry = differenceInDays(expiryDate, today);

        let urgency: UrgencyType;
        if (daysUntilExpiry < 7) {
          urgency = 'critical';
        } else if (daysUntilExpiry < 30) {
          urgency = 'warning';
        } else if (daysUntilExpiry < 90) {
          urgency = 'info';
        } else {
          return;
        }

        alertsList.push({
          vehicleId: vehicle.id,
          vehicleName: `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}`,
          documentType: 'تسجيل المركبة',
          expiryDate,
          daysUntilExpiry,
          urgency,
        });
      }

      // Check inspection certificate expiry (from vehicles table if available)
      if (vehicle.inspection_expiry) {
        const expiryDate = parseISO(vehicle.inspection_expiry as string);
        const daysUntilExpiry = differenceInDays(expiryDate, today);

        let urgency: UrgencyType;
        if (daysUntilExpiry < 7) {
          urgency = 'critical';
        } else if (daysUntilExpiry < 30) {
          urgency = 'warning';
        } else if (daysUntilExpiry < 90) {
          urgency = 'info';
        } else {
          return;
        }

        alertsList.push({
          vehicleId: vehicle.id,
          vehicleName: `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}`,
          documentType: 'شهادة الفحص',
          expiryDate,
          daysUntilExpiry,
          urgency,
        });
      }
    });

    // Sort by urgency and days until expiry
    return alertsList.sort((a, b) => {
      const urgencyOrder = { critical: 0, warning: 1, info: 2 };
      if (a.urgency !== b.urgency) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }, [vehicles, insuranceRecords]);

  // Count alerts by urgency
  const urgencyCounts = React.useMemo(() => {
    const counts = {
      critical: 0,
      warning: 0,
      info: 0,
    };

    alerts.forEach((alert) => {
      counts[alert.urgency]++;
    });

    return counts;
  }, [alerts]);

  const getUrgencyBadge = (urgency: UrgencyType) => {
    switch (urgency) {
      case 'critical':
        return {
          label: 'عاجل',
          className: 'bg-red-100 text-red-700 border-red-300',
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          bgColor: 'border-red-200',
        };
      case 'warning':
        return {
          label: 'تحذير',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: Calendar,
          iconColor: 'text-yellow-600',
          bgColor: 'border-yellow-200',
        };
      case 'info':
        return {
          label: 'معلومة',
          className: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: FileText,
          iconColor: 'text-blue-600',
          bgColor: 'border-blue-200',
        };
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            تنبيهات الوثائق
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-red-50/50 to-orange-50/30 border-red-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span>تنبيهات الوثائق</span>
            </div>
            <div className="flex items-center gap-2">
              {urgencyCounts.critical > 0 && (
                <Badge variant="destructive" className="font-semibold animate-pulse">
                  {urgencyCounts.critical} عاجل
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3 text-red-600" />
                <span className="text-xs font-medium text-muted-foreground">عاجل</span>
              </div>
              <div className="text-xl font-bold text-red-600">
                {urgencyCounts.critical}
              </div>
              <span className="text-xs text-muted-foreground">{'< 7 أيام'}</span>
            </div>

            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3 text-yellow-600" />
                <span className="text-xs font-medium text-muted-foreground">تحذير</span>
              </div>
              <div className="text-xl font-bold text-yellow-600">
                {urgencyCounts.warning}
              </div>
              <span className="text-xs text-muted-foreground">{'< 30 يوم'}</span>
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground">معلومة</span>
              </div>
              <div className="text-xl font-bold text-blue-600">
                {urgencyCounts.info}
              </div>
              <span className="text-xs text-muted-foreground">{'< 90 يوم'}</span>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              الوثائق المنتهية أو القريبة من الانتهاء
            </h4>

            {alerts.length === 0 ? (
              <div className="p-4 rounded-lg bg-white/80 border border-green-200 text-center">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  جميع الوثائق سارية المفعول
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.slice(0, 10).map((alert, index) => {
                  const badge = getUrgencyBadge(alert.urgency);
                  const BadgeIcon = badge.icon;

                  return (
                    <motion.div
                      key={`${alert.vehicleId}-${alert.documentType}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className={`p-3 rounded-lg bg-white/80 border ${badge.bgColor} hover:border-red-300 transition-all duration-200`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <BadgeIcon className={`h-4 w-4 ${badge.iconColor}`} />
                            <span className="font-semibold text-sm truncate">
                              {alert.vehicleName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{alert.documentType}</span>
                            <span>•</span>
                            <span>
                              ينتهي: {format(alert.expiryDate, 'dd MMM yyyy', { locale: ar })}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className={badge.className}>
                          {alert.daysUntilExpiry < 0
                            ? `منتهي ${Math.abs(alert.daysUntilExpiry)} يوم`
                            : alert.daysUntilExpiry === 0
                            ? 'ينتهي اليوم'
                            : `بعد ${alert.daysUntilExpiry} يوم`}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {alerts.length > 10 && (
              <div className="text-center text-sm text-muted-foreground">
                عرض 10 من {alerts.length} تنبيه
              </div>
            )}
          </div>

          {/* Quick Action */}
          <Button
            onClick={() => navigate('/fleet')}
            className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"
          >
            تجديد الوثائق
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
