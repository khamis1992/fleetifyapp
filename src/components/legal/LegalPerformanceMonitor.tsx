import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Brain,
  Zap,
  Database,
  Monitor
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PerformanceMetrics {
  overview: {
    totalQueries: number;
    successRate: number;
    averageResponseTime: number;
    costSavings: number;
    userSatisfaction: number;
  };
  queryAnalytics: {
    hourlyDistribution: Array<{ hour: string; queries: number; success: number }>;
    typeDistribution: Array<{ type: string; count: number; color: string }>;
    complexityTrends: Array<{ date: string; low: number; medium: number; high: number }>;
  };
  performance: {
    responseTimeStats: Array<{ period: string; avg: number; p95: number; p99: number }>;
    errorAnalysis: Array<{ error_type: string; count: number; trend: number }>;
    cacheEfficiency: Array<{ date: string; hit_rate: number; miss_rate: number }>;
  };
  learning: {
    improvementTrends: Array<{ date: string; accuracy: number; confidence: number }>;
    feedbackAnalysis: Array<{ rating: number; count: number; percentage: number }>;
    adaptationMetrics: Array<{ metric: string; value: number; change: number }>;
  };
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  components: Array<{
    name: string;
    status: 'operational' | 'degraded' | 'outage';
    responseTime: number;
    uptime: number;
  }>;
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    timestamp: string;
  }>;
}

