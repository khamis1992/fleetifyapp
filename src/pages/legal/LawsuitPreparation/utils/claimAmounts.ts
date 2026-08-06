import type { FinancialCalculations } from '../store/types';

type ClaimCalculationSource = Pick<
  FinancialCalculations,
  'total' | 'violationsFines'
>;

export interface LawsuitClaimAmounts {
  /** المبلغ النقدي الوارد في بند السداد، دون المخالفات المطلوب تحويلها. */
  cashClaimAmount: number;
  /** إجمالي قيمة الطلبات المسجلة في حقل قيمة المطالبات بنظام تقاضي. */
  taqadiClaimAmount: number;
}

export function getLawsuitClaimAmounts(
  calculations: ClaimCalculationSource,
): LawsuitClaimAmounts {
  const total = Math.max(0, Number(calculations.total || 0));
  const violationsFines = Math.max(0, Number(calculations.violationsFines || 0));
  const finalRequestedAmount = Math.max(0, total - violationsFines);

  return {
    cashClaimAmount: finalRequestedAmount,
    taqadiClaimAmount: finalRequestedAmount,
  };
}
