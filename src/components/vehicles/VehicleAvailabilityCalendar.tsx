import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Car, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { cn } from '@/lib/utils';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface VehicleAvailabilityCalendarProps {
  onDateVehicleSelect?: (vehicleId: string, date: Date) => void;
}

interface Contract {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  customer_id: string;
  contract_number: string;
}

interface Vehicle {
  id: string;
  plate_number: string;
  brand: string;
  model: string;
  status: string;
}

/**
 * Vehicle Availability Calendar Component
 *
 * Features:
 * - Monthly calendar view showing all vehicles
 * - Color coding: Green (available), Red (rented), Yellow (maintenance)
 * - Click to create rental with pre-filled vehicle/date
 * - Month navigation
 * - Tooltips showing contract details
 *
 * @example
 * <VehicleAvailabilityCalendar
 *   onDateVehicleSelect={(vehicleId, date) => {
 *     // Open contract wizard with pre-filled data
 *   }}
 * />
 */
export function VehicleAvailabilityCalendar({
  onDateVehicleSelect
}: VehicleAvailabilityCalendarProps) {
  const { companyId } = useUnifiedCompanyAccess();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: async (): Promise<Vehicle[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, brand, model, status')
        .eq('company_id', companyId)
        .order('plate_number');

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch contracts for the month
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts-calendar', companyId, monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: async (): Promise<Contract[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('contracts')
        .select('id, vehicle_id, start_date, end_date, customer_id, contract_number')
        .eq('company_id', companyId)
        .or(`start_date.lte.${monthEnd.toISOString()},end_date.gte.${monthStart.toISOString()}`)
        .not('vehicle_id', 'is', null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Build availability map
  const availabilityMap = useMemo(() => {
    const map = new Map<string, { status: 'available' | 'rented' | 'maintenance'; contract?: Contract }>();

    vehicles.forEach((vehicle) => {
      daysInMonth.forEach((day) => {
        const key = `${vehicle.id}-${format(day, 'yyyy-MM-dd')}`;

        // Check maintenance status
        if (vehicle.status === 'maintenance') {
          map.set(key, { status: 'maintenance' });
          return;
        }

        // Check if rented
        const rentedContract = contracts.find((contract) => {
          if (contract.vehicle_id !== vehicle.id) return false;
          const start = parseISO(contract.start_date);
          const end = parseISO(contract.end_date);
          return day >= start && day <= end;
        });

        if (rentedContract) {
          map.set(key, { status: 'rented', contract: rentedContract });
        } else {
          map.set(key, { status: 'available' });
        }
      });
    });

    return map;
  }, [vehicles, contracts, daysInMonth]);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => setCurrentMonth(new Date());

  const handleCellClick = (vehicle: Vehicle, day: Date) => {
    const key = `${vehicle.id}-${format(day, 'yyyy-MM-dd')}`;
    const availability = availabilityMap.get(key);

    if (availability?.status === 'available' && onDateVehicleSelect) {
      onDateVehicleSelect(vehicle.id, day);
    }
  };

  const getCellStyle = (status: 'available' | 'rented' | 'maintenance') => {
    switch (status) {
      case 'available':
        return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800 cursor-pointer';
      case 'rented':
        return 'bg-red-100 border-red-300 text-red-800 cursor-not-allowed';
      case 'maintenance':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800 cursor-not-allowed';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              تقويم توفر المركبات
            </CardTitle>
            <CardDescription>
              عرض توفر المركبات خلال الشهر - اضغط على خانة متاحة لإنشاء عقد
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              اليوم
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>متاح</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>مؤجر</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>صيانة</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          <h3 className="text-xl font-bold">
            {format(currentMonth, 'MMMM yyyy', { locale: ar })}
          </h3>
        </div>

        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد مركبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted sticky right-0 z-10 min-w-[120px]">
                    المركبة
                  </th>
                  {daysInMonth.map((day) => (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "border p-1 text-center min-w-[35px]",
                        isSameDay(day, new Date()) && "bg-primary/10 font-bold"
                      )}
                    >
                      <div>{format(day, 'd', { locale: ar })}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(day, 'EEE', { locale: ar })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td className="border p-2 font-medium sticky right-0 z-10 bg-background">
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">
                            {vehicle.plate_number}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {vehicle.brand} {vehicle.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    {daysInMonth.map((day) => {
                      const key = `${vehicle.id}-${format(day, 'yyyy-MM-dd')}`;
                      const availability = availabilityMap.get(key);

                      return (
                        <TooltipProvider key={key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <td
                                className={cn(
                                  "border p-0.5 text-center transition-colors",
                                  availability && getCellStyle(availability.status)
                                )}
                                onClick={() => handleCellClick(vehicle, day)}
                              >
                                {availability?.status === 'rented' && (
                                  <div className="w-full h-6 flex items-center justify-center">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                  </div>
                                )}
                                {availability?.status === 'maintenance' && (
                                  <div className="w-full h-6 flex items-center justify-center">
                                    <Wrench className="h-3 w-3" />
                                  </div>
                                )}
                                {availability?.status === 'available' && (
                                  <div className="w-full h-6"></div>
                                )}
                              </td>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="text-xs">
                                <p className="font-semibold mb-1">
                                  {vehicle.plate_number} - {format(day, 'PP', { locale: ar })}
                                </p>
                                {availability?.status === 'available' && (
                                  <p className="text-green-600">متاح - اضغط لإنشاء عقد</p>
                                )}
                                {availability?.status === 'rented' && availability.contract && (
                                  <div>
                                    <p className="text-red-600">مؤجر</p>
                                    <p className="mt-1">
                                      عقد: {availability.contract.contract_number}
                                    </p>
                                  </div>
                                )}
                                {availability?.status === 'maintenance' && (
                                  <p className="text-yellow-600">في الصيانة</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
