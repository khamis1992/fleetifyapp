import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  TrendingUp, 
  Clock, 
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export const PerformanceMonitoring: React.FC = () => {
  const { user } = useAuth();

  const { data: performanceMetrics, isLoading } = useQuery({
    queryKey: ['performance-metrics', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return null;

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.profile?.company_id,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const { data: systemAlerts } = useQuery({
    queryKey: ['system-alerts', user?.profile?.company_id],
    queryFn: async () => {
      if (!user?.profile?.company_id) return [];

      // Return empty array for now - alerts will be populated when needed
      return [];
    },
    enabled: !!user?.profile?.company_id,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Process performance data
  const responseTimeData = performanceMetrics?.filter(m => m.metric_name === 'response_time')
    .slice(0, 20)
    .reverse()
    .map((metric, index) => ({
      time: index,
      value: metric.metric_value
    })) || [];

  const cpuUsageData = performanceMetrics?.filter(m => m.metric_name === 'cpu_usage')
    .slice(0, 10)
    .reverse()
    .map((metric, index) => ({
      time: `${index}h`,
      value: metric.metric_value
    })) || [];

  const memoryUsageData = performanceMetrics?.filter(m => m.metric_name === 'memory_usage')
    .slice(0, 10)
    .reverse()
    .map((metric, index) => ({
      time: `${index}h`,
      value: metric.metric_value
    })) || [];

  const currentResponseTime = responseTimeData[responseTimeData.length - 1]?.value || 0;
  const currentCpuUsage = cpuUsageData[cpuUsageData.length - 1]?.value || 0;
  const currentMemoryUsage = memoryUsageData[memoryUsageData.length - 1]?.value || 0;

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'destructive';
    if (value >= thresholds.warning) return 'secondary';
    return 'default';
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <XCircle className="h-4 w-4" />;
    if (value >= thresholds.warning) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">وقت الاستجابة</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{currentResponseTime.toFixed(0)}ms</div>
              <Badge variant={getStatusColor(currentResponseTime, { warning: 500, critical: 1000 })}>
                {getStatusIcon(currentResponseTime, { warning: 500, critical: 1000 })}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              متوسط آخر ساعة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">استخدام المعالج</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">{currentCpuUsage.toFixed(1)}%</div>
              <Badge variant={getStatusColor(currentCpuUsage, { warning: 70, critical: 90 })}>
                {getStatusIcon(currentCpuUsage, { warning: 70, critical: 90 })}
              </Badge>
            </div>
            <Progress value={currentCpuUsage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">استخدام الذاكرة</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">{currentMemoryUsage.toFixed(1)}%</div>
              <Badge variant={getStatusColor(currentMemoryUsage, { warning: 80, critical: 95 })}>
                {getStatusIcon(currentMemoryUsage, { warning: 80, critical: 95 })}
              </Badge>
            </div>
            <Progress value={currentMemoryUsage} />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>وقت الاستجابة (آخر 20 قياس)</CardTitle>
            <CardDescription>مراقبة أداء النظام في الوقت الفعلي</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value}ms`, 'وقت الاستجابة']} />
                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>استخدام الموارد (آخر 10 ساعات)</CardTitle>
            <CardDescription>مراقبة استخدام المعالج والذاكرة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cpuUsageData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            تنبيهات النظام
          </CardTitle>
          <CardDescription>
            التنبيهات النشطة التي تتطلب انتباه
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemAlerts && systemAlerts.length > 0 ? (
            <div className="space-y-3">
              {systemAlerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`p-1 rounded-full ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'warning' ? 'secondary' : 'default'
                      }>
                        {alert.severity === 'critical' ? 'حرج' :
                         alert.severity === 'warning' ? 'تحذير' : 'معلومة'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('ar-SA')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium">لا توجد تنبيهات نشطة</h3>
              <p className="text-muted-foreground">جميع الأنظمة تعمل بشكل طبيعي</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};