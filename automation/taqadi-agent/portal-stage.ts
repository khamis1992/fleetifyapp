import type { PortalObservation } from './portal-observer';

export type TaqadiPortalStage =
  | 'login'
  | 'home'
  | 'case_classification'
  | 'case_details'
  | 'parties'
  | 'documents'
  | 'fees'
  | 'review'
  | 'receipt'
  | 'unknown';

export interface PortalStageSignals {
  login: boolean;
  classification: boolean;
  caseDetails: boolean;
  parties: boolean;
  documents: boolean;
  fees?: boolean;
  review: boolean;
}

export interface TaqadiPortalPosition {
  stage: TaqadiPortalStage;
  label: string;
  confidence: 'high' | 'low';
  score?: number;
  evidence?: string[];
  candidates?: Array<{
    stage: TaqadiPortalStage;
    score: number;
    evidence: string[];
  }>;
  url: string;
  validationMessages: string[];
}

const stageLabels: Record<TaqadiPortalStage, string> = {
  login: 'تسجيل الدخول',
  home: 'الصفحة الرئيسية لتقاضي',
  case_classification: 'تصنيف الدعوى',
  case_details: 'تفاصيل الدعوى',
  parties: 'أطراف الدعوى',
  documents: 'مستندات الدعوى',
  fees: 'تفاصيل الرسوم',
  review: 'مراجعة الدعوى',
  receipt: 'إيصال قيد الدعوى',
  unknown: 'صفحة غير معروفة',
};

export const normalizeArabic = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const includesAny = (text: string, values: string[]) =>
  values.some((value) => text.includes(normalizeArabic(value)));

export function inferPortalStage(
  observation: PortalObservation,
): Pick<
  TaqadiPortalPosition,
  'stage' | 'label' | 'confidence' | 'score' | 'evidence' | 'candidates'
