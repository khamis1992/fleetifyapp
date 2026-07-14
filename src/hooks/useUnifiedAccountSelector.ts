import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { toast } from "@/hooks/use-toast";

export interface UnifiedAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_level: number;
  balance_type: string;
  parent_account_name?: string;
  is_available?: boolean;
}

export interface UnifiedAccountSelectorOptions {
  filterLevel?: 'level_4' | 'level_4_5' | 'level_5_6' | 'all_allowed';
  includeUnavailable?: boolean;
}

export const useUnifiedAccountSelector = (options: UnifiedAccountSelectorOptions = {}) => {
  const { filterLevel = 'level_5_6', includeUnavailable = false } = options;
  const { companyId } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["unified-account-selector", companyId, filterLevel, includeUnavailable],
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      console.log("🔍 Fetching unified accounts for company:", companyId);

      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select(`
          id,
          account_code,
          account_name,
          account_name_ar,
          account_type,
          account_level,
          balance_type,
          parent_account_id,
          is_header
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('account_code');

      if (error) {
        console.error("❌ Error fetching unified accounts:", error);
        toast({
          title: "خطأ في جلب الحسابات",
          description: "فشل في تحميل قائمة الحسابات. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
        throw error;
      }

      if (!data) {
        return [];
      }

      // Get parent account names
      const parentAccountIds = [
        ...new Set(
          data
            .map((account) => account.parent_account_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const parentAccounts = parentAccountIds.length > 0 ? await supabase
        .from('chart_of_accounts')
        .select('id, account_name')
        .in('id', parentAccountIds) : { data: [] };

      const parentMap = new Map(
        (parentAccounts.data || []).map(parent => [parent.id, parent.account_name])
      );

      // Filter and process accounts
      const processedAccounts = data
        .filter(account => {
          // Skip header accounts
          if (account.is_header) return false;
          const accountLevel = account.account_level ?? 0;

          // Apply level filtering
          switch (filterLevel) {
            case 'level_4':
              return accountLevel === 4;
            case 'level_4_5':
              return accountLevel >= 4 && accountLevel <= 5;
            case 'level_5_6':
              return accountLevel >= 5 && accountLevel <= 6;
            case 'all_allowed':
              return accountLevel >= 3;
            default:
              return accountLevel >= 5 && accountLevel <= 6;
          }
        })
        .map(account => ({
          ...account,
          account_level: account.account_level ?? 0,
          account_name_ar: account.account_name_ar ?? undefined,
          parent_account_name: account.parent_account_id 
            ? parentMap.get(account.parent_account_id) 
            : undefined,
          is_available: true // Default to available for unified selector
        }));

      console.log("✅ Successfully fetched", processedAccounts.length, "unified accounts");
      return processedAccounts as UnifiedAccount[];
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper function to filter accounts by search term
export const filterAccountsBySearch = (accounts: UnifiedAccount[], searchTerm: string): UnifiedAccount[] => {
  if (!searchTerm) return accounts;
  
  const term = searchTerm.toLowerCase();
  return accounts.filter(account => 
    account.account_code.toLowerCase().includes(term) ||
    account.account_name.toLowerCase().includes(term) ||
    account.account_name_ar?.toLowerCase().includes(term) ||
    account.parent_account_name?.toLowerCase().includes(term)
  );
};
