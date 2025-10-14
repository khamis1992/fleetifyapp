/**
 * Optimized React Query Configuration
 * Performance-tuned caching strategy for different data types
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Cache time constants (in milliseconds)
 */
export const CACHE_TIMES = {
  // Static/rarely changing data - 30 minutes
  STATIC: 30 * 60 * 1000,
  
  // Semi-static data (settings, configurations) - 15 minutes
  SEMI_STATIC: 15 * 60 * 1000,
  
  // Normal data (dashboard stats, lists) - 5 minutes
  NORMAL: 5 * 60 * 1000,
  
  // Frequently changing data - 1 minute
  FREQUENT: 1 * 60 * 1000,
  
  // Real-time data - 10 seconds
  REALTIME: 10 * 1000,
  
  // One-time fetch (reports, exports) - No stale time
  ONCE: 0,
} as const;

/**
 * Stale time constants (in milliseconds)
 * Time before data is considered stale and refetch is triggered
 */
export const STALE_TIMES = {
  STATIC: 20 * 60 * 1000,      // 20 minutes
  SEMI_STATIC: 10 * 60 * 1000,  // 10 minutes
  NORMAL: 3 * 60 * 1000,        // 3 minutes
  FREQUENT: 30 * 1000,          // 30 seconds
  REALTIME: 5 * 1000,           // 5 seconds
  ONCE: Infinity,               // Never stale
} as const;

/**
 * Query key prefixes for organization
 */
export const QUERY_KEYS = {
  // User & Auth
  USER: 'user',
  PROFILE: 'profile',
  COMPANY: 'company',
  
  // Financial
  FINANCIAL_OVERVIEW: 'financial-overview',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  JOURNAL_ENTRIES: 'journal-entries',
  CHART_OF_ACCOUNTS: 'chart-of-accounts',
  
  // Customers & Contracts
  CUSTOMERS: 'customers',
  CONTRACTS: 'contracts',
  QUOTATIONS: 'quotations',
  
  // Fleet & Vehicles
  VEHICLES: 'vehicles',
  MAINTENANCE: 'maintenance',
  DISPATCH: 'dispatch',
  
  // Legal
  LEGAL_CASES: 'legal-cases',
  LEGAL_DOCUMENTS: 'legal-documents',
  COURT_SESSIONS: 'court-sessions',
  
  // HR
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  PAYROLL: 'payroll',
  LEAVE_REQUESTS: 'leave-requests',
  
  // Settings
  SETTINGS: 'settings',
  ROLES: 'roles',
  PERMISSIONS: 'permissions',
  
  // Reports
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
} as const;

/**
 * Default query options for different data types
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Global defaults
    staleTime: STALE_TIMES.NORMAL,
    gcTime: CACHE_TIMES.NORMAL, // Replaced cacheTime with gcTime in v5
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: false, // Only refetch if data is stale
    refetchOnReconnect: true, // Refetch on network reconnect
    retry: 1, // Retry failed queries once
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Network mode
    networkMode: 'online', // Only run queries when online
    
    // Suspense mode (disabled by default)
    suspense: false,
  },
  mutations: {
    // Global mutation defaults
    retry: 0, // Don't retry mutations by default
    networkMode: 'online',
  },
};

/**
 * Create optimized Query Client
 */
export function createOptimizedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Query options factory for different data types
 */
