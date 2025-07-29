import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyScope } from "./useCompanyScope";

export interface ReportingAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string;
  account_type: string;
  account_level: number;
  balance_type: string;
  parent_account_name?: string;
}

export const useReportingAccounts = () => {
  const { companyId } = useCompanyScope();

  return useQuery({
    queryKey: ["reporting-accounts", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase.rpc("get_reporting_accounts", {
        company_id_param: companyId,
      });

      if (error) {
        console.error("Error fetching reporting accounts:", error);
        throw error;
      }

      return data as ReportingAccount[];
    },
    enabled: !!companyId,
  });
};