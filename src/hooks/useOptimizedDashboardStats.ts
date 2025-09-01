import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface OptimizedDashboardStats {
// Core Stats
  totalVehicles: number;
  vehiclesChange: string;
  
  activeContracts: number;
  contractsChange: string;
  
  totalCustomers: number;
  customersChange: string;
  
  totalEmployees: number;
  employeesChange: string;
  
  // Financial Stats
  monthlyRevenue: number;
  revenueChange: string;
  totalRevenue: number;
  
  // Operational Stats
  maintenanceRequests: number;
  pendingPayments: number;
  expiringContracts: number;
  
  // Calculated Metrics
  fleetUtilization: number;
  averageContractValue: number;
  cashFlow: number;
  profitMargin: number;
}

export const useOptimizedDashboardStats = () => {
  const { companyId, user, isSystemLevel, getQueryKey, context, isAuthenticating } = useUnifiedCompanyAccess();
  
  // 🔍 PHASE 1: DETAILED AUTHENTICATION AND COMPANY DIAGNOSIS
  console.log('🚀 [DASHBOARD_STATS_HOOK] === PHASE 1: AUTHENTICATION DIAGNOSIS ===', {
    timestamp: new Date().toISOString(),
    user: {
      exists: !!user,
      id: user?.id,
      email: user?.email,
      company_id_direct: (user as any)?.company_id,
      company_object: user?.company ? { id: user.company.id, name: user.company.name } : null,
      profile: user?.profile ? { company_id: user.profile.company_id } : null,
      roles: (user as any)?.roles || []
    },
    companyAccess: {
      companyId,
      isSystemLevel,
      isAuthenticating,
      context: context ? {
        companyId: context.companyId,
        isSystemLevel: context.isSystemLevel,
        isCompanyScoped: context.isCompanyScoped
      } : null
    }
  });
  
  return useQuery({
    queryKey: getQueryKey(['optimized-dashboard-stats']),
    queryFn: async (): Promise<OptimizedDashboardStats> => {
      console.log('🔍 [DASHBOARD_STATS_QUERY] === PHASE 2: QUERY EXECUTION START ===', {
        timestamp: new Date().toISOString(),
        companyId,
        userId: user?.id,
        isSystemLevel,
        isAuthenticating
      });

      // Always return demo stats if no user to prevent hanging
      if (!user) {
        console.log('⚠️ [DASHBOARD_STATS_QUERY] RETURNING DEMO: No authenticated user', {
          reason: 'no_user',
          isAuthenticating,
          timestamp: new Date().toISOString()
        });
        return getDemoStats();
      }

      // For system level users, we may not need a specific company ID
      if (!companyId && !isSystemLevel) {
        console.log('⚠️ [DASHBOARD_STATS_QUERY] RETURNING DEMO: No company ID available', {
          reason: 'no_company_id',
          isSystemLevel,
          companyId,
          userCompanyId: (user as any)?.company_id,
          userCompany: user.company,
          profileCompanyId: user.profile?.company_id,
          timestamp: new Date().toISOString()
        });
        
        // Return demo stats instead of trying fallback
        return getDemoStats();
      }

      console.log('🎯 [DASHBOARD_STATS_QUERY] === PHASE 3: ATTEMPTING REAL DATA FETCH ===', {
        companyId,
        isSystemLevel,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Get the effective company ID
        const effectiveCompanyId = companyId || (user as any)?.company_id || user.company?.id || user.profile?.company_id;
        
        console.log('🔧 [DASHBOARD_STATS_QUERY] Company ID resolution:', {
          primaryCompanyId: companyId,
          userCompanyIdDirect: (user as any)?.company_id,
          userCompanyObject: user.company?.id,
          userProfileCompanyId: user.profile?.company_id,
          effectiveCompanyId,
          timestamp: new Date().toISOString()
        });
        
        if (!effectiveCompanyId) {
          console.log('❌ [DASHBOARD_STATS_QUERY] RETURNING EMPTY: No effective company ID found', {
            timestamp: new Date().toISOString()
          });
          return getEmptyStats();
        }

        console.log('🚀 [DASHBOARD_STATS_QUERY] === PHASE 4: EXECUTING DIRECT QUERIES ===', {
          effectiveCompanyId,
          timestamp: new Date().toISOString()
        });
        
        // Skip RPC and use direct queries immediately for reliability
        const result = await fetchStatsDirectly(effectiveCompanyId);
        
        console.log('✅ [DASHBOARD_STATS_QUERY] === SUCCESS: REAL DATA RETRIEVED ===', {
          effectiveCompanyId,
          resultKeys: Object.keys(result),
          totalVehicles: result.totalVehicles,
          totalCustomers: result.totalCustomers,
          activeContracts: result.activeContracts,
          timestamp: new Date().toISOString()
        });
        
        return result;
        
      } catch (error) {
        console.error('❌ [DASHBOARD_STATS_QUERY] === ERROR: QUERY FAILED ===', {
          companyId,
          effectiveCompanyId: companyId || (user as any)?.company_id || user.company?.id,
          error: {
            message: error?.message,
            name: error?.name,
            stack: error?.stack
          },
          timestamp: new Date().toISOString()
        });
        
        // 🔍 PHASE 4: SIMPLE FALLBACK TEST
        console.log('🔄 [DASHBOARD_STATS_QUERY] === PHASE 5: TESTING SIMPLE QUERIES ===');
        try {
          const testCompanyId = companyId || (user as any)?.company_id || user.company?.id;
          console.log('🔍 [DASHBOARD_STATS_QUERY] Testing vehicle count with company:', testCompanyId);
          
          const vehicleTest = await supabase
            .from('vehicles')
            .select('id', { count: 'exact' })
            .eq('company_id', testCompanyId)
            .eq('is_active', true);
            
          console.log('🔍 [DASHBOARD_STATS_QUERY] Vehicle test result:', {
            companyId: testCompanyId,
            count: vehicleTest.count,
            error: vehicleTest.error,
            hasData: !!vehicleTest.data,
            dataLength: vehicleTest.data?.length,
            timestamp: new Date().toISOString()
          });
          
          if (vehicleTest.error) {
            console.error('❌ [DASHBOARD_STATS_QUERY] Vehicle query RLS/permission error:', {
              error: vehicleTest.error,
              errorCode: vehicleTest.error.code,
              errorMessage: vehicleTest.error.message,
              companyId: testCompanyId,
              userId: user?.id,
              timestamp: new Date().toISOString()
            });
          }
          
        } catch (fallbackError) {
          console.error('❌ [DASHBOARD_STATS_QUERY] Fallback test also failed:', {
            fallbackError: fallbackError?.message,
            timestamp: new Date().toISOString()
          });
        }
        
        // Return empty data on error to see if there's a data issue
        console.log('⚠️ [DASHBOARD_STATS_QUERY] RETURNING EMPTY due to error');
        return getEmptyStats();
      }
    },
    enabled: !!user && !isAuthenticating, // Enable only when user is fully loaded
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors, but not for auth errors
      if (failureCount < 3) {
        const errorMessage = error?.message || '';
        if (errorMessage.includes('غير مسموح') || errorMessage.includes('unauthorized')) {
          console.log('📝 [DASHBOARD_STATS] Auth error, not retrying');
          return false;
        }
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

async function fetchStatsDirectly(companyId: string): Promise<OptimizedDashboardStats> {
  // Use optimized direct queries with parallel execution
  return await fetchStatsMultiQuery(companyId);
}

// Fallback to multiple optimized queries if RPC is not available
async function fetchStatsMultiQuery(companyId: string): Promise<OptimizedDashboardStats> {
  const currentDate = new Date();
  const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

  // Execute optimized parallel queries using our new indexes
  const [
    vehiclesCount,
    contractsCount,
    customersCount,
    employeesCount,
    contractsData,
    maintenanceCount,
    paymentsData,
    expiringCount
  ] = await Promise.all([
    // Count queries are fast with our new indexes
    supabase.from('vehicles').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('is_active', true),
    
    supabase.from('contracts').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'active'),
    
    supabase.from('customers').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('is_active', true),
    
    supabase.from('employees').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('is_active', true),
    
    // Single query for all contract financial data
    supabase.from('contracts').select('monthly_amount, contract_amount')
      .eq('company_id', companyId).eq('status', 'active'),
    
    supabase.from('vehicle_maintenance').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).in('status', ['pending', 'in_progress']),
    
    supabase.from('payments').select('amount')
      .eq('company_id', companyId).eq('payment_status', 'pending'),
    
    supabase.from('contracts').select('*', { count: 'exact', head: true })
      .eq('company_id', companyId).eq('status', 'active')
      .lt('end_date', nextMonth.toISOString().split('T')[0])
  ]);

  // Calculate metrics
  const totalVehicles = vehiclesCount.count || 0;
  const activeContracts = contractsCount.count || 0;
  const totalCustomers = customersCount.count || 0;
  const totalEmployees = employeesCount.count || 0;
  const maintenanceRequests = maintenanceCount.count || 0;
  const expiringContracts = expiringCount.count || 0;

  const monthlyRevenue = contractsData.data?.reduce((sum, contract) => 
    sum + (contract.monthly_amount || 0), 0) || 0;
  const totalRevenue = contractsData.data?.reduce((sum, contract) => 
    sum + (contract.contract_amount || 0), 0) || 0;
  const pendingPayments = paymentsData.data?.reduce((sum, payment) => 
    sum + (payment.amount || 0), 0) || 0;

  // Calculate derived metrics
  const fleetUtilization = totalVehicles > 0 ? (activeContracts / totalVehicles) * 100 : 0;
  const averageContractValue = activeContracts > 0 ? totalRevenue / activeContracts : 0;
  const estimatedExpenses = totalEmployees * 500; // Simplified estimation
  const cashFlow = monthlyRevenue - estimatedExpenses;
  const profitMargin = monthlyRevenue > 0 ? (cashFlow / monthlyRevenue) * 100 : 0;

  return {
    totalVehicles,
    vehiclesChange: '+0',
    
    activeContracts,
    contractsChange: '+0',
    
    totalCustomers,
    customersChange: '+0',
    
    totalEmployees,
    employeesChange: '+0',
    
    monthlyRevenue,
    revenueChange: '+0%',
    totalRevenue,
    
    maintenanceRequests,
    pendingPayments,
    expiringContracts,
    
    fleetUtilization,
    averageContractValue,
    cashFlow,
    profitMargin
  };
}

function getEmptyStats(): OptimizedDashboardStats {
  return {
    totalVehicles: 0,
    vehiclesChange: '+0%',
    
    activeContracts: 0,
    contractsChange: '+0%',
    
    totalCustomers: 0,
    customersChange: '+0%',
    
    totalEmployees: 0,
    employeesChange: '+0%',
    
    monthlyRevenue: 0,
    revenueChange: '+0%',
    totalRevenue: 0,
    
    maintenanceRequests: 0,
    pendingPayments: 0,
    expiringContracts: 0,
    
    fleetUtilization: 0,
    averageContractValue: 0,
    cashFlow: 0,
    profitMargin: 0
  };
}

function getDemoStats(): OptimizedDashboardStats {
  return {
    totalVehicles: 12,
    vehiclesChange: '+8%',
    
    activeContracts: 45,
    contractsChange: '+12%',
    
    totalCustomers: 38,
    customersChange: '+15%',
    
    totalEmployees: 8,
    employeesChange: '+2%',
    
    monthlyRevenue: 125000,
    revenueChange: '+18%',
    totalRevenue: 1500000,
    
    maintenanceRequests: 3,
    pendingPayments: 25000,
    expiringContracts: 5,
    
    fleetUtilization: 85.5,
    averageContractValue: 33333,
    cashFlow: 95000,
    profitMargin: 76
  };
}

function formatChange(change: number): string {
  if (change > 0) return `+${change}`;
  if (change < 0) return `${change}`;
  return '+0';
}

function formatPercentageChange(current: number, previous: number): string {
  if (previous === 0) return '+0%';
  const percentage = ((current - previous) / previous) * 100;
  if (percentage > 0) return `+${percentage.toFixed(1)}%`;
  if (percentage < 0) return `${percentage.toFixed(1)}%`;
  return '+0%';
}