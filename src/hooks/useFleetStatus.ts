import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

export interface FleetStatus {
  available: number;
  rented: number;
  maintenance: number;
  outOfService: number;
  reserved: number;
  reservedEmployee: number;
  accident: number;
  stolen: number;
  policeStation: number;
  total: number;
}

type FleetVehicleRow = {
  status: string | null;
};

export const summarizeFleetStatus = (vehicles: FleetVehicleRow[]): FleetStatus => {
  const statusCounts = vehicles.reduce((counts, vehicle) => {
    const status = vehicle.status || 'available';
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return {
    available: statusCounts.available || 0,
    rented: statusCounts.rented || 0,
    maintenance: statusCounts.maintenance || 0,
    outOfService: statusCounts.out_of_service || 0,
    reserved: statusCounts.reserved || 0,
    reservedEmployee: statusCounts.reserved_employee || 0,
    accident: statusCounts.accident || 0,
    stolen: statusCounts.stolen || 0,
    policeStation: statusCounts.police_station || 0,
    total: vehicles.length,
  };
};

export const useFleetStatus = () => {
  const { companyId } = useUnifiedCompanyAccess();
  
  return useQuery({
    queryKey: ['fleet-status', companyId],
    queryFn: async (): Promise<FleetStatus> => {
      if (!companyId) {
        return {
          available: 0,
          rented: 0,
          maintenance: 0,
          outOfService: 0,
          reserved: 0,
          reservedEmployee: 0,
          accident: 0,
          stolen: 0,
          policeStation: 0,
          total: 0
        };
      }

      // Get vehicle counts by status
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, status')
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (!vehicles) {
        return {
          available: 0,
          rented: 0,
          maintenance: 0,
          outOfService: 0,
          reserved: 0,
          reservedEmployee: 0,
          accident: 0,
          stolen: 0,
          policeStation: 0,
          total: 0
        };
      }

      // Vehicle status is the canonical operational classification. Contract
      // linkage is repaired and enforced in the database, while protected legal
      // statuses (police, municipality, accident, etc.) must not be counted as
      // rented merely because a contract still exists.
      return summarizeFleetStatus(vehicles);
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced for more accurate data
  });
};
