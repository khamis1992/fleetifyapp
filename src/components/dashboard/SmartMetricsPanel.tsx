import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';

interface FinancialOverview {
  totalRevenue: number;
  monthlyRevenue: number;
  totalProfit: number;
  profitMargin: number;
  monthlyGrowth: number;
  activeContracts: number;
  pendingPayments: number;
  overduePayments: number;
}

interface SmartMetricsPanelProps {
  financialData?: FinancialOverview;
  loading?: boolean;
}

const SmartMetricsPanel: React.FC<SmartMetricsPanelProps> = ({ 
  financialData, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target size={16} />
            نظرة مالية عامة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!financialData) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target size={16} />
            نظرة مالية عامة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign size={24} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد بيانات مالية</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: 'الإيرادات الشهرية',
      value: `${financialData.monthlyRevenue.toLocaleString()} د.ك`,
      change: financialData.monthlyGrowth,
      positive: financialData.monthlyGrowth > 0
    },
    {
      label: 'إجمالي الأرباح',
      value: `${financialData.totalProfit.toLocaleString()} د.ك`,
      change: financialData.profitMargin,
      positive: financialData.profitMargin > 0,
      suffix: '%'
    },
    {
      label: 'العقود النشطة',
      value: financialData.activeContracts.toString(),
      change: null,
      positive: true
    }
  ];

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target size={16} />
          نظرة مالية عامة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Main metrics */}
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">
                  {metric.label}
                </span>
                {metric.change !== null && (
                  <div className="flex items-center gap-1">
                    {metric.positive ? (
                      <TrendingUp size={12} className="text-success" />
                    ) : (
                      <TrendingDown size={12} className="text-destructive" />
                    )}
                    <span className={`text-xs font-medium ${metric.positive ? 'text-success' : 'text-destructive'}`}>
                      {Math.abs(metric.change).toFixed(1)}{metric.suffix || '%'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-foreground">{metric.value}</p>
            </motion.div>
          ))}

          {/* Payment status */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <h4 className="text-sm font-medium text-foreground">حالة المدفوعات</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">المدفوعات المعلقة</span>
              <Badge variant="secondary" className="text-xs">
                {financialData.pendingPayments}
              </Badge>
            </div>
            {financialData.overduePayments > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المدفوعات المتأخرة</span>
                <Badge variant="destructive" className="text-xs">
                  {financialData.overduePayments}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartMetricsPanel;