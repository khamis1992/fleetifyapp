import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';

interface TrendData {
  period: string;
  total_revenue: number;
  total_collections: number;
  overdue_amount: number;
  collection_rate: number;
}

interface FinancialTrendsReportProps {
  trends: TrendData[];
  periodType: 'monthly' | 'quarterly' | 'yearly';
}

const formatCurrency = (amount: number) => `${amount.toFixed(2)} ر.ق`;

export const FinancialTrendsReport: React.FC<FinancialTrendsReportProps> = ({
  trends,
  periodType
}) => {
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, direction: 'neutral' as const };
    const percentage = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(percentage),
      direction: percentage > 0 ? 'up' as const : percentage < 0 ? 'down' as const : 'neutral' as const
    };
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (direction: 'up' | 'down' | 'neutral', isGoodTrend: boolean) => {
    if (direction === 'neutral') return 'text-gray-600';
    const isPositive = (direction === 'up' && isGoodTrend) || (direction === 'down' && !isGoodTrend);
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تحليل الاتجاهات المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trends.map((trend, index) => {
              const prevTrend = trends[index - 1];
              const collectionTrend = prevTrend ? calculateTrend(trend.total_collections, prevTrend.total_collections) : null;
              const revenueTrend = prevTrend ? calculateTrend(trend.total_revenue, prevTrend.total_revenue) : null;
              const overdueTrend = prevTrend ? calculateTrend(trend.overdue_amount, prevTrend.overdue_amount) : null;

              return (
                <Card key={trend.period} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{trend.period}</h3>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">الإيرادات</span>
                        {revenueTrend && (
                          <div className="flex items-center gap-1">
                            {getTrendIcon(revenueTrend.direction)}
                            <span className={`text-xs ${getTrendColor(revenueTrend.direction, true)}`}>
                              {revenueTrend.percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(trend.total_revenue)}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">التحصيلات</span>
                        {collectionTrend && (
                          <div className="flex items-center gap-1">
                            {getTrendIcon(collectionTrend.direction)}
                            <span className={`text-xs ${getTrendColor(collectionTrend.direction, true)}`}>
                              {collectionTrend.percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(trend.total_collections)}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">المتأخرات</span>
                        {overdueTrend && (
                          <div className="flex items-center gap-1">
                            {getTrendIcon(overdueTrend.direction)}
                            <span className={`text-xs ${getTrendColor(overdueTrend.direction, false)}`}>
                              {overdueTrend.percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(trend.overdue_amount)}</p>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">معدل التحصيل</span>
                        <Badge variant={trend.collection_rate > 85 ? 'default' : trend.collection_rate > 70 ? 'secondary' : 'destructive'}>
                          {trend.collection_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};