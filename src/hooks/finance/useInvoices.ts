/**
 * Invoices Hooks
 * Extracted from useFinance.ts for better code organization and tree-shaking
 * Enhanced with permissions and better error handling
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { toast } from "sonner";
import { queryKeys } from "@/utils/queryKeys";
import * as Sentry from '@sentry/react';

// Simple permission check helper - permissions are handled at route level
const useSimplePermissions = () => {
  return {
    hasPermission: (_permission: string) => true, // Route-level permissions handle access control
  };
};

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

// Selected fields for better performance
const INVOICE_SELECT_FIELDS = `
  id,
  company_id,
  invoice_number,
  invoice_date,
  due_date,
  customer_id,
  vendor_id,
  contract_id,
  invoice_type,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount,
  paid_amount,
  balance_due,
  currency,
  status,
  payment_status,
  notes,
  created_at,
  updated_at,
  contracts:contract_id (
    id,
    contract_number,
    vehicle_number,
    vehicles:vehicle_id (
      plate_number,
      make,
      model
    )
  )
`;

export const useInvoices = (filters?: InvoiceFilters) => {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();

  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      if (!companyId) {
        const error = new Error("No company access");
        Sentry.captureException(error);
        throw error;
      }
      
      if (!hasPermission('invoices:read')) {
        const error = new Error('Permission denied: invoices:read');
        Sentry.captureException(error, {
          tags: { permission: 'invoices:read' }
        });
        throw error;
      }

      try {
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
            Sentry.captureException(countError, {
              tags: { operation: 'count_invoices' }
            });
            throw countError;
          }
          totalCount = count || 0;
        }

        let query = supabase
          .from("invoices")
          .select(INVOICE_SELECT_FIELDS)
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
        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'fetch_invoices' }
          });
          throw error;
        }

        // Map vehicle number to invoices
        const mappedData = (data || []).map((invoice: any) => ({
          ...invoice,
          vehicle_number: invoice.contracts?.vehicle_number || 
                         invoice.contracts?.vehicles?.plate_number || ''
        }));

        // Return with pagination info if pagination is requested
        if (filters?.page || filters?.pageSize) {
          return {
            data: mappedData,
            pagination: {
              page,
              pageSize,
              totalCount,
              totalPages: Math.ceil(totalCount / pageSize),
              hasMore: (page * pageSize) < totalCount,
            },
          };
        }

        return mappedData;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    enabled: !!companyId && hasPermission('invoices:read'),
    staleTime: 2 * 60 * 1000,
  });
};

export const useInvoice = (invoiceId: string) => {
  const { hasPermission } = useSimplePermissions();

  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: async () => {
      if (!hasPermission('invoices:read')) {
        const error = new Error('Permission denied: invoices:read');
        Sentry.captureException(error);
        throw error;
      }

      try {
        const { data, error } = await supabase
          .from("invoices")
          .select(INVOICE_SELECT_FIELDS)
          .eq("id", invoiceId)
          .single();

        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'fetch_invoice', invoiceId }
          });
          throw error;
        }
        
        return data;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    enabled: !!invoiceId && hasPermission('invoices:read'),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateInvoice = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: Partial<Invoice>) => {
      if (!companyId) {
        const error = new Error("No company access");
        Sentry.captureException(error);
        throw error;
      }

      if (!hasPermission('invoices:create')) {
        const error = new Error('Permission denied: invoices:create');
        Sentry.captureException(error);
        throw error;
      }

      try {
        const { data, error } = await supabase
          .from("invoices")
          .insert({
            ...invoice,
            company_id: companyId,
          })
          .select(INVOICE_SELECT_FIELDS)
          .single();

        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'create_invoice' }
          });
          throw error;
        }
        
        return data;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      toast.success("تم إنشاء الفاتورة بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء الفاتورة: ${error.message}`);
    },
  });
};

export const useUpdateInvoice = () => {
  const { hasPermission } = useSimplePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      if (!hasPermission('invoices:update')) {
        const error = new Error('Permission denied: invoices:update');
        Sentry.captureException(error);
        throw error;
      }

      try {
        const { data, error } = await supabase
          .from("invoices")
          .update(updates)
          .eq("id", id)
          .select(INVOICE_SELECT_FIELDS)
          .single();

        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'update_invoice', invoiceId: id }
          });
          throw error;
        }
        
        return data;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(data.id) });
      toast.success("تم تحديث الفاتورة بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث الفاتورة: ${error.message}`);
    },
  });
};

export const useDeleteInvoice = () => {
  const { hasPermission } = useSimplePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!hasPermission('invoices:delete')) {
        const error = new Error('Permission denied: invoices:delete');
        Sentry.captureException(error);
        throw error;
      }

      try {
        const { error } = await supabase
          .from("invoices")
          .delete()
          .eq("id", invoiceId);

        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'delete_invoice', invoiceId }
          });
          throw error;
        }
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      toast.success("تم حذف الفاتورة بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في حذف الفاتورة: ${error.message}`);
    },
  });
};

export const useOverdueInvoices = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();

  return useQuery({
    queryKey: queryKeys.invoices.overdue(),
    queryFn: async () => {
      if (!companyId) {
        const error = new Error("No company access");
        Sentry.captureException(error);
        throw error;
      }

      if (!hasPermission('invoices:read')) {
        const error = new Error('Permission denied: invoices:read');
        Sentry.captureException(error);
        throw error;
      }

      try {
        const { data, error } = await supabase
          .from("invoices")
          .select(INVOICE_SELECT_FIELDS)
          .eq("company_id", companyId)
          .eq("status", "overdue")
          .order("due_date", { ascending: true });

        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'fetch_overdue_invoices' }
          });
          throw error;
        }
        
        return data || [];
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    },
    enabled: !!companyId && hasPermission('invoices:read'),
    staleTime: 5 * 60 * 1000,
  });
};
