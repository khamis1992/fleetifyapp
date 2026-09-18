import type {
  ContractEvidenceDocument,
  LawsuitPreparationState,
  LitigationProfile,
} from '../store/types';
import { DEFAULT_DEFENDANT_SERVICE_ADDRESS } from './legalCaseWorkflow';

export type EvidenceAutomationLevel = 'automatic' | 'review';

export interface EvidenceAutomationCandidate {
  fieldKey: string;
  label: string;
  valueLabel: string;
  patch: Partial<LitigationProfile>;
  level: EvidenceAutomationLevel;
  sourceKind: string;
  sourceRef: string;
  sourceLabel: string;
  sourceDocumentId: string | null;
  confidence: number;
  reason: string;
}

export interface EvidenceAutomationSources {
  vehicleReturn: {
    id: string;
    return_date: string;
    status: string;
    notes: string | null;
  } | null;
  vehiclePricing: {
    id: string;
    daily_rate: number;
    security_deposit: number | null;
    effective_from: string | null;
  } | null;
  /** قالب العقد الافتراضي للشركة — لملء بنود الاختصاص والشروط عند توفر نصه */
  contractTemplate: {
    id: string;
    lateFeeTermsAr: string | null;
    terminationTermsAr: string | null;
    legalClausesAr: unknown;
  } | null;
}

export interface LegalEvidenceAnalysis {
  automatic: EvidenceAutomationCandidate[];
  review: EvidenceAutomationCandidate[];
  missing: string[];
}

const SIGNED_CONTRACT_TYPES = new Set(['signed_contract', 'signed_contract_image']);

export function selectStrongestSignedContract(
  documents: ContractEvidenceDocument[],
): ContractEvidenceDocument | null {
  const verifiedDocuments = documents.filter(
    (document) => document.legal_identity_match_status === 'matched'
      && (document.legal_evidence_state || 'active') === 'active',
  );
  if (verifiedDocuments.length !== 1) return null;
  return verifiedDocuments.find((document) => SIGNED_CONTRACT_TYPES.has(document.document_type))
    ?? verifiedDocuments.find((document) => /عقد|contract/i.test(document.document_name))
    ?? null;
}

function isPast(date: string | null | undefined, today: string): boolean {
  return Boolean(date && date < today);
}

