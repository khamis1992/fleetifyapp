export const LEGAL_CLAIM_SCOPES = [
  'full_outstanding',
  'traffic_violations_only',
] as const;

export type LegalClaimScope = (typeof LEGAL_CLAIM_SCOPES)[number];

export const TRAFFIC_ONLY_INVOICE_EXCLUSION_REASON =
  'نطاق المطالبة المعتمد هو المخالفات المرورية فقط';

export function normalizeLegalClaimScope(value: unknown): LegalClaimScope {
  return value === 'traffic_violations_only'
    ? 'traffic_violations_only'
    : 'full_outstanding';
}

export function isTrafficViolationsOnlyScope(value: unknown): boolean {
  return normalizeLegalClaimScope(value) === 'traffic_violations_only';
}
