import { describe, expect, it } from 'vitest';
import type { FormalNotice, LawsuitPreparationState, LitigationProfile } from '../../store/types';
import {
  calculateRetentionClaim,
  evaluateLegalCaseReadiness,
  evaluateLegalMemoReadiness,
  getCriminalComplaintEligibility,
  resolveDefendantContact,
  resolveLegalPath,
} from '../legalCaseWorkflow';

const profile = (overrides: Partial<LitigationProfile>): LitigationProfile => ({
  rescission_strategy: 'judicial_rescission',
  termination_type: 'judicial_rescission',
  termination_date: null,
  termination_date_status: 'requires_judicial_proof',
  termination_supporting_document_id: null,
  renewal_applies: false,
  renewed_end_date: null,
  vehicle_custody: 'unknown',
  retention_daily_rate: null,
  retention_rate_source: null,
  retention_rate_source_ref: null,
  retention_rate_source_document_id: null,
  ...overrides,
} as LitigationProfile);

const notice = (overrides: Partial<FormalNotice> = {}): FormalNotice => ({
  notice_type: 'termination_notice',
  sent_on: '2026-06-01',
  delivered_on: '2026-06-03',
  delivery_confirmed: true,
  proof_document_id: 'proof-1',
  grace_period_days: 7,
  ...overrides,
} as FormalNotice);

