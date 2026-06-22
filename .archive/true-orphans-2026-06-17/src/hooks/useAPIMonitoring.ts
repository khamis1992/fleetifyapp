/**
 * Custom hooks for API Monitoring
 * React hooks for consuming API monitoring data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiMonitor } from '@/lib/api-monitoring/monitor';
import { apiAnalytics } from '@/lib/api-monitoring/analytics';
import type {
  APIHealthStatus,
  APIMetrics,
  PerformanceReport,
  OptimizationRecommendation,
  TimeWindow,
  AlertRule,
  MonitoringConfig,
} from '@/types/api-monitoring';

// Hook for real-time API health status
export function useAPIHealth(
  refreshInterval: number = 30000,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: () => apiMonitor.getHealthStatus(),
    refetchInterval: enabled ? refreshInterval : false,
    staleTime: 10000, // Consider data fresh for 10 seconds
    enabled,
    onError: (error) => {
      console.error('Failed to fetch API health status:', error);
      toast.error('Failed to fetch API health status');
    },
  });
}

// Hook for API metrics with time window support
export function useAPIMetrics(
  endpoint?: string,
  timeWindow: TimeWindow = '1h',
  refreshInterval: number = 60000
) {
  return useQuery({
    queryKey: ['api-metrics', endpoint, timeWindow],
    queryFn: () => apiMonitor.getMetrics(endpoint, timeWindow),
    refetchInterval: refreshInterval,
    staleTime: 30000,
    onError: (error) => {
      console.error('Failed to fetch API metrics:', error);
    },
  });
}

// Hook for performance trends analysis
export function usePerformanceTrends(
  timeRange: { start: Date; end: Date },
  endpoints?: string[]
) {
  return useQuery({
    queryKey: ['performance-trends', timeRange.start, timeRange.end, endpoints],
    queryFn: () => apiAnalytics.analyzeTrends(timeRange, endpoints),
    staleTime: 300000, // 5 minutes
    onError: (error) => {
      console.error('Failed to fetch performance trends:', error);
    },
  });
}

// Hook for anomaly detection
export function useAnomalyDetection(
  timeRange: { start: Date; end: Date },
  threshold: number = 2.5
) {
  return useQuery({
    queryKey: ['anomalies', timeRange.start, timeRange.end, threshold],
    queryFn: () => apiAnalytics.detectAnomalies(timeRange, threshold),
    refetchInterval: 300000, // Check every 5 minutes
    staleTime: 180000, // 3 minutes
    onSuccess: (anomalies) => {
      if (anomalies.length > 0) {
        const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
        if (criticalAnomalies.length > 0) {
          toast.error(`Detected ${criticalAnomalies.length} critical performance anomalies`, {
            duration: 5000,
          });
        }
      }
    },
    onError: (error) => {
      console.error('Failed to detect anomalies:', error);
    },
  });
}

// Hook for performance report generation
export function usePerformanceReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timeRange: { start: Date; end: Date }) =>
      apiAnalytics.generatePerformanceReport(timeRange),
    onSuccess: (report) => {
      toast.success('Performance report generated successfully');
      queryClient.invalidateQueries({ queryKey: ['performance-reports'] });

      // TODO: Handle report download/display
      console.log('Generated report:', report);
    },
    onError: (error) => {
      console.error('Failed to generate performance report:', error);
      toast.error('Failed to generate performance report');
    },
  });
}

// Hook for API usage patterns analysis
export function useUsagePatterns(timeRange: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ['usage-patterns', timeRange.start, timeRange.end],
    queryFn: () => apiAnalytics.analyzeUsagePatterns(timeRange),
    staleTime: 600000, // 10 minutes
    onError: (error) => {
      console.error('Failed to fetch usage patterns:', error);
    },
  });
}

// Hook for performance predictions
export function usePerformancePrediction(
  metric: string,
  futurePeriod: TimeWindow
) {
  return useQuery({
    queryKey: ['performance-prediction', metric, futurePeriod],
    queryFn: () => apiAnalytics.predictPerformance(metric, futurePeriod),
    staleTime: 600000, // 10 minutes
    select: (data) => ({
      ...data,
      // Add derived insights
      insight: getPredictionInsight(data),
    }),
    onError: (error) => {
      console.error('Failed to generate performance prediction:', error);
    },
  });
}

// Hook for endpoint registration
export function useEndpointRegistration() {
  return useMutation({
    mutationFn: ({
      path,
      method,
      config,
    }: {
      path: string;
      method: string;
      config?: {
        rateLimit?: any;
        alerting?: any;
        monitoring?: any;
      };
    }) => {
      apiMonitor.registerEndpoint(path, method, config);
      return { success: true };
    },
    onSuccess: (_, { path, method }) => {
      toast.success(`Endpoint ${method} ${path} registered for monitoring`);
    },
    onError: (error, { path, method }) => {
      console.error('Failed to register endpoint:', error);
      toast.error(`Failed to register endpoint ${method} ${path}`);
    },
  });
}

// Hook for real-time monitoring with WebSocket-like behavior
export function useRealTimeMonitoring(
  enabled: boolean = true,
  onHealthChange?: (health: APIHealthStatus) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const healthQuery = useAPIHealth(5000, enabled); // Poll every 5 seconds
  const previousHealth = useRef<APIHealthStatus | null>(null);

  useEffect(() => {
    if (healthQuery.data) {
      if (!isConnected) {
        setIsConnected(true);
      }

      // Check for health status changes
      if (previousHealth.current) {
        const statusChanged = previousHealth.current.overall !== healthQuery.data.overall;
        const scoreChanged = Math.abs(previousHealth.current.score - healthQuery.data.score) > 10;

        if (statusChanged || scoreChanged) {
          onHealthChange?.(healthQuery.data);
        }
      }

      previousHealth.current = healthQuery.data;
    } else if (!healthQuery.isLoading && enabled) {
      setIsConnected(false);
    }
  }, [healthQuery.data, healthQuery.isLoading, enabled, onHealthChange]);

  return {
    isConnected,
    health: healthQuery.data,
    isLoading: healthQuery.isLoading,
    error: healthQuery.error,
  };
}

// Hook for monitoring configuration
export function useMonitoringConfig() {
  const [config, setConfig] = useState<MonitoringConfig | null>(null);

  useEffect(() => {
    // Load configuration from localStorage or API
    const savedConfig = localStorage.getItem('api-monitoring-config');
    if (savedConfig) {
      try {
        setConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Failed to parse monitoring config:', error);
      }
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<MonitoringConfig>) => {
    const updatedConfig = { ...config, ...newConfig } as MonitoringConfig;
    setConfig(updatedConfig);
    localStorage.setItem('api-monitoring-config', JSON.stringify(updatedConfig));
  }, [config]);

  const resetConfig = useCallback(() => {
    const defaultConfig: MonitoringConfig = {
      enabled: true,
      collectRequestBody: false,
      collectResponseBody: false,
      collectHeaders: true,
      collectUserAgent: true,
      collectIPAddress: true,
      samplingRate: 1.0,
      sampleErrorRequests: true,
      retentionPeriod: 30,
      aggregationLevel: 'minute',
      asyncCollection: true,
      batchSize: 100,
      flushInterval: 30000,
    };
    setConfig(defaultConfig);
    localStorage.setItem('api-monitoring-config', JSON.stringify(defaultConfig));
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
  };
}

// Hook for rate limiting monitoring
export function useRateLimitMonitoring() {
  const [rateLimitViolations, setRateLimitViolations] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const checkRateLimit = useCallback(async (
    path: string,
    method: string,
    userId?: string
  ) => {
    const isAllowed = apiMonitor.checkRateLimit(path, method, userId);

    if (!isAllowed) {
      setRateLimitViolations(prev => prev + 1);
      setIsBlocked(true);

      // Auto-unblock after a delay
      setTimeout(() => {
        setIsBlocked(false);
      }, 60000);
    }

    return isAllowed;
  }, []);

  return {
    rateLimitViolations,
    isBlocked,
    checkRateLimit,
  };
}

// Hook for alert management
export function useAlerts() {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['api-alerts'],
    queryFn: async () => {
      // This would fetch alerts from the monitoring system
      return [];
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) => {
      // This would acknowledge the alert
      return Promise.resolve(alertId);
    },
    onSuccess: () => {
      toast.success('Alert acknowledged');
      queryClient.invalidateQueries({ queryKey: ['api-alerts'] });
    },
    onError: () => {
      toast.error('Failed to acknowledge alert');
    },
  });

  const resolveAlert = useMutation({
    mutationFn: (alertId: string) => {
      // This would resolve the alert
      return Promise.resolve(alertId);
    },
    onSuccess: () => {
      toast.success('Alert resolved');
      queryClient.invalidateQueries({ queryKey: ['api-alerts'] });
    },
    onError: () => {
      toast.error('Failed to resolve alert');
    },
  });

  return {
    alerts: alerts || [],
    isLoading,
    acknowledgeAlert,
    resolveAlert,
  };
}

// Hook for performance optimization recommendations
export function useOptimizationRecommendations(
  timeRange: { start: Date; end: Date }
) {
  return useQuery({
    queryKey: ['optimization-recommendations', timeRange.start, timeRange.end],
    queryFn: async () => {
      const report = await apiAnalytics.generatePerformanceReport(timeRange);
      return report.recommendations;
    },
    staleTime: 3600000, // 1 hour
    select: (recommendations) => {
      // Sort by priority and impact
      return recommendations
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];

          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }

          const aImpact = a.impact.performance + a.impact.reliability + a.impact.cost;
          const bImpact = b.impact.performance + b.impact.reliability + b.impact.cost;
          return bImpact - aImpact;
        });
    },
    onError: (error) => {
      console.error('Failed to fetch optimization recommendations:', error);
    },
  });
}

// Helper functions
function getPredictionInsight(prediction: any): string {
  const { modelAccuracy, trendDirection } = prediction;

  if (modelAccuracy < 70) {
    return 'Low confidence prediction - insufficient historical data';
  }

  switch (trendDirection) {
    case 'increasing':
      return 'Performance metrics are trending upward - consider capacity planning';
    case 'decreasing':
      return 'Performance metrics are trending downward - positive trend detected';
    default:
      return 'Performance metrics are stable - no significant changes expected';
  }
}

// Hook for monitoring dashboard state
export function useMonitoringDashboard() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<TimeWindow>('1h');
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  const healthQuery = useAPIHealth(refreshInterval, isAutoRefresh);
  const metricsQuery = useAPIMetrics(selectedEndpoint || undefined, selectedTimeWindow, refreshInterval);

  const resetFilters = useCallback(() => {
    setSelectedEndpoint('');
    setSelectedTimeWindow('1h');
  }, []);

  return {
    // State
    selectedEndpoint,
    selectedTimeWindow,
    isAutoRefresh,
    refreshInterval,

    // Data
    health: healthQuery.data,
    metrics: metricsQuery.data,
    isHealthLoading: healthQuery.isLoading,
    isMetricsLoading: metricsQuery.isLoading,
    healthError: healthQuery.error,
    metricsError: metricsQuery.error,

    // Actions
    setSelectedEndpoint,
    setSelectedTimeWindow,
    setIsAutoRefresh,
    setRefreshInterval,
    resetFilters,

    // Refetch functions
    refetchHealth: healthQuery.refetch,
    refetchMetrics: metricsQuery.refetch,
  };
}

export {
  // Export types for use in components
  type APIHealthStatus,
  type APIMetrics,
  type PerformanceReport,
  type OptimizationRecommendation,
  type TimeWindow,
};