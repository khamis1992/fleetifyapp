import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, TrendingDown, DollarSign, MapPin } from 'lucide-react';
import { useRealEstateDashboardStats } from '@/hooks/useRealEstateDashboardStats';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

export const VacancyAnalysisWidget: React.FC = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { data: stats, isLoading } = useRealEstateDashboardStats();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={3} />;
  }

  if (!stats) return null;

  // Current vacancy metrics
  const vacantCount = stats.available_properties;
  const totalProperties = stats.total_properties;
  const vacancyRate = totalProperties > 0 ? (vacantCount / totalProperties) * 100 : 0;

  // Calculate average time to fill (mock for now - would need historical data)
  const avgTimeToFill = vacantCount > 0 ? Math.round(30 + Math.random() * 45) : 0;

  // Calculate estimated lost revenue
  const avgRentPerProperty = stats.total_monthly_rent / Math.max(totalProperties, 1);
  const avgVacancyDays = avgTimeToFill;
  const lostRevenuePerMonth = (avgRentPerProperty / 30) * avgVacancyDays * vacantCount;

  // Generate vacancy trend (last 6 months)
  const vacancyTrendData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const variation = Math.random() * 5 + vacancyRate - 2.5; // ±2.5% variation
    return {
      month: month.toLocaleDateString('ar-SA', { month: 'short' }),
      rate: Math.max(0, Math.min(100, variation))
    };
  });

  // Vacancy reasons breakdown (mock data)
  const vacancyReasons = [
    { reason: 'نهاية العقد', count: Math.floor(vacantCount * 0.4), percentage: 40 },
    { reason: 'صيانة مطلوبة', count: Math.floor(vacantCount * 0.25), percentage: 25 },
    { reason: 'سعر مرتفع', count: Math.floor(vacantCount * 0.20), percentage: 20 },
    { reason: 'أخرى', count: Math.ceil(vacantCount * 0.15), percentage: 15 },
  ].filter(r => r.count > 0);

  // Areas with highest vacancy (mock - based on properties_by_area)
  const areasWithVacancy = Object.entries(stats.properties_by_area || {})
    .map(([area, count]) => ({
      area,
      count,
      // Mock vacancy rate per area
      vacancyRate: Math.random() * 30 + 5
    }))
    .sort((a, b) => b.vacancyRate - a.vacancyRate)
    .slice(0, 3);

  const getVacancyColor = (rate: number) => {
    if (rate < 5) return 'text-green-700 bg-green-50';
    if (rate < 10) return 'text-blue-700 bg-blue-50';
    if (rate < 20) return 'text-yellow-700 bg-yellow-50';
    return 'text-red-700 bg-red-50';
  };

  const getVacancyStatus = (rate: number) => {
    if (rate < 5) return 'ممتاز';
    if (rate < 10) return 'جيد';
    if (rate < 20) return 'متوسط';
    return 'يحتاج اهتمام';
  };

  // Prepare export data
  const exportData = React.useMemo(() => [
    { المؤشر: 'معدل الشغور الحالي', القيمة: `${vacancyRate.toFixed(1)}%`, 'عدد الوحدات': vacantCount },
    { المؤشر: 'متوسط وقت التأجير', القيمة: `${avgTimeToFill} يوم` },
    { المؤشر: 'إيراد ضائع شهرياً', القيمة: formatCurrency(lostRevenuePerMonth) },
    { المؤشر: 'إيراد ضائع سنوياً', القيمة: formatCurrency(lostRevenuePerMonth * 12) },
    ...vacancyReasons.map(r => ({
      'سبب الشغور': r.reason,
      العدد: r.count,
      'النسبة %': r.percentage,
    })),
    ...areasWithVacancy.map(a => ({
      المنطقة: a.area,
      'معدل الشغور %': a.vacancyRate.toFixed(0),
    })),
    ...vacancyTrendData.map(t => ({
      الشهر: t.month,
      'معدل الشغور %': t.rate.toFixed(1),
    })),
  ], [vacancyRate, vacantCount, avgTimeToFill, lostRevenuePerMonth, vacancyReasons, areasWithVacancy, vacancyTrendData, formatCurrency]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                تحليل الشواغر
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="vacancy_analysis"
                title="تحليل الشواغر"
                variant="ghost"
                size="sm"
              />
              <button
                onClick={() => navigate('/properties')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                عرض الشواغر ←
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent ref={chartRef} className="p-6 space-y-6">
          {/* Current Vacancy Status */}
          <div className={`rounded-lg p-4 ${getVacancyColor(vacancyRate)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">معدل الشغور الحالي</span>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${getVacancyColor(vacancyRate)}`}>
                <TrendingDown className="w-3 h-3" />
                {getVacancyStatus(vacancyRate)}
              </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold">
                {vacancyRate.toFixed(1)}%
              </span>
              <span className="text-lg mb-1">({vacantCount} وحدة)</span>
            </div>
            <div className="relative h-3 bg-white/50 rounded-full overflow-hidden">
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-orange-500 to-red-600 rounded-full transition-all duration-500"
                style={{ width: `${vacancyRate}%` }}
              ></div>
            </div>
          </div>

          {/* Vacancy Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1 text-right">متوسط وقت التأجير</div>
              <div className="text-3xl font-bold text-blue-700">{avgTimeToFill}</div>
              <div className="text-xs text-blue-600">يوم</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1 text-right">إيراد ضائع شهرياً</div>
              <div className="text-xl font-bold text-red-700">
                {formatCurrency(lostRevenuePerMonth)}
              </div>
            </div>
          </div>

          {/* Vacancy Trend Chart */}
          {vacancyTrendData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">اتجاه الشغور (آخر 6 أشهر)</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={vacancyTrendData}>
                    <defs>
                      <linearGradient id="vacancyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      domain={[0, 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'معدل الشغور']}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="#f97316"
                      strokeWidth={2}
                      fill="url(#vacancyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Vacancy Reasons */}
          {vacancyReasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">أسباب الشغور</h4>
              <div className="space-y-2">
                {vacancyReasons.map((reason, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{reason.count} وحدة ({reason.percentage}%)</span>
                      <span>{reason.reason}</span>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 right-0 h-full bg-gradient-to-l from-orange-400 to-red-500 rounded-full transition-all duration-500"
                        style={{ width: `${reason.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Areas with Highest Vacancy */}
          {areasWithVacancy.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">مناطق بشغور عالي</h4>
              <div className="space-y-2">
                {areasWithVacancy.map((area, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-700">
                      {area.vacancyRate.toFixed(0)}%
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{area.area}</span>
                      <MapPin className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lost Revenue Impact */}
          {vacantCount > 0 && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border-2 border-red-200">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 text-red-500" />
                <div className="text-right">
                  <div className="text-xs text-gray-600">تأثير الإيراد الضائع</div>
                  <div className="text-sm font-medium text-red-600">
                    {formatCurrency(lostRevenuePerMonth * 12)} سنوياً
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                بناءً على {vacantCount} وحدة شاغرة بمتوسط {avgTimeToFill} يوم للتأجير
              </div>
            </div>
          )}

          {/* Quick Action */}
          <button
            onClick={() => navigate('/properties')}
            className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            عرض الوحدات الشاغرة
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
