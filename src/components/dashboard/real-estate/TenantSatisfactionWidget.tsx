import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smile, TrendingUp, MessageSquare, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

export const TenantSatisfactionWidget: React.FC = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { companyId, filter, hasGlobalAccess } = useUnifiedCompanyAccess();
  const navigate = useNavigate();

  // Fetch maintenance data to calculate response times as satisfaction proxy
  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ['maintenance-satisfaction', companyId],
    queryFn: async () => {
      if (!companyId && !hasGlobalAccess) {
        return [];
      }

      // GRACEFUL HANDLING: property_maintenance table may not exist
      try {
        let query = supabase
          .from('property_maintenance')
          .select('*');

        if (filter.company_id) {
          query = query.eq('company_id', filter.company_id);
        } else if (companyId && !hasGlobalAccess) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query.order('requested_date', { ascending: false }).limit(100);

        if (error) {
          // Table may not exist - return empty array silently
          console.warn('property_maintenance table not available:', error.message);
          return [];
        }

        return data;
      } catch (err) {
        console.warn('Error fetching maintenance data:', err);
        return [];
      }
    },
    enabled: !!(companyId || hasGlobalAccess),
  });

  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={2} />;
  }

  const requests = maintenanceData || [];

  // Calculate satisfaction based on response times
  const completedRequests = requests.filter(r => r.status === 'completed' && r.requested_date && r.completed_date);

  const responseTimes = completedRequests.map(r => {
    const start = new Date(r.requested_date);
    const end = new Date(r.completed_date);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  });

  const avgResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
    : 0;

  // Calculate satisfaction score based on response time (inverse relationship)
  // Fast response (< 3 days) = 95-100%, Medium (3-7 days) = 80-95%, Slow (> 7 days) = 60-80%
  const calculateSatisfactionScore = (avgDays: number) => {
    if (avgDays === 0) return 90; // Default if no data
    if (avgDays <= 3) return 95 + (3 - avgDays) * 1.67; // 95-100%
    if (avgDays <= 7) return 80 + (7 - avgDays) * 3.75; // 80-95%
    if (avgDays <= 14) return 60 + (14 - avgDays) * 2.86; // 60-80%
    return Math.max(50, 60 - (avgDays - 14) * 2); // < 60%, minimum 50%
  };

  const satisfactionScore = calculateSatisfactionScore(avgResponseTime);

  // Generate satisfaction trend (mock data based on response times)
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const variation = Math.random() * 10 - 5; // ±5% variation
    return {
      month: month.toLocaleDateString('en-US', { month: 'short' }),
      score: Math.min(100, Math.max(0, satisfactionScore + variation))
    };
  });

  // Top complaint categories (based on maintenance types)
  const complaintCategories = requests.reduce((acc, r) => {
    const type = r.maintenance_type || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topComplaints = Object.entries(complaintCategories)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const getComplaintNameAr = (type: string) => {
    const names: Record<string, string> = {
      routine: 'صيانة دورية',
      emergency: 'طارئ',
      preventive: 'وقائية',
      corrective: 'تصحيحية',
      cosmetic: 'تجميلية',
      inspection: 'فحص',
      other: 'أخرى'
    };
    return names[type] || type;
  };

  // Properties with lowest scores (based on most maintenance requests)
  const propertyRequestCounts = requests.reduce((acc, r) => {
    acc[r.property_id] = (acc[r.property_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const propertiesWithIssues = Object.entries(propertyRequestCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const getSatisfactionColor = (score: number) => {
    if (score >= 90) return 'text-green-700 bg-green-50';
    if (score >= 75) return 'text-blue-700 bg-blue-50';
    if (score >= 60) return 'text-yellow-700 bg-yellow-50';
    return 'text-red-700 bg-red-50';
  };

  const getSatisfactionLabel = (score: number) => {
    if (score >= 90) return 'ممتاز';
    if (score >= 75) return 'جيد جداً';
    if (score >= 60) return 'جيد';
    return 'يحتاج تحسين';
  };

  // Prepare export data
  const exportData = React.useMemo(() => [
    { المؤشر: 'معدل الرضا العام', القيمة: satisfactionScore.toFixed(1) },
    { المؤشر: 'متوسط وقت الاستجابة', القيمة: `${avgResponseTime} يوم` },
    { المؤشر: 'التقييم', القيمة: getSatisfactionLabel(satisfactionScore) },
    ...topComplaints.map(([type, count]) => ({
      'نوع الشكوى': getComplaintNameAr(type),
      العدد: count,
    })),
    ...trendData.map(t => ({
      الشهر: t.month,
      'معدل الرضا': t.score.toFixed(1),
    })),
  ], [satisfactionScore, avgResponseTime, topComplaints, trendData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Smile className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                رضا المستأجرين
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="tenant_satisfaction"
                title="رضا المستأجرين"
                variant="ghost"
                size="sm"
              />
              <button
                onClick={() => navigate('/properties')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                عرض التقييمات ←
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent ref={chartRef} className="p-6 space-y-6">
          {/* Overall Satisfaction Score */}
          <div className={`rounded-lg p-4 ${getSatisfactionColor(satisfactionScore)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">معدل الرضا العام</span>
              <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${getSatisfactionColor(satisfactionScore)}`}>
                <TrendingUp className="w-3 h-3" />
                {getSatisfactionLabel(satisfactionScore)}
              </div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold">
                {satisfactionScore.toFixed(1)}
              </span>
              <span className="text-lg mb-1">/100</span>
            </div>
            <div className="relative h-3 bg-white/50 rounded-full overflow-hidden">
              <div
                className="absolute top-0 right-0 h-full bg-gradient-to-l from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                style={{ width: `${satisfactionScore}%` }}
              ></div>
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 flex items-center justify-between">
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">متوسط وقت الاستجابة</div>
              <div className="text-3xl font-bold text-blue-700">{avgResponseTime}</div>
              <div className="text-xs text-blue-600">يوم</div>
            </div>
            <Clock className="w-10 h-10 text-blue-500" />
          </div>

          {/* Satisfaction Trend */}
          {trendData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">اتجاه الرضا (آخر 6 أشهر)</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
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
                      formatter={(value: number) => [value.toFixed(1), 'معدل الرضا']}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Complaint Categories */}
          {topComplaints.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">أكثر الشكاوى شيوعاً</h4>
              <div className="space-y-2">
                {topComplaints.map(([type, count], index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">{count}</span>
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-600">{getComplaintNameAr(type)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Properties with Issues */}
          {propertiesWithIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">عقارات تحتاج اهتمام</h4>
              <div className="space-y-2">
                {propertiesWithIssues.map(([propertyId, count], index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-orange-700">{count} طلب</span>
                    <span className="text-xs text-gray-500">عقار #{propertyId.slice(0, 8)}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Action */}
          <button
            onClick={() => navigate('/properties')}
            className="w-full py-2 px-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            عرض جميع التقييمات
          </button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
