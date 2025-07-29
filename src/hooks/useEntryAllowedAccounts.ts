import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyScope } from "./useCompanyScope";

export interface EntryAllowedAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_level: number;
  balance_type: string;
  parent_account_name?: string;
}

export const useEntryAllowedAccounts = () => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ["entry-allowed-accounts", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc("get_entry_allowed_accounts", {
        company_id_param: companyId,
      });

      if (error) {
        console.error("Error fetching entry allowed accounts:", error);
        throw error;
      }

      return data as EntryAllowedAccount[];
    },
    enabled: !!companyId,
  });
};

export const useValidateAccountForEntry = () => {
  return {
    validateAccount: async (accountId: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("validate_account_level_for_entries", {
        account_id_param: accountId,
      });

      if (error) {
        console.error("Error validating account for entry:", error);
        return false;
      }

      return data as boolean;
    },
  };
};

export const useIsAggregateAccount = () => {
  return {
    checkIfAggregate: async (accountId: string): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_aggregate_account", {
        account_id_param: accountId,
      });

      if (error) {
        console.error("Error checking if account is aggregate:", error);
        return false;
      }

      return data as boolean;
    },
  };
};