import { useQuery } from '@tanstack/react-query';
import { checkRentalEligibility } from '@/services/rentalEligibilityGuard';

export function useRentalEligibility(companyId?: string | null, vehicleId?: string | null, customerId?: string | null) {
  return useQuery({
    queryKey: ['rental-eligibility', companyId, vehicleId, customerId],
    queryFn: () => checkRentalEligibility({ companyId: companyId!, vehicleId, customerId }),
    enabled: Boolean(companyId && vehicleId),
    staleTime: 30_000,
    retry: 1,
  });
}
