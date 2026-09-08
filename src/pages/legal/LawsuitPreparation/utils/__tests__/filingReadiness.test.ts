import { describe, expect, it, vi } from 'vitest';
import type { LawsuitPreparationState } from '../../store';
import { getFilingReadiness } from '../filingReadiness';
import { getFilingIssues } from '../filingIssues';

vi.mock('../documentGenerators', () => ({
  isMemoSnapshotCurrent: vi.fn(() => true),
}));

vi.mock('../legalCaseWorkflow', () => ({
  evaluateLegalCaseReadiness: vi.fn(() => ({
    status: 'approved',
    score: 100,
    issues: [],
    warnings: [],
    strengths: [],
    legalPath: {
      requestedPath: 'judicial_rescission',
      effectivePath: 'judicial_rescission',
      effectiveTerminationDate: null,
      terminationNotice: null,
      isDocumented: false,
      issues: [],
    },
    eligibleClaims: {},
  })),
  getDefendantContact: vi.fn(() => ({
    address: 'عنوان مثبت',
    email: 'verified@example.com',
    source: 'customer_record',
    documentId: null,
  })),
}));

const readyDocument = (id: string) => ({
  id,
  name: id,
  description: id,
  type: 'mandatory' as const,
  category: 'generated' as const,
  status: 'ready' as const,
  url: `https://example.com/${id}.pdf`,
  htmlContent: null,
  error: null,
  generatedAt: '2026-08-26T00:00:00.000Z',
});

function createReadyState(violationsCount = 0): LawsuitPreparationState {
  const ids = [
    'memo', 'claims', 'docsList', 'contract', 'commercialRegister',
    'ibanCertificate', 'representativeId', 'violations', 'violationsEvidence',
    'criminalComplaint', 'violationsTransfer',
  ] as const;
  const documents = Object.fromEntries(ids.map((id) => [id, readyDocument(id)])) as LawsuitPreparationState['documents'];
  documents.contract.sourceDocumentId = 'signed-contract-document-1';
  documents.contract.identityVerification = {
    status: 'matched',
    expectedName: 'مدعى عليه',
    extractedName: 'مدعى عليه',
    expectedId: '29850400215',
    extractedId: '29850400215',
    reason: 'Exact identity match',
    checkedAt: '2026-08-26T00:00:00.000Z',
  };

  return {
    contract: { vehicle_id: 'vehicle-1', license_plate: '1234' },
    vehicle: { plate_number: '1234' },
    calculations: { violationsCount },
    documents,
    litigationProfile: { legal_review_status: 'approved' },
    memoSnapshots: [{ readiness_status: 'approved' }],
    taqadiData: {
      caseTitle: 'مطالبة مالية',
      facts: 'وقائع مثبتة',
      claims: 'طلبات الدعوى',
      defendant: { fullName: 'مدعى عليه', nationality: 'السودان' },
    },
  } as unknown as LawsuitPreparationState;
}

