import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';
import { FinancialOverview } from '@/hooks/useFinancialOverview';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

interface FinancialOverviewCardProps {
  data: FinancialOverview;
  loading?: boolean;
}

export const FinancialOverviewCard: React.FC<FinancialOverviewCardProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card className="border-0 shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            النظرة المالية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="h-4 bg-muted rounded w-20"></div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { formatCurrency: fmt } = useCurrencyFormatter();
  const formatCurrency = (amount: number) => fmt(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatPercentage = (percentage: number) => `${percentage.toFixed(1)}%`;

  const profitTrendIcon = data.profitMargin >= 0 ? TrendingUp : TrendingDown;
  const profitTrendColor = data.profitMargin >= 0 ? 'text-success' : 'text-destructive';

  return (
    <Card className="glass-card shadow-card card-hover animate-fade-in">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-success/10 rounded-lg">
            <DollarSign className="h-5 w-5 text-success" />
          </div>
          النظرة المالية
        </CardTitle>
        <CardDescription className="text-base">ملخص الأداء المالي</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Financial Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 p-3 bg-success/5 rounded-lg border border-success/10">
            <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
            <StatCardNumber value={formatCurrency(data.totalRevenue)} className="text-lg text-success animate-scale-in" />
          </div>
          <div className="space-y-2 p-3 bg-destructive/5 rounded-lg border border-destructive/10">
            <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
            <StatCardNumber value={formatCurrency(data.totalExpenses)} className="text-lg text-destructive animate-scale-in" />
          </div>
        </div>

        {/* Net Income & Profit Margin */}
        <div className="p-3 bg-background-soft rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">صافي الربح</span>
            <div className="flex items-center gap-1">
              {React.createElement(profitTrendIcon, { 
                className: `h-4 w-4 ${profitTrendColor}` 
              })}
              <span className={`text-sm font-semibold ${profitTrendColor}`}>
                <StatCardNumber value={formatCurrency(data.netIncome)} className="inline" />
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">هامش الربح</span>
            <Badge 
              variant={data.profitMargin >= 10 ? "default" : data.profitMargin >= 0 ? "secondary" : "destructive"}
              className="text-xs"
            >
              {formatPercentage(data.profitMargin)}
            </Badge>
          </div>
        </div>

        {/* Cash Flow */}
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm">التدفق النقدي</span>
          <span className={`text-sm font-semibold ${
            data.cashFlow >= 0 ? 'text-success' : 'text-destructive'
          }`}>
            {formatCurrency(data.cashFlow)}
          </span>
        </div>

        {/* Revenue Forecast */}
        {data.projectedMonthlyRevenue > 0 && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">التوقعات المالية</span>
            </div>
            <div className="text-xs text-muted-foreground">
              الإيراد المتوقع الشهري: <span className="font-semibold text-primary">
                {formatCurrency(data.projectedMonthlyRevenue)}
              </span>
            </div>
          </div>
        )}

        {/* Top Expense Categories */}
        {data.topExpenseCategories.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">أكبر فئات المصروفات</h4>
            {data.topExpenseCategories.slice(0, 3).map((category, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{category.category}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(category.amount)}</span>
                  <Badge variant="outline" className="text-xs">
                    {formatPercentage(category.percentage)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};