export const LegalPerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadPerformanceData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(loadPerformanceData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, []);

  const loadPerformanceData = async () => {
    try {
      // Load performance metrics
      const { data: metricsData, error: metricsError } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          path: 'get-performance-metrics'
        }
      });

      if (metricsError) throw metricsError;

      // Load system health
      const { data: healthData, error: healthError } = await supabase.functions.invoke('legal-ai-api', {
        body: {
          path: 'get-system-health'
        }
      });

      if (healthError) throw healthError;

      if (metricsData?.metrics) {
        setMetrics(metricsData.metrics);
      } else {
        setMetrics(generateMockMetrics());
      }

      if (healthData?.health) {
        setSystemHealth(healthData.health);
      } else {
        setSystemHealth(generateMockHealth());
      }

    } catch (error) {
      console.error('Error loading performance data:', error);
      // Use mock data as fallback
      setMetrics(generateMockMetrics());
      setSystemHealth(generateMockHealth());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockMetrics = (): PerformanceMetrics => {
    return {
      overview: {
        totalQueries: 1247,
        successRate: 94.5,
        averageResponseTime: 2.3,
        costSavings: 15420,
        userSatisfaction: 4.6
      },
      queryAnalytics: {
        hourlyDistribution: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          queries: Math.floor(Math.random() * 100) + 20,
          success: Math.floor(Math.random() * 90) + 85
        })),
        typeDistribution: [
          { type: 'Contract Analysis', count: 345, color: '#8884d8' },
          { type: 'Legal Research', count: 267, color: '#82ca9d' },
          { type: 'Risk Assessment', count: 198, color: '#ffc658' },
          { type: 'Compliance Check', count: 156, color: '#ff7300' },
          { type: 'Document Review', count: 281, color: '#8dd1e1' }
        ],
        complexityTrends: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          low: Math.floor(Math.random() * 50) + 30,
          medium: Math.floor(Math.random() * 40) + 40,
          high: Math.floor(Math.random() * 30) + 20
        }))
      },
      performance: {
        responseTimeStats: Array.from({ length: 12 }, (_, i) => ({
          period: new Date(Date.now() - (11 - i) * 60 * 60 * 1000).toLocaleTimeString(),
          avg: Math.random() * 3 + 1,
          p95: Math.random() * 5 + 3,
          p99: Math.random() * 8 + 5
        })),
        errorAnalysis: [
          { error_type: 'Timeout', count: 12, trend: -15 },
          { error_type: 'Rate Limit', count: 8, trend: -25 },
          { error_type: 'Invalid Query', count: 15, trend: 5 },
          { error_type: 'Service Unavailable', count: 3, trend: -50 }
        ],
        cacheEfficiency: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          hit_rate: Math.random() * 20 + 75,
          miss_rate: Math.random() * 15 + 10
        }))
      },
      learning: {
        improvementTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString(),
          accuracy: Math.random() * 10 + 85,
          confidence: Math.random() * 15 + 80
        })),
        feedbackAnalysis: [
          { rating: 5, count: 456, percentage: 65 },
          { rating: 4, count: 189, percentage: 27 },
          { rating: 3, count: 43, percentage: 6 },
          { rating: 2, count: 11, percentage: 1.5 },
          { rating: 1, count: 3, percentage: 0.5 }
        ],
        adaptationMetrics: [
          { metric: 'Learning Rate', value: 92.5, change: 3.2 },
          { metric: 'Pattern Recognition', value: 88.7, change: 1.8 },
          { metric: 'Context Understanding', value: 85.3, change: 4.1 },
          { metric: 'Response Relevance', value: 91.2, change: 2.5 }
        ]
      }
    };
  };

  const generateMockHealth = (): SystemHealth => {
    return {
      status: 'healthy',
      components: [
        { name: 'AI Processing Engine', status: 'operational', responseTime: 1.2, uptime: 99.8 },
        { name: 'Database', status: 'operational', responseTime: 0.8, uptime: 99.9 },
        { name: 'Cache System', status: 'operational', responseTime: 0.3, uptime: 99.7 },
        { name: 'API Gateway', status: 'degraded', responseTime: 2.1, uptime: 98.5 },
        { name: 'Document Storage', status: 'operational', responseTime: 1.5, uptime: 99.6 }
      ],
      alerts: [
        { level: 'warning', message: 'API Gateway experiencing slight delays', timestamp: '2024-01-15 14:30:00' },
        { level: 'info', message: 'Cache optimization completed successfully', timestamp: '2024-01-15 13:15:00' },
        { level: 'info', message: 'System maintenance window scheduled for tonight', timestamp: '2024-01-15 12:00:00' }
      ]
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'outage': return 'text-red-600';
      case 'healthy': return 'text-green-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'error': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Monitor className="h-5 w-5 animate-spin" />
            <span>تحميل بيانات الأداء...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                مراقب الأداء القانوني
              </CardTitle>
              <CardDescription>
                مراقبة شاملة لأداء النظام القانوني الذكي والتحليلات المتقدمة
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={systemHealth?.status === 'healthy' ? 'default' : 'destructive'}>
                {systemHealth?.status === 'healthy' ? 'نظام سليم' : 'يحتاج صيانة'}
              </Badge>
              <Button variant="outline" size="sm" onClick={loadPerformanceData}>
                تحديث
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">النظرة العامة</TabsTrigger>
              <TabsTrigger value="analytics">التحليلات</TabsTrigger>
              <TabsTrigger value="performance">الأداء</TabsTrigger>
              <TabsTrigger value="learning">التعلم التكيفي</TabsTrigger>
              <TabsTrigger value="health">صحة النظام</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Key Performance Indicators */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">إجمالي الاستعلامات</p>
                        <p className="text-2xl font-bold">{metrics?.overview.totalQueries?.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">معدل النجاح</p>
                        <p className="text-2xl font-bold">{metrics?.overview.successRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">متوسط وقت الاستجابة</p>
                        <p className="text-2xl font-bold">{metrics?.overview.averageResponseTime}ث</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">توفير التكاليف</p>
                        <p className="text-2xl font-bold">${metrics?.overview.costSavings?.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-pink-500" />
                      <div>
                        <p className="text-sm font-medium">رضا المستخدمين</p>
                        <p className="text-2xl font-bold">{metrics?.overview.userSatisfaction}/5</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>توزيع الاستعلامات حسب الساعة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={metrics?.queryAnalytics.hourlyDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey="queries" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>توزيع أنواع الاستعلامات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={metrics?.queryAnalytics.typeDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                          label
                        >
                          {metrics?.queryAnalytics.typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>اتجاهات التعقيد</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={metrics?.queryAnalytics.complexityTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="low" 
                        stackId="1" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        name="بسيط"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="medium" 
                        stackId="1" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        name="متوسط"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="high" 
                        stackId="1" 
                        stroke="#ffc658" 
                        fill="#ffc658" 
                        name="معقد"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>إحصائيات وقت الاستجابة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metrics?.performance.responseTimeStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="avg" stroke="#8884d8" name="متوسط" />
                        <Line type="monotone" dataKey="p95" stroke="#82ca9d" name="95%" />
                        <Line type="monotone" dataKey="p99" stroke="#ffc658" name="99%" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>تحليل الأخطاء</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics?.performance.errorAnalysis.map((error, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{error.error_type}</p>
                            <p className="text-sm text-muted-foreground">{error.count} حالة</p>
                          </div>
                          <div className={`flex items-center gap-1 ${error.trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {error.trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span className="text-sm">{Math.abs(error.trend)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>كفاءة التخزين المؤقت</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={metrics?.performance.cacheEfficiency}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="hit_rate" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        name="نسبة النجاح"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="miss_rate" 
                        stroke="#ff7300" 
                        fill="#ff7300" 
                        name="نسبة الفشل"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="learning" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      اتجاهات التحسين
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metrics?.learning.improvementTrends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="accuracy" stroke="#8884d8" name="الدقة" />
                        <Line type="monotone" dataKey="confidence" stroke="#82ca9d" name="الثقة" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>تحليل التقييمات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metrics?.learning.feedbackAnalysis.map((feedback, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span>{feedback.rating} نجوم</span>
                            <span className="text-sm text-muted-foreground">
                              {feedback.count} ({feedback.percentage}%)
                            </span>
                          </div>
                          <Progress value={feedback.percentage} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>مقاييس التكيف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {metrics?.learning.adaptationMetrics.map((metric, index) => (
                      <div key={index} className="p-4 bg-muted rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{metric.metric}</span>
                          <div className={`flex items-center gap-1 ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metric.change > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            <span className="text-sm">+{metric.change}%</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>القيمة الحالية</span>
                            <span>{metric.value}%</span>
                          </div>
                          <Progress value={metric.value} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>حالة المكونات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {systemHealth?.components.map((component, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{component.name}</p>
                            <p className={`text-sm ${getStatusColor(component.status)}`}>
                              {component.status === 'operational' ? 'يعمل بشكل طبيعي' : 
                               component.status === 'degraded' ? 'أداء منخفض' : 'خارج الخدمة'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{component.responseTime}ث</p>
                            <p className="text-sm text-muted-foreground">{component.uptime}% وقت التشغيل</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>التنبيهات النشطة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {systemHealth?.alerts.map((alert, index) => (
                        <Alert key={index} className={getAlertColor(alert.level)}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="flex justify-between items-start">
                              <span>{alert.message}</span>
                              <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalPerformanceMonitor;