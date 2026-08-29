import type {
  Customer,
  DamageCost,
  FormalNotice,
  LawsuitPreparationState,
  LitigationProfile,
  RescissionStrategy,
} from '../store/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DEFAULT_DEFENDANT_SERVICE_ADDRESS = 'الدوحة قطر';
const DEFENDANT_EMAIL_UNAVAILABLE_ISSUE = 'بريد المدعى عليه غير متوفر لدى الشركة؛ يلزم استكمال بريد حقيقي أو مراجعة الرفع يدوياً قبل الإرسال إلى تقاضي.';
const DEFENDANT_EMAIL_UNKNOWN_ISSUE = 'حالة بريد المدعى عليه غير محددة.';

export interface LegalPathResolution {
  requestedPath: RescissionStrategy;
  effectivePath: RescissionStrategy;
  effectiveTerminationDate: string | null;
  terminationNotice: FormalNotice | null;
  isDocumented: boolean;
  issues: string[];
}

export interface LegalCaseReadiness {
  status: 'not_ready' | 'ready_with_reservations' | 'ready' | 'approved';
  score: number;
  issues: string[];
  warnings: string[];
  strengths: string[];
  legalPath: LegalPathResolution;
  eligibleClaims: {
    rent: boolean;
    contractualCompensation: boolean;
    violations: boolean;
    vehicleReturn: boolean;
    retention: boolean;
    documentedDamages: boolean;
    monetaryDelayDamage: boolean;
    futureRetention: boolean;
  };
}

export function resolveDefendantContact(
  profile: LitigationProfile | null,
  customer: Customer | null,
): {
  address: string;
  email: string;
  emailStatus: LitigationProfile['defendant_email_status'];
  source: LitigationProfile['defendant_contact_source'];
  documentId: string | null;
} {
  const emailStatus = profile?.defendant_email_status ?? 'unknown';
  const source = profile?.defendant_contact_source
    || 'customer_record';
  const profileEmail = profile?.defendant_email?.trim() || '';
  const customerEmail = customer?.email?.trim() || '';
  return {
    address: profile?.defendant_service_address?.trim()
      || customer?.address?.trim()
      || DEFAULT_DEFENDANT_SERVICE_ADDRESS,
    // A verified customer record is the canonical source. Other evidence
    // sources must keep their explicit profile email. Unavailable/unknown
    // states never receive a fallback value.
    email: emailStatus === 'verified'
      ? profileEmail || (source === 'customer_record' ? customerEmail : '')
      : '',
    emailStatus,
    source,
    documentId: profile?.defendant_contact_document_id || null,
  };
}

export function getDefendantContact(state: LawsuitPreparationState) {
  return resolveDefendantContact(state.litigationProfile, state.customer);
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: string, days: number): Date | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  date.setDate(date.getDate() + Math.max(0, days));
  return date;
}

function isConfirmedNotice(notice: FormalNotice): boolean {
  const sent = parseDateOnly(notice.sent_on);
  const delivered = parseDateOnly(notice.delivered_on);
  return Boolean(
    notice.delivery_confirmed
      && notice.proof_document_id
      && sent
      && delivered
      && delivered.getTime() >= sent.getTime(),
  );
}

function findEffectiveTerminationNotice(
  notices: FormalNotice[],
  terminationDate: string | null,
): FormalNotice | null {
  const termination = parseDateOnly(terminationDate);
  if (!termination) return null;

  return notices
    .filter((notice) => notice.notice_type === 'termination_notice' && isConfirmedNotice(notice))
    .find((notice) => {
      const graceEnd = addDays(notice.delivered_on || '', notice.grace_period_days || 0);
      return Boolean(graceEnd && termination.getTime() >= graceEnd.getTime());
    }) ?? null;
}

