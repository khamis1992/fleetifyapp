/**
 * Employees API Hook
 * Fetches employees from backend API with Redis caching
 * Falls back to direct Supabase queries if backend unavailable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  salary?: number;
  national_id?: string;
  address?: string;
  notes?: string;
  status: 'active' | 'inactive' | 'on_leave';
  company_id: string;
  created_at: string;
  updated_at?: string;
}

export interface EmployeesListResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmployeeFilters {
  page?: number;
  limit?: number;
  department?: string;
  position?: string;
  status?: 'active' | 'inactive' | 'on_leave';
  search?: string;
  sortBy?: 'created_at' | 'first_name' | 'last_name' | 'hire_date';
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  byDepartment: Record<string, number>;
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
 * Hook for fetching employees list with pagination
 */
export function useEmployees(filters: EmployeeFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['employees', 'list', companyId, filters],
    queryFn: async (): Promise<EmployeesListResponse> => {
      if (!companyId) {
        return { employees: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const params: Record<string, string> = {};
          if (filters.page) params.page = filters.page.toString();
          if (filters.limit) params.limit = filters.limit.toString();
          if (filters.department) params.department = filters.department;
          if (filters.position) params.position = filters.position;
          if (filters.status) params.status = filters.status;
          if (filters.search) params.search = filters.search;
          if (filters.sortBy) params.sortBy = filters.sortBy;
          if (filters.sortOrder) params.sortOrder = filters.sortOrder;

          const response = await apiClient.get<EmployeesListResponse>('/api/employees', params);
          if (response.success && response.data) {
            console.log(`[Employees API] ⚡ Data from backend ${response.cached ? '(CACHED)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Employees API] Backend failed, using Supabase:', error);
        }
      }

      return fetchEmployeesFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single employee
 */
export function useEmployee(employeeId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['employees', 'detail', employeeId],
    queryFn: async (): Promise<Employee | null> => {
      if (!companyId || !employeeId) return null;

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<Employee>(`/api/employees/${employeeId}`);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Employees API] Backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .eq('company_id', companyId)
        .single();
      
      return data as Employee | null;
    },
    enabled: !!companyId && !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for employee statistics
 */
export function useEmployeeStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['employees', 'stats', companyId],
    queryFn: async (): Promise<EmployeeStats> => {
      if (!companyId) {
        return { total: 0, active: 0, inactive: 0, onLeave: 0, byDepartment: {} };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<EmployeeStats>('/api/employees/stats/summary');
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Employees API] Stats backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('employees')
        .select('status, department')
        .eq('company_id', companyId);

      const byDepartment = (data || []).reduce((acc, emp) => {
        if (emp.department) {
          acc[emp.department] = (acc[emp.department] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        total: data?.length || 0,
        active: data?.filter(e => e.status === 'active').length || 0,
        inactive: data?.filter(e => e.status === 'inactive').length || 0,
        onLeave: data?.filter(e => e.status === 'on_leave').length || 0,
        byDepartment,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating an employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Employee>) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.post<Employee>('/api/employees', data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create employee');
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .insert({ ...data, status: 'active' })
        .select()
        .single();
      
      if (error) throw error;
      return employee as Employee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Hook for updating an employee
 */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Employee> }) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.put<Employee>(`/api/employees/${id}`, data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update employee');
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return employee as Employee;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees', 'detail', variables.id] });
    },
  });
}

/**
 * Hook for deleting an employee
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.delete(`/api/employees/${id}`);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete employee');
        }
        return;
      }

      // Soft delete
      const { error } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

// Supabase fallback
async function fetchEmployeesFromSupabase(
  companyId: string,
  filters: EmployeeFilters
): Promise<EmployeesListResponse> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('employees')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.department) query = query.eq('department', filters.department);
  if (filters.position) query = query.ilike('position', `%${filters.position}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Employees API] Supabase error:', error);
    return { employees: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  return {
    employees: (data || []) as Employee[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

