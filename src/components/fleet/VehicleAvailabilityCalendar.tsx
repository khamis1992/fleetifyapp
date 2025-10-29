import { useState, useMemo } from 'react'
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle, 
  Check,
  Calendar as CalendarIcon,
  Car,
  TrendingUp,
  AlertTriangle,
  Info,
  Download,
  Printer,
  BarChart3,
  Search,
  RefreshCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
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
  isToday,
  differenceInDays,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { ar } from 'date-fns/locale'
import { motion } from 'framer-motion'

interface Vehicle {
  id: string
  plate_number: string
  make: string
  model: string
  daily_rate: number
  status: string
}

interface Booking {
  id: string
  vehicle_id: string
  start_date: string
  end_date: string
  customer_name: string
  status: string
}

interface MaintenanceSchedule {
  vehicle_id: string
  scheduled_date: string
  completion_date: string | null
  status: string
}

export function VehicleAvailabilityCalendar() {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showStats, setShowStats] = useState(true)

  // Fetch vehicles - فقط المركبات المتاحة والنشطة
  const { data: vehicles = [], isLoading: vehiclesLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['availability-vehicles', user?.profile?.company_id],
    queryFn: async () => {
      const companyId = user?.profile?.company_id
      if (!companyId) return []
      
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, daily_rate, status')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .in('status', ['available', 'reserved', 'rented'])
        .order('plate_number')

      if (error) throw error
      return (data || []) as Vehicle[]
    },
    enabled: !!user?.profile?.company_id,
  })

  // Fetch bookings (contracts)
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['availability-bookings', user?.profile?.company_id, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const companyId = user?.profile?.company_id
      if (!companyId) return []

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id, 
          vehicle_id, 
          start_date, 
          end_date, 
          status,
          customers(name)
        `)
        .eq('company_id', companyId)
        .lte('start_date', format(monthEnd, 'yyyy-MM-dd'))
        .gte('end_date', format(monthStart, 'yyyy-MM-dd'))
        .in('status', ['draft', 'active'])

      if (error) throw error
      
      return (data || []).map((item: any) => ({
        id: item.id,
        vehicle_id: item.vehicle_id,
        start_date: item.start_date,
        end_date: item.end_date,
        customer_name: item.customers?.name || 'غير محدد',
        status: item.status,
      })) as Booking[]
    },
    enabled: !!user?.profile?.company_id,
  })

  // Fetch maintenance schedules
  const { data: maintenanceSchedules = [] } = useQuery({
    queryKey: ['maintenance-schedules', user?.profile?.company_id, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = startOfMonth(currentDate)
      const monthEnd = endOfMonth(currentDate)
      const companyId = user?.profile?.company_id
      if (!companyId) return []

      const { data, error } = await supabase
        .from('maintenance_records')
        .select('vehicle_id, scheduled_date, completion_date, status')
        .eq('company_id', companyId)
        .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(monthEnd, 'yyyy-MM-dd'))
        .in('status', ['scheduled', 'in_progress'])

      if (error) throw error
      return (data || []) as MaintenanceSchedule[]
    },
    enabled: !!user?.profile?.company_id,
  })

  // Calculate statistics
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length
    const totalBookings = bookings.length
    const activeBookings = bookings.filter(b => b.status === 'active').length
    const upcomingBookings = bookings.filter(b => {
      const startDate = parseISO(b.start_date)
      return isAfter(startDate, new Date()) && isBefore(startDate, addMonths(new Date(), 1))
    }).length
    
    // Calculate utilization rate
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const totalDays = differenceInDays(monthEnd, monthStart) + 1
    const bookedDays = bookings.reduce((acc, booking) => {
      const start = parseISO(booking.start_date)
      const end = parseISO(booking.end_date)
      const overlapStart = isAfter(start, monthStart) ? start : monthStart
      const overlapEnd = isBefore(end, monthEnd) ? end : monthEnd
      return acc + Math.max(0, differenceInDays(overlapEnd, overlapStart) + 1)
    }, 0)
    const utilizationRate = totalVehicles > 0 ? (bookedDays / (totalVehicles * totalDays)) * 100 : 0

    return {
      totalVehicles,
      totalBookings,
      activeBookings,
      upcomingBookings,
      utilizationRate: parseFloat(Math.min(100, utilizationRate).toFixed(1)),
    }
  }, [vehicles, bookings, currentDate])

  // Get calendar days
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const weekStart = startOfWeek(monthStart, { locale: ar, weekStartsOn: 6 })
  const weekEnd = endOfWeek(monthEnd, { locale: ar, weekStartsOn: 6 })
  const calendarDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Check if vehicle is booked or in maintenance on a date
  const isVehicleUnavailableOnDate = (vehicleId: string, date: Date) => {
    // Check bookings
    const hasBooking = bookings.some((booking) => {
      const bookingStart = parseISO(booking.start_date)
      const bookingEnd = parseISO(booking.end_date)
      return booking.vehicle_id === vehicleId && isWithinInterval(date, { start: bookingStart, end: bookingEnd })
    })
    
    // Check maintenance
    const hasMaintenance = maintenanceSchedules.some((maintenance) => {
      const maintenanceDate = parseISO(maintenance.scheduled_date)
      return maintenance.vehicle_id === vehicleId && format(maintenanceDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    })
    
    return hasBooking || hasMaintenance
  }

  // Get booking info for a date
  const getBookingInfo = (vehicleId: string, date: Date) => {
    return bookings.find((booking) => {
      const bookingStart = parseISO(booking.start_date)
      const bookingEnd = parseISO(booking.end_date)
      return booking.vehicle_id === vehicleId && isWithinInterval(date, { start: bookingStart, end: bookingEnd })
    })
  }

  // Filter vehicles based on search
  const filteredVehicles = useMemo(() => {
    let filtered = vehicles

    if (selectedVehicle) {
      filtered = filtered.filter((v) => v.id === selectedVehicle)
    }

    if (searchTerm) {
      filtered = filtered.filter((v) =>
        v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }, [vehicles, selectedVehicle, searchTerm])

  const isLoading = vehiclesLoading || bookingsLoading

  // Upcoming bookings
  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => {
        const startDate = parseISO(b.start_date)
        return isAfter(startDate, new Date())
      })
      .sort((a, b) => {
        const dateA = parseISO(a.start_date)
        const dateB = parseISO(b.start_date)
        return dateA.getTime() - dateB.getTime()
      })
      .slice(0, 5)
  }, [bookings])

  // Calculate vehicle utilization
  const vehicleUtilization = useMemo(() => {
    return filteredVehicles.slice(0, 5).map(vehicle => {
      const vehicleBookings = bookings.filter(b => b.vehicle_id === vehicle.id)
      const totalDays = differenceInDays(endOfMonth(currentDate), startOfMonth(currentDate)) + 1
      const bookedDays = vehicleBookings.reduce((acc, booking) => {
        const start = parseISO(booking.start_date)
        const end = parseISO(booking.end_date)
        const monthStart = startOfMonth(currentDate)
        const monthEnd = endOfMonth(currentDate)
        const overlapStart = isAfter(start, monthStart) ? start : monthStart
        const overlapEnd = isBefore(end, monthEnd) ? end : monthEnd
        return acc + Math.max(0, differenceInDays(overlapEnd, overlapStart) + 1)
      }, 0)
      const utilizationPercent = (bookedDays / totalDays) * 100

      return {
        vehicle,
        bookedDays,
        totalDays,
        utilizationPercent: parseFloat(utilizationPercent.toFixed(1))
      }
    })
  }, [filteredVehicles, bookings, currentDate])

  // Unutilized vehicles
  const unutilizedVehicles = useMemo(() => {
    return filteredVehicles.filter(vehicle => {
      const vehicleBookings = bookings.filter(b => b.vehicle_id === vehicle.id)
      return vehicleBookings.length === 0
    })
  }, [filteredVehicles, bookings])

  // Export to CSV
  const handleExport = () => {
    const csvData = bookings.map((booking) => {
      const vehicle = vehicles.find((v) => v.id === booking.vehicle_id)
      return {
        'رقم اللوحة': vehicle?.plate_number || '',
        'نوع المركبة': `${vehicle?.make} ${vehicle?.model}` || '',
        'العميل': booking.customer_name,
        'تاريخ البدء': format(parseISO(booking.start_date), 'yyyy-MM-dd'),
        'تاريخ الانتهاء': format(parseISO(booking.end_date), 'yyyy-MM-dd'),
        'الحالة': booking.status === 'active' ? 'نشط' : 'مسودة',
      }
    })

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map((row) => Object.values(row).join(',')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `availability_${format(currentDate, 'yyyy-MM')}.csv`
    link.click()
  }

  // Print calendar
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
          @page { margin: 1cm; }
        }
      `}</style>

      {/* Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="no-print">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">تقويم التوفرية</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStats(!showStats)}
                >
                  <BarChart3 className="h-4 w-4 ml-2" />
                  {showStats ? 'إخفاء الإحصائيات' : 'عرض الإحصائيات'}
                </Button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="بحث عن مركبة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-48"
                  />
                </div>

                {/* Export */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={bookings.length === 0}
                >
                  <Download className="h-4 w-4 ml-2" />
                  تصدير
                </Button>

                {/* Print */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                >
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    refetchVehicles()
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Statistics Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <Card className="border-r-4 border-r-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي المركبات</p>
                    <p className="text-2xl font-bold">{stats.totalVehicles}</p>
                    <p className="text-xs text-muted-foreground mt-1">مركبة نشطة</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-r-4 border-r-green-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">الحجوزات النشطة</p>
                    <p className="text-2xl font-bold text-green-600">{stats.activeBookings}</p>
                    <p className="text-xs text-muted-foreground mt-1">حجز نشط</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-r-4 border-r-orange-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">الحجوزات القادمة</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.upcomingBookings}</p>
                    <p className="text-xs text-muted-foreground mt-1">حجز قادم</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <CalendarIcon className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="border-r-4 border-r-purple-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">معدل الاستخدام</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.utilizationRate}%</p>
                    <p className="text-xs text-muted-foreground mt-1">من إجمالي الأيام</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Utilization Chart */}
      {showStats && vehicleUtilization.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                معدل إشغال الأسطول
              </CardTitle>
              <CardDescription>توزيع الحجوزات عبر المركبات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vehicleUtilization.map(({ vehicle, bookedDays, totalDays, utilizationPercent }, index) => (
                  <div key={vehicle.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{vehicle.plate_number}</span>
                      <span className="text-muted-foreground">
                        {bookedDays} من {totalDays} يوم ({utilizationPercent}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${utilizationPercent}%` }}
                        transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          utilizationPercent >= 80 ? 'bg-green-500' :
                          utilizationPercent >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
                {filteredVehicles.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    عرض أول 5 مركبات • إجمالي {filteredVehicles.length} مركبة
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Alerts & Insights */}
      {showStats && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-r-4 border-r-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                تنبيهات وملاحظات
              </CardTitle>
              <CardDescription>معلومات مهمة لتحسين الإشغال</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unutilizedVehicles.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Info className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-900">
                        {unutilizedVehicles.length} {unutilizedVehicles.length === 1 ? 'مركبة' : 'مركبات'} غير محجوزة هذا الشهر
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        {unutilizedVehicles.slice(0, 3).map(v => v.plate_number).join('، ')}
                        {unutilizedVehicles.length > 3 && ` و${unutilizedVehicles.length - 3} أخرى`}
                      </p>
                    </div>
                  </div>
                )}

                {stats.utilizationRate < 50 && (
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-yellow-900">معدل استخدام منخفض</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        معدل الاستخدام الحالي {stats.utilizationRate}% - يمكن زيادة الحجوزات لتحسين العائد
                      </p>
                    </div>
                  </div>
                )}

                {stats.utilizationRate >= 80 && (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900">أداء ممتاز!</p>
                      <p className="text-sm text-green-700 mt-1">
                        معدل استخدام مرتفع {stats.utilizationRate}% - استمر بهذا الأداء الرائع
                      </p>
                    </div>
                  </div>
                )}

                {stats.utilizationRate >= 50 && stats.utilizationRate < 80 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900">الأداء جيد</p>
                      <p className="text-sm text-blue-700 mt-1">
                        معدل الاستخدام {stats.utilizationRate}% - أداء متوازن وجيد
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap flex-1">
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
                  className="shrink-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[180px] text-center font-semibold px-4 py-2 bg-muted rounded-md">
                  {format(currentDate, 'MMMM yyyy', { locale: ar })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  className="shrink-0"
                >
                  اليوم
                </Button>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-6 pt-4 border-t flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 border-2 border-green-500 rounded-md shadow-sm"></div>
              <span className="text-sm font-medium">متاح</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-100 border-2 border-red-500 rounded-md shadow-sm"></div>
              <span className="text-sm font-medium">محجوز</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-100 border-2 border-blue-500 rounded-md shadow-sm ring-2 ring-offset-1 ring-blue-300"></div>
              <span className="text-sm font-medium">اليوم</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-100 border-2 border-gray-300 rounded-md"></div>
              <span className="text-sm font-medium">خارج الشهر</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>لا توجد مركبات متاحة</AlertDescription>
        </Alert>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="space-y-4"
        >
          {filteredVehicles.map((vehicle, index) => (
            <VehicleCalendarRow
              key={vehicle.id}
              vehicle={vehicle}
              calendarDays={calendarDays}
              monthStart={monthStart}
              isVehicleUnavailableOnDate={(date) => isVehicleUnavailableOnDate(vehicle.id, date)}
              getBookingInfo={(date) => getBookingInfo(vehicle.id, date)}
              bookings={bookings.filter(b => b.vehicle_id === vehicle.id)}
              index={index}
            />
          ))}
        </motion.div>
      )}

      {/* Upcoming Bookings */}
      {upcomingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              الحجوزات القادمة
            </CardTitle>
            <CardDescription>الحجوزات المقررة في الأيام القادمة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingBookings.map((booking) => {
                const vehicle = vehicles.find((v) => v.id === booking.vehicle_id)
                const daysUntil = differenceInDays(parseISO(booking.start_date), new Date())
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 bg-primary rounded-lg">
                        <CalendarIcon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{vehicle?.plate_number || 'غير محدد'}</p>
                        <p className="text-sm text-muted-foreground">{booking.customer_name}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">
                        {format(parseISO(booking.start_date), 'dd MMMM', { locale: ar })} - {format(parseISO(booking.end_date), 'dd MMMM', { locale: ar })}
                      </p>
                      <Badge variant={daysUntil <= 3 ? 'destructive' : 'secondary'} className="mt-1">
                        {daysUntil === 0 ? 'اليوم' : daysUntil === 1 ? 'غداً' : `بعد ${daysUntil} أيام`}
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
  isVehicleUnavailableOnDate,
  getBookingInfo,
  bookings,
  index,
}: {
  vehicle: Vehicle
  calendarDays: Date[]
  monthStart: Date
  isVehicleUnavailableOnDate: (date: Date) => boolean
  getBookingInfo: (date: Date) => Booking | undefined
  bookings: Booking[]
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="hover:shadow-md transition-shadow print-break-inside-avoid">
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-5 w-5 text-primary" />
                <p className="text-lg font-bold">{vehicle.plate_number}</p>
                <Badge variant="outline" className="text-xs">
                  {vehicle.status === 'available' ? 'متاح' : vehicle.status === 'rented' ? 'مؤجر' : 'محجوز'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {vehicle.make} {vehicle.model} • {vehicle.daily_rate} ر.ع/اليوم
              </p>
            </div>
            {bookings.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {bookings.length} {bookings.length === 1 ? 'حجز' : 'حجوزات'}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {/* Day headers */}
            {['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((date) => {
              const isUnavailable = isVehicleUnavailableOnDate(date)
              const booking = getBookingInfo(date)
              const isCurrentMonth = isSameMonth(date, monthStart)
              const isTodayDate = isToday(date)

              return (
                <motion.div
                  key={format(date, 'yyyy-MM-dd')}
                  whileHover={{ scale: isCurrentMonth ? 1.05 : 1 }}
                  whileTap={{ scale: isCurrentMonth ? 0.95 : 1 }}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-semibold cursor-pointer transition-all relative group
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-300 border-2 border-gray-200' : ''}
                    ${isUnavailable 
                      ? 'bg-red-50 border-2 border-red-400 text-red-900 hover:bg-red-100 hover:border-red-500' 
                      : isCurrentMonth ? 'bg-green-50 border-2 border-green-400 text-green-900 hover:bg-green-100 hover:border-green-500' : ''
                    }
                    ${isTodayDate ? 'ring-2 ring-offset-2 ring-blue-400 shadow-lg' : ''}
                  `}
                  title={booking ? `${booking.customer_name} - ${format(parseISO(booking.start_date), 'dd/MM')} إلى ${format(parseISO(booking.end_date), 'dd/MM')}` : isCurrentMonth ? 'متاح' : ''}
                >
                  <span className={isTodayDate ? 'font-bold' : ''}>{format(date, 'd')}</span>
                  {isUnavailable && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Booking details */}
          {bookings.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Info className="h-3 w-3" />
                الحجوزات في هذا الشهر
              </p>
              <div className="space-y-2">
                {bookings.map((booking) => {
                  const startDate = parseISO(booking.start_date)
                  const endDate = parseISO(booking.end_date)
                  const duration = differenceInDays(endDate, startDate) + 1
                  
                  return (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{booking.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(startDate, 'dd MMMM', { locale: ar })} - {format(endDate, 'dd MMMM', { locale: ar })}
                        </p>
                      </div>
                      <div className="text-left">
                        <Badge variant={booking.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {booking.status === 'active' ? 'نشط' : 'مسودة'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{duration} {duration === 1 ? 'يوم' : 'أيام'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
