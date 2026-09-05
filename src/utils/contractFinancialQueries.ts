import type { QueryClient } from '@tanstack/react-query';

export type ContractFinancialScope = {
  contractId: string;
  contractNumber: string;
  companyId: string;
};

/** Refresh this details page's read models, never the financial-sync RPC query. */
export async function refreshContractFinancialQueries(
  queryClient: QueryClient,
  { contractId, contractNumber, companyId }: ContractFinancialScope,
  { cancelInFlight = false }: { cancelInFlight?: boolean } = {},
): Promise<void> {
  if (!contractId || !contractNumber || !companyId) {
    throw new Error('تعذر تحديد العقد والشركة لتحديث البيانات المالية.');
  }

  const results = await Promise.allSettled([
    ['contract-details', contractNumber, companyId],
    // Details routes accept both the human-readable number and the UUID.
    ['contract-details', contractId, companyId],
    ['lawsuit-contract-details', contractId, companyId],
    ['legal-claim-projection', contractId, companyId],
    ['contract-invoices', contractId],
    ['contract-payments', contractId],
    ['payment-schedules', contractId],
    ['contract-audit-logs', contractId, companyId],
    ['canonical-rental-month-summary', companyId],
  ].map(async (queryKey) => {
    // A first load started before the command can contain an older snapshot.
    // invalidateQueries alone may deduplicate against that unfinished request.
    if (cancelInFlight) await queryClient.cancelQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey }, { throwOnError: true });
  }));

  if (results.some((result) => result.status === 'rejected')) {
    // This is a read failure after the command, not evidence it rolled back.
    throw new Error('تعذر تحديث بعض بيانات العقد المالية بعد الحفظ.');
  }
}
