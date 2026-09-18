import { describe, expect, it } from 'vitest';
import { assertLegalReadinessClaim, legalReadinessClaimMismatch, legalReadinessFinancialBlocker, parseLegalReadinessFinancialContext } from '../legalReadinessFinancialContext';

const fixture = () => ({
  financial_context: {
    version: 'canonical_legal_readiness_v1', company_id: 'company', contract_id: 'contract', as_of_date: '2026-09-04',
    rent_requires_review: false, traffic_requires_review: false, rent_total: 1000,
    traffic_total: 0, traffic_claim_total: 0, traffic_proof_required: false,
    rent_review_reasons: [], traffic_review_reasons: [],
  },
  violation_proof_ready: false,
  invoices: [{ id: 'invoice', total_amount: 1500, paid_amount: 500, balance_due: 1000 }],
  violations: [{ id: 'violation', status: 'company_responsibility', liability_amount: 0, fine_amount: 500 }],
});
const parse = (data: unknown) => parseLegalReadinessFinancialContext(data, 'company', 'contract', '2026-09-04');

describe('canonical legal readiness financial boundary', () => {
  it('preserves a real zero even when a legacy fine_amount is positive', () => {
    const context = parse(fixture()); expect(context.traffic_total).toBe(0);
    expect(legalReadinessFinancialBlocker(context, 'full_outstanding')).toBeNull();
  });
  it('rejects the old readiness payload without canonical source metadata', () => {
    expect(() => parse({ invoices: [], violations: [] })).toThrow('مصدر');
  });
  for (const key of ['company_id', 'contract_id', 'as_of_date'] as const) it(`rejects stale/wrong ${key}`, () => {
    const data = fixture(); data.financial_context[key] = 'wrong'; expect(() => parse(data)).toThrow();
  });
  for (const invalid of [null, '', false, -1, NaN, Infinity, 1.001, '1000']) it(`rejects invalid certified rent ${String(invalid)}`, () => {
    const data = fixture(); Object.assign(data.financial_context, { rent_total: invalid }); expect(() => parse(data)).toThrow();
  });
  it('does not certify a total inconsistent with its invoice rows', () => {
    const data = fixture(); data.invoices[0].balance_due = 500; expect(() => parse(data)).toThrow();
  });
  it('rejects duplicate selectable invoices', () => {
    const data = fixture(); data.invoices.push(data.invoices[0]); data.financial_context.rent_total = 2000;
    expect(() => parse(data)).toThrow();
  });
  it('allows traffic-only scope when only rent needs review, without inventing a rental zero', () => {
    const data = fixture(); Object.assign(data.financial_context, { rent_total: null, rent_requires_review: true });
    const context = parse(data); expect(context.rent_total).toBeNull();
    expect(legalReadinessFinancialBlocker(context, 'full_outstanding')).toContain('مطابقة');
    expect(legalReadinessFinancialBlocker(context, 'traffic_violations_only')).toBeNull();
  });
  it('blocks traffic ambiguity for either scope', () => {
    const data = fixture(); Object.assign(data.financial_context, { traffic_total: null, traffic_claim_total: null, traffic_requires_review: true });
    Object.assign(data.violations[0], { status: 'review', liability_amount: null });
    const context = parse(data);
    expect(legalReadinessFinancialBlocker(context, 'traffic_violations_only')).toContain('متعارضة');
    expect(legalReadinessFinancialBlocker(context, 'full_outstanding')).toContain('متعارضة');
  });
  it('distinguishes a proof-pending claim from actual traffic liability', () => {
    const data = fixture(); Object.assign(data.financial_context, { traffic_total: 500, traffic_proof_required: true });
    Object.assign(data.violations[0], { status: 'included', liability_amount: 500 });
    expect(parse(data).traffic_claim_total).toBe(0);
    data.financial_context.traffic_claim_total = 500; expect(() => parse(data)).toThrow();
    data.violation_proof_ready = true; expect(parse(data).traffic_claim_total).toBe(500);
  });
  it('rejects review flags represented as strings', () => {
    const data = fixture(); Object.assign(data.financial_context, { rent_requires_review: 'false' }); expect(() => parse(data)).toThrow();
  });
  it('keeps missing source data blocked', () => {
    expect(legalReadinessFinancialBlocker(undefined, 'full_outstanding')).toContain('لم يكتمل');
  });
  it('detects independently fetched amounts that no longer agree', () => {
    const context = parse(fixture());
    expect(legalReadinessClaimMismatch(context, 'full_outstanding', { rent_due: 1000, traffic_violations: 0 }, 1000)).toBeNull();
    expect(legalReadinessClaimMismatch(context, 'full_outstanding', { rent_due: 1500, traffic_violations: 0 }, 1000)).toContain('تغيرت');
    expect(legalReadinessClaimMismatch(context, 'full_outstanding', { rent_due: 1000, traffic_violations: 500 }, 1000)).toContain('تغيرت');
    expect(legalReadinessClaimMismatch(context, 'traffic_violations_only', { rent_due: 0, traffic_violations: 0 }, 1000)).toBeNull();
  });
  it('rejects malformed claim payloads before the component renders their nested fields', () => {
    expect(() => assertLegalReadinessClaim({ total: 0 }, 'full_outstanding', '2026-09-04')).toThrow();
    expect(() => assertLegalReadinessClaim(null, 'full_outstanding', '2026-09-04')).toThrow();
  });
  it('accepts the full validated v4 display shape and rejects stale or incomplete variants', () => {
    const claim = { version: 'v4', claim_scope: 'full_outstanding', as_of_date: '2026-09-04', cutoff_date: '2026-09-01',
      total: 1000, violation_count: 0, violations_proof_ready: false,
      components: { rent_due: 1000, traffic_violations: 0, legal_extension_rent: 0, contractual_compensation: 0,
        damages: 0, retention: 0, security_deposit_deduction: 0 },
      excluded_amounts: { manual_invoice_exclusions: 0, future_rent: 0, penalty_linked_invoices: 0, non_rent_invoices: 0, legacy_late_fine: 0 } };
    expect(() => assertLegalReadinessClaim(claim, 'full_outstanding', '2026-09-04')).not.toThrow();
    expect(() => assertLegalReadinessClaim(claim, 'traffic_violations_only', '2026-09-04')).toThrow();
    expect(() => assertLegalReadinessClaim(claim, 'full_outstanding', '2026-09-05')).toThrow();
    expect(() => assertLegalReadinessClaim({ ...claim, components: { rent_due: 1000 } }, 'full_outstanding', '2026-09-04')).toThrow();
  });
});
