import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";

export interface ChartOfAccount {
  id: string;
  company_id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_subtype?: string;
  balance_type: string;
  parent_account_id?: string;
  account_level: number;
  is_header: boolean;
  is_active: boolean;
  is_system: boolean;
  current_balance: number;
  description?: string;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export const useChartOfAccounts = () => {
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["chart-of-accounts", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("معرف الشركة غير متوفر");
      }

      try {
        validateCompanyAccess(companyId);
        
        const { data, error } = await supabase
          .from("chart_of_accounts")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_code");

        if (error) {
          console.error("Error fetching chart of accounts:", error);
          throw new Error(`فشل في تحميل دليل الحسابات: ${error.message}`);
        }

        return (data || []) as ChartOfAccount[];
      } catch (error) {
        console.error("Chart of accounts access error:", error);
        throw error;
      }
    },
    enabled: !!companyId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (account: {
      account_code: string;
      account_name: string;
      account_type: string;
      balance_type: string;
      account_name_ar?: string;
      account_subtype?: string;
      parent_account_id?: string;
      is_header?: boolean;
      description?: string;
    }) => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      validateCompanyAccess(companyId);

      const { data, error } = await supabase
        .from("chart_of_accounts")
        .insert({
          ...account,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw new Error(`فشل في إنشاء الحساب: ${error.message}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "تم إضافة الحساب الجديد إلى دليل الحسابات",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الحساب",
        description: error.message,
      });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; updates: Partial<ChartOfAccount> }) => {
      const { data: result, error } = await supabase
        .from("chart_of_accounts")
        .update(data.updates)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      toast({
        title: "تم تحديث الحساب بنجاح",
        description: "تم حفظ التعديلات على الحساب",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الحساب",
        description: error.message,
      });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("chart_of_accounts")
        .update({ is_active: false })
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      toast({
        title: "تم حذف الحساب بنجاح",
        description: "تم إلغاء تفعيل الحساب من دليل الحسابات",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الحساب",
        description: error.message,
      });
    },
  });
};

export const useCopyDefaultAccounts = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      validateCompanyAccess(companyId);

      const { error } = await supabase.rpc("copy_default_accounts_to_company", {
        target_company_id: companyId,
      });

      if (error) throw new Error(`فشل في نسخ الحسابات الافتراضية: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      toast({
        title: "تم نسخ الحسابات الافتراضية",
        description: "تم إضافة دليل الحسابات الافتراضي للشركة",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في نسخ الحسابات",
        description: error.message,
      });
    },
  });
};