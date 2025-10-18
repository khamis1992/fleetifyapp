import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface FleetStatus {
  available: number;
  rented: number;
  maintenance: number;
  outOfService: number;
  total: number;
}

export const useFleetStatus = () => {
  const { companyId, filter } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['fleet-status', companyId],
    queryFn: async (): Promise<FleetStatus> => {
      if (!companyId) {
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
        .eq('company_id', companyId)
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

      const available = statusCounts.available || 0;
      const rented = statusCounts.rented || 0;
      const maintenance = statusCounts.maintenance || 0;
      const total = vehicles.length;
      const outOfService = Math.max(0, total - (available + rented + maintenance));

      return {
        available,
        rented,
        maintenance,
        outOfService,
        total
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};