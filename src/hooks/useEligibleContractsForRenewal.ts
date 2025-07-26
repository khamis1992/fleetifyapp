import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EligibleContract {
  contract_id: string;
  contract_number: string;
  customer_name: string;
  vehicle_info: string;
  end_date: string;
  contract_amount: number;
  total_paid: number;
  outstanding_amount: number;
  days_since_expiry: number;
}

export const useEligibleContractsForRenewal = (companyId?: string) => {
  return useQuery({
    queryKey: ["eligible-contracts-for-renewal", companyId],
    queryFn: async (): Promise<EligibleContract[]> => {
      if (!companyId) return [];
      
      const { data, error } = await supabase.rpc('get_eligible_contracts_for_renewal', {
        company_id_param: companyId
      });
      
      if (error) {
        console.error("Error fetching eligible contracts:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};