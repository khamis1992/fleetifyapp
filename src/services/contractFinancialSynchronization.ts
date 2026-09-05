import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  refreshContractFinancialQueries,
  type ContractFinancialScope,
} from '@/utils/contractFinancialQueries';

export type ContractFinancialSyncResult = {
  contractId: string;
  changed: boolean;
  readError: string | null;
};

export class FinancialSyncValidationError extends Error {}
export class FinancialSyncUnavailableError extends Error {}

const readFailureMessage = 'اكتملت مزامنة الأرصدة، لكن تعذر تحميل بعض النتائج الجديدة. أعد تحميل البيانات دون إعادة المزامنة.';
const syncKey = ({ contractId, companyId }: ContractFinancialScope) => (
  ['contract-financial-refresh', contractId, companyId] as const
);
const hasScope = (scope: ContractFinancialScope) => (
  Boolean(scope.contractId.trim() && scope.companyId.trim() && scope.contractNumber.trim())
);

function assertScope(scope: ContractFinancialScope): void {
  if (!hasScope(scope)) throw new FinancialSyncValidationError('تعذر تحديد العقد والشركة للمزامنة.');
}

async function refreshReaders(client: QueryClient, scope: ContractFinancialScope): Promise<void> {
  assertScope(scope);
  const results = await Promise.allSettled([
    refreshContractFinancialQueries(client, scope, { cancelInFlight: true }),
    // Preserve the contract-list refresh, but never invalidate the sync command.
    client.cancelQueries({ queryKey: ['contracts'] }).then(() => (
      client.invalidateQueries({ queryKey: ['contracts'] }, { throwOnError: true })
    )),
  ]);
  if (results.some((result) => result.status === 'rejected')) throw new Error(readFailureMessage);
}

/** The aggregate changed flag cannot tell whether individual invoices changed. */
async function synchronize(client: QueryClient, scope: ContractFinancialScope): Promise<ContractFinancialSyncResult> {
  assertScope(scope);
  const { data, error } = await supabase.rpc('refresh_contract_financial_state_v1', {
    p_contract_id: scope.contractId,
  });
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new FinancialSyncUnavailableError('دالة مزامنة أرصدة العقد غير متاحة في قاعدة البيانات؛ يلزم نشر تحديث المزامنة والتحقق منه. لم تُعد المحاولة تلقائياً.');
    }
    throw error;
  }

  if (
    !data || typeof data !== 'object' || Array.isArray(data)
    || !('contract_id' in data) || data.contract_id !== scope.contractId
    || !('changed' in data) || typeof data.changed !== 'boolean'
  ) {
    // The command may have completed. An invalid acknowledgement is not a no-op
    // and must not trigger an automatic command retry.
    throw new FinancialSyncValidationError('تعذر التحقق من نتيجة المزامنة لهذا العقد. لم تُعتبر العملية ناجحة ولم تُعد تلقائياً.');
  }

  const result: ContractFinancialSyncResult = {
    contractId: scope.contractId, changed: data.changed, readError: null,
  };
  try {
    await refreshReaders(client, scope);
  } catch {
    // Query retries must not repeat a completed command because a read failed.
    result.readError = readFailureMessage;
  }
  return result;
}

export const contractFinancialSyncQueryOptions = (client: QueryClient, scope: ContractFinancialScope) => ({
  queryKey: syncKey(scope),
  queryFn: () => synchronize(client, scope),
  enabled: hasScope(scope),
  retry: (failureCount: number, error: unknown) => (
    !(error instanceof FinancialSyncValidationError)
    && !(error instanceof FinancialSyncUnavailableError)
    && failureCount < 2
  ),
  retryDelay: (attempt: number) => Math.min(500 * 2 ** attempt, 2000),
  staleTime: 30000,
  refetchOnWindowFocus: false,
});

/** Explicit recovery of readers only; does not call the financial RPC. */
export async function retryContractFinancialReads(client: QueryClient, scope: ContractFinancialScope): Promise<void> {
  await refreshReaders(client, scope);
  client.setQueryData<ContractFinancialSyncResult>(syncKey(scope), (current) => (
    current ? { ...current, readError: null } : current
  ));
}
