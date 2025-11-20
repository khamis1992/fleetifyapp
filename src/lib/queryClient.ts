/**
 * Enhanced React Query Client Configuration
 *
 * Centralized React Query configuration with performance optimizations.
 * Integrates request deduplication, intelligent caching, and performance monitoring.
 * Optimized for FleetifyApp's performance requirements.
 */

import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';
import { toast } from 'sonner';
import { getCacheByType } from '@/services/core/ApiCache';
import { globalDeduplicator, createDeduplicationKey } from '@/services/core/RequestDeduplicator';
import { globalPerformanceMonitor } from '@/services/core/PerformanceMonitor';

// Feature flag for performance optimizations
const PERFORMANCE_OPTIMIZATIONS_ENABLED = import.meta.env?.VITE_API_PERFORMANCE_OPTIMIZATIONS === 'true';

/**
 * Enhanced query configuration with performance optimizations
 */
const defaultOptions = {
  queries: {
    // Cache configuration
    staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache (formerly cacheTime)

    // Retry configuration
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for 5xx errors
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch when reconnecting
    refetchOnMount: true, // Refetch on component mount

    // Performance optimizations
    networkMode: 'online', // Only fetch when online
    retryOnMount: false, // Don't retry on mount if already failed

    // Error handling
    throwOnError: false, // Handle errors via onError callbacks
  },

  mutations: {
    // Retry configuration for mutations
    retry: (failureCount: number, error: any) => {
      // Don't retry on validation errors
      if (error?.status === 400) {
        return false;
      }
      return failureCount < 1; // Retry once for network errors
    },

    // Network mode
    networkMode: 'online',

    // Error handling
    onError: (error: Error, variables: any, context: any) => {
      logger.error('Mutation error:', { error, variables, context });

      // Record error in performance monitor
      if (PERFORMANCE_OPTIMIZATIONS_ENABLED) {
        globalPerformanceMonitor.record({
          name: 'mutation_error',
          duration: 0,
          success: false,
          metadata: { error: error.message, variables }
        });
      }

      toast.error('حدث خطأ', {
        description: error.message
      });
    },

    onSuccess: (data: any, variables: any, context: any) => {
      // Record success in performance monitor
      if (PERFORMANCE_OPTIMIZATIONS_ENABLED) {
        globalPerformanceMonitor.record({
          name: 'mutation_success',
          duration: 0,
          success: true,
          metadata: { variables }
        });
      }
    }
  }
};

/**
 * Enhanced query function with performance optimizations
 */
export function createOptimizedQueryFn<T = any>(
  queryFn: () => Promise<T>,
  options: {
    cacheType?: keyof ReturnType<typeof getCacheByType>;
    enableDeduplication?: boolean;
    enablePerformanceMonitoring?: boolean;
    deduplicationKey?: string;
  } = {}
) {
  return async (): Promise<T> => {
    if (!PERFORMANCE_OPTIMIZATIONS_ENABLED) {
      return queryFn();
    }

    const {
      cacheType = 'config',
      enableDeduplication = true,
      enablePerformanceMonitoring = true,
      deduplicationKey
    } = options;

    const cache = getCacheByType(cacheType);
    const key = deduplicationKey || `query_${Date.now()}_${Math.random()}`;

    // Check cache first
    if (cache) {
      const cachedResult = cache.get(key);
      if (cachedResult) {
        logger.debug('Query result from cache', { key, cacheType });
        return cachedResult;
      }
    }

    // Set up performance monitoring
    const endTimer = enablePerformanceMonitoring
      ? globalPerformanceMonitor.startTimer('api_query', { cacheType })
      : () => ({ duration: 0, success: true });

    try {
      let result: T;

      if (enableDeduplication) {
        // Use request deduplication
        result = await globalDeduplicator.execute(key, queryFn, {
          metadata: { cacheType, queryKey: key }
        });
      } else {
        result = await queryFn();
      }

      // Cache the result
      if (cache) {
        cache.set(key, result);
      }

      // Record successful metric
      const metric = endTimer({ success: true });
      if (enablePerformanceMonitoring) {
        globalPerformanceMonitor.record(metric);
      }

      logger.debug('Query completed successfully', {
        key,
        cacheType,
        duration: metric.duration,
        fromCache: false
      });

      return result;

    } catch (error) {
      // Record error metric
      const metric = endTimer({ success: false, statusCode: (error as any)?.status });
      if (enablePerformanceMonitoring) {
        globalPerformanceMonitor.record(metric);
      }

      logger.error('Query failed', {
        key,
        cacheType,
        error: error instanceof Error ? error.message : String(error),
        duration: metric.duration
      });

      throw error;
    }
  };
}

/**
 * Enhanced mutation function with performance optimizations
 */
