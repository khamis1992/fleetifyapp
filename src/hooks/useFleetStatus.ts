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

      // Get active contracts to determine rented vehicles
      const { data: activeContracts, error: contractsError } = await supabase
        .from('contracts')
        .select('vehicle_id')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .not('vehicle_id', 'is', null);

      // Log error but don't fail - use status field as fallback
      if (contractsError) {
        console.warn('⚠️ [FleetStatus] Error fetching active contracts, using vehicle status as fallback:', contractsError.message);
      }

      // Create a set of vehicle IDs that are in active contracts
      const rentedVehicleIds = new Set(
        activeContracts?.map(contract => contract.vehicle_id).filter(Boolean) || []
      );

      // Count vehicles by status
      const statusCounts = vehicles.reduce((acc, vehicle) => {
        const status = vehicle.status || 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maintenance = statusCounts.maintenance || 0;
      const outOfService = statusCounts.out_of_service || 0;
      const reserved = statusCounts.reserved || 0;
      const reservedEmployee = statusCounts.reserved_employee || 0;
      const accident = statusCounts.accident || 0;
      const stolen = statusCounts.stolen || 0;
      const policeStation = statusCounts.police_station || 0;
      const total = vehicles.length;

      // Calculate rented vehicles: use active contracts as source of truth
      // If contracts query failed, fall back to status field
      const rentedFromContracts = rentedVehicleIds.size;
      const rentedFromStatus = statusCounts.rented || 0;
      const rented = contractsError ? rentedFromStatus : rentedFromContracts;

      // Calculate available: total - all other statuses
      const unavailable = rented + maintenance + outOfService + reserved + reservedEmployee + accident + stolen + policeStation;
      const available = Math.max(0, total - unavailable);

      return {
        available,
        rented,
        maintenance,
        outOfService,
        reserved,
        reservedEmployee,
        accident,
        stolen,
        policeStation,
        total
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes - reduced for more accurate data
  });
};