/**
 * API Performance Monitoring System
 *
 * Real-time metrics collection and analysis for API performance
 * Provides insights into response times, error rates, and system health
 * Optimized for production monitoring and alerting
 */

import { logger } from '@/lib/logger';

export interface PerformanceMetric {
  name: string;
  timestamp: number;
  duration: number;
  success: boolean;
  statusCode?: number;
  method?: string;
  url?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  slowestRequests: PerformanceMetric[];
  fastestRequests: PerformanceMetric[];
  recentErrors: PerformanceMetric[];
}

export interface AlertRule {
  name: string;
  condition: (stats: PerformanceStats) => boolean;
  threshold: number;
  enabled: boolean;
  cooldownMs: number;
  lastTriggered?: number;
}

export interface PerformanceAlert {
  id: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stats: PerformanceStats;
  timestamp: number;
}

/**
 * Performance Monitor for API metrics
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private listeners: Array<(alert: PerformanceAlert) => void> = [];

  private config: {
    maxMetrics: number;
    maxAlerts: number;
    statsWindowMs: number;
    enableRealTimeStats: boolean;
    enableAlerts: boolean;
  };

  constructor(config: Partial<typeof PerformanceMonitor.prototype.config> = {}) {
    this.config = {
      maxMetrics: config.maxMetrics || 10000,
      maxAlerts: config.maxAlerts || 1000,
      statsWindowMs: config.statsWindowMs || 5 * 60 * 1000, // 5 minutes
      enableRealTimeStats: config.enableRealTimeStats ?? true,
      enableAlerts: config.enableAlerts ?? true,
      ...config
    };

    this.setupDefaultAlertRules();
    this.startRealTimeMonitoring();

    logger.info('PerformanceMonitor initialized', {
      config: this.config
    });
  }

  /**
   * Record a performance metric
   */
  record(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);

    // Maintain metrics size limit
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    // Check alerts if enabled
    if (this.config.enableAlerts) {
      this.checkAlerts();
    }

    logger.debug('Performance metric recorded', {
      name: metric.name,
      duration: metric.duration,
      success: metric.success
    });
  }

  /**
   * Start timing a request
   */
  startTimer(name: string, metadata?: Record<string, any>): () => PerformanceMetric {
    const startTime = performance.now();

    return (options?: {
      success?: boolean;
      statusCode?: number;
      method?: string;
      url?: string;
    }) => {
      const duration = performance.now() - startTime;
      const metric: PerformanceMetric = {
        name,
        timestamp: Date.now(),
        duration,
        success: options?.success ?? true,
        statusCode: options?.statusCode,
        method: options?.method,
        url: options?.url,
        metadata
      };

      this.record(metric);
      return metric;
    };
  }

  /**
   * Get performance statistics
   */
  getStats(windowMs?: number): PerformanceStats {
    const now = Date.now();
    const window = windowMs || this.config.statsWindowMs;
    const cutoff = now - window;

    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);
    const successfulMetrics = recentMetrics.filter(m => m.success);
    const durations = recentMetrics.map(m => m.duration);

    // Calculate percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50 = this.getPercentile(sortedDurations, 0.5);
    const p95 = this.getPercentile(sortedDurations, 0.95);
    const p99 = this.getPercentile(sortedDurations, 0.99);

    // Calculate requests per second
    const requestsPerSecond = recentMetrics.length / (window / 1000);

    // Get slowest and fastest requests
    const slowestRequests = recentMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    const fastestRequests = recentMetrics
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 10);

    // Get recent errors
    const recentErrors = recentMetrics
      .filter(m => !m.success)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      totalRequests: recentMetrics.length,
      successfulRequests: successfulMetrics.length,
      failedRequests: recentMetrics.length - successfulMetrics.length,
      averageResponseTime: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50ResponseTime: p50,
      p95ResponseTime: p95,
      p99ResponseTime: p99,
      requestsPerSecond,
      errorRate: recentMetrics.length > 0
        ? (recentMetrics.length - successfulMetrics.length) / recentMetrics.length
        : 0,
      slowestRequests,
      fastestRequests,
      recentErrors
    };
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string, windowMs?: number): PerformanceMetric[] {
    const cutoff = Date.now() - (windowMs || this.config.statsWindowMs);
    return this.metrics.filter(m => m.name === name && m.timestamp >= cutoff);
  }

  /**
   * Get performance trends
   */
  getTrends(timeframeMs: number = 60 * 60 * 1000): {
    responseTime: Array<{ timestamp: number; value: number }>;
    errorRate: Array<{ timestamp: number; value: number }>;
    requestRate: Array<{ timestamp: number; value: number }>;
  } {
    const now = Date.now();
    const cutoff = now - timeframeMs;
    const bucketSize = timeframeMs / 60; // 60 data points

    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoff);

    const buckets = new Map<number, PerformanceMetric[]>();

    // Group metrics into time buckets
    for (const metric of recentMetrics) {
      const bucketTime = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, []);
      }
      buckets.get(bucketTime)!.push(metric);
    }

    const sortedBuckets = Array.from(buckets.keys()).sort();

    return {
      responseTime: sortedBuckets.map(timestamp => {
        const bucketMetrics = buckets.get(timestamp)!;
        const avgResponseTime = bucketMetrics.length > 0
          ? bucketMetrics.reduce((sum, m) => sum + m.duration, 0) / bucketMetrics.length
          : 0;
        return { timestamp, value: avgResponseTime };
      }),
      errorRate: sortedBuckets.map(timestamp => {
        const bucketMetrics = buckets.get(timestamp)!;
        const errorRate = bucketMetrics.length > 0
          ? bucketMetrics.filter(m => !m.success).length / bucketMetrics.length
          : 0;
        return { timestamp, value: errorRate };
      }),
      requestRate: sortedBuckets.map(timestamp => {
        const bucketMetrics = buckets.get(timestamp)!;
        return {
          timestamp,
          value: bucketMetrics.length / (bucketSize / 1000) // requests per second
        };
      })
    };
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.name, rule);

    logger.info('Alert rule added', {
      name: rule.name,
      threshold: rule.threshold,
      enabled: rule.enabled
    });
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(name: string): boolean {
    return this.alertRules.delete(name);
  }

  /**
   * Get all alerts
   */
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    let alerts = this.alerts;

    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add alert listener
   */
  addAlertListener(listener: (alert: PerformanceAlert) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove alert listener
   */
  removeAlertListener(listener: (alert: PerformanceAlert) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];

    logger.info('Performance metrics cleared');
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];

    logger.info('Performance alerts cleared');
  }

  /**
   * Get system health
   */
  getHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    issues: string[];
  } {
    const stats = this.getStats();
    const issues: string[] = [];
    let score = 100;

    // Check error rate
    if (stats.errorRate > 0.1) { // 10%
      issues.push(`High error rate: ${(stats.errorRate * 100).toFixed(1)}%`);
      score -= 30;
    } else if (stats.errorRate > 0.05) { // 5%
      issues.push(`Elevated error rate: ${(stats.errorRate * 100).toFixed(1)}%`);
      score -= 15;
    }

    // Check response time
    if (stats.p95ResponseTime > 5000) { // 5 seconds
      issues.push(`Slow response time: P95 ${stats.p95ResponseTime.toFixed(0)}ms`);
      score -= 25;
    } else if (stats.p95ResponseTime > 2000) { // 2 seconds
      issues.push(`Elevated response time: P95 ${stats.p95ResponseTime.toFixed(0)}ms`);
      score -= 10;
    }

    // Check request rate
    if (stats.requestsPerSecond > 1000) {
      issues.push(`High request rate: ${stats.requestsPerSecond.toFixed(1)} req/s`);
      score -= 10;
    }

    const status = score >= 80 ? 'healthy' : score >= 50 ? 'warning' : 'critical';

    return { status, score, issues };
  }

  /**
   * Export metrics for external monitoring
   */
  exportMetrics(): {
    timestamp: number;
    stats: PerformanceStats;
    health: ReturnType<PerformanceMonitor['getHealth']>;
    metricsCount: number;
    alertsCount: number;
  } {
    return {
      timestamp: Date.now(),
      stats: this.getStats(),
      health: this.getHealth(),
      metricsCount: this.metrics.length,
      alertsCount: this.alerts.length
    };
  }

  /**
   * Destroy monitor instance
   */
  destroy(): void {
    this.clearMetrics();
    this.clearAlerts();
    this.alertRules.clear();
    this.listeners = [];

    logger.info('PerformanceMonitor destroyed');
  }

  // ============ Private Methods ============

  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      name: 'high_error_rate',
      condition: (stats) => stats.errorRate > 0.05, // 5%
      threshold: 0.05,
      enabled: true,
      cooldownMs: 60 * 1000 // 1 minute
    });

    // Slow response time alert
    this.addAlertRule({
      name: 'slow_response_time',
      condition: (stats) => stats.p95ResponseTime > 3000, // 3 seconds
      threshold: 3000,
      enabled: true,
      cooldownMs: 60 * 1000 // 1 minute
    });

    // High request rate alert
    this.addAlertRule({
      name: 'high_request_rate',
      condition: (stats) => stats.requestsPerSecond > 500,
      threshold: 500,
      enabled: true,
      cooldownMs: 30 * 1000 // 30 seconds
    });

    // Critical error rate alert
    this.addAlertRule({
      name: 'critical_error_rate',
      condition: (stats) => stats.errorRate > 0.15, // 15%
      threshold: 0.15,
      enabled: true,
      cooldownMs: 30 * 1000 // 30 seconds
    });
  }

  private startRealTimeMonitoring(): void {
    if (!this.config.enableRealTimeStats) {
      return;
    }

    // Update stats every 5 seconds
    setInterval(() => {
      const stats = this.getStats();
      const health = this.getHealth();

      // Log health status periodically
      if (health.status !== 'healthy') {
        logger.warn('Performance health degraded', {
          status: health.status,
          score: health.score,
          issues: health.issues
        });
      }
    }, 5000);
  }

  private checkAlerts(): void {
    const stats = this.getStats();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered && Date.now() - rule.lastTriggered < rule.cooldownMs) {
        continue;
      }

      // Check condition
      if (rule.condition(stats)) {
        this.triggerAlert(rule, stats);
      }
    }
  }

  private triggerAlert(rule: AlertRule, stats: PerformanceStats): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      ruleName: rule.name,
      severity: this.determineSeverity(rule, stats),
      message: this.createAlertMessage(rule, stats),
      stats,
      timestamp: Date.now()
    };

    this.alerts.push(alert);

    // Maintain alerts size limit
    if (this.alerts.length > this.config.maxAlerts) {
      this.alerts = this.alerts.slice(-this.config.maxAlerts);
    }

    // Update rule cooldown
    rule.lastTriggered = Date.now();

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('Alert listener error', { error, alertId: alert.id });
      }
    });

    logger.warn('Performance alert triggered', {
      id: alert.id,
      rule: rule.name,
      severity: alert.severity,
      message: alert.message
    });
  }

  private determineSeverity(rule: AlertRule, stats: PerformanceStats): PerformanceAlert['severity'] {
    // Determine severity based on how much the condition is violated
    if (rule.name === 'critical_error_rate' || stats.errorRate > 0.2) {
      return 'critical';
    } else if (rule.name === 'high_error_rate' || stats.p95ResponseTime > 5000) {
      return 'high';
    } else if (rule.name === 'slow_response_time' || stats.requestsPerSecond > 1000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private createAlertMessage(rule: AlertRule, stats: PerformanceStats): string {
    switch (rule.name) {
      case 'high_error_rate':
        return `Error rate ${(stats.errorRate * 100).toFixed(1)}% exceeds threshold ${(rule.threshold * 100).toFixed(1)}%`;
      case 'critical_error_rate':
        return `Critical error rate ${(stats.errorRate * 100).toFixed(1)}% detected`;
      case 'slow_response_time':
        return `P95 response time ${stats.p95ResponseTime.toFixed(0)}ms exceeds threshold ${rule.threshold}ms`;
      case 'high_request_rate':
        return `Request rate ${stats.requestsPerSecond.toFixed(1)} req/s exceeds threshold ${rule.threshold}`;
      default:
        return `Alert rule ${rule.name} triggered`;
    }
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private generateAlertId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor({
  maxMetrics: 10000,
  maxAlerts: 1000,
  statsWindowMs: 5 * 60 * 1000, // 5 minutes
  enableRealTimeStats: true,
  enableAlerts: true
});

/**
 * Performance monitoring middleware for API calls
 */
export function createPerformanceMiddleware(monitor?: PerformanceMonitor) {
  const perfMonitor = monitor || globalPerformanceMonitor;

  return {
    startTiming: (name: string, metadata?: Record<string, any>) => {
      return perfMonitor.startTimer(name, metadata);
    },

    recordMetric: (metric: Omit<PerformanceMetric, 'timestamp'>) => {
      perfMonitor.record(metric);
    }
  };
}

export default PerformanceMonitor;