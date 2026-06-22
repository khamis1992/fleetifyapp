/**
 * Reservations Calendar Component
 * Placeholder component for reservation calendar view
 */

import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, Car } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReservationsCalendarProps {
  reservations: any[];
  loading?: boolean;
}

export const ReservationsCalendar: React.FC<ReservationsCalendarProps> = ({
  reservations = [],
  loading = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get current month info
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Get month name in Arabic
  const monthName = currentDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Get reservations for a specific day
  const getReservationsForDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return reservations.filter(r => {
      const start = new Date(r.start_date);
      const end = r.end_date ? new Date(r.end_date) : start;
      return date >= start && date <= end;
    });
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    
    // Empty cells for days before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  }, [firstDayOfMonth, daysInMonth]);

  const weekDays = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-teal-600" />
          تقويم الحجوزات
        </h3>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="px-4 py-2 font-medium text-slate-700 min-w-[140px] text-center">
            {monthName}
          </span>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Week days header */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="p-3 text-center text-sm font-medium text-slate-600"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayReservations = day ? getReservationsForDay(day) : [];
            const isToday = day === new Date().getDate() && 
                           currentMonth === new Date().getMonth() && 
                           currentYear === new Date().getFullYear();

            return (
              <div
                key={index}
                className={cn(
                  "min-h-[80px] p-2 border-b border-r border-slate-100",
                  !day && "bg-slate-50",
                  isToday && "bg-teal-50"
                )}
              >
                {day && (
                  <>
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isToday ? "text-teal-700" : "text-slate-700"
                    )}>
                      {day}
                    </div>
                    
                    {/* Reservations for this day */}
                    <div className="space-y-1">
                      {dayReservations.slice(0, 2).map((r, i) => (
                        <div
                          key={i}
                          className={cn(
                            "text-xs px-1.5 py-0.5 rounded truncate",
                            r.status === 'active' && "bg-teal-100 text-teal-700",
                            r.status === 'pending' && "bg-amber-100 text-amber-700",
                            r.status === 'confirmed' && "bg-emerald-100 text-emerald-700",
                            r.status === 'completed' && "bg-slate-100 text-slate-700"
                          )}
                        >
                          {r.vehicles?.plate_number || r.reservation_number || 'حجز'}
                        </div>
                      ))}
                      
                      {dayReservations.length > 2 && (
                        <div className="text-xs text-slate-500 px-1">
                          +{dayReservations.length - 2} أخرى
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-teal-100" />
          <span>نشط</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-100" />
          <span>معلق</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-emerald-100" />
          <span>مؤكد</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-slate-100" />
          <span>مكتمل</span>
        </div>
      </div>
    </div>
  );
};

export default ReservationsCalendar;
