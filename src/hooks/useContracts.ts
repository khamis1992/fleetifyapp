import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

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

export const useActiveContracts = (customerId?: string, vendorId?: string, overrideCompanyId?: string) => {
  const { companyId, getQueryKey, validateCompanyAccess } = useUnifiedCompanyAccess()
  
  // Use provided company ID or fall back to user's company
  const targetCompanyId = overrideCompanyId || companyId
  
  return useQuery({
    queryKey: getQueryKey(["active-contracts"], [customerId, vendorId, targetCompanyId]),
    queryFn: async (): Promise<Contract[]> => {
      if (!targetCompanyId) {
        throw new Error("No company access available")
      }
      
      // Validate access to the target company
      if (overrideCompanyId) {
        validateCompanyAccess(overrideCompanyId)
      }
      
      let query = supabase
        .from("contracts")
        .select("*")
        .eq("company_id", targetCompanyId)
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
    enabled: !!targetCompanyId && !!(customerId || vendorId),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });
};