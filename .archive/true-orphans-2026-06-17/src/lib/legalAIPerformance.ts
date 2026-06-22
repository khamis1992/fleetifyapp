/**
 * Performance Monitoring for Legal AI System
 * Tracks query performance, API costs, and system health
 */

export interface LegalAIPerformanceMetrics {
  queryId: string;
  queryType: 'consultation' | 'document' | 'risk_analysis';
  startTime: number;
  endTime: number;
  duration: number;
  tokensUsed: number;
  costUSD: number;
  success: boolean;
  errorMessage?: string;
  customerId?: string;
  country: string;
}

export interface LegalAIPerformanceStats {
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageDuration: number;
  totalTokensUsed: number;
  totalCostUSD: number;
  queryTypeBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}

class LegalAIPerformanceMonitor {
  private metrics: LegalAIPerformanceMetrics[] = [];
  private maxMetricsStored = 1000;
  private performanceThresholds = {
    queryDuration: 3000, // 3 seconds
    dailyCostLimit: 50, // $50 per day
    hourlyQueryLimit: 100, // 100 queries per hour
  };

  /**
   * Start tracking a query
   */
  startQuery(queryId: string, queryType: LegalAIPerformanceMetrics['queryType'], country: string = 'kuwait') {
    return {
      queryId,
      queryType,
      country,
      startTime: performance.now(),
    };
  }

  /**
   * End tracking and record metrics
   */
  endQuery(
    tracking: ReturnType<typeof this.startQuery>,
    result: {
      success: boolean;
      tokensUsed: number;
      costUSD: number;
      customerId?: string;
      errorMessage?: string;
    }
  ) {
    const endTime = performance.now();
    const duration = endTime - tracking.startTime;

    const metric: LegalAIPerformanceMetrics = {
      ...tracking,
      endTime,
      duration,
      ...result,
    };

    this.recordMetric(metric);
    this.checkPerformanceThresholds(metric);

    return metric;
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: LegalAIPerformanceMetrics) {
    this.metrics.push(metric);

    // Keep only last N metrics to prevent memory issues
    if (this.metrics.length > this.maxMetricsStored) {
      this.metrics = this.metrics.slice(-this.maxMetricsStored);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('🔍 Legal AI Query Performance:', {
        type: metric.queryType,
        duration: `${metric.duration.toFixed(2)}ms`,
        tokens: metric.tokensUsed,
        cost: `$${metric.costUSD.toFixed(4)}`,
        success: metric.success,
      });
    }

    // Store in localStorage for persistence
    this.persistMetrics();
  }

  /**
   * Check if performance thresholds are exceeded
   */
  private checkPerformanceThresholds(metric: LegalAIPerformanceMetrics) {
    // Check query duration
    if (metric.duration > this.performanceThresholds.queryDuration) {
      console.warn(`⚠️ Slow Legal AI query detected: ${metric.duration.toFixed(2)}ms`);
      
      // Could trigger an alert or log to monitoring service
      this.logSlowQuery(metric);
    }

    // Check daily cost limit
    const dailyCost = this.getDailyCost();
    if (dailyCost > this.performanceThresholds.dailyCostLimit) {
      console.warn(`⚠️ Daily cost limit exceeded: $${dailyCost.toFixed(2)}`);
      
      // Could trigger an alert to admin
      this.logCostAlert(dailyCost);
    }

    // Check hourly query limit
    const hourlyQueries = this.getHourlyQueryCount();
    if (hourlyQueries > this.performanceThresholds.hourlyQueryLimit) {
      console.warn(`⚠️ Hourly query limit exceeded: ${hourlyQueries} queries`);
      
      // Could trigger rate limiting
      this.logRateLimitAlert(hourlyQueries);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(timeRange: 'hour' | 'day' | 'week' | 'all' = 'all'): LegalAIPerformanceStats {
    const filteredMetrics = this.filterMetricsByTimeRange(timeRange);

    if (filteredMetrics.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageDuration: 0,
        totalTokensUsed: 0,
        totalCostUSD: 0,
        queryTypeBreakdown: {},
        countryBreakdown: {},
      };
    }

    const totalQueries = filteredMetrics.length;
    const successfulQueries = filteredMetrics.filter(m => m.success).length;
    const failedQueries = totalQueries - successfulQueries;
    const averageDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries;
    const totalTokensUsed = filteredMetrics.reduce((sum, m) => sum + m.tokensUsed, 0);
    const totalCostUSD = filteredMetrics.reduce((sum, m) => sum + m.costUSD, 0);

    // Query type breakdown
    const queryTypeBreakdown: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      queryTypeBreakdown[m.queryType] = (queryTypeBreakdown[m.queryType] || 0) + 1;
    });

