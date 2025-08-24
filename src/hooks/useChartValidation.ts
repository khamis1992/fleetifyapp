import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";

interface ValidationResult {
  is_valid: boolean;
  issues: {
    orphaned_accounts: number;
    circular_references: number;
    incorrect_levels: number;
    duplicate_codes: number;
    missing_parents: number;
  };
  total_issues: number;
  details?: {
    orphaned_accounts: Array<{
      id: string;
      account_code: string;
      account_name: string;
      account_name_ar?: string;
      parent_account_id: string;
    }>;
    duplicate_codes: Array<{
      account_code: string;
      accounts: Array<{
        id: string;
        account_name: string;
        account_name_ar?: string;
      }>;
    }>;
    incorrect_levels: Array<{
      id: string;
      account_code: string;
      account_name: string;
      account_name_ar?: string;
      current_level: number;
      expected_level: number;
    }>;
  };
}

interface FixResult {
  success: boolean;
  orphaned_accounts_fixed: number;
  level_corrections: number;
  circular_references_fixed: number;
  total_fixes: number;
}

interface ChartStatistics {
  total_accounts: number;
  active_accounts: number;
  inactive_accounts: number;
  accounts_by_type: Record<string, number>;
  accounts_by_level: Record<string, number>;
  header_accounts: number;
  detail_accounts: number;
  max_depth: number;
  avg_depth: number;
}

export const useChartValidation = () => {
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useQuery<ValidationResult>({
    queryKey: ["chart-validation", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("معرف الشركة غير متوفر");
      }

      validateCompanyAccess(companyId);

      const { data, error } = await supabase.rpc("validate_chart_hierarchy", {
        company_id_param: companyId,
      });

      if (error) {
        console.error("Error validating chart hierarchy:", error);
        throw new Error(`فشل في التحقق من صحة دليل الحسابات: ${error.message}`);
      }

      return data as unknown as ValidationResult;
    },
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds
  });
};

export const useFixChartHierarchy = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation<FixResult>({
    mutationFn: async () => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      validateCompanyAccess(companyId);

      const { data, error } = await supabase.rpc("fix_chart_hierarchy", {
        target_company_id: companyId,
      });

      if (error) throw new Error(`فشل في إصلاح دليل الحسابات: ${error.message}`);
      return data as unknown as FixResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chart-validation", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-statistics", companyId] });
      
      const fixSummary = [];
      if (data.orphaned_accounts_fixed > 0) {
        fixSummary.push(`${data.orphaned_accounts_fixed} حساب يتيم`);
      }
      if (data.level_corrections > 0) {
        fixSummary.push(`${data.level_corrections} تصحيح مستوى`);
      }
      if (data.circular_references_fixed > 0) {
        fixSummary.push(`${data.circular_references_fixed} مرجع دائري`);
      }
      
      toast({
        title: "تم إصلاح دليل الحسابات بنجاح",
        description: fixSummary.length > 0 
          ? `تم إصلاح: ${fixSummary.join('، ')}`
          : "تم التحقق من دليل الحسابات - لا توجد مشاكل للإصلاح",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في إصلاح دليل الحسابات",
        description: error.message,
      });
    },
  });
};

export const useChartStatistics = () => {
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useQuery<ChartStatistics>({
    queryKey: ["chart-statistics", companyId],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("معرف الشركة غير متوفر");
      }

      validateCompanyAccess(companyId);

      const { data, error } = await supabase.rpc("get_chart_statistics", {
        company_id_param: companyId,
      });

      if (error) {
        console.error("Error fetching chart statistics:", error);
        throw new Error(`فشل في جلب إحصائيات دليل الحسابات: ${error.message}`);
      }

      return data as unknown as ChartStatistics;
    },
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
  });
};

export const useSuggestAccountCode = () => {
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useMutation<string, Error, { parentAccountId?: string; accountType?: string }>({
    mutationFn: async ({ parentAccountId, accountType }) => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      validateCompanyAccess(companyId);

      const { data, error } = await supabase.rpc("suggest_next_account_code", {
        company_id_param: companyId,
        parent_account_id_param: parentAccountId || null,
        account_type_param: accountType || null,
      });

      if (error) throw new Error(`فشل في اقتراح كود الحساب: ${error.message}`);
      return data;
    },
  });
};

export const useCreateSmartAccount = () => {
  const queryClient = useQueryClient();
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation<string, Error, {
    accountName: string;
    accountNameAr?: string;
    accountType?: string;
    parentAccountId?: string;
    autoGenerateCode?: boolean;
  }>({
    mutationFn: async ({
      accountName,
      accountNameAr,
      accountType = 'assets',
      parentAccountId,
      autoGenerateCode = true,
    }) => {
      if (!companyId) throw new Error("معرف الشركة مطلوب");
      
      validateCompanyAccess(companyId);

      const { data, error } = await supabase.rpc("create_smart_account", {
        company_id_param: companyId,
        account_name_param: accountName,
        account_name_ar_param: accountNameAr || null,
        account_type_param: accountType,
        parent_account_id_param: parentAccountId || null,
        auto_generate_code: autoGenerateCode,
      });

      if (error) throw new Error(`فشل في إنشاء الحساب الذكي: ${error.message}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart-of-accounts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["chart-statistics", companyId] });
      toast({
        title: "تم إنشاء الحساب بنجاح",
        description: "تم إنشاء الحساب مع كود تلقائي ومستوى صحيح",
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