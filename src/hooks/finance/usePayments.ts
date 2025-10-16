/**
 * Payments Hooks
 * Extracted from useFinance.ts for better code organization and tree-shaking
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { toast } from "sonner";
import { queryKeys } from "@/utils/queryKeys";

export interface Payment {
  id: string;
  company_id: string;
  payment_number: string;
  payment_date: string;
  payment_type: 'cash' | 'check' | 'bank_transfer' | 'credit_card';
  payment_method: 'received' | 'made';
  customer_id?: string;
  vendor_id?: string;
  invoice_id?: string;
  contract_id?: string;
  agreement_number?: string;
  amount: number;
  currency: string;
  reference_number?: string;
  bank_account?: string;
  check_number?: string;
  notes?: string;
  payment_status: 'pending' | 'cleared' | 'bounced' | 'cancelled' | 'completed';
  journal_entry_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  contracts?: {
    contract_number: string;
  };
}

interface PaymentFilters {
  method?: string;
  status?: string;
  customerId?: string;
  contractId?: string;
}

export const usePayments = (filters?: PaymentFilters) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: queryKeys.payments.list(filters),
    queryFn: async () => {
      if (!companyId) throw new Error("No company access");

      let query = supabase
        .from("payments")
        .select(`
          *,
          contracts(contract_number)
        `)
        .eq("company_id", companyId)
        .order("payment_date", { ascending: false });

      if (filters?.method) {
        query = query.eq("payment_method", filters.method);
      }
      if (filters?.status) {
        query = query.eq("payment_status", filters.status);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }
      if (filters?.contractId) {
        query = query.eq("contract_id", filters.contractId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
};

export const usePayment = (paymentId: string) => {
  return useQuery({
    queryKey: queryKeys.payments.detail(paymentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!paymentId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreatePayment = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Partial<Payment>) => {
      if (!companyId) throw new Error("No company access");

      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...payment,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.lists() });
      toast.success("تم تسجيل الدفعة بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في تسجيل الدفعة: ${error.message}`);
    },
  });
};

export const useUpdatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Payment> & { id: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.id) });
      toast.success("تم تحديث الدفعة بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في تحديث الدفعة: ${error.message}`);
    },
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("payments")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() });
      toast.success("تم حذف الدفعة بنجاح");
    },
    onError: (error) => {
      toast.error(`خطأ في حذف الدفعة: ${error.message}`);
    },
  });
};
