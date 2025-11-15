import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { TrendingUp, Calendar, DollarSign, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';

interface SalesForecastWidgetProps {
  className?: string;
}

export const SalesForecastWidget: React.FC<SalesForecastWidgetProps> = ({ className }) => {
  const { formatCurrency } = useCurrencyFormatter();
  const chartRef = useRef<HTMLDivElement>(null);

  const { data: salesOrders = [], isLoading } = useSalesOrders({
    status: 'completed'
  });

  // Calculate forecast analytics
  const analytics = useMemo(() => {
    // Get last 60 days of sales data
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const historicalSales = salesOrders.filter(order => {
      return new Date(order.order_date) >= sixtyDaysAgo;
    });

    // Group sales by day
    const dailySales = new Map<string, number>();
    historicalSales.forEach(order => {
      const date = new Date(order.order_date).toISOString().split('T')[0];
      dailySales.set(date, (dailySales.get(date) || 0) + (order.total || 0));
    });

    // Convert to array and sort
    const dailySalesArray = Array.from(dailySales.entries())
      .map(([date, revenue]) => ({ date: new Date(date), revenue }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (dailySalesArray.length === 0) {
      return {
        historicalData: [],
        forecastData: [],
        next7DaysForecast: 0,
        next30DaysForecast: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        trend: 'stable' as const,
        accuracy: 0
      };
    }

    // Calculate simple moving average (7-day SMA)
    const calculateSMA = (data: { date: Date; revenue: number }[], window: number) => {
      const sma: number[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < window - 1) {
          sma.push(data[i].revenue);
        } else {
          const sum = data.slice(i - window + 1, i + 1).reduce((acc, d) => acc + d.revenue, 0);
          sma.push(sum / window);
        }
      }
      return sma;
    };

    const sma7 = calculateSMA(dailySalesArray, 7);

    // Calculate linear regression for trend
    const n = dailySalesArray.length;
    const sumX = dailySalesArray.reduce((sum, _, i) => sum + i, 0);
    const sumY = dailySalesArray.reduce((sum, d) => sum + d.revenue, 0);
    const sumXY = dailySalesArray.reduce((sum, d, i) => sum + i * d.revenue, 0);
    const sumX2 = dailySalesArray.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate standard deviation for confidence interval
    const mean = sumY / n;
    const variance = dailySalesArray.reduce((sum, d) => sum + Math.pow(d.revenue - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Generate forecast for next 30 days
    const forecastDays = 30;
    const forecastData: Array<{
      date: string;
      actual?: number;
      forecast: number;
      lowerBound: number;
      upperBound: number;
    }> = [];

    // Add historical data with SMA
    dailySalesArray.forEach((d, i) => {
      forecastData.push({
        date: d.date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        actual: d.revenue,
        forecast: sma7[i],
        lowerBound: sma7[i] - stdDev,
        upperBound: sma7[i] + stdDev
      });
    });

    // Calculate day of week pattern
    const dayOfWeekSales = new Map<number, number[]>();
    historicalSales.forEach(order => {
      const dayOfWeek = new Date(order.order_date).getDay();
      if (!dayOfWeekSales.has(dayOfWeek)) {
        dayOfWeekSales.set(dayOfWeek, []);
      }
      dayOfWeekSales.get(dayOfWeek)!.push(order.total || 0);
    });

    const dayOfWeekAvg = new Map<number, number>();
    dayOfWeekSales.forEach((sales, day) => {
      const avg = sales.reduce((sum, s) => sum + s, 0) / sales.length;
      dayOfWeekAvg.set(day, avg);
    });

    // Add forecast data
    let next7DaysTotal = 0;
    let next30DaysTotal = 0;

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);

      const dayOfWeek = forecastDate.getDay();
      const baselineForecast = intercept + slope * (n + i);
      const dayOfWeekFactor = (dayOfWeekAvg.get(dayOfWeek) || mean) / mean;
      const adjustedForecast = baselineForecast * dayOfWeekFactor;

      const forecast = Math.max(0, adjustedForecast);
      const lowerBound = Math.max(0, forecast - 1.96 * stdDev);
      const upperBound = forecast + 1.96 * stdDev;

      forecastData.push({
        date: forecastDate.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        forecast,
        lowerBound,
        upperBound
      });

      if (i <= 7) {
        next7DaysTotal += forecast;
      }
      next30DaysTotal += forecast;
    }

    // Determine trend
    const recentAvg = sma7.slice(-7).reduce((sum, v) => sum + v, 0) / 7;
    const olderAvg = sma7.slice(-14, -7).reduce((sum, v) => sum + v, 0) / 7;
    const trendChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (trendChange > 5) {
      trend = 'increasing';
    } else if (trendChange < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Calculate forecast accuracy (MAPE - Mean Absolute Percentage Error)
    const mape = dailySalesArray.reduce((sum, d, i) => {
      if (i < 7 || d.revenue === 0) return sum;
      const error = Math.abs((d.revenue - sma7[i]) / d.revenue);
      return sum + error;
    }, 0) / Math.max(1, dailySalesArray.length - 7);

    const accuracy = Math.max(0, Math.min(100, (1 - mape) * 100));

    return {
      historicalData: dailySalesArray,
      forecastData: forecastData.slice(-37), // Last 7 days historical + 30 days forecast
      next7DaysForecast: next7DaysTotal,
      next30DaysForecast: next30DaysTotal,
      confidenceInterval: {
        lower: next30DaysTotal - 1.96 * stdDev * Math.sqrt(30),
        upper: next30DaysTotal + 1.96 * stdDev * Math.sqrt(30)
      },
      trend,
      trendChange,
      accuracy
    };
  }, [salesOrders]);

  const exportData = useMemo(() =>
    analytics.forecastData.map(item => ({
      'التاريخ': item.date,
      'المبيعات الفعلية': item.actual || 0,
      'التوقعات': item.forecast,
      'الحد الأدنى': item.lowerBound,
      'الحد الأعلى': item.upperBound
    })),
    [analytics.forecastData]
  );

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={3} />;
  }

  const getTrendBadge = () => {
    switch (analytics.trend) {
      case 'increasing':
        return <Badge className="bg-green-500">اتجاه صاعد</Badge>;
      case 'decreasing':
        return <Badge className="bg-red-500">اتجاه هابط</Badge>;
      default:
        return <Badge variant="secondary">اتجاه مستقر</Badge>;
    }
  };

  const getTrendIcon = () => {
    switch (analytics.trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              توقعات المبيعات
            </CardTitle>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="sales_forecast"
                title="توقعات المبيعات"
                variant="ghost"
                size="sm"
              />
              {getTrendBadge()}
            </div>
          </div>
        </CardHeader>
        <CardContent ref={chartRef} className="space-y-6">
          {/* Forecast Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                {getTrendIcon()}
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.next7DaysForecast)}
              </div>
              <div className="text-xs text-gray-600 mt-1">توقعات 7 أيام</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(analytics.next7DaysForecast / 7)} متوسط/يوم
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.next30DaysForecast)}
              </div>
              <div className="text-xs text-gray-600 mt-1">توقعات 30 يوم</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatCurrency(analytics.next30DaysForecast / 30)} متوسط/يوم
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.accuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">دقة التوقع</div>
              <div className="text-xs text-gray-500 mt-1">
                {analytics.trendChange >= 0 ? '+' : ''}{analytics.trendChange.toFixed(1)}% تغير
              </div>
            </div>
          </div>

          {/* Forecast Chart */}
          {analytics.forecastData.length > 0 ? (
            <div>
              <h3 className="text-sm font-semibold mb-3">توقعات المبيعات (30 يوم قادم)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.forecastData}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    stroke="#888"
                    interval="preserveStartEnd"
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
                    formatter={(value: number, name: string) => {
                      const label = name === 'actual' ? 'فعلي'
                        : name === 'forecast' ? 'توقع'
                        : name === 'upperBound' ? 'حد أعلى'
                        : 'حد أدنى';
                      return [formatCurrency(value), label];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="lowerBound"
                    stackId="1"
                    stroke="none"
                    fill="url(#colorConfidence)"
                    fillOpacity={0.3}
                    name="نطاق الثقة"
                  />
                  <Area
                    type="monotone"
                    dataKey="upperBound"
                    stackId="2"
                    stroke="none"
                    fill="url(#colorConfidence)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="#3b82f6"
                    fill="url(#colorActual)"
                    strokeWidth={2}
                    name="المبيعات الفعلية"
                  />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stroke="#f97316"
                    fill="url(#colorForecast)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="التوقعات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyStateCompact
              type="no-data"
              title="لا توجد بيانات كافية"
              description="لا توجد بيانات كافية لإنشاء التوقعات"
            />
          )}

          {/* Confidence Interval */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-blue-900">
                  نطاق الثقة (95%)
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  المبيعات المتوقعة لـ 30 يوم قادم تتراوح بين{' '}
                  <span className="font-semibold">
                    {formatCurrency(Math.max(0, analytics.confidenceInterval.lower))}
                  </span>
                  {' '}و{' '}
                  <span className="font-semibold">
                    {formatCurrency(analytics.confidenceInterval.upper)}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-2">
                  التوقعات مبنية على تحليل {analytics.historicalData.length} يوم من البيانات التاريخية
                  مع مراعاة أنماط أيام الأسبوع والاتجاهات الموسمية.
                </div>
              </div>
            </div>
          </div>

          {/* Trend Impact */}
          {analytics.trend !== 'stable' && (
            <div className={`${
              analytics.trend === 'increasing'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            } border rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                {getTrendIcon()}
                <div className="flex-1">
                  <div className={`font-semibold ${
                    analytics.trend === 'increasing' ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {analytics.trend === 'increasing' ? 'اتجاه إيجابي' : 'اتجاه سلبي'}
                  </div>
                  <div className={`text-sm mt-1 ${
                    analytics.trend === 'increasing' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    المبيعات {analytics.trend === 'increasing' ? 'في ازدياد' : 'في تناقص'} بمعدل{' '}
                    {Math.abs(analytics.trendChange).toFixed(1)}% مقارنة بالأسبوع السابق.
                    {analytics.trend === 'increasing'
                      ? ' استمر في الاستراتيجيات الحالية.'
                      : ' قد تحتاج إلى مراجعة استراتيجيات التسويق والمبيعات.'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
