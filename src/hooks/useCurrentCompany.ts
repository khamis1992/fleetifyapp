import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "@/hooks/useUnifiedCompanyAccess";
import type { Database } from "@/integrations/supabase/types";

export type Company = Database["public"]["Tables"]["companies"]["Row"];

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
