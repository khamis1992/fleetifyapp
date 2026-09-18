import { useQuery } from '@tanstack/react-query';
import { fetchRentalMonthSummary } from '@/services/rentalMonthSummary';

export const useRentalMonthSummary = (companyId: string | null, month: string) => useQuery({
  queryKey: ['canonical-rental-month-summary', companyId, month],
  enabled: Boolean(companyId),
  queryFn: () => fetchRentalMonthSummary(companyId || '', month),
  staleTime: 0,
  // Refresh an open report even when the change came from another employee.
  refetchInterval: 30_000,
  retry: false,
});
