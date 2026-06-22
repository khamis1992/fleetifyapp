import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { usePerformanceMonitor, PerformanceMonitorOptions } from './usePerformanceMonitor';

/**
 * Enhanced query hook that combines React Query with performance monitoring
 * Specifically designed for critical queries that need performance tracking
 */
export function useMonitoredQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: {
    // Performance monitoring options
    performanceOptions?: PerformanceMonitorOptions;
    // Standard React Query options (excluding queryKey and queryFn)
    queryOptions?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'>;
  }
) {
  const { performanceOptions = {}, queryOptions = {} } = options || {};

  // Use the performance monitor hook for enhanced tracking
  const performanceResult = usePerformanceMonitor<TData, TError>({
    queryKey,
    queryFn,
    performanceOptions,
    ...queryOptions
  });

  return performanceResult;
}

/**
 * Hook specifically for dashboard data queries with performance monitoring
 * Dashboard queries are typically performance-critical
 */
export function useDashboardQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceOptions?: PerformanceMonitorOptions;
  }
) {
  return useMonitoredQuery<TData, TError>(queryKey, queryFn, {
    performanceOptions: {
      slowQueryThreshold: 800, // Dashboard queries should be faster (< 800ms)
      enableDetailedLogging: true,
      trackCacheMetrics: true,
      ...options?.performanceOptions
    },
    ...options
  });
}

/**
 * Hook specifically for user data queries with performance monitoring
 * User data queries are critical for application functionality
 */
export function useUserDataQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceOptions?: PerformanceMonitorOptions;
  }
) {
  return useMonitoredQuery<TData, TError>(queryKey, queryFn, {
    performanceOptions: {
      slowQueryThreshold: 600, // User data should be very fast (< 600ms)
      enableDetailedLogging: true,
      trackCacheMetrics: true,
      ...options?.performanceOptions
    },
    ...options
  });
}

/**
 * Hook for financial data queries with performance monitoring
 * Financial queries need to be reliable and fast
 */
export function useFinanceQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceOptions?: PerformanceMonitorOptions;
  }
) {
  return useMonitoredQuery<TData, TError>(queryKey, queryFn, {
    performanceOptions: {
      slowQueryThreshold: 1200, // Financial queries can be slower due to complexity
      enableDetailedLogging: true,
      trackCacheMetrics: true,
      ...options?.performanceOptions
    },
    ...options
  });
}

/**
 * Hook for fleet/vehicle data queries with performance monitoring
 * Fleet data queries can be large and need optimization tracking
 */
export function useFleetQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceOptions?: PerformanceMonitorOptions;
  }
) {
  return useMonitoredQuery<TData, TError>(queryKey, queryFn, {
    performanceOptions: {
      slowQueryThreshold: 1500, // Fleet queries can be slower due to large datasets
      enableDetailedLogging: true,
      trackCacheMetrics: true,
      ...options?.performanceOptions
    },
    ...options
  });
}

/**
 * Hook for customer data queries with performance monitoring
 * Customer data is critical for business operations
 */
export function useCustomerQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceOptions?: PerformanceMonitorOptions;
  }
) {
  return useMonitoredQuery<TData, TError>(queryKey, queryFn, {
    performanceOptions: {
      slowQueryThreshold: 1000, // Customer queries should be reasonably fast
      enableDetailedLogging: true,
      trackCacheMetrics: true,
      ...options?.performanceOptions
    },
    ...options
  });
}

/**
 * Hook for contract data queries with performance monitoring
 * Contract data queries are important for legal and business operations
 */
export function useContractQuery<TData = unknown, TError = unknown>(
  queryKey: string[],
  queryFn: UseQueryOptions<TData, TError>['queryFn'],
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    performanceOptions?: PerformanceMonitorOptions;
  }
) {
  return useMonitoredQuery<TData, TError>(queryKey, queryFn, {
    performanceOptions: {
      slowQueryThreshold: 1000, // Contract queries should be reasonably fast
      enableDetailedLogging: true,
      trackCacheMetrics: true,
      ...options?.performanceOptions
    },
    ...options
  });
}