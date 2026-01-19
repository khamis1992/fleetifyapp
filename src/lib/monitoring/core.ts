/**
 * Advanced Monitoring Core System
 * Provides comprehensive application performance monitoring, error tracking, and business metrics
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
  context?: Record<string, any>;
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  component?: string;
  action?: string;
  additionalData?: Record<string, any>;
}

export interface UserEvent {
  type: 'click' | 'view' | 'form_submit' | 'navigation' | 'error';
  target: string;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, any>;
}

export interface BusinessMetric {
  name: string;
  value: number;
  category: 'fleet' | 'financial' | 'user' | 'operational';
  timestamp: number;
  dimensions?: Record<string, string>;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  operation: string;
  startTime: number;
  tags?: Record<string, string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  threshold: number;
  window: number; // time window in milliseconds
  enabled: boolean;
  notificationChannels: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  debug: boolean;
  endpoints: {
    metrics: string;
    logs: string;
    traces: string;
  };
  thresholds: {
    errorRate: number;
    responseTime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  retention: {
    metrics: number; // days
    logs: number; // days
    traces: number; // days
  };
}

class MonitoringCore {
  private config: MonitoringConfig;
  private metrics: PerformanceMetric[] = [];
  private errors: Array<{ error: Error; context?: ErrorContext; timestamp: number }> = [];
  private userEvents: UserEvent[] = [];
  private businessMetrics: BusinessMetric[] = [];
  private activeTraces: Map<string, TraceContext> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private isInitialized = false;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = {
      enabled: import.meta.env.PROD,
      sampleRate: 0.1, // 10% sampling
      debug: import.meta.env.DEV,
      endpoints: {
        metrics: '/api/monitoring/metrics',
        logs: '/api/monitoring/logs',
        traces: '/api/monitoring/traces'
      },
      thresholds: {
        errorRate: 0.01, // 1%
        responseTime: 2000, // 2 seconds
        cpuUsage: 80, // 80%
        memoryUsage: 85 // 85%
      },
      retention: {
        metrics: 30, // 30 days
        logs: 90, // 90 days
        traces: 7 // 7 days
      },
      ...config
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!this.config.enabled || this.isInitialized) return;

    try {
      // Initialize monitoring services
      await this.setupPerformanceObserver();
      await this.setupErrorHandling();
      await this.setupUserInteractionTracking();
      await this.startMetricsCollection();

      this.isInitialized = true;
      console.debug('[Monitoring] Advanced monitoring initialized');
    } catch (error) {
      console.error('[Monitoring] Failed to initialize:', error);
    }
  }

  // Performance Monitoring
  trackPerformance(metric: PerformanceMetric): void {
    if (!this.shouldSample()) return;

    const enrichedMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
      tags: {
        ...metric.tags,
        environment: import.meta.env.MODE,
        version: import.meta.env.VITE_APP_VERSION || '1.0.0'
      }
    };

    this.metrics.push(enrichedMetric);
    this.sendMetrics(enrichedMetric);

    // Check for performance thresholds
    this.checkPerformanceThresholds(enrichedMetric);
  }

  // Error Tracking
  trackError(error: Error, context?: ErrorContext): void {
    // Skip harmless errors from multi-tab scenarios
    const errorMessage = error?.message || '';
    const isIgnorableError = 
      errorMessage.includes('ServiceWorker') ||
      errorMessage.includes('CacheStorage') ||
      errorMessage.includes('The object is in an invalid state') ||
      errorMessage.includes('Failed to update a ServiceWorker');
    
    if (isIgnorableError) {
      // Silently skip these errors - they're harmless
      return;
    }
    
    const errorEntry = {
      error,
      context: {
        ...context,
        timestamp: Date.now(),
        environment: import.meta.env.MODE,
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      timestamp: Date.now()
    };

    this.errors.push(errorEntry);
    this.sendError(errorEntry);

    // Check error rate thresholds
    this.checkErrorThresholds();
  }

  // User Interaction Tracking
  trackUserInteraction(event: UserEvent): void {
    if (!this.shouldSample()) return;

    const enrichedEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      sessionId: event.sessionId || this.getSessionId()
    };

    this.userEvents.push(enrichedEvent);
    this.sendUserEvent(enrichedEvent);
  }

  // Business Metrics
  trackBusinessMetric(metric: BusinessMetric): void {
    const enrichedMetric = {
      ...metric,
      timestamp: metric.timestamp || Date.now(),
      dimensions: {
        ...metric.dimensions,
        environment: import.meta.env.MODE
      }
    };

    this.businessMetrics.push(enrichedMetric);
    this.sendBusinessMetric(enrichedMetric);
  }

  // Distributed Tracing
  startTrace(operation: string): TraceContext {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    const trace: TraceContext = {
      traceId,
      spanId,
      operation,
      startTime: performance.now(),
      tags: {
        environment: import.meta.env.MODE,
        service: 'fleetifyapp'
      }
    };

    this.activeTraces.set(traceId, trace);
    return trace;
  }

  endTrace(traceId: string, tags?: Record<string, string>): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) return;

    const duration = performance.now() - trace.startTime;
    const traceMetric: PerformanceMetric = {
      name: `trace.${trace.operation}`,
      value: duration,
      unit: 'milliseconds',
      timestamp: Date.now(),
      tags: { ...trace.tags, ...tags }
    };

    this.trackPerformance(traceMetric);
    this.activeTraces.delete(traceId);
  }

  // Alert Management
  createAlert(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  removeAlert(ruleId: string): void {
    this.alertRules.delete(ruleId);
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details: any }> {
    const checks = {
      metrics: await this.checkMetricsHealth(),
      errors: await this.checkErrorsHealth(),
      performance: await this.checkPerformanceHealth()
    };

    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const someUnhealthy = Object.values(checks).some(check => check.status === 'unhealthy');

    return {
      status: allHealthy ? 'healthy' : someUnhealthy ? 'unhealthy' : 'degraded',
      details: checks
    };
  }

  // Private Methods
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSpanId(): string {
    return `span_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    // Get or create session ID from localStorage/sessionStorage
    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }

  private async setupPerformanceObserver(): Promise<void> {
    if (!window.PerformanceObserver) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.trackPerformance({
          name: entry.name,
          value: entry.duration || entry.startTime,
          unit: 'milliseconds',
          timestamp: entry.startTime,
          tags: {
            entryType: entry.entryType,
            initiatorType: (entry as any).initiatorType
          }
        });
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'resource', 'paint'] });
  }

  private async setupErrorHandling(): Promise<void> {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError(event.error, {
        url: event.filename,
        line: event.lineno,
        column: event.colno,
        component: 'global'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError(new Error(event.reason), {
        component: 'promise',
        type: 'unhandledrejection'
      });
    });
  }

  private async setupUserInteractionTracking(): Promise<void> {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.trackUserInteraction({
        type: 'click',
        target: target.tagName.toLowerCase(),
        properties: {
          id: target.id,
          className: target.className,
          textContent: target.textContent?.slice(0, 50)
        }
      });
    });

    // Track page views
    let lastPageView = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastPageView) {
        this.trackUserInteraction({
          type: 'navigation',
          target: window.location.href,
          properties: {
            from: lastPageView,
            to: window.location.href
          }
        });
        lastPageView = window.location.href;
      }
    });

    observer.observe(document, { subtree: true, childList: true });
  }

  private async startMetricsCollection(): Promise<void> {
    // Collect system metrics periodically
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds

    // Clean up old data periodically
    setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // Every hour
  }

  private collectSystemMetrics(): void {
    if (!window.performance || !window.performance.memory) return;

    // Memory usage
    if (performance.memory) {
      this.trackPerformance({
        name: 'memory.used',
        value: performance.memory.usedJSHeapSize,
        unit: 'bytes',
        tags: { type: 'memory' }
      });

      this.trackPerformance({
        name: 'memory.total',
        value: performance.memory.totalJSHeapSize,
        unit: 'bytes',
        tags: { type: 'memory' }
      });
    }

    // Connection info
    if ((navigator as any).connection) {
      const connection = (navigator as any).connection;
      this.trackPerformance({
        name: 'connection.effectiveType',
        value: connection.effectiveType,
        unit: 'string',
        tags: { type: 'network' }
      });
    }
  }

  private cleanupOldData(): void {
    const now = Date.now();
    const retentionPeriods = {
      metrics: this.config.retention.metrics * 24 * 60 * 60 * 1000,
      errors: this.config.retention.logs * 24 * 60 * 60 * 1000,
      events: this.config.retention.logs * 24 * 60 * 60 * 1000
    };

    this.metrics = this.metrics.filter(m => now - m.timestamp < retentionPeriods.metrics);
    this.errors = this.errors.filter(e => now - e.timestamp < retentionPeriods.errors);
    this.userEvents = this.userEvents.filter(e => now - e.timestamp < retentionPeriods.events);
    this.businessMetrics = this.businessMetrics.filter(m => now - m.timestamp < retentionPeriods.metrics);
  }

  private async sendMetrics(metric: PerformanceMetric): Promise<void> {
    // DISABLED: No backend API exists for monitoring metrics
    // Data is stored locally only - enable when backend is available
    if (this.config.debug) {
      console.debug('[Monitoring] Metric recorded locally:', metric.name);
    }
  }

  private async sendError(errorEntry: { error: Error; context?: ErrorContext; timestamp: number }): Promise<void> {
    // DISABLED: No backend API exists for monitoring logs
    // Errors are stored locally only - enable when backend is available
    if (this.config.debug) {
      console.debug('[Monitoring] Error recorded locally:', errorEntry.error.message);
    }
  }

  private async sendUserEvent(event: UserEvent): Promise<void> {
    // DISABLED: No backend API exists for monitoring logs
    // User events are stored locally only - enable when backend is available
    if (this.config.debug) {
      console.debug('[Monitoring] User event recorded locally:', event.type);
    }
  }

  private async sendBusinessMetric(metric: BusinessMetric): Promise<void> {
    // DISABLED: No backend API exists for monitoring metrics
    // Business metrics are stored locally only - enable when backend is available
    if (this.config.debug) {
      console.debug('[Monitoring] Business metric recorded locally:', metric.name);
    }
  }

  private checkPerformanceThresholds(metric: PerformanceMetric): void {
    if (metric.name.includes('response_time') && metric.value > this.config.thresholds.responseTime) {
      this.triggerAlert({
        id: 'slow_response',
        name: 'Slow Response Time',
        condition: `response_time > ${this.config.thresholds.responseTime}ms`,
        severity: 'warning',
        threshold: this.config.thresholds.responseTime,
        window: 300000,
        enabled: true,
        notificationChannels: ['email']
      });
    }
  }

  private checkErrorThresholds(): void {
    const recentErrors = this.errors.filter(e => Date.now() - e.timestamp < 300000); // Last 5 minutes
    const errorRate = recentErrors.length / 5; // errors per minute

    if (errorRate > this.config.thresholds.errorRate) {
      this.triggerAlert({
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: `error_rate > ${this.config.thresholds.errorRate}`,
        severity: 'error',
        threshold: this.config.thresholds.errorRate,
        window: 300000,
        enabled: true,
        notificationChannels: ['email', 'slack']
      });
    }
  }

  private async triggerAlert(rule: AlertRule): Promise<void> {
    if (!rule.enabled) return;

    // DISABLED: No backend API exists for monitoring alerts
    // Alerts are logged locally only - enable when backend is available
    if (this.config.debug) {
      console.debug('[Monitoring] Alert triggered locally:', rule.name, rule.severity);
    }
    
    // Original code disabled - no backend endpoint exists
    return;
    
    // Send alert notification (disabled)
    try {
      await fetch('/api/monitoring/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule, timestamp: Date.now() })
      });
    } catch (error) {
      console.debug('[Monitoring] Failed to trigger alert:', error);
    }
  }

  private async checkMetricsHealth(): Promise<{ status: string; details: any }> {
    const recentMetrics = this.metrics.filter(m => Date.now() - m.timestamp < 300000);
    return {
      status: recentMetrics.length > 0 ? 'healthy' : 'degraded',
      details: { count: recentMetrics.length, lastMetric: this.metrics[this.metrics.length - 1] }
    };
  }

  private async checkErrorsHealth(): Promise<{ status: string; details: any }> {
    const recentErrors = this.errors.filter(e => Date.now() - e.timestamp < 300000);
    const status = recentErrors.length < 5 ? 'healthy' : recentErrors.length < 10 ? 'degraded' : 'unhealthy';

    return {
      status,
      details: { count: recentErrors.length, errors: recentErrors.map(e => e.error.message) }
    };
  }

  private async checkPerformanceHealth(): Promise<{ status: string; details: any }> {
    const performanceMetrics = this.metrics.filter(m => m.name.includes('response_time'));
    const avgResponseTime = performanceMetrics.reduce((sum, m) => sum + m.value, 0) / performanceMetrics.length;

    const status = avgResponseTime < this.config.thresholds.responseTime ? 'healthy' :
                   avgResponseTime < this.config.thresholds.responseTime * 1.5 ? 'degraded' : 'unhealthy';

    return {
      status,
      details: { avgResponseTime, threshold: this.config.thresholds.responseTime }
    };
  }

  // Public API for accessing monitoring data
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getErrors(): Array<{ error: Error; context?: ErrorContext; timestamp: number }> {
    return [...this.errors];
  }

  getUserEvents(): UserEvent[] {
    return [...this.userEvents];
  }

  getBusinessMetrics(): BusinessMetric[] {
    return [...this.businessMetrics];
  }

  getActiveTraces(): Map<string, TraceContext> {
    return new Map(this.activeTraces);
  }
}

// Create singleton instance
export const monitoring = new MonitoringCore();

// Export types for external use
export type {
  MonitoringConfig,
  PerformanceMetric,
  ErrorContext,
  UserEvent,
  BusinessMetric,
  TraceContext,
  AlertRule
};

// Export utility functions
export const createTrace = (operation: string) => monitoring.startTrace(operation);
export const trackMetric = (name: string, value: number, unit: string, tags?: Record<string, string>) => {
  monitoring.trackPerformance({ name, value, unit, timestamp: Date.now(), tags });
};
export const trackError = (error: Error, context?: ErrorContext) => monitoring.trackError(error, context);
export const trackUserEvent = (type: UserEvent['type'], target: string, properties?: Record<string, any>) => {
  monitoring.trackUserInteraction({ type, target, timestamp: Date.now(), properties });
};
export const trackBusinessMetric = (name: string, value: number, category: BusinessMetric['category'], dimensions?: Record<string, string>) => {
  monitoring.trackBusinessMetric({ name, value, category, timestamp: Date.now(), dimensions });
};