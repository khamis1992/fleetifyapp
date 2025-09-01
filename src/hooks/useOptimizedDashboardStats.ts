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
  const { companyId, user, isSystemLevel, getQueryKey } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: getQueryKey(['optimized-dashboard-stats']),
    queryFn: async (): Promise<OptimizedDashboardStats> => {
      // Check if user is authenticated
      if (!user) {
        console.log('⚠️ [DASHBOARD_STATS] No authenticated user');
        return getEmptyStats();
      }

      // For system level users, we may not need a specific company ID
      if (!companyId && !isSystemLevel) {
        console.log('⚠️ [DASHBOARD_STATS] No company ID available, isSystemLevel:', isSystemLevel);
        return getEmptyStats();
      }

      console.log('🔄 [DASHBOARD_STATS] Fetching stats for company:', companyId, 'isSystemLevel:', isSystemLevel);
      
      try {
        // First try to use the secure dashboard stats function
        const { data: secureStats, error: secureError } = await supabase
          .rpc('get_dashboard_stats_safe', { 
            company_id_param: isSystemLevel ? null : companyId 
          });
        
        if (!secureError && secureStats && secureStats.length > 0) {
          console.log('✅ [DASHBOARD_STATS] RPC success:', secureStats[0]);
          const stats = secureStats[0];
          return {
            totalVehicles: stats.total_vehicles || 0,
            vehiclesChange: stats.vehicles_change || '+0%',
            totalCustomers: stats.total_customers || 0,
            customersChange: stats.customers_change || '+0%',
            activeContracts: stats.active_contracts || 0,
            contractsChange: stats.contracts_change || '+0%',
            totalEmployees: stats.total_employees || 0,
            employeesChange: '+0%',
            monthlyRevenue: Number(stats.monthly_revenue) || 0,
            revenueChange: stats.revenue_change || '+0%',
            totalRevenue: Number(stats.total_revenue) || 0,
            maintenanceRequests: stats.maintenance_requests || 0,
            pendingPayments: Number(stats.pending_payments) || 0,
            expiringContracts: stats.expiring_contracts || 0,
            fleetUtilization: Number(stats.fleet_utilization) || 0,
            averageContractValue: Number(stats.avg_contract_value) || 0,
            cashFlow: Number(stats.cash_flow) || 0,
            profitMargin: Number(stats.profit_margin) || 0
          };
        }
        
        if (secureError) {
          console.warn('⚠️ [DASHBOARD_STATS] RPC failed, fallback to direct queries:', secureError.message);
        }
        
        // Fallback to direct queries if secure function fails
        if (companyId) {
          console.log('🔄 [DASHBOARD_STATS] Using fallback direct queries for company:', companyId);
          return await fetchStatsDirectly(companyId);
        } else {
          console.log('⚠️ [DASHBOARD_STATS] No company ID for fallback queries');
          return getEmptyStats();
        }
      } catch (error) {
        console.error('❌ [DASHBOARD_STATS] Error:', error);
        // Return fallback data even on error
        if (companyId) {
          try {
            return await fetchStatsDirectly(companyId);
          } catch (fallbackError) {
            console.error('❌ [DASHBOARD_STATS] Fallback also failed:', fallbackError);
            return getEmptyStats();
          }
        }
        return getEmptyStats();
      }
    },
    enabled: !!user, // Enable when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests
    retryDelay: 1000, // Wait 1 second between retries
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
    vehiclesChange: '+0',
    
    activeContracts: 0,
    contractsChange: '+0',
    
    totalCustomers: 0,
    customersChange: '+0',
    
    totalEmployees: 0,
    employeesChange: '+0',
    
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