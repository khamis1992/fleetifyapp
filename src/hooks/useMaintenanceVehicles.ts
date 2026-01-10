import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from './useUnifiedCompanyAccess';

export interface MaintenanceVehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  status: string;
  current_mileage?: number;
  last_maintenance_date?: string;
  maintenance_records?: any[];
}

// Hook to get vehicles that are currently in maintenance status - Performance Optimized
export const useMaintenanceVehicles = (options?: { limit?: number; enabled?: boolean }) => {
  const companyId = useCurrentCompanyId();
  const { limit = 20, enabled = true } = options || {};

  return useQuery({
    queryKey: ['maintenance-vehicles', companyId, limit],
    queryFn: async (): Promise<MaintenanceVehicle[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate_number,
          make,
          model,
          year,
          status,
          current_mileage,
          last_maintenance_date
        `)
        .eq('company_id', companyId)
        .eq('status', 'maintenance')
        .eq('is_active', true)
        .order('plate_number')
        .limit(limit);

      if (error) {
        console.error('Error fetching maintenance vehicles:', error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes - faster refresh for maintenance status
    gcTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

// Hook to get vehicles available for maintenance scheduling
export const useAvailableVehiclesForMaintenance = () => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['available-vehicles-maintenance', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Get ALL active vehicles for maintenance scheduling, not just available/reserved
      // Users should be able to create maintenance for any vehicle regardless of current status
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          plate_number,
          make,
          model,
          year,
          status,
          current_mileage,
          last_maintenance_date
        `)
        .eq('company_id', companyId)
        .eq('is_active', true) // Only active vehicles
        .order('plate_number');

      if (error) {
        console.error('Error fetching available vehicles for maintenance:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};