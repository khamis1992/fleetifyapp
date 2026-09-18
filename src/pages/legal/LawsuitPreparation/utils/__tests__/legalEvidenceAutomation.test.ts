import { describe, expect, it } from 'vitest';
import type { LawsuitPreparationState } from '../../store/types';
import {
  AUTO_ACCEPT_CONFIDENCE,
  buildLegalEvidenceAnalysis,
  inferEvidenceDocumentType,
  selectAutoAcceptable,
  selectStrongestSignedContract,
} from '../legalEvidenceAutomation';

function makeState(overrides: Partial<LawsuitPreparationState> = {}): LawsuitPreparationState {
  return {
    contract: {
      id: 'contract-1',
      contract_number: 'LTO2024284',
      start_date: '2024-08-26',
      end_date: '2027-08-26',
      monthly_amount: 1500,
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      license_plate: '7069',
      status: 'active',
    },
    customer: {
      id: 'customer-1',
      first_name: 'عصام',
      first_name_ar: null,
      last_name: 'المزوغي',
      last_name_ar: null,
      customer_type: 'individual',
      company_name: null,
      company_name_ar: null,
      national_id: '28078801264',
      nationality: 'تونس',
      phone: '74700503',
      email: 'info@gmail.com',
      address: 'الدوحة، قطر',
      country: 'قطر',
    },
    litigationProfile: {
      defendant_email_status: 'unavailable',
      defendant_contact_source: null,
      defendant_email: null,
      defendant_service_address: null,
      rent_due_day: null,
      termination_supporting_document_id: null,
      rescission_strategy: 'judicial_rescission',
      renewal_applies: false,
      vehicle_custody: 'unknown',
      retention_daily_rate: null,
      delivery_handover_date: null,
      delivery_handover_document_id: null,
    } as LawsuitPreparationState['litigationProfile'],
    contractEvidenceDocuments: [{
      id: 'document-1',
      document_name: '7069 - LTO2024284.pdf',
      document_type: 'signed_contract',
      file_path: 'contracts/document.pdf',
      mime_type: 'application/pdf',
      legal_identity_match_status: 'matched',
    }],
    paymentReminders: { count: 2, lastSentDate: '2026-08-20', sendMethods: ['phone'] },
    formalNotices: [],
    trafficViolations: [],
    violationEvidenceDocuments: [],
    evidenceProposals: [],
    ...overrides,
  } as unknown as LawsuitPreparationState;
}