> {
  // نص المطابقة يستبعد observation.links عمدًا: قائمة التنقل الجانبية في
  // معالج تقاضي تعرض أسماء كل المراحل في كل صفحة (اطراف الدعوى، ملخص الدعوى…)
  // فتسمّم الإشارات النصية وتجعل المرحلة الخاطئة تتفوق على الفعلية.
  const visibleControls = observation.controls.filter(
    (control) => control.visible !== false,
  );
  const visibleText = normalizeArabic([
    observation.title,
    ...observation.headings,
    ...observation.activeTabs,
    ...observation.buttons,
    ...observation.dialogs,
    ...(observation.activePanels || []),
    ...visibleControls.map((control) => control.label),
  ].join(' '));
  const activeWizardText = normalizeArabic(
    (observation.activeWizardSteps || []).join(' '),
  );
  const hasActiveWizardText = (...values: string[]) =>
    includesAny(activeWizardText, values);
  // معرفات الحقول تُجمع من كل الضوابط بما فيها المخفية — حقول Kendo الحقيقية
  // (tempctype_*) تختبئ خلف ودجات ظاهرة، ومعرفها أقوى دليل على المرحلة.
  const controlIds = new Set(
    observation.controls
      .flatMap((control) => [control.id, control.name])
      .filter((value): value is string => Boolean(value)),
  );
  const hasControl = (...ids: string[]) =>
    ids.some((id) => controlIds.has(id));
  const hasType = (type: string) =>
    visibleControls.some((control) => control.type === type);
  const hasText = (...values: string[]) => includesAny(visibleText, values);
  const hasControlLabel = (...values: string[]) =>
    visibleControls.some((control) =>
      includesAny(normalizeArabic(control.label), values));
  const matches = new Set(observation.knownValueMatches);

  const scored: Array<{
    stage: TaqadiPortalStage;
    score: number;
    evidence: string[];
  }> = [];
  const add = (
    stage: TaqadiPortalStage,
    checks: Array<[boolean, number, string]>,
  ) => {
    const evidence = checks
      .filter(([matched]) => matched)
      .map(([, , reason]) => reason);
    const score = checks
      .filter(([matched]) => matched)
      .reduce((total, [, points]) => total + points, 0);
    scored.push({ stage, score, evidence });
  };

  add('login', [
    [/\/login(?:[/?#]|$)/i.test(observation.url), 6, 'login_url'],
    [hasType('password'), 9, 'password_field'],
    [hasText('تسجيل الدخول', 'توثيق', 'اسم المستخدم'), 3, 'login_text'],
  ]);
  add('home', [
    [observation.pageKind === 'home', 14, 'authenticated_home'],
    [
      observation.pageKind === 'home'
        && hasText('إنشاء دعوى', 'إدارة الدعاوى', 'لوحة المهام'),
      4,
      'home_navigation',
    ],
  ]);
  add('case_classification', [
    [hasActiveWizardText('نوع الدعوى'), 14, 'active_wizard_step'],
    [hasControl('tempctype_court'), 7, 'litigation_degree_control'],
    [hasControl('tempctype_category'), 5, 'case_type_control'],
    [hasControl('tempctype_type'), 5, 'case_subtype_control'],
    [hasControl('tempctype_nature'), 5, 'applicability_control'],
    [hasControlLabel('درجة التقاضي'), 5, 'litigation_degree_label'],
    [hasControlLabel('النوع الفرعي', 'الموضوع الفرعي'), 3, 'case_subtype_label'],
    [hasText('درجة التقاضي', 'تصنيف الدعوى'), 3, 'classification_text'],
  ]);
  add('case_details', [
    [hasActiveWizardText('تفاصيل الدعوى'), 14, 'active_wizard_step'],
    [hasControl('facts'), 10, 'facts_control'],
    [hasControl('applicantReferenceNo'), 4, 'case_title_control'],
    [hasControl('tempCostOrders0.description'), 4, 'claim_amount_control'],
    [hasText('وقائع الدعوى', 'تفاصيل الدعوى', 'قيمة المطالبة'), 3, 'details_text'],
  ]);
  const hasAddPartyButton = observation.buttons.some((button) =>
    includesAny(normalizeArabic(button), [
      'إضافة طرف',
      'اضافة طرف',
      'إضافة اطراف',
      'اضافة اطراف',
    ]));
  add('parties', [
    [hasActiveWizardText('أطراف الدعوى', 'اطراف الدعوى'), 14, 'active_wizard_step'],
    [hasControl('category', 'type', 'priority'), 6, 'party_dialog_controls'],
    // زر «إضافة طرف» دليل مباشر على صفحة الأطراف (ظهر في فشل job 2306577d)
    [hasAddPartyButton, 8, 'add_party_button'],
    [hasText('أطراف الدعوى', 'اطراف الدعوى', 'اضافة طرف', 'إضافة طرف'),
    7, 'parties_text'],
    [observation.activeTabs.some((tab) =>
      includesAny(normalizeArabic(tab), ['أطراف الدعوى', 'اطراف الدعوى', 'الاطراف'])),
    7, 'active_parties_tab'],
    // رؤوس شبكة الأطراف تظهر في الصفحة دون تبويب نشط واضح
    [hasText('الترتيب حسب صحيفة الدعوى', 'ترتيب حسب صحيفة'),
    4, 'party_grid_headers'],
  ]);
  add('documents', [
    [hasActiveWizardText('المستندات'), 14, 'active_wizard_step'],
    [hasType('file'), 9, 'file_input'],
    [hasText('مستندات الدعوى', 'نوع المستند', 'ارفاق', 'إرفاق', 'رفع ملف'),
    6, 'documents_text'],
    // The documents grid before the first upload has no file input yet; its
    // unique cues are the «إضافة وثيقة» button and the mandatory-attachments
    // note, both present only on this stage.
    [hasText(
      'إضافة وثيقة',
      'اضافة وثيقة',
      'يجب إرفاق المستندات',
      'المستندات الإلزامية',
      'المستندات الالزامية',
    ), 7, 'documents_grid_cues'],
    [observation.activeTabs.some((tab) =>
      includesAny(normalizeArabic(tab), ['المستندات', 'مرفقات'])),
    7, 'active_documents_tab'],
  ]);
  add('fees', [
    [hasActiveWizardText('تفاصيل الرسوم'), 14, 'active_wizard_step'],
    [hasText('تفاصيل الرسوم', 'قيمة الرسوم', 'رسوم الدعوى'), 7, 'fees_text'],
  ]);
  add('review', [
    [hasActiveWizardText('ملخص الدعوى', 'مراجعة الدعوى'), 14, 'active_wizard_step'],
    [hasText('مراجعة الدعوى', 'ملخص الدعوى', 'اعتماد نهائي'), 7, 'review_text'],
    [matches.has('caseTitle'), 3, 'case_title_match'],
    [matches.has('defendantName'), 3, 'defendant_match'],
    [matches.has('contractNumber'), 3, 'contract_match'],
    [matches.size === 3, 4, 'all_case_values_match'],
  ]);
  add('receipt', [
    [observation.pageKind === 'receipt', 20, 'filing_receipt'],
    [hasText('إشعار تقديم الطلب', 'إيصال طلب قيد دعوى'), 8, 'receipt_text'],
  ]);

  const candidates = scored
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best || best.score < 5) {
    return {
      stage: 'unknown',
      label: stageLabels.unknown,
      confidence: 'low',
      score: best?.score || 0,
      evidence: best?.evidence || [],
      candidates,
    };
  }

  // مرحلة وحيدة بلا منافس: يكفي score >= 7 (مثل أطراف الدعوى بزر إضافة طرف فقط).
  // مع منافس: نحتاج score >= 9 وفرق ≥ 3 كما كان.
  const uncontested = !runnerUp || best.score - runnerUp.score >= 3;
  const confidence: 'high' | 'low' = (
    (best.score >= 9 && uncontested)
    || (best.score >= 7 && !runnerUp)
  )
    ? 'high'
    : 'low';

  return {
    stage: best.stage,
    label: stageLabels[best.stage],
    confidence,
    score: best.score,
    evidence: best.evidence,
    candidates,
  };
}

export function classifyPortalStage(
  signals: PortalStageSignals,
): Pick<TaqadiPortalPosition, 'stage' | 'label' | 'confidence'> {
  const ordered: Array<[TaqadiPortalStage, boolean]> = [
    ['login', signals.login],
    ['case_details', signals.caseDetails],
    ['parties', signals.parties],
    ['documents', signals.documents],
    ['fees', Boolean(signals.fees)],
    ['case_classification', signals.classification],
    ['review', signals.review],
  ];
  const matched = ordered.filter(([, active]) => active);
  if (matched.length === 0) {
    return {
      stage: 'unknown',
      label: stageLabels.unknown,
      confidence: 'low',
    };
  }

  const [stage] = matched[0];
  return {
    stage,
    label: stageLabels[stage],
    confidence: matched.length === 1 ? 'high' : 'low',
  };
}
