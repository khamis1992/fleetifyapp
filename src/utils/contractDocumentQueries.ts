import type { QueryClient } from '@tanstack/react-query';

// Keep the company/contract order shared by readers and mutation callbacks.
export const contractDocumentsKey = (companyId?: string | null, contractId?: string | null) =>
  ['contract-documents', companyId, contractId] as const;

/** Invalidate evidence consumers; never declare identity/readiness verified locally. */
export async function invalidateContractDocumentDependents(
  queryClient: QueryClient,
  companyId: string | null | undefined,
  contractId: string | null | undefined,
) {
  if (!companyId || !contractId) return;
  await Promise.all([
    contractDocumentsKey(companyId, contractId),
    ['legal-transfer-readiness', companyId, contractId],
    ['legal-transfer-signed-contract-document', companyId, contractId],
    ['contract-document', contractId, companyId],
    ['contract-violation-evidence-documents', contractId, companyId],
    ['manual-legal-delinquency-queue', companyId],
    ['employee-signed-contract-documents', companyId],
    ['pending-id-scan-count', contractId],
  ].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
