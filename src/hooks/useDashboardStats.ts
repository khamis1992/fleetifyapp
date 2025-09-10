import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleConfig } from '@/modules/core/hooks';

export interface DashboardStats {
  totalVehicles?: number;
  activeContracts?: number;
  totalCustomers: number;
  totalProperties?: number;
  totalPropertyOwners?: number;
  monthlyRevenue: number;
  propertyRevenue?: number;
  vehiclesChange?: string;
  contractsChange?: string;
  customersChange: string;
  propertiesChange?: string;
  revenueChange: string;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const { moduleContext } = useModuleConfig();
  
  return useQuery({
    queryKey: ['dashboard-stats', user?.profile?.company_id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user?.profile?.company_id || !moduleContext) {
        return {
          totalCustomers: 0,
          monthlyRevenue: 0,
          customersChange: '+0',
          revenueChange: '+0%'
        };
      }

      const isVehiclesEnabled = moduleContext.activeModules.includes('vehicles');
      const isPropertiesEnabled = moduleContext.activeModules.includes('properties');

      let vehiclesCount = 0;
      let contractsCount = 0;
      let propertiesCount = 0;
      let propertyOwnersCount = 0;

      // Get vehicles data only if vehicles module is enabled
      if (isVehiclesEnabled) {
        const { count } = await supabase
          .from('vehicles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);
        vehiclesCount = count || 0;

        // Get all contracts count (active, draft, etc.) for car rental
        const { count: contractsCount_temp } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id);
        contractsCount = contractsCount_temp || 0;
      }

      // Get properties data only if properties module is enabled
      if (isPropertiesEnabled) {
        const { count: propCount } = await supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);
        propertiesCount = propCount || 0;

        const { count: ownersCount } = await supabase
          .from('property_owners')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', user.profile.company_id)
          .eq('is_active', true);
        propertyOwnersCount = ownersCount || 0;
      }

      // Get customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      // Get monthly revenue from different sources based on enabled modules
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      let monthlyRevenue = 0;
      let propertyRevenue = 0;

      // Vehicle rental revenue (if vehicles module enabled)
      if (isVehiclesEnabled) {
        const { data: monthlyContracts } = await supabase
          .from('contracts')
          .select('monthly_amount, status')
          .eq('company_id', user.profile.company_id)
          .in('status', ['active', 'draft'])
          .gte('start_date', firstDayOfMonth.toISOString().split('T')[0]);

        monthlyRevenue = monthlyContracts?.reduce((sum, contract) => sum + (contract.monthly_amount || 0), 0) || 0;
      }

      // Property rental revenue (if properties module enabled)
      if (isPropertiesEnabled) {
        const { data: propertyContracts } = await supabase
          .from('property_contracts')
          .select('rental_amount, status')
          .eq('company_id', user.profile.company_id)
          .eq('status', 'active')
          .gte('start_date', firstDayOfMonth.toISOString().split('T')[0]);

        propertyRevenue = propertyContracts?.reduce((sum, contract) => sum + (contract.rental_amount || 0), 0) || 0;
        monthlyRevenue += propertyRevenue;
      }

      // Build response based on enabled modules
      const stats: DashboardStats = {
        totalCustomers: customersCount || 0,
        monthlyRevenue,
        customersChange: '+0',
        revenueChange: '+0%'
      };

      // Add vehicle-specific stats if module is enabled
      if (isVehiclesEnabled) {
        stats.totalVehicles = vehiclesCount;
        stats.activeContracts = contractsCount;
        stats.vehiclesChange = '+0';
        stats.contractsChange = '+0';
      }

      // Add property-specific stats if module is enabled
      if (isPropertiesEnabled) {
        stats.totalProperties = propertiesCount;
        stats.totalPropertyOwners = propertyOwnersCount;
        stats.propertyRevenue = propertyRevenue;
        stats.propertiesChange = '+0';
      }

      return stats;
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};