function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildLegalEvidenceAnalysis(
  state: LawsuitPreparationState,
  sources: EvidenceAutomationSources,
  today = new Date().toISOString().slice(0, 10),
): LegalEvidenceAnalysis {
  const automatic: EvidenceAutomationCandidate[] = [];
  const review: EvidenceAutomationCandidate[] = [];
  const missing: string[] = [];
  const profile = state.litigationProfile;
  const customerEmail = state.customer?.email?.trim() || '';
  const customerAddress = state.customer?.address?.trim()
    || DEFAULT_DEFENDANT_SERVICE_ADDRESS;
  const signedContract = selectStrongestSignedContract(state.contractEvidenceDocuments);
  const returnDocument = state.contractEvidenceDocuments.find((document) => document.document_type === 'return_report') ?? null;
  const retentionDocument = state.contractEvidenceDocuments.find((document) => document.document_type === 'retention_rate_evidence') ?? null;

  if (customerEmail) {
    const shouldSync = profile?.defendant_contact_source !== 'verified_manual'
      && (profile?.defendant_email_status !== 'verified'
        || profile?.defendant_contact_source !== 'customer_record');
    automatic.push({
      fieldKey: 'defendant_email',
      label: 'بريد المدعى عليه',
      valueLabel: customerEmail,
      patch: shouldSync
        ? {
            defendant_email: null,
            defendant_email_status: 'verified',
            defendant_contact_source: 'customer_record',
          }
        : {},
      level: 'automatic',
      sourceKind: 'customer_record',
      sourceRef: state.customer?.id || 'customer',
      sourceLabel: 'سجل العميل المتحقق منه',
      sourceDocumentId: null,
      confidence: 1,
      reason: 'البريد محفوظ في السجل الأساسي للعميل ولا يحتاج إلى إعادة إدخاله.',
    });
  } else {
    missing.push('بريد إلكتروني صحيح في سجل العميل');
  }

  automatic.push({
    fieldKey: 'defendant_service_address',
    label: 'عنوان تبليغ المدعى عليه',
    valueLabel: customerAddress,
    patch: profile?.defendant_service_address?.trim()
      ? {}
      : {
          defendant_service_address: customerAddress,
          defendant_contact_source: profile?.defendant_contact_source || 'customer_record',
        },
    level: 'automatic',
    sourceKind: state.customer?.address?.trim() ? 'customer_record' : 'company_default',
    sourceRef: state.customer?.id || 'customer',
    sourceLabel: state.customer?.address?.trim() ? 'سجل العميل' : 'قاعدة عنوان الشركة',
    sourceDocumentId: null,
    confidence: 1,
    reason: state.customer?.address?.trim()
      ? 'العنوان مسجل في ملف العميل وسيظهر مع مصدره للمراجعة.'
      : 'تطبق قاعدة الشركة عنوان «الدوحة قطر» عند غياب عنوان أكثر تفصيلاً.',
  });

  automatic.push({
    fieldKey: 'rent_due_day',
    label: 'يوم استحقاق الأجرة',
    valueLabel: 'اليوم الأول من الشهر',
    patch: profile?.rent_due_day === 1 ? {} : { rent_due_day: 1 },
    level: 'automatic',
    sourceKind: 'billing_rule',
    sourceRef: 'prepaid-first-of-month',
    sourceLabel: 'قاعدة الفواتير التعاقدية',
    sourceDocumentId: null,
    confidence: 1,
    reason: 'الاستحقاقات في النظام مدفوعة مقدماً وتاريخ الاستحقاق هو أول الشهر.',
  });

  if (signedContract) {
    automatic.push({
      fieldKey: 'signed_contract',
      label: 'مستند العقد الموقع',
      valueLabel: signedContract.document_name,
      patch: profile?.termination_supporting_document_id
        ? {}
        : { termination_supporting_document_id: signedContract.id },
      level: 'automatic',
      sourceKind: 'contract_document',
      sourceRef: signedContract.id,
      sourceLabel: signedContract.document_name,
      sourceDocumentId: signedContract.id,
      confidence: 1,
      reason: 'هذا هو أقوى مستند عقد مرتبط مباشرة بالعقد الحالي.',
    });
  } else {
    missing.push('نسخة عقد موقعة مرتبطة بالعقد');
  }

  // محضر التسليم: يلتقط تلقائياً أي مستند محضر تسليم مرتبط بالعقد ويغلق الحقل
  const handoverDocument = state.contractEvidenceDocuments.find(
    (document) => document.document_type === 'handover_report',
  ) ?? null;
  if (handoverDocument && (!profile?.delivery_handover_date || !profile.delivery_handover_document_id)) {
    review.push({
      fieldKey: 'delivery_handover',
      label: 'محضر التسليم وتاريخه',
      valueLabel: `محضر تسليم: ${handoverDocument.document_name}`,
      patch: {
        delivery_handover_document_id: handoverDocument.id,
        delivery_handover_date: profile?.delivery_handover_date || state.contract?.start_date || null,
      },
      level: 'review',
      sourceKind: 'contract_document',
      sourceRef: handoverDocument.id,
      sourceLabel: handoverDocument.document_name,
      sourceDocumentId: handoverDocument.id,
      confidence: 0.92,
      reason: 'محضر التسليم مرفوع في سجل العقد؛ تاريخ التسليم يساوي تاريخ بداية العقد ما لم يثبت خلافه.',
    });
  } else if (!handoverDocument && (!profile?.delivery_handover_date || !profile.delivery_handover_document_id)) {
    missing.push('محضر تسليم المركبة وتاريخه');
  }

  // حيازة المركبة من سجل الأسطول: سجل النظام هو دليل تشغيلي قائم بذاته
  if (!sources.vehicleReturn && profile?.vehicle_custody === 'unknown' && state.vehicle?.status === 'rented') {
    review.push({
      fieldKey: 'vehicle_custody',
      label: 'حيازة المركبة',
      valueLabel: 'ما زالت لدى المدعى عليه بحسب حالة الأسطول',
      patch: { vehicle_custody: 'with_defendant' },
      level: 'review',
      sourceKind: 'vehicle_status',
      sourceRef: state.contract?.vehicle_id || 'vehicle',
      sourceLabel: 'حالة المركبة في سجل الأسطول',
      sourceDocumentId: null,
      confidence: 0.9,
      reason: 'المركبة مسجلة «مؤجرة» في سجل الأسطول ولم يُسجل ردّها؛ سجل النظام قائم مقام الدليل التشغيلي.',
    });
  } else if (profile?.vehicle_custody === 'unknown' && !sources.vehicleReturn && state.vehicle?.status !== 'rented') {
    missing.push('حالة حيازة المركبة من سجل الأسطول أو محضر رد/استرداد');
  }

  // مسار الشرط الفاسخ الموثق: إنذار إنهاء مثبت الوصول انقضت مهلته يحوّل المسار تلقائياً
  const deliveredTermination = state.formalNotices.find(
    (notice) =>
      notice.notice_type === 'termination_notice'
      && notice.delivery_confirmed
      && notice.delivered_on
      && notice.grace_period_days
      && notice.proof_document_id
      && isPast(addDays(notice.delivered_on, notice.grace_period_days), today),
  );
  if (deliveredTermination && profile?.rescission_strategy !== 'documented_termination') {
    const expiryDate = addDays(deliveredTermination.delivered_on!, deliveredTermination.grace_period_days!);
    review.push({
      fieldKey: 'legal_path_documented_termination',
      label: 'المسار القانوني المقترح',
      valueLabel: `إنهاء موثق بإعمال الشرط الفاسخ اعتباراً من ${expiryDate}`,
      patch: {
        rescission_strategy: 'documented_termination',
        termination_type: 'documented_cancellation',
        termination_date: expiryDate,
        termination_date_source: 'official_document',
        termination_date_status: 'confirmed',
        termination_supporting_document_id: deliveredTermination.proof_document_id,
      },
      level: 'review',
      sourceKind: 'formal_notice',
      sourceRef: deliveredTermination.delivered_on!,
      sourceLabel: 'إنذار الإنهاء المؤكد الوصول بمستنده',
      sourceDocumentId: deliveredTermination.proof_document_id,
      confidence: 0.93,
      reason: 'إنذار الإنهاء وصل موثقاً وانقضت مهلته دون وفاء؛ المسار ينتقل من الفسخ القضائي إلى إثبات الإنهاء الموثق.',
    });
  }

  // بنود الاختصاص من قالب العقد الافتراضي للشركة عند توفر نصه — مراجعة بشرية
  const template = sources.contractTemplate;
  if (template) {
    if (template.terminationTermsAr?.trim() && !profile?.termination_clause_text) {
      review.push({
        fieldKey: 'termination_clause_text',
        label: 'نص شرط الإنهاء من القالب',
        valueLabel: `مطابقة نص شرط الفسخ في قالب: ${template.id}`,
        patch: {
          termination_clause_text: template.terminationTermsAr.trim(),
        },
        level: 'review',
        sourceKind: 'contract_template',
        sourceRef: template.id,
        sourceLabel: 'قالب العقد الافتراضي للشركة',
        sourceDocumentId: signedContract?.id ?? null,
        confidence: 0.85,
        reason: 'نص شرط الإنهاء مستخرج من قالب العقد المعتمد؛ يُراجع مرئياً قبل الاعتماد.',
      });
    }
    if (template.lateFeeTermsAr?.trim() && !profile?.payment_clause_number) {
      review.push({
        fieldKey: 'payment_clause_source',
        label: 'مرجع بند السداد من القالب',
        valueLabel: 'بند السداد/الغرامات من قالب العقد',
        patch: {},
        level: 'review',
        sourceKind: 'contract_template',
        sourceRef: template.id,
        sourceLabel: 'قالب العقد الافتراضي للشركة',
        sourceDocumentId: signedContract?.id ?? null,
        confidence: 0.8,
        reason: 'نص بند الغرامات موجود في القالب لكن رقم البند في المستند الموقع يحتاج مطابقة مرئية.',
      });
    }
  }

  const contractEnd = state.contract?.end_date || null;
  if (isPast(contractEnd, today) && !profile?.renewal_applies) {
    if (profile?.rescission_strategy !== 'natural_expiry') {
      review.push({
        fieldKey: 'legal_path_natural_expiry',
        label: 'المسار القانوني المقترح',
        valueLabel: `انتهاء طبيعي بتاريخ ${contractEnd}`,
        patch: {
          rescission_strategy: 'natural_expiry',
          termination_type: 'contract_expired',
          termination_date: contractEnd,
          termination_date_source: 'system_record',
          termination_date_status: 'confirmed',
          termination_supporting_document_id: signedContract?.id ?? null,
        },
        level: 'review',
        sourceKind: 'contract_record',
        sourceRef: state.contract?.id || 'contract',
        sourceLabel: 'تاريخ نهاية العقد وسند العقد',
        sourceDocumentId: signedContract?.id ?? null,
        confidence: signedContract ? 0.98 : 0.82,
        reason: 'انقضى تاريخ نهاية العقد ولا يوجد امتداد معتمد في الملف، لكن المسار يحتاج اعتماداً قانونياً.',
      });
    }
  } else if (contractEnd && contractEnd >= today && profile?.rescission_strategy !== 'judicial_rescission') {
    review.push({
      fieldKey: 'legal_path_future_contract',
      label: 'مراجعة المسار القانوني',
      valueLabel: 'فسخ قضائي لعدم حلول نهاية العقد',
      patch: {
        rescission_strategy: 'judicial_rescission',
        termination_type: 'judicial_rescission',
        termination_date: null,
        termination_date_status: 'requires_judicial_proof',
      },
      level: 'review',
      sourceKind: 'contract_record',
      sourceRef: state.contract?.id || 'contract',
      sourceLabel: 'تاريخ نهاية العقد',
      sourceDocumentId: signedContract?.id ?? null,
      confidence: 0.99,
      reason: 'تاريخ نهاية العقد لم يحل بعد؛ لا يُثبت انتهاء طبيعي أو إنهاء فعلي.',
    });
  }

  if (sources.vehicleReturn && returnDocument) {
    review.push({
      fieldKey: 'vehicle_return',
      label: 'رد المركبة',
      valueLabel: `رد مسجل بتاريخ ${sources.vehicleReturn.return_date}`,
      patch: {
        vehicle_custody: 'returned',
        vehicle_returned_at: sources.vehicleReturn.return_date,
        vehicle_return_document_id: returnDocument.id,
      },
      level: 'review',
      sourceKind: 'contract_vehicle_return',
      sourceRef: sources.vehicleReturn.id,
      sourceLabel: 'سجل رد المركبة المعتمد',
      sourceDocumentId: returnDocument.id,
      confidence: 0.94,
      reason: 'يوجد سجل رد معتمد، لكن يلزم ربط محضر الرد قبل إدراج الواقعة في المذكرة.',
    });
  } else if (sources.vehicleReturn) {
    missing.push('محضر رد أو استرداد لربطه بسجل رد المركبة الموجود');
  }

  const pricing = sources.vehiclePricing;
  if (pricing && pricing.daily_rate > 0 && !profile?.retention_daily_rate && retentionDocument) {
    review.push({
      fieldKey: 'retention_daily_rate',
      label: 'أجرة المثل اليومية',
      valueLabel: `${Number(pricing.daily_rate).toLocaleString('en-US')} ر.ق يومياً`,
      patch: {
        retention_daily_rate: pricing.daily_rate,
        retention_rate_source: 'company_price_list',
        retention_rate_source_ref: `vehicle_pricing:${pricing.id}`,
        retention_rate_source_document_id: retentionDocument.id,
      },
      level: 'review',
      sourceKind: 'vehicle_pricing',
      sourceRef: pricing.id,
      sourceLabel: 'قائمة أسعار المركبة في النظام',
      sourceDocumentId: retentionDocument.id,
      confidence: 0.9,
      reason: 'السعر من قائمة الشركة ويحتاج تثبيت لقطة أو مستند سعر قبل المطالبة به.',
    });
  } else if (pricing && pricing.daily_rate > 0 && !profile?.retention_daily_rate) {
    missing.push('مستند قائمة أسعار أو عروض سوقية لإثبات أجرة المثل');
  }

  if (state.customer?.id) {
    // وديعة الضمان: العقد نفسه هو الأقوى سنداً (بند تعاقدي)، ويصدّقه العقد الموقع
    const contractDeposit = Number(state.contract?.security_deposit || 0);
    if (contractDeposit > 0 && !profile?.security_deposit_amount) {
      review.push({
        fieldKey: 'security_deposit',
        label: 'وديعة الضمان',
        valueLabel: `${contractDeposit.toLocaleString('en-US')} ر.ق`,
        patch: { security_deposit_amount: contractDeposit },
        level: 'review',
        sourceKind: 'contract_record',
        sourceRef: state.contract?.id || 'contract',
        sourceLabel: 'بند وديعة الضمان في العقد الموقع',
        sourceDocumentId: signedContract?.id ?? null,
        confidence: signedContract ? 0.95 : 0.8,
        reason: 'المبلغ مدون في العقد نفسه؛ العقد الموقع هو أقوى مستند لإثباته.',
      });
    } else if (pricing?.security_deposit && !profile?.security_deposit_amount && contractDeposit <= 0) {
      review.push({
        fieldKey: 'security_deposit',
        label: 'وديعة الضمان',
        valueLabel: `${Number(pricing.security_deposit).toLocaleString('en-US')} ر.ق`,
        patch: { security_deposit_amount: pricing.security_deposit },
        level: 'review',
        sourceKind: 'vehicle_pricing',
        sourceRef: pricing.id,
        sourceLabel: 'تسعير المركبة',
        sourceDocumentId: null,
        confidence: 0.72,
        reason: 'المبلغ في تسعير المركبة وليس دليلاً قاطعاً على تحصيله في هذا العقد، لذلك يحتاج اعتماداً.',
      });
    }
  }

  if (state.paymentReminders.count > 0 && state.formalNotices.length === 0) {
    missing.push('إنذار رسمي مثبت الوصول؛ تذكيرات النظام والاتصال الهاتفي لا يكفيان');
  }
  if (state.trafficViolations.length > 0 && state.violationEvidenceDocuments.length === 0) {
    missing.push('مستخرج رسمي يثبت المخالفات المرورية');
  }
  const handoverPlanned = review.some((item) => item.fieldKey === 'delivery_handover');
  if (!handoverPlanned && (!profile?.delivery_handover_date || !profile.delivery_handover_document_id)) {
    missing.push('محضر تسليم المركبة وتاريخه');
  }

  return { automatic, review, missing: [...new Set(missing)] };
}

