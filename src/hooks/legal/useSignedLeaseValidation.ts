import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SignedLeaseValidation {
  hasSignedLease: boolean;
  hasIdentityMatch: boolean;
  canConvertToLegal: boolean;
  blockingReason?: string;
  isLoading: boolean;
}

/**
 * Hook to validate if a contract has the required signed lease and identity verification
 * for legal/Taqadi transfer.
 * 
 * Returns validation status and blocking reasons in Arabic.
 */
export function useSignedLeaseValidation(
  contractId?: string,
  companyId?: string
): SignedLeaseValidation {
  const { data, isLoading } = useQuery({
    queryKey: ['signed-lease-validation', contractId, companyId],
    queryFn: async () => {
      if (!contractId || !companyId) {
        return { hasSignedLease: false, hasIdentityMatch: false };
      }

      const [leaseResult, identityResult] = await Promise.all([
        supabase.rpc('check_contract_has_verified_signed_lease_v1', {
          p_company_id: companyId,
          p_contract_id: contractId,
        }),
        supabase.rpc('check_contract_identity_verified_v1', {
          p_company_id: companyId,
          p_contract_id: contractId,
        }),
      ]);

      if (leaseResult.error) {
        console.error('Error checking signed lease:', leaseResult.error);
      }
      if (identityResult.error) {
        console.error('Error checking identity:', identityResult.error);
      }

      return {
        hasSignedLease: leaseResult.data ?? false,
        hasIdentityMatch: identityResult.data ?? false,
      };
    },
    enabled: !!contractId && !!companyId,
    staleTime: 10000, // Cache for 10 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });

  const hasSignedLease = data?.hasSignedLease ?? false;
  const hasIdentityMatch = data?.hasIdentityMatch ?? false;
  const canConvertToLegal = hasSignedLease && hasIdentityMatch;

  let blockingReason: string | undefined;
  if (!hasSignedLease && !hasIdentityMatch) {
    blockingReason = 'عقد موقّع مطابق غير موجود والهوية غير متحققة';
  } else if (!hasSignedLease) {
    blockingReason = 'عقد موقّع مطابق غير موجود';
  } else if (!hasIdentityMatch) {
    blockingReason = 'الهوية غير متحققة';
  }

  return {
    hasSignedLease,
    hasIdentityMatch,
    canConvertToLegal,
    blockingReason,
    isLoading,
  };
}
