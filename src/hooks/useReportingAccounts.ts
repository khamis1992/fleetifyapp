import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { toast } from "@/hooks/use-toast";

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
  const { companyId, validateCompanyAccess } = useUnifiedCompanyAccess();

  return useQuery({
    queryKey: ["reporting-accounts", companyId],
    queryFn: async () => {
      // Enhanced validation
      if (!companyId) {
        const errorMsg = "Company ID is missing. Please ensure you are properly logged in and associated with a company.";
        console.error("❌ useReportingAccounts:", errorMsg);
        toast({
          title: "Company Access Error",
          description: errorMsg,
          variant: "destructive",
        });
        throw new Error(errorMsg);
      }

      // Validate company access
      try {
        validateCompanyAccess(companyId);
      } catch (error) {
        console.error("❌ Company access validation failed:", error);
        toast({
          title: "Access Denied",
          description: "You do not have access to this company's data.",
          variant: "destructive",
        });
        throw error;
      }

      console.log("🔍 Fetching reporting accounts for company:", companyId);

      const { data, error } = await supabase.rpc("get_reporting_accounts", {
        company_id_param: companyId,
      });

      if (error) {
        console.error("❌ Error fetching reporting accounts:", error);
        
        // Enhanced error handling
        if (error.message?.includes("Company ID parameter cannot be null")) {
          toast({
            title: "Company Association Error",
            description: "Your account is not properly associated with a company. Please contact your administrator.",
            variant: "destructive",
          });
        } else if (error.message?.includes("does not exist")) {
          toast({
            title: "Company Not Found",
            description: "The company associated with your account was not found. Please contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Database Error",
            description: "Failed to load reporting accounts. Please try again or contact support.",
            variant: "destructive",
          });
        }
        
        throw error;
      }

      console.log("✅ Successfully fetched", data?.length || 0, "reporting accounts");
      return data as ReportingAccount[];
    },
    enabled: !!companyId,
    retry: (failureCount, error) => {
      // Don't retry on validation errors
      if (error?.message?.includes("Company ID parameter cannot be null") || 
          error?.message?.includes("does not exist")) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};