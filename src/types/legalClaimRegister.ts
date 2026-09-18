/** A court request is not a posted receivable. Alternatives never inflate the primary total. */
export type ClaimDisposition = "primary" | "alternative" | "subsidiary";
export type AdditionalClaimKind =
  | "rental_opportunity"
  | "reputation_material"
  | "reputation_reserve"
  | "independent_damage";
export interface LegalClaimItem {
  id: string;
  company_id: string;
  contract_id: string;
  case_id: string | null;
  kind: AdditionalClaimKind;
  disposition: ClaimDisposition;
  description: string;
  period_from: string | null;
  period_to: string | null;
  requested_amount: number | null;
  avoided_costs: number;
  third_party_recovery: number;
  evidence_ids: string[];
  calculation_basis: string;
  causation_notes: string;
  alternative_to: string | null;
  independence_notes: string;
  opportunity_reference: string;
  opportunity_requested_on: string | null;
  opportunity_probability: string;
  alternative_unavailable_reason: string;
  overlap_group: string;
  recovery_reference: string;
  review_status: "draft" | "reviewed" | "excluded";
  exclusion_reason: string;
  updated_at: string;
}
export interface ClaimRegisterRow {
  key: string;
  kind: string;
  label: string;
  description: string;
  disposition: ClaimDisposition;
  status: "ready" | "incomplete" | "excluded";
  amount: number | null;
  gross_amount?: number | null;
  deductions?: number | null;
  period_from: string | null;
  period_to: string | null;
  basis: string;
  evidence_ids: string[];
  alternative_to?: string | null;
  issues: string[];
  custom?: boolean;
}
export interface LegalClaimRegister {
  version: "claim_register_v1";
  as_of_date: string;
  rows: ClaimRegisterRow[];
  primary_total: number;
  additional_primary: number;
  issues: string[];
  retention_basis?: "documented_daily" | "contract_monthly";
  retention_monthly_rate?: number;
  retention_proration?: "calendar_days" | "thirty_days";
}
export const CLAIM_KIND_LABELS: Record<AdditionalClaimKind, string> = {
  rental_opportunity: "فرصة تأجير محددة",
  reputation_material: "الأثر المادي للمساس بالسمعة التجارية",
  reputation_reserve: "طلب احتياطي بشأن الاعتبار التجاري",
  independent_damage: "ضرر مادي مستقل",
};
export const CLAIM_DISPOSITION_LABELS: Record<ClaimDisposition, string> = {
  primary: "طلب أصلي",
  alternative: "طلب بديل",
  subsidiary: "طلب احتياطي",
};
export const additionalPrimaryAmount = (
  register?: LegalClaimRegister
): number => Number(register?.additional_primary || 0);

/** Amount comes from the canonical register, never added again by a renderer. */
export const fixedCompensationRow = (register?: LegalClaimRegister) =>
  register?.rows.find(
    (row) => row.key === 'fixed_general_compensation' && row.status === 'ready',
  );
