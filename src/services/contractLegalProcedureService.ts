import { supabase } from '@/integrations/supabase/client';

export const LEGAL_REVERSAL_MIN_REASON_LENGTH = 10;

type RevertLegalProcedureInput = {
  contractId: string;
  companyId: string;
  reason?: string;
  idempotencyKey?: string;
};

type RevertLegalProcedureResult = {
  changed: boolean;
  closedCases: number;
  cancelledJobs: number;
  cancelledPreparations: number;
  deactivatedDelinquentRecords: number;
  vehicleStatus: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const asCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

export async function revertContractLegalProcedure({
  contractId,
  companyId,
  reason = 'تمت إزالة الإجراء القانوني من العقد',
  idempotencyKey = crypto.randomUUID(),
}: RevertLegalProcedureInput): Promise<RevertLegalProcedureResult> {
  const trimmedReason = reason.trim();
  if (!contractId.trim() || !companyId.trim() || !idempotencyKey.trim()) {
    throw new Error('تعذر تحديد العقد أو الشركة أو معرّف العملية');
  }
  if ([...trimmedReason].length < LEGAL_REVERSAL_MIN_REASON_LENGTH) {
    throw new Error(`اكتب سببًا واضحًا من ${LEGAL_REVERSAL_MIN_REASON_LENGTH} أحرف على الأقل لإزالة الإجراء القانوني`);
  }

  const { data, error } = await supabase.rpc('revert_contract_from_legal_v2', {
    p_company_id: companyId,
    p_contract_id: contractId,
    p_reason: trimmedReason,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    if (
      error.code === 'PGRST202'
      || /function .*revert_contract_from_legal_v2/i.test(error.message || '')
      || /schema cache/i.test(error.message || '')
    ) {
      throw new Error(
        'تحديث قاعدة البيانات الخاص بإزالة الإجراء القانوني لم يُنشر بعد؛ أُوقفت العملية لمنع ترك العقد والقضية في حالتين مختلفتين.',
      );
    }
    throw new Error(error.message || error.code || 'تعذر إزالة الإجراء القانوني');
  }

  const result = asRecord(data);
  if (!result || result.success !== true) {
    throw new Error(String(result?.error || 'لم تؤكد قاعدة البيانات اكتمال إزالة الإجراء القانوني'));
  }
  if (result.contract_id !== contractId || typeof result.changed !== 'boolean') {
    throw new Error('استجابة إزالة الإجراء القانوني غير مكتملة أو لا تخص العقد المطلوب؛ تحقق من حالة العقد قبل إعادة المحاولة');
  }

  return {
    changed: result.changed === true,
    closedCases: asCount(result.closed_cases),
    cancelledJobs: asCount(result.cancelled_jobs),
    cancelledPreparations: asCount(result.cancelled_preparations),
    deactivatedDelinquentRecords: asCount(result.deactivated_delinquent_records),
    vehicleStatus: typeof result.vehicle_status === 'string' ? result.vehicle_status : null,
  };
}