describe('legalEvidenceAutomation', () => {
  it('replaces a stale unavailable email state with the canonical customer email source', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState(),
      { vehicleReturn: null, vehiclePricing: null },
      '2026-08-26',
    );
    const email = analysis.automatic.find((item) => item.fieldKey === 'defendant_email');
    expect(email?.patch).toMatchObject({
      defendant_email_status: 'verified',
      defendant_contact_source: 'customer_record',
    });
    expect(email?.valueLabel).toBe('info@gmail.com');
  });

  it('proposes Doha Qatar automatically when the customer has no detailed address', () => {
    const state = makeState({
      customer: {
        ...makeState().customer!,
        address: null,
      },
    });
    const analysis = buildLegalEvidenceAnalysis(
      state,
      { vehicleReturn: null, vehiclePricing: null },
      '2026-08-26',
    );
    const address = analysis.automatic.find(
      (item) => item.fieldKey === 'defendant_service_address',
    );

    expect(address?.valueLabel).toBe('الدوحة قطر');
    expect(address?.patch).toMatchObject({
      defendant_service_address: 'الدوحة قطر',
      defendant_contact_source: 'customer_record',
    });
    expect(analysis.missing).not.toContain('عنوان تبليغ في سجل العميل أو مستند رسمي');
  });

  it('links the strongest signed contract and never proposes natural expiry before the end date', () => {
    const state = makeState();
    const analysis = buildLegalEvidenceAnalysis(
      state,
      { vehicleReturn: null, vehiclePricing: null },
      '2026-08-26',
    );
    expect(selectStrongestSignedContract(state.contractEvidenceDocuments)?.id).toBe('document-1');
    expect(analysis.automatic.find((item) => item.fieldKey === 'signed_contract')?.patch)
      .toEqual({ termination_supporting_document_id: 'document-1' });
    expect(analysis.review.some((item) => item.fieldKey === 'legal_path_natural_expiry')).toBe(false);
  });

  it('does not use an unverified signed copy as automatic legal evidence', () => {
    const state = makeState({
      contractEvidenceDocuments: [{
        ...makeState().contractEvidenceDocuments[0],
        legal_identity_match_status: 'unverified',
      }],
    });
    const analysis = buildLegalEvidenceAnalysis(
      state,
      { vehicleReturn: null, vehiclePricing: null, contractTemplate: null },
      '2026-08-26',
    );

    expect(selectStrongestSignedContract(state.contractEvidenceDocuments)).toBeNull();
    expect(analysis.automatic.some((item) => item.fieldKey === 'signed_contract')).toBe(false);
    expect(analysis.missing).toContain('نسخة عقد موقعة مرتبطة بالعقد');
  });

  it('keeps reminders and phone contact out of formal notices', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState(),
      { vehicleReturn: null, vehiclePricing: null },
      '2026-08-26',
    );
    expect(analysis.missing).toContain('إنذار رسمي مثبت الوصول؛ تذكيرات النظام والاتصال الهاتفي لا يكفيان');
  });

  it('creates a human-review proposal for an approved vehicle return', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState({
        contractEvidenceDocuments: [
          ...makeState().contractEvidenceDocuments,
          {
            id: 'return-document-1',
            document_name: 'محضر رد المركبة.pdf',
            document_type: 'return_report',
            file_path: 'contracts/return.pdf',
            mime_type: 'application/pdf',
          },
        ],
      }),
      {
        vehicleReturn: { id: 'return-1', return_date: '2026-08-01', status: 'approved', notes: null },
        vehiclePricing: null,
      },
      '2026-08-26',
    );
    const proposal = analysis.review.find((item) => item.fieldKey === 'vehicle_return');
    expect(proposal?.patch).toMatchObject({
      vehicle_custody: 'returned',
      vehicle_returned_at: '2026-08-01',
      vehicle_return_document_id: 'return-document-1',
    });
    expect(proposal?.level).toBe('review');
  });

  it('does not offer an applicable return proposal without a linked return report', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState(),
      {
        vehicleReturn: { id: 'return-1', return_date: '2026-08-01', status: 'approved', notes: null },
        vehiclePricing: null,
      },
      '2026-08-26',
    );
    expect(analysis.review.some((item) => item.fieldKey === 'vehicle_return')).toBe(false);
    expect(analysis.missing).toContain('محضر رد أو استرداد لربطه بسجل رد المركبة الموجود');
  });

  it('classifies common evidence filenames automatically', () => {
    expect(inferEvidenceDocumentType('محضر رد المركبة.pdf')).toBe('return_report');
    expect(inferEvidenceDocumentType('فاتورة سحب 7069.pdf')).toBe('damage_evidence');
    expect(inferEvidenceDocumentType('إنذار ووصول.pdf')).toBe('formal_notice_proof');
  });

  it('prefers the contract security deposit over vehicle pricing and marks it auto-acceptable with a signed contract', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState({
        contract: {
          ...makeState().contract!,
          security_deposit: 3000,
        },
      }),
      {
        vehicleReturn: null,
        vehiclePricing: { id: 'pricing-1', daily_rate: 150, security_deposit: 2500, effective_from: null },
      },
      '2026-08-26',
    );
    const deposit = analysis.review.find((item) => item.fieldKey === 'security_deposit');
    expect(deposit?.patch).toEqual({ security_deposit_amount: 3000 });
    expect(deposit?.sourceKind).toBe('contract_record');
    expect(deposit?.confidence).toBeGreaterThanOrEqual(AUTO_ACCEPT_CONFIDENCE);
    expect(deposit?.sourceDocumentId).toBe('document-1');
    expect(selectAutoAcceptable(analysis.review).some((item) => item.fieldKey === 'security_deposit')).toBe(true);
  });

  it('keeps vehicle-pricing deposit as human review when the contract has no deposit clause', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState(),
      {
        vehicleReturn: null,
        vehiclePricing: { id: 'pricing-1', daily_rate: 150, security_deposit: 2500, effective_from: null },
      },
      '2026-08-26',
    );
    const deposit = analysis.review.find((item) => item.fieldKey === 'security_deposit');
    expect(deposit?.patch).toEqual({ security_deposit_amount: 2500 });
    expect(deposit?.confidence).toBeLessThan(AUTO_ACCEPT_CONFIDENCE);
    expect(selectAutoAcceptable(analysis.review).some((item) => item.fieldKey === 'security_deposit')).toBe(false);
  });

  it('auto-accepts only high-confidence proposals with a backing document', () => {
    const candidates = [
      { fieldKey: 'a', confidence: 0.95, sourceDocumentId: 'doc-1', level: 'review', patch: {}, label: '', valueLabel: '', sourceKind: '', sourceRef: '', sourceLabel: '', reason: '' },
      { fieldKey: 'b', confidence: 0.95, sourceDocumentId: null, level: 'review', patch: {}, label: '', valueLabel: '', sourceKind: '', sourceRef: '', sourceLabel: '', reason: '' },
      { fieldKey: 'c', confidence: 0.85, sourceDocumentId: 'doc-2', level: 'review', patch: {}, label: '', valueLabel: '', sourceKind: '', sourceRef: '', sourceLabel: '', reason: '' },
    ];
    expect(selectAutoAcceptable(candidates).map((item) => item.fieldKey)).toEqual(['a']);
  });

  it('accepts custody proposals from the system fleet record without a document', () => {
    const candidates = [
      { fieldKey: 'vehicle_custody', confidence: 0.9, sourceDocumentId: null, sourceKind: 'vehicle_status', level: 'review', patch: {}, label: '', valueLabel: '', sourceRef: '', sourceLabel: '', reason: '' },
    ];
    expect(selectAutoAcceptable(candidates)).toHaveLength(1);
  });

  it('proposes delivery handover automatically from an uploaded handover report', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState({
        contractEvidenceDocuments: [
          ...makeState().contractEvidenceDocuments,
          {
            id: 'handover-1',
            document_name: 'محضر تسليم المركبة.pdf',
            document_type: 'handover_report',
            file_path: 'contracts/handover.pdf',
            mime_type: 'application/pdf',
          },
        ],
      }),
      { vehicleReturn: null, vehiclePricing: null, contractTemplate: null },
      '2026-08-26',
    );
    const handover = analysis.review.find((item) => item.fieldKey === 'delivery_handover');
    expect(handover?.patch).toMatchObject({
      delivery_handover_document_id: 'handover-1',
      delivery_handover_date: '2024-08-26',
    });
    expect(handover?.confidence).toBeGreaterThanOrEqual(AUTO_ACCEPT_CONFIDENCE);
    expect(analysis.missing).not.toContain('محضر تسليم المركبة وتاريخه');
  });

  it('proposes custody from the fleet status when the vehicle is still rented and unreturned', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState({ vehicle: { make: 'Toyota', model: 'Camry', year: 2023, plate_number: '7069', color: null, vin: null, status: 'rented' } }),
      { vehicleReturn: null, vehiclePricing: null, contractTemplate: null },
      '2026-08-26',
    );
    const custody = analysis.review.find((item) => item.fieldKey === 'vehicle_custody');
    expect(custody?.patch).toEqual({ vehicle_custody: 'with_defendant' });
    expect(custody?.confidence).toBeGreaterThanOrEqual(AUTO_ACCEPT_CONFIDENCE);
    expect(selectAutoAcceptable(analysis.review).map((item) => item.fieldKey)).toContain('vehicle_custody');
  });

  it('switches the legal path automatically when a documented termination notice has lapsed', () => {
    const analysis = buildLegalEvidenceAnalysis(
      makeState({
        formalNotices: [{
          id: 'notice-1',
          company_id: 'company-1',
          contract_id: 'contract-1',
          case_id: null,
          notice_type: 'termination_notice',
          sent_on: '2026-08-01',
          delivery_method: 'national_address',
          delivered_on: '2026-08-05',
          delivery_confirmed: true,
          grace_period_days: 7,
          proof_document_id: 'doc-termination',
          notes: null,
        }],
      }),
      { vehicleReturn: null, vehiclePricing: null, contractTemplate: null },
      '2026-08-26',
    );
    const path = analysis.review.find((item) => item.fieldKey === 'legal_path_documented_termination');
    expect(path?.patch).toMatchObject({
      rescission_strategy: 'documented_termination',
      termination_type: 'documented_cancellation',
      termination_date: '2026-08-12',
      termination_date_source: 'official_document',
      termination_date_status: 'confirmed',
      termination_supporting_document_id: 'doc-termination',
    });
    expect(path?.confidence).toBeGreaterThanOrEqual(AUTO_ACCEPT_CONFIDENCE);
    expect(path?.sourceDocumentId).toBe('doc-termination');
  });
});
