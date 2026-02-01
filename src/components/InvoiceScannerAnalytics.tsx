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
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [analytics] = useState<AnalyticsData>({
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

  const [dailyStats] = useState([
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
      if (value >= 90) return 'text-green-600';
      if (value >= 75) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'time') {
      if (value <= 3) return 'text-green-600';
      if (value <= 5) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-blue-600';
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-lg">Loading analytics data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Scanner Analytics</h1>
          <p className="text-slate-600">Comprehensive performance metrics and insights</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Scans</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.processingMetrics.totalScans.toLocaleString()}</p>
                <p className="text-xs text-slate-500">+12.5% vs last period</p>
              </div>
              <FileText className="h-12 w-12 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Processing Time</p>
                <p className={`text-3xl font-bold ${getMetricColor(analytics.processingMetrics.avgProcessingTime, 'time')}`}>
                  {analytics.processingMetrics.avgProcessingTime}s
                </p>
                <p className="text-xs text-slate-500">-0.8s improvement</p>
              </div>
              <Clock className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Success Rate</p>
                <p className={`text-3xl font-bold ${getMetricColor(analytics.processingMetrics.successRate, 'percentage')}`}>
                  {analytics.processingMetrics.successRate}%
                </p>
                <p className="text-xs text-slate-500">+2.3% improvement</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Avg Accuracy</p>
                <p className={`text-3xl font-bold ${getMetricColor(analytics.processingMetrics.avgAccuracy, 'percentage')}`}>
                  {analytics.processingMetrics.avgAccuracy}%
                </p>
                <p className="text-xs text-slate-500">+5.2% vs baseline</p>
              </div>
              <Target className="h-12 w-12 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="productivity">User Productivity</TabsTrigger>
          <TabsTrigger value="financial">Financial Impact</TabsTrigger>
          <TabsTrigger value="trends">Quality Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Processing Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyStats.map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <p className="text-sm text-slate-500">{day.scans} scans processed</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${getMetricColor(day.accuracy, 'percentage')}`}>
                          {day.accuracy}%
                        </p>
                        <p className="text-sm text-slate-500">{day.avgTime}s avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Processing Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>OCR Accuracy</span>
                    <span className="font-medium">{analytics.processingMetrics.avgAccuracy}%</span>
                  </div>
                  <Progress value={analytics.processingMetrics.avgAccuracy} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Success Rate</span>
                    <span className="font-medium">{analytics.processingMetrics.successRate}%</span>
                  </div>
                  <Progress value={analytics.processingMetrics.successRate} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Speed Performance</span>
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
                  <Clock className="h-5 w-5 text-blue-500" />
                  Time Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{analytics.userProductivity.timeSaved}</p>
                  <p className="text-lg font-medium">Hours Saved</p>
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
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Error Reduction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-orange-600">{analytics.userProductivity.errorReduction}%</p>
                  <p className="text-lg font-medium">Fewer Errors</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Manual entry error rate dropped significantly
                  </p>
                  <Badge className="mt-3 bg-orange-100 text-orange-800">
                    Excellent improvement
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-500" />
                  Automation Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">{analytics.userProductivity.automationRate}%</p>
                  <p className="text-lg font-medium">Auto-Processed</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Invoices processed without manual intervention
                  </p>
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
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Cost Savings Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <p className="text-5xl font-bold text-green-600">
                    ${analytics.financialImpact.costSavings.toLocaleString()}
                  </p>
                  <p className="text-xl font-medium">Total Savings</p>
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
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  ROI & Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span>Return on Investment</span>
                    <span className="font-bold text-2xl text-green-600">{analytics.financialImpact.roi}%</span>
                  </div>
                  <Progress value={Math.min(analytics.financialImpact.roi, 100)} className="h-3" />
                  <p className="text-sm text-slate-500 mt-1">Investment recovered in 2.8 months</p>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span>Efficiency Gain</span>
                    <span className="font-bold text-2xl text-blue-600">{analytics.financialImpact.efficiencyGain}%</span>
                  </div>
                  <Progress value={analytics.financialImpact.efficiencyGain} className="h-3" />
                  <p className="text-sm text-slate-500 mt-1">Faster invoice processing workflow</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Quality & Accuracy Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">+{analytics.qualityTrends.accuracyImprovement}%</p>
                  <p className="font-medium">Accuracy Improvement</p>
                  <p className="text-sm text-slate-500 mt-2">Since system deployment</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{analytics.qualityTrends.confidenceScore}%</p>
                  <p className="font-medium">Confidence Score</p>
                  <p className="text-sm text-slate-500 mt-2">Average OCR confidence</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{analytics.qualityTrends.failureRate}%</p>
                  <p className="font-medium">Failure Rate</p>
                  <p className="text-sm text-slate-500 mt-2">Down from 12.3%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceScannerAnalytics;
