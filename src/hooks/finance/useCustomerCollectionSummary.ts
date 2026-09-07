import { useQuery } from "@tanstack/react-query";
import { useUnifiedCompanyAccess } from "@/hooks/useUnifiedCompanyAccess";
import { fetchCustomerCollectionSummary } from "@/services/customerCollectionSummary";
import { financeToday } from "@/services/financialReporting";

export function useCustomerCollectionSummary() {
  const { companyId, user, isInitializing } = useUnifiedCompanyAccess();
  const asOf = financeToday();
  const ready = Boolean(companyId && user?.id && !isInitializing);
  const query = useQuery({
    queryKey: ["customer-collection-summary", user?.id, companyId, asOf],
    queryFn: () => fetchCustomerCollectionSummary(companyId || "", asOf),
    enabled: ready,
    retry: false,
    staleTime: 0,
    refetchInterval: 30_000,
  });
  return {
    ...query,
    data: ready && !query.error ? query.data : undefined,
    isLoading: isInitializing || (ready && query.isPending),
    error:
      query.error ||
      (!ready && !isInitializing
        ? new Error("اختر الشركة وسجّل الدخول لعرض التحصيل.")
        : null),
  };
}
