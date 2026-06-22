/**
 * Application Performance Monitoring (APM)
 * Provides detailed performance tracking and analysis
 */

import { monitoring, PerformanceMetric, TraceContext } from '../monitoring/core';

export interface APMMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    operation?: string;
  };
}

export interface DatabasePerformanceMetric {
  query: string;
  duration: number;
  rowCount?: number;
  indexUsed?: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface APIPerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  requestSize?: number;
  responseSize?: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface RenderPerformanceMetric {
  component: string;
  renderTime: number;
  reRenderCount: number;
  propsCount: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class APMService {
  private traces: Map<string, TraceContext> = new Map();
  private databaseMetrics: DatabasePerformanceMetric[] = [];
  private apiMetrics: APIPerformanceMetric[] = [];
  private renderMetrics: RenderPerformanceMetric[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor() {
    this.initializeAPM();
  }

  private initializeAPM(): void {
    // Setup automatic performance monitoring
    this.setupAPITracking();
    this.setupRenderTracking();
    this.setupDatabaseTracking();
    this.setupResourceTracking();
  }

  // API Performance Tracking
  trackAPIPerformance(metric: APIPerformanceMetric): void {
    const enrichedMetric: APIPerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
      tags: {
        ...metric.tags,
        endpoint: metric.endpoint,
        method: metric.method,
        status: metric.statusCode.toString()
      }
    };

    this.apiMetrics.push(enrichedMetric);

    // Track as general performance metric
    monitoring.trackPerformance({
      name: 'api.response_time',
      value: metric.duration,
      unit: 'milliseconds',
      timestamp: enrichedMetric.timestamp,
      tags: enrichedMetric.tags,
      context: {
        operation: `${metric.method} ${metric.endpoint}`,
        requestId: metric.tags?.requestId
      }
    });

    // Check for performance issues
    this.checkAPIPerformance(enrichedMetric);

    // Cleanup old metrics
    this.cleanupAPIMetrics();
  }

  // Database Performance Tracking
  trackDatabasePerformance(metric: DatabasePerformanceMetric): void {
    const enrichedMetric: DatabasePerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
      tags: {
        ...metric.tags,
        operation: this.extractDatabaseOperation(metric.query)
      }
    };

    this.databaseMetrics.push(enrichedMetric);

    // Track as general performance metric
    monitoring.trackPerformance({
      name: 'database.query_time',
      value: metric.duration,
      unit: 'milliseconds',
      timestamp: enrichedMetric.timestamp,
      tags: enrichedMetric.tags,
      context: {
        operation: `Database: ${metric.query.substring(0, 50)}...`
      }
    });

    // Check for slow queries
    this.checkDatabasePerformance(enrichedMetric);

    // Cleanup old metrics
    this.cleanupDatabaseMetrics();
  }

  // Render Performance Tracking
  trackRenderPerformance(metric: RenderPerformanceMetric): void {
    const enrichedMetric: RenderPerformanceMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now()
    };

    this.renderMetrics.push(enrichedMetric);

    // Track as general performance metric
    monitoring.trackPerformance({
      name: 'render.component_time',
      value: metric.renderTime,
      unit: 'milliseconds',
      timestamp: enrichedMetric.timestamp,
      tags: {
        ...metric.tags,
        component: metric.component
      },
      context: {
        operation: `Render: ${metric.component}`
      }
    });

    // Check for render issues
    this.checkRenderPerformance(enrichedMetric);

    // Cleanup old metrics
    this.cleanupRenderMetrics();
  }

