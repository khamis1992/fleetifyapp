import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";

export interface AvailableCustomerAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar: string;
  parent_account_name: string;
  is_available: boolean;
}

export interface CompanyAccountSettings {
  enable_account_selection: boolean;
  default_receivables_account_id: string | null;
  account_prefix: string;
  auto_create_account: boolean;
  account_naming_pattern: 'customer_name' | 'customer_id' | 'custom';
  account_group_by: 'customer_type' | 'none';
}

// Hook للحصول على الحسابات المتاحة للعملاء
export const useAvailableCustomerAccounts = (targetCompanyId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();
  const effectiveCompanyId = targetCompanyId || companyId;

  return useQuery({
    queryKey: ["available-customer-accounts-final", effectiveCompanyId, Date.now()],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];

      const { data, error } = await supabase
        .rpc("get_available_customer_accounts_v2", {
          target_company_id: effectiveCompanyId
        });

      if (error) {
        console.error("❌ RPC Error:", error);
        throw error;
      }

      const accounts = (data as AvailableCustomerAccount[]) || [];
      const account1130201 = accounts.find(acc => acc.account_code === '1130201');
      
      console.log('🎯 FINAL RESULT:', {
        found1130201: !!account1130201,
        account1130201,
        totalAccounts: accounts.length,
        availableAccounts: accounts.filter(acc => acc.is_available).length
      });

      return accounts;
    },
    enabled: !!effectiveCompanyId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
};

// Hook للحصول على إعدادات الحسابات للشركة
export const useCompanyAccountSettings = (targetCompanyId?: string) => {
  const { companyId } = useUnifiedCompanyAccess();
  const effectiveCompanyId = targetCompanyId || companyId;

  return useQuery({
    queryKey: ["company-account-settings", effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("customer_account_settings")
        .eq("id", effectiveCompanyId)
        .single();

      if (error) {
        console.error("Error fetching company account settings:", error);
        throw error;
      }

      return data?.customer_account_settings as unknown as CompanyAccountSettings;
    },
    enabled: !!effectiveCompanyId,
  });
};

// Hook لتحديث إعدادات الحسابات للشركة
export const useUpdateCompanyAccountSettings = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (settings: CompanyAccountSettings) => {
      if (!companyId) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("companies")
        .update({
          customer_account_settings: settings as any
        })
        .eq("id", companyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-account-settings", companyId] });
      toast({
        title: "تم تحديث الإعدادات",
        description: "تم حفظ إعدادات الحسابات بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في تحديث الإعدادات",
        description: error.message,
      });
    },
  });
};

// Hook للحصول على الحسابات المرتبطة بالعميل
export const useCustomerLinkedAccounts = (customerId: string) => {
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["customer-linked-accounts", customerId, companyId],
    queryFn: async () => {
      if (!customerId || !companyId) return [];

      console.log('[CUSTOMER_ACCOUNTS] Fetching for customer:', customerId, 'company:', companyId);

      // First get the customer accounts
      const { data: customerAccounts, error: customerError } = await supabase
        .from("customer_accounts")
        .select("id, account_id")
        .eq("customer_id", customerId)
        .eq("company_id", companyId);

      if (customerError) {
        console.error("Error fetching customer accounts:", customerError);
        throw customerError;
      }

      if (!customerAccounts || customerAccounts.length === 0) {
        console.log('[CUSTOMER_ACCOUNTS] No customer accounts found');
        return [];
      }

      // Now get the chart of accounts for these account IDs
      const accountIds = customerAccounts.map(ca => ca.account_id);
      const { data: chartData, error: chartError } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, account_name_ar, current_balance")
        .in("id", accountIds)
        .eq("company_id", companyId);

      if (chartError) {
        console.error("Error fetching chart of accounts:", chartError);
        throw chartError;
      }

      // Combine the data
      const result = customerAccounts.map(ca => ({
        id: ca.id,
        account_id: ca.account_id,
        chart_of_accounts: chartData?.find(chart => chart.id === ca.account_id) || null
      }));

      console.log('[CUSTOMER_ACCOUNTS] Fetched data:', result);
      return result;
    },
    enabled: !!customerId && !!companyId,
  });
};

// Hook لربط حساب محاسبي بالعميل
export const useLinkAccountToCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { customerId: string; accountId: string }) => {
      if (!companyId) throw new Error("Company ID is required");

      const { data: result, error } = await supabase
        .from("customer_accounts")
        .insert({
          company_id: companyId,
          customer_id: data.customerId,
          account_id: data.accountId
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ 
        queryKey: ["customer-linked-accounts", variables.customerId, companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["available-customer-accounts", companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["available-customer-accounts-v2", companyId] 
      });
      
      console.log('🔄 [LINK_SUCCESS] Cache invalidated after linking account');
      
      toast({
        title: "تم ربط الحساب",
        description: "تم ربط الحساب المحاسبي بالعميل بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في ربط الحساب",
        description: error.message,
      });
    },
  });
};

// Hook لإلغاء ربط حساب محاسبي من العميل
export const useUnlinkAccountFromCustomer = () => {
  const queryClient = useQueryClient();
  const { companyId } = useUnifiedCompanyAccess();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { customerId: string; customerAccountId: string }) => {
      const { error } = await supabase
        .from("customer_accounts")
        .delete()
        .eq("id", data.customerAccountId)
        .eq("customer_id", data.customerId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ 
        queryKey: ["customer-linked-accounts", variables.customerId, companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["available-customer-accounts", companyId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["available-customer-accounts-v2", companyId] 
      });
      
      console.log('🔄 [UNLINK_SUCCESS] Cache invalidated after unlinking account');
      
      toast({
        title: "تم إلغاء ربط الحساب",
        description: "تم إلغاء ربط الحساب المحاسبي من العميل",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "خطأ في إلغاء ربط الحساب",
        description: error.message,
      });
    },
  });
};