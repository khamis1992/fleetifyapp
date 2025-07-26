import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EnhancedDashboardStats {
  // Core Fleet Stats
  totalVehicles: number;
  vehiclesChange: number;
  vehiclesChangeText: string;
  
  // Contract Stats
  activeContracts: number;
  contractsChange: number;
  contractsChangeText: string;
  
  // Customer Stats
  totalCustomers: number;
  customersChange: number;
  customersChangeText: string;
  
  // Financial Stats
  monthlyRevenue: number;
  revenueChange: number;
  revenueChangeText: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  
  // Employee Stats
  totalEmployees: number;
  employeesChange: number;
  employeesChangeText: string;
  
  // Operational Stats
  maintenanceRequests: number;
  pendingPayments: number;
  expiringContracts: number;
  
  // Growth Metrics
  customerGrowthRate: number;
  revenueGrowthRate: number;
  
  // Efficiency Metrics
  fleetUtilization: number;
  averageContractValue: number;
  
  // Financial Health
  cashFlow: number;
  profitMargin: number;
}

export const useEnhancedDashboardStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['enhanced-dashboard-stats', user?.profile?.company_id],
    queryFn: async (): Promise<EnhancedDashboardStats> => {
      if (!user?.profile?.company_id) {
        return getEmptyStats();
      }

      const companyId = user.profile.company_id;
      const currentDate = new Date();
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);

      // Fetch current period data
      const [
        vehiclesResult,
        contractsResult,
        customersResult,
        employeesResult,
        revenueResult,
        maintenanceResult,
        paymentsResult,
        expiringContractsResult,
        
        // Previous period data for comparison
        prevVehiclesResult,
        prevContractsResult,
        prevCustomersResult,
        prevEmployeesResult,
        prevRevenueResult
      ] = await Promise.all([
        // Current period
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
        supabase.from('contracts').select('monthly_amount, contract_amount').eq('company_id', companyId).eq('status', 'active'),
        supabase.from('vehicle_maintenance').select('*', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['pending', 'in_progress']),
        supabase.from('payments').select('amount').eq('company_id', companyId).eq('status', 'pending'),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active').lt('end_date', nextMonth.toISOString().split('T')[0]),
        
        // Previous period for comparison
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lt('created_at', currentMonth.toISOString()),
        supabase.from('contracts').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active').lt('created_at', currentMonth.toISOString()),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lt('created_at', currentMonth.toISOString()),
        supabase.from('employees').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true).lt('created_at', currentMonth.toISOString()),
        supabase.from('contracts').select('monthly_amount, contract_amount').eq('company_id', companyId).eq('status', 'active').lt('created_at', currentMonth.toISOString())
      ]);

      // Calculate current values
      const totalVehicles = vehiclesResult.count || 0;
      const activeContracts = contractsResult.count || 0;
      const totalCustomers = customersResult.count || 0;
      const totalEmployees = employeesResult.count || 0;
      const maintenanceRequests = maintenanceResult.count || 0;
      const expiringContracts = expiringContractsResult.count || 0;

      // Calculate revenue metrics
      const monthlyRevenue = revenueResult.data?.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0) || 0;
      const totalRevenue = revenueResult.data?.reduce((sum, contract) => sum + (contract.contract_amount || 0), 0) || 0;
      const pendingPayments = paymentsResult.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      // Calculate previous values for comparison
      const prevVehicles = prevVehiclesResult.count || 0;
      const prevContracts = prevContractsResult.count || 0;
      const prevCustomers = prevCustomersResult.count || 0;
      const prevEmployees = prevEmployeesResult.count || 0;
      const prevRevenue = prevRevenueResult.data?.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0) || 0;

      // Calculate changes and growth rates
      const vehiclesChange = totalVehicles - prevVehicles;
      const contractsChange = activeContracts - prevContracts;
      const customersChange = totalCustomers - prevCustomers;
      const employeesChange = totalEmployees - prevEmployees;
      const revenueChange = monthlyRevenue - prevRevenue;

      const customerGrowthRate = prevCustomers > 0 ? ((totalCustomers - prevCustomers) / prevCustomers) * 100 : 0;
      const revenueGrowthRate = prevRevenue > 0 ? ((monthlyRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Calculate efficiency metrics
      const fleetUtilization = totalVehicles > 0 ? (activeContracts / totalVehicles) * 100 : 0;
      const averageContractValue = activeContracts > 0 ? totalRevenue / activeContracts : 0;

      // Calculate financial health
      const cashFlow = monthlyRevenue - (totalEmployees * 500); // Estimated expenses
      const profitMargin = monthlyRevenue > 0 ? (cashFlow / monthlyRevenue) * 100 : 0;

      return {
        totalVehicles,
        vehiclesChange,
        vehiclesChangeText: formatChange(vehiclesChange),
        
        activeContracts,
        contractsChange,
        contractsChangeText: formatChange(contractsChange),
        
        totalCustomers,
        customersChange,
        customersChangeText: formatChange(customersChange),
        
        monthlyRevenue,
        revenueChange,
        revenueChangeText: formatPercentageChange(revenueChange, prevRevenue),
        totalRevenue,
        totalExpenses: totalEmployees * 500, // Estimated
        netIncome: cashFlow,
        
        totalEmployees,
        employeesChange,
        employeesChangeText: formatChange(employeesChange),
        
        maintenanceRequests,
        pendingPayments,
        expiringContracts,
        
        customerGrowthRate,
        revenueGrowthRate,
        
        fleetUtilization,
        averageContractValue,
        
        cashFlow,
        profitMargin
      };
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

function getEmptyStats(): EnhancedDashboardStats {
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
    
    monthlyRevenue: 0,
    revenueChange: 0,
    revenueChangeText: '+0%',
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    
    totalEmployees: 0,
    employeesChange: 0,
    employeesChangeText: '+0',
    
    maintenanceRequests: 0,
    pendingPayments: 0,
    expiringContracts: 0,
    
    customerGrowthRate: 0,
    revenueGrowthRate: 0,
    
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