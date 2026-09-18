import type { QueryClient } from '@tanstack/react-query';
import { notifyRecordChange } from '@/services/recordQuerySynchronization';

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
  await notifyRecordChange(queryClient, { entity: 'documents', companyId, recordId: contractId });
}
