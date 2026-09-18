import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function taqadiCompletionQueryKeys(companyId: string, contractId: string, caseId: string) {
  return [
    ['lawsuit-legal-case', companyId, contractId],
    ['legal-case-workflow', companyId, caseId],
    ['legal-case', caseId],
    ['legal-cases'], ['legal-case-stats'],
    ['legal-case-litigation-profile', contractId, companyId],
    ['legal-case-memo-snapshots', contractId, companyId],
    ['manual-legal-delinquency-queue', companyId],
    ['opened-legal-cases-count', companyId],
    ['contracts'], ['contract-details'], ['tasks'],
  ];
}

/** Refresh persisted completion even when the panel missed the live transition. */
export function useTaqadiCompletionRefresh(
  companyId: string | null | undefined,
  contractId: string | null | undefined,
  job: { id: string; legal_case_id: string; status: string; updated_at: string } | null | undefined,
) {
  const queryClient = useQueryClient();
  const { id, legal_case_id: caseId, status, updated_at: updatedAt } = job || {};
  useEffect(() => {
    if (!companyId || !contractId || !caseId || status !== 'filed') return;
    void Promise.all(taqadiCompletionQueryKeys(companyId, contractId, caseId)
      .map(queryKey => queryClient.invalidateQueries({ queryKey })));
  }, [companyId, contractId, caseId, id, status, updatedAt, queryClient]);
}
