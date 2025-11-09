import { useRef, useCallback, useMemo } from 'react';
import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { performanceLogger } from '../lib/performanceLogger';

// Type definitions for React Query callback parameters
type OnSuccessCallback<TData> = (data: TData) => void;
type OnErrorCallback<TError> = (error: TError) => void;
type OnSettledCallback = () => void;

// Performance metrics interface
export interface QueryPerformanceMetrics {
  queryKey: string[];
  executionCount: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  isSlowQuery: boolean;
  lastExecutionTime: number;
}

// Performance monitoring options
export interface PerformanceMonitorOptions {
  queryKey: string[];
  slowQueryThreshold?: number; // Default: 1000ms
  enableDetailedLogging?: boolean; // Default: true
  trackCacheMetrics?: boolean; // Default: true
}

// Enhanced query options with performance monitoring
export interface MonitoredQueryOptions<TData, TError = unknown>
  extends Omit<UseQueryOptions<TData, TError>, 'queryKey'> {
  queryKey: string[];
  performanceOptions?: PerformanceMonitorOptions;
}

// Performance monitoring result
export interface UsePerformanceMonitorResult<TData, TError = unknown>
  extends UseQueryResult<TData, TError> {
  performanceMetrics?: QueryPerformanceMetrics;
  clearMetrics: () => void;
}

// Global performance metrics storage
const globalMetrics = new Map<string, QueryPerformanceMetrics>();

/**
 * Performance monitoring hook that wraps useQuery to add performance logging,
 * tracks query execution times, cache hits/misses, and provides performance metrics.
 */
export function usePerformanceMonitor<TData, TError = unknown>(
  options: MonitoredQueryOptions<TData, TError>
): UsePerformanceMonitorResult<TData, TError> {
  const {
    queryKey,
    performanceOptions = {} as PerformanceMonitorOptions,
    ...queryOptions
  } = options;

  const slowQueryThreshold = performanceOptions.slowQueryThreshold ?? 1000;
  const enableDetailedLogging = performanceOptions.enableDetailedLogging ?? true;
  const trackCacheMetrics = performanceOptions.trackCacheMetrics ?? true;

  const queryKeyString = useMemo(() => JSON.stringify(queryKey), [queryKey]);
  const metricsRef = useRef<QueryPerformanceMetrics>();

  // Initialize or get existing metrics for this query
  const getMetrics = useCallback((): QueryPerformanceMetrics => {
    if (!globalMetrics.has(queryKeyString)) {
      globalMetrics.set(queryKeyString, {
        queryKey,
        executionCount: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
        cacheHitRate: 0,
        isSlowQuery: false,
        lastExecutionTime: 0
      });
    }
    return globalMetrics.get(queryKeyString)!;
  }, [queryKeyString, queryKey]);

  // Update metrics with new execution data
  const updateMetrics = useCallback((
    executionTime: number,
    isFromCache: boolean
  ) => {
    const metrics = getMetrics();
    
    metrics.executionCount++;
    metrics.totalTime += executionTime;
    metrics.averageTime = metrics.totalTime / metrics.executionCount;
    metrics.minTime = Math.min(metrics.minTime, executionTime);
    metrics.maxTime = Math.max(metrics.maxTime, executionTime);
    metrics.lastExecutionTime = executionTime;
    metrics.isSlowQuery = executionTime > slowQueryThreshold;

    if (trackCacheMetrics) {
      if (isFromCache) {
        metrics.cacheHits++;
      } else {
        metrics.cacheMisses++;
      }
      const totalCacheEvents = metrics.cacheHits + metrics.cacheMisses;
      metrics.cacheHitRate = totalCacheEvents > 0 ? metrics.cacheHits / totalCacheEvents : 0;
    }

    // Log performance details
    if (enableDetailedLogging) {
      performanceLogger.logQuery(
        queryKey.join('.'),
        executionTime,
        {
          isFromCache,
          executionCount: metrics.executionCount,
          averageTime: metrics.averageTime,
          cacheHitRate: metrics.cacheHitRate,
          isSlowQuery: metrics.isSlowQuery
        }
      );

      // Log cache-specific events
      if (trackCacheMetrics) {
        performanceLogger.logCache(
          `${queryKey.join('.')} ${isFromCache ? 'HIT' : 'MISS'}`,
          0,
          {
            cacheHitRate: metrics.cacheHitRate,
            totalExecutions: metrics.executionCount
          }
        );
      }
    }

    metricsRef.current = metrics;
  }, [queryKey, slowQueryThreshold, enableDetailedLogging, trackCacheMetrics, getMetrics]);

  // Clear metrics for this query
  const clearMetrics = useCallback(() => {
    if (globalMetrics.has(queryKeyString)) {
      globalMetrics.delete(queryKeyString);
    }
    metricsRef.current = undefined;
  }, [queryKeyString]);

  // Wrap the original useQuery with performance monitoring
  const monitoredQuery = useMemo(() => {
    const startTime = Date.now();
    let isFromCache = false;

    // Enhanced query function wrapper
    const enhancedQueryFn = async (context: any) => {
      const queryStartTime = Date.now();
      
      try {
        // Call original query function
        const result = await queryOptions.queryFn?.(context);
        
        // Calculate execution time
        const executionTime = Date.now() - queryStartTime;
        
        // Determine if this is from cache (React Query handles this internally)
        // We'll use a heuristic: very fast responses (< 10ms) are likely from cache
        isFromCache = executionTime < 10;
        
        // Update metrics
        updateMetrics(executionTime, isFromCache);
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - queryStartTime;
        updateMetrics(executionTime, false);
        throw error;
      }
    };

    return useQuery<TData, TError>({
      ...queryOptions,
      queryKey,
      queryFn: enhancedQueryFn,
      onSuccess: (data: TData) => {
        const totalTime = Date.now() - Date.now();
        
        if (enableDetailedLogging) {
          performanceLogger.logQuery(
            queryKey.join('.'),
            totalTime,
            {
              status: 'success',
              dataReceived: !!data
            }
          );
        }
        
        (queryOptions.onSuccess as OnSuccessCallback<TData>)?.(data);
      },
      onError: (error: TError) => {
        const totalTime = Date.now() - Date.now();
        
        if (enableDetailedLogging) {
          performanceLogger.logQuery(
            queryKey.join('.'),
            totalTime,
            {
              status: 'error',
              error: error
            }
          );
        }
        
        (queryOptions.onError as OnErrorCallback<TError>)?.(error);
      },
      onSettled: () => {
        const totalTime = Date.now() - Date.now();
        
        if (enableDetailedLogging) {
          performanceLogger.logQuery(
            queryKey.join('.'),
            totalTime,
            {
              status: 'settled'
            }
          );
        }
        
        (queryOptions.onSettled as OnSettledCallback)?.();
      }
    });
  }, [queryKey, queryOptions, enableDetailedLogging, updateMetrics]);

  return {
    ...monitoredQuery,
    performanceMetrics: metricsRef.current,
    clearMetrics
  };
}

