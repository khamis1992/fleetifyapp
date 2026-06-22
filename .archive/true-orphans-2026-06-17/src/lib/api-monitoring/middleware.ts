/**
 * API Monitoring Middleware
 * Middleware for intercepting and monitoring API requests/responses
 */

import { apiMonitor } from './monitor';
import type { APIRequest, APIResponse, ErrorCategory, ErrorType, ErrorSeverity } from '@/types/api-monitoring';

export interface MonitoringMiddlewareOptions {
  excludePaths?: string[];
  excludeMethods?: string[];
  excludeStatusCodes?: number[];
  samplingRate?: number;
  collectHeaders?: boolean;
  collectBody?: boolean;
}

/**
 * Create monitoring middleware for Express.js style applications
 */
export function createMonitoringMiddleware(options: MonitoringMiddlewareOptions = {}) {
  const {
    excludePaths = ['/health', '/metrics', '/favicon.ico'],
    excludeMethods = ['OPTIONS'],
    excludeStatusCodes = [],
    samplingRate = 1.0,
    collectHeaders = true,
    collectBody = false,
  } = options;

  return (req: any, res: any, next: any) => {
    // Skip monitoring for excluded paths/methods
    if (excludePaths.some(path => req.path?.includes(path)) ||
        excludeMethods.includes(req.method)) {
      return next();
    }

    // Apply sampling
    if (Math.random() > samplingRate) {
      return next();
    }

    const startTime = Date.now();
    const requestId = apiMonitor.startRequest({
      method: req.method,
      url: req.originalUrl || req.url,
      headers: collectHeaders ? req.headers : {},
      body: collectBody ? req.body : undefined,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      sessionId: req.sessionID,
    });

    // Override res.end to capture response
    const originalEnd = res.end;
    let responseData: any;
    let responseSize = 0;

    res.end = function(chunk?: any, encoding?: any) {
      if (chunk) {
        responseData = chunk;
        responseSize = Buffer.byteLength(chunk, encoding || 'utf8');
      }

      const responseTime = Date.now() - startTime;

      // Determine error category and severity
      const errorInfo = categorizeError(res.statusCode);

      apiMonitor.endRequest({
        requestId,
        statusCode: res.statusCode,
        headers: collectHeaders ? res.getHeaders() : {},
        body: collectBody ? responseData : undefined,
        responseTime,
        size: responseSize,
        ...errorInfo,
      });

      originalEnd.call(this, chunk, encoding);
    };

    // Handle response errors
    res.on('error', (error: Error) => {
      const responseTime = Date.now() - startTime;
      const errorInfo = categorizeError(500, error);

      apiMonitor.endRequest({
        requestId,
        statusCode: 500,
        responseTime,
        errorType: errorInfo.errorType,
        errorMessage: error.message,
        errorCategory: errorInfo.errorCategory,
        errorSeverity: errorInfo.errorSeverity,
      });
    });

    next();
  };
}

/**
 * Create monitoring middleware for Supabase client
 */
