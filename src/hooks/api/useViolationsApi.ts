/**
 * Violations API Hook
 * Fetches traffic violations from backend API with Redis caching
 * Falls back to direct Supabase queries if backend unavailable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Violation {
  id: string;
  vehicle_id: string;
  customer_id?: string;
  violation_number: string;
  violation_type: string;
  violation_date: string;
  location?: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'paid' | 'disputed' | 'cancelled';
  payment_date?: string;
  payment_reference?: string;
  notes?: string;
  company_id: string;
  created_at: string;
  updated_at?: string;
  // Joined data
  vehicles?: {
    id: string;
    plate_number: string;
    make?: string;
    model?: string;
  };
  customers?: {
    id: string;
    first_name_ar?: string;
    last_name_ar?: string;
    full_name?: string;
  };
}

export interface ViolationsListResponse {
  violations: Violation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ViolationFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'paid' | 'disputed' | 'cancelled';
  vehicleId?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'created_at' | 'violation_date' | 'amount' | 'due_date';
  sortOrder?: 'asc' | 'desc';
}

export interface ViolationStats {
  total: number;
  pending: number;
  paid: number;
  disputed: number;
  cancelled: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
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
 * Hook for fetching violations list with pagination
 */
export function useViolations(filters: ViolationFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['violations', 'list', companyId, filters],
    queryFn: async (): Promise<ViolationsListResponse> => {
      if (!companyId) {
        return { violations: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const params: Record<string, string> = {};
          if (filters.page) params.page = filters.page.toString();
          if (filters.limit) params.limit = filters.limit.toString();
          if (filters.status) params.status = filters.status;
          if (filters.vehicleId) params.vehicleId = filters.vehicleId;
          if (filters.customerId) params.customerId = filters.customerId;
          if (filters.dateFrom) params.dateFrom = filters.dateFrom;
          if (filters.dateTo) params.dateTo = filters.dateTo;
          if (filters.search) params.search = filters.search;
          if (filters.sortBy) params.sortBy = filters.sortBy;
          if (filters.sortOrder) params.sortOrder = filters.sortOrder;

          const response = await apiClient.get<ViolationsListResponse>('/api/violations', params);
          if (response.success && response.data) {
            console.log(`[Violations API] ⚡ Data from backend ${response.cached ? '(CACHED)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Violations API] Backend failed, using Supabase:', error);
        }
      }

      return fetchViolationsFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single violation
 */
export function useViolation(violationId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['violations', 'detail', violationId],
    queryFn: async (): Promise<Violation | null> => {
      if (!companyId || !violationId) return null;

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<Violation>(`/api/violations/${violationId}`);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Violations API] Backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('traffic_violations')
        .select('*, vehicles(*), customers(*)')
        .eq('id', violationId)
        .eq('company_id', companyId)
        .single();
      
      return data as Violation | null;
    },
    enabled: !!companyId && !!violationId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for violation statistics
 */
export function useViolationStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['violations', 'stats', companyId],
    queryFn: async (): Promise<ViolationStats> => {
      if (!companyId) {
        return { total: 0, pending: 0, paid: 0, disputed: 0, cancelled: 0, totalAmount: 0, pendingAmount: 0, paidAmount: 0 };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<ViolationStats>('/api/violations/stats/summary');
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Violations API] Stats backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('traffic_violations')
        .select('status, amount')
        .eq('company_id', companyId);

      return {
        total: data?.length || 0,
        pending: data?.filter(v => v.status === 'pending').length || 0,
        paid: data?.filter(v => v.status === 'paid').length || 0,
        disputed: data?.filter(v => v.status === 'disputed').length || 0,
        cancelled: data?.filter(v => v.status === 'cancelled').length || 0,
        totalAmount: data?.reduce((sum, v) => sum + (v.amount || 0), 0) || 0,
        pendingAmount: data?.filter(v => v.status === 'pending').reduce((sum, v) => sum + (v.amount || 0), 0) || 0,
        paidAmount: data?.filter(v => v.status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0) || 0,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating a violation
 */
export function useCreateViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Violation>) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.post<Violation>('/api/violations', data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create violation');
      }

      const { data: violation, error } = await supabase
        .from('traffic_violations')
        .insert({ ...data, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      return violation as Violation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for updating a violation
 */
export function useUpdateViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Violation> }) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.put<Violation>(`/api/violations/${id}`, data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update violation');
      }

      const { data: violation, error } = await supabase
        .from('traffic_violations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return violation as Violation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['violations', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for deleting a violation
 */
export function useDeleteViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.delete(`/api/violations/${id}`);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete violation');
        }
        return;
      }

      const { error } = await supabase
        .from('traffic_violations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Supabase fallback
async function fetchViolationsFromSupabase(
  companyId: string,
  filters: ViolationFilters
): Promise<ViolationsListResponse> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('traffic_violations')
    .select('*, vehicles(id, plate_number, make, model), customers(id, first_name_ar, last_name_ar, full_name)', { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.vehicleId) query = query.eq('vehicle_id', filters.vehicleId);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.dateFrom) query = query.gte('violation_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('violation_date', filters.dateTo);
  if (filters.search) {
    query = query.or(`violation_number.ilike.%${filters.search}%,violation_type.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Violations API] Supabase error:', error);
    return { violations: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  return {
    violations: (data || []) as Violation[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

