/**
 * Optimized Dashboard Stats Hook
 * Uses single RPC call instead of multiple queries
 * Replaces the old useDashboardStats with better performance
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

// Types
interface DashboardStats {
  contracts: {
    total: number;
    active: number;
    expiring_soon: number;
    utilization_rate: number;
  };
  customers: {
    total: number;
    active: number;
    retention_rate: number;
  };
  vehicles: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
    utilization_rate: number;
  };
  revenue: {
    total: number;
    monthly: number;
    pending: number;
    overdue: number;
  };
  generated_at: string;
}

interface UseDashboardStatsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Optimized hook for fetching dashboard statistics
 * Uses a single RPC function call instead of multiple queries
 * 
 * @example
 * const { data, isLoading, error } = useDashboardStatsOptimized();
 * console.log(data?.contracts.active);
 */
export function useDashboardStatsOptimized(options: UseDashboardStatsOptions = {}) {
  const { companyId } = useUnifiedCompanyAccess();
  const { enabled = true, refetchInterval = 5 * 60 * 1000 } = options; // Default: 5 minutes

  return useQuery({
    queryKey: ['dashboard-stats-optimized', companyId],
    queryFn: async (): Promise<DashboardStats> => {
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { p_company_id: companyId });

      if (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error;
      }

      return data as DashboardStats;
    },
    enabled: enabled && !!companyId,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval, // Auto-refresh interval
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2,
  });
}

// Helper hook for specific stat categories
export function useContractStats(options?: UseDashboardStatsOptions) {
  const { data, ...rest } = useDashboardStatsOptimized(options);
  return { data: data?.contracts, ...rest };
}

export function useCustomerStats(options?: UseDashboardStatsOptions) {
  const { data, ...rest } = useDashboardStatsOptimized(options);
  return { data: data?.customers, ...rest };
}

export function useVehicleStats(options?: UseDashboardStatsOptions) {
  const { data, ...rest } = useDashboardStatsOptimized(options);
  return { data: data?.vehicles, ...rest };
}

export function useRevenueStats(options?: UseDashboardStatsOptions) {
  const { data, ...rest } = useDashboardStatsOptimized(options);
  return { data: data?.revenue, ...rest };
}

export default useDashboardStatsOptimized;