export function createOptimizedMutationFn<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    enablePerformanceMonitoring?: boolean;
    cacheInvalidationKeys?: string[];
  } = {}
) {
  return async (variables: TVariables): Promise<TData> => {
    const { enablePerformanceMonitoring = true, cacheInvalidationKeys = [] } = options;

    if (!PERFORMANCE_OPTIMIZATIONS_ENABLED) {
      return mutationFn(variables);
    }

    // Set up performance monitoring
    const endTimer = enablePerformanceMonitoring
      ? globalPerformanceMonitor.startTimer('api_mutation', { variables })
      : () => ({ duration: 0, success: true });

    try {
      const result = await mutationFn(variables);

      // Invalidate caches
      if (cacheInvalidationKeys.length > 0) {
        const configCache = getCacheByType('config');
        cacheInvalidationKeys.forEach(key => {
          configCache?.delete(key);
        });
      }

      // Record successful metric
      const metric = endTimer({ success: true });
      if (enablePerformanceMonitoring) {
        globalPerformanceMonitor.record(metric);
      }

      logger.debug('Mutation completed successfully', {
        variables,
        duration: metric.duration,
        cacheInvalidationKeys
      });

      return result;

    } catch (error) {
      // Record error metric
      const metric = endTimer({ success: false, statusCode: (error as any)?.status });
      if (enablePerformanceMonitoring) {
        globalPerformanceMonitor.record(metric);
      }

      logger.error('Mutation failed', {
        variables,
        error: error instanceof Error ? error.message : String(error),
        duration: metric.duration
      });

      throw error;
    }
  };
}

/**
 * Create and configure the Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions,
  logger: {
    log: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message)
  }
});

/**
 * Create and configure the Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions,
  logger: {
    log: (message) => logger.debug(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message)
  }
});

/**
 * Enhanced query key factories with performance optimization hints
 * Use these for consistent query keys across the app
 */
export const queryKeys = {
  // Contracts - high cache priority
  contracts: {
    all: (companyId?: string) => ['contracts', companyId] as const,
    detail: (id: string) => ['contract', id] as const,
    byCustomer: (customerId: string) => ['contracts', 'customer', customerId] as const,
    stats: (companyId: string) => ['contract-stats', companyId] as const,
    active: (companyId: string) => ['contracts', 'active', companyId] as const,
    expiring: (companyId: string, days: number) => ['contracts', 'expiring', companyId, days] as const,
  },

  // Payments - medium cache priority, needs deduplication
  payments: {
    all: (companyId?: string) => ['payments', companyId] as const,
    detail: (id: string) => ['payment', id] as const,
    byContract: (contractId: string) => ['payments', 'contract', contractId] as const,
    unmatched: (companyId: string) => ['payments', 'unmatched', companyId] as const,
    matches: (paymentId: string) => ['payment-matches', paymentId] as const,
    stats: (companyId: string) => ['payment-stats', companyId] as const,
  },

  // Invoices - high cache priority, fiscal sensitivity
  invoices: {
    all: (companyId?: string) => ['invoices', companyId] as const,
    detail: (id: string) => ['invoice', id] as const,
    pending: (companyId: string) => ['invoices', 'pending', companyId] as const,
    overdue: (companyId: string) => ['invoices', 'overdue', companyId] as const,
    byStatus: (companyId: string, status: string) => ['invoices', 'status', companyId, status] as const,
  },

  // Customers - high cache priority, changes infrequently
  customers: {
    all: (companyId?: string) => ['customers', companyId] as const,
    detail: (id: string) => ['customer', id] as const,
    search: (query: string, companyId?: string) => ['customers', 'search', query, companyId] as const,
    active: (companyId: string) => ['customers', 'active', companyId] as const,
  },

  // Vehicles - high cache priority, real-time updates needed
  vehicles: {
    all: (companyId?: string) => ['vehicles', companyId] as const,
    detail: (id: string) => ['vehicle', id] as const,
    available: (companyId: string) => ['vehicles', 'available', companyId] as const,
    byStatus: (companyId: string, status: string) => ['vehicles', 'status', companyId, status] as const,
    location: (companyId: string) => ['vehicles', 'location', companyId] as const,
  },

  // Fleet operations - low cache priority, real-time
  fleet: {
    status: (companyId: string) => ['fleet', 'status', companyId] as const,
    utilization: (companyId: string, period: string) => ['fleet', 'utilization', companyId, period] as const,
    maintenance: (companyId: string) => ['fleet', 'maintenance', companyId] as const,
    alerts: (companyId: string) => ['fleet', 'alerts', companyId] as const,
  },

  // Financial data - high cache priority, audit trail
  financial: {
    overview: (companyId: string, period: string) => ['financial', 'overview', companyId, period] as const,
    transactions: (companyId: string, filters?: any) => ['financial', 'transactions', companyId, filters] as const,
    revenue: (companyId: string, period: string) => ['financial', 'revenue', companyId, period] as const,
    expenses: (companyId: string, period: string) => ['financial', 'expenses', companyId, period] as const,
    balance: (companyId: string) => ['financial', 'balance', companyId] as const,
  },

  // Inventory - medium cache priority, multi-warehouse
  inventory: {
    all: (companyId: string) => ['inventory', companyId] as const,
    byWarehouse: (companyId: string, warehouseId: string) => ['inventory', 'warehouse', companyId, warehouseId] as const,
    lowStock: (companyId: string) => ['inventory', 'low-stock', companyId] as const,
    movements: (companyId: string, itemId?: string) => ['inventory', 'movements', companyId, itemId] as const,
  },

  // Approvals - low cache priority, workflow critical
  approvals: {
    pending: (userId: string) => ['pending-approvals', userId] as const,
    all: (companyId: string) => ['approvals', companyId] as const,
    history: (userId: string) => ['approvals', 'history', userId] as const,
    workflow: (workflowId: string) => ['approvals', 'workflow', workflowId] as const,
  },

  // System configuration - very high cache priority
  config: {
    company: (companyId: string) => ['config', 'company', companyId] as const,
    users: (companyId: string) => ['config', 'users', companyId] as const,
    permissions: (userId: string) => ['config', 'permissions', userId] as const,
    settings: (companyId: string) => ['config', 'settings', companyId] as const,
    features: (companyId: string) => ['config', 'features', companyId] as const,
  }
};