  // Core Web Vitals Tracking
  trackCoreWebVitals(): void {
    if (!window.PerformanceObserver) return;

    // Track Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      monitoring.trackPerformance({
        name: 'web_vitals.lcp',
        value: lastEntry.startTime,
        unit: 'milliseconds',
        tags: { metric: 'LCP' },
        context: { operation: 'Core Web Vitals' }
      });
    });

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        monitoring.trackPerformance({
          name: 'web_vitals.fid',
          value: entry.processingStart - entry.startTime,
          unit: 'milliseconds',
          tags: { metric: 'FID' },
          context: { operation: 'Core Web Vitals' }
        });
      });
    });

    fidObserver.observe({ entryTypes: ['first-input'] });

    // Track Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });

      monitoring.trackPerformance({
        name: 'web_vitals.cls',
        value: clsValue,
        unit: 'score',
        tags: { metric: 'CLS' },
        context: { operation: 'Core Web Vitals' }
      });
    });

    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  // Memory Usage Tracking
  trackMemoryUsage(): void {
    if (!(performance as any).memory) return;

    const memory = (performance as any).memory;

    monitoring.trackPerformance({
      name: 'memory.used_heap_size',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      tags: { type: 'memory', metric: 'used_heap' }
    });

    monitoring.trackPerformance({
      name: 'memory.total_heap_size',
      value: memory.totalJSHeapSize,
      unit: 'bytes',
      tags: { type: 'memory', metric: 'total_heap' }
    });

    monitoring.trackPerformance({
      name: 'memory.heap_limit',
      value: memory.jsHeapSizeLimit,
      unit: 'bytes',
      tags: { type: 'memory', metric: 'heap_limit' }
    });

    // Calculate memory usage percentage
    const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    monitoring.trackPerformance({
      name: 'memory.usage_percentage',
      value: usagePercentage,
      unit: 'percentage',
      tags: { type: 'memory', metric: 'usage_percent' }
    });
  }

  // Network Performance Tracking
  trackNetworkPerformance(): void {
    if (!(navigator as any).connection) return;

    const connection = (navigator as any).connection;

    monitoring.trackPerformance({
      name: 'network.effective_type',
      value: connection.effectiveType,
      unit: 'string',
      tags: { type: 'network', metric: 'effective_type' }
    });

    monitoring.trackPerformance({
      name: 'network.downlink',
      value: connection.downlink,
      unit: 'mbps',
      tags: { type: 'network', metric: 'downlink' }
    });

    monitoring.trackPerformance({
      name: 'network.rtt',
      value: connection.rtt,
      unit: 'milliseconds',
      tags: { type: 'network', metric: 'rtt' }
    });

    if (connection.saveData) {
      monitoring.trackPerformance({
        name: 'network.save_data',
        value: connection.saveData ? 1 : 0,
        unit: 'boolean',
        tags: { type: 'network', metric: 'save_data' }
      });
    }
  }

  // Custom Performance Marks
  mark(name: string): void {
    this.performanceMarks.set(name, performance.now());
  }

  measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? this.performanceMarks.get(startMark) : 0;
    const duration = endTime - (startTime || 0);

    monitoring.trackPerformance({
      name: `custom.${name}`,
      value: duration,
      unit: 'milliseconds',
      tags: { type: 'custom', metric: name },
      context: { operation: `Custom: ${name}` }
    });

    return duration;
  }

  // Performance Analysis
  getPerformanceSummary(): {
    api: { avgResponseTime: number; errorRate: number; requestCount: number };
    database: { avgQueryTime: number; slowQueryCount: number; queryCount: number };
    render: { avgRenderTime: number; reRenderCount: number; componentCount: number };
    memory: { usedHeap: number; totalHeap: number; usagePercentage: number };
  } {
    const now = Date.now();
    const recentTime = now - 300000; // Last 5 minutes

    // API Summary
    const recentAPIMetrics = this.apiMetrics.filter(m => m.timestamp > recentTime);
    const avgResponseTime = recentAPIMetrics.length > 0
      ? recentAPIMetrics.reduce((sum, m) => sum + m.duration, 0) / recentAPIMetrics.length
      : 0;
    const errorRate = recentAPIMetrics.length > 0
      ? recentAPIMetrics.filter(m => m.statusCode >= 400).length / recentAPIMetrics.length
      : 0;

    // Database Summary
    const recentDBMetrics = this.databaseMetrics.filter(m => m.timestamp > recentTime);
    const avgQueryTime = recentDBMetrics.length > 0
      ? recentDBMetrics.reduce((sum, m) => sum + m.duration, 0) / recentDBMetrics.length
      : 0;
    const slowQueryCount = recentDBMetrics.filter(m => m.duration > 1000).length;

    // Render Summary
    const recentRenderMetrics = this.renderMetrics.filter(m => m.timestamp > recentTime);
    const avgRenderTime = recentRenderMetrics.length > 0
      ? recentRenderMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentRenderMetrics.length
      : 0;
    const totalRerenders = recentRenderMetrics.reduce((sum, m) => sum + m.reRenderCount, 0);

    // Memory Summary
    const memory = (performance as any).memory || {};
    const usedHeap = memory.usedJSHeapSize || 0;
    const totalHeap = memory.totalJSHeapSize || 0;
    const usagePercentage = totalHeap > 0 ? (usedHeap / totalHeap) * 100 : 0;

    return {
      api: {
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: Math.round(errorRate * 10000) / 100, // Convert to percentage with 2 decimal places
        requestCount: recentAPIMetrics.length
      },
      database: {
        avgQueryTime: Math.round(avgQueryTime),
        slowQueryCount,
        queryCount: recentDBMetrics.length
      },
      render: {
        avgRenderTime: Math.round(avgRenderTime),
        reRenderCount: totalRerenders,
        componentCount: recentRenderMetrics.length
      },
      memory: {
        usedHeap,
        totalHeap,
        usagePercentage: Math.round(usagePercentage * 100) / 100
      }
    };
  }

  // Private Methods
  private setupAPITracking(): void {
    // Intercept fetch calls for API tracking
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const [url, options] = args;

      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();

        // Track API performance
        this.trackAPIPerformance({
          endpoint: typeof url === 'string' ? url : url.toString(),
          method: options?.method || 'GET',
          statusCode: response.status,
          duration: endTime - startTime,
          requestSize: options?.body ? JSON.stringify(options.body).length : undefined,
          responseSize: response.headers.get('content-length') ?
            parseInt(response.headers.get('content-length')!) : undefined,
          tags: {
            requestId: options?.headers?.['x-request-id'] as string
          }
        });

        return response;
      } catch (error) {
        const endTime = performance.now();

        // Track failed API calls
        this.trackAPIPerformance({
          endpoint: typeof url === 'string' ? url : url.toString(),
          method: options?.method || 'GET',
          statusCode: 0,
          duration: endTime - startTime,
          tags: {
            error: 'network_error',
            requestId: options?.headers?.['x-request-id'] as string
          }
        });

        throw error;
      }
    };
  }

  private setupRenderTracking(): void {
    // This would be integrated with React DevTools or custom render tracking
    // For now, we'll track component mounts manually
    if (typeof window !== 'undefined') {
      window.addEventListener('react-component-mounted', ((event: any) => {
        this.trackRenderPerformance({
          component: event.detail.componentName,
          renderTime: event.detail.renderTime,
          reRenderCount: 0,
          propsCount: event.detail.propsCount
        });
      }) as EventListener);
    }
  }

  private setupDatabaseTracking(): void {
    // This would integrate with Supabase client to track database queries
    // For now, we'll provide a method to manually track queries
  }

  private setupResourceTracking(): void {
    if (!window.PerformanceObserver) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;

          monitoring.trackPerformance({
            name: 'resource.load_time',
            value: resource.responseEnd - resource.startTime,
            unit: 'milliseconds',
            tags: {
              resource_type: this.getResourceType(resource.name),
              resource_name: resource.name.split('/').pop() || 'unknown'
            }
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private checkAPIPerformance(metric: APIPerformanceMetric): void {
    // Check for slow responses
    if (metric.duration > 5000) { // 5 seconds
      monitoring.trackError(
        new Error(`Slow API response: ${metric.method} ${metric.endpoint} took ${metric.duration}ms`),
        {
          url: metric.endpoint,
          component: 'api',
          action: 'slow_response',
          additionalData: {
            method: metric.method,
            duration: metric.duration,
            statusCode: metric.statusCode
          }
        }
      );
    }

    // Check for HTTP errors
    if (metric.statusCode >= 400) {
      monitoring.trackError(
        new Error(`HTTP Error: ${metric.method} ${metric.endpoint} returned ${metric.statusCode}`),
        {
          url: metric.endpoint,
          component: 'api',
          action: 'http_error',
          additionalData: {
            method: metric.method,
            statusCode: metric.statusCode
          }
        }
      );
    }
  }

  private checkDatabasePerformance(metric: DatabasePerformanceMetric): void {
    // Check for slow queries
    if (metric.duration > 1000) { // 1 second
      monitoring.trackError(
        new Error(`Slow database query: ${metric.query.substring(0, 100)}... took ${metric.duration}ms`),
        {
          component: 'database',
          action: 'slow_query',
          additionalData: {
            query: metric.query.substring(0, 200),
            duration: metric.duration,
            rowCount: metric.rowCount
          }
        }
      );
    }
  }

  private checkRenderPerformance(metric: RenderPerformanceMetric): void {
    // Check for slow renders
    if (metric.renderTime > 100) { // 100ms
      monitoring.trackError(
        new Error(`Slow component render: ${metric.component} took ${metric.renderTime}ms`),
        {
          component: metric.component,
          action: 'slow_render',
          additionalData: {
            renderTime: metric.renderTime,
            reRenderCount: metric.reRenderCount,
            propsCount: metric.propsCount
          }
        }
      );
    }

    // Check for excessive re-renders
    if (metric.reRenderCount > 10) {
      monitoring.trackError(
        new Error(`Excessive re-renders: ${metric.component} re-rendered ${metric.reRenderCount} times`),
        {
          component: metric.component,
          action: 'excessive_rerenders',
          additionalData: {
            reRenderCount: metric.reRenderCount,
            renderTime: metric.renderTime
          }
        }
      );
    }
  }

  private extractDatabaseOperation(query: string): string {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.startsWith('select')) return 'select';
    if (normalizedQuery.startsWith('insert')) return 'insert';
    if (normalizedQuery.startsWith('update')) return 'update';
    if (normalizedQuery.startsWith('delete')) return 'delete';
    if (normalizedQuery.startsWith('create')) return 'create';
    if (normalizedQuery.startsWith('alter')) return 'alter';
    if (normalizedQuery.startsWith('drop')) return 'drop';
    return 'other';
  }

  private getResourceType(url: string): string {
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.js')) return 'script';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private cleanupAPIMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoffTime);
  }

  private cleanupDatabaseMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    this.databaseMetrics = this.databaseMetrics.filter(m => m.timestamp > cutoffTime);
  }

  private cleanupRenderMetrics(): void {
    const cutoffTime = Date.now() - 1800000; // Keep last 30 minutes
    this.renderMetrics = this.renderMetrics.filter(m => m.timestamp > cutoffTime);
  }

  // Public API for accessing APM data
  getAPIMetrics(): APIPerformanceMetric[] {
    return [...this.apiMetrics];
  }

  getDatabaseMetrics(): DatabasePerformanceMetric[] {
    return [...this.databaseMetrics];
  }

  getRenderMetrics(): RenderPerformanceMetric[] {
    return [...this.renderMetrics];
  }
}

// Create singleton instance
export const apm = new APMService();

// Export utility functions
export const trackAPICall = (endpoint: string, method: string, statusCode: number, duration: number) => {
  apm.trackAPIPerformance({
    endpoint,
    method,
    statusCode,
    duration,
    timestamp: Date.now()
  });
};

export const trackDatabaseQuery = (query: string, duration: number, rowCount?: number) => {
  apm.trackDatabasePerformance({
    query,
    duration,
    rowCount,
    timestamp: Date.now()
  });
};

export const trackComponentRender = (componentName: string, renderTime: number, reRenderCount: number = 0, propsCount: number = 0) => {
  apm.trackRenderPerformance({
    component: componentName,
    renderTime,
    reRenderCount,
    propsCount,
    timestamp: Date.now()
  });
};

// Start Core Web Vitals tracking automatically
if (typeof window !== 'undefined') {
  apm.trackCoreWebVitals();

  // Track memory usage every 30 seconds
  setInterval(() => {
    apm.trackMemoryUsage();
    apm.trackNetworkPerformance();
  }, 30000);
}