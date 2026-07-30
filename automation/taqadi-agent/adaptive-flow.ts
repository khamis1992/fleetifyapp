import type {
  TaqadiPortalPosition,
  TaqadiPortalStage,
} from './portal-stage';

export type AdaptivePortalAction =
  | 'configure_case'
  | 'fill_case_details'
  | 'process_parties'
  | 'upload_documents'
  | 'verify_review'
  | 'wait_for_login'
  | 'request_human';

const nextStage: Partial<Record<TaqadiPortalStage, TaqadiPortalStage>> = {
  case_classification: 'case_details',
  case_details: 'parties',
  parties: 'documents',
  documents: 'review',
};

const actionByStage: Record<TaqadiPortalStage, AdaptivePortalAction> = {
  login: 'wait_for_login',
  case_classification: 'configure_case',
  case_details: 'fill_case_details',
  parties: 'process_parties',
  documents: 'upload_documents',
  review: 'verify_review',
  unknown: 'request_human',
};

export interface AdaptivePortalPlan {
  action: AdaptivePortalAction;
  currentStage: TaqadiPortalStage;
  expectedStage: TaqadiPortalStage | null;
  safeToRun: boolean;
  reason: string;
}

function isUncontested(position: TaqadiPortalPosition) {
  const runnerUp = position.candidates?.[1];
  if (!runnerUp) return true;
  return (position.score || 0) - (runnerUp.score || 0) >= 3;
}

export function planPortalAction(
  position: TaqadiPortalPosition,
): AdaptivePortalPlan {
  const action = actionByStage[position.stage];
  const score = position.score || 0;
  // high دائمًا آمن. low مقبول إذا: ليس مراجعة/اعتماد، والنتيجة غير متنازع عليها،
  // والدرجة ≥ 7 (يغطي صفحة الأطراف بعد الحفظ حيث يظهر زر إضافة طرف فقط).
  const confidenceAllowsAction = position.confidence === 'high'
    || (
      position.confidence === 'low'
      && position.stage !== 'review'
      && position.stage !== 'login'
      && score >= 7
      && isUncontested(position)
    )
    || (
      position.confidence === 'low'
      && score >= 12
      && position.stage !== 'review'
    );
  const safeToRun = !['wait_for_login', 'request_human'].includes(action)
    && confidenceAllowsAction;

  return {
    action,
    currentStage: position.stage,
    expectedStage: nextStage[position.stage] || null,
    safeToRun,
    reason: safeToRun
      ? `stage:${position.stage}; evidence:${(position.evidence || []).join(',')}`
      : `insufficient_confidence:${position.confidence}; score:${score}`,
  };
}

export function stageReached(
  actual: TaqadiPortalStage,
  expected: TaqadiPortalStage,
) {
  const order: TaqadiPortalStage[] = [
    'login',
    'case_classification',
    'case_details',
    'parties',
    'documents',
    'review',
  ];
  const actualIndex = order.indexOf(actual);
  const expectedIndex = order.indexOf(expected);
  return actualIndex >= expectedIndex && expectedIndex >= 0;
}
