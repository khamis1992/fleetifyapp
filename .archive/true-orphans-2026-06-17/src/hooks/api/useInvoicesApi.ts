/**
 * Invoices API Hook
 * Fetches invoices from backend API with Redis caching
 * Falls back to direct Supabase queries if backend unavailable
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  contract_id?: string;
  amount: number;
  subtotal: number;
  total: number;
  tax_amount: number;
  discount_amount: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  notes?: string;
  company_id: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  // Joined data
  customers?: {
    id: string;
    first_name_ar?: string;
    last_name_ar?: string;
    full_name?: string;
  };
  contracts?: {
    id: string;
    contract_number: string;
  };
}

export interface InvoicesListResponse {
  invoices: Invoice[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  customerId?: string;
  contractId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'created_at' | 'due_date' | 'amount' | 'invoice_number';
  sortOrder?: 'asc' | 'desc';
}

export interface InvoiceStats {
  total: number;
  draft: number;
  pending: number;
  paid: number;
  overdue: number;
  cancelled: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
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
 * Hook for fetching invoices list with pagination
 */
export function useInvoices(filters: InvoiceFilters = {}) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['invoices', 'list', companyId, filters],
    queryFn: async (): Promise<InvoicesListResponse> => {
      if (!companyId) {
        return { invoices: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const params: Record<string, string> = {};
          if (filters.page) params.page = filters.page.toString();
          if (filters.limit) params.limit = filters.limit.toString();
          if (filters.status) params.status = filters.status;
          if (filters.customerId) params.customerId = filters.customerId;
          if (filters.contractId) params.contractId = filters.contractId;
          if (filters.dateFrom) params.dateFrom = filters.dateFrom;
          if (filters.dateTo) params.dateTo = filters.dateTo;
          if (filters.search) params.search = filters.search;
          if (filters.sortBy) params.sortBy = filters.sortBy;
          if (filters.sortOrder) params.sortOrder = filters.sortOrder;

          const response = await apiClient.get<InvoicesListResponse>('/api/invoices', params);
          if (response.success && response.data) {
            console.log(`[Invoices API] ⚡ Data from backend ${response.cached ? '(CACHED)' : '(fresh)'}`);
            return response.data;
          }
        } catch (error) {
          console.warn('[Invoices API] Backend failed, using Supabase:', error);
        }
      }

      return fetchInvoicesFromSupabase(companyId, filters);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for fetching a single invoice
 */
export function useInvoice(invoiceId: string) {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['invoices', 'detail', invoiceId],
    queryFn: async (): Promise<Invoice | null> => {
      if (!companyId || !invoiceId) return null;

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<Invoice>(`/api/invoices/${invoiceId}`);
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Invoices API] Backend failed:', error);
        }
      }

      const { data } = await supabase
        .from('invoices')
        .select('*, customers(*), contracts(*)')
        .eq('id', invoiceId)
        .eq('company_id', companyId)
        .single();
      
      return data as Invoice | null;
    },
    enabled: !!companyId && !!invoiceId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for invoice statistics
 */
export function useInvoiceStats() {
  const { user } = useAuth();
  const companyId = user?.profile?.company_id;

  return useQuery({
    queryKey: ['invoices', 'stats', companyId],
    queryFn: async (): Promise<InvoiceStats> => {
      if (!companyId) {
        return { total: 0, draft: 0, pending: 0, paid: 0, overdue: 0, cancelled: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };
      }

      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        try {
          const response = await apiClient.get<InvoiceStats>('/api/invoices/stats/summary');
          if (response.success && response.data) {
            return response.data;
          }
        } catch (error) {
          console.warn('[Invoices API] Stats backend failed:', error);
        }
      }

      // Use RPC for optimized stats aggregation (database-side instead of client-side)
      const { data, error } = await supabase.rpc('get_invoice_stats', {
        p_company_id: companyId
      });

      if (error) {
        console.error('[Invoices API] RPC error:', error);
        // Fallback to original method if RPC fails
        const { data: fallbackData } = await supabase
          .from('invoices')
          .select('status, total_amount, payment_status')
          .eq('company_id', companyId);

        return {
          total: fallbackData?.length || 0,
          draft: fallbackData?.filter(i => i.status === 'draft').length || 0,
          pending: fallbackData?.filter(i => i.status === 'pending').length || 0,
          paid: fallbackData?.filter(i => i.status === 'paid').length || 0,
          overdue: fallbackData?.filter(i => i.status === 'overdue').length || 0,
          cancelled: fallbackData?.filter(i => i.status === 'cancelled').length || 0,
          totalAmount: fallbackData?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0,
          paidAmount: fallbackData?.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0,
          pendingAmount: fallbackData?.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0,
        };
      }

      // RPC returns a single row with all stats
      return {
        total: data[0]?.total || 0,
        draft: data[0]?.draft || 0,
        pending: data[0]?.pending || 0,
        paid: data[0]?.paid || 0,
        overdue: data[0]?.overdue || 0,
        cancelled: data[0]?.cancelled || 0,
        totalAmount: Number(data[0]?.total_amount) || 0,
        paidAmount: Number(data[0]?.paid_amount) || 0,
        pendingAmount: Number(data[0]?.pending_amount) || 0,
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook for creating an invoice
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Invoice>) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.post<Invoice>('/api/invoices', data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to create invoice');
      }

      const subtotal = data.amount || 0;
      const total = subtotal + (data.tax_amount || 0) - (data.discount_amount || 0);
      
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({ ...data, subtotal, total, status: 'pending' })
        .select()
        .single();
      
      if (error) throw error;
      return invoice as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for updating an invoice
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Invoice> }) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.put<Invoice>(`/api/invoices/${id}`, data);
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to update invoice');
      }

      const { data: invoice, error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return invoice as Invoice;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', 'detail', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Hook for deleting an invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isBackendUp = await checkBackend();
      
      if (isBackendUp) {
        const response = await apiClient.delete(`/api/invoices/${id}`);
        if (!response.success) {
          throw new Error(response.error?.message || 'Failed to delete invoice');
        }
        return;
      }

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Supabase fallback
async function fetchInvoicesFromSupabase(
  companyId: string,
  filters: InvoiceFilters
): Promise<InvoicesListResponse> {
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('invoices')
    .select('*, customers(id, first_name_ar, last_name_ar, full_name), contracts(id, contract_number)', { count: 'exact' })
    .eq('company_id', companyId);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.customerId) query = query.eq('customer_id', filters.customerId);
  if (filters.contractId) query = query.eq('contract_id', filters.contractId);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);
  if (filters.search) {
    query = query.ilike('invoice_number', `%${filters.search}%`);
  }

  const sortBy = filters.sortBy || 'created_at';
  const sortOrder = filters.sortOrder === 'asc';
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('[Invoices API] Supabase error:', error);
    return { invoices: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  return {
    invoices: (data || []) as Invoice[],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

