import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export const useCostCenters = (companyId?: string) => {
  return useQuery({
    queryKey: ["cost-centers", companyId],
    queryFn: async () => {
      let query = supabase
        .from("cost_centers")
        .select("*")
        .eq("is_active", true)
        .order("center_code")

      if (companyId) {
        query = query.eq("company_id", companyId)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching cost centers:", error)
        throw error
      }

      return data || []
    },
    enabled: true
  })
}