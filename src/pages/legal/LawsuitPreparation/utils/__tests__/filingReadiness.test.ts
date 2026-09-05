import { describe, expect, it, vi } from 'vitest';
import type { LawsuitPreparationState } from '../../store';
import { getFilingReadiness } from '../filingReadiness';

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
      defendant: { fullName: 'مدعى عليه' },
    },
  } as unknown as LawsuitPreparationState;
}

describe('getFilingReadiness', () => {
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
