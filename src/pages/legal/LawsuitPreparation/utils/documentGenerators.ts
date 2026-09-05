/**
 * Document Generation Utilities
 * أدوات توليد المستندات
 */

import { supabase } from '@/integrations/supabase/client';
import {
  generateLegalComplaintHTML,
  type LegalDocumentData,
} from '@/utils/legal-document-generator';
import {
  generateClaimsStatementHtml,
  generateDocumentsListHtml,
  generateCriminalComplaintHtml,
  generateViolationsTransferHtml,
  type ClaimsStatementData,
} from '@/utils/official-letter-generator';
import {
  calculateRetentionClaim,
  evaluateLegalCaseReadiness,
  getCriminalComplaintEligibility,
  getDefendantContact,
  getVerifiedDamageNet,
} from './legalCaseWorkflow';
import { formatCustomerName } from '@/utils/formatCustomerName';
import { lawsuitService } from '@/services/LawsuitService';
import { calculateDelinquencyAmounts } from '@/utils/calculateDelinquencyAmounts';
import { normalizeLegalIdentityMatchStatus } from '@/services/legalContractIdentityVerifier';
import { createInitialState } from '../store/reducer';
import { getLawsuitClaimAmounts } from './claimAmounts';
import {
  getEffectiveLegalIdentityMatchStatus,
  selectLegalContractDocument,
} from './contractDocumentSelection';
import { loadLegalClaimProjection } from './legalClaimSources';
import type {
  LawsuitPreparationState,
  DocumentsState,
  LegalMemoSnapshot,
  LegalCaseSummary,
  ViolationEvidenceDocument,
} from '../store';
import { isTrafficViolationsOnlyScope } from '@/types/legalClaimScope';

// ==========================================
// Helper Functions
// ==========================================

function formatDateForDocument(value: string | null | undefined): string {
  if (!value) return '';

  // تجنب انزياح المنطقة الزمنية للتواريخ بصيغة ISO (YYYY-MM-DD)
  const isoDateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoDateOnly) {
    return `${isoDateOnly[3]}/${isoDateOnly[2]}/${isoDateOnly[1]}`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-GB');
}

const NOTICE_METHOD_LABELS: Record<string, string> = {
  registered_mail: 'البريد المسجل',
  email: 'البريد الإلكتروني',
  national_address: 'العنوان الوطني',
  courier: 'مخلص',
  whatsapp: 'واتساب',
  other: 'وسيلة مثبتة',
};

const RETENTION_SOURCE_LABELS: Record<string, string> = {
  company_price_list: 'قائمة الأسعار المعتمدة للشركة',
  market_quotes: 'عروض أسعار سوقية لمركبات مماثلة',
  recent_contracts: 'عقود إيجار حديثة لمركبات مماثلة',
};

/**
 * بيانات المذكرة الشارحة من حالة تجهيز الدعوى — المصدر الوحيد لبيانات المذكرة.
 *
 * قواعد ملزمة:
 * - أيام التأخير تُحتسب من أقدم فاتورة متأخرة غير مسددة، لا من تاريخ بداية العقد.
 * - الأضرار تُمرر فقط من بنود متحقق منها بسند مستند؛ لا يوجد أي نسبة افتراضية.
 * - بيانات الملف التقاضي الموثق (legal_case_litigation_profile) هي المرجع الوحيد
 *   للحيازة والإنهاء؛ لا تُستنتج الحيازة من حالة المركبة التشغيلية.
 */
