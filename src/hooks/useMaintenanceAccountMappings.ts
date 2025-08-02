import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyScope } from "./useCompanyScope";
import { toast } from "sonner";

export interface MaintenanceAccountMapping {
  id: string;
  company_id: string;
  maintenance_type: string;
  expense_account_id: string;
  asset_account_id?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  expense_account?: {
    id: string;
    account_code: string;
    account_name: string;
  };
  asset_account?: {
    id: string;
    account_code: string;
    account_name: string;
  };
}

export const useMaintenanceAccountMappings = () => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ["maintenance-account-mappings", companyId],
    queryFn: async () => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("maintenance_account_mappings")
        .select(`
          *,
          expense_account:chart_of_accounts!expense_account_id (
            id,
            account_code,
            account_name
          ),
          asset_account:chart_of_accounts!asset_account_id (
            id,
            account_code,
            account_name
          )
        `)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("maintenance_type");

      if (error) throw error;
      return data as MaintenanceAccountMapping[];
    },
    enabled: !!companyId,
  });
};

export const useCreateMaintenanceAccountMapping = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompanyScope();

  return useMutation({
    mutationFn: async (mapping: Omit<MaintenanceAccountMapping, "id" | "company_id" | "created_at" | "updated_at">) => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("maintenance_account_mappings")
        .insert({
          ...mapping,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-account-mappings"] });
      toast.success("تم إنشاء ربط الحساب بنجاح");
    },
    onError: (error) => {
      console.error("Error creating maintenance account mapping:", error);
      toast.error("حدث خطأ في إنشاء ربط الحساب");
    },
  });
};

export const useUpdateMaintenanceAccountMapping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MaintenanceAccountMapping> }) => {
      const { data, error } = await supabase
        .from("maintenance_account_mappings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-account-mappings"] });
      toast.success("تم تحديث ربط الحساب بنجاح");
    },
    onError: (error) => {
      console.error("Error updating maintenance account mapping:", error);
      toast.error("حدث خطأ في تحديث ربط الحساب");
    },
  });
};

export const useDeleteMaintenanceAccountMapping = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maintenance_account_mappings")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-account-mappings"] });
      toast.success("تم حذف ربط الحساب بنجاح");
    },
    onError: (error) => {
      console.error("Error deleting maintenance account mapping:", error);
      toast.error("حدث خطأ في حذف ربط الحساب");
    },
  });
};