/**
 * قاعدة القبول التلقائي للمقترحات ذات المستوى «review»:
 * ثقة لا تقل عن 0.9، وسندها إما مستند مرفق أو سجل نظام رسمي (حالة الأسطول).
 * دون ذلك تبقى للمراجعة البشرية مع سجل قرارها.
 */
export const AUTO_ACCEPT_CONFIDENCE = 0.9;

const AUTO_ACCEPT_SYSTEM_RECORD_KINDS = new Set(['vehicle_status', 'billing_rule', 'contract_record']);

export function selectAutoAcceptable(
  candidates: EvidenceAutomationCandidate[],
): EvidenceAutomationCandidate[] {
  return candidates.filter(
    (candidate) =>
      candidate.confidence >= AUTO_ACCEPT_CONFIDENCE
      && (
        candidate.sourceDocumentId !== null
        || AUTO_ACCEPT_SYSTEM_RECORD_KINDS.has(candidate.sourceKind)
      ),
  );
}

export function inferEvidenceDocumentType(fileName: string): string {
  const normalized = fileName.toLowerCase();
  if (/تسليم|handover|delivery/.test(normalized)) return 'handover_report';
  if (/استرداد|رد|return|recovery/.test(normalized)) return 'return_report';
  if (/إنذار|تبليغ|وصول|notice|delivery proof/.test(normalized)) return 'formal_notice_proof';
  if (/أجرة المثل|سعر|عرض|rate|quote|pricing/.test(normalized)) return 'retention_rate_evidence';
  if (/إصلاح|سحب|تخزين|فاتورة|damage|repair|towing|invoice/.test(normalized)) return 'damage_evidence';
  if (/عقد|بند|شرط|contract|clause/.test(normalized)) return 'contract_clause_evidence';
  return 'legal_evidence';
}