export function buildMemoDocumentData(
  state: LawsuitPreparationState
): LegalDocumentData {
  const { contract, customer, vehicle, calculations } = state;

  if (!contract || !calculations) {
    throw new Error('بيانات غير مكتملة');
  }

  const profile = state.litigationProfile;
  const trafficOnlyClaim = isTrafficViolationsOnlyScope(state.legalCase?.claim_scope);

  const remainingInvoices = (trafficOnlyClaim ? [] : state.overdueInvoices).filter(
    (inv) => (inv.total_amount || 0) - (inv.paid_amount || 0) > 0
  );
  const datedInvoices = remainingInvoices
    .map((inv) => ({ raw: inv.due_date, time: new Date(inv.due_date).getTime() }))
    .filter((item) => Number.isFinite(item.time));

  const oldestInvoice =
    datedInvoices.length > 0
      ? datedInvoices.reduce((oldest, item) => (item.time < oldest.time ? item : oldest))
      : null;
  const newestInvoice =
    datedInvoices.length > 0
      ? datedInvoices.reduce((newest, item) => (item.time > newest.time ? item : newest))
      : null;

  const unpaidPeriodFrom = oldestInvoice
    ? formatDateForDocument(oldestInvoice.raw)
    : undefined;
  const unpaidPeriodTo = newestInvoice
    ? formatDateForDocument(newestInvoice.raw)
    : undefined;

  const grossInvoicesTotal = remainingInvoices.reduce(
    (sum, inv) => sum + (inv.total_amount || 0),
    0
  );
  const paidTotal = remainingInvoices.reduce(
    (sum, inv) => sum + Number(inv.paid_amount || 0),
    0
  );

  // أيام التأخير = من أقدم فاتورة متأخرة حتى اليوم (وليس من بداية العقد)
  const daysOverdue =
    oldestInvoice && calculations.overdueRent > 0
      ? Math.max(0, Math.floor((Date.now() - oldestInvoice.time) / (1000 * 60 * 60 * 24)))
      : 0;

  const customerName = formatCustomerName(customer);

  const vehicleCustody = profile?.vehicle_custody ?? 'unknown';
  const readiness = evaluateLegalCaseReadiness(state);
  const defendantContact = getDefendantContact(state);
  const retentionClaim = calculateRetentionClaim(profile, readiness.legalPath);

  // مصاريف الأضرار: المتحقق منه بسند مستند فقط
  const verifiedCosts = (trafficOnlyClaim ? [] : state.damageCosts ?? []).filter(
    (cost) => cost.verified && Boolean(cost.evidence_document_id),
  );
  const verifiedDamages = trafficOnlyClaim ? 0 : getVerifiedDamageNet(state);

  return {
    caseNumber: state.legalCase?.case_number || undefined,
    filingDate: state.legalCase?.filing_date
      ? formatDateForDocument(state.legalCase.filing_date)
      : undefined,
    // النسخة الحية تظل مسودة. المرجع الرسمي يثبت داخل لقطة غير قابلة للتعديل
    // ولا يعاد استخدامه مع بيانات لاحقة متغيرة.
    documentReference: `DRAFT-${contract.contract_number}`,
    claimScope: state.legalCase?.claim_scope || 'full_outstanding',
    customer: {
      customer_name: customerName,
      customer_code: customer?.id || '',
      id_number: customer?.national_id || '',
      phone: customer?.phone || '',
      email: defendantContact.email,
      nationality: customer?.nationality || null,
      address: defendantContact.address || null,
      days_overdue: daysOverdue,
      late_penalty: calculations.lateFees,
      overdue_amount: calculations.overdueRent,
      violations_amount: calculations.violationsFines,
      violations_count: calculations.violationsCount,
      total_debt: calculations.total,
    },
    companyInfo: {
      name_ar: 'شركة العراف لتأجير السيارات',
      name_en: 'Al-Araf Car Rental',
      address: 'أم صلال محمد – الشارع التجاري – مبنى (79) – الطابق الأول – مكتب (2)',
      cr_number: '146832',
    },
    vehicleInfo: {
      plate: vehicle?.plate_number || (contract as any).license_plate || 'غير محدد',
      make: vehicle?.make || '',
      model: vehicle?.model || '',
      year: vehicle?.year || 0,
      vin: vehicle?.vin || null,
      color: vehicle?.color || null,
    },
    contractInfo: {
      contract_number: contract.contract_number,
      start_date: formatDateForDocument(contract.start_date),
      end_date: formatDateForDocument(contract.end_date),
      monthly_rent: Number(contract.monthly_amount) || 0,
      rent_due_day: profile?.rent_due_day ?? undefined,
    },
    contractClauses: profile ? {
      payment: profile.payment_clause_number,
      return: profile.return_clause_number,
      violations: profile.violations_clause_number,
    } : undefined,
    unpaidPeriodFrom,
    unpaidPeriodTo,
    grossInvoicesTotal,
    paidTotal,
    reminders: state.paymentReminders,
    vehicleCustody,
    vehicleReturnedAt: profile?.vehicle_returned_at
      ? formatDateForDocument(profile.vehicle_returned_at)
      : null,    // مسار الإنهاء من الملف التقاضي؛ المولد يتحقق من اكتمال الأدلة ويرجع للفسخ القضائي عند النقص
    handoverInfo: profile?.delivery_handover_date
      ? {
          date: formatDateForDocument(profile.delivery_handover_date),
          documented: Boolean(profile.delivery_handover_document_id),
        }
      : undefined,
    returnDocumented: Boolean(profile?.vehicle_return_document_id),
    terminationPath: readiness.legalPath.effectivePath === 'natural_expiry'
      ? 'natural_expiry'
      : readiness.legalPath.effectivePath === 'documented_termination'
        ? 'documented'
        : 'judicial',
    terminationInfo: readiness.legalPath.effectiveTerminationDate && profile?.termination_type
      ? {
          type: profile.termination_type,
          date: formatDateForDocument(readiness.legalPath.effectiveTerminationDate),
          status: 'confirmed',
        }
      : undefined,
    terminationClause: profile?.termination_clause_number && profile.termination_clause_text
      ? {
          number: profile.termination_clause_number,
          text: profile.termination_clause_text,
        }
      : undefined,
    noticeException: profile?.notice_exception_type
      && profile.notice_exception_clause_or_reason
      && profile.notice_exception_document_id
      ? {
          type: profile.notice_exception_type,
          reason: profile.notice_exception_clause_or_reason,
        }
      : undefined,
    formalNotices: (trafficOnlyClaim ? [] : state.formalNotices ?? []).map((notice) => ({
      noticeType: notice.notice_type,
      sentOn: notice.sent_on,
      deliveredOn: notice.delivered_on,
      confirmed: notice.delivery_confirmed,
      proofDocumentId: notice.proof_document_id,
      graceDays: notice.grace_period_days,
      methodLabel: NOTICE_METHOD_LABELS[notice.delivery_method] || 'وسيلة مثبتة',
    })),
    securityDeposit: !trafficOnlyClaim && profile && profile.security_deposit_amount
      ? {
          amount: Number(profile.security_deposit_amount),
          applyToSettlement: Boolean(profile.apply_security_deposit),
        }
      : undefined,
    retentionRate: !trafficOnlyClaim && profile?.retention_daily_rate
      && profile.retention_rate_source_document_id
      && profile.retention_rate_source_ref
      ? {
          daily: Number(profile.retention_daily_rate),
          sourceLabel: RETENTION_SOURCE_LABELS[profile.retention_rate_source || ''] || 'ما يثبته المستندات',
          sourceRef: profile.retention_rate_source_ref,
        }
      : undefined,
    retentionClaim: !trafficOnlyClaim && retentionClaim.amount > 0 ? retentionClaim : undefined,
    contractualCompensation: !trafficOnlyClaim && readiness.eligibleClaims.contractualCompensation
      ? {
          amount: calculations.lateFees,
          clauseNumber: profile!.contractual_compensation_clause_number!,
          clauseText: profile!.contractual_compensation_clause_text!,
          method: profile!.contractual_compensation_method!,
          rate: Number(profile!.contractual_compensation_rate),
          units: calculations.contractualCompensationUnits ?? 0,
        }
      : undefined,
    damages: verifiedDamages > 0 ? verifiedDamages : undefined,
    damageCostItems: verifiedCosts.length > 0
      ? verifiedCosts.map((cost) => ({
          type: cost.cost_type,
          description: cost.description,
          amount: Math.max(
            0,
            Number(cost.amount || 0)
              - Number(cost.depreciation_deduction || 0)
              - Number(cost.insurance_recovery || 0),
          ),
        }))
      : undefined,
  };
}

function stableMemoValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableMemoValue);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const child = (value as Record<string, unknown>)[key];
        if (child !== undefined) result[key] = stableMemoValue(child);
        return result;
      }, {});
  }
  return value;
}

/** يمنع رفع قضية تغيرت وقائعها أو أرقامها بعد اعتماد آخر لقطة. */
export function isMemoSnapshotCurrent(
  state: LawsuitPreparationState,
  snapshot: LegalMemoSnapshot | undefined,
): boolean {
  if (!snapshot) return false;
  // This predicate runs while the preparation page is still loading its
  // contract/calculation queries. An approved snapshot may arrive first, so
  // building the live memo can legitimately be impossible for a short time.
  // Treat that state as "not current" instead of crashing the whole route.
  try {
    const current = JSON.parse(JSON.stringify(buildMemoDocumentData(state))) as Record<string, unknown>;
    const frozen = JSON.parse(JSON.stringify(snapshot.payload)) as Record<string, unknown>;
    for (const key of ['documentReference', 'caseNumber', 'filingDate']) {
      delete current[key];
      delete frozen[key];
    }
    return JSON.stringify(stableMemoValue(current)) === JSON.stringify(stableMemoValue(frozen));
  } catch {
    return false;
  }
}

/** يعيد النسخة المعتمدة إن كانت لا تزال مطابقة، وإلا يعيد المسودة الحية. */
export function getMemoDocumentDataForGeneration(
  state: LawsuitPreparationState,
): LegalDocumentData {
  const approvedSnapshot = state.memoSnapshots?.find(
    (snapshot) => snapshot.readiness_status === 'approved',
  );
  if (approvedSnapshot && isMemoSnapshotCurrent(state, approvedSnapshot)) {
    return approvedSnapshot.payload as unknown as LegalDocumentData;
  }
  return buildMemoDocumentData(state);
}

// ==========================================
// Helper Functions
// ==========================================

function createBlobUrl(html: string): string {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return URL.createObjectURL(blob);
}

const lawsuitDocumentTypeMap: Partial<Record<keyof DocumentsState, string>> = {
  memo: 'explanatory_memo',
  claims: 'claims_statement',
  docsList: 'documents_list',
  criminalComplaint: 'criminal_complaint',
  violationsTransfer: 'violations_transfer',
};

function saveDocumentToStorage(
  companyId: string,
  contractId: string,
  documentType: keyof DocumentsState,
  html: string,
  userId?: string
): Promise<void> {
  const databaseDocumentType = lawsuitDocumentTypeMap[documentType];
  if (!databaseDocumentType) return Promise.resolve();

  // Fire and forget - don't wait for this
  supabase
    .from('lawsuit_documents')
    .upsert({
      company_id: companyId,
      contract_id: contractId,
      document_type: databaseDocumentType,
      document_name: getDocumentName(documentType),
      html_content: html,
      created_by: userId,
    }, {
      onConflict: 'contract_id,document_type'
    })
    .then(({ error }) => {
      if (error) console.error(`Error saving ${documentType}:`, error);
    });
  
  return Promise.resolve();
}

