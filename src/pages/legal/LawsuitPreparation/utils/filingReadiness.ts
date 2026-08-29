import type { DocumentsState, LawsuitPreparationState } from '../store/types';
import { isMemoSnapshotCurrent } from './documentGenerators';
import { evaluateLegalCaseReadiness, getDefendantContact } from './legalCaseWorkflow';

export const BASE_FILING_DOCUMENT_IDS = [
  'memo',
  'claims',
  'docsList',
  'contract',
  'commercialRegister',
  'ibanCertificate',
  'representativeId',
] as const satisfies readonly (keyof DocumentsState)[];

export interface FilingReadiness {
  canStartFiling: boolean;
  canFile: boolean;
  percentage: number;
  missingReasons: string[];
  finalizationReasons: string[];
  requiredDocumentIds: (keyof DocumentsState)[];
  documents: {
    total: number;
    ready: number;
    missing: number;
    generating: number;
    isComplete: boolean;
  };
  legalStatus: ReturnType<typeof evaluateLegalCaseReadiness>;
  profileApproved: boolean;
  snapshotApprovedAndCurrent: boolean;
  taqadiComplete: boolean;
}

export function getFilingReadiness(state: LawsuitPreparationState): FilingReadiness {
  const legalStatus = evaluateLegalCaseReadiness(state);
  const requiredDocumentIds: (keyof DocumentsState)[] = [...BASE_FILING_DOCUMENT_IDS];

  // المخالفات التي لا يساندها مستخرج رسمي مستبعدة مالياً، ولذلك لا تجعل
  // حافظة مطالبة الإيجار الصحيحة رهينة مستند غير موجود.
  if (Number(state.calculations?.violationsCount || 0) > 0) {
    requiredDocumentIds.push('violations', 'violationsEvidence');
  }

  const requiredDocuments = requiredDocumentIds.map((id) => state.documents[id]);
  const ready = requiredDocuments.filter((document) => document.status === 'ready').length;
  const generating = requiredDocuments.filter(
    (document) => document.status === 'generating' || document.isUploading,
  ).length;
  const missing = requiredDocuments.length - ready - generating;
  const documentsComplete = ready === requiredDocuments.length;
  const defendantContact = getDefendantContact(state);
  const latestSnapshot = state.memoSnapshots[0];
  const profileApproved = state.litigationProfile?.legal_review_status === 'approved';
  const snapshotApprovedAndCurrent = Boolean(
    latestSnapshot?.readiness_status === 'approved'
      && isMemoSnapshotCurrent(state, latestSnapshot),
  );
  const taqadiComplete = Boolean(
    state.taqadiData?.caseTitle?.trim()
      && state.taqadiData?.facts?.trim()
      && state.taqadiData?.claims?.trim()
      && state.taqadiData?.defendant?.fullName?.trim()
      && defendantContact.address
      && defendantContact.email
      && (state.vehicle?.plate_number || state.contract?.license_plate),
  );

  // These are the only conditions the user must complete before starting the
  // filing procedure. Legal approval belongs to the Taqadi worker after it
  // verifies the live portal review, so it is deliberately kept out of this
  // user-facing list.
  const missingReasons = [...legalStatus.issues];
  if (!documentsComplete) missingReasons.push(`الحافظة الإلزامية غير مكتملة (${ready}/${requiredDocuments.length}).`);
  if (!taqadiComplete) missingReasons.push('بيانات تقاضي النهائية غير مكتملة.');

  const finalizationReasons: string[] = [];
  if (!profileApproved) finalizationReasons.push('مراجعة الوكيل لم تبدأ أو لم تعتمد بعد.');
  if (!snapshotApprovedAndCurrent) finalizationReasons.push('ينتظر اعتماد الوكيل للنسخة الحديثة من المذكرة.');

  const preparationChecks = [
    documentsComplete,
    legalStatus.issues.length === 0,
    taqadiComplete,
  ];
  const percentage = Math.round(
    (preparationChecks.filter(Boolean).length / preparationChecks.length) * 100,
  );
  const canStartFiling = missingReasons.length === 0;

  return {
    canStartFiling,
    canFile: canStartFiling && finalizationReasons.length === 0,
    percentage,
    missingReasons: [...new Set(missingReasons)],
    finalizationReasons: [...new Set(finalizationReasons)],
    requiredDocumentIds,
    documents: {
      total: requiredDocuments.length,
      ready,
      missing: Math.max(0, missing),
      generating,
      isComplete: documentsComplete,
    },
    legalStatus,
    profileApproved,
    snapshotApprovedAndCurrent,
    taqadiComplete,
  };
}

export function assertFilingCanStart(state: LawsuitPreparationState): void {
  const readiness = getFilingReadiness(state);
  if (!readiness.canStartFiling) {
    throw new Error(`لا يمكن بدء إجراءات رفع الدعوى قبل معالجة: ${readiness.missingReasons.join('، ')}`);
  }
}

export function assertFilingReady(state: LawsuitPreparationState): void {
  const readiness = getFilingReadiness(state);
  if (!readiness.canFile) {
    throw new Error(
      `لا يمكن إتمام رفع الدعوى قبل معالجة: ${[
        ...readiness.missingReasons,
        ...readiness.finalizationReasons,
      ].join('، ')}`,
    );
  }
}
