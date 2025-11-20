/**
 * Monitoring Dashboard Page
 * Comprehensive monitoring dashboard for system administrators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, Activity, Shield } from 'lucide-react';

import { APIHealthDashboard } from '@/components/monitoring/APIHealthDashboard';
import { PerformanceMonitor } from '@/components/monitoring/PerformanceMonitor';
import { useAPIHealth, useAPIMetrics, useAlerts, useOptimizationRecommendations } from '@/hooks/useAPIMonitoring';
import { initializeMonitoring, apiMonitor } from '@/lib/api-monitoring';

export function MonitoringDashboard() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');

  // Use monitoring hooks
  const { data: healthStatus, isLoading: isHealthLoading } = useAPIHealth(30000);
  const { data: metrics } = useAPIMetrics();
  const { data: alerts, isLoading: isAlertsLoading } = useAlerts();
  const { data: recommendations } = useOptimizationRecommendations({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  useEffect(() => {
    const init = async () => {
      try {
        await initializeMonitoring();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
      }
    };

    init();
  }, []);

  const refreshData = () => {
    window.location.reload();
  };

  const getSystemStatusIcon = () => {
    if (!healthStatus) return <Clock className="h-6 w-6 text-gray-500" />;

    switch (healthStatus.overall) {
      case 'healthy':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  const getSystemStatusText = () => {
    if (!healthStatus) return 'Unknown';
    return healthStatus.overall.charAt(0).toUpperCase() + healthStatus.overall.slice(1);
  };

  const getSystemStatusColor = () => {
    if (!healthStatus) return 'bg-gray-100 text-gray-800';

    switch (healthStatus.overall) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics for FleetifyApp API operations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getSystemStatusColor()}>
            <div className="flex items-center gap-1">
              {getSystemStatusIcon()}
              {getSystemStatusText()}
            </div>
          </Badge>
          <Button onClick={refreshData} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                <p className="text-2xl font-bold">
                  {healthStatus?.score || 0}
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">
                  {metrics?.totalRequests.toLocaleString() || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics ? (metrics.errorRate * 100).toFixed(2) : 0}%
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {alerts?.length || 0}
                </p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <APIHealthDashboard />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceMonitor endpoint={selectedEndpoint} />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                System alerts and notifications requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAlertsLoading ? (
                <div className="text-center py-8">Loading alerts...</div>
              ) : alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert: any) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-lg border border-yellow-200 bg-yellow-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">{alert.title}</span>
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(alert.triggered_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.message}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Acknowledge
                        </Button>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active alerts. System is operating normally.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Recommendations</CardTitle>
              <CardDescription>
                Automated suggestions for optimizing API performance and reliability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations && recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec: any) => (
                    <div
                      key={rec.id}
                      className="p-4 rounded-lg border border-blue-200 bg-blue-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{rec.title}</span>
                          <Badge
                            variant={
                              rec.priority === 'high' ? 'destructive' :
                              rec.priority === 'medium' ? 'default' : 'secondary'
                            }
                          >
                            {rec.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {rec.category}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {rec.description}
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="font-medium">Performance Impact:</span>
                          <div className="text-green-600">
                            +{rec.impact.performance.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <span className="font-medium">Effort:</span>
                          <div className="capitalize">{rec.effort}</div>
                        </div>
                        <div>
                          <span className="font-medium">Time Estimate:</span>
                          <div>{rec.estimatedTime}</div>
                        </div>
                      </div>
                      {rec.endpoints && rec.endpoints.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs font-medium">Affected endpoints:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.endpoints.map((endpoint: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {endpoint}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No performance recommendations at this time. System is optimized.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Monitoring Status */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring System Status</CardTitle>
          <CardDescription>
            Status of the API monitoring system itself
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">System Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Initialization:</span>
                  <Badge variant={isInitialized ? 'default' : 'secondary'}>
                    {isInitialized ? 'Complete' : 'Pending'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Data Collection:</span>
                  <Badge variant={isInitialized ? 'default' : 'secondary'}>
                    {isInitialized ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Health Monitoring:</span>
                  <Badge variant={isHealthLoading ? 'secondary' : 'default'}>
                    {isHealthLoading ? 'Loading' : 'Active'}
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Configuration</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Collection Rate:</span>
                  <span>100% (Development)</span>
                </div>
                <div className="flex justify-between">
                  <span>Retention Period:</span>
                  <span>30 days</span>
                </div>
                <div className="flex justify-between">
                  <span>Real-time Updates:</span>
                  <span>30s interval</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MonitoringDashboard;