function getDocumentName(docType: keyof DocumentsState): string {
  const names: Record<string, string> = {
    memo: 'المذكرة الشارحة',
    claims: 'كشف المطالبات المالية',
    docsList: 'كشف المستندات المرفوعة',
    violations: 'كشف المخالفات المرورية',
    criminalComplaint: 'بلاغ جنائي بالامتناع عن رد المركبة',
    violationsTransfer: 'طلب تحويل المخالفات',
  };
  return names[docType] || 'مستند';
}

export function buildViolationEvidenceDocumentEntries(
  evidenceDocuments: ViolationEvidenceDocument[]
) {
  return evidenceDocuments.map((document, index) => ({
    name: evidenceDocuments.length > 1
      ? `تقرير مخالفات وزارة الداخلية (${index + 1} من ${evidenceDocuments.length})`
      : 'تقرير مخالفات وزارة الداخلية',
    status: 'مرفق' as const,
    url: document.url,
    type: document.mimeType?.includes('pdf') ? 'pdf' : 'file',
  }));
}

// ==========================================
// Document Generators
// ==========================================

/**
 * Generate Explanatory Memo (المذكرة الشارحة)
 */
export async function generateExplanatoryMemo(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { companyId, contractId } = state;

  const documentData = getMemoDocumentDataForGeneration(state);
  const html = generateLegalComplaintHTML(documentData);
  const url = createBlobUrl(html);

  // Save to storage (async, don't wait)
  if (companyId && contractId) {
    saveDocumentToStorage(
      companyId,
      contractId,
      'memo',
      html,
      undefined // user id can be passed if needed
    );
  }

  return { url, html };
}

/**
 * محمل المصدر الموحد للمذكرة خارج شاشة التجهيز (التوليد الجماعي وصفحة الدعاوى).
 * يعيد بناء الحالة نفسها من قاعدة البيانات ثم يمررها إلى buildMemoDocumentData،
 * وبذلك لا توجد معادلات أو صياغة موازية خارج المسار المعتمد.
 */
