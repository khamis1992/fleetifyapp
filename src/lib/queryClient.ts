import { QueryClient } from '@tanstack/react-query';

/**
 * Optimized Query Client Configuration
 * Implements caching strategies for better performance
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: How long until data is considered stale (5 minutes)
      staleTime: 5 * 60 * 1000,
      
      // Cache time: How long to keep unused data in cache (10 minutes)
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests (3 attempts with exponential backoff)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus (good for real-time data)
      refetchOnWindowFocus: true,
      
      // Don't refetch on mount if data is still fresh
      refetchOnMount: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Suspend queries while offline
      networkMode: 'online',
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});

/**
 * Cache key configuration for different data types
 * Organized by domain for better cache management
 */
export const cacheKeys = {
  // Financial data (frequent updates)
  finance: {
    overview: (companyId: string) => ['financial-overview', companyId],
    metrics: (companyId: string) => ['financial-metrics', companyId],
    alerts: (companyId: string) => ['financial-alerts', companyId],
    payments: (companyId: string) => ['payments', companyId],
    invoices: (companyId: string) => ['invoices', companyId],
    accounts: (companyId: string) => ['accounts', companyId],
  },
  
  // Legal AI data (moderate updates)
  legal: {
    consultations: (companyId: string) => ['legal-consultations', companyId],
    documents: (companyId: string) => ['legal-documents', companyId],
    cases: (companyId: string) => ['legal-cases', companyId],
    stats: (companyId: string) => ['legal-stats', companyId],
    customerHistory: (customerId: string) => ['legal-customer-history', customerId],
  },
  
  // Fleet data (moderate updates)
  fleet: {
    vehicles: (companyId: string) => ['vehicles', companyId],
    maintenance: (companyId: string) => ['maintenance', companyId],
    violations: (companyId: string) => ['traffic-violations', companyId],
    permits: (companyId: string) => ['dispatch-permits', companyId],
  },
  
  // Contract data (infrequent updates)
  contracts: {
    all: (companyId: string) => ['contracts', companyId],
    active: (companyId: string) => ['contracts', 'active', companyId],
    byCustomer: (customerId: string) => ['contracts', 'customer', customerId],
    details: (contractId: string) => ['contract', contractId],
  },
  
  // Customer data (infrequent updates)
  customers: {
    all: (companyId: string) => ['customers', companyId],
    details: (customerId: string) => ['customer', customerId],
    financial: (customerId: string) => ['customer-financial', customerId],
  },
  
  // Static/rarely changing data (long cache)
  static: {
    banks: (companyId: string) => ['banks', companyId],
    costCenters: (companyId: string) => ['cost-centers', companyId],
    accounts: (companyId: string) => ['chart-of-accounts', companyId],
    settings: (companyId: string) => ['company-settings', companyId],
  },
  
  // User/auth data (session-based)
  auth: {
    user: ['current-user'],
    profile: (userId: string) => ['user-profile', userId],
    permissions: (userId: string) => ['user-permissions', userId],
  },
};

/**
 * Stale time configuration by data type
 * Optimized for different update frequencies
 */
export const staleTimeConfig = {
  // Real-time data (30 seconds)
  realtime: 30 * 1000,
  
  // Frequently updated (5 minutes)
  frequent: 5 * 60 * 1000,
  
  // Moderate updates (15 minutes)
  moderate: 15 * 60 * 1000,
  
  // Infrequent updates (1 hour)
  infrequent: 60 * 60 * 1000,
  
  // Static data (24 hours)
  static: 24 * 60 * 60 * 1000,
  
  // Never stale (infinity)
  infinite: Infinity,
};

/**
 * Prefetch important queries on app load
 * Improves perceived performance
 */
export const prefetchCriticalQueries = async (companyId: string) => {
  if (!companyId) return;
  
  // Prefetch financial overview (most accessed)
  await queryClient.prefetchQuery({
    queryKey: cacheKeys.finance.overview(companyId),
    staleTime: staleTimeConfig.frequent,
  });
  
  // Prefetch static data
  await queryClient.prefetchQuery({
    queryKey: cacheKeys.static.banks(companyId),
    staleTime: staleTimeConfig.static,
  });
  
  await queryClient.prefetchQuery({
    queryKey: cacheKeys.static.costCenters(companyId),
    staleTime: staleTimeConfig.static,
  });
};

/**
 * Invalidate related queries
 * Use after mutations to keep data fresh
 */
export const invalidateFinancialQueries = (companyId: string) => {
  queryClient.invalidateQueries({ queryKey: cacheKeys.finance.overview(companyId) });
  queryClient.invalidateQueries({ queryKey: cacheKeys.finance.metrics(companyId) });
  queryClient.invalidateQueries({ queryKey: cacheKeys.finance.alerts(companyId) });
};

export const invalidateLegalQueries = (companyId: string) => {
  queryClient.invalidateQueries({ queryKey: cacheKeys.legal.consultations(companyId) });
  queryClient.invalidateQueries({ queryKey: cacheKeys.legal.stats(companyId) });
};

export const invalidateContractQueries = (companyId: string) => {
  queryClient.invalidateQueries({ queryKey: cacheKeys.contracts.all(companyId) });
  queryClient.invalidateQueries({ queryKey: cacheKeys.contracts.active(companyId) });
};

/**
 * Clear cache on logout
 */
export const clearAllCache = () => {
  queryClient.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const cache = queryClient.getQueryCache();
  return {
    totalQueries: cache.getAll().length,
    activeQueries: cache.getAll().filter(q => q.state.fetchStatus === 'fetching').length,
    staleQueries: cache.getAll().filter(q => q.isStale()).length,
  };
};