describe('getFilingReadiness', () => {
  it('requires traffic documents for a positive claimed amount even if the count is stale', () => {
    const state = createReadyState(0);
    state.calculations!.violationsFines = 500;
    state.documents.violationsEvidence.status = 'missing';
    expect(getFilingReadiness(state).requiredDocumentIds).toContain('violationsEvidence');
    expect(getFilingReadiness(state).canStartFiling).toBe(false);
  });
  it('requires official proof for traffic-only scope even before a supported amount is available', () => {
    const state = createReadyState(0);
    state.legalCase = { claim_scope: 'traffic_violations_only' } as LawsuitPreparationState['legalCase'];
    state.documents.violationsEvidence.status = 'missing';
    expect(getFilingReadiness(state).canStartFiling).toBe(false);
  });
  it('explains missing nationality directly and sends the user to its completion form', () => {
    const state = createReadyState();
    state.taqadiData!.defendant.nationality = null;
    const readiness = getFilingReadiness(state);
    const blockers = getFilingIssues(state, readiness).filter((issue) => issue.severity === 'blocking');
    expect(readiness.taqadiIssues.map((issue) => issue.field)).toEqual(['nationality']);
    expect(readiness.missingReasons).toHaveLength(1);
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({ id: 'field-nationality', resolution: { kind: 'nationality' } });
    state.taqadiData!.defendant.nationality = 'مصري';
    expect(getFilingReadiness(state).canStartFiling).toBe(true);
    expect(getFilingIssues(state).some((issue) => issue.id === 'field-nationality')).toBe(false);
  });

  it('keeps custody and notice warnings actionable without turning them into blockers', () => {
    const state = createReadyState();
    const readiness = getFilingReadiness(state);
    readiness.legalStatus.warnings = ['حيازة المركبة غير مؤكدة؛ لن يظهر طلب الرد أو تعويض الاحتباس.', 'لا يوجد إعذار سابق أو استثناء موثق.'];
    const issues = getFilingIssues(state, readiness);
    expect(issues.filter((issue) => issue.severity === 'blocking')).toHaveLength(0);
    expect(issues[0].resolution).toMatchObject({ kind: 'tab', tab: 'evidence', anchor: 'lawsuit-custody' });
    expect(issues[1].resolution).toMatchObject({ kind: 'tab', tab: 'evidence', anchor: 'lawsuit-notices' });
    expect(readiness.canStartFiling).toBe(true);
  });

  it('shows one actionable contact error when the email is missing and unverified', () => {
    const state = createReadyState();
    const readiness = getFilingReadiness(state);
    readiness.taqadiIssues = [{ field: 'email', message: 'بريد المدعى عليه المتحقق منه غير مكتمل.' }];
    readiness.legalStatus.issues = ['حالة بريد المدعى عليه غير محددة.'];
    const blockers = getFilingIssues(state, readiness).filter((issue) => issue.severity === 'blocking');
    expect(blockers).toHaveLength(1);
    expect(blockers[0].resolution).toMatchObject({ anchor: 'lawsuit-contact' });
  });

  it('routes an unsigned/unmatched lease to the document workflow only once', () => {
    const state = createReadyState();
    state.documents.contract.status = 'missing';
    const blockers = getFilingIssues(state).filter((issue) => issue.severity === 'blocking');
    expect(blockers).toHaveLength(1);
    expect(blockers[0]).toMatchObject({ id: 'signed-contract', resolution: { tab: 'documents' } });
    expect(getFilingReadiness(state).canStartFiling).toBe(false);
  });

  it('exposes failed document generation and its completion action', () => {
    const state = createReadyState();
    state.documents.memo.status = 'error';
    state.documents.memo.error = new Error('تعذر إنشاء المذكرة');
    const issue = getFilingIssues(state).find((item) => item.id === 'document-memo');
    expect(issue).toMatchObject({ description: 'تعذر إنشاء المذكرة', resolution: { tab: 'documents', anchor: 'lawsuit-documents' } });
    expect(getFilingReadiness(state).canStartFiling).toBe(false);
  });

  it.each(['غير محدد', 'unknown', '', null])('rejects missing nationality %j even with complete documents', (nationality) => {
    const state = createReadyState();
    state.taqadiData!.defendant.nationality = nationality;
    const readiness = getFilingReadiness(state);
    expect(readiness.canStartFiling).toBe(false);
    expect(readiness.percentage).toBeLessThan(100);
    expect(readiness.missingReasons.join(' ')).toContain('جنسية المدعى عليه');
  });
  it('does not require violation evidence for amounts excluded from the claim', () => {
    const state = createReadyState(0);
    state.documents.violations.status = 'missing';
    state.documents.violationsEvidence.status = 'missing';

    const readiness = getFilingReadiness(state);

    expect(readiness.requiredDocumentIds).not.toContain('violationsEvidence');
    expect(readiness.canStartFiling).toBe(true);
    expect(readiness.canFile).toBe(true);
    expect(readiness.percentage).toBe(100);
  });

  it('requires both violation documents once their amount enters the claim', () => {
    const state = createReadyState(1);
    state.documents.violationsEvidence.status = 'missing';

    const readiness = getFilingReadiness(state);

    expect(readiness.requiredDocumentIds).toContain('violationsEvidence');
    expect(readiness.documents.isComplete).toBe(false);
    expect(readiness.canStartFiling).toBe(false);
    expect(readiness.canFile).toBe(false);
  });

  it('lets the user start filing while agent review and approval are pending', () => {
    const state = createReadyState(0);
    state.litigationProfile!.legal_review_status = 'draft';
    state.memoSnapshots[0].readiness_status = 'ready';

    const readiness = getFilingReadiness(state);

    expect(readiness.canStartFiling).toBe(true);
    expect(readiness.canFile).toBe(false);
    expect(readiness.percentage).toBe(100);
    expect(readiness.missingReasons).not.toContain('الملف القانوني لم يعتمد بعد.');
    expect(readiness.finalizationReasons).toContain('مراجعة الوكيل لم تبدأ أو لم تعتمد بعد.');
  });

  it('uses the loaded contract evidence as the single signed-lease readiness source', () => {
    const state = createReadyState(0);

    const readiness = getFilingReadiness(state);

    expect(readiness.signedLease).toMatchObject({
      hasSignedLease: true,
      hasIdentityMatch: true,
      isComplete: true,
    });
    expect(readiness.canStartFiling).toBe(true);
  });

  it('blocks filing when the loaded signed contract has no identity match', () => {
    const state = createReadyState(0);
    state.documents.contract.identityVerification = {
      ...state.documents.contract.identityVerification!,
      status: 'mismatch',
    };

    const readiness = getFilingReadiness(state);

    expect(readiness.signedLease.hasSignedLease).toBe(true);
    expect(readiness.signedLease.hasIdentityMatch).toBe(false);
    expect(readiness.signedLease.blockingReason).toBe('الهوية غير متحققة');
    expect(readiness.canStartFiling).toBe(false);
  });
});
