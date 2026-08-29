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
  const documents = Object.fromEntries(ids.map((id) => [id, readyDocument(id)]));

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
});
