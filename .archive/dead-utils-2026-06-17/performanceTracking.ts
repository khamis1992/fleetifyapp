/**
 * Phase 7: Enhanced Performance Monitoring
 * 
 * Track and report performance metrics to Sentry
 */

import * as Sentry from '@sentry/react';

interface QueryMetrics {
  queryKey: string;
  executionTime: number;
  cacheHit: boolean;
  success: boolean;
  timestamp: number;
}

class PerformanceTracker {
  private metrics: QueryMetrics[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 3000; // 3 seconds
  private readonly MAX_METRICS_BUFFER = 100;

  /**
   * Track a query execution
   */
  trackQuery(queryKey: string, executionTime: number, cacheHit: boolean, success: boolean) {
    const metric: QueryMetrics = {
      queryKey,
      executionTime,
      cacheHit,
      success,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Report slow queries immediately
    if (executionTime > this.SLOW_QUERY_THRESHOLD) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Slow query detected: ${queryKey}`,
        level: 'warning',
        data: {
          executionTime,
          threshold: this.SLOW_QUERY_THRESHOLD,
          cacheHit,
        },
      });
    }

    // Keep buffer size manageable
    if (this.metrics.length > this.MAX_METRICS_BUFFER) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    if (this.metrics.length === 0) return null;

    const totalQueries = this.metrics.length;
    const successfulQueries = this.metrics.filter(m => m.success).length;
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const slowQueries = this.metrics.filter(m => m.executionTime > this.SLOW_QUERY_THRESHOLD).length;
    const avgExecutionTime = this.metrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;

    return {
      totalQueries,
      successRate: (successfulQueries / totalQueries) * 100,
      cacheHitRate: (cacheHits / totalQueries) * 100,
      slowQueryRate: (slowQueries / totalQueries) * 100,
      avgExecutionTime,
    };
  }

  /**
   * Report summary to Sentry
   */
  reportToSentry() {
    const summary = this.getSummary();
    if (!summary) return;

    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'Performance summary',
      level: 'info',
      data: summary,
    });
  }
}

export const performanceTracker = new PerformanceTracker();

// Report summary every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceTracker.reportToSentry();
  }, 5 * 60 * 1000);
}