export function createSupabaseMonitoringMiddleware(supabaseClient: any) {
  const originalRpc = supabaseClient.rpc.bind(supabaseClient);
  const originalFrom = supabaseClient.from.bind(supabaseClient);

  // Monitor RPC calls
  supabaseClient.rpc = function(fn: string, params?: any) {
    const startTime = Date.now();
    const requestId = apiMonitor.startRequest({
      method: 'RPC',
      url: `rpc:${fn}`,
      headers: {},
      body: params,
    });

    return originalRpc(fn, params)
      .then((result: any) => {
        const responseTime = Date.now() - startTime;

        apiMonitor.endRequest({
          requestId,
          statusCode: result.error ? 400 : 200,
          responseTime,
          body: result.data,
          errorType: result.error ? 'DATABASE_ERROR' : undefined,
          errorMessage: result.error?.message,
          errorCategory: result.error ? 'database' : undefined,
        });

        return result;
      })
      .catch((error: any) => {
        const responseTime = Date.now() - startTime;
        const errorInfo = categorizeError(500, error);

        apiMonitor.endRequest({
          requestId,
          statusCode: 500,
          responseTime,
          errorType: errorInfo.errorType,
          errorMessage: error.message,
          errorCategory: errorInfo.errorCategory,
          errorSeverity: errorInfo.errorSeverity,
        });

        throw error;
      });
  };

  // Monitor table operations
  supabaseClient.from = function(table: string) {
    const startTime = Date.now();
    const requestId = apiMonitor.startRequest({
      method: 'SELECT',
      url: `table:${table}`,
      headers: {},
    });

    const tableBuilder = originalFrom(table);

    // Override common methods to capture operations
    const originalSelect = tableBuilder.select.bind(tableBuilder);
    const originalInsert = tableBuilder.insert.bind(tableBuilder);
    const originalUpdate = tableBuilder.update.bind(tableBuilder);
    const originalDelete = tableBuilder.delete.bind(tableBuilder);

    tableBuilder.select = function(...args: any[]) {
      return monitorQueryOperation('SELECT', requestId, startTime, originalSelect(...args));
    };

    tableBuilder.insert = function(...args: any[]) {
      return monitorQueryOperation('INSERT', requestId, startTime, originalInsert(...args));
    };

    tableBuilder.update = function(...args: any[]) {
      return monitorQueryOperation('UPDATE', requestId, startTime, originalUpdate(...args));
    };

    tableBuilder.delete = function(...args: any[]) {
      return monitorQueryOperation('DELETE', requestId, startTime, originalDelete(...args));
    };

    return tableBuilder;
  };

  function monitorQueryOperation(
    operation: string,
    requestId: string,
    startTime: number,
    queryBuilder: any
  ): any {
    // Override the then/catch methods to intercept the result
    const originalThen = queryBuilder.then.bind(queryBuilder);
    const originalCatch = queryBuilder.catch.bind(queryBuilder);

    queryBuilder.then = function(onFulfilled?: any, onRejected?: any) {
      return originalThen(
        (result: any) => {
          const responseTime = Date.now() - startTime;

          apiMonitor.endRequest({
            requestId,
            statusCode: result.error ? 400 : 200,
            responseTime,
            body: result.data,
            errorType: result.error ? 'DATABASE_ERROR' : undefined,
            errorMessage: result.error?.message,
            errorCategory: result.error ? 'database' : undefined,
          });

          return onFulfilled ? onFulfilled(result) : result;
        },
        (error: any) => {
          const responseTime = Date.now() - startTime;
          const errorInfo = categorizeError(500, error);

          apiMonitor.endRequest({
            requestId,
            statusCode: 500,
            responseTime,
            errorType: errorInfo.errorType,
            errorMessage: error.message,
            errorCategory: errorInfo.errorCategory,
            errorSeverity: errorInfo.errorSeverity,
          });

          return onRejected ? onRejected(error) : Promise.reject(error);
        }
      );
    };

    queryBuilder.catch = function(onRejected?: any) {
      return originalCatch((error: any) => {
        const responseTime = Date.now() - startTime;
        const errorInfo = categorizeError(500, error);

        apiMonitor.endRequest({
          requestId,
          statusCode: 500,
          responseTime,
          errorType: errorInfo.errorType,
          errorMessage: error.message,
          errorCategory: errorInfo.errorCategory,
          errorSeverity: errorInfo.errorSeverity,
        });

        return onRejected ? onRejected(error) : Promise.reject(error);
      });
    };

    return queryBuilder;
  }

  return supabaseClient;
}

/**
 * Create monitoring wrapper for fetch API
 */
export function createFetchMonitor(originalFetch: typeof fetch = fetch) {
  return function monitoredFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = Date.now();
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';

    // Skip monitoring for certain requests
    if (shouldSkipRequest(url, method)) {
      return originalFetch(input, init);
    }

    const requestId = apiMonitor.startRequest({
      method,
      url,
      headers: init?.headers ? Object.fromEntries(
        new Headers(init.headers).entries()
      ) : {},
      body: init?.body,
    });

    return originalFetch(input, init)
      .then((response) => {
        const responseTime = Date.now() - startTime;

        // Clone response to read body without consuming it
        const clonedResponse = response.clone();

        // Get response size
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength, 10) : 0;

        // Determine error information
        const errorInfo = categorizeError(response.status);

        apiMonitor.endRequest({
          requestId,
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          responseTime,
          size,
          errorType: errorInfo.errorType,
          errorCategory: errorInfo.errorCategory,
          errorSeverity: errorInfo.errorSeverity,
        });

        return response;
      })
      .catch((error: Error) => {
        const responseTime = Date.now() - startTime;
        const errorInfo = categorizeError(0, error);

        apiMonitor.endRequest({
          requestId,
          statusCode: 0,
          responseTime,
          errorType: errorInfo.errorType,
          errorMessage: error.message,
          errorCategory: errorInfo.errorCategory,
          errorSeverity: errorInfo.errorSeverity,
        });

        throw error;
      });
  };
}

/**
 * Monitor browser navigation and API calls
 */
