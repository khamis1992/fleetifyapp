import React, { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, Check, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  format,
  parseISO,
  isBefore,
  isAfter,
  isWithinInterval,
  addMonths,
  subMonths,
} from 'date-fns'
import { ar } from 'date-fns/locale'

interface Vehicle {
  id: string
  plate_number: string
  make: string
  model: string
  daily_rate: number
}

interface Booking {
  id: string
  vehicle_id: string
  start_date: string
  end_date: string
  customer_name: string
  status: string
}

export function VehicleAvailabilityCalendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [dragState, setDragState] = useState<{
    startDate: Date | null
    endDate: Date | null
    isDragging: boolean
  }>({ startDate: null, endDate: null, isDragging: false })

  // Fetch vehicles (mock implementation - database table structure may vary)
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles', user?.profile?.company_id],
    queryFn: async () => {
      const companyId = user?.profile?.company_id
      if (!companyId) return []
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, daily_rate, status')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('status', ['available', 'reserved'])

      if (error) throw error
      return (data || []) as Vehicle[]
    },
    enabled: !!user?.profile?.company_id,
  })

  // Fetch bookings (mock implementation - using contracts table with customer data)
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', user?.profile?.company_id, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const companyId = user?.profile?.company_id
      if (!companyId) return []

      const { data, error } = await supabase
        .from('contracts')
        .select('id, vehicle_id, start_date, end_date, status, customers(name)')
        .eq('company_id', companyId)
        .gte('end_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .in('status', ['draft', 'active'])

      if (error) throw error
      
      // Transform data to match Booking interface
      return (data || []).map((item: any) => ({
        id: item.id,
        vehicle_id: item.vehicle_id,
        start_date: item.start_date,
        end_date: item.end_date,
        customer_name: item.customers?.name || 'Unknown',
        status: item.status,
      })) as Booking[]
    },
    enabled: !!user?.profile?.company_id,
  })

  // Get calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Check if vehicle is booked on a date
  const isVehicleBookedOnDate = (vehicleId: string, date: Date) => {
    return bookings.some((booking) => {
      const bookingStart = parseISO(booking.start_date)
      const bookingEnd = parseISO(booking.end_date)
      return booking.vehicle_id === vehicleId && isWithinInterval(date, { start: bookingStart, end: bookingEnd })
    })
  }

  // Get booking info for a date
  const getBookingInfo = (vehicleId: string, date: Date) => {
    return bookings.find((booking) => {
      const bookingStart = parseISO(booking.start_date)
      const bookingEnd = parseISO(booking.end_date)
      return booking.vehicle_id === vehicleId && isWithinInterval(date, { start: bookingStart, end: bookingEnd })
    })
  }

  const filteredVehicles = selectedVehicle
    ? vehicles.filter((v) => v.id === selectedVehicle)
    : vehicles

  const isLoading = vehiclesLoading || bookingsLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">تقويم التوفرية</h2>
          <p className="text-muted-foreground">عرض توفر المركبات وجميع الحجوزات في لمحة واحدة</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedVehicle || 'all'} onValueChange={(value) => setSelectedVehicle(value === 'all' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المركبات</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-[150px] text-center font-semibold">
                {format(currentDate, 'MMMM yyyy', { locale: ar })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span className="text-sm">متاح</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
              <span className="text-sm">محجوز</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded"></div>
              <span className="text-sm">الحجز الحالي</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-500 rounded"></div>
              <span className="text-sm">خارج الشهر</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لا توجد مركبات متاحة</AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCalendarRow
              key={vehicle.id}
              vehicle={vehicle}
              calendarDays={calendarDays}
              monthStart={monthStart}
              isVehicleBookedOnDate={(date) => isVehicleBookedOnDate(vehicle.id, date)}
              getBookingInfo={(date) => getBookingInfo(vehicle.id, date)}
            />
          ))}
        </div>
      )}

      {/* Booking List */}
      {bookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الحجوزات النشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookings.map((booking) => {
                const vehicle = vehicles.find((v) => v.id === booking.vehicle_id)
                return (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div>
                      <p className="font-medium">{vehicle?.plate_number}</p>
                      <p className="text-sm text-muted-foreground">{booking.customer_name}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">
                        {format(parseISO(booking.start_date), 'dd/MM', { locale: ar })} - {format(parseISO(booking.end_date), 'dd/MM', { locale: ar })}
                      </p>
                      <Badge variant={booking.status === 'active' ? 'default' : 'secondary'}>
                        {booking.status === 'active' ? 'نشط' : 'مسودة'}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function VehicleCalendarRow({
  vehicle,
  calendarDays,
  monthStart,
  isVehicleBookedOnDate,
  getBookingInfo,
}: {
  vehicle: Vehicle
  calendarDays: Date[]
  monthStart: Date
  isVehicleBookedOnDate: (date: Date) => boolean
  getBookingInfo: (date: Date) => Booking | undefined
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4">
          <p className="font-semibold">{vehicle.plate_number}</p>
          <p className="text-sm text-muted-foreground">{vehicle.make} {vehicle.model} - {vehicle.daily_rate} ر.ع/اليوم</p>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Day headers */}
          {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((date) => {
            const isBooked = isVehicleBookedOnDate(date)
            const booking = getBookingInfo(date)
            const isCurrentMonth = isSameMonth(date, monthStart)
            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

            return (
              <div
                key={format(date, 'yyyy-MM-dd')}
                className={`aspect-square rounded flex items-center justify-center text-xs font-semibold cursor-pointer transition-colors relative group
                  ${!isCurrentMonth ? 'bg-gray-100 text-gray-400' : ''}
                  ${isBooked ? 'bg-red-100 border-2 border-red-500 text-red-900' : 'bg-green-100 border-2 border-green-500 text-green-900'}
                  ${isToday ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
                `}
                title={booking ? `${booking.customer_name}` : ''}
              >
                {format(date, 'd')}

                {booking && (
                  <div className="absolute bottom-0 w-1 h-1 bg-red-500 rounded-full"></div>
                )}
              </div>
            )
          })}
        </div>

        {/* Booking details for this vehicle */}
        {calendarDays.some((date) => isVehicleBookedOnDate(date)) && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-2">الحجوزات</p>
            <div className="space-y-1">
              {calendarDays
                .filter((date) => isVehicleBookedOnDate(date))
                .reduce((acc: Booking[], date) => {
                  const booking = getBookingInfo(date)
                  if (booking && !acc.find((b) => b.id === booking.id)) {
                    acc.push(booking)
                  }
                  return acc
                }, [])
                .slice(0, 3)
                .map((booking) => (
                  <p key={booking.id} className="text-xs text-muted-foreground">
                    • {booking.customer_name}: {format(parseISO(booking.start_date), 'dd/MM', { locale: ar })} - {format(parseISO(booking.end_date), 'dd/MM', { locale: ar })}
                  </p>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
