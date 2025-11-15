import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { usePayments } from '@/hooks/usePayments.unified';
import { ShoppingCart, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

interface SalesAnalyticsWidgetProps {
  className?: string;
}

export const SalesAnalyticsWidget: React.FC<SalesAnalyticsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const chartRef = useRef<HTMLDivElement>(null);

  // Get today's date range
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  // Get yesterday's date range for comparison
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
  const yesterdayEnd = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

  // Get this week's date range
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  // Get this month's date range
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch today's sales orders
  const { data: todaySales = [], isLoading: loadingToday } = useSalesOrders({
    status: 'completed'
  });

  // Fetch yesterday's sales for comparison
  const { data: yesterdaySales = [], isLoading: loadingYesterday } = useSalesOrders({
    status: 'completed'
  });

  // Fetch payments for payment method breakdown
  const { data: payments = [], isLoading: loadingPayments } = usePayments({
    type: 'receipt'
  });

  const isLoading = loadingToday || loadingYesterday || loadingPayments;

  // Calculate analytics
  const analytics = useMemo(() => {
    // Filter sales by date ranges
    const todaySalesData = todaySales.filter(sale => {
      const saleDate = new Date(sale.order_date);
      return saleDate >= new Date(todayStart) && saleDate <= new Date(todayEnd);
    });

    const yesterdaySalesData = yesterdaySales.filter(sale => {
      const saleDate = new Date(sale.order_date);
      return saleDate >= new Date(yesterdayStart) && saleDate <= new Date(yesterdayEnd);
    });

    const weekSalesData = todaySales.filter(sale => {
      const saleDate = new Date(sale.order_date);
      return saleDate >= weekStart;
    });

    const monthSalesData = todaySales.filter(sale => {
      const saleDate = new Date(sale.order_date);
      return saleDate >= monthStart;
    });

    // Calculate totals
    const todayRevenue = todaySalesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const todayCount = todaySalesData.length;
    const yesterdayRevenue = yesterdaySalesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const yesterdayCount = yesterdaySalesData.length;
    const weekRevenue = weekSalesData.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const monthRevenue = monthSalesData.reduce((sum, sale) => sum + (sale.total || 0), 0);

    // Calculate average transaction value
    const avgTransactionValue = todayCount > 0 ? todayRevenue / todayCount : 0;

    // Calculate comparison percentages
    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;
    const countChange = yesterdayCount > 0
      ? ((todayCount - yesterdayCount) / yesterdayCount) * 100
      : 0;

    // Calculate hourly sales for today
    const hourlySales = Array.from({ length: 24 }, (_, hour) => {
      const hourSales = todaySalesData.filter(sale => {
        const saleHour = new Date(sale.order_date).getHours();
        return saleHour === hour;
      });
      const revenue = hourSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      return {
        hour: `${hour}:00`,
        revenue,
        count: hourSales.length
      };
    });

    // Calculate payment method breakdown
    const todayPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate >= new Date(todayStart) && paymentDate <= new Date(todayEnd);
    });

    const paymentMethodBreakdown = todayPayments.reduce((acc, payment) => {
      const method = payment.payment_method || 'نقد';
      acc[method] = (acc[method] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

    const paymentMethodData = Object.entries(paymentMethodBreakdown).map(([method, amount]) => ({
      name: method,
      value: amount
    }));

    return {
      todayRevenue,
      todayCount,
      yesterdayRevenue,
      yesterdayCount,
      weekRevenue,
      monthRevenue,
      avgTransactionValue,
      revenueChange,
      countChange,
      hourlySales,
      paymentMethodData
    };
  }, [todaySales, yesterdaySales, payments, todayStart, todayEnd, yesterdayStart, yesterdayEnd, weekStart, monthStart]);

  const exportData = useMemo(() =>
    analytics.hourlySales.map(item => ({
      'الساعة': item.hour,
      'الإيرادات': item.revenue,
      'عدد المعاملات': item.count
    })),
    [analytics.hourlySales]
  );

  const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa'];

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={4} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-orange-500" />
              تحليلات المبيعات
            </CardTitle>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="sales_analytics"
                title="تحليلات المبيعات"
                variant="ghost"
                size="sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/sales/orders')}
                className="text-orange-600 hover:text-orange-700"
              >
                بيع جديد
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Today's Revenue */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-orange-500" />
                {analytics.revenueChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.todayRevenue)}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                <EnhancedTooltip kpi={kpiDefinitions.averageRevenue}>
                  <span>مبيعات اليوم</span>
                </EnhancedTooltip>
              </div>
              <div className={`text-xs mt-1 ${analytics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.revenueChange >= 0 ? '+' : ''}{analytics.revenueChange.toFixed(1)}% من الأمس
              </div>
            </div>

            {/* Transaction Count */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
                {analytics.countChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.todayCount}
              </div>
              <div className="text-xs text-gray-600 mt-1">معاملات اليوم</div>
              <div className={`text-xs mt-1 ${analytics.countChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.countChange >= 0 ? '+' : ''}{analytics.countChange.toFixed(1)}% من الأمس
              </div>
            </div>

            {/* Week Revenue */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.weekRevenue)}
              </div>
              <div className="text-xs text-gray-600 mt-1">مبيعات الأسبوع</div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.floor(analytics.weekRevenue / 7)} متوسط/يوم
              </div>
            </div>

            {/* Month Revenue */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.monthRevenue)}
              </div>
              <div className="text-xs text-gray-600 mt-1">مبيعات الشهر</div>
              <div className="text-xs text-gray-500 mt-1">
                متوسط المعاملة: {formatCurrency(analytics.avgTransactionValue)}
              </div>
            </div>
          </div>

          {/* Sales Trend Chart */}
          <div>
            <h3 className="text-sm font-semibold mb-3">المبيعات حسب الساعة (اليوم)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={analytics.hourlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'الإيرادات']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: '#f97316', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Method Breakdown */}
          {analytics.paymentMethodData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">طرق الدفع (اليوم)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.paymentMethodData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analytics.paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
