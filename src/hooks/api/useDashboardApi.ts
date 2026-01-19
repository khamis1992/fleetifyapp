/**
 * Dashboard API Hook
 * Fetches dashboard data from backend API with Redis caching
 * Falls back to direct Supabase queries if backend is unavailable
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, DashboardData, DashboardStats, FinancialOverview, VehiclesDashboardData, RecentActivity } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Flag to track backend availability
let backendAvailable: boolean | null = null;

/**
 * Check if backend is available (cached result)
 */
async function checkBackendAvailability(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  
  try {
    backendAvailable = await apiClient.healthCheck();
    console.log(`[Dashboard API] Backend ${backendAvailable ? '✅ available' : '❌ unavailable'}`);
  } catch {
    backendAvailable = false;
  }
  
  // Re-check every 5 minutes
  setTimeout(() => { backendAvailable = null; }, 5 * 60 * 1000);
  
  return backendAvailable;
}

/**
 * Hook for fetching complete dashboard data
 * Uses backend API with caching when available
 */
export function useDashboardData() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['dashboard', 'complete', companyId],
    queryFn: async (): Promise<DashboardData | null> => {
      if (!companyId) return null;

      const isBackendUp = await checkBackendAvailability();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<DashboardData>('/api/dashboard');
          if (response.success && response.data) {
            console.log(`[Dashboard API] Data fetched from backend ${response.cached ? '(cached)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Dashboard API] Backend request failed, falling back to Supabase:', error);
        }
      }

      // Fallback: fetch directly from Supabase
      return fetchDashboardFromSupabase(companyId);
    },
    enabled: !!companyId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching dashboard stats only
 */
export function useDashboardStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['dashboard', 'stats', companyId],
    queryFn: async (): Promise<DashboardStats | null> => {
      if (!companyId) return null;

      const isBackendUp = await checkBackendAvailability();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<DashboardStats>('/api/dashboard/stats');
          if (response.success && response.data) {
            console.log(`[Dashboard API] Stats fetched ${response.cached ? '(cached)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Dashboard API] Stats request failed:', error);
        }
      }

      // Fallback
      return fetchStatsFromSupabase(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching financial overview
 */
export function useFinancialOverview(filter?: 'car_rental' | 'real_estate' | 'all') {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['dashboard', 'financial', companyId, filter],
    queryFn: async (): Promise<FinancialOverview | null> => {
      if (!companyId) return null;

      const isBackendUp = await checkBackendAvailability();
      
      if (isBackendUp) {
        try {
          const params = filter ? { filter } : undefined;
          const response = await apiClient.get<FinancialOverview>('/api/dashboard/financial', params);
          if (response.success && response.data) {
            console.log(`[Dashboard API] Financial data fetched ${response.cached ? '(cached)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Dashboard API] Financial request failed:', error);
        }
      }

      // Fallback - return mock data (implement full Supabase fallback if needed)
      return getDefaultFinancialOverview();
    },
    enabled: !!companyId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook for fetching recent activity
 */
export function useRecentActivity(limit: number = 20) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['dashboard', 'activity', companyId, limit],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (!companyId) return [];

      const isBackendUp = await checkBackendAvailability();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<RecentActivity[]>('/api/dashboard/activity', { limit: limit.toString() });
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Dashboard API] Activity request failed:', error);
        }
      }

      // Fallback
      return fetchActivityFromSupabase(companyId, limit);
    },
    enabled: !!companyId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook for fetching vehicles dashboard data
 */
export function useVehiclesDashboard() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['dashboard', 'vehicles', companyId],
    queryFn: async (): Promise<VehiclesDashboardData | null> => {
      if (!companyId) return null;

      const isBackendUp = await checkBackendAvailability();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<VehiclesDashboardData>('/api/dashboard/vehicles');
          if (response.success && response.data) {
            console.log(`[Dashboard API] Vehicles data fetched ${response.cached ? '(cached)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Dashboard API] Vehicles request failed:', error);
        }
      }

      // Fallback
      return fetchVehiclesFromSupabase(companyId);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to invalidate dashboard cache
 */
export function useInvalidateDashboardCache() {
  const queryClient = useQueryClient();

  return async () => {
    const isBackendUp = await checkBackendAvailability();
    
    if (isBackendUp) {
      try {
        await apiClient.post('/api/dashboard/invalidate-cache');
        console.log('[Dashboard API] Backend cache invalidated');
      } catch (error) {
        console.warn('[Dashboard API] Failed to invalidate backend cache:', error);
      }
    }

    // Also invalidate React Query cache
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

// ============================================================================
// SUPABASE FALLBACK FUNCTIONS
// ============================================================================

async function fetchDashboardFromSupabase(companyId: string): Promise<DashboardData | null> {
  const [stats, activity] = await Promise.all([
    fetchStatsFromSupabase(companyId),
    fetchActivityFromSupabase(companyId, 20),
  ]);

  return {
    stats: stats || getDefaultStats(),
    financialOverview: getDefaultFinancialOverview(),
    recentActivity: activity,
    generatedAt: new Date().toISOString(),
  };
}

async function fetchStatsFromSupabase(companyId: string): Promise<DashboardStats | null> {
  try {
    const [vehiclesResult, contractsResult, customersResult] = await Promise.all([
      supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
      supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
    ]);

    return {
      totalVehicles: vehiclesResult.count || 0,
      activeVehicles: vehiclesResult.count || 0,
      activeContracts: contractsResult.count || 0,
      totalContracts: contractsResult.count || 0,
      totalCustomers: customersResult.count || 0,
      totalProperties: 0,
      totalPropertyOwners: 0,
      monthlyRevenue: 0,
      propertyRevenue: 0,
      vehiclesChange: '+0%',
      contractsChange: '+0%',
      customersChange: '+0%',
      propertiesChange: '+0%',
      revenueChange: '+0%',
      vehicleActivityRate: 0,
      contractCompletionRate: 0,
      customerSatisfactionRate: 0,
    };
  } catch (error) {
    console.error('[Dashboard API] Supabase fallback failed:', error);
    return getDefaultStats();
  }
}

async function fetchActivityFromSupabase(companyId: string, limit: number): Promise<RecentActivity[]> {
  try {
    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, contract_number, status, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return (contracts || []).map(contract => ({
      id: contract.id,
      type: 'contract' as const,
      action: 'created',
      description: `عقد جديد رقم ${contract.contract_number}`,
      timestamp: contract.created_at,
      metadata: { contractNumber: contract.contract_number, status: contract.status },
    }));
  } catch {
    return [];
  }
}

async function fetchVehiclesFromSupabase(companyId: string): Promise<VehiclesDashboardData | null> {
  try {
    const { data: vehicles, count } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId);

    const vehicleList = vehicles || [];
    const available = vehicleList.filter(v => v.status === 'available').length;
    const rented = vehicleList.filter(v => v.status === 'rented').length;
    const maintenance = vehicleList.filter(v => v.status === 'maintenance').length;

    return {
      totalVehicles: count || 0,
      activeVehicles: vehicleList.filter(v => v.is_active).length,
      availableVehicles: available,
      rentedVehicles: rented,
      maintenanceVehicles: maintenance,
      pendingMaintenance: 0,
      monthlyRevenue: 0,
      utilizationRate: count ? (rented / count) * 100 : 0,
      vehiclesByMake: {},
      vehiclesByYear: {},
    };
  } catch {
    return null;
  }
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

function getDefaultStats(): DashboardStats {
  return {
    totalVehicles: 0,
    activeVehicles: 0,
    activeContracts: 0,
    totalContracts: 0,
    totalCustomers: 0,
    totalProperties: 0,
    totalPropertyOwners: 0,
    monthlyRevenue: 0,
    propertyRevenue: 0,
    vehiclesChange: '+0%',
    contractsChange: '+0%',
    customersChange: '+0%',
    propertiesChange: '+0%',
    revenueChange: '+0%',
    vehicleActivityRate: 0,
    contractCompletionRate: 0,
    customerSatisfactionRate: 0,
  };
}

function getDefaultFinancialOverview(): FinancialOverview {
  return {
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    cashFlow: 0,
    profitMargin: 0,
    monthlyTrend: [],
    revenueBySource: [],
    topExpenseCategories: [],
    currentRatio: 0,
    quickRatio: 0,
    debtToEquity: 0,
    operatingCashFlow: 0,
    investingCashFlow: 0,
    financingCashFlow: 0,
    projectedMonthlyRevenue: 0,
    projectedAnnualRevenue: 0,
  };
}

