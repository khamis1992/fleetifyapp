/**
 * Infrastructure Monitoring System
 * Monitors system resources, database performance, and external dependencies
 */

import { monitoring, PerformanceMetric } from './core';

export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface DatabaseMetric {
  query: string;
  duration: number;
  rowCount?: number;
  indexUsed?: string;
  locksAcquired?: number;
  memoryUsed?: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ExternalServiceMetric {
  service: string;
  endpoint: string;
  responseTime: number;
  statusCode: number;
  available: boolean;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface ResourceMetric {
  type: 'cpu' | 'memory' | 'disk' | 'network';
  usage: number;
  available?: number;
  total?: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class InfrastructureMonitoringService {
  private systemMetrics: SystemMetric[] = [];
  private databaseMetrics: DatabaseMetric[] = [];
  private externalServiceMetrics: ExternalServiceMetric[] = [];
  private resourceMetrics: ResourceMetric[] = [];
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeInfrastructureMonitoring();
  }

  private initializeInfrastructureMonitoring(): void {
    // Setup browser/system monitoring
    this.setupBrowserMonitoring();

    // Setup external service monitoring
    this.setupExternalServiceMonitoring();

    // Start periodic monitoring
    this.startPeriodicMonitoring();
  }

  // Browser/System Monitoring
  private setupBrowserMonitoring(): void {
    // Monitor memory usage
    this.monitorMemoryUsage();

    // Monitor network connectivity
    this.monitorNetworkConnectivity();

    // Monitor performance timing
    this.monitorPerformanceTiming();
  }

  private monitorMemoryUsage(): void {
    if (!(performance as any).memory) return;

    setInterval(() => {
      const memory = (performance as any).memory;

      this.recordResourceMetric({
        type: 'memory',
        usage: memory.usedJSHeapSize,
        total: memory.jsHeapSizeLimit,
        available: memory.jsHeapSizeLimit - memory.usedJSHeapSize
      });

      // Check memory thresholds
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercentage > 85) {
        monitoring.trackError(
          new Error(`High memory usage: ${usagePercentage.toFixed(1)}%`),
          {
            component: 'infrastructure',
            action: 'memory_monitoring',
            additionalData: {
              usedMemory: memory.usedJSHeapSize,
              totalMemory: memory.jsHeapSizeLimit,
              usagePercentage
            }
          }
        );
      }
    }, 30000); // Every 30 seconds
  }

  private monitorNetworkConnectivity(): void {
    // Monitor connection status
    window.addEventListener('online', () => {
      this.recordSystemMetric({
        name: 'network.status',
        value: 1,
        unit: 'boolean',
        tags: { status: 'online' }
      });
    });

    window.addEventListener('offline', () => {
      this.recordSystemMetric({
        name: 'network.status',
        value: 0,
        unit: 'boolean',
        tags: { status: 'offline' }
      });

      monitoring.trackError(
        new Error('Network connection lost'),
        {
          component: 'infrastructure',
          action: 'network_monitoring'
        }
      );
    });

    // Monitor connection quality
    setInterval(() => {
      const connection = (navigator as any).connection;
      if (connection) {
        this.recordSystemMetric({
          name: 'network.effective_type',
          value: this.getNetworkTypeValue(connection.effectiveType),
          unit: 'numeric',
          tags: { type: connection.effectiveType }
        });

        this.recordSystemMetric({
          name: 'network.downlink',
          value: connection.downlink,
          unit: 'mbps',
          tags: { metric: 'downlink' }
        });

        this.recordSystemMetric({
          name: 'network.rtt',
          value: connection.rtt,
          unit: 'milliseconds',
          tags: { metric: 'rtt' }
        });
      }
    }, 60000); // Every minute
  }

  private monitorPerformanceTiming(): void {
    if (!window.PerformanceObserver) return;

    // Monitor navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming;

          this.recordSystemMetric({
            name: 'navigation.dom_interactive',
            value: nav.domInteractive - nav.navigationStart,
            unit: 'milliseconds',
            tags: { metric: 'dom_interactive' }
          });

          this.recordSystemMetric({
            name: 'navigation.dom_complete',
            value: nav.domComplete - nav.navigationStart,
            unit: 'milliseconds',
            tags: { metric: 'dom_complete' }
          });

          this.recordSystemMetric({
            name: 'navigation.load_complete',
            value: nav.loadEventEnd - nav.navigationStart,
            unit: 'milliseconds',
            tags: { metric: 'load_complete' }
          });
        }
      }
    });

    navObserver.observe({ entryTypes: ['navigation'] });

    // Monitor resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;

          this.recordSystemMetric({
            name: 'resource.load_time',
            value: resource.responseEnd - resource.startTime,
            unit: 'milliseconds',
            tags: {
              resource_type: this.getResourceType(resource.name),
              resource_name: resource.name.split('/').pop() || 'unknown'
            }
          });

          // Check for slow resources
          const loadTime = resource.responseEnd - resource.startTime;
          if (loadTime > 5000) { // 5 seconds
            monitoring.trackError(
              new Error(`Slow resource loading: ${resource.name} took ${loadTime}ms`),
              {
                component: 'infrastructure',
                action: 'resource_monitoring',
                additionalData: {
                  resource: resource.name,
                  loadTime,
                  resourceType: this.getResourceType(resource.name)
                }
              }
            );
          }
        }
      }
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  // External Service Monitoring
  private setupExternalServiceMonitoring(): void {
    // Monitor Supabase connection
    this.monitorSupabaseConnection();

    // Monitor API endpoints
    this.monitorAPIEndpoints();

    // Monitor external dependencies
    this.monitorExternalDependencies();
  }

  private monitorSupabaseConnection(): void {
    setInterval(async () => {
      const startTime = performance.now();
      let available = false;
      let statusCode = 0;

      try {
        // Simple health check to Supabase
        const response = await fetch('/api/health/database', {
          method: 'GET',
          cache: 'no-cache'
        });
        statusCode = response.status;
        available = response.ok;
      } catch (error) {
        available = false;
        statusCode = 0;
      }

      const responseTime = performance.now() - startTime;

      this.recordExternalServiceMetric({
        service: 'supabase',
        endpoint: '/health',
        responseTime,
        statusCode,
        available,
        tags: { service: 'supabase', type: 'database' }
      });

      if (!available || responseTime > 5000) {
        monitoring.trackError(
          new Error(`Supabase connection issue: ${available ? 'slow' : 'unavailable'}`),
          {
            component: 'infrastructure',
            action: 'supabase_monitoring',
            additionalData: {
              available,
              responseTime,
              statusCode
            }
          }
        );
      }
    }, 120000); // Every 2 minutes
  }

  private monitorAPIEndpoints(): void {
    const criticalEndpoints = [
      '/api/auth/status',
      '/api/health',
      '/api/users/me'
    ];

    criticalEndpoints.forEach(endpoint => {
      setInterval(async () => {
        const startTime = performance.now();
        let available = false;
        let statusCode = 0;

        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            cache: 'no-cache'
          });
          statusCode = response.status;
          available = response.ok || response.status === 401; // 401 is expected for some endpoints
        } catch (error) {
          available = false;
          statusCode = 0;
        }

        const responseTime = performance.now() - startTime;

        this.recordExternalServiceMetric({
          service: 'fleetify-api',
          endpoint,
          responseTime,
          statusCode,
          available,
          tags: { service: 'fleetify', endpoint: endpoint.replace('/api/', '') }
        });

        if (!available || responseTime > 3000) {
          monitoring.trackError(
            new Error(`API endpoint issue: ${endpoint} ${available ? 'slow' : 'unavailable'}`),
            {
              component: 'infrastructure',
              action: 'api_monitoring',
              additionalData: {
                endpoint,
                available,
                responseTime,
                statusCode
              }
            }
          );
        }
      }, 180000); // Every 3 minutes
    });
  }

  private monitorExternalDependencies(): void {
    // Monitor CDN availability
    setInterval(async () => {
      const cdnUrl = 'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js';
      const startTime = performance.now();

      try {
        const response = await fetch(cdnUrl, { method: 'HEAD', cache: 'no-cache' });
        const responseTime = performance.now() - startTime;

        this.recordExternalServiceMetric({
          service: 'cdn',
          endpoint: cdnUrl,
          responseTime,
          statusCode: response.status,
          available: response.ok,
          tags: { service: 'cdn', provider: 'jsdelivr' }
        });
      } catch (error) {
        monitoring.trackError(
          new Error('CDN connectivity issue'),
          {
            component: 'infrastructure',
            action: 'cdn_monitoring',
            additionalData: { cdnUrl }
          }
        );
      }
    }, 300000); // Every 5 minutes
  }

  // Database Monitoring
  trackDatabasePerformance(metric: DatabaseMetric): void {
    const enrichedMetric: DatabaseMetric = {
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

    // Check for database performance issues
    this.checkDatabasePerformance(enrichedMetric);

    // Cleanup old metrics
    this.cleanupDatabaseMetrics();
  }

  // System Metrics Recording
  private recordSystemMetric(metric: Omit<SystemMetric, 'timestamp'>): void {
    const systemMetric: SystemMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.systemMetrics.push(systemMetric);

    monitoring.trackPerformance({
      name: `system.${metric.name}`,
      value: metric.value,
      unit: metric.unit,
      timestamp: systemMetric.timestamp,
      tags: metric.tags
    });

    // Check thresholds
    if (metric.threshold) {
      if (metric.value >= metric.threshold.critical) {
        monitoring.trackError(
          new Error(`Critical threshold exceeded: ${metric.name} = ${metric.value}${metric.unit}`),
          {
            component: 'infrastructure',
            action: 'threshold_monitoring',
            additionalData: {
              metric: metric.name,
              value: metric.value,
              unit: metric.unit,
              threshold: metric.threshold.critical
            }
          }
        );
      } else if (metric.value >= metric.threshold.warning) {
        console.warn(`Warning threshold exceeded: ${metric.name} = ${metric.value}${metric.unit}`);
      }
    }

    this.cleanupSystemMetrics();
  }

  private recordExternalServiceMetric(metric: Omit<ExternalServiceMetric, 'timestamp'>): void {
    const serviceMetric: ExternalServiceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.externalServiceMetrics.push(serviceMetric);

    monitoring.trackPerformance({
      name: 'service.response_time',
      value: metric.responseTime,
      unit: 'milliseconds',
      timestamp: serviceMetric.timestamp,
      tags: {
        ...metric.tags,
        service: metric.service,
        endpoint: metric.endpoint,
        available: metric.available.toString()
      }
    });

    this.cleanupExternalServiceMetrics();
  }

  private recordResourceMetric(metric: Omit<ResourceMetric, 'timestamp'>): void {
    const resourceMetric: ResourceMetric = {
      ...metric,
      timestamp: Date.now()
    };

    this.resourceMetrics.push(resourceMetric);

    monitoring.trackPerformance({
      name: `resource.${metric.type}`,
      value: metric.usage,
      unit: metric.type === 'cpu' ? 'percentage' : 'bytes',
      timestamp: resourceMetric.timestamp,
      tags: metric.tags
    });

    this.cleanupResourceMetrics();
  }

  // Periodic Monitoring
  private startPeriodicMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    this.monitoringInterval = setInterval(() => {
      this.collectSystemHealth();
    }, 60000); // Every minute
  }

  private collectSystemHealth(): void {
    // Collect browser/system health metrics
    this.collectBrowserHealth();

    // Collect application health metrics
    this.collectApplicationHealth();

    // Check for system anomalies
    this.checkSystemAnomalies();
  }

  private collectBrowserHealth(): void {
    // Tab visibility
    this.recordSystemMetric({
      name: 'browser.visibility',
      value: document.hidden ? 0 : 1,
      unit: 'boolean',
      tags: { visible: (!document.hidden).toString() }
    });

    // Page focus
    this.recordSystemMetric({
      name: 'browser.focus',
      value: document.hasFocus() ? 1 : 0,
      unit: 'boolean',
      tags: { focused: document.hasFocus().toString() }
    });

    // Device memory
    if ((navigator as any).deviceMemory) {
      this.recordSystemMetric({
        name: 'browser.device_memory',
        value: (navigator as any).deviceMemory,
        unit: 'gb',
        tags: { metric: 'device_memory' }
      });
    }

    // Hardware concurrency
    if (navigator.hardwareConcurrency) {
      this.recordSystemMetric({
        name: 'browser.cpu_cores',
        value: navigator.hardwareConcurrency,
        unit: 'count',
        tags: { metric: 'cpu_cores' }
      });
    }
  }

  private collectApplicationHealth(): void {
    // Active WebSocket connections
    const activeConnections = this.getActiveWebSocketCount();
    this.recordSystemMetric({
      name: 'app.active_connections',
      value: activeConnections,
      unit: 'count',
      tags: { metric: 'websocket_connections' }
    });

    // Pending requests
    const pendingRequests = this.getPendingRequestCount();
    this.recordSystemMetric({
      name: 'app.pending_requests',
      value: pendingRequests,
      unit: 'count',
      tags: { metric: 'pending_requests' }
    });

    // DOM nodes count (for memory leak detection)
    const domNodes = document.querySelectorAll('*').length;
    this.recordSystemMetric({
      name: 'app.dom_nodes',
      value: domNodes,
      unit: 'count',
      tags: { metric: 'dom_nodes' }
    });

    // Event listeners count
    const eventListeners = this.getEventListenerCount();
    this.recordSystemMetric({
      name: 'app.event_listeners',
      value: eventListeners,
      unit: 'count',
      tags: { metric: 'event_listeners' }
    });
  }

  private checkSystemAnomalies(): void {
    // Check for memory leaks
    this.checkForMemoryLeaks();

    // Check for performance degradation
    this.checkPerformanceDegradation();

    // Check for resource exhaustion
    this.checkResourceExhaustion();
  }

  private checkForMemoryLeaks(): void {
    const recentMetrics = this.resourceMetrics.filter(
      m => m.type === 'memory' && m.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    if (recentMetrics.length < 3) return;

    const memoryGrowth = recentMetrics[recentMetrics.length - 1].usage - recentMetrics[0].usage;
    const growthRate = memoryGrowth / recentMetrics[0].usage;

    if (growthRate > 0.5) { // 50% growth in 5 minutes
      monitoring.trackError(
        new Error(`Potential memory leak detected: ${Math.round(growthRate * 100)}% growth`),
        {
          component: 'infrastructure',
          action: 'memory_leak_detection',
          additionalData: {
            growthRate: Math.round(growthRate * 100),
            initialMemory: recentMetrics[0].usage,
            currentMemory: recentMetrics[recentMetrics.length - 1].usage
          }
        }
      );
    }
  }

  private checkPerformanceDegradation(): void {
    const recentMetrics = this.systemMetrics.filter(
      m => m.name.includes('response_time') && m.timestamp > Date.now() - 300000 // Last 5 minutes
    );

    if (recentMetrics.length < 5) return;

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;

    if (avgResponseTime > 2000) { // 2 seconds average
      monitoring.trackError(
        new Error(`Performance degradation detected: avg response time ${Math.round(avgResponseTime)}ms`),
        {
          component: 'infrastructure',
          action: 'performance_monitoring',
          additionalData: {
            avgResponseTime: Math.round(avgResponseTime),
            sampleCount: recentMetrics.length
          }
        }
      );
    }
  }

  private checkResourceExhaustion(): void {
    // Check memory usage
    const memory = (performance as any).memory;
    if (memory) {
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      if (usagePercentage > 90) {
        monitoring.trackError(
          new Error(`Resource exhaustion: Memory usage at ${Math.round(usagePercentage)}%`),
          {
            component: 'infrastructure',
            action: 'resource_monitoring',
            additionalData: {
              usagePercentage: Math.round(usagePercentage),
              usedMemory: memory.usedJSHeapSize,
              totalMemory: memory.jsHeapSizeLimit
            }
          }
        );
      }
    }
  }

  // Health Check
  async getInfrastructureHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      system: { status: string; metrics: SystemMetric[] };
      database: { status: string; metrics: DatabaseMetric[] };
      services: { status: string; metrics: ExternalServiceMetric[] };
      resources: { status: string; metrics: ResourceMetric[] };
    };
  }> {
    const now = Date.now();
    const recentTime = now - 300000; // Last 5 minutes

    const recentSystemMetrics = this.systemMetrics.filter(m => m.timestamp > recentTime);
    const recentDatabaseMetrics = this.databaseMetrics.filter(m => m.timestamp > recentTime);
    const recentServiceMetrics = this.externalServiceMetrics.filter(m => m.timestamp > recentTime);
    const recentResourceMetrics = this.resourceMetrics.filter(m => m.timestamp > recentTime);

    const systemStatus = this.evaluateSystemHealth(recentSystemMetrics);
    const databaseStatus = this.evaluateDatabaseHealth(recentDatabaseMetrics);
    const servicesStatus = this.evaluateServicesHealth(recentServiceMetrics);
    const resourcesStatus = this.evaluateResourcesHealth(recentResourceMetrics);

    const allHealthy = [systemStatus, databaseStatus, servicesStatus, resourcesStatus]
      .every(status => status === 'healthy');
    const someUnhealthy = [systemStatus, databaseStatus, servicesStatus, resourcesStatus]
      .some(status => status === 'unhealthy');

    return {
      status: allHealthy ? 'healthy' : someUnhealthy ? 'unhealthy' : 'degraded',
      details: {
        system: { status: systemStatus, metrics: recentSystemMetrics },
        database: { status: databaseStatus, metrics: recentDatabaseMetrics },
        services: { status: servicesStatus, metrics: recentServiceMetrics },
        resources: { status: resourcesStatus, metrics: recentResourceMetrics }
      }
    };
  }

  // Public API
  getSystemMetrics(filter?: { timeRange?: number; type?: string }): SystemMetric[] {
    let metrics = [...this.systemMetrics];

    if (filter) {
      if (filter.timeRange) {
        const cutoffTime = Date.now() - filter.timeRange;
        metrics = metrics.filter(m => m.timestamp > cutoffTime);
      }
      if (filter.type) {
        metrics = metrics.filter(m => m.name.includes(filter.type!));
      }
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  getDatabaseMetrics(filter?: { timeRange?: number; operation?: string }): DatabaseMetric[] {
    let metrics = [...this.databaseMetrics];

    if (filter) {
      if (filter.timeRange) {
        const cutoffTime = Date.now() - filter.timeRange;
        metrics = metrics.filter(m => m.timestamp > cutoffTime);
      }
      if (filter.operation) {
        metrics = metrics.filter(m => m.tags?.operation === filter.operation);
      }
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  getExternalServiceMetrics(filter?: { timeRange?: number; service?: string }): ExternalServiceMetric[] {
    let metrics = [...this.externalServiceMetrics];

    if (filter) {
      if (filter.timeRange) {
        const cutoffTime = Date.now() - filter.timeRange;
        metrics = metrics.filter(m => m.timestamp > cutoffTime);
      }
      if (filter.service) {
        metrics = metrics.filter(m => m.service === filter.service);
      }
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  getResourceMetrics(filter?: { timeRange?: number; type?: ResourceMetric['type'] }): ResourceMetric[] {
    let metrics = [...this.resourceMetrics];

    if (filter) {
      if (filter.timeRange) {
        const cutoffTime = Date.now() - filter.timeRange;
        metrics = metrics.filter(m => m.timestamp > cutoffTime);
      }
      if (filter.type) {
        metrics = metrics.filter(m => m.type === filter.type);
      }
    }

    return metrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
  }

  // Private Helper Methods
  private getNetworkTypeValue(effectiveType: string): number {
    const typeValues: Record<string, number> = {
      'slow-2g': 0,
      '2g': 1,
      '3g': 2,
      '4g': 3
    };
    return typeValues[effectiveType] || -1;
  }

  private getResourceType(url: string): string {
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.js')) return 'script';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
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

  private checkDatabasePerformance(metric: DatabaseMetric): void {
    if (metric.duration > 5000) { // 5 seconds
      monitoring.trackError(
        new Error(`Slow database query: ${metric.query.substring(0, 100)}... took ${metric.duration}ms`),
        {
          component: 'infrastructure',
          action: 'database_monitoring',
          additionalData: {
            query: metric.query.substring(0, 200),
            duration: metric.duration,
            rowCount: metric.rowCount
          }
        }
      );
    }
  }

  private getActiveWebSocketCount(): number {
    // This would need to be implemented based on your WebSocket implementation
    return 0;
  }

  private getPendingRequestCount(): number {
    // This would track active fetch requests
    return 0;
  }

  private getEventListenerCount(): number {
    // This would need to be implemented to track event listeners
    return 0;
  }

  private evaluateSystemHealth(metrics: SystemMetric[]): string {
    if (metrics.length === 0) return 'unknown';

    const criticalIssues = metrics.filter(m =>
      m.threshold && m.value >= m.threshold.critical
    ).length;

    if (criticalIssues > 0) return 'unhealthy';

    const warningIssues = metrics.filter(m =>
      m.threshold && m.value >= m.threshold.warning && m.value < m.threshold.critical
    ).length;

    return warningIssues > 2 ? 'degraded' : 'healthy';
  }

  private evaluateDatabaseHealth(metrics: DatabaseMetric[]): string {
    if (metrics.length === 0) return 'unknown';

    const slowQueries = metrics.filter(m => m.duration > 2000).length;
    const totalQueries = metrics.length;

    if (slowQueries / totalQueries > 0.1) return 'unhealthy';
    if (slowQueries / totalQueries > 0.05) return 'degraded';
    return 'healthy';
  }

  private evaluateServicesHealth(metrics: ExternalServiceMetric[]): string {
    if (metrics.length === 0) return 'unknown';

    const unavailableServices = metrics.filter(m => !m.available).length;
    const totalServices = metrics.length;

    if (unavailableServices > 0) return 'unhealthy';
    const slowServices = metrics.filter(m => m.responseTime > 5000).length;

    return slowServices / totalServices > 0.2 ? 'degraded' : 'healthy';
  }

  private evaluateResourcesHealth(metrics: ResourceMetric[]): string {
    if (metrics.length === 0) return 'unknown';

    const memoryMetrics = metrics.filter(m => m.type === 'memory');
    if (memoryMetrics.length > 0) {
      const latestMemory = memoryMetrics[memoryMetrics.length - 1];
      const memory = (performance as any).memory;
      if (memory) {
        const usagePercentage = (latestMemory.usage / memory.jsHeapSizeLimit) * 100;
        if (usagePercentage > 90) return 'unhealthy';
        if (usagePercentage > 75) return 'degraded';
      }
    }

    return 'healthy';
  }

  private cleanupSystemMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    this.systemMetrics = this.systemMetrics.filter(m => m.timestamp > cutoffTime);
  }

  private cleanupDatabaseMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    this.databaseMetrics = this.databaseMetrics.filter(m => m.timestamp > cutoffTime);
  }

  private cleanupExternalServiceMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    this.externalServiceMetrics = this.externalServiceMetrics.filter(m => m.timestamp > cutoffTime);
  }

  private cleanupResourceMetrics(): void {
    const cutoffTime = Date.now() - 3600000; // Keep last hour
    this.resourceMetrics = this.resourceMetrics.filter(m => m.timestamp > cutoffTime);
  }
}

// Create singleton instance
export const infrastructureMonitoring = new InfrastructureMonitoringService();

// Export utility functions
export const trackDatabaseQuery = (query: string, duration: number, rowCount?: number, indexUsed?: string) => {
  infrastructureMonitoring.trackDatabasePerformance({
    query,
    duration,
    rowCount,
    indexUsed,
    timestamp: Date.now()
  });
};

export const getInfrastructureHealth = () => infrastructureMonitoring.getInfrastructureHealth();