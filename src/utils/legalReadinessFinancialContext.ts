import type { LegalClaimScope } from '@/types/legalClaimScope';

export type LegalReadinessFinancialContext = {
  version: 'canonical_legal_readiness_v1';
  company_id: string;
  contract_id: string;
  as_of_date: string;
  rent_requires_review: boolean;
  traffic_requires_review: boolean;
  rent_total: number | null;
  traffic_total: number | null;
  traffic_claim_total: number | null;
  traffic_proof_required: boolean;
  rent_review_reasons: string[];
  traffic_review_reasons: string[];
};

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
const money = (value: unknown): value is number => typeof value === 'number'
  && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100
  && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
const reasons = (value: unknown): value is string[] => Array.isArray(value)
  && value.every(item => typeof item === 'string');
const fail = (): never => { throw new Error('تعذر تأكيد مصدر بيانات الجاهزية المالية؛ حدّث البيانات وتحقق من نشر تحديث الجاهزية.'); };

/** Reject old/malformed payloads instead of deriving a zero/ready state from them. */
export function parseLegalReadinessFinancialContext(
  payload: unknown, companyId: string, contractId: string, asOfDate: string,
): LegalReadinessFinancialContext {
  const data = record(payload);
  const context = record(data.financial_context);
  if (context.version !== 'canonical_legal_readiness_v1'
    || context.company_id !== companyId || context.contract_id !== contractId
    || context.as_of_date !== asOfDate
    || typeof context.rent_requires_review !== 'boolean'
    || typeof context.traffic_requires_review !== 'boolean'
    || typeof context.traffic_proof_required !== 'boolean'
    || typeof data.violation_proof_ready !== 'boolean'
    || !reasons(context.rent_review_reasons) || !reasons(context.traffic_review_reasons)
    || !Array.isArray(data.invoices) || !Array.isArray(data.violations)) return fail();

  for (const [requiresReview, value] of [
    [context.rent_requires_review, context.rent_total],
    [context.traffic_requires_review, context.traffic_total],
    [context.traffic_requires_review, context.traffic_claim_total],
  ]) {
    if (requiresReview ? value !== null : !money(value)) return fail();
  }
  const invoices = data.invoices.map(record);
  const violations = data.violations.map(record);
  if (invoices.some(row => typeof row.id !== 'string' || !money(row.balance_due)
    || !money(row.total_amount) || !money(row.paid_amount))
    || new Set(invoices.map(row => row.id)).size !== invoices.length
    || violations.some(row => typeof row.id !== 'string'
      || (row.status === 'review' ? row.liability_amount !== null : !money(row.liability_amount)))) return fail();
  const sum = (values: unknown[]) => values.reduce<number>((total, value) => total + Math.round((value as number) * 100), 0);
  if (!context.rent_requires_review && sum(invoices.map(row => row.balance_due)) !== Math.round((context.rent_total as number) * 100)) return fail();
  if (!context.traffic_requires_review && (violations.some(row => row.status === 'review')
    || sum(violations.map(row => row.liability_amount)) !== Math.round((context.traffic_total as number) * 100)
    || (context.traffic_claim_total as number) > (context.traffic_total as number)
    || context.traffic_proof_required !== ((context.traffic_total as number) > 0)
    || context.traffic_claim_total !== (data.violation_proof_ready ? context.traffic_total : 0))) return fail();
  return context as LegalReadinessFinancialContext;
}

export function legalReadinessFinancialBlocker(
  context: LegalReadinessFinancialContext | undefined, scope: LegalClaimScope,
): string | null {
  if (!context) return 'لم يكتمل التحقق من مصدر البيانات المالية.';
  if (context.traffic_requires_review) return 'توجد مخالفات متعارضة أو دفعات تحتاج مطابقة؛ لا يمكن اعتماد مبلغ المطالبة الآن.';
  if (scope !== 'traffic_violations_only' && context.rent_requires_review) return 'توجد فواتير أو أقساط تحتاج مطابقة؛ الرصيد غير مؤكد حتى تتم المطابقة.';
  return null;
}

export function assertLegalReadinessClaim(payload: unknown, scope: LegalClaimScope, asOfDate: string): void {
  const claim = record(payload);
  const components = record(claim.components);
  const excluded = record(claim.excluded_amounts);
  if (claim.version !== 'v4' || claim.claim_scope !== scope || claim.as_of_date !== asOfDate
    || typeof claim.cutoff_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(claim.cutoff_date)
    || !money(claim.total) || !Number.isSafeInteger(claim.violation_count) || (claim.violation_count as number) < 0
    || typeof claim.violations_proof_ready !== 'boolean'
    || ['rent_due', 'legal_extension_rent', 'contractual_compensation', 'damages', 'traffic_violations', 'retention', 'security_deposit_deduction']
      .some(key => !money(components[key]))
    || ['manual_invoice_exclusions', 'future_rent', 'penalty_linked_invoices', 'non_rent_invoices', 'legacy_late_fine']
      .some(key => !money(excluded[key]))) throw new Error('تعذر التحقق من نتيجة حساب المطالبة؛ أعد فحص البيانات قبل التحويل.');
}

export function legalReadinessClaimMismatch(
  context: LegalReadinessFinancialContext | undefined, scope: LegalClaimScope,
  components: { rent_due: number; traffic_violations: number } | undefined,
  includedRent: number | null,
): string | null {
  if (!context || !components) return null;
  const expectedRent = scope === 'traffic_violations_only' ? 0 : includedRent;
  if ((expectedRent !== null && Math.round(components.rent_due * 100) !== Math.round(expectedRent * 100))
    || (context.traffic_claim_total !== null
      && Math.round(components.traffic_violations * 100) !== Math.round(context.traffic_claim_total * 100))) {
    return 'تغيرت الأرقام بين فحص الجاهزية وحساب المطالبة؛ أعد فحصهما قبل التحويل.';
  }
  return null;
}

/** A transport success is not an approved readiness result. */
export function assertLegalReadinessCompletion(
  payload: unknown, reviewedClaim: unknown, scope: LegalClaimScope, asOfDate: string,
): void {
  const result = record(payload);
  if (result.ready !== true || result.blocked === true || !money(result.claim_amount)) {
    throw new Error('لم يؤكد الخادم اكتمال الجاهزية؛ لم يتم تحويل العقد. أعد فحص البيانات.');
  }
  assertLegalReadinessClaim(result.claim_statement, scope, asOfDate);
  assertLegalReadinessClaim(reviewedClaim, scope, asOfDate);
  const saved = record(result.claim_statement);
  const reviewed = record(reviewedClaim);
  const components = record(saved.components);
  const reviewedComponents = record(reviewed.components);
  if (result.claim_amount !== saved.total || saved.total !== reviewed.total
    || saved.cutoff_date !== reviewed.cutoff_date || saved.violation_count !== reviewed.violation_count
    || Object.keys(components).some(key => components[key] !== reviewedComponents[key])) {
    throw new Error('تغيرت المطالبة أثناء الاعتماد؛ أعد مراجعة المبالغ الحالية قبل التحويل.');
  }
}
