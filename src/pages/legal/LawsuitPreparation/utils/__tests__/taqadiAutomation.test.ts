import { describe, expect, it } from 'vitest';
import {
  buildTaqadiFilingPayload,
  isSafeLegacyReviewMismatchRetry,
  isSafePartyIdentityTypeRetry,
  type TaqadiFilingJob,
  type TaqadiFilingJobEvent,
} from '../taqadiAutomation';
import type { LawsuitPreparationState } from '../../store';

const readyDocument = (id: string, name: string, htmlContent: string | null = null) => ({
  id,
  name,
  description: name,
  type: 'mandatory' as const,
  category: 'generated' as const,
  status: 'ready' as const,
  url: htmlContent ? `blob:${id}` : `https://example.com/${id}.pdf`,
  htmlContent,
  error: null,
  generatedAt: '2026-07-28T00:00:00.000Z',
});

function createState(withViolations = false): LawsuitPreparationState {
  return {
    companyId: 'company-1',
    contractId: 'contract-1',
    contract: {
      id: 'contract-1',
      contract_number: 'C-100',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      monthly_amount: 1500,
      customer_id: 'customer-1',
      vehicle_id: 'vehicle-1',
      license_plate: '12345',
    },
    litigationProfile: {

      defendant_email_status: 'verified',

      defendant_email: null,

      defendant_contact_source: 'customer_record',

    } as LawsuitPreparationState['litigationProfile'],

    customer: {

      email: 'customer@example.com',

    } as LawsuitPreparationState['customer'],
    vehicle: {
      make: 'Bestune',
      model: 'T77',
      year: 2023,
      plate_number: '12345',
      color: null,
      vin: null,
    },
    overdueInvoices: [],
    trafficViolations: withViolations
      ? [{
          id: 'violation-1',
          violation_number: 'V-1',
          violation_date: '2026-06-01',
          violation_type: 'speed',
          location: null,
          fine_amount: 500,
          total_amount: 500,
          status: 'pending',
        }]
      : [],
    violationEvidenceDocuments: withViolations
      ? [{
          id: 'proof-1',
          name: 'تقرير وزارة الداخلية',
          url: 'https://example.com/moi.pdf',
          mimeType: 'application/pdf',
        }]
      : [],
    companyDocuments: [],

    memoSnapshots: [{
      id: 'memo-snapshot-1',
      readiness_status: 'ready',
      payload: {},
    }] as LawsuitPreparationState['memoSnapshots'],
    calculations: {
      overdueRent: 3000,
      lateFees: 0,
      damagesFee: 0,
      violationsFines: withViolations ? 500 : 0,
      violationsCount: withViolations ? 1 : 0,
      total: withViolations ? 3500 : 3000,
      invoiceLateFees: [],
      overdueInvoicesCount: 2,
      totalDaysOverdue: 60,
      avgDaysOverdue: 30,
      amountInWords: 'ثلاثة آلاف ريال قطري',
    },
    taqadiData: {
      caseTitle: 'مطالبة مالية',
      facts: 'وقائع الدعوى',
      claims: 'طلبات الدعوى',
      amount: 3000,
      amountInWords: 'ثلاثة آلاف ريال قطري',
      defendant: {
        fullName: 'عميل تجريبي',
        firstName: 'عميل',
        middleName: null,
        lastName: 'تجريبي',
        idNumber: '123456789',
        idType: 'بطاقة شخصية',
        nationality: 'تونسي',
        phone: '55555555',
        email: 'customer@example.com',
        address: 'عنوان العميل المسجل',
      },
      contract: {
        contractNumber: 'C-100',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        monthlyAmount: 1500,
      },
      vehicle: {
        make: 'Bestune',
        model: 'T77',
        year: 2023,
        plateNumber: '12345',
        color: null,
        vin: null,
        fullDescription: 'Bestune T77 2023',
      },
    },
    documents: {
      memo: readyDocument('memo', 'المذكرة', '<html>memo</html>'),
      claims: readyDocument('claims', 'كشف المطالبات', '<html>claims</html>'),
      docsList: readyDocument('docsList', 'كشف المستندات', '<html>list</html>'),
      violations: readyDocument('violations', 'كشف المخالفات', '<html>violations</html>'),
      violationsEvidence: readyDocument('violationsEvidence', 'تقرير وزارة الداخلية'),
      criminalComplaint: readyDocument('criminalComplaint', 'بلاغ'),
      violationsTransfer: readyDocument('violationsTransfer', 'طلب تحويل'),
      contract: {
        ...readyDocument('contract', 'العقد'),
        identityVerification: {
          status: 'matched',
          expectedName: 'عميل تجريبي',
          extractedName: 'عميل تجريبي',
          expectedId: '123456789',
          extractedId: '123456789',
          reason: 'matched',
          checkedAt: '2026-08-10T00:00:00.000Z',
        },
      },
      commercialRegister: readyDocument('commercialRegister', 'السجل التجاري'),
      ibanCertificate: readyDocument('ibanCertificate', 'شهادة IBAN'),
      representativeId: readyDocument('representativeId', 'هوية المفوض'),
    },
    ui: {
      isLoading: false,
      isGeneratingAll: false,
      isRegistering: false,
      isDownloadingZip: false,
      isDownloadingInvoices: false,
      isSendingToLawsuitData: false,
      isTaqadiAutomating: false,
      isMarkingCaseOpened: false,
      showTaqadiData: false,
      taqadiServerRunning: false,
      taqadiAutomationStatus: '',
      copiedField: null,
      progress: { total: 3, ready: 3, percentage: 100 },
      includeCriminalComplaint: false,
      includeViolationsTransfer: false,
    },
  };
}

