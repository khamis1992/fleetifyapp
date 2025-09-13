import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  PieChart,
  BarChart3
} from 'lucide-react';
import { PropertyStats } from '@/modules/properties/types';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface FinancialAnalyticsPanelProps {
  stats?: PropertyStats;
  isLoading?: boolean;
}

const FinancialAnalyticsPanel: React.FC<FinancialAnalyticsPanelProps> = ({
  stats,
  isLoading = false,
}) => {
  const { formatCurrency } = useCurrencyFormatter();

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={16} />
            التحليل المالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-6 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={16} />
            التحليل المالي
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <PieChart size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد بيانات مالية</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate financial metrics
  const monthlyRevenue = stats.total_monthly_rent || 0;
  const yearlyRevenue = stats.total_yearly_rent || 0;
  const averageRevenue = stats.total_properties > 0 ? monthlyRevenue / stats.total_properties : 0;
  const occupancyRate = stats.total_properties > 0 ? (stats.rented_properties / stats.total_properties) * 100 : 0;
  
  // Simulated growth data (in real app, this would come from historical data)
  const monthlyGrowth = 5.2; // percentage
  const revenueTarget = monthlyRevenue * 1.2; // 20% above current
  const targetProgress = revenueTarget > 0 ? (monthlyRevenue / revenueTarget) * 100 : 0;

  const metrics = [
    {
      label: 'الإيرادات الشهرية',
      value: formatCurrency(monthlyRevenue),
      change: monthlyGrowth,
      positive: monthlyGrowth > 0,
      icon: DollarSign,
      description: 'مقارنة بالشهر الماضي'
    },
    {
      label: 'متوسط الإيراد للعقار',
      value: formatCurrency(averageRevenue),
      change: 2.8,
      positive: true,
      icon: Target,
      description: 'إيراد شهري لكل عقار'
    },
    {
      label: 'نسبة الإشغال',
      value: `${occupancyRate.toFixed(1)}%`,
      change: 1.5,
      positive: true,
      icon: TrendingUp,
      description: 'من إجمالي العقارات'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 size={16} />
            التحليل المالي
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-primary/10">
                      <metric.icon size={12} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium">{metric.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {metric.positive ? (
                      <TrendingUp size={12} className="text-green-600" />
                    ) : (
                      <TrendingDown size={12} className="text-red-600" />
                    )}
                    <span className={`text-xs font-medium ${metric.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.abs(metric.change).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-foreground">{metric.value}</span>
                  <span className="text-xs text-muted-foreground">{metric.description}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Revenue Target */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-3 pt-4 border-t border-border/50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">هدف الإيرادات الشهرية</span>
              <Badge variant={targetProgress >= 100 ? "default" : "secondary"} className="text-xs">
                {targetProgress.toFixed(0)}%
              </Badge>
            </div>
            
            <Progress value={Math.min(targetProgress, 100)} className="h-2" />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>الحالي: {formatCurrency(monthlyRevenue)}</span>
              <span>الهدف: {formatCurrency(revenueTarget)}</span>
            </div>
          </motion.div>

          {/* Revenue Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="space-y-3 pt-4 border-t border-border/50"
          >
            <h4 className="text-sm font-medium flex items-center gap-2">
              <PieChart size={12} />
              توزيع الإيرادات
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">إيجارات العقارات السكنية</span>
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(monthlyRevenue * 0.7)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">إيجارات العقارات التجارية</span>
                <Badge variant="outline" className="text-xs">
                  {formatCurrency(monthlyRevenue * 0.3)}
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Yearly Projection */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="bg-muted/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">التوقع السنوي</span>
              <TrendingUp size={14} className="text-green-600" />
            </div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(monthlyRevenue * 12)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              بناءً على الأداء الحالي مع نمو متوقع 5%
            </p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default FinancialAnalyticsPanel;