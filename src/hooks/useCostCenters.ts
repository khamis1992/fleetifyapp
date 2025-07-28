import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess'

export const useCostCenters = (overrideCompanyId?: string) => {
  const { companyId, filter, getQueryKey, validateCompanyAccess } = useUnifiedCompanyAccess()
  
  // Use provided company ID or fall back to user's company
  const targetCompanyId = overrideCompanyId || companyId
  
  return useQuery({
    queryKey: getQueryKey(["cost-centers"], [targetCompanyId]),
    queryFn: async () => {
      if (!targetCompanyId) {
        throw new Error("No company access available")
      }
      
      // Validate access to the target company
      if (overrideCompanyId) {
        validateCompanyAccess(overrideCompanyId)
      }

      const query = supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .eq("company_id", targetCompanyId)
        .order("center_code")

      const { data, error } = await query

      if (error) {
        console.error("Error fetching cost centers:", error)
        throw error
      }

      return data || []
    },
    enabled: !!targetCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}