describe('legal case workflow', () => {
  it('uses the company-wide Doha Qatar address when no more specific address exists', () => {
    expect(resolveDefendantContact(profile({
      defendant_service_address: null,
    }), {
      email: 'info@gmail.com',
      address: null,
    } as LawsuitPreparationState['customer'])).toMatchObject({
      address: 'الدوحة قطر',
      source: 'customer_record',
    });
  });

  it('does not fall back to customer email when defendant email is unavailable', () => {
    const unavailable = profile({
      defendant_email_status: 'unavailable',
      defendant_email: null,
    });

    expect(resolveDefendantContact(unavailable, {
      email: 'khamis-1992@hotmail.com',
      address: 'الدوحة',
    } as LawsuitPreparationState['customer'])).toMatchObject({
      email: '',
      emailStatus: 'unavailable',
      address: 'الدوحة',
    });
  });

  it('uses a verified customer-record email without duplicating it in the profile', () => {
    const customerRecord = profile({
      defendant_email_status: 'verified',
      defendant_email: null,
      defendant_contact_source: 'customer_record',
    });

    expect(resolveDefendantContact(customerRecord, {
      email: 'info@gmail.com',
      address: 'الدوحة',
    } as LawsuitPreparationState['customer'])).toMatchObject({
      email: 'info@gmail.com',
      emailStatus: 'verified',
      source: 'customer_record',
    });
  });

  it('allows an unavailable defendant email as a memo reservation but blocks filing', () => {
    const state = {
      contract: null,
      customer: null,
      vehicle: null,
      litigationProfile: profile({
        defendant_email_status: 'unavailable',
        defendant_email: null,
      }),
      formalNotices: [],
      calculations: null,
      overdueInvoices: [],
      documents: { contract: {} },
      damageCosts: [],
      trafficViolations: [],
      violationEvidenceDocuments: [],
    } as unknown as LawsuitPreparationState;

    expect(evaluateLegalCaseReadiness(state).issues).toContain(
      'بريد المدعى عليه غير متوفر لدى الشركة؛ يلزم استكمال بريد حقيقي أو مراجعة الرفع يدوياً قبل الإرسال إلى تقاضي.',
    );
    expect(evaluateLegalMemoReadiness(state).issues).not.toContain(
      'بريد المدعى عليه غير متوفر لدى الشركة؛ يلزم استكمال بريد حقيقي أو مراجعة الرفع يدوياً قبل الإرسال إلى تقاضي.',
    );
    expect(evaluateLegalMemoReadiness(state).warnings).toContain(
      'بريد المدعى عليه موثق كغير متوفر؛ لا يمنع تثبيت المذكرة، لكنه يمنع الرفع الآلي إلى تقاضي.',
    );
  });
  it('uses natural expiry only when the elapsed end date is supported and confirmed', () => {
    const valid = resolveLegalPath(profile({
      rescission_strategy: 'natural_expiry',
      termination_type: 'contract_expired',
      termination_date: '2026-07-31',
      termination_date_status: 'confirmed',
      termination_supporting_document_id: 'contract-1',
    }), '2026-07-31', [], new Date('2026-08-26'));
    expect(valid.effectivePath).toBe('natural_expiry');

    const future = resolveLegalPath(profile({
      rescission_strategy: 'natural_expiry',
      termination_type: 'contract_expired',
      termination_date: '2026-12-31',
      termination_date_status: 'confirmed',
      termination_supporting_document_id: 'contract-1',
    }), '2026-12-31', [], new Date('2026-08-26'));
    expect(future.effectivePath).toBe('judicial_rescission');
  });

  it('falls back to judicial rescission unless the termination notice, clause and grace period are proven', () => {
    const base = profile({
      rescission_strategy: 'documented_termination',
      termination_type: 'documented_cancellation',
      termination_date: '2026-06-10',
      termination_date_status: 'confirmed',
      termination_supporting_document_id: 'termination-1',
      termination_clause_number: '12',
      termination_clause_text: 'ينفسخ العقد بعد انتهاء مهلة الإنذار.',
    });

    expect(resolveLegalPath(base, null, [notice({ proof_document_id: null })]).effectivePath)
      .toBe('judicial_rescission');
    expect(resolveLegalPath(base, null, [notice()]).effectivePath)
      .toBe('documented_termination');
  });

  it('calculates retention only after a documented end and from a documented market rate', () => {
    const path = resolveLegalPath(profile({
      rescission_strategy: 'natural_expiry',
      termination_type: 'contract_expired',
      termination_date: '2026-08-20',
      termination_date_status: 'confirmed',
      termination_supporting_document_id: 'contract-1',
    }), '2026-08-20', [], new Date('2026-08-26'));
    const result = calculateRetentionClaim(profile({
      vehicle_custody: 'with_defendant',
      retention_daily_rate: 100,
      retention_rate_source: 'market_quotes',
      retention_rate_source_ref: 'ثلاثة عروض مؤرخة',
      retention_rate_source_document_id: 'rates-1',
    }), path, new Date('2026-08-26'));

    expect(result.days).toBe(6);
    expect(result.amount).toBe(600);
    expect(calculateRetentionClaim(profile({ vehicle_custody: 'with_defendant' }), path).amount).toBe(0);
  });

  it('blocks a criminal complaint unless every exceptional evidence gate is satisfied', () => {
    const baseState = {
      contract: { vehicle_id: 'vehicle-1', end_date: '2026-08-20' },
      vehicle: { id: 'vehicle-1' },
      litigationProfile: profile({
        rescission_strategy: 'natural_expiry',
        termination_type: 'contract_expired',
        termination_date: '2026-08-20',
        termination_date_status: 'confirmed',
        termination_supporting_document_id: 'contract-1',
        delivery_handover_date: '2024-08-26',
        delivery_handover_document_id: 'handover-1',
        vehicle_custody: 'with_defendant',
        legal_review_status: 'approved',
      }),
      formalNotices: [notice({ notice_type: 'vehicle_return_demand' })],
    } as unknown as LawsuitPreparationState;

    expect(getCriminalComplaintEligibility(baseState, new Date('2026-08-26')).eligible).toBe(true);

    const incomplete = {
      ...baseState,
      litigationProfile: profile({ legal_review_status: 'draft' }),
      formalNotices: [],
    } as LawsuitPreparationState;
    const blocked = getCriminalComplaintEligibility(incomplete, new Date('2026-08-26'));
    expect(blocked.eligible).toBe(false);
    expect(blocked.reasons).toContain('الملف القانوني غير معتمد.');
    expect(blocked.reasons).toContain('لا توجد مطالبة موثقة الوصول برد المركبة.');
  });
});