describe('buildTaqadiFilingPayload', () => {

  it('never substitutes the claimant email when the defendant email is unavailable', () => {

    const state = createState();

    const existingProfile = state.litigationProfile;
    const taqadiData = state.taqadiData;
    if (!existingProfile || !taqadiData) throw new Error('test state is incomplete');

    state.litigationProfile = {

      ...existingProfile,

      defendant_email_status: 'unavailable',

      defendant_email: null,

    };

    taqadiData.defendant.email = 'khamis-1992@hotmail.com';

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))

      .toThrow(/لا يجوز استخدام بريد المدعية/);

  });
  it('blocks filing when the signed contract file is missing before identity checks', () => {
    const state = createState();
    state.documents.contract.status = 'missing';
    state.documents.contract.url = null;
    state.documents.contract.identityVerification = undefined;

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))
      .toThrow(/مستندات الدعوى غير مكتملة/);
  });

  it('blocks filing when the signed contract belongs to another defendant', () => {
    const state = createState();
    state.documents.contract.identityVerification = {
      status: 'mismatch',
      expectedName: 'أحمد الشيخ الصديق هاشم الوسيلة',
      extractedName: 'محمد الشيخ الصديق هاشم الوسيلة',
      expectedId: null,
      extractedId: null,
      reason: 'different first name',
      checkedAt: '2026-08-10T00:00:00.000Z',
    };

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))
      .toThrow('محمد الشيخ الصديق هاشم الوسيلة');
  });

  it('creates the fixed court classification and party order', () => {
    const payload = buildTaqadiFilingPayload(createState(), 'https://app.test/prepare');

    expect(payload.classification).toEqual({
      litigationDegree: 'ابتدائي',
      caseType: 'عقود الخدمات التجارية',
      caseSubtype: 'عقود إيجار السيارات وخدمات الليموزين',
      applicability: 'لا ينطبق',
    });
    expect(payload.plaintiff.partyOrder).toBe(1);
    expect(payload.representative.partyOrder).toBe(1);
    expect(payload.defendant.email).toBe('customer@example.com');
    expect(payload.defendant.address).toBe('عنوان العميل المسجل');
    expect(payload.finalApproval).toBe(true);
    expect(payload.memoSnapshotId).toBe('memo-snapshot-1');
  });

  it('rejects missing defendant service contact details', () => {

    const state = createState();

    if (!state.taqadiData) throw new Error('Expected Taqadi data');

    state.taqadiData.defendant.address = null;

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))

      .toThrow('عنوان تبليغ المدعى عليه مطلوب');

    state.taqadiData.defendant.address = 'عنوان مثبت';

    state.taqadiData.defendant.email = null;

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))

      .toThrow('البريد الإلكتروني للمدعى عليه مطلوب');

  });



  it('rejects a vehicle represented only by free-text plate data', () => {

    const state = createState();

    if (!state.contract) throw new Error('Expected contract');

    state.contract.vehicle_id = null;

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))

      .toThrow('يجب ربط العقد بسجل مركبة صحيح');

  });



  it('includes both violation documents when violations exist', () => {
    const payload = buildTaqadiFilingPayload(
      createState(true),
      'https://app.test/prepare',
    );

    expect(payload.documents.some((document) => document.key === 'violations')).toBe(true);
    expect(payload.documents.some((document) => document.key === 'violationsEvidence')).toBe(true);
  });

  it('derives the Taqadi claim value from the total final requests', () => {
    const state = createState(true);
    if (!state.taqadiData) throw new Error('Expected Taqadi data');
    state.taqadiData.amount = 99_999;

    const payload = buildTaqadiFilingPayload(
      state,
      'https://app.test/prepare',
    );

    expect(payload.case.amount).toBe(3500);
    expect(payload.case.amountInWords).not.toBe('99,999');
  });

  it('rejects an incomplete filing package', () => {
    const state = createState();
    state.documents.contract.status = 'missing';
    state.documents.contract.url = null;

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))
      .toThrow('مستندات الدعوى غير مكتملة');
  });

  it('rejects a defendant name containing English fields', () => {
    const state = createState();
    if (!state.taqadiData) throw new Error('Expected Taqadi data');
    state.taqadiData.defendant = {
      ...state.taqadiData.defendant,
      fullName: 'ATEF MANSOUR NAT EGYPT',
      firstName: 'ATEF',
      middleName: 'MANSOUR NAT',
      lastName: 'EGYPT',
    };

    expect(() => buildTaqadiFilingPayload(state, 'https://app.test/prepare'))
      .toThrow('اسم المدعى عليه يجب أن يكون مسجلًا بالعربية');
  });

  it('accepts a two-part Arabic defendant name', () => {
    const state = createState();
    if (!state.taqadiData) throw new Error('Expected Taqadi data');
    state.taqadiData.defendant = {
      ...state.taqadiData.defendant,
      fullName: 'عاطف منصور',
      firstName: 'عاطف',
      middleName: null,
      lastName: 'منصور',
    };

    const payload = buildTaqadiFilingPayload(state, 'https://app.test/prepare');

    expect(payload.defendant.fullName).toBe('عاطف منصور');
    expect(payload.defendant.firstName).toBe('عاطف');
    expect(payload.defendant.lastName).toBe('منصور');
  });
});