export const queryOptions = {
  /**
   * Static data (rarely changes)
   * Examples: Company settings, roles, static lists
   */
  static: {
    staleTime: STALE_TIMES.STATIC,
    gcTime: CACHE_TIMES.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  /**
   * Semi-static data (changes occasionally)
   * Examples: User profile, company configuration
   */
  semiStatic: {
    staleTime: STALE_TIMES.SEMI_STATIC,
    gcTime: CACHE_TIMES.SEMI_STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  /**
   * Normal data (dashboard stats, lists)
   * Examples: Customer lists, invoices, contracts
   */
  normal: {
    staleTime: STALE_TIMES.NORMAL,
    gcTime: CACHE_TIMES.NORMAL,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  
  /**
   * Frequently changing data
   * Examples: Recent activity, notifications
   */
  frequent: {
    staleTime: STALE_TIMES.FREQUENT,
    gcTime: CACHE_TIMES.FREQUENT,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
  
  /**
   * Real-time data (needs fresh data)
   * Examples: Live dashboards, current status
   */
  realtime: {
    staleTime: STALE_TIMES.REALTIME,
    gcTime: CACHE_TIMES.REALTIME,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: STALE_TIMES.REALTIME,
  },
  
  /**
   * One-time fetch (never refetch automatically)
   * Examples: Reports, exports, historical data
   */
  once: {
    staleTime: STALE_TIMES.ONCE,
    gcTime: CACHE_TIMES.STATIC,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },
  
  /**
   * Paginated data
   */
  paginated: {
    staleTime: STALE_TIMES.NORMAL,
    gcTime: CACHE_TIMES.NORMAL,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    keepPreviousData: true, // Keep previous page while loading next
  },
  
  /**
   * Infinite scroll data
   */
  infinite: {
    staleTime: STALE_TIMES.NORMAL,
    gcTime: CACHE_TIMES.NORMAL,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor,
  },
} as const;

/**
 * Query key builders for type safety and consistency
 */
export const queryKeyFactory = {
  // User queries
  user: {
    all: [QUERY_KEYS.USER] as const,
    profile: (userId: string) => [QUERY_KEYS.PROFILE, userId] as const,
    company: (companyId: string) => [QUERY_KEYS.COMPANY, companyId] as const,
  },
  
  // Financial queries
  financial: {
    all: [QUERY_KEYS.FINANCIAL_OVERVIEW] as const,
    overview: (companyId: string) => [QUERY_KEYS.FINANCIAL_OVERVIEW, companyId] as const,
    invoices: (companyId: string, filters?: any) => 
      [QUERY_KEYS.INVOICES, companyId, filters] as const,
    payments: (companyId: string, filters?: any) => 
      [QUERY_KEYS.PAYMENTS, companyId, filters] as const,
    journalEntries: (companyId: string, filters?: any) => 
      [QUERY_KEYS.JOURNAL_ENTRIES, companyId, filters] as const,
  },
  
  // Customer queries
  customers: {
    all: [QUERY_KEYS.CUSTOMERS] as const,
    list: (companyId: string, filters?: any) => 
      [QUERY_KEYS.CUSTOMERS, companyId, 'list', filters] as const,
    detail: (customerId: string) => 
      [QUERY_KEYS.CUSTOMERS, 'detail', customerId] as const,
    search: (companyId: string, query: string) => 
      [QUERY_KEYS.CUSTOMERS, companyId, 'search', query] as const,
  },
  
  // Contract queries
  contracts: {
    all: [QUERY_KEYS.CONTRACTS] as const,
    list: (companyId: string, filters?: any) => 
      [QUERY_KEYS.CONTRACTS, companyId, 'list', filters] as const,
    detail: (contractId: string) => 
      [QUERY_KEYS.CONTRACTS, 'detail', contractId] as const,
    byCustomer: (customerId: string) => 
      [QUERY_KEYS.CONTRACTS, 'customer', customerId] as const,
  },
  
  // Vehicle queries
  vehicles: {
    all: [QUERY_KEYS.VEHICLES] as const,
    list: (companyId: string, filters?: any) => 
      [QUERY_KEYS.VEHICLES, companyId, 'list', filters] as const,
    detail: (vehicleId: string) => 
      [QUERY_KEYS.VEHICLES, 'detail', vehicleId] as const,
    maintenance: (vehicleId: string) => 
      [QUERY_KEYS.MAINTENANCE, vehicleId] as const,
  },
  
  // Legal queries
  legal: {
    all: [QUERY_KEYS.LEGAL_CASES] as const,
    cases: (companyId: string, filters?: any) => 
      [QUERY_KEYS.LEGAL_CASES, companyId, filters] as const,
    documents: (caseId: string) => 
      [QUERY_KEYS.LEGAL_DOCUMENTS, caseId] as const,
    sessions: (caseId: string) => 
      [QUERY_KEYS.COURT_SESSIONS, caseId] as const,
  },
  
  // HR queries
  hr: {
    employees: (companyId: string, filters?: any) => 
      [QUERY_KEYS.EMPLOYEES, companyId, filters] as const,
    attendance: (employeeId: string, dateRange?: any) => 
      [QUERY_KEYS.ATTENDANCE, employeeId, dateRange] as const,
    payroll: (companyId: string, period?: any) => 
      [QUERY_KEYS.PAYROLL, companyId, period] as const,
  },
} as const;

/**
 * Prefetch helpers
 */
export const prefetchHelpers = {
  /**
   * Prefetch related data for a customer detail page
   */
  prefetchCustomerDetails: async (queryClient: QueryClient, customerId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeyFactory.customers.detail(customerId),
        queryFn: () => {/* fetch customer */},
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeyFactory.contracts.byCustomer(customerId),
        queryFn: () => {/* fetch contracts */},
      }),
    ]);
  },
  
  /**
   * Prefetch financial dashboard data
   */
  prefetchFinancialDashboard: async (queryClient: QueryClient, companyId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeyFactory.financial.overview(companyId),
      queryFn: () => {/* fetch overview */},
      ...queryOptions.normal,
    });
  },
};

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate all customer-related queries
   */
  invalidateCustomers: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeyFactory.customers.all });
  },
  
  /**
   * Invalidate all financial queries
   */
  invalidateFinancial: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeyFactory.financial.all });
  },
  
  /**
   * Invalidate specific customer data
   */
  invalidateCustomer: (queryClient: QueryClient, customerId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeyFactory.customers.detail(customerId) });
  },
};

/**
 * Performance monitoring for queries
 */
export function setupQueryPerformanceMonitoring(queryClient: QueryClient) {
  if (import.meta.env.DEV) {
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.action.type === 'success') {
        const duration = event.query.state.dataUpdatedAt - event.query.state.fetchStatus === 'fetching' ? Date.now() : 0;
        if (duration > 1000) {
          console.warn(`[Performance] Slow query detected:`, {
            queryKey: event.query.queryKey,
            duration: `${duration}ms`,
          });
        }
      }
    });
  }
}
