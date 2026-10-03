import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { fleetReportPeriod } from '../data/fleetReportModel';
import { readFleetReport } from '../data/readFleetReport';
import type { ReportFilters } from '../types/reports.types';
export type { VehicleInsuranceRegistrationData } from '../data/fleetReportModel';

export interface InsuranceRegistrationSummary {
  total_vehicles: number; with_valid_insurance: number; with_expiring_insurance: number; with_expired_insurance: number; without_insurance: number;
  with_valid_registration: number; with_expiring_registration: number; with_expired_registration: number; without_registration: number;
  fully_compliant: number; needs_attention: number;
}

export function useFleetReportDataset(filters: ReportFilters) {
  const { companyId } = useUnifiedCompanyAccess();
  const period = fleetReportPeriod(filters);
  const query = useQuery({
    queryKey: ['fleet-report-dataset', companyId, period.start, period.end],
    enabled: Boolean(companyId),
    queryFn: () => {
      if (!companyId) throw new Error('يجب تحديد الشركة');
      return readFleetReport(supabase, companyId, period);
    },
    staleTime: 60_000,
    placeholderData: undefined,
  });
  return { ...query, companyId, period };
}
