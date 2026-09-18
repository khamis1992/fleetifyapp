import { lazy, Suspense, useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UnifiedNotificationBell } from '@/components/notifications/UnifiedNotificationBell';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDailyDecisionCenter } from '@/hooks/useDailyDecisionCenter';
import { useFleetStatus } from '@/hooks/useFleetStatus';
import { supabase } from '@/integrations/supabase/client';
import DashboardWorkspace from '../workspace/DashboardWorkspace';
import type { MaintenanceItem } from '../workspace/model';

const SimpleContractWizard = lazy(() => import('@/components/contracts/SimpleContractWizard').then(module => ({ default: module.SimpleContractWizard })));

/** Data and commands stay in the route adapter; the workspace only presents them. */
export default function BentoDashboard() {
  const { companyId } = useUnifiedCompanyAccess();
  const stats = useDashboardStats();
  const decision = useDailyDecisionCenter();
  const fleet = useFleetStatus();
  const [showContractWizard, setShowContractWizard] = useState(false);

  const maintenance = useQuery<MaintenanceItem[]>({
    queryKey: ['maintenance-operations-center', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('id, maintenance_type, scheduled_date, status, vehicles(plate_number)')
        .eq('company_id', companyId)
        .in('status', ['pending', 'in_progress'])
        .order('scheduled_date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return (data || []) as MaintenanceItem[];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });

  const refresh = async () => {
    await Promise.allSettled([stats.refetch(), decision.refetch(), fleet.refetch(), maintenance.refetch()]);
  };

  const triggerQuickSearch = useCallback(() => {
    document.dispatchEvent(new Event('fleetify:open-global-search'));
  }, []);
  const successfulUpdates = [stats.dataUpdatedAt, fleet.dataUpdatedAt, decision.dataUpdatedAt, maintenance.dataUpdatedAt].filter(time => time > 0);

  return <>
    <DashboardWorkspace
      stats={stats.data}
      fleet={fleet.data}
      decision={decision.data}
      maintenance={maintenance.data || []}
      sources={{
        stats: { loading: stats.isPending, error: stats.isError },
        fleet: { loading: fleet.isPending, error: fleet.isError },
        decision: { loading: decision.isPending, error: decision.isError },
        maintenance: { loading: maintenance.isPending, error: maintenance.isError },
      }}
      refreshing={stats.isFetching || fleet.isFetching || decision.isFetching || maintenance.isFetching}
      updatedAt={successfulUpdates.length ? Math.min(...successfulUpdates) : undefined}
      onRefresh={refresh}
      onNewContract={() => setShowContractWizard(true)}
      onSearch={triggerQuickSearch}
      notifications={<UnifiedNotificationBell />}
    />
    {showContractWizard && <Suspense fallback={<div className="dw-dialog-loader" role="status">جاري تجهيز نموذج العقد…</div>}>
      <SimpleContractWizard open={showContractWizard} onOpenChange={setShowContractWizard} />
    </Suspense>}
  </>;
}