export function resolveLegalPath(
  profile: LitigationProfile | null,
  contractEndDate: string | null,
  notices: FormalNotice[],
  today: Date = new Date(),
): LegalPathResolution {
  const requestedPath = profile?.rescission_strategy ?? 'judicial_rescission';
  const issues: string[] = [];
  const todayDate = new Date(today);
  todayDate.setHours(0, 0, 0, 0);

  if (requestedPath === 'natural_expiry') {
    const endDate = profile?.renewal_applies
      ? profile.renewed_end_date
      : profile?.termination_date || contractEndDate;
    const parsedEnd = parseDateOnly(endDate);
    const valid = Boolean(
      profile
        && profile.termination_type === 'contract_expired'
        && profile.termination_date_status === 'confirmed'
        && profile.termination_supporting_document_id
        && parsedEnd
        && parsedEnd.getTime() <= todayDate.getTime(),
    );
    if (!valid) {
      issues.push('مسار انتهاء المدة غير مكتمل: يلزم تاريخ منقضٍ وعقد مؤيد وحالة مؤكدة.');
    }
    return {
      requestedPath,
      effectivePath: valid ? 'natural_expiry' : 'judicial_rescission',
      effectiveTerminationDate: valid ? endDate ?? null : null,
      terminationNotice: null,
      isDocumented: valid,
      issues,
    };
  }

  if (requestedPath === 'documented_termination') {
    const terminationNotice = findEffectiveTerminationNotice(
      notices,
      profile?.termination_date ?? null,
    );
    const valid = Boolean(
      profile
        && profile.termination_type === 'documented_cancellation'
        && profile.termination_date
        && profile.termination_date_status === 'confirmed'
        && profile.termination_supporting_document_id
        && profile.termination_clause_number?.trim()
        && profile.termination_clause_text?.trim()
        && terminationNotice,
    );
    if (!valid) {
      issues.push('مسار الشرط الفاسخ غير مكتمل؛ عادت الصياغة احتياطياً إلى طلب الفسخ القضائي.');
    }
    return {
      requestedPath,
      effectivePath: valid ? 'documented_termination' : 'judicial_rescission',
      effectiveTerminationDate: valid ? profile?.termination_date ?? null : null,
      terminationNotice,
      isDocumented: valid,
      issues,
    };
  }

  return {
    requestedPath,
    effectivePath: 'judicial_rescission',
    effectiveTerminationDate: null,
    terminationNotice: null,
    isDocumented: false,
    issues,
  };
}

export interface CriminalComplaintEligibility {
  eligible: boolean;
  reasons: string[];
}

/**
 * البلاغ الجنائي ليس مستنداً روتينياً في دعوى الأجرة. لا يصبح متاحاً إلا
 * بعد اعتماد المراجع القانوني لوقائع التسليم، وانتهاء العلاقة، وبقاء
 * المركبة مع المدعى عليه، وثبوت مطالبته بردها ووصول الطلب إليه.
 */
export function getCriminalComplaintEligibility(
  state: LawsuitPreparationState,
  today: Date = new Date(),
): CriminalComplaintEligibility {
  const profile = state.litigationProfile;
  const legalPath = resolveLegalPath(
    profile,
    state.contract?.end_date ?? null,
    state.formalNotices,
    today,
  );
  const reasons: string[] = [];
  const returnDemand = state.formalNotices.some((notice) => (
    ['vehicle_return_demand', 'termination_notice'].includes(notice.notice_type)
      && isConfirmedNotice(notice)
  ));

  if (!state.vehicle || !state.contract?.vehicle_id) {
    reasons.push('المركبة غير مرتبطة بالعقد بسجل نظامي.');
  }
  if (profile?.legal_review_status !== 'approved') {
    reasons.push('الملف القانوني غير معتمد.');
  }
  if (!profile?.delivery_handover_date || !profile.delivery_handover_document_id) {
    reasons.push('تسليم المركبة غير مثبت بمحضر أو سجل مؤيد.');
  }
  if (profile?.vehicle_custody !== 'with_defendant') {
    reasons.push('بقاء المركبة في حيازة المدعى عليه غير مثبت.');
  }
  if (!legalPath.isDocumented || !legalPath.effectiveTerminationDate) {
    reasons.push('انتهاء العلاقة الإيجارية غير ثابت بمسار موثق.');
  }
  if (!returnDemand) {
    reasons.push('لا توجد مطالبة موثقة الوصول برد المركبة.');
  }

  return { eligible: reasons.length === 0, reasons };
}

export function calculateRetentionClaim(
  profile: LitigationProfile | null,
  legalPath: LegalPathResolution,
  asOfDate: Date = new Date(),
): { days: number; amount: number; from: string | null; to: string | null } {
  const from = parseDateOnly(legalPath.effectiveTerminationDate);
  if (
    !profile
    || profile.vehicle_custody !== 'with_defendant'
    || !legalPath.isDocumented
    || !from
    || !profile.retention_daily_rate
    || !profile.retention_rate_source
    || !profile.retention_rate_source_ref?.trim()
    || !profile.retention_rate_source_document_id
  ) {
    return { days: 0, amount: 0, from: null, to: null };
  }

  const to = new Date(asOfDate);
  to.setHours(0, 0, 0, 0);
  const firstRetentionDay = new Date(from);
  firstRetentionDay.setDate(firstRetentionDay.getDate() + 1);
  const days = Math.max(0, Math.floor((to.getTime() - firstRetentionDay.getTime()) / DAY_MS) + 1);

  return {
    days,
    amount: days * Number(profile.retention_daily_rate),
    from: days > 0 ? firstRetentionDay.toISOString().slice(0, 10) : null,
    to: days > 0 ? to.toISOString().slice(0, 10) : null,
  };
}

