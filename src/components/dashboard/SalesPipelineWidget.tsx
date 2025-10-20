import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSalesPipelineMetrics, useSalesOpportunities } from '@/hooks/useSalesOpportunities';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WidgetSkeleton } from '@/components/ui/skeletons';
import { EmptyStateCompact } from '@/components/ui/EmptyState';
import { DrillDownModal, DrillDownLevel } from '@/components/drilldown';
import { EnhancedTooltip, kpiDefinitions } from '@/components/ui/EnhancedTooltip';

export const SalesPipelineWidget: React.FC = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const { data: metrics, isLoading: metricsLoading } = useSalesPipelineMetrics();
  const { data: opportunities, isLoading: opportunitiesLoading } = useSalesOpportunities({ is_active: true });
  const [drillDownOpen, setDrillDownOpen] = React.useState(false);
  const [drillDownLevel, setDrillDownLevel] = React.useState(0);

  const isLoading = metricsLoading || opportunitiesLoading;

  // Calculate stats
  const totalValue = opportunities?.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0) || 0;
  const activeCount = opportunities?.length || 0;

  // Group opportunities by stage for chart
  const stageGroups = opportunities?.reduce((acc, opp) => {
    const stage = opp.stage || 'غير محدد';
    if (!acc[stage]) {
      acc[stage] = { stage, count: 0, value: 0 };
    }
    acc[stage].count += 1;
    acc[stage].value += opp.estimated_value || 0;
    return acc;
  }, {} as Record<string, { stage: string; count: number; value: number }>);

  const chartData = Object.values(stageGroups || {});

  // Stage colors
  const stageColors: Record<string, string> = {
    'عميل محتمل': '#3b82f6',
    'تواصل أولي': '#8b5cf6',
    'تقييم الحاجة': '#ec4899',
    'عرض سعر': '#f59e0b',
    'تفاوض': '#10b981',
    'إغلاق': '#06b6d4',
    'فاز': '#22c55e',
    'خسر': '#ef4444',
  };

  // Drill-down levels
  const drillDownLevels: DrillDownLevel[] = [
    {
      title: 'مراحل مسار المبيعات',
      subtitle: 'انقر على أي مرحلة لعرض الفرص',
      data: chartData.map((item) => ({
        label: item.stage,
        value: `${item.count} فرصة`,
        badge: formatCurrency(item.value),
        color: stageColors[item.stage],
      })),
    },
  ];

  // Loading state with skeleton
  if (isLoading) {
    return <WidgetSkeleton hasChart hasStats statCount={2} />;
  }

  // Handle chart bar click for drill-down
  const handleChartClick = () => {
    setDrillDownOpen(true);
    setDrillDownLevel(0);
  };

  return (
    <>
      <DrillDownModal
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        title="مسار المبيعات - تفاصيل المراحل"
        levels={drillDownLevels}
        currentLevel={drillDownLevel}
        onLevelChange={setDrillDownLevel}
        navigateTo="/sales/pipeline"
      />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">مسار المبيعات</h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              نشط
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <EnhancedTooltip
                kpi={kpiDefinitions.averageRevenue}
                side="top"
              >
                <p className="text-xs text-muted-foreground">إجمالي القيمة</p>
              </EnhancedTooltip>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">الفرص النشطة</p>
              <p className="text-2xl font-bold text-foreground">{activeCount}</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">الفرص حسب المرحلة</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleChartClick}
                  className="h-6 text-xs hover:text-primary"
                >
                  عرض التفاصيل
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={chartData} onClick={handleChartClick} className="cursor-pointer">
                  <XAxis
                    dataKey="stage"
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'count') return [value, 'عدد الفرص'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={stageColors[entry.stage] || '#6366f1'}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Empty State */}
          {chartData.length === 0 && (
            <EmptyStateCompact
              type="no-sales"
              title="لا توجد فرص نشطة"
              description="ابدأ بإضافة فرص مبيعات جديدة لتتبع مسار المبيعات"
              onAction={() => navigate('/sales/opportunities')}
              actionLabel="إضافة فرصة"
            />
          )}
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/sales/pipeline')}
            className="w-full h-9 hover:bg-primary/10 hover:text-primary"
          >
            عرض المسار
            <ArrowRight size={14} className="mr-2" />
          </Button>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/50 to-primary/20 w-full" />
      </Card>
    </motion.div>
    </>
  );
};