export function setupBrowserMonitoring() {
  if (typeof window === 'undefined') return;

  // Monitor fetch API
  const originalFetch = window.fetch;
  window.fetch = createFetchMonitor(originalFetch);

  // Monitor XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
    this._monitoringData = {
      method,
      url: url.toString(),
      startTime: Date.now(),
    };
    return originalXHROpen.call(this, method, url);
  };

  XMLHttpRequest.prototype.send = function(body?: any) {
    if (!this._monitoringData || shouldSkipRequest(this._monitoringData.url, this._monitoringData.method)) {
      return originalXHRSend.call(this, body);
    }

    const requestId = apiMonitor.startRequest({
      method: this._monitoringData.method,
      url: this._monitoringData.url,
      headers: {}, // Headers not easily accessible in XHR
      body,
    });

    const originalOnReadyStateChange = this.onreadystatechange;
    this.onreadystatechange = function() {
      if (this.readyState === XMLHttpRequest.DONE) {
        const responseTime = Date.now() - this._monitoringData.startTime;
        const errorInfo = categorizeError(this.status);

        apiMonitor.endRequest({
          requestId,
          statusCode: this.status,
          headers: {},
          responseTime,
          errorType: errorInfo.errorType,
          errorMessage: this.responseText,
          errorCategory: errorInfo.errorCategory,
          errorSeverity: errorInfo.errorSeverity,
        });
      }

      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.call(this);
      }
    };

    return originalXHRSend.call(this, body);
  };

  // Monitor page navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function(state, title, url) {
    apiMonitor.startRequest({
      method: 'NAVIGATION',
      url: url?.toString() || window.location.href,
      headers: { referrer: document.referrer },
    });

    return originalPushState.call(this, state, title, url);
  };

  history.replaceState = function(state, title, url) {
    apiMonitor.startRequest({
      method: 'NAVIGATION',
      url: url?.toString() || window.location.href,
      headers: { referrer: document.referrer },
    });

    return originalReplaceState.call(this, state, title, url);
  };

  window.addEventListener('popstate', () => {
    apiMonitor.startRequest({
      method: 'NAVIGATION',
      url: window.location.href,
      headers: { referrer: document.referrer },
    });
  });
}

// Helper functions

function categorizeError(
  statusCode: number,
  error?: Error
): {
  errorType?: ErrorType;
  errorCategory?: ErrorCategory;
  errorSeverity?: ErrorSeverity;
  errorMessage?: string;
} {
  if (statusCode === 0 || !navigator.onLine) {
    return {
      errorType: 'NETWORK_ERROR',
      errorCategory: 'network',
      errorSeverity: 'high',
      errorMessage: error?.message || 'Network error',
    };
  }

  if (statusCode >= 500) {
    return {
      errorType: 'SERVER_ERROR',
      errorCategory: 'server_error',
      errorSeverity: 'critical',
      errorMessage: error?.message || `Server error ${statusCode}`,
    };
  }

  if (statusCode === 429) {
    return {
      errorType: 'RATE_LIMIT_ERROR',
      errorCategory: 'rate_limit',
      errorSeverity: 'high',
      errorMessage: error?.message || 'Rate limit exceeded',
    };
  }

  if (statusCode === 401) {
    return {
      errorType: 'AUTHENTICATION_ERROR',
      errorCategory: 'authentication',
      errorSeverity: 'medium',
      errorMessage: error?.message || 'Authentication failed',
    };
  }

  if (statusCode === 403) {
    return {
      errorType: 'AUTHORIZATION_ERROR',
      errorCategory: 'authorization',
      errorSeverity: 'medium',
      errorMessage: error?.message || 'Authorization failed',
    };
  }

  if (statusCode === 404) {
    return {
      errorType: 'HTTP_ERROR',
      errorCategory: 'not_found',
      errorSeverity: 'low',
      errorMessage: error?.message || 'Resource not found',
    };
  }

  if (statusCode >= 400) {
    return {
      errorType: 'VALIDATION_ERROR',
      errorCategory: 'validation',
      errorSeverity: 'medium',
      errorMessage: error?.message || `Client error ${statusCode}`,
    };
  }

  return {};
}

function shouldSkipRequest(url: string, method: string): boolean {
  const skipPaths = [
    '/health',
    '/metrics',
    '/favicon.ico',
    'data:',
    'blob:',
    'chrome-extension://',
    'moz-extension://',
  ];

  const skipMethods = ['OPTIONS', 'HEAD'];

  return (
    skipPaths.some(path => url.includes(path)) ||
    skipMethods.includes(method) ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('moz-extension://')
  );
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: any, res: any, next: any) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Check if rate limit applies
    if (options.skipSuccessfulRequests || options.skipFailedRequests) {
      // This would need to be handled in the response middleware
      return next();
    }

    const current = requests.get(key);

    if (!current || now > current.resetTime) {
      // New window or reset window
      requests.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (current.count >= options.maxRequests) {
      // Rate limited
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests',
        retryAfter: Math.ceil((current.resetTime - now) / 1000),
      });

      // Log rate limit hit
      apiMonitor.startRequest({
        method: req.method,
        url: req.originalUrl || req.url,
        headers: {},
      });

      apiMonitor.endRequest({
        requestId: '', // Will be empty since we're not tracking
        statusCode: 429,
        responseTime: 0,
        errorType: 'RATE_LIMIT_ERROR',
        errorMessage: 'Rate limit exceeded',
        errorCategory: 'rate_limit',
        errorSeverity: 'high',
      });

      return;
    }

    current.count++;
    next();
  };
}

export default {
  createMonitoringMiddleware,
  createSupabaseMonitoringMiddleware,
  createFetchMonitor,
  setupBrowserMonitoring,
  createRateLimitMiddleware,
};