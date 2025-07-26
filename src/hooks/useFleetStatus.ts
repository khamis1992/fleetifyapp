import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FleetStatus {
  available: number;
  rented: number;
  maintenance: number;
  outOfService: number;
  total: number;
}

export const useFleetStatus = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['fleet-status', user?.profile?.company_id],
    queryFn: async (): Promise<FleetStatus> => {
      if (!user?.profile?.company_id) {
        return {
          available: 0,
          rented: 0,
          maintenance: 0,
          outOfService: 0,
          total: 0
        };
      }

      // Get vehicle counts by status
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', user.profile.company_id)
        .eq('is_active', true);

      if (!vehicles) {
        return {
          available: 0,
          rented: 0,
          maintenance: 0,
          outOfService: 0,
          total: 0
        };
      }

      const statusCounts = vehicles.reduce((acc, vehicle) => {
        const status = vehicle.status || 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        available: statusCounts.available || 0,
        rented: statusCounts.rented || 0,
        maintenance: statusCounts.maintenance || 0,
        outOfService: statusCounts.out_of_service || 0,
        total: vehicles.length
      };
    },
    enabled: !!user?.profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};