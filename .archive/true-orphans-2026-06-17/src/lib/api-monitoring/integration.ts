/**
 * API Monitoring Integration Layer
 * Integrates monitoring system with existing FleetifyApp infrastructure
 */

import { apiMonitor } from './monitor';
import { createSupabaseMonitoringMiddleware, createFetchMonitor, setupBrowserMonitoring } from './middleware';
import { supabase } from '@/integrations/supabase/client';
import type { MonitoringConfig } from '@/types/api-monitoring';

let isInitialized = false;

/**
 * Initialize API monitoring system
 */
export async function initializeAPIMonitoring(config?: Partial<MonitoringConfig>): Promise<void> {
  if (isInitialized) {
    console.warn('API Monitoring already initialized');
    return;
  }

  try {
    // Initialize the monitoring framework
    await apiMonitor.initialize(config);

    // Apply monitoring middleware to Supabase client
    const monitoredSupabase = createSupabaseMonitoringMiddleware(supabase);

    // Setup browser monitoring for fetch and XHR
    setupBrowserMonitoring();

    // Override global fetch if enabled
    if (config?.collectHeaders !== false) {
      const originalFetch = window.fetch;
      window.fetch = createFetchMonitor(originalFetch);
    }

    // Register common FleetifyApp endpoints
    registerFleetifyEndpoints();

    isInitialized = true;
    console.log('API Monitoring initialized successfully');
  } catch (error) {
    console.error('Failed to initialize API Monitoring:', error);
    throw error;
  }
}

/**
 * Register FleetifyApp specific endpoints for monitoring
 */
function registerFleetifyEndpoints(): void {
  // Authentication endpoints
  apiMonitor.registerEndpoint('/auth/v1/user', 'GET', {
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 30,
      adaptiveThresholds: true,
    },
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 500, critical: 2000 },
      errorRateThresholds: { warning: 0.02, critical: 0.05 },
    },
  });

  apiMonitor.registerEndpoint('/auth/v1/token', 'POST', {
    rateLimit: {
      windowMs: 60000,
      maxRequests: 10, // Stricter rate limiting for auth
    },
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 1000, critical: 5000 },
      errorRateThresholds: { warning: 0.05, critical: 0.10 },
    },
  });

  // Fleet management endpoints
  apiMonitor.registerEndpoint('/vehicles', 'GET', {
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 800, critical: 3000 },
      errorRateThresholds: { warning: 0.01, critical: 0.05 },
    },
  });

  apiMonitor.registerEndpoint('/vehicles', 'POST', {
    rateLimit: {
      windowMs: 60000,
      maxRequests: 50,
    },
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 1000, critical: 5000 },
    },
  });

  // Contract management endpoints
  apiMonitor.registerEndpoint('/contracts', 'GET', {
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 600, critical: 2500 },
      errorRateThresholds: { warning: 0.01, critical: 0.03 },
    },
  });

  // Customer management endpoints
  apiMonitor.registerEndpoint('/customers', 'GET', {
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 700, critical: 3000 },
      errorRateThresholds: { warning: 0.01, critical: 0.04 },
    },
  });

  // Financial endpoints
  apiMonitor.registerEndpoint('/payments', 'GET', {
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
    },
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 800, critical: 4000 },
      errorRateThresholds: { warning: 0.005, critical: 0.02 },
    },
  });

  apiMonitor.registerEndpoint('/payments', 'POST', {
    rateLimit: {
      windowMs: 60000,
      maxRequests: 20, // Stricter for payment processing
    },
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 2000, critical: 10000 },
      errorRateThresholds: { warning: 0.01, critical: 0.05 },
    },
  });

  // Reporting endpoints (typically slow)
  apiMonitor.registerEndpoint('/reports', 'GET', {
    alerting: {
      enabled: true,
      responseTimeThresholds: { warning: 5000, critical: 15000 }, // Higher thresholds for reports
    },
    monitoring: {
      collectResponseBody: false, // Don't collect large report bodies
      samplingRate: 0.5, // Sample 50% of report requests
    },
  });

  console.log('FleetifyApp endpoints registered for monitoring');
}

/**
 * Enhanced Supabase client with monitoring
 */
export const monitoredSupabase = createSupabaseMonitoringMiddleware(supabase);

/**
 * Custom hook for monitored Supabase operations
 */
export function useMonitoredSupabase() {
  return monitoredSupabase;
}

/**
 * Setup monitoring for development environment
 */
export function setupDevelopmentMonitoring(): void {
  if (import.meta.env.DEV) {
    // Enable detailed logging in development
    console.log('Setting up development monitoring');

    // Register development-specific monitoring
    apiMonitor.registerEndpoint('/dev/*', 'GET', {
      monitoring: {
        collectRequestBody: true,
        collectResponseBody: true,
        collectHeaders: true,
      },
    });

    // Add performance monitoring to React DevTools
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot = (renderer: any, id: any) => {
        try {
          // Monitor React render performance
          const startTime = performance.now();
          setTimeout(() => {
            const endTime = performance.now();
            const renderTime = endTime - startTime;

            if (renderTime > 100) { // Log slow renders
              console.warn(`Slow React render detected: ${renderTime.toFixed(2)}ms`);
            }
          }, 0);
        } catch (error) {
          console.error('Failed to monitor React render:', error);
        }
      };
    }
  }
}

/**
 * Setup monitoring for production environment
 */
