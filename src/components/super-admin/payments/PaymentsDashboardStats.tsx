import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useSubscriptionsAnalytics } from '@/hooks/useSubscriptionsAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

export const PaymentsDashboardStats: React.FC = () => {
  const { data: analytics, isLoading } = useSubscriptionsAnalytics();
  const { formatCurrency } = useCurrencyFormatter();

  const stats = [
    {
      title: 'إجمالي الإيرادات الشهرية',
      value: analytics?.monthlyRevenue || 0,
      icon: DollarSign,
      format: (value: number) => formatCurrency(value),
      trend: analytics?.revenueGrowth || 0,
      trendLabel: 'مقارنة بالشهر السابق'
    },
    {
      title: 'عدد الاشتراكات النشطة',
      value: analytics?.activeSubscriptions || 0,
      icon: Users,
      format: (value: number) => value.toLocaleString(),
      trend: analytics?.subscriptionGrowth || 0,
      trendLabel: 'اشتراكات جديدة هذا الشهر'
    },
    {
      title: 'متوسط قيمة الاشتراك',
      value: analytics?.averageSubscriptionValue || 0,
      icon: CreditCard,
      format: (value: number) => formatCurrency(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      trend: analytics?.avgValueGrowth || 0,
      trendLabel: 'تغيير في المتوسط'
    },
    {
      title: 'معدل التجديد',
      value: analytics?.renewalRate || 0,
      icon: TrendingUp,
      format: (value: number) => `${value.toFixed(1)}%`,
      trend: analytics?.renewalRateChange || 0,
      trendLabel: 'مقارنة بالفترة السابقة'
    }
  ];

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUpRight className="h-3 w-3 text-green-600" />;
    if (trend < 0) return <ArrowDownRight className="h-3 w-3 text-red-600" />;
    return null;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-2">
                <StatCardNumber value={stat.format(stat.value)} className="inline" />
              </div>
              <div className="flex items-center text-xs">
                {getTrendIcon(stat.trend)}
                <span className={`ml-1 ${getTrendColor(stat.trend)}`}>
                  {stat.trend > 0 ? '+' : ''}{stat.trend.toFixed(1)}%
                </span>
                <span className="text-muted-foreground ml-2">
                  {stat.trendLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};