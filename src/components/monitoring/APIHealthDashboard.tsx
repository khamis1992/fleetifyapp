/**
 * API Health Dashboard
 * Real-time monitoring dashboard for API performance and health
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, TrendingDown, TrendingUp, XCircle } from 'lucide-react';

import { apiMonitor } from '@/lib/api-monitoring/monitor';
import { apiAnalytics } from '@/lib/api-monitoring/analytics';
import type { APIHealthStatus, APIMetrics, TimeWindow } from '@/types/api-monitoring';

interface APIHealthDashboardProps {
  className?: string;
  refreshInterval?: number;
  timeWindow?: TimeWindow;
}

export function APIHealthDashboard({
  className,
  refreshInterval = 30000, // 30 seconds
  timeWindow = '1h',
}: APIHealthDashboardProps) {
  const [healthStatus, setHealthStatus] = useState<APIHealthStatus | null>(null);
  const [metrics, setMetrics] = useState<APIMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>(timeWindow);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [health, currentMetrics] = await Promise.all([
          apiMonitor.getHealthStatus(),
          apiMonitor.getMetrics(undefined, selectedTimeWindow),
        ]);
        setHealthStatus(health);
        setMetrics(currentMetrics);
        setLastRefresh(new Date());
      } catch (error) {
        console.error('Failed to fetch API health data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    let intervalId: NodeJS.Timeout;
    if (isAutoRefresh) {
      intervalId = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoRefresh, refreshInterval, selectedTimeWindow]);

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDataSize = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (isLoading && !healthStatus) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            Loading API Health Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Health Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of API performance and availability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Last refresh: {lastRefresh?.toLocaleTimeString() || 'Never'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? 'Pause' : 'Resume'} Auto-refresh
          </Button>
        </div>
      </div>

      {/* Time Window Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Time Window:</span>
        <Tabs
          value={selectedTimeWindow}
          onValueChange={(value) => setSelectedTimeWindow(value as TimeWindow)}
          className="w-fit"
        >
          <TabsList>
            <TabsTrigger value="5m">5m</TabsTrigger>
            <TabsTrigger value="15m">15m</TabsTrigger>
            <TabsTrigger value="1h">1h</TabsTrigger>
            <TabsTrigger value="6h">6h</TabsTrigger>
            <TabsTrigger value="24h">24h</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overall Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getHealthIcon(healthStatus.overall)}
                Overall System Health
              </span>
              <Badge className={getHealthColor(healthStatus.overall)}>
                {healthStatus.overall.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              System-wide health status and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Health Score */}
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(healthStatus.score)}`}>
                  {healthStatus.score}
                </div>
                <div className="text-sm text-muted-foreground">Health Score</div>
                <Progress value={healthStatus.score} className="mt-2" />
              </div>

              {/* Uptime */}
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {healthStatus.uptime.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Uptime</div>
                <Progress value={healthStatus.uptime} className="mt-2" />
              </div>

              {/* Response Time */}
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {formatResponseTime(healthStatus.avgResponseTime)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
                <div className="flex items-center justify-center mt-2">
                  {healthStatus.avgResponseTime > 1000 ? (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>

              {/* Error Rate */}
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {(healthStatus.errorRate * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
                <Progress
                  value={healthStatus.errorRate * 100}
                  className="mt-2"
                  indicatorClassName="bg-red-500"
                />
              </div>
            </div>

            {/* Active Alerts */}
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge variant="destructive">
                  {healthStatus.criticalAlerts} Critical
                </Badge>
                <Badge variant="secondary">
                  {healthStatus.activeAlerts} Active Alerts
                </Badge>
              </div>
              <Button variant="outline" size="sm">
                View All Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Request Metrics</CardTitle>
              <CardDescription>
                Request volume and success rates for the selected time window
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Requests</span>
                  <span className="text-2xl font-bold">
                    {metrics.totalRequests.toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">
                      {metrics.successfulRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-green-700">Successful</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-xl font-bold text-red-600">
                      {metrics.failedRequests.toLocaleString()}
                    </div>
                    <div className="text-xs text-red-700">Failed</div>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">
                      {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={(metrics.successfulRequests / metrics.totalRequests) * 100}
                    className="mt-1"
                    indicatorClassName="bg-green-500"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Time Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Analysis</CardTitle>
              <CardDescription>
                Response time distribution and performance percentiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-blue-50 rounded">
                    <div className="text-lg font-bold text-blue-600">
                      {formatResponseTime(metrics.averageResponseTime)}
                    </div>
                    <div className="text-xs text-blue-700">Average</div>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded">
                    <div className="text-lg font-bold text-yellow-600">
                      {formatResponseTime(metrics.p95ResponseTime)}
                    </div>
                    <div className="text-xs text-yellow-700">P95</div>
                  </div>
                  <div className="p-2 bg-red-50 rounded">
                    <div className="text-lg font-bold text-red-600">
                      {formatResponseTime(metrics.p99ResponseTime)}
                    </div>
                    <div className="text-xs text-red-700">P99</div>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Throughput</span>
                    <span className="font-medium">
                      {metrics.throughput.toFixed(1)} req/min
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span>Data Transferred</span>
                    <span className="font-medium">
                      {formatDataSize(metrics.dataTransferred)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Endpoint Health Overview */}
      {healthStatus && Object.keys(healthStatus.endpoints).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Endpoint Health Overview</CardTitle>
            <CardDescription>
              Health status of individual API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(healthStatus.endpoints).map(([endpoint, health]) => (
                <div
                  key={endpoint}
                  className={`p-4 rounded-lg border ${getHealthColor(health.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{endpoint}</span>
                    {getHealthIcon(health.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Response Time</div>
                      <div className="font-medium">
                        {health.responseTime ? formatResponseTime(health.responseTime) : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Error Rate</div>
                      <div className="font-medium">
                        {health.errorRate ? `${(health.errorRate * 100).toFixed(1)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                  {health.message && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {health.message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Analysis */}
      {metrics && Object.keys(metrics.errorsByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
            <CardDescription>
              Breakdown of errors by category and status code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Errors by Category */}
              <div>
                <h4 className="text-sm font-medium mb-3">Errors by Category</h4>
                <div className="space-y-2">
                  {Object.entries(metrics.errorsByCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                      <Badge variant="destructive">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errors by Status Code */}
              <div>
                <h4 className="text-sm font-medium mb-3">Errors by Status Code</h4>
                <div className="space-y-2">
                  {Object.entries(metrics.errorsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm">HTTP {status}</span>
                      <Badge
                        variant={
                          parseInt(status) >= 500 ? 'destructive' : 'secondary'
                        }
                      >
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}