/**
 * Vehicles API Hook
 * Fetches vehicles from backend API with Redis caching
 * Falls back to direct Supabase queries if backend unavailable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  vin?: string;
  status: 'available' | 'rented' | 'maintenance' | 'out_of_service';
  daily_rate?: number;
  insurance_expiry?: string;
  registration_expiry?: string;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at?: string;
}

export interface VehiclesListResponse {
  vehicles: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VehicleFilters {
  page?: number;
  limit?: number;
  status?: 'available' | 'rented' | 'maintenance' | 'out_of_service';
  make?: string;
  model?: string;
  year?: number;
  search?: string;
  sortBy?: 'created_at' | 'plate_number' | 'make' | 'year';
  sortOrder?: 'asc' | 'desc';
}

export interface VehicleStats {
  total: number;
  active: number;
  available: number;
  rented: number;
  maintenance: number;
  outOfService: number;
}

// Track backend availability
let backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    backendAvailable = await apiClient.healthCheck();
  } catch {
    backendAvailable = false;
  }
  setTimeout(() => { backendAvailable = null; }, 5 * 60 * 1000);
  return backendAvailable;
}

/**
 * Hook for fetching vehicles list with pagination
 */
export function useVehicles(filters: VehicleFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['vehicles', 'list', companyId, filters],
    queryFn: async (): Promise<VehiclesListResponse> => {
      if (!companyId) {
        return { vehicles: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const params: Record<string, string> = {};
          if (filters.page) params.page = filters.page.toString();
          if (filters.limit) params.limit = filters.limit.toString();
          if (filters.status) params.status = filters.status;
          if (filters.make) params.make = filters.make;
          if (filters.model) params.model = filters.model;
          if (filters.year) params.year = filters.year.toString();
          if (filters.search) params.search = filters.search;
          if (filters.sortBy) params.sortBy = filters.sortBy;
          if (filters.sortOrder) params.sortOrder = filters.sortOrder;

          const response = await apiClient.get<VehiclesListResponse>('/api/vehicles', params);
          if (response.success && response.data) {
            console.log(`[Vehicles API] ⚡ Data from backend ${response.cached ? '(CACHED)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Vehicles API] Backend failed, using Supabase:', error);
        }
      }

      // Fallback to Supabase
      return fetchVehiclesFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single vehicle
 */
export function useVehicle(vehicleId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['vehicles', 'detail', vehicleId],
    queryFn: async (): Promise<Vehicle | null> => {
      if (!companyId || !vehicleId) return null;

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<Vehicle>(`/api/vehicles/${vehicleId}`);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Vehicles API] Backend failed:', error);
        }
      }

      // Fallback
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', vehicleId)
        .eq('company_id', companyId)
        .single();
      
      return data as Vehicle | null;
    },
    enabled: !!companyId && !!vehicleId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for vehicle statistics
 */
export function useVehicleStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['vehicles', 'stats', companyId],
    queryFn: async (): Promise<VehicleStats> => {
      if (!companyId) {
        return { total: 0, active: 0, available: 0, rented: 0, maintenance: 0, outOfService: 0 };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<VehicleStats>('/api/vehicles/stats/summary');
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Vehicles API] Stats backend failed:', error);
        }
      }

      // Use RPC for optimized stats aggregation (database-side instead of client-side)
      const { data, error } = await supabase.rpc('get_vehicle_stats', {
        p_company_id: companyId
      });

      if (error) {
        console.error('[Vehicles API] RPC error:', error);
        // Fallback to original method if RPC fails
        const { data: fallbackData } = await supabase
          .from('vehicles')
          .select('status, is_active')
          .eq('company_id', companyId);

        return {
          total: fallbackData?.length || 0,
          active: fallbackData?.filter(v => v.is_active).length || 0,
          available: fallbackData?.filter(v => v.status === 'available').length || 0,
          rented: fallbackData?.filter(v => v.status === 'rented').length || 0,
          maintenance: fallbackData?.filter(v => v.status === 'maintenance').length || 0,
          outOfService: fallbackData?.filter(v => v.status === 'out_of_service').length || 0,
        };
      }

      // RPC returns a single row with all stats
      return {
        total: data[0]?.total_vehicles || 0,
        active: data[0]?.active_vehicles || 0,
        available: data[0]?.available_vehicles || 0,
        rented: data[0]?.rented_vehicles || 0,
        maintenance: data[0]?.maintenance_vehicles || 0,
        outOfService: data[0]?.out_of_service_vehicles || 0,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating a vehicle
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.post<Vehicle>('/api/vehicles', data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create vehicle');
      }

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return vehicle as Vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for updating a vehicle
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.put<Vehicle>(`/api/vehicles/${id}`, data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update vehicle');
      }

      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return vehicle as Vehicle;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for deleting a vehicle
 */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.delete(`/api/vehicles/${id}`);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete vehicle');
        }
        return;
      }

      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Supabase fallback
async function fetchVehiclesFromSupabase(
  companyId: string,
  filters: VehicleFilters
): Promise<VehiclesListResponse> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.make) query = query.ilike('make', `%${filters.make}%`);
  if (filters.model) query = query.ilike('model', `%${filters.model}%`);
  if (filters.year) query = query.eq('year', filters.year);
  if (filters.search) {
    query = query.or(`plate_number.ilike.%${filters.search}%,make.ilike.%${filters.search}%,model.ilike.%${filters.search}%`);
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Vehicles API] Supabase error:', error);
    return { vehicles: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  return {
    vehicles: (data || []) as Vehicle[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