export function setupProductionMonitoring(): void {
  if (import.meta.env.PROD) {
    console.log('Setting up production monitoring');

    // Optimized production configuration
    apiMonitor.initialize({
      enabled: true,
      collectRequestBody: false,
      collectResponseBody: false,
      collectHeaders: false, // Don't collect headers in production for privacy
      collectUserAgent: true,
      collectIPAddress: false, // Don't collect IP addresses in production for privacy
      samplingRate: 0.1, // Sample 10% of requests in production
      sampleErrorRequests: true, // Always sample error requests
      retentionPeriod: 90, // Longer retention for production
      aggregationLevel: 'hour',
      asyncCollection: true,
      batchSize: 500, // Larger batches for production
      flushInterval: 60000, // Flush every minute
    });

    // Setup error tracking integration
    setupErrorTracking();
  }
}

/**
 * Integrate with error tracking systems
 */
function setupErrorTracking(): void {
  // Hook into global error handlers
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      apiMonitor.endRequest({
        requestId: 'global_error',
        statusCode: 500,
        responseTime: 0,
        errorType: 'JAVASCRIPT_ERROR',
        errorMessage: event.message,
        errorCategory: 'server_error',
        errorSeverity: 'high',
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      apiMonitor.endRequest({
        requestId: 'unhandled_promise',
        statusCode: 500,
        responseTime: 0,
        errorType: 'PROMISE_REJECTION',
        errorMessage: event.reason?.message || 'Unhandled promise rejection',
        errorCategory: 'server_error',
        errorSeverity: 'high',
      });
    });
  }
}

/**
 * Monitor specific API call with custom context
 */
export function monitorAPICall<T>(
  apiCall: () => Promise<T>,
  context: {
    operation: string;
    endpoint?: string;
    method?: string;
    userId?: string;
    companyId?: string;
  }
): Promise<T> {
  const requestId = apiMonitor.startRequest({
    method: context.method || 'CUSTOM',
    url: context.endpoint || `operation:${context.operation}`,
    headers: {},
    userId: context.userId,
    companyId: context.companyId,
  });

  const startTime = performance.now();

  return apiCall()
    .then((result) => {
      const responseTime = performance.now() - startTime;

      apiMonitor.endRequest({
        requestId,
        statusCode: 200,
        responseTime: Math.round(responseTime),
        body: result,
      });

      return result;
    })
    .catch((error) => {
      const responseTime = performance.now() - startTime;

      apiMonitor.endRequest({
        requestId,
        statusCode: error.status || 500,
        responseTime: Math.round(responseTime),
        errorType: 'API_ERROR',
        errorMessage: error.message,
        errorCategory: error.status >= 500 ? 'server_error' : 'client_error',
        errorSeverity: error.status >= 500 ? 'high' : 'medium',
      });

      throw error;
    });
}

/**
 * Get monitoring configuration from environment variables
 */
export function getMonitoringConfigFromEnv(): Partial<MonitoringConfig> {
  const config: Partial<MonitoringConfig> = {};

  // Read configuration from environment variables
  if (import.meta.env.VITE_API_MONITORING_ENABLED !== undefined) {
    config.enabled = import.meta.env.VITE_API_MONITORING_ENABLED === 'true';
  }

  if (import.meta.env.VITE_API_MONITORING_SAMPLING_RATE) {
    config.samplingRate = parseFloat(import.meta.env.VITE_API_MONITORING_SAMPLING_RATE);
  }

  if (import.meta.env.VITE_API_MONITORING_RETENTION_DAYS) {
    config.retentionPeriod = parseInt(import.meta.env.VITE_API_MONITORING_RETENTION_DAYS);
  }

  if (import.meta.env.VITE_API_MONITORING_COLLECT_REQUESTS !== undefined) {
    config.collectRequestBody = import.meta.env.VITE_API_MONITORING_COLLECT_REQUESTS === 'true';
  }

  if (import.meta.env.VITE_API_MONITORING_COLLECT_RESPONSES !== undefined) {
    config.collectResponseBody = import.meta.env.VITE_API_MONITORING_COLLECT_RESPONSES === 'true';
  }

  return config;
}

/**
 * Check if monitoring should be enabled based on conditions
 */
export function shouldEnableMonitoring(): boolean {
  // Always enable in development
  if (import.meta.env.DEV) {
    return true;
  }

  // Check environment variable
  if (import.meta.env.VITE_API_MONITORING_ENABLED !== undefined) {
    return import.meta.env.VITE_API_MONITORING_ENABLED === 'true';
  }

  // Default to enabled for production
  return import.meta.env.PROD;
}

/**
 * Initialize monitoring with appropriate configuration
 */
export async function initializeMonitoring(): Promise<void> {
  if (!shouldEnableMonitoring()) {
    console.log('API Monitoring is disabled');
    return;
  }

  try {
    // Get configuration from environment
    const envConfig = getMonitoringConfigFromEnv();

    // Add environment-specific configuration
    if (import.meta.env.DEV) {
      setupDevelopmentMonitoring();
    } else {
      setupProductionMonitoring();
    }

    // Initialize with merged configuration
    await initializeAPIMonitoring(envConfig);
  } catch (error) {
    console.error('Failed to initialize API monitoring:', error);
    // Don't throw error in production to avoid breaking the app
    if (!import.meta.env.PROD) {
      throw error;
    }
  }
}

// Export monitoring utilities
export {
  apiMonitor,
  createSupabaseMonitoringMiddleware,
  createFetchMonitor,
  setupBrowserMonitoring,
};

// Export types for external use
export type {
  MonitoringConfig,
  APIRequest,
  APIResponse,
  APIMetrics,
  APIHealthStatus,
};