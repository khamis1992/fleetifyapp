/**
 * Customers API Hook
 * Fetches customers from backend API with Redis caching
 * Falls back to direct Supabase queries if backend unavailable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Customer {
  id: string;
  first_name_ar: string;
  last_name_ar?: string;
  first_name_en?: string;
  last_name_en?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  phone_secondary?: string;
  national_id?: string;
  license_number?: string;
  license_expiry?: string;
  address?: string;
  city?: string;
  notes?: string;
  is_active: boolean;
  company_id: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomersListResponse {
  customers: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'blocked';
  search?: string;
  sortBy?: 'created_at' | 'first_name_ar' | 'last_name_ar' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  withActiveContracts: number;
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
 * Hook for fetching customers list with pagination
 */
export function useCustomers(filters: CustomerFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['customers', 'list', companyId, filters],
    queryFn: async (): Promise<CustomersListResponse> => {
      if (!companyId) {
        return { customers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const params: Record<string, string> = {};
          if (filters.page) params.page = filters.page.toString();
          if (filters.limit) params.limit = filters.limit.toString();
          if (filters.status) params.status = filters.status;
          if (filters.search) params.search = filters.search;
          if (filters.sortBy) params.sortBy = filters.sortBy;
          if (filters.sortOrder) params.sortOrder = filters.sortOrder;

          const response = await apiClient.get<CustomersListResponse>('/api/customers', params);
          if (response.success && response.data) {
            console.log(`[Customers API] ⚡ Data from backend ${response.cached ? '(CACHED)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Customers API] Backend failed, using Supabase:', error);
        }
      }

      return fetchCustomersFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single customer
 */
export function useCustomer(customerId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['customers', 'detail', customerId],
    queryFn: async (): Promise<Customer | null> => {
      if (!companyId || !customerId) return null;

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<Customer>(`/api/customers/${customerId}`);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Customers API] Backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('company_id', companyId)
        .single();
      
      return data as Customer | null;
    },
    enabled: !!companyId && !!customerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for customer statistics
 */
export function useCustomerStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['customers', 'stats', companyId],
    queryFn: async (): Promise<CustomerStats> => {
      if (!companyId) {
        return { total: 0, active: 0, inactive: 0, withActiveContracts: 0 };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<CustomerStats>('/api/customers/stats/summary');
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Customers API] Stats backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('customers')
        .select('is_active')
        .eq('company_id', companyId);

      return {
        total: data?.length || 0,
        active: data?.filter(c => c.is_active).length || 0,
        inactive: data?.filter(c => !c.is_active).length || 0,
        withActiveContracts: 0,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating a customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.post<Customer>('/api/customers', data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create customer');
      }

      const fullName = [data.first_name_ar, data.last_name_ar].filter(Boolean).join(' ');
      const { data: customer, error } = await supabase
        .from('customers')
        .insert({ ...data, full_name: fullName, is_active: true })
        .select()
        .single();
      
      if (error) throw error;
      return customer as Customer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for updating a customer
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.put<Customer>(`/api/customers/${id}`, data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update customer');
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return customer as Customer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for deleting a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.delete(`/api/customers/${id}`);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete customer');
        }
        return;
      }

      // Soft delete
      const { error } = await supabase
        .from('customers')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Supabase fallback
async function fetchCustomersFromSupabase(
  companyId: string,
  filters: CustomerFilters
): Promise<CustomersListResponse> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.status === 'active') query = query.eq('is_active', true);
  if (filters.status === 'inactive') query = query.eq('is_active', false);
  if (filters.search) {
    query = query.or(`first_name_ar.ilike.%${filters.search}%,last_name_ar.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Customers API] Supabase error:', error);
    return { customers: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  return {
    customers: (data || []) as Customer[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

