/**
 * Performance Monitor Component
 * Detailed performance monitoring and analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

import { apiMonitor } from '@/lib/api-monitoring/monitor';
import { apiAnalytics } from '@/lib/api-monitoring/analytics';
import type { APIMetrics, TimeWindow, PerformanceTrend, SlowQuery } from '@/types/api-monitoring';

interface PerformanceMonitorProps {
  className?: string;
  endpoint?: string;
}

interface ChartData {
  timestamp: string;
  value: number;
}

interface EndpointData {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  requests: number;
  errorRate: number;
}

export function PerformanceMonitor({ className, endpoint }: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<APIMetrics | null>(null);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [topEndpoints, setTopEndpoints] = useState<EndpointData[]>([]);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>('1h');
  const [selectedMetric, setSelectedMetric] = useState('responseTime');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [currentMetrics, performanceTrends, slowQueriesList] = await Promise.all([
          apiMonitor.getMetrics(endpoint, selectedTimeWindow),
          apiAnalytics.analyzeTrends(getTimeRange(selectedTimeWindow)),
          getSlowQueries(),
        ]);

        setMetrics(currentMetrics);
        setTrends(performanceTrends);
        setSlowQueries(slowQueriesList);

        // Get top endpoints by response time
        const endpoints = await getTopEndpoints();
        setTopEndpoints(endpoints);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [endpoint, selectedTimeWindow]);

  const getTimeRange = (window: TimeWindow) => {
    const end = new Date();
    const start = new Date();
    const ranges = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '6h': 360,
      '12h': 720,
      '24h': 1440,
    };
    start.setMinutes(start.getMinutes() - ranges[window]);
    return { start, end };
  };

  const getSlowQueries = async (): Promise<SlowQuery[]> => {
    // This would fetch from the monitoring database
    return [
      {
        id: '1',
        endpoint: '/api/vehicles/search',
        method: 'GET',
        responseTime: 3500,
        timestamp: new Date(),
        userId: 'user1',
        query: 'SELECT * FROM vehicles WHERE...',
        frequency: 45,
      },
      {
        id: '2',
        endpoint: '/api/reports/generate',
        method: 'POST',
        responseTime: 5200,
        timestamp: new Date(),
        userId: 'user2',
        stackTrace: 'at generateReport (report.js:123)',
        frequency: 23,
      },
    ];
  };

  const getTopEndpoints = async (): Promise<EndpointData[]> => {
    // This would fetch from the monitoring database
    return [
      {
        endpoint: '/api/vehicles/search',
        avgResponseTime: 850,
        p95ResponseTime: 2100,
        requests: 1250,
        errorRate: 0.03,
      },
      {
        endpoint: '/api/contracts',
        avgResponseTime: 450,
        p95ResponseTime: 980,
        requests: 890,
        errorRate: 0.01,
      },
      {
        endpoint: '/api/customers',
        avgResponseTime: 320,
        p95ResponseTime: 750,
        requests: 670,
        errorRate: 0.02,
      },
      {
        endpoint: '/api/payments/process',
        avgResponseTime: 1250,
        p95ResponseTime: 2800,
        requests: 340,
        errorRate: 0.05,
      },
    ];
  };

  const generatePerformanceReport = async () => {
    try {
      setIsGeneratingReport(true);
      const report = await apiAnalytics.generatePerformanceReport(
        getTimeRange(selectedTimeWindow)
      );
      console.log('Performance report generated:', report);
      // TODO: Display or download the report
    } catch (error) {
      console.error('Failed to generate performance report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getChartData = (): ChartData[] => {
    const trend = trends.find(t => t.metric === selectedMetric);
    if (!trend) return [];

    return trend.data.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      value: point.value,
    }));
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  if (isLoading && !metrics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading Performance Data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Monitor</h2>
          <p className="text-muted-foreground">
            Detailed analysis of API performance metrics and trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTimeWindow} onValueChange={(value) => setSelectedTimeWindow(value as TimeWindow)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1h">1h</SelectItem>
              <SelectItem value="6h">6h</SelectItem>
              <SelectItem value="24h">24h</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={generatePerformanceReport}
            disabled={isGeneratingReport}
          >
            {isGeneratingReport ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatResponseTime(metrics.averageResponseTime)}</div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{formatResponseTime(metrics.p95ResponseTime)}</div>
              <div className="text-sm text-muted-foreground">P95 Response Time</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{metrics.throughput.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Requests/Min</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{(metrics.errorRate * 100).toFixed(2)}%</div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Performance Trends</span>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="responseTime">Response Time</SelectItem>
                <SelectItem value="throughput">Throughput</SelectItem>
                <SelectItem value="errorRate">Error Rate</SelectItem>
                <SelectItem value="dataTransferred">Data Transfer</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
          <CardDescription>
            {selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints by Performance</CardTitle>
            <CardDescription>
              Endpoints sorted by average response time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topEndpoints.map((endpoint, index) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium text-sm">{endpoint.endpoint}</div>
                      <div className="text-xs text-muted-foreground">
                        {endpoint.requests} requests
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatResponseTime(endpoint.avgResponseTime)}</div>
                    <div className="text-xs text-muted-foreground">
                      P95: {formatResponseTime(endpoint.p95ResponseTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Slow Queries */}
        <Card>
          <CardHeader>
            <CardTitle>Slow Queries</CardTitle>
            <CardDescription>
              Queries exceeding performance thresholds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {slowQueries.map((query) => (
                <div key={query.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{query.endpoint}</div>
                    <Badge variant="destructive">
                      {formatResponseTime(query.responseTime)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Method: {query.method} | Frequency: {query.frequency} times
                  </div>
                  {query.query && (
                    <div className="text-xs font-mono bg-white p-2 rounded mt-2">
                      {query.query.substring(0, 100)}...
                    </div>
                  )}
                  {query.stackTrace && (
                    <details className="text-xs">
                      <summary className="cursor-pointer">Stack Trace</summary>
                      <pre className="mt-1 text-xs bg-white p-2 rounded">
                        {query.stackTrace}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      {trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trend Analysis</CardTitle>
            <CardDescription>
              Performance trends and patterns analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trends.map((trend) => (
                <div key={trend.metric} className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm capitalize">
                      {trend.metric.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-lg">{getTrendIcon(trend.trend)}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Trend:</span>
                      <Badge variant={trend.trend === 'stable' ? 'secondary' : 'outline'}>
                        {trend.trend}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Change:</span>
                      <span className={trend.changeRate > 0 ? 'text-red-600' : 'text-green-600'}>
                        {trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Significance:</span>
                      <Badge
                        variant={
                          trend.significance === 'high' ? 'destructive' :
                          trend.significance === 'medium' ? 'default' : 'secondary'
                        }
                      >
                        {trend.significance}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Recommendations</CardTitle>
          <CardDescription>
            Automated suggestions for performance optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Optimize Database Queries</div>
                <Badge>High Priority</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Several endpoints show slow database query performance. Consider adding indexes or optimizing query structure.
              </div>
              <div className="text-xs">
                <strong>Affected endpoints:</strong> /api/vehicles/search, /api/reports/generate
              </div>
              <div className="text-xs">
                <strong>Estimated improvement:</strong> 40-60% response time reduction
              </div>
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Implement Response Caching</div>
                <Badge>Medium Priority</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Add caching layer for frequently accessed data to reduce database load.
              </div>
              <div className="text-xs">
                <strong>Affected endpoints:</strong> /api/customers, /api/contracts
              </div>
              <div className="text-xs">
                <strong>Estimated improvement:</strong> 25-35% response time reduction
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}