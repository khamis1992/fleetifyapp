/**
 * API Monitoring System Usage Example
 * Demonstrates how to use the API monitoring system in FleetifyApp
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';

import {
  initializeMonitoring,
  monitorAPICall,
  useAPIHealth,
  useAPIMetrics,
  apiMonitor,
} from '@/lib/api-monitoring';
import { supabase } from '@/integrations/supabase/client';

export function APIMonitoringExample() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Use monitoring hooks
  const { data: healthStatus, isLoading: isHealthLoading } = useAPIHealth(10000); // Poll every 10 seconds
  const { data: metrics } = useAPIMetrics(undefined, '1h', 30000); // Poll every 30 seconds

  // Initialize monitoring on component mount
  useEffect(() => {
    const initMonitoring = async () => {
      try {
        await initializeMonitoring({
          enabled: true,
          collectRequestBody: true, // Enable for demonstration
          collectResponseBody: true,
          collectHeaders: true,
          samplingRate: 1.0, // Monitor all requests for demo
        });
        setIsInitialized(true);
        console.log('API Monitoring initialized successfully');
      } catch (error) {
        console.error('Failed to initialize monitoring:', error);
      }
    };

    initMonitoring();
  }, []);

  // Example API call with monitoring
  const testMonitoredAPICall = async () => {
    setIsLoading(true);
    try {
      const result = await monitorAPICall(
        async () => {
          // Example: Fetch vehicles from database
          const { data, error } = await supabase
            .from('vehicles')
            .select('id, make, model, year, status')
            .limit(5);

          if (error) throw error;
          return data;
        },
        {
          operation: 'fetch-vehicles-demo',
          endpoint: '/vehicles',
          method: 'GET',
        }
      );

      setLastResult({
        success: true,
        data: result,
        timestamp: new Date(),
      });
    } catch (error) {
      setLastResult({
        success: false,
        error: error.message,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Example API call that simulates an error
  const testErrorMonitoring = async () => {
    setIsLoading(true);
    try {
      await monitorAPICall(
        async () => {
          // Simulate a slow request
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Simulate an error
          throw new Error('This is a demo error for testing monitoring');
        },
        {
          operation: 'demo-error',
          endpoint: '/demo/error',
          method: 'GET',
        }
      );
    } catch (error) {
      setLastResult({
        success: false,
        error: error.message,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get current monitoring metrics
  const getCurrentMetrics = () => {
    const currentMetrics = apiMonitor.getMetrics();
    return currentMetrics;
  };

  // Register a custom endpoint for monitoring
  const registerCustomEndpoint = () => {
    apiMonitor.registerEndpoint('/demo/custom', 'POST', {
      alerting: {
        enabled: true,
        responseTimeThresholds: { warning: 500, critical: 1500 },
        errorRateThresholds: { warning: 0.02, critical: 0.05 },
      },
      rateLimit: {
        windowMs: 60000,
        maxRequests: 30,
        adaptiveThresholds: true,
      },
    });
    alert('Custom endpoint registered for monitoring');
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            API Monitoring System Demo
            <Badge variant={isInitialized ? 'default' : 'secondary'}>
              {isInitialized ? 'Initialized' : 'Not Initialized'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Demonstrating the FleetifyApp API monitoring capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button onClick={testMonitoredAPICall} disabled={isLoading}>
              {isLoading ? 'Testing...' : 'Test Monitored API Call'}
            </Button>
            <Button onClick={testErrorMonitoring} variant="outline" disabled={isLoading}>
              Test Error Monitoring
            </Button>
            <Button onClick={registerCustomEndpoint} variant="outline">
              Register Custom Endpoint
            </Button>
            <Button onClick={getCurrentMetrics} variant="outline">
              Get Current Metrics
            </Button>
          </div>

          {lastResult && (
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Last API Call Result</h4>
              <div className="text-sm space-y-1">
                <div>
                  <strong>Status:</strong>{' '}
                  <Badge variant={lastResult.success ? 'default' : 'destructive'}>
                    {lastResult.success ? 'Success' : 'Error'}
                  </Badge>
                </div>
                <div>
                  <strong>Time:</strong> {lastResult.timestamp.toLocaleString()}
                </div>
                {lastResult.success ? (
                  <div>
                    <strong>Data:</strong>{' '}
                    <pre className="text-xs bg-slate-100 p-2 rounded mt-1 overflow-auto max-h-32">
                      {JSON.stringify(lastResult.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div>
                    <strong>Error:</strong> {lastResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Health Status */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Real-time Health Status
              {getHealthIcon(healthStatus.overall)}
            </CardTitle>
            <CardDescription>
              Live API system health information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{healthStatus.score}</div>
                <div className="text-sm text-muted-foreground">Health Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{healthStatus.uptime.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {healthStatus.avgResponseTime.toFixed(0)}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Response</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {(healthStatus.errorRate * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Active Alerts</h4>
              <div className="flex gap-2">
                <Badge variant="destructive">
                  {healthStatus.criticalAlerts} Critical
                </Badge>
                <Badge variant="secondary">
                  {healthStatus.activeAlerts} Active
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Current Metrics (1h window)</CardTitle>
            <CardDescription>
              API performance metrics for the last hour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Request Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <span className="font-medium">{metrics.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Successful:</span>
                    <span className="font-medium text-green-600">
                      {metrics.successfulRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">
                      {metrics.failedRequests.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Avg Response Time:</span>
                    <span className="font-medium">{metrics.averageResponseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P95 Response Time:</span>
                    <span className="font-medium">{metrics.p95ResponseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P99 Response Time:</span>
                    <span className="font-medium">{metrics.p99ResponseTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Throughput:</span>
                    <span className="font-medium">{metrics.throughput.toFixed(1)} req/min</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Information */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring System Information</CardTitle>
          <CardDescription>
            Details about the monitoring system configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>
              <strong>Status:</strong> The API monitoring system is{' '}
              {isInitialized ? 'active and collecting data' : 'being initialized'}.
            </p>
            <p>
              <strong>Features:</strong> Request/response tracking, performance metrics,
              error categorization, real-time health monitoring, and intelligent alerting.
            </p>
            <p>
              <strong>Data Collection:</strong> All API calls are monitored with detailed
              timing, error categorization, and performance metrics.
            </p>
            <p>
              <strong>Health Monitoring:</strong> The system provides real-time health
              scores, uptime tracking, and automatic anomaly detection.
            </p>
            <p>
              <strong>Privacy:</strong> In production, sensitive data like request bodies
              and IP addresses are not collected by default.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default APIMonitoringExample;