export async function loadCanonicalLawsuitState(
  companyId: string,
  contractId: string,
): Promise<LawsuitPreparationState> {
  const [
    contractResult,
    claimProjection,
    violationsResult,
    profileResult,
    noticesResult,
    damagesResult,
    documentsResult,
    remindersResult,
    legalCaseResult,
    snapshotsResult,
  ] = await Promise.all([
    supabase
      .from('contracts')
      .select('*, customers(*), vehicles(*)')
      .eq('id', contractId)
      .eq('company_id', companyId)
      .single(),
    loadLegalClaimProjection(contractId, companyId),
    supabase
      .from('penalties')
      .select('id, penalty_number, penalty_date, violation_type, location, amount, status, payment_status')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .neq('payment_status', 'paid')
      .neq('status', 'cancelled'),
    supabase
      .from('legal_case_litigation_profile')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('legal_case_formal_notices')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('sent_on'),
    supabase
      .from('legal_case_damage_costs')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('created_at'),
    supabase
      .from('contract_documents')
      .select('id, document_name, document_type, file_path, mime_type, created_at, legal_identity_match_status, legal_evidence_state, legal_identity_expected_id, legal_identity_extracted_id')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
    supabase
      .from('reminder_history')
      .select('sent_at, reminder_type')
      .eq('contract_id', contractId)
      .eq('success', true)
      .order('sent_at', { ascending: false }),
    supabase
      .from('legal_cases')
      .select('id, case_number, case_reference, filing_date, case_status, workflow_stage, claim_scope')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('legal_case_memo_snapshots')
      .select('*')
      .eq('contract_id', contractId)
      .eq('company_id', companyId)
      .order('version', { ascending: false }),
  ]);

  const firstError = [
    contractResult.error,
    violationsResult.error,
    profileResult.error,
    noticesResult.error,
    damagesResult.error,
    documentsResult.error,
    remindersResult.error,
    legalCaseResult.error,
    snapshotsResult.error,
  ].find(Boolean);
  if (firstError) throw firstError;

  const contractRow = contractResult.data;
  if (!contractRow) throw new Error('لم يتم العثور على العقد المطلوب لتوليد المذكرة');
  const state = createInitialState(contractId);
  const customer = Array.isArray(contractRow.customers)
    ? contractRow.customers[0] || null
    : contractRow.customers;
  const vehicle = Array.isArray(contractRow.vehicles)
    ? contractRow.vehicles[0] || null
    : contractRow.vehicles;
  state.companyId = companyId;
  state.contract = contractRow as typeof state.contract;
  state.customer = customer as typeof state.customer;
  state.vehicle = vehicle as typeof state.vehicle;
  state.overdueInvoices = claimProjection.rows;
  state.financialClaimSource = claimProjection.summary;
  state.trafficViolations = (violationsResult.data || []).map((violation) => ({
    id: violation.id,
    violation_number: violation.penalty_number,
    violation_date: violation.penalty_date,
    violation_type: violation.violation_type,
    location: violation.location,
    fine_amount: Number(violation.amount || 0),
    total_amount: Number(violation.amount || 0),
    status: violation.status || 'pending',
  }));
  state.litigationProfile = profileResult.data as typeof state.litigationProfile;
  state.formalNotices = (noticesResult.data || []) as typeof state.formalNotices;
  state.damageCosts = (damagesResult.data || []) as typeof state.damageCosts;
  state.contractEvidenceDocuments = (documentsResult.data || []).map((document) => ({
    id: document.id,
    document_name: document.document_name,
    document_type: document.document_type,
    file_path: document.file_path,
    mime_type: document.mime_type,
    legal_identity_match_status: normalizeLegalIdentityMatchStatus(
      getEffectiveLegalIdentityMatchStatus(document),
    ),
    legal_identity_expected_id: document.legal_identity_expected_id,
    legal_identity_extracted_id: document.legal_identity_extracted_id,
  }));
  state.violationEvidenceDocuments = state.contractEvidenceDocuments
    .filter((document) => document.document_type === 'violations_proof')
    .map((document) => ({ id: document.id, name: document.document_name, url: '', mimeType: document.mime_type }));
  const signedContract = selectLegalContractDocument(documentsResult.data || []);
  if (signedContract) state.documents.contract.sourceDocumentId = signedContract.id;
  state.paymentReminders = {
    count: remindersResult.data?.length || 0,
    lastSentDate: remindersResult.data?.[0]?.sent_at || null,
    sendMethods: [...new Set((remindersResult.data || []).map((item) => item.reminder_type).filter(Boolean))] as string[],
  };
  state.legalCase = legalCaseResult.data ? {
    ...legalCaseResult.data,
    case_number: legalCaseResult.data.case_number || '',
    case_status: legalCaseResult.data.case_status || 'draft',
    workflow_stage: legalCaseResult.data.workflow_stage || 'preparation',
    claim_scope: legalCaseResult.data.claim_scope || 'full_outstanding',
  } as LegalCaseSummary : null;
  state.memoSnapshots = (snapshotsResult.data || []) as unknown as LegalMemoSnapshot[];

  const trafficOnlyClaim = isTrafficViolationsOnlyScope(state.legalCase?.claim_scope);
  const verifiedDamages = trafficOnlyClaim ? 0 : getVerifiedDamageNet(state);
  const profile = state.litigationProfile;
  const compensation = !trafficOnlyClaim && profile?.contractual_compensation_enabled
    && profile.contractual_compensation_method
    && profile.contractual_compensation_document_id
    && profile.contractual_compensation_clause_number?.trim()
    && profile.contractual_compensation_clause_text?.trim()
    && Number(profile.contractual_compensation_rate) > 0
    ? {
        enabled: true,
        method: profile.contractual_compensation_method,
        rate: Number(profile.contractual_compensation_rate),
        cap: profile.contractual_compensation_cap,
      }
    : null;
  const calculations = calculateDelinquencyAmounts(
    (trafficOnlyClaim ? [] : state.overdueInvoices).map((invoice) => ({
      ...invoice,
      invoice_number: invoice.invoice_number || undefined,
      total_amount: Number(invoice.total_amount || 0),
      paid_amount: Number(invoice.paid_amount || 0),
    })),
    (state.violationEvidenceDocuments.length > 0 ? state.trafficViolations : []).map((violation) => ({
      ...violation,
      violation_number: violation.violation_number || undefined,
      fine_amount: Number(violation.fine_amount || 0),
      total_amount: Number(violation.total_amount || 0),
    })),
    { documentedDamagesAmount: verifiedDamages, contractualCompensation: compensation },
  );
  const readiness = evaluateLegalCaseReadiness(state);
  const retention = trafficOnlyClaim
    ? { amount: 0, days: 0, from: null, to: null }
    : calculateRetentionClaim(profile, readiness.legalPath);
  const deposit = !trafficOnlyClaim && profile?.apply_security_deposit
    ? Number(profile.security_deposit_amount || 0)
    : 0;
  const total = getLawsuitClaimAmounts(
    { ...calculations, retentionCompensation: retention.amount },
    { securityDepositDeduction: deposit },
  ).cashClaimAmount;
  state.calculations = {
    ...calculations,
    retentionCompensation: retention.amount,
    securityDepositDeduction: deposit,
    total,
    amountInWords: lawsuitService.convertAmountToWords(total),
  };

  return state;
}

export async function loadCanonicalMemoDocumentData(
  companyId: string,
  contractId: string,
): Promise<LegalDocumentData> {
  return buildMemoDocumentData(
    await loadCanonicalLawsuitState(companyId, contractId),
  );
}

export async function generateCanonicalMemoHtml(
  companyId: string,
  contractId: string,
): Promise<string> {
  return generateLegalComplaintHTML(
    getMemoDocumentDataForGeneration(
      await loadCanonicalLawsuitState(companyId, contractId),
    ),
  );
}

/**
 * بيانات كشف المطالبات — المصدر الموحد الذي يطابق المذكرة وقيمة تقاضي:
 * صافي الإيجارات + الغرامات التعاقدية + المخالفات + مصاريف متحقق منها،
 * ناقصاً وديعة الضمان عند تطبيقها.
 */
