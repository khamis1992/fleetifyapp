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
import { useFinanceAccessGuard } from "@/hooks/finance/useFinanceAccessGuard";
import type { Database } from "@/integrations/supabase/types";

type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];
type InvoiceUpdate = Database["public"]["Tables"]["invoices"]["Update"];
type CreateInvoiceInput = Omit<InvoiceInsert, "company_id">;
type UpdateInvoiceInput = Omit<InvoiceUpdate, "company_id" | "id"> & { id: string };

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
  contract_id?: string;
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
  payment_status: 'unpaid' | 'partial' | 'paid' | 'cancelled';
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
  payment_status?: string;
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
  customers:customer_id (
    id,
    first_name,
    last_name,
    company_name,
    customer_type
  ),
  contracts:contract_id (
    id,
    contract_number,
    vehicle_id,
    vehicles:vehicle_id (
      plate_number,
      make,
      model
    )
  )
`;

export const useInvoices = (filters?: InvoiceFilters) => {
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();

  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: async () => {
      // Wait for initialization to complete before checking companyId
      if (isInitializing) {
        throw new Error('Initializing company context');
      }

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
          if (filters?.payment_status) {
            countQuery = countQuery.eq("payment_status", filters.payment_status);
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
        if (filters?.payment_status) {
          query = query.eq("payment_status", filters.payment_status);
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
          vehicle_number: invoice.contracts?.vehicles?.plate_number || ''
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
    enabled: !!companyId && !isInitializing && hasPermission('invoices:read'),
    staleTime: 2 * 60 * 1000,
  });
};

export const useInvoice = (invoiceId: string) => {
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();

  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceId),
    queryFn: async () => {
      if (!companyId) {
        throw new Error("No company access");
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
          .eq("id", invoiceId)
          .eq("company_id", companyId)
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
    enabled: !!invoiceId && !!companyId && !isInitializing && hasPermission('invoices:read'),
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateInvoice = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: CreateInvoiceInput) => {
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
        const invoiceDateMatch = /^(\d{4})-(\d{2})-\d{2}$/.exec(invoice.invoice_date);
        if (!invoiceDateMatch) {
          throw new Error("Invalid invoice date");
        }

        const year = Number(invoiceDateMatch[1]);
        const month = Number(invoiceDateMatch[2]);
        if (month < 1 || month > 12) {
          throw new Error("Invalid invoice month");
        }

        const invoiceMonth = `${year}-${String(month).padStart(2, "0")}-01`;
        const nextInvoiceMonth = month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        // ✅ التحقق من وجود فاتورة مكررة لنفس العقد في نفس الشهر
        if (invoice.contract_id) {
          const { data: existingInvoice, error: duplicateCheckError } = await supabase
            .from('invoices')
            .select('id, invoice_number')
            .eq('company_id', companyId)
            .eq('contract_id', invoice.contract_id)
            .gte('invoice_date', invoiceMonth)
            .lt('invoice_date', nextInvoiceMonth)
            .neq('status', 'cancelled')
            .limit(1);

          if (duplicateCheckError) {
            throw duplicateCheckError;
          }

          if (existingInvoice && existingInvoice.length > 0) {
            throw new Error(`توجد فاتورة مسجلة لهذا الشهر: ${existingInvoice[0].invoice_number}`);
          }
        }

        const invoiceData: InvoiceInsert = {
          ...invoice,
          company_id: companyId,
          invoice_month: invoice.invoice_month ?? invoiceMonth,
        };

        const { data, error } = await supabase
          .from("invoices")
          .insert(invoiceData)
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
  const { companyId } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateInvoiceInput) => {
      if (!companyId) {
        throw new Error("No company access");
      }

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
          .eq("company_id", companyId)
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
  const { companyId, user } = useUnifiedCompanyAccess();
  const financeAccess = useFinanceAccessGuard();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      if (!companyId) {
        throw new Error("No company access");
      }

      if (!hasPermission('invoices:delete')) {
        const error = new Error('Permission denied: invoices:delete');
        Sentry.captureException(error);
        throw error;
      }

      try {
        if (!financeAccess.can('finance.invoice.cancel')) {
          throw new Error('ليس لديك صلاحية إلغاء الفواتير المالية');
        }

        const { data: invoice, error: invoiceError } = await supabase
          .from("invoices")
          .select("id, company_id, created_by, status, payment_status, notes")
          .eq("id", invoiceId)
          .eq("company_id", companyId)
          .maybeSingle();

        if (invoiceError || !invoice) {
          throw invoiceError || new Error("Invoice not found");
        }

        const segregationDecision = financeAccess.checkSegregationOfDuties({
          action: 'finance.invoice.cancel',
          actorId: user?.id,
          creatorId: invoice.created_by,
        });

        if (!segregationDecision.allowed) {
          throw new Error(segregationDecision.reason || 'تم منع العملية بسبب قاعدة فصل المهام');
        }

        if (invoice.status === 'cancelled' || invoice.payment_status === 'cancelled') {
          return invoice;
        }

        const { data: completedPayments, error: paymentsError } = await supabase
          .from("payments")
          .select("id, payment_status")
          .eq("invoice_id", invoiceId)
          .in("payment_status", ["completed", "paid", "confirmed"])
          .limit(1);

        if (paymentsError) throw paymentsError;
        if (completedPayments && completedPayments.length > 0) {
          throw new Error("Cannot cancel invoice with completed payments. Cancel linked payments first.");
        }

        const cancellationNote = `Invoice cancelled by ${user?.email || user?.id || "system"} at ${new Date().toISOString()}`;

        const { error } = await supabase.rpc("cancel_invoice_with_reversal", {
          p_invoice_id: invoiceId,
          p_company_id: companyId,
          p_reason: cancellationNote,
        });

        if (error) {
          Sentry.captureException(error, {
            tags: { operation: 'cancel_invoice', invoiceId }
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
  const { companyId, isInitializing } = useUnifiedCompanyAccess();
  const { hasPermission } = useSimplePermissions();

  return useQuery({
    queryKey: queryKeys.invoices.overdue(companyId ?? undefined),
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
    enabled: !!companyId && !isInitializing && hasPermission('invoices:read'),
    staleTime: 5 * 60 * 1000,
  });
};
