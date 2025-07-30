import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OptimizedDashboardStats {
  // Core Stats
  totalVehicles: number;
  vehiclesChange: number;
  vehiclesChangeText: string;
  
  activeContracts: number;
  contractsChange: number;
  contractsChangeText: string;
  
  totalCustomers: number;
  customersChange: number;
  customersChangeText: string;
  
  totalEmployees: number;
  employeesChange: number;
  employeesChangeText: string;
  
  // Financial Stats
  monthlyRevenue: number;
  revenueChange: number;
  revenueChangeText: string;
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
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['optimized-dashboard-stats', user?.profile?.company_id],
    queryFn: async (): Promise<OptimizedDashboardStats> => {
      if (!user?.profile?.company_id) {
        return getEmptyStats();
      }

      const companyId = user.profile.company_id;

      // Use optimized direct queries with our new indexes
      return await fetchStatsDirectly(companyId);
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
    vehiclesChange: 0, // Would need historical data
    vehiclesChangeText: '+0',
    
    activeContracts,
    contractsChange: 0,
    contractsChangeText: '+0',
    
    totalCustomers,
    customersChange: 0,
    customersChangeText: '+0',
    
    totalEmployees,
    employeesChange: 0,
    employeesChangeText: '+0',
    
    monthlyRevenue,
    revenueChange: 0,
    revenueChangeText: '+0%',
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
    vehiclesChange: 0,
    vehiclesChangeText: '+0',
    
    activeContracts: 0,
    contractsChange: 0,
    contractsChangeText: '+0',
    
    totalCustomers: 0,
    customersChange: 0,
    customersChangeText: '+0',
    
    totalEmployees: 0,
    employeesChange: 0,
    employeesChangeText: '+0',
    
    monthlyRevenue: 0,
    revenueChange: 0,
    revenueChangeText: '+0%',
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