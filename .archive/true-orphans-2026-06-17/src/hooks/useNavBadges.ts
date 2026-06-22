/**
 * Navigation Badges Hook
 * Fetches badge data for navigation items (pending contracts, overdue payments, etc.)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentCompanyId } from './useUnifiedCompanyAccess';
import type { NavBadges, NavBadgeData } from '@/types/mobile';

interface BadgeCounts {
  pendingContracts: number;
  overduePayments: number;
  activeLegalCases: number;
  maintenanceDue: number;
}

export const useNavBadges = () => {
  const companyId = useCurrentCompanyId();

  return useQuery({
    queryKey: ['nav-badges', companyId],
    queryFn: async ({ signal }): Promise<NavBadges> => {
      if (!companyId) {
        throw new Error('No company ID available');
      }

      // Fetch all badge counts in parallel
      const [
        pendingContractsResult,
        overduePaymentsResult,
        legalCasesResult,
        maintenanceResult,
      ] = await Promise.allSettled([
        // Pending contracts (draft/pending status)
        supabase
          .from('contracts')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('status', ['draft', 'pending'])
          .abortSignal(signal),

        // Overdue payments
        supabase
          .from('payments')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('payment_status', 'pending')
          .lt('due_date', new Date().toISOString())
          .abortSignal(signal),

        // Active legal cases
        supabase
          .from('legal_cases')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .in('case_status', ['open', 'in_progress'])
          .abortSignal(signal),

        // Maintenance due (vehicles with maintenance due soon)
        supabase
          .from('vehicles')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .eq('status', 'active')
          .or('next_maintenance_date.lt.' + new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
          .abortSignal(signal),
      ]);

      // Extract counts with fallback to 0
      const counts: BadgeCounts = {
        pendingContracts:
          pendingContractsResult.status === 'fulfilled'
            ? pendingContractsResult.value.count || 0
            : 0,
        overduePayments:
          overduePaymentsResult.status === 'fulfilled'
            ? overduePaymentsResult.value.count || 0
            : 0,
        activeLegalCases:
          legalCasesResult.status === 'fulfilled'
            ? legalCasesResult.value.count || 0
            : 0,
        maintenanceDue:
          maintenanceResult.status === 'fulfilled'
            ? maintenanceResult.value.count || 0
            : 0,
      };

      // Build navigation badges
      const badges: NavBadges = {
        contracts: counts.pendingContracts > 0 ? {
          count: counts.pendingContracts,
          variant: 'warning',
          tooltip: `${counts.pendingContracts} عقد معلق`,
          updatedAt: Date.now(),
        } : undefined,

        finance: counts.overduePayments > 0 ? {
          count: counts.overduePayments,
          variant: 'destructive',
          tooltip: `${counts.overduePayments} دفعة متأخرة`,
          updatedAt: Date.now(),
        } : undefined,

        legal: counts.activeLegalCases > 0 ? {
          count: counts.activeLegalCases,
          variant: 'default',
          tooltip: `${counts.activeLegalCases} قضية نشطة`,
          updatedAt: Date.now(),
        } : undefined,

        fleet: counts.maintenanceDue > 0 ? {
          count: counts.maintenanceDue,
          variant: 'warning',
          tooltip: `${counts.maintenanceDue} صيانة مستحقة`,
          updatedAt: Date.now(),
        } : undefined,
      };

      return badges;
    },
    enabled: !!companyId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 2,
    retryDelay: 1000,
  });
};

/**
 * Get badge for specific navigation item
 */
export const useNavBadge = (navItem: string): NavBadgeData | undefined => {
  const { data: badges } = useNavBadges();
  return badges?.[navItem];
};

/**
 * Get total badge count across all navigation items
 */
export const useTotalBadgeCount = (): number => {
  const { data: badges } = useNavBadges();

  if (!badges) return 0;

  return Object.values(badges).reduce((total, badge) => {
    return total + (badge?.count || 0);
  }, 0);
};
