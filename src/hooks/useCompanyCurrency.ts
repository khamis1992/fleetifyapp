import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentCompanyId } from "./useUnifiedCompanyAccess";

export interface CompanyCurrency {
  currency: string; // ISO 4217 e.g., KWD, QAR, SAR
  locale: string;   // e.g., ar-KW, ar-QA
}

const currencyLocaleMap: Record<string, string> = {
  KWD: "ar-KW",
  QAR: "ar-QA",
  SAR: "ar-SA",
  AED: "ar-AE",
  OMR: "ar-OM",
  BHD: "ar-BH",
  USD: "en-US",
  EUR: "de-DE",
};

export const useCompanyCurrency = (): CompanyCurrency => {
  const companyId = useCurrentCompanyId();

  const { data } = useQuery({
    queryKey: ["company-currency", companyId],
    queryFn: async () => {
      if (!companyId) return { currency: "KWD" } as { currency: string };
      const { data, error } = await supabase
        .from("companies")
        .select("currency")
        .eq("id", companyId)
        .single();
      if (error) {
        console.warn("[useCompanyCurrency] Falling back to KWD due to error:", error.message);
        return { currency: "KWD" } as { currency: string };
      }
      return { currency: data?.currency || "KWD" } as { currency: string };
    },
    staleTime: 60 * 1000,
  });

  const currency = (data?.currency || "KWD").toUpperCase();
  const locale = currencyLocaleMap[currency] || "ar";

  return { currency, locale };
};
