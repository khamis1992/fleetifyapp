import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, CheckCircle, AlertTriangle, Wrench, XCircle } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/exports';

interface VehicleStatusCount {
  status: string;
  count: number;
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}

export const FleetAvailabilityWidget: React.FC = () => {
  const navigate = useNavigate();
  const { data: vehicles, isLoading } = useVehicles();
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Calculate vehicle counts by status
  const statusCounts = React.useMemo(() => {
    if (!vehicles) return [];

    const counts: Record<string, number> = {
      available: 0,
      rented: 0,
      maintenance: 0,
      out_of_service: 0,
    };

    vehicles.forEach((vehicle) => {
      const status = vehicle.status?.toLowerCase() || 'available';
      if (status in counts) {
        counts[status]++;
      } else {
        counts.available++;
      }
    });

    return [
      {
        status: 'available',
        count: counts.available,
        label: 'متاح',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        icon: CheckCircle,
      },
      {
        status: 'rented',
        count: counts.rented,
        label: 'مؤجر',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
        icon: Car,
      },
      {
        status: 'maintenance',
        count: counts.maintenance,
        label: 'صيانة',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
        icon: Wrench,
      },
      {
        status: 'out_of_service',
        count: counts.out_of_service,
        label: 'خارج الخدمة',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        icon: XCircle,
      },
    ] as VehicleStatusCount[];
  }, [vehicles]);

  // Calculate vehicle type breakdown
  const typeBreakdown = React.useMemo(() => {
    if (!vehicles) return [];

    const types: Record<string, number> = {};

    vehicles.forEach((vehicle) => {
      const type = vehicle.vehicle_type || 'أخرى';
      types[type] = (types[type] || 0) + 1;
    });

    return Object.entries(types)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 types
  }, [vehicles]);

  // Calculate availability percentage
  const availabilityPercentage = React.useMemo(() => {
    if (!vehicles || vehicles.length === 0) return 0;

    const availableCount = statusCounts.find(s => s.status === 'available')?.count || 0;
    return Math.round((availableCount / vehicles.length) * 100);
  }, [vehicles, statusCounts]);

  const totalVehicles = vehicles?.length || 0;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5" />
            توافر الأسطول
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Prepare export data
  const exportData = React.useMemo(() => {
    return statusCounts.map(status => ({
      الحالة: status.label,
      العدد: status.count,
    }));
  }, [statusCounts]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-teal-50/50 to-cyan-50/30 border-teal-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
                <Car className="h-5 w-5 text-white" />
              </div>
              <span>توافر الأسطول</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm font-bold">
                {totalVehicles} مركبة
              </Badge>
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="fleet_availability"
                title="توافر الأسطول"
                variant="ghost"
                size="sm"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" ref={chartRef}>
          {/* Availability Percentage */}
          <div className="p-4 rounded-lg bg-white/80 border border-teal-200/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">نسبة التوافر</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {availabilityPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${availabilityPercentage}%` }}
              />
            </div>
          </div>

          {/* Status Counts */}
          <div className="grid grid-cols-2 gap-3">
            {statusCounts.map((status) => (
              <motion.div
                key={status.status}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg border ${status.bgColor} transition-all duration-200`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <status.icon className={`h-4 w-4 ${status.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">
                    {status.label}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${status.color}`}>
                  {status.count}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Vehicle Type Breakdown */}
          {typeBreakdown.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">توزيع حسب النوع</h4>
              <div className="space-y-1">
                {typeBreakdown.map((type) => (
                  <div key={type.type} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{type.type}</span>
                    <Badge variant="secondary" className="font-semibold">
                      {type.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action */}
          <Button
            onClick={() => navigate('/fleet')}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white"
          >
            عرض الأسطول
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
