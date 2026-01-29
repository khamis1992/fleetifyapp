/**
 * Cache Invalidation Utilities
 * 
 * Centralized cache invalidation strategies for React Query and Supabase
 * 
 * IMPORTANT: These utilities now support multi-tab environments with advanced sync
 * Use the hook versions (useCacheInvalidation) when possible
 */

import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// MULTI-TAB FIX: Use WeakMap to store query client per tab
// This prevents conflicts when multiple tabs are open
const queryClientInstances = new WeakMap<Window, QueryClient>();

export const setQueryClient = (client: QueryClient) => {
  queryClientInstances.set(window, client);
  console.log('📝 [CACHE_UTILS] Query client registered for current tab');
};

export const getQueryClient = (): QueryClient | null => {
  return queryClientInstances.get(window) || null;
};

/**
 * Invalidate specific query keys
 * MULTI-TAB: Broadcasts invalidation to other tabs via advanced sync
 */
export const invalidateQueries = async (queryKeys: string | string[]) => {
  const client = getQueryClient();
  if (!client) {
    console.warn('Query client not initialized for cache invalidation');
    return;
  }

  const keys = Array.isArray(queryKeys) ? queryKeys : [queryKeys];
  
  for (const key of keys) {
    try {
      await client.invalidateQueries({ queryKey: [key] });
      console.log(`✅ Cache invalidated for query: ${key}`);
      
      // MULTI-TAB: Notify other tabs via advanced sync
      import('./advancedTabSync').then(({ advancedTabSync }) => {
        advancedTabSync.broadcastInvalidate([key]);
      });
    } catch (error) {
      console.error(`❌ Error invalidating cache for query ${key}:`, error);
    }
  }
};

/**
 * Invalidate queries by prefix
 * MULTI-TAB: Broadcasts invalidation to other tabs via advanced sync
 */
export const invalidateQueriesByPrefix = async (prefix: string) => {
  const client = getQueryClient();
  if (!client) {
    console.warn('Query client not initialized for cache invalidation');
    return;
  }

  try {
    await client.invalidateQueries({
      predicate: (query) => query.queryKey[0]?.toString().startsWith(prefix)
    });
    console.log(`✅ Cache invalidated for queries with prefix: ${prefix}`);
    
    // MULTI-TAB: Notify other tabs via advanced sync
    import('./advancedTabSync').then(({ advancedTabSync }) => {
      advancedTabSync.broadcastInvalidate([`${prefix}*`]);
    });
  } catch (error) {
    console.error(`❌ Error invalidating cache for prefix ${prefix}:`, error);
  }
};

/**
 * Invalidate all queries
 * MULTI-TAB: Broadcasts invalidation to other tabs via advanced sync
 */
export const invalidateAllQueries = async () => {
  const client = getQueryClient();
  if (!client) {
    console.warn('Query client not initialized for cache invalidation');
    return;
  }

  try {
    await client.invalidateQueries();
    console.log('✅ All cache invalidated');
    
    // MULTI-TAB: Notify other tabs via advanced sync
    import('./advancedTabSync').then(({ advancedTabSync }) => {
      advancedTabSync.broadcastInvalidate(['*']);
    });
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
 * Update query data with multi-tab synchronization
 * MULTI-TAB: Broadcasts data update to other tabs
 */
export const updateQueryData = <T>(queryKey: any[], updater: (old: T | undefined) => T) => {
  const client = getQueryClient();
  if (!client) {
    console.warn('Query client not initialized for data update');
    return;
  }

  const newData = client.setQueryData<T>(queryKey, updater);
  
  // MULTI-TAB: Synchronize with other tabs via advanced sync
  if (newData !== undefined) {
    import('./advancedTabSync').then(({ advancedTabSync }) => {
      advancedTabSync.broadcastDataUpdate(queryKey, newData, Date.now());
    });
  }
  
  return newData;
};

/**
 * Set query data with multi-tab synchronization
 * MULTI-TAB: Broadcasts data update to other tabs
 */
export const setQueryData = <T>(queryKey: any[], data: T) => {
  const client = getQueryClient();
  if (!client) {
    console.warn('Query client not initialized for data update');
    return;
  }

  client.setQueryData<T>(queryKey, data);
  
  // MULTI-TAB: Synchronize with other tabs via advanced sync
  if (data !== undefined) {
    import('./advancedTabSync').then(({ advancedTabSync }) => {
      advancedTabSync.broadcastDataUpdate(queryKey, data, Date.now());
    });
  }
  
  return data;
};

/**
 * Prefetch common queries to improve perceived performance
 */
export const prefetchCommonQueries = async () => {
  const client = getQueryClient();
  if (!client) {
    console.warn('Query client not initialized for prefetching');
    return;
  }

  try {
    // Prefetch commonly accessed data
    const prefetchPromises = [
      // Add common queries here
      // client.prefetchQuery({
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
  const client = getQueryClient();
  if (!client) {
    // Fallback to direct fetch if query client not available
    return fetcher();
  }

  // Check if data exists in cache
  const cachedData = client.getQueryData<T>([key]);
  if (cachedData) {
    return cachedData;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  client.setQueryData([key], data);

  // Set up invalidation triggers
  if (invalidateTriggers) {
    invalidateTriggers.forEach(trigger => {
      // Listen for events that should invalidate this cache
      // This would typically be handled by your event system
    });
  }

  return data;
};