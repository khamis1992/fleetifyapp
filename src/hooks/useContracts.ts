import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Contract {
  id: string;
  contract_number: string;
  contract_date: string;
  start_date: string;
  end_date: string;
  contract_amount: number;
  monthly_amount: number;
  status: string;
  contract_type: string;
  description?: string;
  terms?: string;
  customer_id?: string;
  vehicle_id?: string;
  cost_center_id?: string;
  created_at: string;
  updated_at: string;
}

export const useActiveContracts = (customerId?: string, vendorId?: string) => {
  return useQuery({
    queryKey: ["active-contracts", customerId, vendorId],
    queryFn: async (): Promise<Contract[]> => {
      if (!customerId && !vendorId) return [];
      
      let query = supabase
        .from("contracts")
        .select("*")
        .eq("status", "active")
        .order("contract_date", { ascending: false });

      if (customerId) {
        query = query.eq("customer_id", customerId);
      } else if (vendorId) {
        // Note: contracts table may not have vendor_id column yet
        // This would need to be added if needed for vendor contracts
        return [];
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching contracts:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!(customerId || vendorId)
  });
};