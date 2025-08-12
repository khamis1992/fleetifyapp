import React from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { useEnhancedFinancialOverview } from "@/hooks/useEnhancedFinancialOverview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FinancialAlertsSystem } from "./FinancialAlertsSystem";
import { AdvancedFinancialDashboard } from "./AdvancedFinancialDashboard";
import { AdvancedFinancialReports } from "./AdvancedFinancialReports";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap
} from "lucide-react";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}

const MetricCard = ({ title, value, change, description, icon, trend = 'neutral' }: MetricCardProps) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{Math.abs(change)}%</span>
            <span className="text-muted-foreground">
              {trend === 'up' ? 'increase' : trend === 'down' ? 'decrease' : 'change'}
            </span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export const UnifiedFinancialDashboard = () => {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;
  
  console.log('[UnifiedFinancialDashboard] Rendering with user:', user?.id, 'companyId:', companyId);
  
  const { data: overview, isLoading, error } = useEnhancedFinancialOverview(companyId);
  
  React.useEffect(() => {
    if (error) {
      console.error('[UnifiedFinancialDashboard] Error loading financial data:', error);
    }
    if (overview) {
      console.log('[UnifiedFinancialDashboard] Financial data loaded successfully:', overview);
    }
  }, [overview, error]);

  const { formatCurrency: fmt } = useCurrencyFormatter();
  const formatCurrency = (amount: number) => fmt(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    console.error('[UnifiedFinancialDashboard] Error state:', error);
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium text-destructive mb-2">خطأ في تحميل البيانات المالية</h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'حدث خطأ غير متوقع'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-primary hover:underline"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">لا توجد بيانات مالية</h3>
          <p className="text-muted-foreground mb-4">
            لم يتم العثور على بيانات مالية لشركتك. قد تحتاج إلى إضافة بعض المعاملات المالية أولاً.
          </p>
          <p className="text-sm text-muted-foreground">
            Company ID: {companyId || 'غير محدد'}
          </p>
        </div>
      </div>
    );
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(overview.totalRevenue)}
          description="Last 6 months"
          icon={<DollarSign className="h-4 w-4 text-success" />}
          trend="up"
        />
        <MetricCard
          title="Net Income"
          value={formatCurrency(overview.netIncome)}
          description={`${formatPercentage(overview.profitMargin)} margin`}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          trend={overview.netIncome > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Cash Flow"
          value={formatCurrency(overview.cashFlow.net_cash_flow)}
          description="Net cash position"
          icon={<Activity className="h-4 w-4 text-info" />}
          trend={overview.cashFlow.net_cash_flow > 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Financial Health"
          value={formatPercentage(overview.healthScore.overall_score)}
          description={getHealthScoreLabel(overview.healthScore.overall_score)}
          icon={<Zap className={`h-4 w-4 ${getHealthScoreColor(overview.healthScore.overall_score)}`} />}
        />
      </div>

      {/* Financial Health Score Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Financial Health Breakdown
          </CardTitle>
          <CardDescription>
            Detailed analysis of your company's financial performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Profitability</span>
                <span className={getHealthScoreColor(overview.healthScore.profitability_score)}>
                  {formatPercentage(overview.healthScore.profitability_score)}
                </span>
              </div>
              <Progress 
                value={overview.healthScore.profitability_score} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Liquidity</span>
                <span className={getHealthScoreColor(overview.healthScore.liquidity_score)}>
                  {formatPercentage(overview.healthScore.liquidity_score)}
                </span>
              </div>
              <Progress 
                value={overview.healthScore.liquidity_score} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Efficiency</span>
                <span className={getHealthScoreColor(overview.healthScore.efficiency_score)}>
                  {formatPercentage(overview.healthScore.efficiency_score)}
                </span>
              </div>
              <Progress 
                value={overview.healthScore.efficiency_score} 
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Solvency</span>
                <span className={getHealthScoreColor(overview.healthScore.solvency_score)}>
                  {formatPercentage(overview.healthScore.solvency_score)}
                </span>
              </div>
              <Progress 
                value={overview.healthScore.solvency_score} 
                className="h-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <FinancialAlertsSystem />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedFinancialDashboard />
        </TabsContent>

        <TabsContent value="reports">
          <AdvancedFinancialReports />
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Financial Insights</CardTitle>
              <CardDescription>
                AI-powered recommendations and insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Advanced insights coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};