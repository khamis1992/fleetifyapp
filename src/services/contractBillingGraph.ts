import { supabase } from '@/integrations/supabase/client';

export type ContractBillingGraphResult = {
  mode: 'authoritative_schedule' | 'generated_schedule';
  createdInvoices: number;
  scheduleCount: number;
  // The generated-schedule branch does not return a total. Unknown is not zero.
  scheduleTotal: number | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
);

const isNonnegativeNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0
);

const isCount = (value: unknown): value is number => (
  isNonnegativeNumber(value) && Number.isSafeInteger(value)
);

/**
 * Single client entry point for creating a contract's billing graph.
 *
 * The database command is atomic and schedule-first: if an active schedule is
 * already present, it must exactly match the contract before any invoice is
 * created. This is intentionally not allowed to fall back to the legacy pair
 * when the RPC is unavailable, because that fallback cannot safely represent
 * partial first/last calendar months.
 */
export const generateContractBillingGraph = async (
  contractId: string,
): Promise<ContractBillingGraphResult> => {
  const { data, error } = await supabase.rpc('generate_contract_billing_graph_v2', {
    p_contract_id: contractId,
  });

  if (error) {
    if (error.code === 'PGRST202') {
      throw new Error(
        'تحديث قاعدة البيانات الخاص بالأقساط الجزئية غير منشور بعد؛ أُوقف التوليد لمنع إنشاء فواتير خاطئة.',
      );
    }
    throw new Error(error.message || error.code || 'فشل إنشاء الرسم المالي للعقد');
  }

  const result = asRecord(data);
  if (!result || result.success !== true) {
    throw new Error(String(result?.error || 'لم تؤكد قاعدة البيانات اكتمال إنشاء الرسم المالي'));
  }

  const mode = result.mode;
  if (
    (mode !== 'authoritative_schedule' && mode !== 'generated_schedule')
    || !isCount(result.created_invoices)
    || !isCount(result.schedule_count)
    || (mode === 'authoritative_schedule' && !isNonnegativeNumber(result.schedule_total))
    || (result.schedule_total !== undefined && !isNonnegativeNumber(result.schedule_total))
  ) {
    // A mutation may already have committed. Do not turn missing counts into a
    // false "nothing missing" message or automatically submit another request.
    throw new Error('تعذر التحقق من نتيجة إنشاء الفواتير؛ حدّث بيانات العقد للتحقق مما تم قبل إعادة المحاولة.');
  }

  return {
    mode,
    createdInvoices: result.created_invoices,
    scheduleCount: result.schedule_count,
    scheduleTotal: isNonnegativeNumber(result.schedule_total) ? result.schedule_total : null,
  };
};