export function getVerifiedDamageNetFromCosts(costs: DamageCost[]): number {
  return costs
    .filter((cost) => cost.verified && cost.evidence_document_id)
    .reduce((sum, cost) => (
      sum + Math.max(
        0,
        Number(cost.amount || 0)
          - Number(cost.depreciation_deduction || 0)
          - Number(cost.insurance_recovery || 0),
      )
    ), 0);
}

export function getVerifiedDamageNet(state: LawsuitPreparationState): number {
  return getVerifiedDamageNetFromCosts(state.damageCosts);
}

export function evaluateLegalCaseReadiness(
  state: LawsuitPreparationState,
  today: Date = new Date(),
): LegalCaseReadiness {
  const issues: string[] = [];
  const warnings: string[] = [];
  const strengths: string[] = [];
  const profile = state.litigationProfile;
  const defendantContact = getDefendantContact(state);
  const legalPath = resolveLegalPath(profile, state.contract?.end_date ?? null, state.formalNotices, today);
  issues.push(...legalPath.issues);

  if (!state.contract) issues.push('بيانات العقد غير مكتملة.');
  if (!state.customer?.national_id) issues.push('الرقم الشخصي للمدعى عليه غير مكتمل.');
  if (!state.contract?.vehicle_id || !state.vehicle) issues.push('المركبة غير مرتبطة بالعقد بسجل نظامي.');
  if (!defendantContact.address) issues.push('عنوان تبليغ المدعى عليه غير مسجل.');
  if (defendantContact.emailStatus === 'unavailable') {
    issues.push(DEFENDANT_EMAIL_UNAVAILABLE_ISSUE);
  } else if (defendantContact.emailStatus !== 'verified') {
    issues.push(DEFENDANT_EMAIL_UNKNOWN_ISSUE);
  } else if (!defendantContact.email) {
    issues.push('حالة البريد «متوفر ومتحقق» لكن البريد الإلكتروني للمدعى عليه غير مسجل.');
  } else if (!BASIC_EMAIL_PATTERN.test(defendantContact.email)) {
    issues.push('البريد الإلكتروني للمدعى عليه غير صالح للاستخدام في التبليغ.');
  }
  if (
    profile?.defendant_contact_source === 'verified_manual'
    && !profile.defendant_contact_document_id
  ) {
    issues.push('بيانات التبليغ المدخلة يدوياً تحتاج مستند إثبات مرتبطاً بالعقد.');
  }
  if (!state.calculations || state.calculations.total <= 0 || state.overdueInvoices.length === 0) {
    issues.push('لا توجد مطالبة مالية موجبة من استحقاقات حالّة ومثبتة.');
  }
  if (!state.documents?.contract?.sourceDocumentId) issues.push('نسخة العقد المؤيدة غير مرتبطة بالقضية.');
  if (!profile) issues.push('لم يُحفظ الملف القانوني للقضية بعد.');
  if (profile?.vehicle_custody === 'unknown') {
    warnings.push('حيازة المركبة غير مؤكدة؛ لن يظهر طلب الرد أو تعويض الاحتباس.');
  }
  if (profile?.delivery_handover_date && !profile.delivery_handover_document_id) {
    warnings.push('تاريخ تسليم المركبة مسجل دون محضر مؤيد؛ ستستخدم المذكرة صياغة تحفظية.');
  }
  if (
    profile
    && ['returned', 'recovered_by_company'].includes(profile.vehicle_custody)
    && (!profile.vehicle_returned_at || !profile.vehicle_return_document_id)
  ) {
    issues.push('إثبات رد أو استرداد المركبة غير مكتمل: يلزم التاريخ والمستند المؤيد.');
  }
  if (profile?.vehicle_custody === 'lost') {
    warnings.push('المركبة مسجلة كمفقودة؛ يلزم فحص مسار البلاغ والقيمة السوقية قبل اعتماد الطلبات.');
  }

  if (legalPath.effectivePath === 'judicial_rescission') {
    const hasFormalDemand = state.formalNotices.some((notice) => (
      ['payment_demand', 'vehicle_return_demand'].includes(notice.notice_type)
        && isConfirmedNotice(notice)
    ));
    const hasNoticeException = Boolean(
      profile?.notice_exception_type
        && profile.notice_exception_clause_or_reason?.trim()
        && profile.notice_exception_document_id,
    );
    if (!hasFormalDemand && !hasNoticeException) {
      warnings.push('لا يوجد إعذار سابق أو استثناء موثق؛ ستطلب الصياغة اعتبار إعلان صحيفة الدعوى إعذاراً من تاريخ الإعلان.');
    } else if (hasFormalDemand) {
      strengths.push('يوجد تكليف سابق موثق بالسداد أو الرد.');
    } else {
      strengths.push('حالة الاستثناء من الإعذار موثقة للمراجعة القانونية.');
    }
  }

  const verifiedDamageNet = getVerifiedDamageNet(state);
  const monetaryDelayDamage = state.damageCosts.some((cost) => (
    cost.cost_type === 'monetary_delay_damage'
      && cost.verified
      && Boolean(cost.evidence_document_id)
  ));
  const retention = calculateRetentionClaim(profile, legalPath, today);
  const contractualCompensation = Boolean(
    profile?.contractual_compensation_enabled
      && profile.contractual_compensation_clause_number?.trim()
      && profile.contractual_compensation_clause_text?.trim()
      && profile.contractual_compensation_method
      && Number(profile.contractual_compensation_rate) > 0
      && profile.contractual_compensation_document_id,
  );
  const violations = state.trafficViolations.length > 0
    && state.violationEvidenceDocuments.length > 0;
  if (state.trafficViolations.length > 0 && !violations) {
    warnings.push('المخالفات غير مرتبطة بمستخرج رسمي؛ لن تدخل المطالبة النهائية.');
  }
  if (profile?.contractual_compensation_enabled && !contractualCompensation) {
    warnings.push('التعويض الاتفاقي غير مكتمل الأدلة؛ سيستبعد من المطالبة.');
  }

  if (state.overdueInvoices.length > 0) {
    strengths.push(Number(state.financialClaimSource?.scheduleCount || 0) > 0
      ? 'الاستحقاقات الحالّة محددة دون جمع الأشهر المفوترة مرتين.'
      : 'الفواتير المتأخرة محددة على مستوى كل استحقاق.');
  }
  if (state.documents?.contract?.sourceDocumentId) strengths.push('نسخة العقد مرتبطة بالقضية.');
  if (legalPath.isDocumented) strengths.push('تاريخ انتهاء العلاقة ومساره مثبتان بالمستندات.');
  if (verifiedDamageNet > 0) strengths.push('الأضرار المدرجة مرتبطة بمستندات وتم التحقق منها.');

  const approved = profile?.legal_review_status === 'approved';
  const status = approved && issues.length === 0
    ? 'approved'
    : issues.length > 0
      ? 'not_ready'
      : warnings.length > 0
        ? 'ready_with_reservations'
        : 'ready';
  const score = Math.max(0, Math.min(100, 100 - issues.length * 18 - warnings.length * 7));

  return {
    status,
    score,
    issues,
    warnings,
    strengths,
    legalPath,
    eligibleClaims: {
      rent: Boolean(state.calculations && state.calculations.overdueRent > 0),
      contractualCompensation,
      violations,
      vehicleReturn: profile?.vehicle_custody === 'with_defendant',
      retention: retention.amount > 0,
      documentedDamages: verifiedDamageNet > 0,
      monetaryDelayDamage,
      futureRetention: retention.amount > 0 && profile?.vehicle_custody === 'with_defendant',
    },
  };
}

