import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from './useUnifiedCompanyAccess';

export interface AccountConflictInfo {
  has_existing_accounts: boolean;
  accounts_count: number;
  has_existing_banks: boolean;
  banks_count: number;
  existing_codes: string[];
  existing_bank_accounts: string[];
}

export const useAccountConflictCheck = () => {
  const { companyId } = useUnifiedCompanyAccess();

  const { data: conflictInfo, isLoading, refetch } = useQuery({
    queryKey: ['account-conflict-check', companyId],
    queryFn: async (): Promise<AccountConflictInfo> => {
      if (!companyId) throw new Error('Company ID is required');

      const { data, error } = await supabase.rpc('check_existing_accounts_summary', {
        company_id_param: companyId
      });

      if (error) {
        console.error('Error checking account conflicts:', error);
        throw error;
      }

      if (!data) {
        return {
          has_existing_accounts: false,
          accounts_count: 0,
          has_existing_banks: false,
          banks_count: 0,
          existing_codes: [],
          existing_bank_accounts: []
        };
      }

      return (data as unknown) as AccountConflictInfo;
    },
    enabled: !!companyId,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false
  });

  const hasConflicts = conflictInfo?.has_existing_accounts || conflictInfo?.has_existing_banks;

  return {
    conflictInfo,
    hasConflicts,
    isLoading,
    refetch
  };
};