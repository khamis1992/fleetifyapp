/**
 * Invoices Hooks
 * Extracted from useFinance.ts for better code organization and tree-shaking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { toast } from "sonner";
import { queryKeys } from "@/utils/queryKeys";

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  customer_id?: string;
  vendor_id?: string;
  cost_center_id?: string;
  fixed_asset_id?: string;
  invoice_type: 'sales' | 'purchase' | 'service';
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  terms?: string;
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface InvoiceFilters {
  type?: string;
  status?: string;
  customerId?: string;
  contractId?: string;
  page?: number;
  pageSize?: number;
}

export const useInvoices = (filters?: InvoiceFilters) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      // Get total count if pagination is requested
      let totalCount = 0;
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 50;

      if (filters?.page || filters?.pageSize) {
        let countQuery = supabase
          .from("invoices")
          .select("*", { count: "exact", head: true })
          .eq("company_id", companyId);

        if (filters?.type) {
          countQuery = countQuery.eq("invoice_type", filters.type);
        }
        if (filters?.status) {
          countQuery = countQuery.eq("status", filters.status);
        }
        if (filters?.customerId) {
          countQuery = countQuery.eq("customer_id", filters.customerId);
        }

        const { count, error: countError } = await countQuery;
        if (countError) {
          console.error("❌ [INVOICES] Error fetching count:", countError);
        } else {
          totalCount = count || 0;
        }
      }

      let query = supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId);

      if (filters?.type) {
        query = query.eq("invoice_type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      // Apply pagination
      if (filters?.page || filters?.pageSize) {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);
      }

      query = query.order("invoice_date", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Return with pagination info if pagination is requested
      if (filters?.page || filters?.pageSize) {
        return {
          data: data || [],
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasMore: (page * pageSize) < totalCount,
          },
        };
      }

      return data || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateInvoice = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Partial<Invoice>) => {
      if (!companyId) throw new Error("No company access");

      const { data, error } = await supabase
        .from("invoices")
        .insert({
          ...invoice,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      toast.success("تم إنشاء الفاتورة بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في إنشاء الفاتورة: ${error.message}`);
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(data.id) });
      toast.success("تم تحديث الفاتورة بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في تحديث الفاتورة: ${error.message}`);
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      toast.success("تم حذف الفاتورة بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في حذف الفاتورة: ${error.message}`);
    },
  });
};

export const useOverdueInvoices = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: queryKeys.invoices.overdue(),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", companyId)
        .eq("status", "overdue")
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
};
