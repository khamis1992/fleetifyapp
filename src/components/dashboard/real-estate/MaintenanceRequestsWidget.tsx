import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { ExportButton } from '@/components/exports';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

interface MaintenanceRequest {
  id: string;
  title: string;
  maintenance_type: string;
  priority: string;
  status: string;
  estimated_cost: number;
  actual_cost: number;
  requested_date: string;
  completed_date: string;
  property_id: string;
}

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const STATUS_COLORS = {
  pending: '#94a3b8',
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
  on_hold: '#64748b',
};

export const MaintenanceRequestsWidget: React.FC = () => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const { companyId, filter, hasGlobalAccess } = useUnifiedCompanyAccess();
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();

  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ['property-maintenance', companyId],
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

        const { data, error } = await query.order('requested_date', { ascending: false });

        if (error) {
          // Table may not exist - return empty array silently
          console.warn('property_maintenance table not available:', error.message);
          return [];
        }

        return data as MaintenanceRequest[];
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

  // Calculate metrics
  const openRequests = requests.filter(r => ['pending', 'scheduled', 'in_progress'].includes(r.status)).length;
  const completedRequests = requests.filter(r => r.status === 'completed').length;
  const totalRequests = requests.length;

  // Calculate average resolution time (in days)
  const completedWithDates = requests.filter(r =>
    r.status === 'completed' && r.requested_date && r.completed_date
  );

  const avgResolutionTime = completedWithDates.length > 0
    ? Math.round(
        completedWithDates.reduce((sum, r) => {
          const start = new Date(r.requested_date);
          const end = new Date(r.completed_date);
          const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / completedWithDates.length
      )
    : 0;

  // Requests by priority
  const priorityData = [
    { name: 'عاجل', value: requests.filter(r => r.priority === 'urgent').length, color: PRIORITY_COLORS.urgent },
    { name: 'عالي', value: requests.filter(r => r.priority === 'high').length, color: PRIORITY_COLORS.high },
    { name: 'متوسط', value: requests.filter(r => r.priority === 'medium').length, color: PRIORITY_COLORS.medium },
    { name: 'منخفض', value: requests.filter(r => r.priority === 'low').length, color: PRIORITY_COLORS.low },
  ].filter(d => d.value > 0);

  // Requests by status
  const statusData = [
    { name: 'جديد', value: requests.filter(r => r.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: 'مجدول', value: requests.filter(r => r.status === 'scheduled').length, color: STATUS_COLORS.scheduled },
    { name: 'قيد التنفيذ', value: requests.filter(r => r.status === 'in_progress').length, color: STATUS_COLORS.in_progress },
    { name: 'مكتمل', value: requests.filter(r => r.status === 'completed').length, color: STATUS_COLORS.completed },
  ].filter(d => d.value > 0);

  // Calculate total maintenance cost this month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthlyMaintenanceCost = requests
    .filter(r => {
      if (r.status !== 'completed' || !r.actual_cost) return false;
      const completedDate = new Date(r.completed_date);
      return completedDate.getMonth() === currentMonth && completedDate.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + (r.actual_cost || 0), 0);

  // Top properties with most requests (mock for now)
  const propertyRequestCounts = requests.reduce((acc, r) => {
    acc[r.property_id] = (acc[r.property_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topProperties = Object.entries(propertyRequestCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  // Prepare export data
  const exportData = React.useMemo(() => [
    { المؤشر: 'طلبات مفتوحة', القيمة: openRequests },
    { المؤشر: 'طلبات مكتملة', القيمة: completedRequests },
    { المؤشر: 'إجمالي الطلبات', القيمة: totalRequests },
    { المؤشر: 'متوسط وقت الإصلاح', القيمة: `${avgResolutionTime} يوم` },
    { المؤشر: 'تكلفة الصيانة الشهرية', القيمة: formatCurrency(monthlyMaintenanceCost) },
    ...priorityData.map(p => ({ الأولوية: p.name, العدد: p.value })),
    ...statusData.map(s => ({ الحالة: s.name, العدد: s.value })),
  ], [openRequests, completedRequests, totalRequests, avgResolutionTime, monthlyMaintenanceCost, priorityData, statusData, formatCurrency]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                طلبات الصيانة
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ExportButton
                chartRef={chartRef}
                data={exportData}
                filename="maintenance_requests"
                title="طلبات الصيانة"
                variant="ghost"
                size="sm"
              />
              <button
                onClick={() => navigate('/properties')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                عرض الكل ←
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent ref={chartRef} className="p-6 space-y-6">
          {/* Empty State */}
          {requests.length === 0 ? (
            <EmptyStateCompact
              type="no-data"
              title="لا توجد طلبات صيانة"
              description="ستظهر طلبات الصيانة هنا عند إضافتها"
            />
          ) : (
            <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">طلبات مفتوحة</span>
              </div>
              <div className="text-3xl font-bold text-blue-700">{openRequests}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600">مكتملة</span>
              </div>
              <div className="text-3xl font-bold text-green-700">{completedRequests}</div>
            </div>
          </div>

          {/* Average Resolution Time */}
          {avgResolutionTime > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 flex items-center justify-between">
              <div className="text-right">
                <div className="text-sm text-gray-600 mb-1">متوسط وقت الإصلاح</div>
                <div className="text-3xl font-bold text-purple-700">{avgResolutionTime}</div>
                <div className="text-xs text-purple-600">يوم</div>
              </div>
              <Clock className="w-10 h-10 text-purple-500" />
            </div>
          )}

          {/* Requests by Priority */}
          {priorityData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">حسب الأولوية</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Requests by Status */}
          {statusData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">حسب الحالة</h4>
              <div className="space-y-2">
                {statusData.map((status, index) => {
                  const percentage = totalRequests > 0 ? (status.value / totalRequests) * 100 : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{status.value}</span>
                        <span>{status.name}</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="absolute top-0 right-0 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: status.color
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Maintenance Cost */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1 text-right">تكلفة الصيانة هذا الشهر</div>
            <div className="text-2xl font-bold text-orange-700">
              {formatCurrency(monthlyMaintenanceCost)}
            </div>
          </div>

          {/* Top Properties with Most Requests */}
          {topProperties.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 text-right">العقارات الأكثر طلبات</h4>
              <div className="space-y-2">
                {topProperties.map(([propertyId, count], index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{count} طلب</span>
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
            عرض جميع الطلبات
          </button>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
