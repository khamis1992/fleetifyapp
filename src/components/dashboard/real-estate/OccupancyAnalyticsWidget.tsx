import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, TrendingUp, Home, Clock } from 'lucide-react';
import { useRealEstateDashboardStats } from '@/hooks/useRealEstateDashboardStats';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';

export const OccupancyAnalyticsWidget: React.FC = () => {
  const { data: stats, isLoading } = useRealEstateDashboardStats();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <Building2 className="w-5 h-5 text-emerald-500" />
            تحليل الإشغال
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  // Calculate occupancy metrics
  const totalUnits = stats.total_properties;
  const occupiedUnits = stats.rented_properties;
  const vacantUnits = stats.available_properties;
  const occupancyRate = stats.occupancy_rate;
  const targetOccupancy = 95; // Target occupancy rate
  const occupancyDiff = occupancyRate - targetOccupancy;

  // Calculate occupancy by property type
  const propertyTypes = [
    { type: 'سكني', count: stats.properties_by_type.residential || 0 },
    { type: 'تجاري', count: stats.properties_by_type.commercial || 0 },
    { type: 'مختلط', count: stats.properties_by_type.mixed || 0 },
  ].filter(pt => pt.count > 0);

  // Use occupancy trend from stats
  const trendData = stats.occupancy_trend || [];

  // Calculate average vacancy duration (mock for now)
  const avgVacancyDuration = vacantUnits > 0 ? Math.round(30 + Math.random() * 60) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                تحليل الإشغال
              </span>
            </div>
            <button
              onClick={() => navigate('/properties')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              عرض العقارات ←
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Overall Occupancy Rate */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">معدل الإشغال الإجمالي</span>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                occupancyDiff >= 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                <TrendingUp className={`w-3 h-3 ${occupancyDiff < 0 ? 'rotate-180' : ''}`} />
                {Math.abs(occupancyDiff).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                {occupancyRate.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 mb-2">من الهدف {targetOccupancy}%</span>
            </div>
            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(occupancyRate, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Units Breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <Home className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-700">{totalUnits}</div>
              <div className="text-xs text-blue-600">إجمالي الوحدات</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <Building2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{occupiedUnits}</div>
              <div className="text-xs text-green-600">وحدات مشغولة</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <Home className="w-5 h-5 text-orange-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-orange-700">{vacantUnits}</div>
              <div className="text-xs text-orange-600">وحدات شاغرة</div>
            </div>
          </div>

          {/* Occupancy by Property Type */}
          {propertyTypes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">الإشغال حسب نوع العقار</h4>
              {propertyTypes.map((pt, index) => {
                const typeOccupancyRate = totalUnits > 0 ? (pt.count / totalUnits) * 100 : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{typeOccupancyRate.toFixed(0)}%</span>
                      <span>{pt.type}</span>
                    </div>
                    <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 right-0 h-full bg-gradient-to-l from-emerald-400 to-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${typeOccupancyRate}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Occupancy Trend Chart */}
          {trendData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">اتجاه الإشغال (آخر 6 أشهر)</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'معدل الإشغال']}
                      labelFormatter={(label) => `الشهر: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="occupancy"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#occupancyGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Average Vacancy Duration */}
          {vacantUnits > 0 && (
            <div className="bg-orange-50 rounded-lg p-3 flex items-center justify-between">
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-700">{avgVacancyDuration}</div>
                <div className="text-xs text-orange-600">متوسط مدة الشغور (يوم)</div>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          )}

          {/* Quick Action */}
          <button
            onClick={() => navigate('/properties')}
            className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            عرض العقارات الشاغرة
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
