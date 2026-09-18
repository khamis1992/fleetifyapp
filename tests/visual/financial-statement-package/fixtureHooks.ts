import { useMemo, useSyncExternalStore } from 'react';
import type { FinancialStatementConfiguration, FinancialStatementReview, SavedFinancialStatementPackage } from '../../../src/types/financialStatementPackage';
import { fixtureCompanyId, fixturePreparerId, fixtureReviewerId, makeFinancialStatementPackageFixture, makeSavedFinancialStatementPackageFixture } from './fixtureData';

const query = new URLSearchParams(location.search);
const isReviewer = query.get('actor') === 'reviewer';
const locale = query.get('lang') === 'en' ? 'en' : 'ar';
const listeners = new Set<() => void>();
let revision = 0;
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const notify = () => { revision++; listeners.forEach(listener => listener()); };
const useRevision = () => useSyncExternalStore(subscribe, () => revision);
const preset = query.get('status');
let versions: SavedFinancialStatementPackage[] = [makeSavedFinancialStatementPackageFixture(makeFinancialStatementPackageFixture(), preset === 'approved' || preset === 'voided' ? preset : 'draft')];
const locks = { company_id: fixtureCompanyId, managed_lock: null as null | { id: string; company_id: string; accounting_period_id: string; locked_through: string; status: string; changed_by: string; changed_by_name: string; changed_at: string; reason: string }, can_manage: true, other_closed_periods: [], history: [] as { id: string; action: string; locked_through: string; actor_name: string; actor_id: string; reason: string; created_at: string }[] };

export const useUnifiedCompanyAccess = () => ({ companyId: fixtureCompanyId, user: { id: isReviewer ? fixtureReviewerId : fixturePreparerId }, isInitializing: false, isAuthenticating: false });
export const useFleetifyTranslation = () => ({ currentLanguage: locale, t: (key: string) => key });
export const financeToday = () => '2026-09-18';
export const financialStatementPackageError = (error: unknown) => error instanceof Error ? error.message : 'Synthetic failure';
export function fixtureReport(configuration: FinancialStatementConfiguration) {
  const report = makeFinancialStatementPackageFixture(query.get('stress') === 'true');
  report.configuration = structuredClone(configuration);
  report.position.asOfDate = configuration.periodEnd; report.position.comparisonDate = configuration.positionComparisonDate;
  report.statements.forEach(statement => {
    if (statement.key === 'position') {
      statement.columns[0].endDate = configuration.periodEnd; statement.columns[1].endDate = configuration.positionComparisonDate;
      if (configuration.thirdPositionDate) { statement.columns.push({ key: 'third', labelAr: 'بداية المقارنة', labelEn: 'Opening comparative', endDate: configuration.thirdPositionDate }); statement.rows.forEach(row => row.values.push(row.values[1])); }
    } else if (statement.key.startsWith('equity_')) statement.columns.forEach(column => { column.startDate = statement.key === 'equity_current' ? configuration.periodStart : configuration.comparativePeriodStart; column.endDate = statement.key === 'equity_current' ? configuration.periodEnd : configuration.comparativePeriodEnd; });
    else { statement.columns[0].startDate = configuration.periodStart; statement.columns[0].endDate = configuration.periodEnd; statement.columns[1].startDate = configuration.comparativePeriodStart; statement.columns[1].endDate = configuration.comparativePeriodEnd; }
  });
  if (query.get('findings') === 'true') report.findings.push({ code: 'disclosures_incomplete', severity: 'error', count: 1, messageAr: 'الإيضاحات تحتاج إلى استكمال قبل الاعتماد', messageEn: 'Disclosures must be completed before approval', accountIds: [], journalIds: [] });
  return report;
}
export function useFinancialStatementPackage(configuration: FinancialStatementConfiguration) {
  useRevision(); const data = useMemo(() => fixtureReport(configuration), [configuration]);
  return { data, error: query.get('error') === 'true' ? new Error('Synthetic source read error') : null, isFetching: false, refetch: async () => ({ data, error: null }) };
}
export function useFinancialStatementPackageHistory() { useRevision(); return { data: versions, error: null, isFetching: false }; }
export function useFinancialReportingPeriodLocks() { useRevision(); return { data: locks, error: null, isFetching: false }; }
export const readFinancialStatementPackage = async (_companyId: string, configuration: FinancialStatementConfiguration) => fixtureReport(configuration);
export const listFinancialStatementPackages = async () => versions;
export function useFinancialStatementPackageActions() {
  const action = <T,>(operation: (input: T) => unknown) => ({ isPending: false, mutateAsync: async (input: T) => { const output = operation(input); notify(); return output; } });
  return {
    save: action((configuration: FinancialStatementConfiguration) => { const saved = makeSavedFinancialStatementPackageFixture(fixtureReport(configuration)); saved.id = crypto.randomUUID(); saved.created_by = isReviewer ? fixtureReviewerId : fixturePreparerId; saved.created_by_name = isReviewer ? 'Synthetic Reviewer' : 'Synthetic Preparer'; versions = [saved, ...versions]; return saved; }),
    approve: action((input: { id: string; notes: string; confirmations: FinancialStatementReview }) => { const original = versions.find(item => item.id === input.id)!; const saved = { ...original, status: 'approved' as const, approved_by: isReviewer ? fixtureReviewerId : fixturePreparerId, approved_by_name: isReviewer ? 'Synthetic Reviewer' : 'Synthetic Preparer', approved_at: '2026-09-18T12:00:00Z', review_notes: input.notes }; versions = versions.map(item => item.id === input.id ? saved : item); return saved; }),
    voidReport: action((input: { id: string; reason: string }) => { const saved = { ...versions.find(item => item.id === input.id)!, status: 'voided' as const, void_reason: input.reason }; versions = versions.map(item => item.id === input.id ? saved : item); return saved; }),
    periodLock: action((input: { cutoff: string | null; reason: string }) => {
      const cutoff = input.cutoff || locks.managed_lock?.locked_through || '2026-08-31';
      locks.managed_lock = { id: '77777777-7777-4777-8777-777777777777', company_id: fixtureCompanyId, accounting_period_id: '88888888-8888-4888-8888-888888888888', locked_through: cutoff, status: input.cutoff ? 'locked' : 'unlocked', changed_by: fixtureReviewerId, changed_by_name: 'Synthetic Reviewer', changed_at: '2026-09-18T12:00:00Z', reason: input.reason };
      locks.history.unshift({ id: crypto.randomUUID(), action: input.cutoff ? 'locked' : 'unlocked', locked_through: cutoff, actor_id: fixtureReviewerId, actor_name: 'Synthetic Reviewer', created_at: '2026-09-18T12:00:00Z', reason: input.reason }); return locks.managed_lock;
    }),
  };
}
