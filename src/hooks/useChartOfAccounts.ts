import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import type { Database } from "@/integrations/supabase/types";

type ChartOfAccountUpdate = Database["public"]["Tables"]["chart_of_accounts"]["Update"];

type AccountDeletionResult = {
  success?: boolean;
  error?: string;
  operation?: { message?: string };
  total_deleted?: number;
  deleted_accounts?: Array<{ deletion_type?: string }>;
  summary?: {
    total_processed?: number;
    deleted_permanently?: number;
    deleted_soft?: number;
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'حدث خطأ غير متوقع';
}

function parseDeletionResult(data: unknown): AccountDeletionResult {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new Error('استجابة عملية الحسابات غير صالحة');
  }
  return data as AccountDeletionResult;
}

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

export const useChartOfAccounts = (includeInactive: boolean = false) => {
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["chart-of-accounts", companyId, includeInactive],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("معرف الشركة غير متوفر");
      }

      try {
        validateCompanyAccess(companyId);
        
        let query = supabase
          .from("chart_of_accounts")
          .select("*")
          .eq("company_id", companyId);

        // Only filter by is_active if not including inactive accounts
        if (!includeInactive) {
          query = query.eq("is_active", true);
        }

        const { data, error } = await query.order("account_code");

        if (error) {
          throw new Error(`فشل في تحميل دليل الحسابات: ${error.message}`);
        }
        
        return (data || []) as ChartOfAccount[];
      } catch (error) {
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

      // تنظيف البيانات قبل الإرسال - تحويل القيم الفارغة إلى null
      const cleanedAccount = {
        ...account,
        parent_account_id: account.parent_account_id && account.parent_account_id.trim() !== '' 
          ? account.parent_account_id 
          : null,
        account_name_ar: account.account_name_ar && account.account_name_ar.trim() !== '' 
          ? account.account_name_ar 
          : null,
        account_subtype: account.account_subtype && account.account_subtype.trim() !== '' 
          ? account.account_subtype 
          : null,
        description: account.description && account.description.trim() !== '' 
          ? account.description 
          : null,
        company_id: companyId,
      };

      const { data, error } = await supabase
        .from("chart_of_accounts")
        .insert(cleanedAccount)
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
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الحساب",
        description: getErrorMessage(error),
      });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; updates: ChartOfAccountUpdate }) => {
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
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الحساب",
        description: getErrorMessage(error),
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
      // استخدام الدالة الجديدة المحسنة بدلاً من التحديث المباشر
      const { data, error } = await supabase.rpc('comprehensive_delete_account', {
        account_id_param: accountId,
        deletion_mode: 'soft' // استخدام الحذف الآمن كافتراضي
      });

      if (error) {
        throw error;
      }

      const result = parseDeletionResult(data);
      if (!result.success) {
        throw new Error(result.error || 'فشل في حذف الحساب');
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chartOfAccounts"] });
      
      toast({
        title: "تم حذف الحساب بنجاح",
        description: result.operation?.message || "تم إلغاء تفعيل الحساب من دليل الحسابات",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الحساب",
        description: getErrorMessage(error),
      });
    },
  });
};

export const useCascadeDeleteAccount = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ accountId, forceDelete = false }: { accountId: string; forceDelete?: boolean }) => {
      const { data, error } = await supabase.rpc("cascade_delete_account_with_children", {
        account_id_param: accountId,
        force_delete: forceDelete,
      });

      if (error) throw new Error(`فشل في حذف الحساب: ${error.message}`);
      
      const result = parseDeletionResult(data);
      if (!result?.success) throw new Error(result?.error || "فشل في حذف الحساب");
      
      return result;
    },
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });

      const result = parseDeletionResult(data);
      const deletedCount = result.total_deleted || 0;
      const permanentDeleted = result.deleted_accounts?.filter((account) => account.deletion_type === 'permanent').length || 0;
      const softDeleted = result.deleted_accounts?.filter((account) => account.deletion_type === 'soft').length || 0;
      
      let description = `تم حذف ${deletedCount} حساب`;
      if (permanentDeleted > 0 && softDeleted > 0) {
        description += ` (${permanentDeleted} نهائي، ${softDeleted} مؤقت)`;
      } else if (permanentDeleted > 0) {
        description += ` نهائياً`;
      } else {
        description += ` مؤقتاً`;
      }
      
      toast({
        title: "تم حذف الحسابات بنجاح",
        description,
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الحساب",
        description: getErrorMessage(error),
      });
    },
  });
};

export const useAccountDeletionPreview = () => {
  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.rpc("get_account_deletion_preview", {
        account_id_param: accountId,
      });

      if (error) throw new Error(`فشل في جلب معاينة الحذف: ${error.message}`);
      
      const result = parseDeletionResult(data);
      if (!result?.success) throw new Error(result?.error || "فشل في جلب معاينة الحذف");
      
      return result;
    },
  });
};

export const useDeleteAllAccounts = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      confirmationText, 
      forceDeleteSystem = false 
    }: { 
      confirmationText: string; 
      forceDeleteSystem?: boolean; 
    }) => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");

      const { data, error } = await supabase.rpc("bulk_delete_company_accounts", {
        target_company_id: companyId,
        include_system_accounts: forceDeleteSystem,
        deletion_reason: confirmationText,
      });

      if (error) throw new Error(`فشل في حذف جميع الحسابات: ${error.message}`);
      
      const result = parseDeletionResult(data);
      if (!result?.success) throw new Error(result?.error || "فشل في حذف جميع الحسابات");
      
      return result;
    },
    onSuccess: (data: unknown) => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });

      const summary = parseDeletionResult(data).summary;
      toast({
        title: "تم حذف جميع الحسابات",
        description: `تم حذف ${summary?.total_processed || 0} حساب (${summary?.deleted_permanently || 0} نهائي، ${summary?.deleted_soft || 0} مؤقت)`,
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في حذف جميع الحسابات",
        description: getErrorMessage(error),
      });
    },
  });
};

export const useAllAccountsDeletionPreview = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");

      const { data, error } = await supabase.rpc("get_all_accounts_deletion_preview", {
        target_company_id: companyId,
      });

      if (error) throw new Error(`فشل في جلب معاينة حذف جميع الحسابات: ${error.message}`);
      
      const result = parseDeletionResult(data);
      if (!result?.success) throw new Error(result?.error || "فشل في جلب معاينة حذف جميع الحسابات");
      
      return result;
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
    onMutate: () => {
      toast({
        title: "⚠️ النظام القديم",
        description: "يتم استخدام النظام القديم (232 حساب فقط)",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      toast({
        title: "تم نسخ الحسابات الافتراضية (القديم)",
        description: "تم إضافة دليل الحسابات الافتراضي للشركة (232 حساب)",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في نسخ الحسابات",
        description: getErrorMessage(error),
      });
    },
  });
};
