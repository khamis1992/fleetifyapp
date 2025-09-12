import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";

export interface Company {
  id: string;
  name: string;
  business_type: string;
  industry?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export const useCurrentCompany = () => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ["current-company", companyId],
    queryFn: async (): Promise<Company | null> => {
      if (!companyId) {
        return null;
      }

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) {
        console.error("Error fetching company:", error);
        throw error;
      }

      return data;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};