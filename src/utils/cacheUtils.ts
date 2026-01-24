/**
 * Cache Invalidation Utilities
 * 
 * Centralized cache invalidation strategies for React Query and Supabase
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Global query client instance
let queryClientInstance: QueryClient | null = null;

export const setQueryClient = (client: QueryClient) => {
  queryClientInstance = client;
};

export const getQueryClient = (): QueryClient | null => {
  return queryClientInstance;
};

/**
 * Invalidate specific query keys
 */
export const invalidateQueries = async (queryKeys: string | string[]) => {
  if (!queryClientInstance) {
    console.warn('Query client not initialized for cache invalidation');
    return;
  }

  const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
  
  for (const key of keys) {
    try {
      await queryClientInstance.invalidateQueries({ queryKey: [key] });
      console.log(`✅ Cache invalidated for query: ${key}`);
    } catch (error) {
      console.error(`❌ Error invalidating cache for query ${key}:`, error);
    }
  }
};

/**
 * Invalidate queries by prefix
 */
export const invalidateQueriesByPrefix = async (prefix: string) => {
  if (!queryClientInstance) {
    console.warn('Query client not initialized for cache invalidation');
    return;
  }

  try {
    await queryClientInstance.invalidateQueries({
      predicate: (query) => query.queryKey[0]?.toString().startsWith(prefix)
    });
    console.log(`✅ Cache invalidated for queries with prefix: ${prefix}`);
  } catch (error) {
    console.error(`❌ Error invalidating cache for prefix ${prefix}:`, error);
  }
};

/**
 * Invalidate all queries
 */
export const invalidateAllQueries = async () => {
  if (!queryClientInstance) {
    console.warn('Query client not initialized for cache invalidation');
    return;
  }

  try {
    await queryClientInstance.invalidateQueries();
    console.log('✅ All cache invalidated');
  } catch (error) {
    console.error('❌ Error invalidating all cache:', error);
  }
};

/**
 * Invalidate specific entity queries
 */
export const invalidateEntityQueries = async (entity: 'customers' | 'contracts' | 'fleet' | 'payments' | 'users') => {
  const prefixes: Record<string, string[]> = {
    customers: ['customers', 'customer'],
    contracts: ['contracts', 'contract'],
    fleet: ['fleet', 'vehicles', 'vehicle'],
    payments: ['payments', 'payment', 'invoices', 'invoice'],
    users: ['users', 'user', 'profile']
  };

  const keys = prefixes[entity] || [entity];
  await Promise.all(keys.map(key => invalidateQueries(key)));
};

/**
 * Prefetch common queries to improve perceived performance
 */
export const prefetchCommonQueries = async () => {
  if (!queryClientInstance) {
    console.warn('Query client not initialized for prefetching');
    return;
  }

  try {
    // Prefetch commonly accessed data
    const prefetchPromises = [
      // Add common queries here
      // queryClientInstance.prefetchQuery({
      //   queryKey: ['dashboard-stats'],
      //   queryFn: fetchDashboardStats,
      // }),
    ];

    await Promise.allSettled(prefetchPromises);
    console.log('✅ Common queries prefetched');
  } catch (error) {
    console.error('❌ Error prefetching common queries:', error);
  }
};

/**
 * Clear Supabase session cache
 */
export const clearSupabaseCache = async () => {
  try {
    // Clear Supabase session
    await supabase.auth.signOut();
    console.log('✅ Supabase session cleared');
  } catch (error) {
    console.error('❌ Error clearing Supabase session:', error);
  }
};

/**
 * Reset all application caches
 */
export const resetAllCaches = async () => {
  try {
    await invalidateAllQueries();
    await clearSupabaseCache();
    
    // Clear local storage caches
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth') || key.includes('cache')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('✅ All application caches reset');
  } catch (error) {
    console.error('❌ Error resetting caches:', error);
  }
};

/**
 * Cache with automatic invalidation
 */
export const cacheWithInvalidation = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  invalidateTriggers?: string[]
): Promise<T> => {
  if (!queryClientInstance) {
    // Fallback to direct fetch if query client not available
    return fetcher();
  }

  // Check if data exists in cache
  const cachedData = queryClientInstance.getQueryData<T>([key]);
  if (cachedData) {
    return cachedData;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  queryClientInstance.setQueryData([key], data);

  // Set up invalidation triggers
  if (invalidateTriggers) {
    invalidateTriggers.forEach(trigger => {
      // Listen for events that should invalidate this cache
      // This would typically be handled by your event system
    });
  }

  return data;
};