/**
 * Request Deduplication System
 *
 * Eliminates duplicate API calls within configurable time windows
 * Improves performance by preventing redundant network requests
 * Optimized for high-concurrency scenarios
 */

import { logger } from '@/lib/logger';

export interface PendingRequest<T = any> {
  id: string;
  promise: Promise<T>;
  timestamp: number;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  timeout?: NodeJS.Timeout;
  metadata?: Record<string, any>;
}

export interface DeduplicationConfig {
  windowMs: number; // Time window for deduplication (default: 200ms)
  maxPendingRequests: number; // Maximum concurrent pending requests
  timeoutMs: number; // Request timeout (default: 30 seconds)
  enableMetrics: boolean; // Track deduplication metrics
  cleanupIntervalMs: number; // Cleanup interval (default: 5 seconds)
}

export interface DeduplicationMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  activeRequests: number;
  averageResponseTime: number;
  deduplicationRate: number;
  timeouts: number;
  errors: number;
}

/**
 * Request Deduplicator for preventing duplicate API calls
 */
export class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private metrics: DeduplicationMetrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    activeRequests: 0,
    averageResponseTime: 0,
    deduplicationRate: 0,
    timeouts: 0,
    errors: 0
  };

  private config: Required<DeduplicationConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private responseTimes: number[] = [];

  constructor(config: Partial<DeduplicationConfig> = {}) {
    this.config = {
      windowMs: config.windowMs || 200,
      maxPendingRequests: config.maxPendingRequests || 100,
      timeoutMs: config.timeoutMs || 30000,
      enableMetrics: config.enableMetrics ?? true,
      cleanupIntervalMs: config.cleanupIntervalMs || 5000,
      ...config
    };

    this.startCleanupTimer();

    logger.info('RequestDeduplicator initialized', {
      config: this.config
    });
  }

  /**
   * Execute request with deduplication
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      priority?: number;
      timeoutMs?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const startTime = performance.now();
    const existing = this.pendingRequests.get(key);

    this.metrics.totalRequests++;

    // Check for existing request
    if (existing) {
      this.metrics.deduplicatedRequests++;

      logger.debug('Request deduplicated', {
        key,
        pendingRequests: this.pendingRequests.size,
        age: Date.now() - existing.timestamp
      });

      // Return existing promise
      return existing.promise;
    }

    // Check capacity limits
    if (this.pendingRequests.size >= this.config.maxPendingRequests) {
      logger.warn('Deduplicator at capacity, forcing execution', {
        current: this.pendingRequests.size,
        max: this.config.maxPendingRequests
      });

      // Force execute without deduplication
      return this.executeWithoutDeduplication(requestFn, options?.timeoutMs);
    }

    // Create new pending request
    const promise = new Promise<T>((resolve, reject) => {
      const request: PendingRequest<T> = {
        id: this.generateRequestId(),
        promise: promise as Promise<T>,
        timestamp: Date.now(),
        resolve,
        reject,
        metadata: options?.metadata
      };

      // Set timeout for the request
      const timeout = setTimeout(() => {
        this.handleTimeout(key, request);
      }, options?.timeoutMs || this.config.timeoutMs);

      request.timeout = timeout;

      this.pendingRequests.set(key, request);
      this.metrics.activeRequests = this.pendingRequests.size;

      // Execute the actual request
      this.executeRequest(request, requestFn, startTime);
    });

    // Store the promise for deduplication
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      pendingRequest.promise = promise;
    }

    return promise;
  }

  /**
   * Check if request is pending
   */
  isPending(key: string): boolean {
    return this.pendingRequests.has(key);
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Cancel pending request
   */
  cancel(key: string): boolean {
    const request = this.pendingRequests.get(key);
    if (!request) {
      return false;
    }

    // Clear timeout
    if (request.timeout) {
      clearTimeout(request.timeout);
    }

    // Remove from pending
    this.pendingRequests.delete(key);
    this.metrics.activeRequests = this.pendingRequests.size;

    // Reject the promise
    request.reject(new Error('Request cancelled'));

    logger.debug('Request cancelled', { key, id: request.id });

    return true;
  }

  /**
   * Cancel all pending requests
   */
  cancelAll(): number {
    const count = this.pendingRequests.size;

    for (const [key, request] of this.pendingRequests.entries()) {
      if (request.timeout) {
        clearTimeout(request.timeout);
      }
      request.reject(new Error('All requests cancelled'));
    }

    this.pendingRequests.clear();
    this.metrics.activeRequests = 0;

    logger.info('All requests cancelled', { count });

    return count;
  }

  /**
   * Get deduplication metrics
   */
  getMetrics(): DeduplicationMetrics {
    const totalRequests = this.metrics.totalRequests;
    this.metrics.deduplicationRate = totalRequests > 0
      ? this.metrics.deduplicatedRequests / totalRequests
      : 0;

    return { ...this.metrics };
  }

  /**
   * Get detailed statistics
   */
  getStats() {
    const now = Date.now();
    const pending = Array.from(this.pendingRequests.values());

    return {
      pending: {
        count: pending.length,
        averageAge: pending.length > 0
          ? pending.reduce((sum, r) => sum + (now - r.timestamp), 0) / pending.length
          : 0,
        oldestAge: pending.length > 0
          ? Math.max(...pending.map(r => now - r.timestamp))
          : 0
      },
      metrics: this.getMetrics(),
      config: this.config,
      capacity: {
        current: this.pendingRequests.size,
        max: this.config.maxPendingRequests,
        utilization: (this.pendingRequests.size / this.config.maxPendingRequests) * 100
      }
    };
  }

  /**
   * Clear old pending requests
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, request] of this.pendingRequests.entries()) {
      const age = now - request.timestamp;

      // Clean up requests older than 2x the window
      if (age > this.config.windowMs * 2) {
        if (request.timeout) {
          clearTimeout(request.timeout);
        }
        this.pendingRequests.delete(key);
        cleaned++;

        logger.debug('Cleaned up stale request', {
          key,
          age,
          maxAge: this.config.windowMs * 2
        });
      }
    }

    this.metrics.activeRequests = this.pendingRequests.size;

    if (cleaned > 0) {
      logger.debug('Cleanup completed', {
        cleaned,
        remaining: this.pendingRequests.size
      });
    }

    return cleaned;
  }

  /**
   * Destroy deduplicator instance
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cancelAll();

    logger.info('RequestDeduplicator destroyed');
  }

  // ============ Private Methods ============

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  private async executeRequest<T>(
    request: PendingRequest<T>,
    requestFn: () => Promise<T>,
    startTime: number
  ): Promise<void> {
    try {
      const result = await requestFn();
      const responseTime = performance.now() - startTime;

      // Record success metrics
      this.recordResponseTime(responseTime);

      // Resolve the promise
      request.resolve(result);

      // Clean up the pending request
      const key = this.findKeyByRequest(request);
      if (key) {
        this.cleanupRequest(key);
      }

      logger.debug('Request completed', {
        requestId: request.id,
        responseTime: responseTime.toFixed(2) + 'ms'
      });

    } catch (error) {
      this.metrics.errors++;

      // Reject the promise
      request.reject(error);

      // Clean up the pending request
      const key = this.findKeyByRequest(request);
      if (key) {
        this.cleanupRequest(key);
      }

      logger.error('Request failed', {
        requestId: request.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async executeWithoutDeduplication<T>(
    requestFn: () => Promise<T>,
    timeoutMs?: number
  ): Promise<T> {
    if (timeoutMs) {
      return Promise.race([
        requestFn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
        })
      ]);
    }

    return requestFn();
  }

  private handleTimeout(key: string, request: PendingRequest): void {
    this.metrics.timeouts++;

    // Remove from pending
    this.pendingRequests.delete(key);
    this.metrics.activeRequests = this.pendingRequests.size;

    // Reject the promise
    request.reject(new Error('Request timeout'));

    logger.warn('Request timeout', {
      key,
      requestId: request.id,
      timeoutMs: this.config.timeoutMs
    });
  }

  private cleanupRequest(key: string): void {
    const request = this.pendingRequests.get(key);
    if (request && request.timeout) {
      clearTimeout(request.timeout);
    }

    this.pendingRequests.delete(key);
    this.metrics.activeRequests = this.pendingRequests.size;
  }

  private findKeyByRequest(request: PendingRequest): string | null {
    for (const [key, pendingRequest] of this.pendingRequests.entries()) {
      if (pendingRequest.id === request.id) {
        return key;
      }
    }
    return null;
  }

  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private recordResponseTime(time: number): void {
    if (this.config.enableMetrics) {
      this.responseTimes.push(time);

      // Keep only last 100 response times
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }

      this.metrics.averageResponseTime =
        this.responseTimes.reduce((sum, t) => sum + t, 0) / this.responseTimes.length;
    }
  }
}

/**
 * Create deduplication key from request parameters
 */
export function createDeduplicationKey(
  method: string,
  url: string,
  params?: Record<string, any>,
  body?: any
): string {
  const keyParts = [method.toUpperCase(), url];

  if (params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    keyParts.push(sortedParams);
  }

  if (body) {
    keyParts.push(JSON.stringify(body));
  }

  return keyParts.join('|');
}

// Global deduplicator instance
export const globalDeduplicator = new RequestDeduplicator({
  windowMs: 200,
  maxPendingRequests: 100,
  timeoutMs: 30000,
  enableMetrics: true
});

/**
 * Wrapper function for easy deduplication usage
 */
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  options?: {
    deduplicator?: RequestDeduplicator;
    timeoutMs?: number;
    metadata?: Record<string, any>;
  }
): Promise<T> {
  const deduplicator = options?.deduplicator || globalDeduplicator;
  return deduplicator.execute(key, requestFn, {
    timeoutMs: options?.timeoutMs,
    metadata: options?.metadata
  });
}

export default RequestDeduplicator;