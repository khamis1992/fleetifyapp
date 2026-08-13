import { supabase } from '@/integrations/supabase/client';

export interface ContractPenaltySummary {
  count: number;
  total: number;
}

export interface ContractClosePenaltyDecision extends ContractPenaltySummary {
  allowed: boolean;
  message: string;
}

const PAID_PENALTY_STATUSES = new Set(['paid', 'completed']);

export function evaluateContractClosePenalties(
  penalties: Array<{ amount: number | null; payment_status: string | null; status?: string | null }>,
): ContractClosePenaltyDecision {
  const summary = penalties.reduce<ContractPenaltySummary>((result, penalty) => {
    const status = penalty.payment_status?.trim().toLowerCase();
    const handlingStatus = penalty.status?.trim().toLowerCase();
    if ((status && PAID_PENALTY_STATUSES.has(status)) || ['handled', 'resolved', 'waived', 'transferred'].includes(handlingStatus || '')) return result;
    return { count: result.count + 1, total: result.total + (Number(penalty.amount) || 0) };
  }, { count: 0, total: 0 });
  const total = new Intl.NumberFormat('ar-QA', { maximumFractionDigits: 2 }).format(summary.total);
  return {
    ...summary,
    allowed: summary.count === 0,
    message: summary.count === 0
      ? ''
      : `لا يمكن إغلاق العقد: توجد ${summary.count} مخالفة غير مسددة بإجمالي ${total} ر.ق. يجب سدادها أو معالجتها صراحةً أولاً`,
  };
}

export async function getContractClosePenaltyDecision(companyId: string, contractId: string) {
  const { data, error } = await supabase
    .from('penalties')
    .select('amount, payment_status, status')
    .eq('company_id', companyId)
    .eq('contract_id', contractId);
  if (error) throw new Error('تعذر التحقق من مخالفات العقد قبل الإغلاق');
  return evaluateContractClosePenalties(data || []);
}

export async function assertContractCanClose(companyId: string, contractId: string) {
  const decision = await getContractClosePenaltyDecision(companyId, contractId);
  if (!decision.allowed) throw new Error(decision.message);
  return decision;
}