export function buildClaimsStatementData(
  state: LawsuitPreparationState
): ClaimsStatementData {
  const { contract, customer, calculations } = state;

  if (!contract || !calculations) {
    throw new Error('بيانات غير مكتملة');
  }
  const trafficOnlyClaim = isTrafficViolationsOnlyScope(state.legalCase?.claim_scope);

  const invoicesData = (trafficOnlyClaim ? [] : state.overdueInvoices).map((inv) => {
    const daysLate = Math.floor(
      (new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const penalty = calculations.invoiceLateFees.find(
      (item) => item.invoiceId === inv.id,
    )?.lateFee || 0;

    return {
      invoiceNumber: inv.invoice_number || '-',
      dueDate: inv.due_date,
      totalAmount: inv.total_amount || 0,
      paidAmount: inv.paid_amount || 0,
      daysLate,
      penalty,
    };
  });

  const violationsData = (state.violationEvidenceDocuments.length > 0
    ? state.trafficViolations
    : []).map((v) => ({
    violationNumber: v.violation_number || '-',
    violationDate: v.violation_date || '',
    violationType: v.violation_type || 'غير محدد',
    location: v.location || '-',
    fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
  }));

  // مصاريف الأضرار: المتحقق منه بسند مستند فقط (متطابق مع المذكرة)
  const verifiedCosts = (trafficOnlyClaim ? [] : state.damageCosts).filter((cost) => cost.verified);
  const damageCosts = verifiedCosts.map((cost) => ({
    description: cost.description,
    amount: Math.max(
      0,
      Number(cost.amount || 0)
        - Number(cost.insurance_recovery || 0)
        - Number(cost.depreciation_deduction || 0),
    ),
  }));

  // وديعة الضمان: تُخصم فقط بقرار صريح وبحد أقصى قيمة المطالبة قبل الخصم
  const depositAmount = trafficOnlyClaim
    ? 0
    : Number(state.litigationProfile?.security_deposit_amount || 0);
  const claimBeforeDeduction =
    calculations.overdueRent
      + calculations.lateFees
      + calculations.violationsFines
      + calculations.damagesFee
      + calculations.retentionCompensation;
  const depositApplied =
    Boolean(state.litigationProfile?.apply_security_deposit) && depositAmount > 0
      ? Math.min(depositAmount, claimBeforeDeduction)
      : 0;
  const netClaimTotal = Math.max(0, claimBeforeDeduction - depositApplied);

  return {
    customerName: formatCustomerName(customer),
    nationalId: customer?.national_id || '-',
    phone: customer?.phone || '',
    contractNumber: contract.contract_number,
    contractStartDate: formatDateForDocument(contract.start_date),
    contractEndDate: formatDateForDocument(contract.end_date),
    invoices: invoicesData,
    violations: violationsData,
    totalOverdue: claimBeforeDeduction,
    contractualCompensation: calculations.lateFees > 0 ? {
      amount: calculations.lateFees,
      clauseNumber: state.litigationProfile?.contractual_compensation_clause_number || undefined,
    } : null,
    retentionCompensation: calculations.retentionCompensation > 0 ? {
      amount: calculations.retentionCompensation,
      days: calculateRetentionClaim(
        state.litigationProfile,
        evaluateLegalCaseReadiness(state).legalPath,
      ).days,
      sourceLabel: state.litigationProfile?.retention_rate_source
        ? RETENTION_SOURCE_LABELS[state.litigationProfile.retention_rate_source]
        : undefined,
    } : null,
    damageCosts: damageCosts.length > 0 ? damageCosts : undefined,
    securityDepositDeduction: depositApplied > 0 ? { amount: depositApplied } : null,
    netClaimTotal,
    amountInWords: lawsuitService.convertAmountToWords(netClaimTotal),
    caseTitle: state.taqadiData?.caseTitle,
  };
}

/**
 * Generate Claims Statement (كشف المطالبات المالية)
 */
export async function generateClaimsStatement(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { companyId, contractId } = state;

  const html = generateClaimsStatementHtml(buildClaimsStatementData(state));
  const url = createBlobUrl(html);

  // Save to storage
  if (companyId && contractId) {
    saveDocumentToStorage(companyId, contractId, 'claims', html);
  }

  return { url, html };
}

/**
 * Generate Documents List (كشف المستندات المرفوعة)
 */
export async function generateDocumentsList(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, documents, taqadiData, companyDocuments } = state;
  
  if (!contract || !taqadiData) {
    throw new Error('بيانات غير مكتملة');
  }
  
  const customerName = formatCustomerName(customer);
  
  // Build documents list in the required order
  const docsList: { 
    name: string; 
    status: 'مرفق' | 'غير مرفق'; 
    url?: string; 
    type?: string;
    htmlContent?: string;
  }[] = [];
  
  // Prepare claims statement (generate fresh when possible)
  let freshClaimsHtml: string | undefined;
  if (state.calculations) {
    // إعادة التوليد من نفس المصدر الموحد لضمان تطابق الأرقام مع المذكرة وتقاضي
    freshClaimsHtml = generateClaimsStatementHtml(buildClaimsStatementData(state));
  }

  // Prepare explanatory memo (generate fresh when possible)
  let freshMemoHtml: string | undefined;
  if (state.calculations) {
    freshMemoHtml = generateLegalComplaintHTML(getMemoDocumentDataForGeneration(state));
  }
  
  // 1) البطاقة الشخصية للمخول بالتوقيع
  const representativeIdDoc = companyDocuments.find(d => d.document_type === 'representative_id');
  docsList.push(
    representativeIdDoc
      ? {
          name: 'البطاقة الشخصية للمخول بالتوقيع',
          status: 'مرفق',
          url: representativeIdDoc.file_url,
          type: 'pdf',
        }
      : {
          name: 'البطاقة الشخصية للمخول بالتوقيع',
          status: 'غير مرفق',
        }
  );

  // 2) كشف المطالبات المالية
  docsList.push(
    freshClaimsHtml || documents.claims.htmlContent || documents.claims.url
      ? {
          name: 'كشف المطالبات المالية',
          status: 'مرفق',
          type: documents.claims.url && !freshClaimsHtml && !documents.claims.htmlContent ? 'pdf' : 'html',
          url: documents.claims.url || undefined,
          htmlContent: freshClaimsHtml || documents.claims.htmlContent || undefined,
        }
      : {
          name: 'كشف المطالبات المالية',
          status: 'غير مرفق',
        }
  );

  // 3) نسخة من عقد الايجار
  docsList.push(
    documents.contract.status === 'ready' && documents.contract.url
      ? {
          name: 'نسخة من عقد الايجار',
          status: 'مرفق',
          url: documents.contract.url,
          type: 'pdf',
        }
      : {
          name: 'نسخة من عقد الايجار',
          status: 'غير مرفق',
        }
  );

  // 4) مذكرة شارحة
  docsList.push(
    freshMemoHtml || documents.memo.htmlContent || documents.memo.url
      ? {
          name: 'مذكرة شارحة',
          status: 'مرفق',
          url: documents.memo.url || undefined,
          type: documents.memo.url && !freshMemoHtml && !documents.memo.htmlContent ? 'pdf' : 'html',
          htmlContent: freshMemoHtml || documents.memo.htmlContent || undefined,
        }
      : {
          name: 'مذكرة شارحة',
          status: 'غير مرفق',
        }
  );

  // 5) نسخة من السجل التجاري
  const commercialRegisterDoc = companyDocuments.find(d => d.document_type === 'commercial_register');
  docsList.push(
    commercialRegisterDoc
      ? {
          name: 'نسخة من السجل التجاري',
          status: 'مرفق',
          url: commercialRegisterDoc.file_url,
          type: 'pdf',
        }
      : {
          name: 'نسخة من السجل التجاري',
          status: 'غير مرفق',
        }
  );

  // 6) صورة من قيد المنشاءه
  const establishmentRecordDoc = companyDocuments.find(d => d.document_type === 'establishment_record');
  docsList.push(
    establishmentRecordDoc
      ? {
          name: 'صورة من قيد المنشاءه',
          status: 'مرفق',
          url: establishmentRecordDoc.file_url,
          type: 'pdf',
        }
      : {
          name: 'صورة من قيد المنشاءه',
          status: 'غير مرفق',
        }
  );

  // 7) شهادة IBAN
  const ibanCertificateDoc = companyDocuments.find(d => d.document_type === 'iban_certificate');
  docsList.push(
    ibanCertificateDoc
      ? {
          name: 'شهادة IBAN',
          status: 'مرفق',
          url: ibanCertificateDoc.file_url,
          type: 'pdf',
        }
      : {
          name: 'شهادة IBAN',
          status: 'غير مرفق',
        }
  );

  // 8) تقارير المخالفات الرسمية المرتبطة بالعقد، إن وجدت
  docsList.push(...buildViolationEvidenceDocumentEntries(state.violationEvidenceDocuments));
  
  const html = generateDocumentsListHtml({
    caseTitle: taqadiData.caseTitle,
    customerName,
    amount: taqadiData.amount,
    documents: docsList,
  });
  
  const url = createBlobUrl(html);
  
  return { url, html };
}

/**
 * Generate Violations List (كشف المخالفات المرورية)
 */
export async function generateViolationsList(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, trafficViolations, calculations } = state;
  
  if (!contract || trafficViolations.length === 0) {
    throw new Error('لا توجد مخالفات مرورية');
  }
  
  const customerName = formatCustomerName(customer);
  
  const violationsData = trafficViolations.map((v) => ({
    violationNumber: v.violation_number || '-',
    violationDate: v.violation_date || '',
    violationType: v.violation_type || 'غير محدد',
    location: v.location || '-',
    fineAmount: Number(v.total_amount) || Number(v.fine_amount) || 0,
  }));
  
  const html = generateClaimsStatementHtml({
    customerName,
    nationalId: customer?.national_id || '-',
    phone: customer?.phone || '',
    contractNumber: contract.contract_number,
    contractStartDate: contract.start_date || '',
    contractEndDate: contract.end_date || '',
    invoices: [], // Empty for violations-only view
    violations: violationsData,
    totalOverdue: calculations?.violationsFines || 0,
    amountInWords: '', // Will be generated in the function
    caseTitle: `كشف المخالفات المرورية - ${customerName}`,
  });
  
  const url = createBlobUrl(html);
  
  return { url, html };
}