/**
 * Performance optimization utilities for React Query
 */
export const queryOptimizations = {
  /**
   * Create optimized query options with cache hints
   */
  createQueryOptions: (queryKey: readonly unknown[], options: {
    cacheType?: keyof ReturnType<typeof getCacheByType>;
    staleTime?: number;
    gcTime?: number;
    enableDeduplication?: boolean;
  } = {}) => {
    const { cacheType = 'config', staleTime, gcTime, enableDeduplication = true } = options;

    return {
      queryKey,
      queryFn: createOptimizedQueryFn(async () => {
        // This would be replaced with actual query implementation
        throw new Error('Query function not implemented');
      }, {
        cacheType,
        enableDeduplication,
        deduplicationKey: Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)
      }),
      staleTime: staleTime || getDefaultStaleTime(cacheType),
      gcTime: gcTime || getDefaultGcTime(cacheType),
    };
  },

  /**
   * Prefetch multiple queries efficiently
   */
  prefetchQueries: async (
    queries: Array<{ queryKey: readonly unknown[]; queryFn: () => Promise<any> }>,
    options?: { maxConcurrency?: number }
  ) => {
    const { maxConcurrency = 3 } = options || {};

    // Process queries in batches to avoid overwhelming the system
    for (let i = 0; i < queries.length; i += maxConcurrency) {
      const batch = queries.slice(i, i + maxConcurrency);

      await Promise.allSettled(
        batch.map(({ queryKey, queryFn }) =>
          queryClient.prefetchQuery({
            queryKey,
            queryFn: createOptimizedQueryFn(queryFn, {
              deduplicationKey: Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey)
            })
          })
        )
      );
    }
  },

  /**
   * Invalidate related queries efficiently
   */
  invalidateRelatedQueries: (baseKey: string[], patterns: RegExp[]) => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    queries.forEach(query => {
      const queryKeyStr = JSON.stringify(query.queryKey);

      // Check if query key matches any pattern
      if (patterns.some(pattern => pattern.test(queryKeyStr))) {
        queryClient.invalidateQueries({ queryKey: query.queryKey });
      }
    });
  }
};

/**
 * Get default stale time based on cache type
 */
function getDefaultStaleTime(cacheType: string): number {
  switch (cacheType) {
    case 'user': return 15 * 60 * 1000; // 15 minutes
    case 'fleet': return 2 * 60 * 1000;  // 2 minutes (real-time)
    case 'financial': return 10 * 60 * 1000; // 10 minutes
    case 'customer': return 30 * 60 * 1000; // 30 minutes
    case 'contract': return 15 * 60 * 1000; // 15 minutes
    case 'config': return 60 * 60 * 1000; // 1 hour
    default: return 5 * 60 * 1000; // 5 minutes
  }
}

/**
 * Get default garbage collection time based on cache type
 */
function getDefaultGcTime(cacheType: string): number {
  switch (cacheType) {
    case 'user': return 30 * 60 * 1000; // 30 minutes
    case 'fleet': return 5 * 60 * 1000;   // 5 minutes
    case 'financial': return 20 * 60 * 1000; // 20 minutes
    case 'customer': return 60 * 60 * 1000; // 1 hour
    case 'contract': return 30 * 60 * 1000; // 30 minutes
    case 'config': return 24 * 60 * 60 * 1000; // 24 hours
    default: return 10 * 60 * 1000; // 10 minutes
  }
}