/**
 * Readiness for freezing the explanatory memo is deliberately narrower than
 * readiness for electronic filing. A documented "unavailable" defendant
 * email is recorded as a reservation, while automatic Taqadi filing remains
 * blocked by evaluateLegalCaseReadiness and the database finalizer.
 */
export function evaluateLegalMemoReadiness(
  state: LawsuitPreparationState,
  today: Date = new Date(),
): LegalCaseReadiness {
  const filingReadiness = evaluateLegalCaseReadiness(state, today);
  const unavailable = filingReadiness.issues.includes(DEFENDANT_EMAIL_UNAVAILABLE_ISSUE);
  if (!unavailable) return filingReadiness;

  const issues = filingReadiness.issues.filter(
    (issue) => issue !== DEFENDANT_EMAIL_UNAVAILABLE_ISSUE,
  );
  const warnings = [
    ...filingReadiness.warnings,
    'بريد المدعى عليه موثق كغير متوفر؛ لا يمنع تثبيت المذكرة، لكنه يمنع الرفع الآلي إلى تقاضي.',
  ];
  const approved = state.litigationProfile?.legal_review_status === 'approved';
  const status = approved && issues.length === 0
    ? 'approved'
    : issues.length > 0
      ? 'not_ready'
      : 'ready_with_reservations';
  const score = Math.max(0, Math.min(100, 100 - issues.length * 18 - warnings.length * 7));

  return { ...filingReadiness, issues, warnings, status, score };
}

export function createDocumentReference(
  contractNumber: string,
  version: number,
  now: Date = new Date(),
): string {
  const compactContract = contractNumber.replace(/[^A-Za-z0-9\u0600-\u06FF]/g, '').slice(-12) || 'CONTRACT';
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `MEMO-${date}-${compactContract}-V${version}`;
}
