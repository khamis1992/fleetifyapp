import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Trophy } from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import { useVehicles } from '@/hooks/useVehicles';
import { usePayments } from '@/hooks/usePayments';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { differenceInDays, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';

interface VehicleRevenue {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  totalRevenue: number;
  rentalDays: number;
  revenuePerDay: number;
  utilizationRate: number;
  isUnderutilized: boolean;
}

export const RevenueOptimizationWidget: React.FC = () => {
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: payments, isLoading: paymentsLoading } = usePayments();
  const { formatCurrency } = useCurrencyFormatter();

  const isLoading = contractsLoading || vehiclesLoading || paymentsLoading;

  // Calculate current and previous month dates
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const previousMonthStart = startOfMonth(addMonths(new Date(), -1));
  const previousMonthEnd = endOfMonth(addMonths(new Date(), -1));

  // Calculate revenue per vehicle
  const vehicleRevenueData = React.useMemo(() => {
    if (!vehicles || !contracts || !payments) return [];

    const revenueMap: Record<string, VehicleRevenue> = {};

    vehicles.forEach((vehicle) => {
      // Get all contracts for this vehicle
      const vehicleContracts = contracts.filter((c) => c.vehicle_id === vehicle.id);

      // Calculate total revenue from payments
      const totalRevenue = payments
        .filter((p) =>
          vehicleContracts.some((c) => c.id === p.contract_id)
        )
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calculate total rental days
      const rentalDays = vehicleContracts.reduce((sum, contract) => {
        const start = parseISO(contract.start_date);
        const end = parseISO(contract.end_date);
        return sum + Math.max(0, differenceInDays(end, start));
      }, 0);

      // Calculate utilization rate (rental days / total days in period)
      const daysInPeriod = 90; // Last 3 months
      const utilizationRate = Math.round((rentalDays / daysInPeriod) * 100);

      // Revenue per day
      const revenuePerDay = rentalDays > 0 ? totalRevenue / rentalDays : 0;

      // Mark as underutilized if utilization < 30% and has revenue
      const isUnderutilized = utilizationRate < 30 && totalRevenue > 0;

      revenueMap[vehicle.id] = {
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.plate_number}`,
        vehicleType: vehicle.vehicle_type || 'غير محدد',
        totalRevenue,
        rentalDays,
        revenuePerDay,
        utilizationRate,
        isUnderutilized,
      };
    });

    return Object.values(revenueMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [vehicles, contracts, payments]);

  // Calculate revenue by vehicle type
  const revenueByType = React.useMemo(() => {
    const typeMap: Record<string, number> = {};

    vehicleRevenueData.forEach((v) => {
      typeMap[v.vehicleType] = (typeMap[v.vehicleType] || 0) + v.totalRevenue;
    });

    return Object.entries(typeMap)
      .map(([type, revenue]) => ({ type, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [vehicleRevenueData]);

  // Calculate current vs previous month revenue
  const revenueComparison = React.useMemo(() => {
    if (!payments) return { current: 0, previous: 0, change: 0, changePercent: 0 };

    const currentMonthRevenue = payments
      .filter((p) => {
        const paymentDate = parseISO(p.payment_date);
        return paymentDate >= currentMonthStart && paymentDate <= currentMonthEnd;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const previousMonthRevenue = payments
      .filter((p) => {
        const paymentDate = parseISO(p.payment_date);
        return paymentDate >= previousMonthStart && paymentDate <= previousMonthEnd;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const change = currentMonthRevenue - previousMonthRevenue;
    const changePercent = previousMonthRevenue > 0 ? Math.round((change / previousMonthRevenue) * 100) : 0;

    return {
      current: currentMonthRevenue,
      previous: previousMonthRevenue,
      change,
      changePercent,
    };
  }, [payments, currentMonthStart, currentMonthEnd, previousMonthStart, previousMonthEnd]);

  // Get top 5 revenue generators
  const topRevenueVehicles = React.useMemo(() => {
    return vehicleRevenueData
      .filter((v) => v.totalRevenue > 0)
      .slice(0, 5);
  }, [vehicleRevenueData]);

  // Get underutilized vehicles
  const underutilizedVehicles = React.useMemo(() => {
    return vehicleRevenueData.filter((v) => v.isUnderutilized).slice(0, 3);
  }, [vehicleRevenueData]);

  // Calculate potential revenue from idle vehicles
  const potentialRevenue = React.useMemo(() => {
    const idleVehicles = vehicleRevenueData.filter((v) => v.utilizationRate < 50);
    const avgRevenuePerDay = vehicleRevenueData.reduce((sum, v) => sum + v.revenuePerDay, 0) / vehicleRevenueData.length || 0;
    const totalIdleDays = idleVehicles.reduce((sum, v) => sum + (90 - (90 * v.utilizationRate / 100)), 0);

    return totalIdleDays * avgRevenuePerDay;
  }, [vehicleRevenueData]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            تحسين الإيرادات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="h-full"
    >
      <Card className="h-full bg-gradient-to-br from-emerald-50/50 to-green-50/30 border-emerald-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span>تحسين الإيرادات</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Revenue Trend */}
          <div className="p-4 rounded-lg bg-white/80 border border-emerald-200/50">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">إيرادات الشهر الحالي</span>
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {formatCurrency(revenueComparison.current)}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  {revenueComparison.changePercent >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm font-bold ${revenueComparison.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {revenueComparison.changePercent >= 0 ? '+' : ''}{revenueComparison.changePercent}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">مقارنة بالشهر السابق</span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              الشهر السابق: {formatCurrency(revenueComparison.previous)}
            </div>
          </div>

          {/* Revenue by Vehicle Type Chart */}
          {revenueByType.length > 0 && (
            <div className="p-3 rounded-lg bg-white/80 border border-emerald-200/50">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">الإيرادات حسب نوع المركبة</h4>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={revenueByType.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="type"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'الإيراد']}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {revenueByType.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${160 + index * 10}, 70%, 50%)`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Revenue Vehicles */}
          {topRevenueVehicles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                أعلى المركبات إيراداً
              </h4>
              <div className="space-y-1">
                {topRevenueVehicles.map((vehicle, index) => (
                  <div key={vehicle.vehicleId} className="flex items-center justify-between text-sm p-2 rounded bg-white/50">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`w-6 h-6 flex items-center justify-center p-0 ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
                          index === 1 ? 'bg-gray-100 text-gray-700 border-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700 border-orange-300' :
                          'bg-blue-100 text-blue-700 border-blue-300'
                        }`}
                      >
                        {index + 1}
                      </Badge>
                      <span className="text-muted-foreground">{vehicle.vehicleName}</span>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(vehicle.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Underutilized Vehicles */}
          {underutilizedVehicles.length > 0 && (
            <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                مركبات ضعيفة الاستخدام
              </h4>
              <div className="space-y-1">
                {underutilizedVehicles.map((vehicle) => (
                  <div key={vehicle.vehicleId} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{vehicle.vehicleName}</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                      {vehicle.utilizationRate}% استخدام
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Potential Revenue */}
          {potentialRevenue > 0 && (
            <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-100/80 to-green-100/50 border border-emerald-300">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">إيراد محتمل من المركبات الخاملة</span>
                  <div className="text-lg font-bold text-emerald-700">
                    {formatCurrency(potentialRevenue)}
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-emerald-600 opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                بتحسين استخدام المركبات الخاملة
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
