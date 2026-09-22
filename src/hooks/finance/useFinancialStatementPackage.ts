import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { approveFinancialStatementPackage, changeFinancialReportingPeriodLock, listFinancialReportingPeriodLocks, listFinancialStatementPackages, readFinancialStatementPackage, saveFinancialStatementPackage, voidFinancialStatementPackage } from '@/services/financialStatementPackage';
import { validateFinancialStatementConfiguration } from '@/utils/financialStatementPackageValidation';
import type { FinancialStatementConfiguration, FinancialStatementReview } from '@/types/financialStatementPackage';
import { financeToday } from '@/services/financialReporting';
import { summarizeFinancialReportError } from '@/utils/financialReportDiagnostics';

export function useFinancialStatementPackage(configuration: FinancialStatementConfiguration) {
  const { companyId, user, isInitializing, isAuthenticating } = useUnifiedCompanyAccess();
  let valid = true;
  try { validateFinancialStatementConfiguration(configuration, financeToday()); } catch { valid = false; }
  return useQuery({ queryKey: ['financial-statement-package', companyId, user?.id, configuration],
    queryFn: () => readFinancialStatementPackage(companyId!, configuration),
    enabled: Boolean(companyId && user?.id && !isInitializing && !isAuthenticating && valid), retry: false, staleTime: 0 });
}
export function useFinancialStatementPackageHistory() {
  const { companyId, user, isInitializing, isAuthenticating } = useUnifiedCompanyAccess();
  return useQuery({ queryKey: ['financial-statement-packages', companyId, user?.id], queryFn: () => listFinancialStatementPackages(companyId!),
    enabled: Boolean(companyId && user?.id && !isInitializing && !isAuthenticating), retry: false, refetchOnWindowFocus: 'always' });
}
export function useFinancialReportingPeriodLocks() {
  const { companyId, user, isInitializing, isAuthenticating } = useUnifiedCompanyAccess();
  return useQuery({ queryKey: ['financial-reporting-period-locks', companyId, user?.id], queryFn: () => listFinancialReportingPeriodLocks(companyId!),
    enabled: Boolean(companyId && user?.id && !isInitializing && !isAuthenticating), retry: false, refetchOnWindowFocus: 'always' });
}
export function useFinancialStatementPackageActions() {
  const { companyId } = useUnifiedCompanyAccess();
  const client = useQueryClient();
  const refresh = () => Promise.all(['financial-statement-package', 'financial-statement-packages', 'financial-reporting-period-locks'].map(key => client.invalidateQueries({ queryKey: [key, companyId] })));
  const save = useMutation({ mutationFn: (configuration: FinancialStatementConfiguration) => saveFinancialStatementPackage(companyId!, configuration), onSuccess: refresh,
    retry: false, onError: error => console.error('Financial statement package save failed', JSON.stringify(summarizeFinancialReportError(error))) });
  const approve = useMutation({ mutationFn: (input: { id: string; notes: string; confirmations: FinancialStatementReview; selfReviewAcknowledged?: boolean }) => approveFinancialStatementPackage(companyId!, input.id, input.notes, input.confirmations, Boolean(input.selfReviewAcknowledged)), onSuccess: refresh,
    retry: false, onError: error => console.error('Financial statement package approval failed', JSON.stringify(summarizeFinancialReportError(error))) });
  const voidReport = useMutation({ mutationFn: (input: { id: string; reason: string }) => voidFinancialStatementPackage(companyId!, input.id, input.reason), onSuccess: refresh,
    retry: false, onError: error => console.error('Financial statement package void failed', JSON.stringify(summarizeFinancialReportError(error))) });
  const periodLock = useMutation({ mutationFn: (input: { cutoff: string | null; reason: string }) => changeFinancialReportingPeriodLock(companyId!, input.cutoff, input.reason), onSuccess: refresh,
    retry: false, onError: error => console.error('Financial reporting period change failed', JSON.stringify(summarizeFinancialReportError(error))) });
  return { save, approve, voidReport, periodLock };
}
