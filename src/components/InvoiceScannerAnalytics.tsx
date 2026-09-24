/**
 * Advanced Analytics Dashboard for Invoice Scanner
 * Implements Phase 2C Enterprise Features - Analytics Dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFleetifyTranslation } from "@/hooks/useTranslation";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  FileText,
  Zap,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react';

interface AnalyticsData {
  processingMetrics: {
    totalScans: number;
    avgProcessingTime: number;
    successRate: number;
    avgAccuracy: number;
  };
  userProductivity: {
    timeSaved: number;
    errorReduction: number;
    automationRate: number;
  };
  financialImpact: {
    costSavings: number;
    roi: number;
    efficiencyGain: number;
  };
  qualityTrends: {
    accuracyImprovement: number;
    confidenceScore: number;
    failureRate: number;
  };
}

const InvoiceScannerAnalytics: React.FC = () => {
  const { t } = useFleetifyTranslation("ui");
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    processingMetrics: {
      totalScans: 1247,
      avgProcessingTime: 4.2,
      successRate: 94.3,
      avgAccuracy: 91.8
    },
    userProductivity: {
      timeSaved: 387, // hours
      errorReduction: 89.5, // percentage
      automationRate: 78.2 // percentage
    },
    financialImpact: {
      costSavings: 28450, // currency
      roi: 340, // percentage
      efficiencyGain: 67.8 // percentage
    },
    qualityTrends: {
      accuracyImprovement: 23.5,
      confidenceScore: 88.7,
      failureRate: 5.7
    }
  });

  const [dailyStats, setDailyStats] = useState([
    { date: '2024-10-05', scans: 45, accuracy: 89.2, avgTime: 4.8 },
    { date: '2024-10-06', scans: 52, accuracy: 91.1, avgTime: 4.5 },
    { date: '2024-10-07', scans: 38, accuracy: 93.4, avgTime: 4.1 },
    { date: '2024-10-08', scans: 67, accuracy: 92.8, avgTime: 3.9 },
    { date: '2024-10-09', scans: 71, accuracy: 94.2, avgTime: 3.7 },
    { date: '2024-10-10', scans: 59, accuracy: 95.1, avgTime: 3.5 },
    { date: '2024-10-11', scans: 48, accuracy: 96.3, avgTime: 3.2 }
  ]);

  useEffect(() => {
    // Simulate loading analytics data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [timeRange]);

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const exportReport = () => {
    const reportData = {
      timeRange,
      analytics,
      dailyStats,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-scanner-analytics-${timeRange}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getMetricColor = (value: number, type: 'percentage' | 'time' | 'count') => {
    if (type === 'percentage') {
      if (value >= 90) return 'text-emerald-600';
      if (value >= 75) return 'text-amber-600';
      return 'text-red-600';
    }
    if (type === 'time') {
      if (value <= 3) return 'text-emerald-600';
      if (value <= 5) return 'text-amber-600';
      return 'text-red-600';
    }
    return 'text-[var(--finance-accent)]';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-[var(--finance-accent)]" />
              <span className="ml-2 text-lg">{t("loadingAnalyticsData")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{t("invoiceScannerAnalytics")}</h2>
          <p className="mt-0.5 text-sm text-[var(--finance-muted)]">{t("comprehensivePerformanceMetricsAnd")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">آخر 24 ساعة</SelectItem>
              <SelectItem value="7d">آخر 7 أيام</SelectItem>
              <SelectItem value="30d">آخر 30 يوماً</SelectItem>
              <SelectItem value="90d">آخر 90 يوماً</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData} disabled={isLoading} className="gap-2">
            <RefreshCw className="h-4 w-4" />{t("refresh")}
          </Button>
          <Button onClick={exportReport} className="gap-2">
            <Download className="h-4 w-4" />{t("exportReport")}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--finance-muted)]">{t("totalScans")}</p>
                <p className="text-3xl font-bold tabular-nums text-[var(--finance-accent)]">{analytics.processingMetrics.totalScans.toLocaleString()}</p>
                <p className="text-xs text-[var(--finance-muted)]">+12.5% مقارنة بالفترة السابقة</p>
              </div>
              <FileText className="h-12 w-12 text-[var(--finance-accent)] opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--finance-muted)]">{t("avgProcessingTime")}</p>
                <p className={`text-3xl font-bold tabular-nums ${getMetricColor(analytics.processingMetrics.avgProcessingTime, 'time')}`}>
                  {analytics.processingMetrics.avgProcessingTime}s
                </p>
                <p className="text-xs text-[var(--finance-muted)]">تحسن 0.8- ثانية</p>
              </div>
              <Clock className="h-12 w-12 text-emerald-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--finance-muted)]">{t("successRate")}</p>
                <p className={`text-3xl font-bold tabular-nums ${getMetricColor(analytics.processingMetrics.successRate, 'percentage')}`}>
                  {analytics.processingMetrics.successRate}%
                </p>
                <p className="text-xs text-[var(--finance-muted)]">تحسن +2.3%</p>
              </div>
              <CheckCircle className="h-12 w-12 text-emerald-500 opacity-70" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--finance-muted)]">{t("avgAccuracy")}</p>
                <p className={`text-3xl font-bold tabular-nums ${getMetricColor(analytics.processingMetrics.avgAccuracy, 'percentage')}`}>
                  {analytics.processingMetrics.avgAccuracy}%
                </p>
                <p className="text-xs text-[var(--finance-muted)]">+5.2% مقارنة بالأساس</p>
              </div>
              <Target className="h-12 w-12 text-[var(--finance-accent)] opacity-70" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">{t("performanceMetrics")}</TabsTrigger>
          <TabsTrigger value="productivity">{t("userProductivity")}</TabsTrigger>
          <TabsTrigger value="financial">{t("financialImpact")}</TabsTrigger>
          <TabsTrigger value="trends">{t("qualityTrends")}</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />{t("dailyProcessingVolume")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyStats.map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <p className="text-sm text-[var(--finance-muted)]">{day.scans} فاتورة معالجة</p>
                      </div>
                      <div className="text-left">
                        <p className={`font-medium ${getMetricColor(day.accuracy, 'percentage')}`}>
                          {day.accuracy}%
                        </p>
                        <p className="text-sm text-[var(--finance-muted)]">متوسط {day.avgTime}s</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("processingEfficiency")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>{t("ocrAccuracy")}</span>
                    <span className="font-medium">{analytics.processingMetrics.avgAccuracy}%</span>
                  </div>
                  <Progress value={analytics.processingMetrics.avgAccuracy} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span>{t("successRate")}</span>
                    <span className="font-medium">{analytics.processingMetrics.successRate}%</span>
                  </div>
                  <Progress value={analytics.processingMetrics.successRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>{t("speedPerformance")}</span>
                    <span className="font-medium">{100 - (analytics.processingMetrics.avgProcessingTime * 10)}%</span>
                  </div>
                  <Progress value={100 - (analytics.processingMetrics.avgProcessingTime * 10)} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />{t("timeSavings")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{analytics.userProductivity.timeSaved}</p>
                  <p className="text-lg font-medium">{t("hoursSaved")}</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Equivalent to {Math.round(analytics.userProductivity.timeSaved / 8)} working days
                  </p>
                  <Badge className="mt-3 bg-blue-100 text-blue-800">
                    +23% vs last month
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />{t("errorReduction")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-orange-600">{analytics.userProductivity.errorReduction}%</p>
                  <p className="text-lg font-medium">{t("fewerErrors")}</p>
                  <p className="text-sm text-slate-500 mt-2">{t("manualEntryErrorRate")}</p>
                  <Badge className="mt-3 bg-orange-100 text-orange-800">{t("excellentImprovement")}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-500" />{t("automationRate")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">{analytics.userProductivity.automationRate}%</p>
                  <p className="text-lg font-medium">{t("autoprocessed")}</p>
                  <p className="text-sm text-slate-500 mt-2">{t("invoicesProcessedWithoutManual")}</p>
                  <Badge className="mt-3 bg-purple-100 text-purple-800">
                    Target: 85%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />{t("costSavingsAnalysis")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-green-600">
                    ${analytics.financialImpact.costSavings.toLocaleString()}
                  </p>
                  <p className="text-xl font-medium">{t("totalSavings")}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Labor Cost Reduction:</span>
                    <span className="font-medium">$18,230</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Error Prevention Savings:</span>
                    <span className="font-medium">$7,180</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efficiency Improvements:</span>
                    <span className="font-medium">$3,040</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />{t("roiEfficiency")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>{t("returnOnInvestment")}</span>
                    <span className="font-bold text-2xl text-green-600">{analytics.financialImpact.roi}%</span>
                  </div>
                  <Progress value={Math.min(analytics.financialImpact.roi, 100)} className="h-3" />
                  <p className="text-sm text-slate-500 mt-1">Investment recovered in 2.8 months</p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>{t("efficiencyGain")}</span>
                    <span className="font-bold text-2xl text-blue-600">{analytics.financialImpact.efficiencyGain}%</span>
                  </div>
                  <Progress value={analytics.financialImpact.efficiencyGain} className="h-3" />
                  <p className="text-sm text-slate-500 mt-1">{t("fasterInvoiceProcessingWorkflow")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />{t("qualityAccuracyTrends")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">+{analytics.qualityTrends.accuracyImprovement}%</p>
                  <p className="font-medium">{t("accuracyImprovement")}</p>
                  <p className="text-sm text-slate-500">{t("sinceSystemDeployment")}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{analytics.qualityTrends.confidenceScore}%</p>
                  <p className="font-medium">{t("avgConfidenceScore")}</p>
                  <p className="text-sm text-slate-500">{t("qualityOfMatches")}</p>
                </div>
                
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{analytics.qualityTrends.failureRate}%</p>
                  <p className="font-medium">{t("failureRate")}</p>
                  <p className="text-sm text-slate-500">{t("processingFailures")}</p>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium mb-3">{t("keyInsightsRecommendations")}</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>System accuracy has improved by 23.5% through machine learning feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Processing time has decreased by 32% due to optimization improvements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    <span>{t("considerAddingMoreArabic")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                    <span>ROI target of 300% has been exceeded - system is highly profitable</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceScannerAnalytics;