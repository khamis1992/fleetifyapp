import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import { isEligibleAccountMapping } from "@/utils/accountMappingValidation";
import { readFinancialPages } from "@/services/financialReporting";

async function validateMapping(
  companyId: string,
  accountId: string,
  typeId: string
) {
  const [account, type] = await Promise.all([
    supabase
      .from("chart_of_accounts")
      .select(
        "company_id,account_type,balance_type,account_level,is_active,is_header"
      )
      .eq("id", accountId)
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("default_account_types")
      .select("account_category,type_code")
      .eq("id", typeId)
      .single(),
  ]);
  if (account.error) throw account.error;
  if (type.error) throw type.error;
  if (
    !isEligibleAccountMapping(
      account.data,
      type.data.account_category,
      companyId,
      type.data.type_code
    )
  ) {
    throw new Error(
      "اختر حساب ترحيل نشطًا من المستوى الثالث أو أعلى، من الفئة وطبيعة الرصيد المطابقتين."
    );
  }
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export interface DefaultAccountType {
  id: string;
  type_code: string;
  type_name: string;
  type_name_ar?: string;
  account_category: string;
  description?: string;
}

export interface AccountMapping {
  id: string;
  company_id: string;
  default_account_type_id: string;
  chart_of_accounts_id: string;
  is_active: boolean;
  default_account_type?: DefaultAccountType;
  chart_of_accounts?: {
    id: string;
    account_name: string;
    account_name_ar?: string;
    account_code: string;
  };
}

export const useDefaultAccountTypes = () => {
  return useQuery({
    queryKey: ["default-account-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("default_account_types")
        .select("*")
        .order("account_category", { ascending: true })
        .order("type_name", { ascending: true });

      if (error) {
        console.error("Error fetching default account types:", error);
        throw error;
      }

      return data as DefaultAccountType[];
    },
  });
};

export const useAccountMappings = () => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["account-mappings", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const data = await readFinancialPages((from, to) =>
        supabase
          .from("account_mappings")
          .select(
            `
          *,
          default_account_type:default_account_types(*),
          chart_of_accounts:chart_of_accounts(id, account_name, account_name_ar, account_code)
        `,
            { count: "exact" }
          )
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("id")
          .range(from, to)
      );

      return data as AccountMapping[];
    },
    enabled: !!companyId,
  });
};

export const useCreateAccountMapping = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mapping: {
      default_account_type_id: string;
      chart_of_accounts_id: string;
    }) => {
      if (!companyId) throw new Error("Company ID is required");
      await validateMapping(
        companyId,
        mapping.chart_of_accounts_id,
        mapping.default_account_type_id
      );

      const { data, error } = await supabase
        .from("account_mappings")
        .insert({
          company_id: companyId,
          default_account_type_id: mapping.default_account_type_id,
          chart_of_accounts_id: mapping.chart_of_accounts_id,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["account-mappings", companyId],
      });
      toast({
        title: "تم إنشاء الربط بنجاح",
        description: "تم ربط نوع الحساب بحساب دليل الحسابات",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في إنشاء الربط",
        description: getErrorMessage(error),
      });
    },
  });
};

export const useUpdateAccountMapping = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; chart_of_accounts_id: string }) => {
      if (!companyId) throw new Error("Company ID is required");
      const existing = await supabase
        .from("account_mappings")
        .select("default_account_type_id")
        .eq("id", data.id)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .single();
      if (existing.error) throw existing.error;
      await validateMapping(
        companyId,
        data.chart_of_accounts_id,
        existing.data.default_account_type_id
      );
      const { data: result, error } = await supabase
        .from("account_mappings")
        .update({
          chart_of_accounts_id: data.chart_of_accounts_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["account-mappings", companyId],
      });
      toast({
        title: "تم تحديث الربط بنجاح",
        description: "تم تحديث ربط الحساب",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الربط",
        description: getErrorMessage(error),
      });
    },
  });
};

export const useDeleteAccountMapping = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (mappingId: string) => {
      if (!companyId) throw new Error("Company ID is required");
      const { error } = await supabase
        .from("account_mappings")
        .update({ is_active: false })
        .eq("id", mappingId)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .select("id")
        .single();

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["account-mappings", companyId],
      });
      toast({
        title: "تم حذف الربط بنجاح",
        description: "تم إلغاء ربط نوع الحساب",
      });
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "خطأ في حذف الربط",
        description: getErrorMessage(error),
      });
    },
  });
};
