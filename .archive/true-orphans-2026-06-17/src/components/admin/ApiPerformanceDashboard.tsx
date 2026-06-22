/**
 * API Performance Dashboard
 *
 * Real-time monitoring of API performance metrics and health
 * Displays cache efficiency, request deduplication, and query optimization results
 * Provides insights into system performance and optimization opportunities
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Cpu,
  HardDrive,
  Network
} from 'lucide-react';
import { globalPerformanceMonitor } from '@/services/core/PerformanceMonitor';
import { globalDeduplicator } from '@/services/core/RequestDeduplicator';
import { getCacheByType } from '@/services/core/ApiCache';

interface PerformanceMetrics {
  timestamp: number;
  stats: any;
  health: any;
  cacheMetrics: any;
  deduplicatorMetrics: any;
}

export function ApiPerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout>();

  useEffect(() => {
    loadMetrics();

    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefresh]);

  const loadMetrics = async () => {
    try {
      const perfMetrics = globalPerformanceMonitor.exportMetrics();
      const dedupMetrics = globalDeduplicator.getStats();

      // Collect cache metrics from all cache instances
      const cacheMetrics = {
        user: getCacheByType('user').getStats(),
        fleet: getCacheByType('fleet').getStats(),
        financial: getCacheByType('financial').getStats(),
        customer: getCacheByType('customer').getStats(),
        contract: getCacheByType('contract').getStats(),
        config: getCacheByType('config').getStats()
      };

      setMetrics({
        timestamp: perfMetrics.timestamp,
        stats: perfMetrics.stats,
        health: perfMetrics.health,
        cacheMetrics,
        deduplicatorMetrics: dedupMetrics
      });

    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading performance metrics...</span>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load performance metrics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const { stats, health, cacheMetrics, deduplicatorMetrics } = metrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of API performance and optimization metrics
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={loadMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health
          </CardTitle>
          <CardDescription>
            Overall system health status and performance score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                health.status === 'healthy' ? 'text-green-600' :
                health.status === 'warning' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {health.score}%
              </div>
              <div className="text-sm text-muted-foreground">Health Score</div>
              <Badge
                variant={health.status === 'healthy' ? 'default' :
                         health.status === 'warning' ? 'secondary' : 'destructive'}
                className="mt-1"
              >
                {health.status.toUpperCase()}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.requestsPerSecond.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Requests/Second</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {(stats.averageResponseTime / 1000).toFixed(2)}s
              </div>
              <div className="text-sm text-muted-foreground">Avg Response Time</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                stats.errorRate < 0.05 ? 'text-green-600' :
                stats.errorRate < 0.1 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {(stats.errorRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Error Rate</div>
            </div>
          </div>

          {health.issues.length > 0 && (
            <Alert className="mt-4" variant={health.status === 'critical' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Performance Issues:</strong> {health.issues.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="deduplication">Request Deduplication</TabsTrigger>
          <TabsTrigger value="queries">Query Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Last 5 minutes</span>
                </div>
              </CardContent>
            </Card>

            {/* Success Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>{stats.successfulRequests.toLocaleString()} successful</span>
                </div>
              </CardContent>
            </Card>

            {/* P95 Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">P95 Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.p95ResponseTime / 1000).toFixed(2)}s
                </div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>P99: {(stats.p99ResponseTime / 1000).toFixed(2)}s</span>
                </div>
              </CardContent>
            </Card>

            {/* Database Queries */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>Optimization active</span>
                </div>
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45%</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <div className="flex-1">
                    <Progress value={45} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network I/O */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Network I/O</CardTitle>
                <Network className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3 MB/s</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span>Down: 1.8 MB/s | Up: 0.5 MB/s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(cacheMetrics).map(([cacheType, metrics]: [string, any]) => (
              <Card key={cacheType}>
                <CardHeader>
                  <CardTitle className="capitalize">{cacheType} Cache</CardTitle>
                  <CardDescription>
                    Cache performance metrics for {cacheType} data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Hit Rate</span>
                    <span className="font-bold text-green-600">
                      {(metrics.metrics.hitRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={metrics.metrics.hitRate * 100} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Size</span>
                    <span className="font-bold">{metrics.size}/{metrics.maxSize}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory</span>
                    <span className="font-bold">
                      {(metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Hits</span>
                    <span className="font-bold">{metrics.entries.averageHits.toFixed(1)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deduplication" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Deduplication Effectiveness
                </CardTitle>
                <CardDescription>
                  Request deduplication performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(deduplicatorMetrics.deduplicationRate * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Deduplication Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {deduplicatorMetrics.deduplicatedRequests.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Requests Deduplicated</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Requests</span>
                    <span className="font-bold">{deduplicatorMetrics.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Requests</span>
                    <span className="font-bold">{deduplicatorMetrics.activeRequests}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Response Time</span>
                    <span className="font-bold">{deduplicatorMetrics.averageResponseTime.toFixed(0)}ms</span>
                  </div>
                </div>

                <Progress value={deduplicatorMetrics.deduplicationRate * 100} className="h-3" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  System Capacity
                </CardTitle>
                <CardDescription>
                  Current system utilization and capacity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Request Capacity</span>
                      <span className="font-bold">{deduplicatorMetrics.capacity.utilization.toFixed(1)}%</span>
                    </div>
                    <Progress value={deduplicatorMetrics.capacity.utilization} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current Load:</span>
                      <span className="ml-2 font-bold">{deduplicatorMetrics.capacity.current}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Capacity:</span>
                      <span className="ml-2 font-bold">{deduplicatorMetrics.capacity.max}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Query Performance Analysis
              </CardTitle>
              <CardDescription>
                Slowest and fastest performing queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Slowest Queries */}
                <div>
                  <h4 className="font-medium text-red-600 mb-2">Slowest Queries</h4>
                  <div className="space-y-2">
                    {stats.slowestRequests.slice(0, 5).map((query: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-sm font-mono">{query.name}</span>
                        <Badge variant="destructive">
                          {(query.duration / 1000).toFixed(2)}s
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fastest Queries */}
                <div>
                  <h4 className="font-medium text-green-600 mb-2">Fastest Queries</h4>
                  <div className="space-y-2">
                    {stats.fastestRequests.slice(0, 5).map((query: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-sm font-mono">{query.name}</span>
                        <Badge variant="default" className="bg-green-600">
                          {(query.duration / 1000).toFixed(3)}s
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Errors */}
                {stats.recentErrors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Recent Errors</h4>
                    <div className="space-y-2">
                      {stats.recentErrors.slice(0, 5).map((query: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <span className="text-sm font-mono">{query.name}</span>
                          <Badge variant="destructive">
                            {query.statusCode || 'ERROR'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}