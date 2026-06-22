/**
 * Core API Monitoring Framework
 * Central monitoring system for FleetifyApp API operations
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  APIRequest,
  APIResponse,
  APIMetrics,
  APIEndpoint,
  ErrorCategory,
  ErrorType,
  ErrorSeverity,
  TimeWindow,
  MonitoringConfig,
  RateLimitConfig,
  AlertingConfig,
} from '@/types/api-monitoring';

export class APIMonitor {
  private static instance: APIMonitor;
  private config: MonitoringConfig;
  private endpoints: Map<string, APIEndpoint> = new Map();
  private requests: Map<string, APIRequest> = new Map();
  private responses: APIResponse[] = [];
  private metricsCache: Map<string, APIMetrics> = new Map();
  private isActive = false;

  // Performance tracking
  private startTime?: Date;
  private requestCounters: Map<string, number> = new Map();
  private responseTimeBuffer: Map<string, number[]> = new Map();

  // Rate limiting
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  // Background processing
  private flushTimer?: NodeJS.Timeout;
  private aggregationTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): APIMonitor {
    if (!APIMonitor.instance) {
      APIMonitor.instance = new APIMonitor();
    }
    return APIMonitor.instance;
  }

  /**
   * Initialize the monitoring system
   */
  async initialize(config?: Partial<MonitoringConfig>): Promise<void> {
    if (this.isActive) {
      console.warn('API Monitor is already active');
      return;
    }

    this.config = { ...this.getDefaultConfig(), ...config };

    if (!this.config.enabled) {
      console.log('API Monitoring is disabled');
      return;
    }

    this.isActive = true;
    this.startTime = new Date();

    // Start background processing
    this.startBackgroundProcessing();

    // Load existing endpoint configurations
    await this.loadEndpointConfigurations();

    console.log('API Monitor initialized successfully');
    console.log('Configuration:', this.config);
  }

  /**
   * Start monitoring a request
   */
  startRequest(request: Partial<APIRequest>): string {
    if (!this.isActive) return '';

    const requestId = uuidv4();
    const fullRequest: APIRequest = {
      id: requestId,
      method: request.method || 'GET',
      url: request.url || '',
      headers: request.headers || {},
      body: this.config.collectRequestBody ? request.body : undefined,
      timestamp: new Date(),
      userId: request.userId,
      companyId: request.companyId,
      userAgent: this.config.collectUserAgent ? request.userAgent : undefined,
      ipAddress: this.config.collectIPAddress ? request.ipAddress : undefined,
      sessionId: request.sessionId,
    };

    this.requests.set(requestId, fullRequest);

    // Update request counters
    const key = `${fullRequest.method}:${fullRequest.url}`;
    this.requestCounters.set(key, (this.requestCounters.get(key) || 0) + 1);

    return requestId;
  }

  /**
   * End monitoring for a request
   */
  endRequest(response: Partial<APIResponse>): void {
    if (!this.isActive || !response.requestId) return;

    const request = this.requests.get(response.requestId);
    if (!request) return;

    const fullResponse: APIResponse = {
      requestId: response.requestId,
      statusCode: response.statusCode || 200,
      headers: response.headers || {},
      body: this.config.collectResponseBody ? response.body : undefined,
      timestamp: new Date(),
      responseTime: response.responseTime || 0,
      size: response.size || 0,
      errorType: response.errorType,
      errorMessage: response.errorMessage,
      errorCategory: response.errorCategory,
      errorSeverity: response.errorSeverity,
    };

    this.responses.push(fullResponse);

    // Update response time buffer
    const key = `${request.method}:${request.url}`;
    if (!this.responseTimeBuffer.has(key)) {
      this.responseTimeBuffer.set(key, []);
    }
    this.responseTimeBuffer.get(key)!.push(fullResponse.responseTime);

    // Clean up request data
    this.requests.delete(response.requestId);

    // Update metrics asynchronously
    this.updateMetricsAsync(request, fullResponse);

    // Check for alerts
    this.checkAlerts(request, fullResponse);
  }

  /**
   * Get metrics for a specific endpoint or overall
   */
  getMetrics(endpoint?: string, timeWindow: TimeWindow = '1h'): APIMetrics {
    const cacheKey = `${endpoint || 'all'}_${timeWindow}`;

    if (this.metricsCache.has(cacheKey)) {
      return this.metricsCache.get(cacheKey)!;
    }

    const metrics = this.calculateMetrics(endpoint, timeWindow);
    this.metricsCache.set(cacheKey, metrics);

    return metrics;
  }

  /**
   * Get endpoint information
   */
  getEndpoint(path: string, method: string): APIEndpoint | undefined {
    const key = `${method}:${path}`;
    return this.endpoints.get(key);
  }

  /**
   * Register an endpoint for monitoring
   */
  registerEndpoint(
    path: string,
    method: string,
    config: {
      rateLimit?: Partial<RateLimitConfig>;
      alerting?: Partial<AlertingConfig>;
      monitoring?: Partial<MonitoringConfig>;
    } = {}
  ): void {
    const key = `${method}:${path}`;

    const endpoint: APIEndpoint = {
      path,
      method,
      metrics: this.getEmptyMetrics(),
      rateLimit: config.rateLimit ? this.getDefaultRateLimitConfig(config.rateLimit) : undefined,
      alerting: config.alerting ? this.getDefaultAlertingConfig(config.alerting) : undefined,
      monitoring: config.monitoring ? { ...this.config, ...config.monitoring } : this.config,
      hourlyMetrics: [],
      dailyMetrics: [],
      slowQueries: [],
      errorPatterns: [],
      metadata: {
        lastUpdated: new Date(),
        version: '1.0.0',
      },
    };

    this.endpoints.set(key, endpoint);
    console.log(`Registered endpoint for monitoring: ${key}`);
  }

  /**
   * Check rate limits for a request
   */
  checkRateLimit(path: string, method: string, userId?: string): boolean {
    const endpoint = this.getEndpoint(path, method);
    if (!endpoint?.rateLimit) return true;

    const rateLimit = endpoint.rateLimit;
    const now = Date.now();
    const key = userId ? `user:${userId}` : `ip:${path}:${method}`;

    const current = this.rateLimitMap.get(key);

    if (!current || now > current.resetTime) {
      // New window or reset window
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + rateLimit.windowMs,
      });
      return true;
    }

    if (current.count >= rateLimit.maxRequests) {
      return false; // Rate limited
    }

    current.count++;
    return true;
  }

  /**
   * Get system health status
   */
  getHealthStatus() {
    if (!this.isActive) {
      return {
        overall: 'unhealthy' as const,
        score: 0,
        endpoints: {},
        database: { status: 'unknown' as const, lastCheck: new Date() },
        externalServices: {},
        uptime: 0,
        avgResponseTime: 0,
        errorRate: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        timestamp: new Date(),
      };
    }

    const allMetrics = this.getMetrics();
    const endpointHealths: Record<string, any> = {};

    // Calculate health for each endpoint
    for (const [key, endpoint] of this.endpoints) {
      const metrics = endpoint.metrics;
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (metrics.errorRate > 0.1) {
        status = 'unhealthy';
      } else if (metrics.errorRate > 0.05 || metrics.averageResponseTime > 2000) {
        status = 'degraded';
      }

      endpointHealths[key] = {
        status,
        responseTime: metrics.averageResponseTime,
        errorRate: metrics.errorRate,
        lastCheck: new Date(),
      };
    }

    // Calculate overall health
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let score = 100;

    if (allMetrics.errorRate > 0.1 || allMetrics.averageResponseTime > 5000) {
      overallStatus = 'unhealthy';
      score = Math.max(0, score - 50);
    } else if (allMetrics.errorRate > 0.05 || allMetrics.averageResponseTime > 2000) {
      overallStatus = 'degraded';
      score = Math.max(0, score - 25);
    }

    const uptime = this.startTime ?
      ((Date.now() - this.startTime.getTime()) / (Date.now() - this.startTime.getTime())) * 100 : 0;

    return {
      overall: overallStatus,
      score,
      endpoints: endpointHealths,
      database: { status: 'healthy', lastCheck: new Date(), uptime },
      externalServices: {},
      uptime,
      avgResponseTime: allMetrics.averageResponseTime,
      errorRate: allMetrics.errorRate,
      activeAlerts: 0, // TODO: Implement alert counting
      criticalAlerts: 0,
      timestamp: new Date(),
    };
  }

  /**
   * Shutdown the monitoring system
   */
  async shutdown(): Promise<void> {
    this.isActive = false;

    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }

    // Flush any remaining data
    await this.flushData();

    console.log('API Monitor shut down successfully');
  }

  // Private methods

  private getDefaultConfig(): MonitoringConfig {
    return {
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
      flushInterval: 30000, // 30 seconds
    };
  }

  private getDefaultRateLimitConfig(config?: Partial<RateLimitConfig>): RateLimitConfig {
    return {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      adaptiveThresholds: false,
      userBasedLimits: {},
      timeBasedLimits: {},
      burstDetection: true,
      suspiciousActivityThreshold: 10,
      autoBlockDuration: 300000, // 5 minutes
      ...config,
    };
  }

  private getDefaultAlertingConfig(config?: Partial<AlertingConfig>): AlertingConfig {
    return {
      enabled: true,
      responseTimeThresholds: {
        warning: 1000, // 1 second
        critical: 5000, // 5 seconds
      },
      errorRateThresholds: {
        warning: 0.05, // 5%
        critical: 0.10, // 10%
      },
      requestVolumeThresholds: {
        warning: 1000, // requests per minute
        critical: 2000, // requests per minute
      },
      customRules: [],
      notifications: {
        channels: [],
        templates: [],
        maxNotificationsPerHour: 10,
        maxNotificationsPerDay: 100,
        groupSimilarAlerts: true,
        groupingWindow: 5,
      },
      ...config,
    };
  }

  private getEmptyMetrics(): APIMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorRate: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsByStatus: {},
      throughput: 0,
      dataTransferred: 0,
      timestamp: new Date(),
      timeWindow: '1h',
    };
  }

  private async loadEndpointConfigurations(): Promise<void> {
    // TODO: Load endpoint configurations from database or config file
    // For now, register common API endpoints
    this.registerEndpoint('/api/auth/login', 'POST');
    this.registerEndpoint('/api/auth/register', 'POST');
    this.registerEndpoint('/api/vehicles', 'GET');
    this.registerEndpoint('/api/vehicles', 'POST');
    this.registerEndpoint('/api/contracts', 'GET');
    this.registerEndpoint('/api/contracts', 'POST');
    this.registerEndpoint('/api/customers', 'GET');
    this.registerEndpoint('/api/payments', 'GET');
    this.registerEndpoint('/api/payments', 'POST');
  }

  private calculateMetrics(endpoint?: string, timeWindow: TimeWindow = '1h'): APIMetrics {
    const now = new Date();
    const timeWindowMs = this.getTimeWindowMs(timeWindow);
    const cutoffTime = new Date(now.getTime() - timeWindowMs);

    // Filter responses by time window and endpoint
    const filteredResponses = this.responses.filter(response => {
      if (response.timestamp < cutoffTime) return false;

      if (endpoint) {
        const request = this.requests.get(response.requestId);
        return request?.url === endpoint;
      }

      return true;
    });

    if (filteredResponses.length === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate basic metrics
    const totalRequests = filteredResponses.length;
    const successfulRequests = filteredResponses.filter(r => r.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;

    // Calculate response time metrics
    const responseTimes = filteredResponses.map(r => r.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];

    // Calculate error metrics
    const errorRate = failedRequests / totalRequests;
    const errorsByCategory: Record<ErrorCategory, number> = {} as Record<ErrorCategory, number>;
    const errorsByStatus: Record<number, number> = {};

    filteredResponses.forEach(response => {
      if (response.statusCode >= 400) {
        errorsByStatus[response.statusCode] = (errorsByStatus[response.statusCode] || 0) + 1;

        if (response.errorCategory) {
          errorsByCategory[response.errorCategory] = (errorsByCategory[response.errorCategory] || 0) + 1;
        }
      }
    });

    // Calculate throughput
    const timeWindowMinutes = timeWindowMs / (1000 * 60);
    const throughput = totalRequests / timeWindowMinutes;

    // Calculate data transferred
    const dataTransferred = filteredResponses.reduce((sum, r) => sum + r.size, 0);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      errorRate,
      errorsByCategory,
      errorsByStatus,
      throughput,
      dataTransferred,
      timestamp: now,
      timeWindow,
    };
  }

  private getTimeWindowMs(timeWindow: TimeWindow): number {
    const windows = {
      '1m': 1 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    };
    return windows[timeWindow] || windows['1h'];
  }

  private updateMetricsAsync(request: APIRequest, response: APIResponse): void {
    if (!this.config.asyncCollection) return;

    // Use setTimeout to make it non-blocking
    setTimeout(() => {
      this.updateMetrics(request, response);
    }, 0);
  }

  private updateMetrics(request: APIRequest, response: APIResponse): void {
    const key = `${request.method}:${request.url}`;
    const endpoint = this.endpoints.get(key);

    if (!endpoint) return;

    // Update endpoint metrics
    const metrics = endpoint.metrics;
    metrics.totalRequests++;

    if (response.statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      if (response.errorCategory) {
        metrics.errorsByCategory[response.errorCategory] =
          (metrics.errorsByCategory[response.errorCategory] || 0) + 1;
      }
    }

    // Update response time metrics
    const times = this.responseTimeBuffer.get(key) || [];
    metrics.averageResponseTime = times.reduce((sum, time) => sum + time, 0) / times.length;

    const sortedTimes = times.sort((a, b) => a - b);
    metrics.p95ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    metrics.p99ResponseTime = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    // Update error rate
    metrics.errorRate = metrics.failedRequests / metrics.totalRequests;

    // Update throughput
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentResponses = this.responses.filter(r => r.timestamp >= oneHourAgo);
    metrics.throughput = recentResponses.length / 60; // per minute

    // Update data transferred
    metrics.dataTransferred += response.size;

    metrics.timestamp = now;
  }

  private checkAlerts(request: APIRequest, response: APIResponse): void {
    const key = `${request.method}:${request.url}`;
    const endpoint = this.endpoints.get(key);

    if (!endpoint?.alerting?.enabled) return;

    const alerting = endpoint.alerting;

    // Check response time alerts
    if (response.responseTime > alerting.responseTimeThresholds.critical) {
      this.triggerAlert({
        type: 'response_time_critical',
        message: `Critical response time: ${response.responseTime}ms for ${key}`,
        severity: 'critical',
        endpoint: key,
        value: response.responseTime,
        threshold: alerting.responseTimeThresholds.critical,
      });
    } else if (response.responseTime > alerting.responseTimeThresholds.warning) {
      this.triggerAlert({
        type: 'response_time_warning',
        message: `High response time: ${response.responseTime}ms for ${key}`,
        severity: 'warning',
        endpoint: key,
        value: response.responseTime,
        threshold: alerting.responseTimeThresholds.warning,
      });
    }

    // Check error alerts
    if (response.statusCode >= 500) {
      this.triggerAlert({
        type: 'server_error',
        message: `Server error ${response.statusCode} for ${key}`,
        severity: 'critical',
        endpoint: key,
        statusCode: response.statusCode,
        error: response.errorMessage,
      });
    } else if (response.statusCode >= 400) {
      this.triggerAlert({
        type: 'client_error',
        message: `Client error ${response.statusCode} for ${key}`,
        severity: 'warning',
        endpoint: key,
        statusCode: response.statusCode,
        error: response.errorMessage,
      });
    }
  }

  private triggerAlert(alertData: any): void {
    // TODO: Implement alert triggering logic
    console.warn('ALERT:', alertData);
  }

  private startBackgroundProcessing(): void {
    // Start flush timer for async data collection
    if (this.config.asyncCollection && this.config.flushInterval > 0) {
      this.flushTimer = setInterval(() => {
        this.flushData();
      }, this.config.flushInterval);
    }

    // Start aggregation timer for metrics calculation
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, 60000); // Every minute
  }

  private async flushData(): Promise<void> {
    if (this.responses.length === 0) return;

    try {
      // TODO: Flush data to database or external service
      console.log(`Flushing ${this.responses.length} response records`);

      // Clear old data based on retention policy
      const cutoffTime = new Date(Date.now() - this.config.retentionPeriod * 24 * 60 * 60 * 1000);
      this.responses = this.responses.filter(r => r.timestamp > cutoffTime);

    } catch (error) {
      console.error('Failed to flush monitoring data:', error);
    }
  }

  private aggregateMetrics(): void {
    // Calculate hourly and daily metrics for each endpoint
    for (const [key, endpoint] of this.endpoints) {
      // Hourly metrics
      const hourlyMetrics = this.calculateMetrics(endpoint.path, '1h');
      endpoint.hourlyMetrics.push(hourlyMetrics);

      // Keep only last 24 hours of hourly metrics
      if (endpoint.hourlyMetrics.length > 24) {
        endpoint.hourlyMetrics = endpoint.hourlyMetrics.slice(-24);
      }

      // Daily metrics (calculate every hour)
      const now = new Date();
      if (now.getMinutes() === 0) {
        const dailyMetrics = this.calculateMetrics(endpoint.path, '24h');
        endpoint.dailyMetrics.push(dailyMetrics);

        // Keep only last 30 days of daily metrics
        if (endpoint.dailyMetrics.length > 30) {
          endpoint.dailyMetrics = endpoint.dailyMetrics.slice(-30);
        }
      }
    }

    // Clear metrics cache
    this.metricsCache.clear();
  }
}

// Export singleton instance
export const apiMonitor = APIMonitor.getInstance();