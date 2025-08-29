import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

// Enhanced React Query with performance optimizations
export const useOptimizedQuery = <TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError> & {
    cacheTime?: number;
    staleTime?: number;
    prefetch?: boolean;
    background?: boolean;
  }
) => {
  const queryClient = useQueryClient();

  // Default optimized settings
  const optimizedOptions: UseQueryOptions<TData, TError> = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as any).status;
        if (status >= 400 && status < 500) return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  };

  const query = useQuery(optimizedOptions);

  // Prefetch related data
  useEffect(() => {
    if (options.prefetch && query.data && options.queryKey) {
      // Prefetch commonly accessed related data
      const baseKey = Array.isArray(options.queryKey) ? options.queryKey[0] : options.queryKey;
      
      if (baseKey === 'dashboard-stats') {
        queryClient.prefetchQuery({
          queryKey: ['recent-activities'],
          staleTime: 2 * 60 * 1000,
          queryFn: () => Promise.resolve([]),
        });
      }
    }
  }, [query.data, options.prefetch, options.queryKey, queryClient]);

  // Background refresh optimization
  const refreshInBackground = useCallback(() => {
    if (options.background && options.queryKey) {
      queryClient.invalidateQueries({ queryKey: options.queryKey });
    }
  }, [options.background, options.queryKey, queryClient]);

  return {
    ...query,
    refreshInBackground,
  };
};

// Batch query hook for multiple related queries
export const useBatchQueries = (queries: Array<{ key: string; queryOptions: any }>) => {
  const results: Record<string, any> = {};

  queries.forEach(({ key, queryOptions }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[key] = useQuery(queryOptions);
  });

  const isLoading = Object.values(results).some((result: any) => result.isLoading);
  const isError = Object.values(results).some((result: any) => result.isError);
  const isSuccess = Object.values(results).every((result: any) => result.isSuccess);

  return {
    queries: results,
    isLoading,
    isError,
    isSuccess,
  };
};

// Infinite query optimization
export const useOptimizedInfiniteQuery = <TData = unknown, TError = Error>(
  options: any
) => {
  return useQuery({
    ...options,
    staleTime: 2 * 60 * 1000, // 2 minutes for infinite queries
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage: any, pages: any[]) => {
      // Optimize pagination
      if (!lastPage?.data || lastPage.data.length < 20) {
        return undefined;
      }
      return pages.length;
    },
    getPreviousPageParam: (firstPage: any, pages: any[]) => {
      return pages.length > 1 ? pages.length - 2 : undefined;
    },
  });
};