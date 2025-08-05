import { useState, useCallback, useRef, useEffect } from 'react';

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: Date;
  resolved: boolean;
  source: string;
}

interface PerformanceMetric {
  timestamp: Date;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  cacheHit: boolean;
  operation: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  errorRate: number;
  averageResponseTime: number;
  cacheHitRate: number;
  totalRequests: number;
  lastChecked: Date;
}

export const useAISystemMonitor = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: 0,
    errorRate: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
    totalRequests: 0,
    lastChecked: new Date()
  });

  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const metricsHistory = useRef<PerformanceMetric[]>([]);
  const startTime = useRef<Date>(new Date());
  const alertCounter = useRef<number>(0);

  // Record a performance metric
  const recordMetric = useCallback((
    operation: string,
    responseTime: number,
    success: boolean,
    errorMessage?: string,
    cacheHit = false
  ) => {
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      responseTime,
      success,
      errorMessage,
      cacheHit,
      operation
    };

    metricsHistory.current.push(metric);

    // Keep only last 1000 metrics for performance
    if (metricsHistory.current.length > 1000) {
      metricsHistory.current = metricsHistory.current.slice(-1000);
    }

    // Update system health immediately
    updateSystemHealth();

    // Check for alerts
    checkForAlerts(metric);
  }, []);

  // Update system health based on recent metrics
  const updateSystemHealth = useCallback(() => {
    const metrics = metricsHistory.current;
    const recentMetrics = metrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentMetrics.length === 0) {
      return;
    }

    const totalRequests = metrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const errorRate = recentMetrics.length > 0 
      ? (recentMetrics.length - successfulRequests) / recentMetrics.length 
      : 0;

    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
      : 0;

    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = recentMetrics.length > 0 
      ? cacheHits / recentMetrics.length 
      : 0;

    const uptime = Date.now() - startTime.current.getTime();

    let status: SystemHealth['status'] = 'healthy';
    if (errorRate > 0.5) {
      status = 'critical';
    } else if (errorRate > 0.2 || averageResponseTime > 10000) {
      status = 'degraded';
    }

    setSystemHealth({
      status,
      uptime,
      errorRate,
      averageResponseTime,
      cacheHitRate,
      totalRequests,
      lastChecked: new Date()
    });
  }, []);

  // Check for system alerts
  const checkForAlerts = useCallback((metric: PerformanceMetric) => {
    const alerts: SystemAlert[] = [];

    // High error rate alert
    const recentErrors = metricsHistory.current
      .filter(m => Date.now() - m.timestamp.getTime() < 5 * 60 * 1000)
      .filter(m => !m.success);

    if (recentErrors.length >= 5) {
      alerts.push({
        id: `error-rate-${alertCounter.current++}`,
        type: 'error',
        message: `معدل أخطاء مرتفع: ${recentErrors.length} أخطاء في آخر 5 دقائق`,
        timestamp: new Date(),
        resolved: false,
        source: 'error_monitor'
      });
    }

    // Slow response time alert
    if (metric.responseTime > 15000) {
      alerts.push({
        id: `slow-response-${alertCounter.current++}`,
        type: 'warning',
        message: `استجابة بطيئة: ${(metric.responseTime / 1000).toFixed(1)} ثانية للعملية ${metric.operation}`,
        timestamp: new Date(),
        resolved: false,
        source: 'performance_monitor'
      });
    }

    // API connection failure
    if (!metric.success && metric.errorMessage?.includes('API error')) {
      alerts.push({
        id: `api-failure-${alertCounter.current++}`,
        type: 'error',
        message: `فشل الاتصال بـ API: ${metric.errorMessage}`,
        timestamp: new Date(),
        resolved: false,
        source: 'api_monitor'
      });
    }

    if (alerts.length > 0) {
      setAlerts(prev => [...prev, ...alerts].slice(-50)); // Keep last 50 alerts
    }
  }, []);

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    const last24Hours = metricsHistory.current.filter(m => 
      Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const last1Hour = metricsHistory.current.filter(m => 
      Date.now() - m.timestamp.getTime() < 60 * 60 * 1000
    );

    return {
      last24Hours: {
        totalRequests: last24Hours.length,
        successRate: last24Hours.length > 0 
          ? last24Hours.filter(m => m.success).length / last24Hours.length 
          : 0,
        averageResponseTime: last24Hours.length > 0
          ? last24Hours.reduce((sum, m) => sum + m.responseTime, 0) / last24Hours.length
          : 0,
        cacheHitRate: last24Hours.length > 0
          ? last24Hours.filter(m => m.cacheHit).length / last24Hours.length
          : 0
      },
      last1Hour: {
        totalRequests: last1Hour.length,
        successRate: last1Hour.length > 0 
          ? last1Hour.filter(m => m.success).length / last1Hour.length 
          : 0,
        averageResponseTime: last1Hour.length > 0
          ? last1Hour.reduce((sum, m) => sum + m.responseTime, 0) / last1Hour.length
          : 0,
        cacheHitRate: last1Hour.length > 0
          ? last1Hour.filter(m => m.cacheHit).length / last1Hour.length
          : 0
      }
    };
  }, []);

  // Resolve an alert
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true }
          : alert
      )
    );
  }, []);

  // Clear resolved alerts
  const clearResolvedAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => !alert.resolved));
  }, []);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    startTime.current = new Date();
  }, []);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Periodic health check
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      updateSystemHealth();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isMonitoring, updateSystemHealth]);

  return {
    systemHealth,
    alerts: alerts.filter(alert => !alert.resolved),
    allAlerts: alerts,
    isMonitoring,
    recordMetric,
    getPerformanceReport,
    resolveAlert,
    clearResolvedAlerts,
    startMonitoring,
    stopMonitoring,
    updateSystemHealth
  };
};
