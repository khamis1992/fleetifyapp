import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from './useUnifiedCompanyAccess';
import { useDebounce } from './useDebounce';

type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'out_of_service' | 'reserved' | 'accident' | 'stolen' | 'police_station';

export interface VehicleFilters {
  search?: string;
  status?: VehicleStatus | 'all';
  make?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  fuelType?: string;
  transmission?: string;
  maintenanceDue?: boolean;
  insuranceExpiring?: boolean;
  excludeMaintenanceStatus?: boolean; // New option to exclude maintenance vehicles from Fleet view
}

export interface PaginatedVehiclesResponse {
  data: unknown[];
  count: number;
  totalPages: number;
  currentPage: number;
}

export const useVehiclesPaginated = (
  page: number = 1,
  pageSize: number = 20,
  filters: VehicleFilters = {}
) => {
  const companyId = useCurrentCompanyId();
  const debouncedSearch = useDebounce(filters.search || '', 300);

  return useQuery({
    queryKey: ['vehicles-paginated', companyId, page, pageSize, debouncedSearch, filters],
    queryFn: async (): Promise<PaginatedVehiclesResponse> => {
      if (!companyId) {
        return { data: [], count: 0, totalPages: 0, currentPage: page };
      }

      const offset = (page - 1) * pageSize;
      
      let query = supabase
        .from('vehicles')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(`plate_number.ilike.%${debouncedSearch}%,make.ilike.%${debouncedSearch}%,model.ilike.%${debouncedSearch}%`);
      }

      // Apply status filter
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as VehicleStatus);
      }
      
      // Exclude maintenance status vehicles if requested (for Fleet view)
      if (filters.excludeMaintenanceStatus) {
        query = query.neq('status', 'maintenance');
      }

      // Apply make filter
      if (filters.make) {
        query = query.eq('make', filters.make);
      }

      // Apply model filter
      if (filters.model) {
        query = query.eq('model', filters.model);
      }

      // Apply year range filter
      if (filters.yearFrom) {
        query = query.gte('year', filters.yearFrom);
      }
      if (filters.yearTo) {
        query = query.lte('year', filters.yearTo);
      }

      // Apply fuel type filter
      if (filters.fuelType) {
        query = query.eq('fuel_type', filters.fuelType);
      }

      // Apply transmission filter
      if (filters.transmission) {
        query = query.eq('transmission_type', filters.transmission);
      }

      // Apply maintenance due filter
      if (filters.maintenanceDue) {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthStr = nextMonth.toISOString().split('T')[0];
        
        query = query
          .not('next_service_due', 'is', null)
          .gte('next_service_due', today)
          .lte('next_service_due', nextMonthStr);
      }

      // Apply insurance expiring filter
      if (filters.insuranceExpiring) {
        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const nextMonthStr = nextMonth.toISOString().split('T')[0];
        
        query = query
          .not('insurance_expiry', 'is', null)
          .gte('insurance_expiry', today)
          .lte('insurance_expiry', nextMonthStr);
      }

      // Apply pagination and ordering
      query = query
        .order('plate_number')
        .range(offset, offset + pageSize - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching paginated vehicles:', error);
        throw error;
      }

      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      return {
        data: data || [],
        count: count || 0,
        totalPages,
        currentPage: page
      };
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Hook to get unique makes for filter dropdown
export const useVehicleMakes = () => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['vehicle-makes', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select('make')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('make');

      if (error) throw error;

      // Get unique makes
      const uniqueMakes = [...new Set(data?.map(v => v.make).filter(Boolean))];
      return uniqueMakes;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get unique models for a specific make
export const useVehicleModels = (make?: string) => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['vehicle-models', companyId, make],
    queryFn: async () => {
      if (!companyId || !make) return [];

      const { data, error } = await supabase
        .from('vehicles')
        .select('model')
        .eq('company_id', companyId)
        .eq('make', make)
        .eq('is_active', true)
        .order('model');

      if (error) throw error;

      // Get unique models
      const uniqueModels = [...new Set(data?.map(v => v.model).filter(Boolean))];
      return uniqueModels;
    },
    enabled: !!companyId && !!make,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};