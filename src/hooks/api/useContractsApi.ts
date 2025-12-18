/**
 * Contracts API Hook
 * Fetches contracts from backend API with Redis caching
 * Falls back to direct Supabase queries if backend unavailable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Contract {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id?: string;
  start_date: string;
  end_date?: string;
  monthly_amount: number;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  notes?: string;
  created_at: string;
  updated_at?: string;
  company_id: string;
  // Joined data
  customers?: {
    id: string;
    first_name_ar?: string;
    last_name_ar?: string;
    full_name?: string;
  };
  vehicles?: {
    id: string;
    plate_number: string;
    make?: string;
    model?: string;
  };
}

export interface ContractsListResponse {
  contracts: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContractFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'expired' | 'cancelled' | 'pending';
  customerId?: string;
  vehicleId?: string;
  search?: string;
  sortBy?: 'created_at' | 'start_date' | 'end_date' | 'monthly_rate';
  sortOrder?: 'asc' | 'desc';
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
 * Hook for fetching contracts list with pagination
 */
export function useContracts(filters: ContractFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['contracts', 'list', companyId, filters],
    queryFn: async (): Promise<ContractsListResponse> => {
      if (!companyId) {
        return { contracts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const params: Record<string, string> = {};
          if (filters.page) params.page = filters.page.toString();
          if (filters.limit) params.limit = filters.limit.toString();
          if (filters.status) params.status = filters.status;
          if (filters.customerId) params.customerId = filters.customerId;
          if (filters.vehicleId) params.vehicleId = filters.vehicleId;
          if (filters.search) params.search = filters.search;
          if (filters.sortBy) params.sortBy = filters.sortBy;
          if (filters.sortOrder) params.sortOrder = filters.sortOrder;

          const response = await apiClient.get<ContractsListResponse>('/api/contracts', params);
          if (response.success && response.data) {
            console.log(`[Contracts API] ⚡ Data from backend ${response.cached ? '(CACHED)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Contracts API] Backend failed, using Supabase:', error);
        }
      }

      // Fallback to Supabase
      return fetchContractsFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single contract
 */
export function useContract(contractId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['contracts', 'detail', contractId],
    queryFn: async (): Promise<Contract | null> => {
      if (!companyId || !contractId) return null;

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<Contract>(`/api/contracts/${contractId}`);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Contracts API] Backend failed:', error);
        }
      }

      // Fallback
      const { data } = await supabase
        .from('contracts')
        .select('*, customers(*), vehicles(*)')
        .eq('id', contractId)
        .eq('company_id', companyId)
        .single();
      
      return data as Contract | null;
    },
    enabled: !!companyId && !!contractId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating a contract
 */
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Contract>) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.post<Contract>('/api/contracts', data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create contract');
      }

      // Fallback to Supabase
      const { data: contract, error } = await supabase
        .from('contracts')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return contract as Contract;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for updating a contract
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contract> }) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.put<Contract>(`/api/contracts/${id}`, data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update contract');
      }

      // Fallback
      const { data: contract, error } = await supabase
        .from('contracts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return contract as Contract;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for deleting a contract
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.delete(`/api/contracts/${id}`);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete contract');
        }
        return;
      }

      // Fallback
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Supabase fallback function
async function fetchContractsFromSupabase(
  companyId: string,
  filters: ContractFilters
): Promise<ContractsListResponse> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      customer_id,
      vehicle_id,
      start_date,
      end_date,
      daily_rate,
      total_amount,
      status,
      payment_method,
      license_plate,
      make,
      model,
      year,
      notes,
      company_id,
      created_at,
      updated_at,
      customer:customer_id(
        id,
        first_name_ar,
        last_name_ar,
        phone,
        email
      ),
      vehicle:vehicle_id(
        id,
        plate_number,
        make,
        model,
        year,
        status
      )
    `, { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }
  if (filters.search) {
    query = query.ilike('contract_number', `%${filters.search}%`);
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Contracts API] Supabase error:', error);
    return { contracts: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  return {
    contracts: (data || []) as Contract[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

