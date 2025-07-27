import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useFinancialOverview } from "@/hooks/useFinancialOverview";
import { useAdvancedFinancialAnalytics } from "@/hooks/useAdvancedFinancialAnalytics";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface AdvancedFinancialDashboardProps {
  className?: string;
}

export function AdvancedFinancialDashboard({ className }: AdvancedFinancialDashboardProps) {
  const { data: financialOverview, isLoading: isOverviewLoading } = useFinancialOverview();
  const { data: analytics, isLoading: isAnalyticsLoading } = useAdvancedFinancialAnalytics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-KW', {
      style: 'currency',
      currency: 'KWD',
      minimumFractionDigits: 3
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (isOverviewLoading || isAnalyticsLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">المركز المالي المتقدم</h2>
          <p className="text-muted-foreground">نظرة شاملة على الأداء المالي والتحليلات المتقدمة</p>
        </div>
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 ml-2" />
          تحديث البيانات
        </Button>
      </div>

      {/* مؤشرات الأداء الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financialOverview?.totalRevenue || 0)}
            </div>
            <div className="flex items-center space-x-2">
              {analytics?.monthlyTrends && analytics.monthlyTrends.length >= 2 ? (
                analytics.monthlyTrends[analytics.monthlyTrends.length - 1].revenue > 
                analytics.monthlyTrends[analytics.monthlyTrends.length - 2].revenue ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                )
              ) : (
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              )}
              <p className="text-xs text-muted-foreground">
                من الشهر الماضي
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المصروفات</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financialOverview?.totalExpenses || 0)}
            </div>
            <div className="flex items-center space-x-2">
              <Progress 
                value={(financialOverview?.totalExpenses || 0) / (financialOverview?.totalRevenue || 1) * 100} 
                className="flex-1 h-2"
              />
              <span className="text-xs text-muted-foreground">
                {formatPercentage((financialOverview?.totalExpenses || 0) / (financialOverview?.totalRevenue || 1) * 100)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(financialOverview?.netIncome || 0)}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={financialOverview?.profitMargin && financialOverview.profitMargin > 10 ? "default" : "secondary"}>
                هامش الربح: {formatPercentage(financialOverview?.profitMargin || 0)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الصحة المالية</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.financialHealthScore?.score || 0}/100
            </div>
            <div className="flex items-center space-x-2">
              {analytics?.financialHealthScore?.score && analytics.financialHealthScore.score > 70 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <p className="text-xs text-muted-foreground">
                {analytics?.financialHealthScore?.score && analytics.financialHealthScore.score > 70 ? 'ممتاز' : 'يحتاج تحسين'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* التحليلات المتقدمة */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">اتجاهات الأداء</TabsTrigger>
          <TabsTrigger value="cost-centers">مراكز التكلفة</TabsTrigger>
          <TabsTrigger value="cash-flow">التدفق النقدي</TabsTrigger>
          <TabsTrigger value="revenue-analysis">تحليل الإيرادات</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الاتجاهات الشهرية</CardTitle>
              <CardDescription>تطور الإيرادات والمصروفات خلال الأشهر الستة الماضية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.monthlyTrends?.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{trend.month}</h4>
                      <p className="text-sm text-muted-foreground">
                        الربح: {formatCurrency(trend.profit)}
                      </p>
                    </div>
                    <div className="text-left">
                      <div className="text-sm">
                        إيرادات: {formatCurrency(trend.revenue)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        مصروفات: {formatCurrency(trend.expenses)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost-centers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أداء مراكز التكلفة</CardTitle>
              <CardDescription>تحليل الأداء المالي لكل مركز تكلفة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.costCenterPerformance?.map((center, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{center.centerName}</h4>
                      <Badge variant={center.variancePercentage > 0 ? "destructive" : "default"}>
                        {center.variancePercentage > 0 ? '+' : ''}{formatPercentage(center.variancePercentage)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">الميزانية:</span>
                        <div className="font-medium">{formatCurrency(center.budgetAmount)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الفعلي:</span>
                        <div className="font-medium">{formatCurrency(center.actualAmount)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">الانحراف:</span>
                        <div className={`font-medium ${center.variance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {formatCurrency(Math.abs(center.variance))}
                        </div>
                      </div>
                    </div>
                    <Progress 
                      value={(center.actualAmount / center.budgetAmount) * 100} 
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليل التدفق النقدي</CardTitle>
              <CardDescription>حركة النقد الداخل والخارج</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.cashFlowAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded-lg">
                    <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <div className="text-lg font-semibold text-green-500">
                      {formatCurrency(analytics.cashFlowAnalysis.totalInflow)}
                    </div>
                    <p className="text-sm text-muted-foreground">إجمالي التدفق الداخل</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <div className="text-lg font-semibold text-red-500">
                      {formatCurrency(analytics.cashFlowAnalysis.totalOutflow)}
                    </div>
                    <p className="text-sm text-muted-foreground">إجمالي التدفق الخارج</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <BarChart3 className="h-8 w-8 text-primary mx-auto mb-2" />
                    <div className="text-lg font-semibold">
                      {formatCurrency(analytics.cashFlowAnalysis.netCashFlow)}
                    </div>
                    <p className="text-sm text-muted-foreground">صافي التدفق النقدي</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>تحليل مصادر الإيرادات</CardTitle>
              <CardDescription>توزيع الإيرادات حسب المصدر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {financialOverview?.revenueBySource?.map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="font-medium">{source.source}</span>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{formatCurrency(source.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(source.percentage)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}