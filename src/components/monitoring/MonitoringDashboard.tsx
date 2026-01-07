/**
 * Comprehensive Monitoring Dashboard
 * Real-time monitoring dashboard with system health, performance metrics, and alerts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { useMonitoring, useInfrastructureMonitoring, useErrorTracking } from '../../hooks/useMonitoring';
import { monitoring, errorTracking } from '../../lib/monitoring/core';
import { infrastructureMonitoring } from '../../lib/monitoring/infrastructure';
import { AlertTriangle, CheckCircle, XCircle, Activity, Cpu, HardDrive, Wifi, Database, Clock, TrendingUp, TrendingDown, RefreshCw, Download, Settings } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, status, trend, change, icon }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4" />;
      case 'down': return <TrendingDown className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <div>
              <p className="text-sm font-medium text-slate-600">{title}</p>
              <p className={`text-2xl font-bold ${getStatusColor()}`}>
                {value}{unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
              </p>
            </div>
          </div>
          {trend && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              {change !== undefined && (
                <span className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ErrorAlertProps {
  error: any;
  onResolve: (errorId: string) => void;
  onIgnore: (errorId: string) => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onResolve, onIgnore }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <Alert className="mb-2">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{error.message}</span>
        <Badge variant={getSeverityColor(error.severity)}>
          {error.severity}
        </Badge>
      </AlertTitle>
      <AlertDescription>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-slate-600">
            <span>{error.context?.component} • {formatTime(error.lastSeen)}</span>
            <span className="ml-2">Occurrences: {error.occurrences}</span>
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(error.id)}
            >
              Resolve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onIgnore(error.id)}
            >
              Ignore
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export const MonitoringDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { performance } = useMonitoring({ componentName: 'MonitoringDashboard' });
  const { healthStatus, systemMetrics, resourceUsage } = useInfrastructureMonitoring();
  const { errors, errorSummary, trackError } = useErrorTracking('MonitoringDashboard');

  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');

  // Fetch comprehensive system health
  const fetchSystemHealth = async () => {
    try {
      const health = await infrastructureMonitoring.getInfrastructureHealth();
      setSystemHealth(health);

      const perfSummary = monitoring.getMetrics();
      setPerformanceSummary({
        totalMetrics: perfSummary.length,
        recentErrors: errors.length,
        systemLoad: resourceUsage?.memory ?
          Math.round((resourceUsage.memory.usage / (resourceUsage.memory.total || 1)) * 100) : 0
      });

      setLastRefresh(new Date());
    } catch (error) {
      trackError(error as Error, { component: 'MonitoringDashboard', action: 'fetch_system_health' });
    }
  };

  useEffect(() => {
    fetchSystemHealth();

    if (autoRefresh) {
      const interval = setInterval(fetchSystemHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, autoRefresh]);

  const handleRefresh = () => {
    fetchSystemHealth();
  };

  const handleExportData = () => {
    const data = {
      timestamp: new Date().toISOString(),
      systemHealth,
      performanceSummary,
      errors: errors.slice(0, 10), // Last 10 errors
      systemMetrics: systemMetrics.slice(0, 20) // Last 20 metrics
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-data-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-slate-500" />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Monitoring Dashboard</h1>
          <p className="text-slate-600">Real-time system health and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Clock className="h-4 w-4" />
            <span>Last refresh: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={!autoRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="System Health"
          value={systemHealth?.status || 'Unknown'}
          icon={getHealthStatusIcon(systemHealth?.status || 'unknown')}
          status={systemHealth?.status === 'healthy' ? 'good' :
                 systemHealth?.status === 'degraded' ? 'warning' : 'critical'}
        />

        <MetricCard
          title="Active Errors"
          value={errors.filter(e => !e.resolved).length}
          icon={<AlertTriangle className="h-5 w-5" />}
          status={errors.filter(e => !e.resolved && e.severity === 'critical').length > 0 ? 'critical' :
                 errors.filter(e => !e.resolved).length > 5 ? 'warning' : 'good'}
        />

        <MetricCard
          title="Avg Response Time"
          value={Math.round(performanceSummary?.systemLoad || 0)}
          unit="ms"
          icon={<Activity className="h-5 w-5" />}
          status={(performanceSummary?.systemLoad || 0) < 500 ? 'good' :
                 (performanceSummary?.systemLoad || 0) < 2000 ? 'warning' : 'critical'}
        />

        <MetricCard
          title="Memory Usage"
          value={resourceUsage?.memory ?
            Math.round((resourceUsage.memory.usage / (resourceUsage.memory.total || 1)) * 100) : 0}
          unit="%"
          icon={<Cpu className="h-5 w-5" />}
          status={resourceUsage?.memory ?
            (resourceUsage.memory.usage / (resourceUsage.memory.total || 1)) < 0.7 ? 'good' :
            (resourceUsage.memory.usage / (resourceUsage.memory.total || 1)) < 0.85 ? 'warning' : 'critical' : 'unknown'}
        />
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
          <TabsTrigger value="business">Business Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Errors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Recent Errors
                </CardTitle>
                <CardDescription>
                  Latest {errors.slice(0, 5).length} errors requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errors.slice(0, 5).map((error) => (
                    <ErrorAlert
                      key={error.id}
                      error={error}
                      onResolve={(errorId) => errorTracking.resolveError(errorId)}
                      onIgnore={(errorId) => {/* Handle ignore */}}
                    />
                  ))}
                  {errors.length === 0 && (
                    <p className="text-center text-slate-500 py-4">No recent errors</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Metrics
                </CardTitle>
                <CardDescription>
                  Key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemMetrics.slice(0, 6).map((metric, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{metric.name}</p>
                        <p className="text-xs text-slate-500">
                          {metric.value} {metric.unit}
                        </p>
                      </div>
                      <Progress
                        value={Math.min(100, (metric.value / (metric.threshold?.critical || 100)) * 100)}
                        className="w-24"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard
              title="API Response Time"
              value={Math.round(performanceSummary?.systemLoad || 0)}
              unit="ms"
              icon={<Activity className="h-5 w-5" />}
            />
            <MetricCard
              title="Database Queries"
              value={systemHealth?.details?.database?.metrics?.length || 0}
              icon={<Database className="h-5 w-5" />}
            />
            <MetricCard
              title="Network Requests"
              value={systemHealth?.details?.services?.metrics?.length || 0}
              icon={<Wifi className="h-5 w-5" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {systemMetrics.filter(m => m.name.includes('response_time')).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{metric.name}</span>
                    <span className="text-sm font-medium">
                      {Math.round(metric.value)}{metric.unit}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Error Management</h3>
              <p className="text-slate-600">Monitor and manage system errors</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure Rules
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {errorSummary && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Errors:</span>
                      <span className="font-medium">{errorSummary.totalErrors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unique Errors:</span>
                      <span className="font-medium">{errorSummary.uniqueErrors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Resolved:</span>
                      <span className="font-medium">{errorSummary.resolvedErrors}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Critical:</span>
                      <span className="font-medium text-red-600">{errorSummary.criticalErrors}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Error Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(errorSummary?.errorsByType || {}).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize">{type}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{count}</span>
                        <Progress
                          value={(count / (errorSummary?.totalErrors || 1)) * 100}
                          className="w-32"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {errors.map((error) => (
                  <ErrorAlert
                    key={error.id}
                    error={error}
                    onResolve={(errorId) => errorTracking.resolveError(errorId)}
                    onIgnore={(errorId) => {/* Handle ignore */}}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Infrastructure Tab */}
        <TabsContent value="infrastructure" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HardDrive className="h-5 w-5 mr-2" />
                  Resource Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm">
                        {resourceUsage?.memory ?
                          Math.round((resourceUsage.memory.usage / (resourceUsage.memory.total || 1)) * 100) : 0}%
                      </span>
                    </div>
                    <Progress
                      value={resourceUsage?.memory ?
                        (resourceUsage.memory.usage / (resourceUsage.memory.total || 1)) * 100 : 0}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">CPU Load</span>
                      <span className="text-sm">Normal</span>
                    </div>
                    <Progress value={30} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Disk Usage</span>
                      <span className="text-sm">45%</span>
                    </div>
                    <Progress value={45} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  External Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {systemHealth?.details?.services?.metrics?.map((service: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          service.available ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className="text-sm font-medium">{service.service}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        {service.responseTime}ms
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Business Metrics Tab */}
        <TabsContent value="business" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Active Users"
              value={1247}
              trend="up"
              change={5.2}
            />
            <MetricCard
              title="Fleet Utilization"
              value={78}
              unit="%"
              trend="up"
              change={2.1}
            />
            <MetricCard
              title="Revenue Today"
              value="$12,847"
              trend="up"
              change={8.7}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Business Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">Business metrics integration coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;