/**
 * Generate Criminal Complaint (بلاغ جنائي بالامتناع عن رد المركبة)
 */
export async function generateCriminalComplaint(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, vehicle } = state;
  const eligibility = getCriminalComplaintEligibility(state);
  
  if (!contract) {
    throw new Error('بيانات العقد غير متوفرة');
  }
  if (!eligibility.eligible) {
    throw new Error(`لا يمكن توليد البلاغ الجنائي قبل استكمال: ${eligibility.reasons.join('، ')}`);
  }
  
  const customerName = formatCustomerName(customer);
  
  const html = generateCriminalComplaintHtml({
    customerName,
    customerNationality: customer?.nationality || '',
    customerId: customer?.national_id || '-',
    customerMobile: customer?.phone || '',
    contractDate: contract.start_date
      ? new Date(contract.start_date).toLocaleDateString('ar-QA')
      : '-',
    contractEndDate: contract.end_date
      ? new Date(contract.end_date).toLocaleDateString('ar-QA')
      : '-',
    vehicleType: vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
      : '-',
    plateNumber: vehicle?.plate_number || '-',
    plateType: 'خصوصي',
    manufactureYear: vehicle?.year?.toString() || '',
    chassisNumber: vehicle?.vin || '',
  });
  
  const url = createBlobUrl(html);
  
  // Save to storage
  if (state.companyId && state.contractId) {
    saveDocumentToStorage(
      state.companyId,
      state.contractId,
      'criminalComplaint',
      html
    );
  }
  
  return { url, html };
}

