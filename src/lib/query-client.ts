/**
 * Optimized React Query Client Configuration
 * Centralized query client with performance optimizations
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// Query Keys Factory - Centralized key management
export const queryKeys = {
  // Dashboard
  dashboardStats: (companyId: string) => ['dashboard-stats', companyId] as const,
  dashboardStatsOptimized: (companyId: string) => ['dashboard-stats-optimized', companyId] as const,

  // Contracts
  contracts: {
    all: (companyId: string) => ['contracts', companyId] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['contracts', companyId, 'list', filters] as const,
    detail: (contractId: string) => ['contracts', 'detail', contractId] as const,
    stats: (companyId: string) => ['contracts', companyId, 'stats'] as const,
  },

  // Customers
  customers: {
    all: (companyId: string) => ['customers', companyId] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['customers', companyId, 'list', filters] as const,
    detail: (customerId: string) => ['customers', 'detail', customerId] as const,
    search: (companyId: string, query: string) => 
      ['customers', companyId, 'search', query] as const,
  },

  // Vehicles
  vehicles: {
    all: (companyId: string) => ['vehicles', companyId] as const,
    list: (companyId: string, filters?: Record<string, unknown>) => 
      ['vehicles', companyId, 'list', filters] as const,
    detail: (vehicleId: string) => ['vehicles', 'detail', vehicleId] as const,
    available: (companyId: string) => ['vehicles', companyId, 'available'] as const,
  },

  // Finance
  finance: {
    invoices: (companyId: string, filters?: Record<string, unknown>) => 
      ['invoices', companyId, filters] as const,
    payments: (companyId: string, filters?: Record<string, unknown>) => 
      ['payments', companyId, filters] as const,
    revenue: (companyId: string, period?: string) => 
      ['revenue', companyId, period] as const,
    chartOfAccounts: (companyId: string) => ['chart-of-accounts', companyId] as const,
  },

  // Pricing
  pricingSuggestions: (params: {
    companyId: string;
    contractType: string;
    rentalDays: number;
    vehicleId?: string;
    customerId?: string;
  }) => ['pricing-suggestions', params] as const,
} as const;

// Default query function error handler
const handleQueryError = (error: unknown) => {
  console.error('Query error:', error);
  
  // Only show toast for non-network errors
  if (error instanceof Error) {
    if (!error.message.includes('Network') && !error.message.includes('fetch')) {
      toast.error('حدث خطأ في تحميل البيانات');
    }
  }
};

// Create optimized query client
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: How long data is considered fresh
        staleTime: 2 * 60 * 1000, // 2 minutes

        // GC time: How long to keep unused data in cache
        gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)

        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('40')) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch configuration
        refetchOnWindowFocus: false, // Disable auto-refetch on focus
        refetchOnReconnect: true, // Refetch when network reconnects
        refetchOnMount: true, // Refetch on mount if stale

        // Network mode
        networkMode: 'offlineFirst', // Use cached data when offline

        // Structural sharing for performance
        structuralSharing: true,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
        retryDelay: 1000,

        // Global error handler for mutations
        onError: (error) => {
          console.error('Mutation error:', error);
          toast.error('فشل في حفظ البيانات');
        },
      },
    },
  });
}

// Singleton query client instance
let queryClient: QueryClient | null = null;

export function getQueryClient() {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

// Prefetch utilities
export async function prefetchDashboardData(companyId: string) {
  const client = getQueryClient();
  
  await Promise.all([
    client.prefetchQuery({
      queryKey: queryKeys.dashboardStatsOptimized(companyId),
      staleTime: 5 * 60 * 1000,
    }),
    client.prefetchQuery({
      queryKey: queryKeys.contracts.stats(companyId),
      staleTime: 5 * 60 * 1000,
    }),
  ]);
}

// Invalidation utilities
export function invalidateContractQueries(companyId: string) {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['contracts', companyId] });
  client.invalidateQueries({ queryKey: ['dashboard-stats', companyId] });
}

export function invalidateCustomerQueries(companyId: string) {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['customers', companyId] });
}

export function invalidateVehicleQueries(companyId: string) {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['vehicles', companyId] });
}

export function invalidateFinanceQueries(companyId: string) {
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['invoices', companyId] });
  client.invalidateQueries({ queryKey: ['payments', companyId] });
  client.invalidateQueries({ queryKey: ['revenue', companyId] });
}

export function invalidateAllQueries() {
  const client = getQueryClient();
  client.invalidateQueries();
}

export default getQueryClient;

