import type { DocumentsState, LawsuitPreparationState } from '../store/types';
import { isMemoSnapshotCurrent } from './documentGenerators';
import { evaluateLegalCaseReadiness, getDefendantContact } from './legalCaseWorkflow';
import { hasKnownTaqadiNationality, DEFENDANT_NATIONALITY_REQUIRED_MESSAGE } from '@/utils/taqadiNationality';
import { requiresViolationDocuments } from './violationDocumentRequirements';
import { getContractDocumentReview } from './contractDocumentSelection';

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
  signedLease: {
    hasSignedLease: boolean;
    hasIdentityMatch: boolean;
    isComplete: boolean;
    blockingReason?: string;
  };
  legalStatus: ReturnType<typeof evaluateLegalCaseReadiness>;
  profileApproved: boolean;
  snapshotApprovedAndCurrent: boolean;
  taqadiComplete: boolean;
  taqadiIssues: TaqadiFieldIssue[];
}

export interface TaqadiFieldIssue {
  field: 'nationality' | 'caseTitle' | 'facts' | 'claims' | 'fullName' | 'address' | 'email' | 'plate';
  message: string;
}

export function getFilingReadiness(state: LawsuitPreparationState): FilingReadiness {
  const legalStatus = evaluateLegalCaseReadiness(state);
  const requiredDocumentIds: (keyof DocumentsState)[] = [...BASE_FILING_DOCUMENT_IDS];

  // المخالفات التي لا يساندها مستخرج رسمي مستبعدة مالياً، ولذلك لا تجعل
  // حافظة مطالبة الإيجار الصحيحة رهينة مستند غير موجود.
  if (requiresViolationDocuments(state)) {
    requiredDocumentIds.push('violations', 'violationsEvidence');
  }

  const requiredDocuments = requiredDocumentIds.map((id) => state.documents[id]);
  const ready = requiredDocuments.filter((document) => document.status === 'ready').length;
  const generating = requiredDocuments.filter(
    (document) => document.status === 'generating' || document.isUploading,
  ).length;
  const missing = requiredDocuments.length - ready - generating;
  const documentsComplete = ready === requiredDocuments.length;
  const contractDocument = state.documents.contract;
  const hasSignedLease = Boolean(
    contractDocument.status === 'ready'
      && contractDocument.sourceDocumentId
      && contractDocument.url,
  );
  const hasIdentityMatch = Boolean(
    hasSignedLease && contractDocument.identityVerification?.status === 'matched',
  );
  const signedLeaseComplete = hasSignedLease && hasIdentityMatch;
  let signedLeaseBlockingReason: string | undefined;
  if (!hasSignedLease && !hasIdentityMatch) {
    signedLeaseBlockingReason = 'عقد موقّع مطابق غير موجود والهوية غير متحققة';
  } else if (!hasSignedLease) {
    signedLeaseBlockingReason = 'عقد موقّع مطابق غير موجود';
  } else if (!hasIdentityMatch) {
    signedLeaseBlockingReason = 'الهوية غير متحققة';
  }
  if (!signedLeaseComplete) {
    const review = getContractDocumentReview(state.contractEvidenceDocuments || []);
    if (review.kind === 'review' || review.kind === 'conflict') signedLeaseBlockingReason = review.message;
  }
  const defendantContact = getDefendantContact(state);
  const latestSnapshot = state.memoSnapshots[0];
  const profileApproved = state.litigationProfile?.legal_review_status === 'approved';
  const snapshotApprovedAndCurrent = Boolean(
    latestSnapshot?.readiness_status === 'approved'
      && isMemoSnapshotCurrent(state, latestSnapshot),
  );
  const taqadiIssues: TaqadiFieldIssue[] = [];
  if (!hasKnownTaqadiNationality(state.taqadiData?.defendant?.nationality)) {
    taqadiIssues.push({ field: 'nationality', message: DEFENDANT_NATIONALITY_REQUIRED_MESSAGE });
  }
  const requiredFields: [TaqadiFieldIssue['field'], string | null | undefined, string][] = [
    ['caseTitle', state.taqadiData?.caseTitle, 'عنوان الدعوى غير مكتمل.'],
    ['facts', state.taqadiData?.facts, 'نص وقائع الدعوى غير مكتمل.'],
    ['claims', state.taqadiData?.claims, 'طلبات الدعوى غير مكتملة.'],
    ['fullName', state.taqadiData?.defendant?.fullName, 'اسم المدعى عليه غير مكتمل.'],
    ['address', defendantContact.address, 'عنوان تبليغ المدعى عليه غير مكتمل.'],
    ['email', defendantContact.email, 'بريد المدعى عليه المتحقق منه غير مكتمل.'],
    ['plate', state.vehicle?.plate_number || state.contract?.license_plate, 'رقم لوحة المركبة غير مكتمل.'],
  ];
  for (const [field, value, message] of requiredFields) {
    if (!value?.trim()) taqadiIssues.push({ field, message });
  }
  const taqadiComplete = taqadiIssues.length === 0;

  // These are the only conditions the user must complete before starting the
  // filing procedure. Legal approval belongs to the Taqadi worker after it
  // verifies the live portal review, so it is deliberately kept out of this
  // user-facing list.
  const missingReasons = [...legalStatus.issues];
  if (!documentsComplete) missingReasons.push(`الحافظة الإلزامية غير مكتملة (${ready}/${requiredDocuments.length}).`);
  if (!signedLeaseComplete && signedLeaseBlockingReason) {
    missingReasons.push(signedLeaseBlockingReason);
  }
  missingReasons.push(...taqadiIssues.map((issue) => issue.message));

  const finalizationReasons: string[] = [];
  if (!profileApproved) finalizationReasons.push('مراجعة الوكيل لم تبدأ أو لم تعتمد بعد.');
  if (!snapshotApprovedAndCurrent) finalizationReasons.push('ينتظر اعتماد الوكيل للنسخة الحديثة من المذكرة.');

  const preparationChecks = [
    documentsComplete,
    signedLeaseComplete,
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
    signedLease: {
      hasSignedLease,
      hasIdentityMatch,
      isComplete: signedLeaseComplete,
      blockingReason: signedLeaseBlockingReason,
    },
    legalStatus,
    profileApproved,
    snapshotApprovedAndCurrent,
    taqadiComplete,
    taqadiIssues,
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