/**
 * Generate Violations Transfer Request (طلب تحويل المخالفات)
 */
export async function generateViolationsTransfer(
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  const { contract, customer, vehicle, trafficViolations } = state;
  
  if (!contract || trafficViolations.length === 0) {
    throw new Error('لا توجد مخالفات مرورية');
  }
  
  const customerName = formatCustomerName(customer);
  
  const html = generateViolationsTransferHtml({
    customerName,
    customerId: customer?.national_id || '-',
    customerMobile: customer?.phone || '',
    contractNumber: contract.contract_number,
    contractDate: contract.start_date
      ? new Date(contract.start_date).toLocaleDateString('ar-QA')
      : '-',
    contractEndDate: contract.end_date
      ? new Date(contract.end_date).toLocaleDateString('ar-QA')
      : '-',
    vehicleType: vehicle
      ? `${vehicle.make || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim()
      : '-',
    plateNumber: vehicle?.plate_number || '-',
    violations: trafficViolations.map(v => ({
      violationNumber: v.violation_number || '-',
      violationDate: v.violation_date
        ? new Date(v.violation_date).toLocaleDateString('ar-QA')
        : '-',
      violationType: v.violation_type || 'مخالفة مرورية',
      location: v.location || '',
      fineAmount: v.fine_amount || 0,
    })),
    totalFines: trafficViolations.reduce((sum, v) => sum + (v.fine_amount || 0), 0),
  });
  
  const url = createBlobUrl(html);
  
  // Save to storage
  if (state.companyId && state.contractId) {
    saveDocumentToStorage(
      state.companyId,
      state.contractId,
      'violationsTransfer',
      html
    );
  }
  
  return { url, html };
}

// ==========================================
// Main Generator Function
// ==========================================

export async function generateDocument(
  docId: keyof DocumentsState,
  state: LawsuitPreparationState
): Promise<{ url: string; html: string }> {
  switch (docId) {
    case 'memo':
      return generateExplanatoryMemo(state);
    case 'claims':
      return generateClaimsStatement(state);
    case 'docsList':
      return generateDocumentsList(state);
    case 'violations':
      return generateViolationsList(state);
    case 'criminalComplaint':
      return generateCriminalComplaint(state);
    case 'violationsTransfer':
      return generateViolationsTransfer(state);
    default:
      throw new Error(`Unknown document type: ${docId}`);
  }
}

/**
 * يبني نسخة مستقلة من حالة الرفع ويعيد توليد مستنداتها الإلزامية فوراً.
 * هذا يمنع إرسال HTML قديم بقي في React state بعد تعديل الأدلة أو الحسابات،
 * ويضمن أن المذكرة المرسلة هي اللقطة المعتمدة المطابقة للحالة الحالية.
 */
export async function prepareCurrentFilingState(
  state: LawsuitPreparationState,
): Promise<LawsuitPreparationState> {
  const filingState: LawsuitPreparationState = {
    ...state,
    documents: Object.fromEntries(
      Object.entries(state.documents).map(([key, document]) => [
        key,
        { ...document },
      ]),
    ) as DocumentsState,
  };

  const assignGeneratedDocument = async (docId: keyof DocumentsState) => {
    const generated = await generateDocument(docId, filingState);
    filingState.documents[docId] = {
      ...filingState.documents[docId],
      status: 'ready',
      url: generated.url,
      htmlContent: generated.html,
      generatedAt: new Date().toISOString(),
      error: null,
    };
  };

  await assignGeneratedDocument('memo');
  await assignGeneratedDocument('claims');

  if ((filingState.calculations?.violationsCount || 0) > 0) {
    await assignGeneratedDocument('violations');
  }

  // كشف المستندات يجب أن يولد أخيراً كي يرى النسخ الحديثة أعلاه.
  await assignGeneratedDocument('docsList');
  return filingState;
}
