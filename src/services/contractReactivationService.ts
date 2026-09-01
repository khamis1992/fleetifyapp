import { supabase } from '@/integrations/supabase/client';

export type CancelledContractReactivationResult = {
  success: boolean;
  contract_id: string;
  status: 'active';
  financial_documents_preserved?: boolean;
  idempotent_replay?: boolean;
  unpaid_violations_override_accepted?: boolean;
  vehicle_unpaid_violations?: { count?: number; total?: number };
  customer_unpaid_violations?: { count?: number; total?: number };
};

export const canReactivateCancelledContract = (status: string | null | undefined) =>
  ['cancelled', 'canceled'].includes(String(status || '').trim().toLowerCase());

export async function reactivateCancelledContract({
  contractId,
  acceptUnpaidViolations,
}: {
  contractId: string;
  acceptUnpaidViolations: boolean;
}): Promise<CancelledContractReactivationResult> {
  const { data, error } = await supabase.rpc(
    'reactivate_cancelled_contract_atomic_v1',
    {
      p_contract_id: contractId,
      p_accept_unpaid_violations: acceptUnpaidViolations,
    },
  );

  if (error) throw error;

  const result = data as CancelledContractReactivationResult | null;
  if (!result?.success || result.status !== 'active') {
    throw new Error('لم تكتمل إعادة تفعيل العقد');
  }

  return result;
}