    // Country breakdown
    const countryBreakdown: Record<string, number> = {};
    filteredMetrics.forEach(m => {
      countryBreakdown[m.country] = (countryBreakdown[m.country] || 0) + 1;
    });

    return {
      totalQueries,
      successfulQueries,
      failedQueries,
      averageDuration,
      totalTokensUsed,
      totalCostUSD,
      queryTypeBreakdown,
      countryBreakdown,
    };
  }

  /**
   * Filter metrics by time range
   */
  private filterMetricsByTimeRange(timeRange: 'hour' | 'day' | 'week' | 'all') {
    if (timeRange === 'all') return this.metrics;

    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    return this.metrics.filter(m => m.endTime > cutoff);
  }

  /**
   * Get daily cost
   */
  private getDailyCost(): number {
    const stats = this.getStats('day');
    return stats.totalCostUSD;
  }

  /**
   * Get hourly query count
   */
  private getHourlyQueryCount(): number {
    const stats = this.getStats('hour');
    return stats.totalQueries;
  }

  /**
   * Log slow query for analysis
   */
  private logSlowQuery(metric: LegalAIPerformanceMetrics) {
    // In production, send to monitoring service (e.g., Sentry, DataDog)
    if (import.meta.env.PROD) {
      // Example: sendToMonitoring('slow_query', metric);
    }
  }

  /**
   * Log cost alert
   */
  private logCostAlert(dailyCost: number) {
    // In production, send alert to admin
    if (import.meta.env.PROD) {
      // Example: sendAdminAlert('cost_limit_exceeded', { dailyCost });
    }
  }

  /**
   * Log rate limit alert
   */
  private logRateLimitAlert(hourlyQueries: number) {
    // In production, trigger rate limiting
    if (import.meta.env.PROD) {
      // Example: enableRateLimiting({ hourlyQueries });
    }
  }

  /**
   * Persist metrics to localStorage
   */
  private persistMetrics() {
    try {
      const recentMetrics = this.metrics.slice(-100); // Store last 100 only
      localStorage.setItem('legalAIMetrics', JSON.stringify(recentMetrics));
    } catch (error) {
      console.error('Failed to persist metrics:', error);
    }
  }

  /**
   * Load metrics from localStorage
   */
  loadPersistedMetrics() {
    try {
      const stored = localStorage.getItem('legalAIMetrics');
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load persisted metrics:', error);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    localStorage.removeItem('legalAIMetrics');
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const hourStats = this.getStats('hour');
    const dayStats = this.getStats('day');
    const weekStats = this.getStats('week');

    return {
      summary: {
        last_hour: {
          queries: hourStats.totalQueries,
          success_rate: hourStats.totalQueries > 0 
            ? (hourStats.successfulQueries / hourStats.totalQueries * 100).toFixed(2) + '%'
            : '0%',
          avg_duration: `${hourStats.averageDuration.toFixed(2)}ms`,
          total_cost: `$${hourStats.totalCostUSD.toFixed(4)}`,
        },
        last_day: {
          queries: dayStats.totalQueries,
          success_rate: dayStats.totalQueries > 0
            ? (dayStats.successfulQueries / dayStats.totalQueries * 100).toFixed(2) + '%'
            : '0%',
          avg_duration: `${dayStats.averageDuration.toFixed(2)}ms`,
          total_cost: `$${dayStats.totalCostUSD.toFixed(4)}`,
        },
        last_week: {
          queries: weekStats.totalQueries,
          success_rate: weekStats.totalQueries > 0
            ? (weekStats.successfulQueries / weekStats.totalQueries * 100).toFixed(2) + '%'
            : '0%',
          avg_duration: `${weekStats.averageDuration.toFixed(2)}ms`,
          total_cost: `$${weekStats.totalCostUSD.toFixed(4)}`,
        },
      },
      thresholds: this.performanceThresholds,
      alerts: {
        slow_queries: this.metrics.filter(m => m.duration > this.performanceThresholds.queryDuration).length,
        cost_alerts: dayStats.totalCostUSD > this.performanceThresholds.dailyCostLimit,
        rate_limit_alerts: hourStats.totalQueries > this.performanceThresholds.hourlyQueryLimit,
      },
    };
  }
}

// Export singleton instance
export const legalAIPerformanceMonitor = new LegalAIPerformanceMonitor();

// Load persisted metrics on initialization
legalAIPerformanceMonitor.loadPersistedMetrics();
