import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, DollarSign, Users, CreditCard } from 'lucide-react';
import { useSubscriptionsAnalytics } from '@/hooks/useSubscriptionsAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

export const RevenueAnalyticsChart: React.FC = () => {
  const { data: analytics, isLoading } = useSubscriptionsAnalytics();
  const [chartType, setChartType] = useState<'revenue' | 'subscriptions'>('revenue');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = analytics?.monthlyTrend || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-md p-3">
          <p className="text-sm font-medium">{`الشهر: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'revenue' ? 'الإيرادات' : 'الاشتراكات'}: {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              تحليل الإيرادات والاشتراكات
            </CardTitle>
            <CardDescription>
              تتبع نمو الإيرادات والاشتراكات عبر الوقت
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={chartType} onValueChange={(value: 'revenue' | 'subscriptions') => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">الإيرادات</SelectItem>
                <SelectItem value="subscriptions">الاشتراكات</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={period} onValueChange={(value: 'month' | 'quarter' | 'year') => setPeriod(value)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">شهري</SelectItem>
                <SelectItem value="quarter">ربعي</SelectItem>
                <SelectItem value="year">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">إجمالي الإيرادات</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics?.monthlyRevenue || 0)}
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">الاشتراكات النشطة</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {analytics?.activeSubscriptions || 0}
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">متوسط القيمة</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(analytics?.averageSubscriptionValue || 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'revenue' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="subscriptions" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Revenue by Plan Chart */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-lg font-medium mb-4">الإيرادات حسب نوع الخطة</h4>
          <div className="grid grid-cols-3 gap-4">
            {analytics?.revenueByPlan.map((plan, index) => (
              <div key={plan.plan} className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-sm font-medium text-muted-foreground">
                  {plan.plan === 'basic' ? 'أساسي' : 
                   plan.plan === 'premium' ? 'مميز' : 'مؤسسي'}
                </div>
                <div className="text-xl font-bold mt-1">
                  {formatCurrency(plan.revenue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {plan.count} اشتراك
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};