/**
 * Get all performance metrics for all monitored queries
 */
export function getGlobalPerformanceMetrics(): Map<string, QueryPerformanceMetrics> {
  return new Map(globalMetrics);
}

/**
 * Get performance summary for all queries
 */
export function getPerformanceSummary(): string {
  const allMetrics = Array.from(globalMetrics.values());
  
  if (allMetrics.length === 0) {
    return '📊 No performance data available';
  }

  const totalQueries = allMetrics.reduce((sum, m) => sum + m.executionCount, 0);
  const totalCacheHits = allMetrics.reduce((sum, m) => sum + m.cacheHits, 0);
  const totalCacheMisses = allMetrics.reduce((sum, m) => sum + m.cacheMisses, 0);
  const avgCacheHitRate = totalCacheHits + totalCacheMisses > 0 
    ? totalCacheHits / (totalCacheHits + totalCacheMisses) 
    : 0;
  
  const slowQueries = allMetrics.filter(m => m.isSlowQuery).length;
  const avgExecutionTime = allMetrics.reduce((sum, m) => sum + m.averageTime, 0) / allMetrics.length;

  return `
📊 Global Performance Summary
=============================
Total Queries: ${totalQueries}
Slow Queries (>${1000}ms): ${slowQueries}
Average Execution Time: ${avgExecutionTime.toFixed(0)}ms
Cache Hit Rate: ${(avgCacheHitRate * 100).toFixed(1)}%

Query Details:
${allMetrics.map(m => `
  ${m.queryKey.join('.')}:
  - Executions: ${m.executionCount}
  - Avg Time: ${m.averageTime.toFixed(0)}ms
  - Cache Rate: ${(m.cacheHitRate * 100).toFixed(1)}%
  - Status: ${m.isSlowQuery ? '🐌 SLOW' : '✅ OK'}
`).join('')}
=============================
  `;
}

/**
 * Clear all performance metrics
 */
export function clearAllPerformanceMetrics(): void {
  globalMetrics.clear();
  performanceLogger.clear();
}

/**
 * Export performance metrics for analysis
 */
export function exportPerformanceMetrics(): QueryPerformanceMetrics[] {
  return Array.from(globalMetrics.values());
}