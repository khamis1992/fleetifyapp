import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import { useVehicles } from '@/hooks/useVehicles';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks, isWithinInterval, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DateRange = 'this_week' | 'next_week' | 'this_month';

interface TimelineItem {
  vehicleId: string;
  vehicleName: string;
  contractId: string;
  contractNumber: string;
  customerName: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'reserved' | 'available';
}

export const RentalTimelineWidget: React.FC = () => {
  const [dateRange, setDateRange] = React.useState<DateRange>('this_week');
  const [currentWeekOffset, setCurrentWeekOffset] = React.useState(0);

  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();

  const isLoading = contractsLoading || vehiclesLoading;

  // Calculate date range based on selection
  const { startDate, endDate } = React.useMemo(() => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (dateRange) {
      case 'this_week':
        start = startOfWeek(addWeeks(today, currentWeekOffset), { locale: ar });
        end = endOfWeek(addWeeks(today, currentWeekOffset), { locale: ar });
        break;
      case 'next_week':
        start = startOfWeek(addWeeks(today, 1), { locale: ar });
        end = endOfWeek(addWeeks(today, 1), { locale: ar });
        break;
      case 'this_month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      default:
        start = startOfWeek(today, { locale: ar });
        end = endOfWeek(today, { locale: ar });
    }

    return { startDate: start, endDate: end };
  }, [dateRange, currentWeekOffset]);

  // Build timeline data
  const timelineData = React.useMemo(() => {
    if (!contracts || !vehicles) return [];

    const timeline: Record<string, TimelineItem[]> = {};

    // Initialize with all vehicles
    vehicles.forEach((vehicle) => {
      timeline[vehicle.id] = [];
    });

    // Add contracts to timeline
    contracts.forEach((contract) => {
      if (!contract.vehicle_id || !contract.start_date || !contract.end_date) return;

      const contractStart = parseISO(contract.start_date);
      const contractEnd = parseISO(contract.end_date);

      // Check if contract overlaps with selected date range
      const overlaps = isWithinInterval(contractStart, { start: startDate, end: endDate }) ||
                       isWithinInterval(contractEnd, { start: startDate, end: endDate }) ||
                       (contractStart <= startDate && contractEnd >= endDate);

      if (overlaps) {
        const vehicle = vehicles.find((v) => v.id === contract.vehicle_id);
        if (!vehicle) return;

        const today = new Date();
        let status: 'active' | 'reserved' | 'available';

        if (contractStart <= today && contractEnd >= today && contract.status === 'active') {
          status = 'active';
        } else if (contractStart > today) {
          status = 'reserved';
        } else {
          status = 'available';
        }

        const customerName = contract.customer
          ? `${contract.customer.first_name_ar || contract.customer.first_name} ${contract.customer.last_name_ar || contract.customer.last_name}`
          : 'عميل غير معروف';

        timeline[contract.vehicle_id] = timeline[contract.vehicle_id] || [];
        timeline[contract.vehicle_id].push({
          vehicleId: contract.vehicle_id,
          vehicleName: `${vehicle.plate_number} - ${vehicle.make} ${vehicle.model}`,
          contractId: contract.id,
          contractNumber: contract.contract_number,
          customerName,
          startDate: contractStart,
          endDate: contractEnd,
          status,
        });
      }
    });

    return timeline;
  }, [contracts, vehicles, startDate, endDate]);

  // Get vehicles for display (limit to 8 for readability)
  const displayVehicles = React.useMemo(() => {
    return vehicles?.slice(0, 8) || [];
  }, [vehicles]);

  const getStatusColor = (status: 'active' | 'reserved' | 'available') => {
    switch (status) {
      case 'active':
        return 'bg-blue-500';
      case 'reserved':
        return 'bg-yellow-500';
      case 'available':
        return 'bg-green-500';
    }
  };

  const getStatusLabel = (status: 'active' | 'reserved' | 'available') => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'reserved':
        return 'محجوز';
      case 'available':
        return 'متاح';
    }
  };

  // Calculate bar position and width as percentage
  const calculateBarStyle = (item: TimelineItem) => {
    const totalDays = differenceInDays(endDate, startDate);
    const startOffset = Math.max(0, differenceInDays(item.startDate, startDate));
    const duration = differenceInDays(
      item.endDate < endDate ? item.endDate : endDate,
      item.startDate > startDate ? item.startDate : startDate
    );

    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - left, width)}%`,
    };
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            الجدول الزمني للتأجير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border-indigo-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <span>الجدول الزمني للتأجير</span>
            </div>
            <div className="flex items-center gap-2">
              {dateRange === 'this_week' && (
                <>
                  <button
                    onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
                    className="p-1 rounded hover:bg-indigo-100 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
                    className="p-1 rounded hover:bg-indigo-100 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              )}
              <Select value={dateRange} onValueChange={(value) => {
                setDateRange(value as DateRange);
                setCurrentWeekOffset(0);
              }}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_week">هذا الأسبوع</SelectItem>
                  <SelectItem value="next_week">الأسبوع القادم</SelectItem>
                  <SelectItem value="this_month">هذا الشهر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range Display */}
          <div className="p-3 rounded-lg bg-white/80 border border-indigo-200/50 text-center">
            <span className="text-sm font-medium text-muted-foreground">
              {format(startDate, 'dd MMM yyyy', { locale: ar })} -{' '}
              {format(endDate, 'dd MMM yyyy', { locale: ar })}
            </span>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">نشط</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-muted-foreground">محجوز</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-muted-foreground">متاح</span>
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {displayVehicles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                لا توجد مركبات لعرضها
              </div>
            ) : (
              displayVehicles.map((vehicle) => {
                const rentals = timelineData[vehicle.id] || [];

                return (
                  <div
                    key={vehicle.id}
                    className="p-3 rounded-lg bg-white/80 border border-indigo-200/50"
                  >
                    <div className="flex items-start gap-3">
                      {/* Vehicle Name */}
                      <div className="w-48 flex-shrink-0">
                        <div className="font-semibold text-sm truncate">
                          {vehicle.plate_number}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {vehicle.make} {vehicle.model}
                        </div>
                      </div>

                      {/* Timeline Bar */}
                      <div className="flex-1 relative h-10 bg-gray-100 rounded">
                        {rentals.length === 0 ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">متاح</span>
                          </div>
                        ) : (
                          rentals.map((rental) => {
                            const barStyle = calculateBarStyle(rental);
                            return (
                              <motion.div
                                key={rental.contractId}
                                className={`absolute top-1 bottom-1 rounded cursor-pointer ${getStatusColor(rental.status)} hover:opacity-80 transition-opacity`}
                                style={barStyle}
                                whileHover={{ scale: 1.05 }}
                                title={`${rental.customerName} - ${rental.contractNumber}`}
                              >
                                <div className="px-2 h-full flex items-center">
                                  <span className="text-xs text-white font-medium truncate">
                                    {rental.customerName}
                                  </span>
                                </div>
                              </motion.div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {vehicles && vehicles.length > 8 && (
            <div className="text-center text-sm text-muted-foreground">
              عرض 8 من {vehicles.length} مركبة
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
