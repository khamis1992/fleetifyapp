import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Target, FileText, Eye, CreditCard } from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { StatCardNumber } from '@/components/ui/NumberDisplay';

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

const SmartMetricsPanel: React.FC<SmartMetricsPanelProps> = React.memo(({
  financialData,
  loading = false
}) => {
  // Call hooks at the top level - BEFORE any conditionals
  const { formatCurrency } = useCurrencyFormatter();
  const navigate = useNavigate();
  
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
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-6 bg-muted rounded animate-pulse w-1/2" />
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
      value: formatCurrency(financialData.monthlyRevenue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      change: financialData.monthlyGrowth || 0,
      positive: (financialData.monthlyGrowth || 0) > 0,
      actionLabel: 'عرض التقرير المالي',
      actionIcon: FileText,
      actionRoute: '/finance/reports'
    },
    {
      label: 'الأرباح الصافية',
      value: formatCurrency(financialData.totalProfit || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      change: financialData.profitMargin || 0,
      positive: (financialData.profitMargin || 0) > 0,
      suffix: '%',
      actionLabel: 'التحليل المالي',
      actionIcon: TrendingUp,
      actionRoute: '/finance/overview'
    },
    {
      label: 'العقود النشطة',
      value: (financialData.activeContracts || 0).toString(),
      change: null,
      positive: true,
      actionLabel: 'عرض جميع العقود',
      actionIcon: Eye,
      actionRoute: '/contracts'
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
              <StatCardNumber value={metric.value} className="text-xl text-foreground" />
              {metric.actionLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-7 mt-1 hover:bg-primary/10"
                  onClick={() => navigate(metric.actionRoute)}
                >
                  <metric.actionIcon className="h-3 w-3 ml-1.5" />
                  {metric.actionLabel}
                </Button>
              )}
            </motion.div>
          ))}

          {/* Payment status */}
          <div className="pt-4 border-t border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground">حالة المدفوعات</h4>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => navigate('/finance/payments')}
              >
                <CreditCard className="h-3 w-3 ml-1" />
                عرض الكل
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">المدفوعات المعلقة</span>
              <Badge variant="secondary" className="text-xs">
                {financialData.pendingPayments || 0}
              </Badge>
            </div>
            {(financialData.overduePayments || 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">المدفوعات المتأخرة</span>
                <Badge variant="destructive" className="text-xs cursor-pointer hover:opacity-80" onClick={() => navigate('/finance/payments?filter=overdue')}>
                  {financialData.overduePayments || 0}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SmartMetricsPanel.displayName = 'SmartMetricsPanel';

export default SmartMetricsPanel;