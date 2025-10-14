import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getPerformanceMetrics, 
  getAverageMetrics, 
  clearPerformanceMetrics,
  exportPerformanceReport,
  getNavigationTiming,
  getResourceTiming,
  PerformanceMetric
} from '@/utils/performance/webVitals';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Download, 
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle,
  Server,
  Globe
} from 'lucide-react';

interface MetricCardProps {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; needsImprovement: number };
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ name, value, rating, threshold, unit = 'ms' }) => {
  const getRatingColor = () => {
    switch (rating) {
      case 'good':
        return 'text-success';
      case 'needs-improvement':
        return 'text-warning';
      case 'poor':
        return 'text-destructive';
    }
  };

  const getRatingBadge = () => {
    switch (rating) {
      case 'good':
        return <Badge className="bg-success">Good</Badge>;
      case 'needs-improvement':
        return <Badge className="bg-warning">Needs Improvement</Badge>;
      case 'poor':
        return <Badge className="bg-destructive">Poor</Badge>;
    }
  };

  const getIcon = () => {
    switch (rating) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'needs-improvement':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const percentage = Math.min((value / threshold.needsImprovement) * 100, 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        {getIcon()}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getRatingColor()}`}>
          {value.toFixed(0)}{unit}
        </div>
        <div className="flex items-center justify-between mt-2">
          {getRatingBadge()}
          <span className="text-xs text-muted-foreground">
            Target: &lt;{threshold.good}{unit}
          </span>
        </div>
        <Progress value={percentage} className="mt-2" />
      </CardContent>
    </Card>
  );
};

export const PerformanceMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [averages, setAverages] = useState<Record<string, { average: number; rating: string }>>({});
  const [navigationTiming, setNavigationTiming] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);

  const loadMetrics = () => {
    setMetrics(getPerformanceMetrics());
    setAverages(getAverageMetrics());
    setNavigationTiming(getNavigationTiming());
    setResources(getResourceTiming());
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleClearMetrics = () => {
    clearPerformanceMetrics();
    loadMetrics();
  };

  const handleExportReport = () => {
    const report = exportPerformanceReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const thresholds = {
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FID: { good: 100, needsImprovement: 300 },
    FCP: { good: 1800, needsImprovement: 3000 },
    LCP: { good: 2500, needsImprovement: 4000 },
    TTFB: { good: 800, needsImprovement: 1800 },
  };

  const getOverallScore = () => {
    const scores = Object.entries(averages).map(([name, data]) => {
      if (data.rating === 'good') return 100;
      if (data.rating === 'needs-improvement') return 50;
      return 0;
    });
    
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  const overallScore = getOverallScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time performance metrics and Core Web Vitals
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline" onClick={handleClearMetrics}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Metrics
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Score</CardTitle>
          <CardDescription>Based on Core Web Vitals averages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold">
              {overallScore}
            </div>
            <div className="flex-1">
              <Progress value={overallScore} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {overallScore >= 80 ? 'Excellent' : overallScore >= 50 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>
            <Zap className={`h-12 w-12 ${
              overallScore >= 80 ? 'text-success' : overallScore >= 50 ? 'text-warning' : 'text-destructive'
            }`} />
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <Tabs defaultValue="vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="navigation">Navigation Timing</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="history">Metrics History</TabsTrigger>
        </TabsList>

        <TabsContent value="vitals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(averages).map(([name, data]) => (
              <MetricCard
                key={name}
                name={name}
                value={data.average}
                rating={data.rating as any}
                threshold={thresholds[name as keyof typeof thresholds] || { good: 100, needsImprovement: 200 }}
                unit={name === 'CLS' ? '' : 'ms'}
              />
            ))}
          </div>

          {/* Metric Descriptions */}
          <Card>
            <CardHeader>
              <CardTitle>Metric Descriptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  LCP - Largest Contentful Paint
                </h4>
                <p className="text-sm text-muted-foreground">
                  Measures loading performance. Should occur within 2.5 seconds of page start.
                </p>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  FID - First Input Delay
                </h4>
                <p className="text-sm text-muted-foreground">
                  Measures interactivity. Pages should have FID of 100ms or less.
                </p>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  CLS - Cumulative Layout Shift
                </h4>
                <p className="text-sm text-muted-foreground">
                  Measures visual stability. Pages should maintain CLS of 0.1 or less.
                </p>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  FCP - First Contentful Paint
                </h4>
                <p className="text-sm text-muted-foreground">
                  Measures when first content appears. Should occur within 1.8 seconds.
                </p>
              </div>
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  TTFB - Time to First Byte
                </h4>
                <p className="text-sm text-muted-foreground">
                  Measures server response time. Should be under 800ms.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="navigation" className="space-y-4">
          {navigationTiming ? (
            <Card>
              <CardHeader>
                <CardTitle>Navigation Timing Breakdown</CardTitle>
                <CardDescription>Detailed timing information for page load</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(navigationTiming).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <Badge variant="outline">{(value as number).toFixed(2)}ms</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Navigation timing data not available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Loading Performance</CardTitle>
              <CardDescription>
                {resources.length} resources loaded
                {' - '}
                {resources.filter(r => r.cached).length} from cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {resources.slice(0, 50).map((resource, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border-b">
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium truncate">{resource.name.split('/').pop()}</p>
                      <p className="text-xs text-muted-foreground">{resource.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {resource.cached && (
                        <Badge variant="outline" className="bg-success/10">Cached</Badge>
                      )}
                      <Badge variant="outline">{resource.duration.toFixed(0)}ms</Badge>
                      {resource.size > 0 && (
                        <Badge variant="outline">{(resource.size / 1024).toFixed(1)}KB</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Metrics ({metrics.length})</CardTitle>
              <CardDescription>Last 100 performance measurements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metrics.slice().reverse().slice(0, 50).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border-b">
                    <div>
                      <p className="text-sm font-medium">{metric.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(metric.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={
                          metric.rating === 'good' ? 'bg-success/10' :
                          metric.rating === 'needs-improvement' ? 'bg-warning/10' :
                          'bg-destructive/10'
                        }
                      >
                        {metric.rating}
                      </Badge>
                      <span className="text-sm font-mono">
                        {metric.value.toFixed(2)}{metric.name === 'CLS' ? '' : 'ms'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {overallScore < 80 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-1" />
                <div>
                  <p className="text-sm font-medium">Performance can be improved</p>
                  <p className="text-xs text-muted-foreground">
                    Consider implementing lazy loading, code splitting, and caching strategies.
                  </p>
                </div>
              </div>
            )}
            {averages.LCP && averages.LCP.average > 2500 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-1" />
                <div>
                  <p className="text-sm font-medium">Slow Largest Contentful Paint</p>
                  <p className="text-xs text-muted-foreground">
                    Optimize images, implement lazy loading, and reduce server response times.
                  </p>
                </div>
              </div>
            )}
            {averages.CLS && averages.CLS.average > 0.1 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-1" />
                <div>
                  <p className="text-sm font-medium">Layout Shifts Detected</p>
                  <p className="text-xs text-muted-foreground">
                    Reserve space for images and dynamic content to prevent layout shifts.
                  </p>
                </div>
              </div>
            )}
            {overallScore >= 80 && (
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-1" />
                <div>
                  <p className="text-sm font-medium">Excellent Performance</p>
                  <p className="text-xs text-muted-foreground">
                    Your application is performing well across all Core Web Vitals.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitoringDashboard;