describe('isSafeLegacyReviewMismatchRetry', () => {
  const job: TaqadiFilingJob = {
    id: 'job-1',
    company_id: 'company-1',
    legal_case_id: 'case-1',
    contract_id: 'contract-1',
    status: 'needs_human',
    current_step: 'review_mismatch',
    progress: 90,
    result: null,
    error_code: 'REVIEW_MISMATCH',
    error_message: 'بيانات شاشة المراجعة لا تطابق حزمة الدعوى',
    attempt_count: 1,
    max_attempts: 3,
    locked_by: null,
    heartbeat_at: null,
    created_at: '2026-08-06T22:00:00.000Z',
    updated_at: '2026-08-06T22:02:00.000Z',
    completed_at: null,
  };
  const event: TaqadiFilingJobEvent = {
    id: 1,
    job_id: job.id,
    event_type: 'needs_human',
    step: 'review_mismatch',
    status: 'needs_human',
    message: job.error_message,
    details: {
      missing: ['مطالبة مالية-إيجار سيارة-محمد سرالختم', 'C-ALF-0039'],
      portalStage: 'review',
      portalConfidence: 'high',
      requiredActions: [],
      validationMessages: [],
      claimAmountMatches: true,
    },
    created_at: '2026-08-06T22:02:00.000Z',
  };
  const expected = {
    caseTitle: 'مطالبة مالية-إيجار سيارة-محمد سرالختم',
    contractNumber: 'C-ALF-0039',
  };

  it('retries the obsolete title-and-contract check when the portal amount is safe', () => {
    expect(isSafeLegacyReviewMismatchRetry(job, [event], expected)).toBe(true);
  });

  it('does not retry a genuine portal mismatch', () => {
    const unsafeEvent = {
      ...event,
      details: {
        ...event.details,
        missing: ['مدعى عليه مختلف'],
      },
    };

    expect(isSafeLegacyReviewMismatchRetry(job, [unsafeEvent], expected)).toBe(false);
  });

  it('does not retry after the attempt limit is reached', () => {
    expect(isSafeLegacyReviewMismatchRetry({
      ...job,
      attempt_count: job.max_attempts,
    }, [event], expected)).toBe(false);
  });
});

describe('isSafePartyIdentityTypeRetry', () => {
  const job: TaqadiFilingJob = {
    id: 'identity-job-1',
    company_id: 'company-1',
    legal_case_id: 'case-1',
    contract_id: 'contract-1',
    status: 'needs_human',
    current_step: 'party_identity_type_unavailable',
    progress: 35,
    result: null,
    error_code: 'PARTY_IDENTITY_TYPE_UNAVAILABLE',
    error_message: 'لم يجد الوكيل نوع هوية مناسبًا للطرف «المدعى عليه» ضمن خيارات نافذته',
    attempt_count: 1,
    max_attempts: 3,
    locked_by: null,
    heartbeat_at: null,
    created_at: '2026-08-27T19:20:00.000Z',
    updated_at: '2026-08-27T19:26:00.000Z',
    completed_at: null,
  };
  const event: TaqadiFilingJobEvent = {
    id: 2,
    job_id: job.id,
    event_type: 'needs_human',
    step: 'party_identity_type_unavailable',
    status: 'needs_human',
    message: job.error_message,
    details: {
      partyKind: 'defendant',
      nationality: 'تونس',
      portalStage: 'parties',
      requestedType: 'بطاقة شخصية قطرية',
      requiredActions: [],
      resumeSupported: true,
      availableOptions: ['اختيار واحد', 'جواز سفر', 'رخصة مقيم'],
      portalConfidence: 'high',
    },
    created_at: '2026-08-27T19:26:00.000Z',
  };

  it('retries a foreign defendant QID through the resident-license portal option', () => {
    expect(isSafePartyIdentityTypeRetry(job, [event])).toBe(true);
  });

  it('does not retry when the portal offers no compatible identity option', () => {
    expect(isSafePartyIdentityTypeRetry(job, [{
      ...event,
      details: { ...event.details, availableOptions: ['جواز سفر'] },
    }])).toBe(false);
  });
});
