import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardStats {
  totalVehicles: number;
  activeContracts: number;
  totalCustomers: number;
  monthlyRevenue: number;
  vehiclesChange: string;
  contractsChange: string;
  customersChange: string;
  revenueChange: string;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['dashboard-stats', user?.profile?.company_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.profile?.company_id) {
        return {
          totalVehicles: 0,
          activeContracts: 0,
          totalCustomers: 0,
          monthlyRevenue: 0,
          vehiclesChange: '+0',
          contractsChange: '+0',
          customersChange: '+0',
          revenueChange: '+0%'
        };
      }

      // Get vehicles count
      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      // Get active contracts count
      const { count: contractsCount } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('status', 'active');

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      // Get monthly revenue from active contracts
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data: monthlyContracts } = await supabase
        .from('contracts')
        .select('monthly_amount')
        .eq('company_id', user.profile.company_id)
        .eq('status', 'active')
        .gte('start_date', firstDayOfMonth.toISOString().split('T')[0]);

      const monthlyRevenue = monthlyContracts?.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0) || 0;

      // For now, return static change values since we don't have historical data
      // In a real implementation, you'd calculate these based on previous period data
      return {
        totalVehicles: vehiclesCount || 0,
        activeContracts: contractsCount || 0,
        totalCustomers: customersCount || 0,
        monthlyRevenue,
        vehiclesChange: '+0',
        contractsChange: '+0',
        customersChange: '+0',
        revenueChange: '+0%'
      };
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};