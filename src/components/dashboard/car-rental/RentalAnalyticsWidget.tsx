import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import { useVehicles } from '@/hooks/useVehicles';
import { usePayments } from '@/hooks/usePayments.unified';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

type TimePeriod = 'today' | 'week' | 'month';

export const RentalAnalyticsWidget: React.FC = () => {
  const [timePeriod, setTimePeriod] = React.useState<TimePeriod>('month');
  const chartRef = React.useRef<HTMLDivElement>(null);

  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: payments, isLoading: paymentsLoading } = usePayments();

  const isLoading = contractsLoading || vehiclesLoading || paymentsLoading;

  // Filter contracts by business_type = 'car_rental' and time period
  const rentalContracts = React.useMemo(() => {
    if (!contracts) return [];

    const now = new Date();
    let cutoffDate = new Date();

    switch (timePeriod) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }

    return contracts.filter((contract) => {
      const startDate = new Date(contract.start_date);
      return (
        contract.vehicle_id && // Must have a vehicle (car rental)
        startDate >= cutoffDate &&
        contract.status === 'active'
      );
    });
  }, [contracts, timePeriod]);

  // Calculate fleet utilization rate
  const utilizationRate = React.useMemo(() => {
    if (!vehicles || vehicles.length === 0) return 0;

    const rentedCount = vehicles.filter(v => v.status === 'rented').length;
    return Math.round((rentedCount / vehicles.length) * 100);
  }, [vehicles]);

  // Calculate average rental duration
  const avgRentalDuration = React.useMemo(() => {
    if (rentalContracts.length === 0) return 0;

    const totalDays = rentalContracts.reduce((sum, contract) => {
      const start = new Date(contract.start_date);
      const end = new Date(contract.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return Math.round(totalDays / rentalContracts.length);
  }, [rentalContracts]);

  // Calculate revenue per vehicle per day
  const revenuePerVehiclePerDay = React.useMemo(() => {
    if (!vehicles || vehicles.length === 0 || !payments) return 0;

    // Filter payments for the selected period
    const now = new Date();
    let cutoffDate = new Date();

    switch (timePeriod) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
    }

    const totalRevenue = payments
      .filter(p => new Date(p.payment_date) >= cutoffDate)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const days = timePeriod === 'today' ? 1 : timePeriod === 'week' ? 7 : 30;

    return Math.round(totalRevenue / vehicles.length / days);
  }, [vehicles, payments, timePeriod]);

  // Most popular vehicle types
  const popularVehicleTypes = React.useMemo(() => {
    if (!rentalContracts || !vehicles) return [];

    const typeCounts: Record<string, number> = {};

    rentalContracts.forEach(contract => {
      const vehicle = vehicles.find(v => v.id === contract.vehicle_id);
      if (vehicle?.vehicle_type) {
        typeCounts[vehicle.vehicle_type] = (typeCounts[vehicle.vehicle_type] || 0) + 1;
      }
    });

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [rentalContracts, vehicles]);

  // Calculate trend data for chart (last 7 days)
  const trendData = React.useMemo(() => {
    if (!contracts || !vehicles) return [];

    const data = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const activeCount = contracts.filter(c => {
        const start = new Date(c.start_date);
        const end = new Date(c.end_date);
        return start <= date && end >= date && c.vehicle_id;
      }).length;

      const utilization = vehicles.length > 0 ? Math.round((activeCount / vehicles.length) * 100) : 0;

      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        utilization,
      });
    }

    return data;
  }, [contracts, vehicles]);

  // Calculate comparison to previous period
  const utilizationChange = React.useMemo(() => {
    if (trendData.length < 2) return 0;
    const current = trendData[trendData.length - 1].utilization;
    const previous = trendData[0].utilization;
    return current - previous;
  }, [trendData]);

  // Prepare export data
  const exportData = React.useMemo(() => {
    return [
      { المؤشر: 'معدل الاستخدام', القيمة: `${utilizationRate}%` },
      { المؤشر: 'متوسط مدة التأجير', القيمة: `${avgRentalDuration} يوم` },
      { المؤشر: 'الإيراد لكل مركبة يومياً', القيمة: `${revenuePerVehiclePerDay} ر.س` },
      ...popularVehicleTypes.map((type, index) => ({
        المؤشر: `نوع المركبة ${index + 1}`,
        النوع: type.type,
        'عدد التأجيرات': type.count,
      })),
    ];
  }, [utilizationRate, avgRentalDuration, revenuePerVehiclePerDay, popularVehicleTypes]);

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={3} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-purple-50/50 to-pink-50/30 border-purple-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span>تحليلات التأجير</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">اليوم</SelectItem>
                  <SelectItem value="week">هذا الأسبوع</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                </SelectContent>
              </Select>
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="rental_analytics"
                title="تحليلات التأجير"
                variant="ghost"
                size="sm"
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4" ref={chartRef}>
          {/* Empty State */}
          {rentalContracts.length === 0 ? (
            <EmptyStateCompact
              type="no-data"
              title="لا توجد بيانات تأجير"
              description="ابدأ بإضافة عقود تأجير للحصول على التحليلات"
            />
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/80 border border-purple-200/50">
              <EnhancedTooltip kpi={kpiDefinitions.utilizationRate}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-muted-foreground">
                    معدل الاستخدام
                  </span>
                </div>
              </EnhancedTooltip>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-600">
                  {utilizationRate}%
                </span>
                {utilizationChange !== 0 && (
                  <div className="flex items-center gap-1">
                    {utilizationChange > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${utilizationChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(utilizationChange)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/80 border border-purple-200/50">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-pink-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  متوسط مدة التأجير
                </span>
              </div>
              <div className="text-2xl font-bold text-pink-600">
                {avgRentalDuration} <span className="text-sm">يوم</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/80 border border-purple-200/50 col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-muted-foreground">
                  الإيراد لكل مركبة يومياً
                </span>
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {revenuePerVehiclePerDay} ر.س
              </div>
            </div>
          </div>

          {/* Utilization Trend Chart */}
          {trendData.length > 0 && (
            <div className="p-3 rounded-lg bg-white/80 border border-purple-200/50">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">اتجاه الاستخدام</h4>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'الاستخدام']}
                  />
                  <Line
                    type="monotone"
                    dataKey="utilization"
                    stroke="url(#colorGradient)"
                    strokeWidth={2}
                    dot={{ fill: '#9333ea', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#db2777" />
                    </linearGradient>
                  </defs>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Most Popular Vehicle Types */}
          {popularVehicleTypes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">الأنواع الأكثر طلباً</h4>
              <div className="space-y-1">
                {popularVehicleTypes.map((type, index) => (
                  <div key={type.type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`w-6 h-6 flex items-center justify-center p-0 ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          index === 1 ? 'bg-slate-100 text-slate-700 border-slate-300' :
                          'bg-orange-100 text-orange-700 border-orange-300'
                        }`}
                      >
                        {index + 1}
                      </Badge>
                      <span className="text-muted-foreground">{type.type}</span>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {type.count} تأجير
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
